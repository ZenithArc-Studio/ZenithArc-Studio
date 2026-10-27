async function askAI(prompt) {
  const { AI_BASE_URL, AI_API_KEY, AI_MODEL } = process.env;
  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) {
    throw new Error('AI is not configured yet. Set AI_BASE_URL, AI_API_KEY, and AI_MODEL in the host environment.');
  }

  const base = AI_BASE_URL.replace(/\/+$/, '');
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are ZenithArc Studio, a helpful assistant for a Discord community. Be respectful, concise, and do not claim to have performed moderation actions.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 700
    }),
    signal: AbortSignal.timeout(25000)
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`AI provider returned HTTP ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content;
  if (!answer) throw new Error('AI provider returned an empty response.');
  return answer;
}

module.exports = { askAI };
