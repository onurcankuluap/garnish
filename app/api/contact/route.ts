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

  const formattedDate = eventDate
    ? new Date(eventDate + "T12:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : eventDate;

  const submittedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "long",
    timeStyle: "short",
  });

  const replyHref = email
    ? `mailto:${email}?subject=Re%3A%20Your%20Garnish%20Inquiry&body=Hi%20${encodeURIComponent(name.split(" ")[0])}%2C%0A%0AThank%20you%20for%20reaching%20out%20to%20Garnish.%20I%E2%80%99d%20love%20to%20discuss%20your%20event%20on%20${encodeURIComponent(formattedDate)}.%0A%0A`
    : `tel:${phone}`;

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="padding-bottom:32px;border-bottom:1px solid #c9a84c;">
          <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.35em;text-transform:uppercase;color:#c9a84c;">Garnish</p>
          <h1 style="margin:0;font-size:26px;font-weight:600;color:#f0ece4;font-family:Georgia,serif;line-height:1.2;">New Inquiry</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#888;letter-spacing:0.02em;">from ${name}</p>
        </td></tr>

        <!-- Action buttons -->
        <tr><td style="padding:28px 0 24px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:12px;">
                <a href="tel:${phone}" style="display:inline-block;background:#c9a84c;color:#0a0a0a;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:14px 24px;">
                  Call ${name.split(" ")[0]} →
                </a>
              </td>
              ${email ? `<td>
                <a href="${replyHref}" style="display:inline-block;background:transparent;color:#c9a84c;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:13px 24px;border:1px solid #c9a84c;">
                  Reply by Email →
                </a>
              </td>` : ""}
            </tr>
          </table>
        </td></tr>

        <!-- Contact info -->
        <tr><td style="background:#161616;padding:24px;margin-bottom:2px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding-bottom:20px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#555;">Full Name</p>
                <p style="margin:0;font-size:15px;color:#f0ece4;">${name}</p>
              </td>
              <td width="50%" style="padding-bottom:20px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#555;">Phone</p>
                <p style="margin:0;font-size:15px;color:#f0ece4;">${phone}</p>
              </td>
            </tr>
            ${email ? `<tr><td colspan="2">
              <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#555;">Email</p>
              <p style="margin:0;font-size:15px;color:#f0ece4;">${email}</p>
            </td></tr>` : ""}
          </table>
        </td></tr>

        <!-- Spacer -->
        <tr><td style="height:2px;background:#0f0f0f;"></td></tr>

        <!-- Event info -->
        <tr><td style="background:#161616;padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="padding-bottom:20px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#555;">Event Type</p>
                <p style="margin:0;font-size:15px;color:#f0ece4;">${eventType}</p>
              </td>
              <td width="33%" style="padding-bottom:20px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#555;">Event Date</p>
                <p style="margin:0;font-size:15px;color:#c9a84c;font-family:Georgia,serif;">${formattedDate}</p>
              </td>
              <td width="33%" style="padding-bottom:20px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#555;">Guests</p>
                <p style="margin:0;font-size:15px;color:#f0ece4;">${guestCount}</p>
              </td>
            </tr>
            ${details ? `<tr><td colspan="3" style="border-top:1px solid #222;padding-top:20px;">
              <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#555;">Additional Details</p>
              <p style="margin:0;font-size:14px;color:#ccc;line-height:1.7;white-space:pre-wrap;">${details}</p>
            </td></tr>` : ""}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:28px;border-top:1px solid #1f1f1f;margin-top:28px;">
          <p style="margin:0;font-size:10px;color:#444;letter-spacing:0.05em;">
            Submitted via garnish.info &nbsp;&bull;&nbsp; ${submittedAt} ET
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
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
