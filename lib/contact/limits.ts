/**
 * Limits shared by the server schema (lib/contact/schema.ts) and the booking
 * flow's client checks (lib/book/flow.ts). No zod here, so the client bundle
 * stays small.
 */
export const MAX_GUESTS = 2000;

/** Hours of service a booking may ask for (matches the configurator's limits). */
export const HOURS_RANGE = { min: 1, max: 12 } as const;

/** How the visitor would like to be contacted (booking flow; optional on /contact). */
// Text messages stay off until the owner confirms the number takes texts (facts register F40).
export const CONTACT_METHODS = ["phone", "email"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

/** Which form sent the inquiry. Old clients send nothing and count as "contact". */
export const SOURCES = ["contact", "book"] as const;

export const MAX_LOCATION_CHARS = 120;
