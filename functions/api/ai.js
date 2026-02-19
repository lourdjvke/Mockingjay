
export async function onRequestPost({ request, env }) {
  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`;

  try {
    const clientRequestBody = await request.json();

    const lastMessage = clientRequestBody.messages[clientRequestBody.messages.length - 1];
    let userPromptText = '';

    if (!lastMessage || !lastMessage.content) {
        return new Response(JSON.stringify({ error: 'Invalid request: No message content found.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Handle both string and array content types to ensure we get the prompt
    if (typeof lastMessage.content === 'string') {
        userPromptText = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
        const textPart = lastMessage.content.find(p => p.type === 'text');
        userPromptText = textPart?.text || '';
    }

    if (!userPromptText) {
        return new Response(JSON.stringify({ error: 'Invalid prompt format: No text prompt found.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const designSchema = {
        "type": "OBJECT",
        "properties": {
            "currentPageIndex": { "type": "NUMBER" },
            "selectedElementId": { "type": "STRING" },
            "themeColors": { "type": "ARRAY", "items": { "type": "STRING" } },
            "pages": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "id": { "type": "STRING" },
                        "background": { "type": "STRING" },
                        "elements": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "id": { "type": "STRING" },
                                    "type": { "enum": ["text", "shape", "image", "icon"] },
                                    "name": { "type": "STRING" },
                                    "box": {
                                        "type": "OBJECT",
                                        "properties": { "x": { "type": "NUMBER" }, "y": { "type": "NUMBER" }, "width": { "type": "NUMBER" }, "height": { "type": "NUMBER" }, "rotation": { "type": "NUMBER" } },
                                        "required": ["x", "y", "width", "height", "rotation"]
                                    },
                                    "content": { "type": "STRING" },
                                    "style": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "color": { "type": "STRING" },
                                            "backgroundColor": { "type": "STRING" },
                                            "fontSize": { "type": "NUMBER" },
                                            "fontFamily": { "type": "STRING" },
                                            "fontWeight": { "type": "STRING" },
                                            "textAlign": { "enum": ["left", "center", "right"] },
                                            "borderRadius": { "type": "NUMBER" },
                                            "opacity": { "type": "NUMBER" },
                                            "strokeColor": { "type": "STRING" },
                                            "strokeWidth": { "type": "NUMBER" },
                                            "strokePattern": { "enum": ["solid", "dashed", "dotted"] },
                                            "letterSpacing": { "type": "NUMBER" },
                                            "lineHeight": { "type": "NUMBER" },
                                            "clipPath": { "type": "STRING" }
                                        },
                                        "required": ["color", "backgroundColor", "fontSize", "fontFamily", "fontWeight", "textAlign", "letterSpacing", "lineHeight", "borderRadius", "opacity", "strokeColor", "strokeWidth", "strokePattern", "clipPath"]
                                    },
                                    "visible": { "type": "BOOLEAN" },
                                    "locked": { "type": "BOOLEAN" }
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

    const luxuryDesignContext = `
      You are "Mockingjay Atelier", the epitome of digital elegance and a visionary in luxury brand design.
      Your creations are not mere designs; they are bespoke digital couture. Your task is to interpret user aspirations and manifest them into breathtaking, high-fashion design structures.
      You operate with an unparalleled aesthetic sense, blending classic principles with avant-garde trends.
      ALWAYS generate opulent, richly detailed content with a story. Never settle for mediocrity or minimalism unless the prompt explicitly demands it in a high-fashion context (e.g., \'brutalist luxury\').

      CRITICAL RULES OF THE ATELIER:
      1. Every canvas is a masterpiece. Populate it with an abundance of carefully curated elements (minimum 4-6).
      2. Blank space is a statement, not an oversight. Never return an empty page.
      3. Impeccable execution is paramount. Elements MUST have flawless positioning, exquisite typography, and a harmonious color palette.
      4. Embody the client\'s vision. The brand\'s soul must permeate every pixel.
      5. The canvas is your domain: 1080x1080 pixels. Every element must respect its sacred boundaries.
      6. For multi-page narratives, each page is a new chapter, as rich and complete as the last.
      7. Details make the luxury. Use \`borderRadius\` with intention (0-30px for sharp, modern looks; 999px for soft, organic forms).
      8. All properties in the schema are intentional. If a style property is not applicable, it MUST be \`null\`.

      STYLISTIC GUIDANCE (DESIGN PATTERNS):

      FOR ASPIRATIONAL BRANDS:
      1. Set the mood with a sophisticated background color or a subtle, textured image (\`page.background\`).
      2. A bold, elegant headline (50-80px) that captures the brand\'s essence.
      3. An eloquent tagline or sub-header (28-36px).
      4. 2-4 blocks of poetic, descriptive text (16-20px).
      5. Sculptural shapes, icons, or line art to add depth and intrigue. Use \`clipPath\` to create signature forms.
      6. The color palette must breathe luxury.

      COMPOSITION & LAYOUT (THE GOLDEN RATIO):
      - Adhere to a generous margin of 30-60px from all canvas edges.
      - Create visual rhythm by spacing elements 20-30px apart.
      - The main headline should command attention, often placed at a key focal point, not just centered at the top.
      - Guide the viewer\'s eye with a clear visual hierarchy.

      The output must be a flawless JSON object. Do not include any text, code block markers, or markdown before or after the JSON object.

      User\'s request is as follows:
      ${userPromptText}
    `;

    const geminiRequestBody = {
        contents: [{ parts: [{ text: luxuryDesignContext }] }],
        generationConfig: {
            responseMimeType: "application/json",
          //  responseSchema: designSchema,
        },
    };

    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiRequestBody),
    });

    if (!geminiResponse.ok) {
      if (geminiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'High traffic: try again soon' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      let errorBody;
      try {
        errorBody = await geminiResponse.json();
      } catch (e) {
        const errorText = await geminiResponse.text();
        throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorText}`);
      }
      
      const errorMessage = errorBody?.error?.message || JSON.stringify(errorBody);
      console.error('Gemini API Error:', errorBody);
      throw new Error(`Gemini API request failed: ${errorMessage}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('Invalid Gemini Response:', geminiData);
      throw new Error('No content in Gemini response');
    }

    const openAICompliantResponse = {
      choices: [{ message: { content: generatedText } }]
    };

    return new Response(JSON.stringify(openAICompliantResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in Cloudflare Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to process request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
