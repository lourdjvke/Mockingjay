import { sanitizeAiJson } from '../../utils';

interface Env {
  GEMINI_API_KEY: string;
}

// This is a server-side Cloudflare Function. It's a secure endpoint.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const { screenshotBase64, websiteUrl } = await request.json();

  if (!screenshotBase64 || !websiteUrl) {
    return new Response('Missing screenshot or URL', { status: 400 });
  }

  const GEMINI_API_KEY = env.GEMINI_API_KEY; // Securely accessed from Cloudflare env
  const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Analyze this website screenshot and extract the following information in JSON format:
{
  "brandName": "extracted brand name",
  "brandColors": ["primary color hex", "secondary color hex", "accent color hex"],
  "topFonts": ["font family 1", "font family 2", "font family 3"],
  "brandValues": ["value 1", "value 2", "value 3"],
  "brandToneOfVoice": "description of tone",
  "brandAesthetic": "description of aesthetic",
  "businessOverview": "brief overview of what the business does",
  "noticeableColors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"]
}

Analyze the visual design, typography, color scheme, and overall brand presentation. Be specific and accurate.`;

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/png',
                data: screenshotBase64.split(',')[1] || screenshotBase64,
              },
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`Gemini API error: ${errorText}`, { status: response.status });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const sanitized = sanitizeAiJson(text);
    const parsed = JSON.parse(sanitized);

    const result = {
      websiteUrl,
      screenshotUrl: screenshotBase64,
      ...parsed,
      images: [],
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
};
