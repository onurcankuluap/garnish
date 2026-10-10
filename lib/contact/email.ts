import type { LeadRecord } from "@/lib/leads/types";
import { escapeHtml as e, telHref } from "./escape";
import { BUSINESS_TZ, formatLongDate } from "./dates";
import { extras as EXTRAS } from "@/lib/content/facts";

const METHOD_LABEL: Record<string, string> = { phone: "Phone call", email: "Email" };

/** "7:30 pm" for "19:30". */
export function formatTime(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "am" : "pm"}`;
}

export type InquiryEmail = { subject: string; html: string; text: string; replyTo?: string };

/**
 * Builds the owner notification for a lead. Pure and deterministic (the
 * timestamp comes from the record), so a retry sends a byte-identical email
 * and Resend's idempotency key dedupes it. Every user value is HTML-encoded.
 */
export function buildInquiryEmail(lead: LeadRecord): InquiryEmail {
  const d = lead.data;
  const firstName = d.name.split(" ")[0] || d.name;
  const date = formatLongDate(d.eventDate);
  const submittedAt = new Date(lead.createdAt).toLocaleString("en-US", {
    timeZone: BUSINESS_TZ,
    dateStyle: "long",
    timeStyle: "short",
  });
  const ref = lead.id.slice(0, 8).toUpperCase();
  // Booking-flow fields are optional; leads stored before they existed lack them.
  const time = d.eventTime ? formatTime(d.eventTime) : "";
  const when = time ? `${date}, ${time} ET` : date;
  const extrasText = (d.extras ?? []).map((k) => EXTRAS.find((x) => x.key === k)?.label ?? k).join(", ");
  const method = d.contactMethod ? METHOD_LABEL[d.contactMethod] ?? "" : "";
  const via = d.source === "book" ? "the booking flow (/book)" : "the inquiry form";

  const subject = `New inquiry from ${d.name}${d.plan ? ` (${d.plan})` : ""} [${ref}]`;

  const replyHref = d.email
    ? `mailto:${encodeURIComponent(d.email).replace(/%40/g, "@")}?subject=${encodeURIComponent(
        "Re: Your Garnish inquiry"
      )}&body=${encodeURIComponent(
        `Hi ${firstName},\n\nThank you for reaching out to Garnish. I'd love to discuss your event on ${date}.\n\n`
      )}`
    : null;

  const label = (t: string) =>
    `<p style="margin:0 0 4px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#9a9a9a;">${t}</p>`;
  const value = (t: string, extra = "") =>
    `<p style="margin:0;font-size:15px;color:#f0ece4;${extra}">${t}</p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
<tr><td style="padding-bottom:28px;border-bottom:1px solid #c9a84c;">
  <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.35em;text-transform:uppercase;color:#c9a84c;">Garnish</p>
  <h1 style="margin:0;font-size:26px;font-weight:600;color:#f0ece4;font-family:Georgia,serif;line-height:1.2;">New inquiry</h1>
  <p style="margin:6px 0 0;font-size:13px;color:#9a9a9a;">from ${e(d.name)} &middot; ref ${e(ref)}</p>
</td></tr>
<tr><td style="padding:24px 0;">
  <a href="${e(telHref(d.phone))}" style="display:inline-block;background:#c9a84c;color:#0a0a0a;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:14px 24px;margin:0 12px 8px 0;">Call ${e(firstName)}</a>
  ${replyHref ? `<a href="${e(replyHref)}" style="display:inline-block;color:#c9a84c;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:13px 24px;border:1px solid #c9a84c;">Reply by email</a>` : ""}
</td></tr>
${d.plan ? `<tr><td style="background:#1a1508;border:1px solid #c9a84c;padding:16px 24px;">${label("Selected package")}${value(e(d.plan), "color:#c9a84c;font-family:Georgia,serif;font-size:18px;")}</td></tr>` : ""}
<tr><td style="background:#161616;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td width="50%" style="padding-bottom:18px;vertical-align:top;">${label("Name")}${value(e(d.name))}</td>
        <td width="50%" style="padding-bottom:18px;vertical-align:top;">${label("Phone")}${value(e(d.phone))}</td></tr>
    ${d.email ? `<tr><td colspan="2" style="padding-bottom:18px;">${label("Email")}${value(e(d.email))}</td></tr>` : ""}
    <tr><td style="padding-bottom:18px;vertical-align:top;">${label("Event type")}${value(e(d.eventType))}</td>
        <td style="padding-bottom:18px;vertical-align:top;">${label("Event date")}${value(e(when), "color:#c9a84c;")}</td></tr>
    ${d.location ? `<tr><td colspan="2" style="padding-bottom:18px;">${label("Town or venue")}${value(e(d.location))}</td></tr>` : ""}
    <tr><td style="padding-bottom:18px;vertical-align:top;">${label("Guests")}${value(e(d.guestCount))}</td>
        <td style="padding-bottom:18px;vertical-align:top;">${d.hours ? `${label("Hours")}${value(e(d.hours))}` : ""}</td></tr>
    ${extrasText ? `<tr><td colspan="2" style="padding-bottom:18px;">${label("Also asked for")}${value(e(extrasText))}</td></tr>` : ""}
    ${method ? `<tr><td colspan="2" style="padding-bottom:18px;">${label("Preferred contact")}${value(e(method))}</td></tr>` : ""}
    ${d.details ? `<tr><td colspan="2" style="border-top:1px solid #2a2a2a;padding-top:18px;">${label("Details")}${value(e(d.details), "font-size:14px;line-height:1.7;white-space:pre-wrap;")}</td></tr>` : ""}
  </table>
</td></tr>
<tr><td style="padding-top:24px;"><p style="margin:0;font-size:11px;color:#8a8a8a;">Submitted via ${e(via)} on garnish.info &middot; ${e(submittedAt)} ET &middot; lead ${e(lead.id)}</p></td></tr>
</table></td></tr></table>
</body></html>`;

  const text = [
    `New inquiry (ref ${ref})`,
    "",
    `Name: ${d.name}`,
    `Phone: ${d.phone}`,
    d.email ? `Email: ${d.email}` : null,
    d.plan ? `Package: ${d.plan}` : null,
    `Event: ${d.eventType}`,
    `Date: ${when}`,
    d.location ? `Town or venue: ${d.location}` : null,
    `Guests: ${d.guestCount}`,
    d.hours ? `Hours: ${d.hours}` : null,
    extrasText ? `Also asked for: ${extrasText}` : null,
    method ? `Preferred contact: ${method}` : null,
    d.details ? `\nDetails:\n${d.details}` : null,
    "",
    `Submitted via ${via}, ${submittedAt} ET · lead ${lead.id}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return { subject, html, text, replyTo: d.email || undefined };
}
