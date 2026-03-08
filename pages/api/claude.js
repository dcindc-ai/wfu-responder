
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in environment variables." });
  }

  const { system, userMessage } = req.body;
  if (!system || !userMessage) {
    return res.status(400).json({ error: "Missing system or userMessage in request body." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({
        text: "",
        error: `Anthropic returned ${response.status}: ${JSON.stringify(data)}`
      });
    }

    const text = data.content?.map(b => b.text || "").join("") || "";
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(200).json({ error: `Server error: ${err.message}` });
  }
}
