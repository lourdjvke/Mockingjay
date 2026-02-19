
export async function onRequestPost({ request, env }) {
  const groqApiUrl = "https://api.groq.com/openai/v1/chat/completions";

  try {
    const clientRequestBody = await request.json();

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
