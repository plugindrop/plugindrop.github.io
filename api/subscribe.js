// Vercel serverless function: POST /api/subscribe
// Adds email to Resend Audience

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://plugindrop.net");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body ?? {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email required" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    console.error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const response = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      }
    );

    if (response.status === 409) {
      // Already subscribed — treat as success
      return res.status(200).json({ success: true, already: true });
    }
    if (!response.ok) {
      const body = await response.text();
      console.error("Resend error:", response.status, body);
      return res.status(502).json({ error: "Subscription failed" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
