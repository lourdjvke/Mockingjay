
// Function to remove base64 images from the design data
const removeBase64Images = (design) => {
    if (design && design.pages) {
        design.pages.forEach(page => {
            if (page.elements) {
                page.elements.forEach(element => {
                    if (element.props && element.props.src && element.props.src.startsWith('data:image')) {
                        element.props.src = ''; // or a placeholder like 'image_removed'
                    }
                });
            }
        });
    }
    return design;
};

export async function onRequestPost({ request, env }) {
  const groqApiUrl = "https://api.groq.com/openai/v1/chat/completions";

  try {
    const clientRequestBody = await request.json();

    // 1. Remove base64 images to reduce request size
    if (clientRequestBody.messages && clientRequestBody.messages.length > 0) {
        const lastMessage = clientRequestBody.messages[clientRequestBody.messages.length - 1];
        try {
            const content = JSON.parse(lastMessage.content);
            if (content.design) {
                content.design = removeBase64Images(content.design);
                lastMessage.content = JSON.stringify(content);
            }
        } catch (e) {
            // Not a JSON content, proceed as is
        }
    }
    
    // 2. Add design context to the prompt
    const designContext = `
      Please generate a design based on the following prompt.
      The design canvas has a width of 1080px and a height of 1080px.
      Ensure all elements are within the canvas boundaries and properly spaced.
      Generate a harmonious color palette that fits the user's request and brand.
      Select fonts that are appropriate for the prompt and brand.
      The output must be a valid JSON object matching the following schema:
      {
        "type": "object",
        "properties": {
          "currentPageIndex": { "type": "number" },
          "selectedElementId": { "type": "string" },
          "themeColors": {
            "type": "array",
            "items": { "type": "string" }
          },
          "pages": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "name": { "type": "string" },
                "elements": { "type": "array" }
              },
              "required": ["id", "name", "elements"]
            }
          }
        },
        "required": ["currentPageIndex", "selectedElementId", "themeColors", "pages"]
      }
    `;

    if (clientRequestBody.messages && clientRequestBody.messages.length > 0) {
        const lastMessage = clientRequestBody.messages[clientRequestBody.messages.length - 1];
        lastMessage.content = designContext + '\n\n' + lastMessage.content;
    }


    const groqResponse = await fetch(groqApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(clientRequestBody),
    });

    const groqData = await groqResponse.json();

    return new Response(JSON.stringify(groqData), {
        status: groqResponse.status,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in Cloudflare Function:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
