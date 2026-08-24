export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { eventId, fbp, fbc } = req.body || {};

  const userData = {};

  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const forwardedFor = req.headers["x-forwarded-for"];
  const ip =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0].trim()
      : undefined;

  if (ip) userData.client_ip_address = ip;

  const userAgent = req.headers["user-agent"];
  if (userAgent) userData.client_user_agent = userAgent;

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: "https://lp.triplehash.in/thanku.html",
        user_data: userData,
      },
    ],
  };

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();

  return res.status(response.ok ? 200 : 500).json(result);
}