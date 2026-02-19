
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
    
    // 2. Add design context and detailed schema to the prompt
    const designSchema = {
      "type": "object",
      "properties": {
        "currentPageIndex": { "type": "number" },
        "selectedElementId": { "type": ["string", "null"] },
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
              "background": { "type": "string" },
              "elements": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "type": { "enum": ["text", "shape", "image", "icon"] },
                    "name": { "type": "string" },
                    "box": {
                      "type": "object",
                      "properties": {
                        "x": { "type": "number" },
                        "y": { "type": "number" },
                        "width": { "type": "number" },
                        "height": { "type": "number" },
                        "rotation": { "type": "number" }
                      },
                      "required": ["x", "y", "width", "height", "rotation"]
                    },
                    "content": { "type": "string" },
                    "style": {
                      "type": "object",
                      "properties": {
                        "color": { "type": "string" },
                        "backgroundColor": { "type": "string" },
                        "fontSize": { "type": "number" },
                        "fontFamily": { "type": "string" },
                        "fontWeight": { "type": "string" },
                        "textAlign": { "enum": ["left", "center", "right"] },
                        "borderRadius": { "type": "number" },
                        "opacity": { "type": "number" },
                        "strokeColor": { "type": "string" },
                        "strokeWidth": { "type": "number" },
                        "strokePattern": { "enum": ["solid", "dashed", "dotted"] },
                        "letterSpacing": { "type": "number" },
                        "lineHeight": { "type": "number" },
                        "clipPath": { "type": "string" }
                      }
                    },
                    "visible": { "type": "boolean" },
                    "locked": { "type": "boolean" }
                  },
                  "required": ["id", "type", "name", "box", "content", "style", "visible", "locked"]
                }
              }
            },
            "required": ["id", "background", "elements"]
          }
        }
      },
      "required": ["currentPageIndex", "selectedElementId", "themeColors", "pages"]
    };

    const designContext = `
      You are "Mockingjay AI", a world-class Lead Designer and UI/UX expert.
      Your task is to transform user prompts into complete, high-fidelity design structures.
      ALWAYS generate RICH content with multiple elements. Never generate empty or minimal designs.

      CRITICAL RULES:
      1. ALWAYS populate the current page with multiple elements (minimum 3-5 elements)
      2. NEVER return an empty page with only a background color
      3. Elements MUST have proper positioning, sizing, font families, colors, and spacing
      4. Apply the user's request (color theme, brand, style) throughout ALL elements
      5. Match the Canvas dimensions: 1080x1080
      6. When user asks for additional pages, append new pages to the pages array. Every page MUST have elements.
      7. Use reasonable borderRadius values (0-24px for rectangles, 999 for circles/pills). Do NOT use excessive values.
      8. For optional style properties that are not applicable to an element, you MUST return them with a value of null.

      DESIGN PATTERNS BY REQUEST TYPE:

      FOR BRAND/COMPANY REQUESTS:
      1. Background color or image (applies to page.background)
      2. Large headline (40-70px) with brand name
      3. Tagline/subtitle (24-30px)
      4. 2-3 descriptive text elements (14-18px)
      5. Accent shapes or icons for visual interest (can use clipPath for unique shapes).
      6. All text in theme colors from user request

      FOR COLOR/STYLE REQUESTS:
      - Update ALL element colors to match the requested theme
      - If "purple" mentioned, use gradients of purple: #8B5CF6, #A78BFA, #DDD6FE
      - If "brand colors" requested, create a palette and apply consistently

      POSITIONING GUIDELINES:
      - Use margins of 20-40px from canvas edges
      - Space elements 15-20px apart
      - Center headline at x: 270, y: 40
      - Place secondary elements below with proper spacing
      - Use full width (1080) for visual elements

      The output must be a valid JSON object matching the following schema:
      ${JSON.stringify(designSchema, null, 2)}
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
