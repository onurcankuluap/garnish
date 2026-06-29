import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

// In-memory rate limiter: max 5 submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_REQUESTS) return true;

  entry.count++;
  return false;
}

function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[<>]/g, "").slice(0, 2000);
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot check — bots fill this field, humans don't
  if (body.honeypot) {
    return NextResponse.json({ ok: true }); // silently accept
  }

  const name = sanitize(body.name);
  const phone = sanitize(body.phone);
  const email = sanitize(body.email);
  const eventType = sanitize(body.eventType);
  const eventDate = sanitize(body.eventDate);
  const guestCount = sanitize(body.guestCount);
  const details = sanitize(body.details);

  if (!name || !phone || !eventType || !eventDate || !guestCount) {
    return NextResponse.json(
      { error: "Please fill in all required fields." },
      { status: 400 }
    );
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { background: #0a0a0a; color: #f0ece4; font-family: Georgia, serif; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
    .header { border-bottom: 1px solid #c9a84c; padding-bottom: 24px; margin-bottom: 32px; }
    .brand { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #c9a84c; margin-bottom: 8px; }
    h1 { font-size: 28px; font-weight: 600; margin: 0; color: #f0ece4; }
    .call-out { background: #c9a84c; color: #0a0a0a; padding: 16px 20px; margin-bottom: 32px; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; }
    .field { margin-bottom: 20px; }
    .field-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #6b6b6b; font-family: Arial, sans-serif; margin-bottom: 4px; }
    .field-value { font-size: 16px; color: #f0ece4; }
    .divider { height: 1px; background: #1f1f1f; margin: 24px 0; }
    .footer { font-size: 11px; color: #6b6b6b; font-family: Arial, sans-serif; margin-top: 40px; border-top: 1px solid #1f1f1f; padding-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="brand">Garnish</p>
      <h1>New Inquiry from ${name}</h1>
    </div>

    <div class="call-out">
      📞 Call them at: ${phone}
    </div>

    <div class="field">
      <div class="field-label">Full Name</div>
      <div class="field-value">${name}</div>
    </div>
    <div class="field">
      <div class="field-label">Phone Number</div>
      <div class="field-value">${phone}</div>
    </div>
    ${email ? `<div class="field"><div class="field-label">Email</div><div class="field-value">${email}</div></div>` : ""}

    <div class="divider"></div>

    <div class="field">
      <div class="field-label">Type of Event</div>
      <div class="field-value">${eventType}</div>
    </div>
    <div class="field">
      <div class="field-label">Event Date</div>
      <div class="field-value">${eventDate}</div>
    </div>
    <div class="field">
      <div class="field-label">Estimated Guests</div>
      <div class="field-value">${guestCount}</div>
    </div>

    ${
      details
        ? `<div class="divider"></div>
    <div class="field">
      <div class="field-label">Additional Details</div>
      <div class="field-value" style="white-space:pre-wrap;">${details}</div>
    </div>`
        : ""
    }

    <div class="footer">
      Submitted via theprivatebar.com &bull; ${new Date().toUTCString()}
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Garnish <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      replyTo: email || undefined,
      subject: `New Inquiry from ${name}`,
      html: emailHtml,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resend error:", err);
    return NextResponse.json(
      { error: "Failed to send your inquiry. Please try again or call directly." },
      { status: 500 }
    );
  }
}
