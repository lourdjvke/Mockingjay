
export async function onRequestPost({ request, env }) {
  const modelName = "gemini-2.5-flash";
  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`;

  try {
    const clientRequestBody = await request.json();

    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientRequestBody),
    });

    const geminiData = await geminiResponse.json();

    return new Response(JSON.stringify(geminiData), {
        status: geminiResponse.status,
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
