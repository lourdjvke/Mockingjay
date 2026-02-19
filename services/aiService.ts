import { sanitizeAiJson } from '../utils.ts';
import { BusinessDNA } from '../types.ts';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
        const modelName = "gemini-2.5-flash"; 
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

export const analyzeBusinessFromScreenshot = async (screenshotBase64: string, websiteUrl: string): Promise<Partial<BusinessDNA>> => {
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

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/png',
              data: screenshotBase64.split(',')[1] || screenshotBase64
            }
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to analyze business DNA');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const sanitized = sanitizeAiJson(text);
  const parsed = JSON.parse(sanitized);

  return {
    websiteUrl,
    screenshotUrl: screenshotBase64,
    ...parsed,
    images: []
  };
};

export const generateCampaignDesigns = async (
  prompt: string,
  pageCount: number,
  dna?: BusinessDNA
): Promise<any> => {
  const systemPrompt = `You are a professional designer. Generate ${pageCount} social media campaign designs based on this prompt: "${prompt}"

${dna ? `Use this brand DNA:
- Brand: ${dna.brandName}
- Colors: ${dna.brandColors.join(', ')}
- Fonts: ${dna.topFonts.join(', ')}
- Tone: ${dna.brandToneOfVoice}
- Aesthetic: ${dna.brandAesthetic}` : ''}

Return a JSON object with this exact structure:
{
  "pages": [
    {
      "id": "page-1",
      "background": "#hexcolor",
      "elements": [
        {
          "id": "unique-id",
          "type": "text|shape|image",
          "name": "Element Name",
          "box": {"x": 0, "y": 0, "width": 100, "height": 50, "rotation": 0},
          "content": "text content or empty",
          "style": {
            "color": "#hex",
            "backgroundColor": "#hex",
            "fontSize": 24,
            "fontFamily": "'Inter', sans-serif",
            "textAlign": "center",
            "borderRadius": 10,
            "opacity": 1
          },
          "visible": true,
          "locked": false
        }
      ]
    }
  ],
  "themeColors": ["#hex1", "#hex2", "#hex3"]
}

Canvas size is 360x640. Create visually appealing, professional designs.`;

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate campaign designs');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const sanitized = sanitizeAiJson(text);
  return JSON.parse(sanitized);
};
