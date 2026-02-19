
export async function onRequestPost({ request, env }) {
  const { screenshotBase64, websiteUrl } = await request.json();

  if (!screenshotBase64 || !websiteUrl) {
    return new Response(JSON.stringify({ error: 'Missing screenshotBase64 or websiteUrl' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`;

  const finalPrompt = `Analyze this website screenshot and extract the following information in JSON format.
    The website URL is ${websiteUrl}.

    Your response MUST be a JSON object that strictly follows this schema:
    {
      "businessName": "The name of the brand.",
      "overview": "A 1-sentence perceived overview of the business.",
      "values": ["Array of 3 key brand values."],
      "tone": "A short descriptive sentence about the tone of voice.",
      "aesthetic": "3-4 keywords describing the visual style.",
      "colors": ["Array of 5 prominent hex codes found in the brand identity."],
      "fonts": ["Array of 3 likely font families seen (Top 3)."]
    }

    Analyze the visual design, typography, color scheme, and overall brand presentation. Be specific and accurate. Do not include any text, code block markers, or markdown before or after the JSON object.
    `;

    const geminiRequestBody = {
        contents: [{
          parts: [
            { text: finalPrompt },
            { inline_data: { mime_type: 'image/png', data: screenshotBase64.split(',')[1] || screenshotBase64 } }
          ]
        }],
        generationConfig: {
            responseMimeType: "application/json",
        },
    };

  try {
    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiRequestBody),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API Error:', errorText);
      return new Response(JSON.stringify({ error: `Gemini API error: ${errorText}` }), { status: geminiResponse.status, headers: { 'Content-Type': 'application/json' } });
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No content in Gemini response');
    }

    const parsedJson = JSON.parse(generatedText);

    return new Response(JSON.stringify(parsedJson), {
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
