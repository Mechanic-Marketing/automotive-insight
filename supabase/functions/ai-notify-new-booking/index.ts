import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ---------------------------------------------------------------------------
// Env vars (set in Supabase dashboard → Edge Functions → Manage secrets)
//   AI_RESEND_API_KEY      Resend email API key
//   AI_WORKSHOP_EMAIL      Workshop notification address
//   AI_ZAPIER_WEBHOOK_URL  Zapier webhook for SMS (optional)
// ---------------------------------------------------------------------------

interface BookingRecord {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  landing_page: string | null;
  service_type: string;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  status: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: BookingRecord;
  schema: string;
  old_record: BookingRecord | null;
}

function formatAustralianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-().+]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "+61" + cleaned.slice(1);
  }
  if (cleaned.startsWith("61") && cleaned.length === 11) {
    return "+" + cleaned;
  }
  return phone;
}

async function sendEmail(
  resendApiKey: string,
  to: string,
  subject: string,
  text: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Automotive Insight <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}


async function notifyZapier(r: BookingRecord, webhookUrl: string): Promise<void> {
  const vehicle = [r.vehicle_make, r.vehicle_model, r.vehicle_year].filter(Boolean).join(" ") || "Not provided";

  const params = new URLSearchParams({
    customer_name:  r.customer_name,
    customer_phone: formatAustralianPhone(r.customer_phone),
    customer_email: r.customer_email,
    vehicle,
    service_type:   r.service_type,
    preferred_date: r.preferred_date ?? "",
    preferred_time: r.preferred_time ?? "",
    notes:          r.notes ?? "",
  });

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Zapier webhook failed ${res.status}: ${await res.text()}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const RESEND_API_KEY   = Deno.env.get("AI_RESEND_API_KEY");
  const WORKSHOP_EMAIL   = Deno.env.get("AI_WORKSHOP_EMAIL");
  const ZAPIER_WEBHOOK   = Deno.env.get("AI_ZAPIER_WEBHOOK_URL");

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  if (payload.type !== "INSERT") {
    return new Response(
      JSON.stringify({ skipped: true, reason: "Not an INSERT event" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const r     = payload.record;
  const notes = r.notes?.trim() || "None provided";
  const vehicle = [r.vehicle_make, r.vehicle_model, r.vehicle_year].filter(Boolean).join(" ") || "Not provided";

  const tasks: Promise<void>[] = [];

  // ── Email notifications ──────────────────────────────────────────────────
  if (RESEND_API_KEY && WORKSHOP_EMAIL) {
    const workshopSubject = `New Booking Request — ${r.customer_name} — ${r.service_type}`;
    const workshopBody    = `New booking request received.

Customer: ${r.customer_name}
Phone:    ${r.customer_phone}
Email:    ${r.customer_email}

Vehicle:        ${vehicle}
Service:        ${r.service_type}
Preferred date: ${r.preferred_date ?? "Not specified"} — ${r.preferred_time ?? ""}

Notes: ${notes}

Source: ${r.utm_source ?? "(direct)"} / ${r.utm_medium ?? ""}
Campaign: ${r.utm_campaign ?? ""}`;

    const customerSubject = `Booking Request Received — Automotive Insight`;
    const customerBody    = `Hi ${r.customer_name},

Thanks for your booking request. We've received the following details:

Vehicle:  ${vehicle}
Service:  ${r.service_type}
Preferred date: ${r.preferred_date ?? "Not specified"} (${r.preferred_time ?? ""})

We'll be in touch within 1 business day to confirm your booking.

If you need to get in touch sooner, give us a call.

Automotive Insight
Shenton Park, WA`;

    tasks.push(sendEmail(RESEND_API_KEY, WORKSHOP_EMAIL, workshopSubject, workshopBody));
    tasks.push(sendEmail(RESEND_API_KEY, r.customer_email, customerSubject, customerBody));
  } else {
    console.warn("AI_RESEND_API_KEY or AI_WORKSHOP_EMAIL not set — skipping email");
  }

  // ── Zapier SMS ───────────────────────────────────────────────────────────
  if (ZAPIER_WEBHOOK) {
    tasks.push(notifyZapier(r, ZAPIER_WEBHOOK));
  } else {
    console.warn("AI_ZAPIER_WEBHOOK_URL not set — skipping Zapier");
  }

  const results = await Promise.allSettled(tasks);

  const errors = results
    .filter((res): res is PromiseRejectedResult => res.status === "rejected")
    .map((res) => String(res.reason));

  if (errors.length > 0) {
    console.error("One or more integrations failed:", errors);
    return new Response(
      JSON.stringify({ partial: true, errors, booking_id: r.id }),
      { status: 207, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, booking_id: r.id }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
