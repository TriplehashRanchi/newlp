import { getDb } from "./_db.js";

function mapEventName(payload) {
  if (payload.event === "form.submitted") {
    var qualified = payload.result && payload.result.type !== "custom_message" && payload.result.type !== "external_url";
    return { name: "routing_form_submitted", meta: { qualified: !!qualified, resultType: payload.result?.type, resultLabel: payload.result?.label, rule: payload.rule?.name } };
  }
  if (payload.event === "booking.created") return { name: "booking_created", meta: { bookerEmail: payload.booking?.bookerEmail } };
  if (payload.event === "booking.cancelled") return { name: "booking_cancelled", meta: { bookerEmail: payload.booking?.bookerEmail } };
  if (payload.event === "booking.rescheduled") return { name: "booking_rescheduled", meta: { bookerEmail: payload.booking?.bookerEmail } };
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const tracking = payload.tracking || payload.booking?.trackingData || {};
    const vid = tracking.vid;

    const mapped = mapEventName(payload);

    if (!vid || !mapped) {
      // Nothing to correlate yet (hashcal hasn't been updated to forward tracking data),
      // or an event type we don't handle — ack anyway so hashcal doesn't retry forever.
      return res.status(204).end();
    }

    const sql = getDb();
    await sql`
      insert into funnel_events
        (vid, event_name, page, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid, meta)
      values
        (${vid}, ${mapped.name}, ${"hashcal"}, ${tracking.utm_source || null}, ${tracking.utm_medium || null},
         ${tracking.utm_campaign || null}, ${tracking.utm_content || null}, ${tracking.utm_term || null},
         ${tracking.fbclid || null}, ${tracking.gclid || null}, ${JSON.stringify(mapped.meta)})
    `;

    return res.status(204).end();
  } catch (err) {
    console.error("[hashcal-webhook] error", err.message);
    // Ack 200 regardless so hashcal's retry logic doesn't hammer us on our own bugs
    return res.status(200).json({ received: true, error: true });
  }
}
