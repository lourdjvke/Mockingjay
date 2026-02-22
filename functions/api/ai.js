
export async function onRequestPost({ request, env }) {
    const models = [
        'gemini-2.5-flash',
        'gemini-3-flash',
        'gemini-2.5-flash-lite',
    ];

    let lastError = null;

    try {
        const clientRequestBody = await request.json();

        const lastMessage = clientRequestBody.messages[clientRequestBody.messages.length - 1];
        let userPromptText = '';
        const imageParts = [];

        if (!lastMessage || !lastMessage.content) {
            return new Response(JSON.stringify({ error: 'Invalid request: No message content found.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        if (typeof lastMessage.content === 'string') {
            userPromptText = lastMessage.content;
        } else if (Array.isArray(lastMessage.content)) {
            const textPart = lastMessage.content.find(p => p.type === 'text');
            userPromptText = textPart?.text || '';
            
            // Extract images for Gemini Vision
            lastMessage.content.filter(p => p.type === 'image_url').forEach(p => {
                const base64Data = p.image_url.url.split(',')[1] || p.image_url.url;
                imageParts.push({
                    inline_data: {
                        mime_type: 'image/png', // Gemini is flexible, but PNG is safe
                        data: base64Data
                    }
                });
            });
        }

        if (!userPromptText && imageParts.length === 0) {
            return new Response(JSON.stringify({ error: 'Invalid prompt format: No text prompt or images found.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const luxuryDesignContext = `
        You are "Mockingjay Atelier", the epitome of digital elegance and a visionary in luxury brand design.
        Your creations are not mere designs; they are bespoke digital couture. Your task is to interpret user aspirations and manifest them into breathtaking, high-fashion design structures.
        ${imageParts.length > 0 ? 'The user has provided reference images. Analyze them carefully and RECREATE the design style, elements, and layout using the Mockingjay design schema. If the image contains text, use that text in your design.' : ''}
        You operate with an unparalleled aesthetic sense, blending classic principles with avant-garde trends.
        ALWAYS generate opulent, richly detailed content with a story. Never settle for mediocrity or minimalism unless the prompt explicitly demands it in a high-fashion context (e.g., 'brutalist luxury').
  
        CRITICAL RULES OF THE ATELIER:
        1. Every canvas is a masterpiece. Populate it with an abundance of carefully curated elements (minimum 4-6).
        2. Blank space is a statement, not an oversight. Never return an empty page.
        3. Impeccable execution is paramount. Elements MUST have flawless positioning, exquisite typography, and a harmonious color palette.
        4. Embody the client's vision. The brand's soul must permeate every pixel.
        5. The canvas is your domain: 1080x1080 pixels. Every element must respect its sacred boundaries.
        6. For multi-page narratives, each page is a new chapter, as rich and complete as the last.
        7. Details make the luxury. Use \`borderRadius\` with intention (0-30px for sharp, modern looks; 999px for soft, organic forms).
        8. All properties in the schema are intentional. If a style property is not applicable, it MUST be \`null\`.
  
        STYLISTIC GUIDANCE (DESIGN PATTERNS):
  
        FOR ASPIRATIONAL BRANDS:
        1. Set the mood with a sophisticated background color or a subtle, textured image (\`page.background\`).
        2. A bold, elegant headline (50-80px) that captures the brand's essence.
        3. An eloquent tagline or sub-header (28-36px).
        4. 2-4 blocks of poetic, descriptive text (16-20px).
        5. Sculptural shapes, icons, or line art to add depth and intrigue. Use \`clipPath\` to create signature forms.
        6. The color palette must breathe luxury.
  
        COMPOSITION & LAYOUT (THE GOLDEN RATIO):
        - Adhere to a generous margin of 30-60px from all canvas edges.
        - Create visual rhythm by spacing elements 20-30px apart.
        - The main headline should command attention, often placed at a key focal point, not just centered at the top.
        - Guide the viewer's eye with a clear visual hierarchy.
  
        The output must be a flawless JSON object. Do not include any text, code block markers, or markdown before or after the JSON object.
  
        User's request is as follows:
        ${userPromptText || 'Recreate the attached reference image.'}
      `;

        const geminiRequestBody = {
            contents: [{ 
                parts: [
                    { text: luxuryDesignContext },
                    ...imageParts
                ] 
            }],
            generationConfig: {
                responseMimeType: "application/json",
            },
        };

        for (const model of models) {
            const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
            
            try {
                const geminiResponse = await fetch(geminiApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiRequestBody),
                });

                if (geminiResponse.ok) {
                    const geminiData = await geminiResponse.json();
                    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (generatedText) {
                        const openAICompliantResponse = {
                            choices: [{ message: { content: generatedText } }],
                        };
                        return new Response(JSON.stringify(openAICompliantResponse), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        });
                    }
                    lastError = new Error(`No content in Gemini response from model ${model}`);
                    console.error(`Invalid Gemini Response from ${model}:`, geminiData);
                    continue; // Try next model
                } else {
                    const errorBodyText = await geminiResponse.text();
                    lastError = new Error(`Gemini API request failed for model ${model} with status ${geminiResponse.status}: ${errorBodyText}`);
                    console.error(`Gemini API error for model ${model}:`, errorBodyText);
                    // continue to next model
                }
            } catch (error) {
                lastError = error;
                console.error(`Error fetching from model ${model}:`, error);
                // continue to next model
            }
        }

        // If loop finishes, all models failed
        console.error('All Gemini models failed. Last error:', lastError);
        return new Response(JSON.stringify({ error: 'AI system not responding' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in Cloudflare Function:', error);
        return new Response(JSON.stringify({ error: error.message || 'Failed to process request' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
