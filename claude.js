export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;

    // Convert messages to Gemini format
    const contents = messages.map(m => {
      const parts = Array.isArray(m.content)
        ? m.content.map(c => {
            if (c.type === 'text') return { text: c.text };
            if (c.type === 'document') return {
              inline_data: { mime_type: c.source.media_type, data: c.source.data }
            };
            return { text: '' };
          })
        : [{ text: m.content }];
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: 4000, temperature: 0.7 }
        })
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    // Return in Anthropic-compatible format so the app doesn't need changes
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
