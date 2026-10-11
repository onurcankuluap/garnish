/** HTML-encodes text for element content and quoted attribute values. */
export function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}

/** A tel: href with nothing but digits and a leading +. */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const normalised = digits.startsWith("+") ? "+" + digits.slice(1).replace(/\+/g, "") : digits.replace(/\+/g, "");
  return `tel:${normalised}`;
}
