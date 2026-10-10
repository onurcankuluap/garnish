import { describe, expect, it } from "vitest";
import { handleContact } from "@/lib/contact/handler";
import { validateInquiry } from "@/lib/contact/schema";
import { buildInquiryEmail } from "@/lib/contact/email";
import {
  EMPTY_DRAFT,
  STEPS,
  errorCode,
  firstErrorStep,
  fromSelection,
  fromServerFields,
  interpret,
  newKey,
  toPayload,
  toSelection,
  validateStep,
  type Draft,
} from "@/lib/book/flow";
import { NOW, contactRequest, makeDeps, uuid, validBody } from "./helpers";

const TODAY = "2026-10-10";

/** A complete booking as the flow would hold it. */
function draft(o: Partial<Draft> = {}): Draft {
  return {
    ...EMPTY_DRAFT,
    eventDate: "2027-06-14",
    eventTime: "18:30",
    location: "Rehoboth Beach",
    event: "wedding",
    guests: "60",
    hours: "4.5",
    tier: "standard",
    extras: ["custom-cocktails", "dj"],
    name: "Jane Smith",
    phone: "+1 (302) 555-0100",
    email: "jane@example.com",
    contactMethod: "email",
    details: "Beach venue, sunset ceremony.",
    ...o,
  };
}

const bookBody = (o: Partial<Draft> = {}) => toPayload(draft(o), NOW.getTime() - 60_000);

describe("inquiry schema: booking fields (optional, compatible)", () => {
  it("the /contact body without any new field is still valid, with defaults", () => {
    const v = validateInquiry(validBody(), NOW);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.data).toMatchObject({ eventTime: "", location: "", hours: null, extras: [], contactMethod: "", source: "contact" });
  });

  it("a full booking payload validates and keeps every new field", () => {
    const v = validateInquiry(bookBody(), NOW);
    expect(v.ok).toBe(true);
    if (v.ok)
      expect(v.data).toMatchObject({
        eventType: "Wedding",
        eventTime: "18:30",
        location: "Rehoboth Beach",
        hours: 4.5,
        plan: "Standard",
        extras: ["custom-cocktails", "dj"],
        contactMethod: "email",
        source: "book",
        guestCount: 60,
      });
  });

  it("rejects a malformed time, an off-grid or out-of-range hours value", () => {
    for (const [o, field] of [
      [{ eventTime: "25:00" }, "eventTime"],
      [{ eventTime: "7pm" }, "eventTime"],
      [{ hours: 4.25 }, "hours"],
      [{ hours: 0 }, "hours"],
      [{ hours: 13 }, "hours"],
      [{ contactMethod: "fax" }, "contactMethod"],
      [{ source: "elsewhere" }, "source"],
    ] as const) {
      const v = validateInquiry({ ...validBody(), ...o }, NOW);
      expect(v.ok, JSON.stringify(o)).toBe(false);
      if (!v.ok) expect(Object.keys(v.fields)).toContain(field);
    }
  });

  it("drops unknown or repeated extras rather than storing them", () => {
    const v = validateInquiry({ ...validBody(), extras: ["dj", "dj", "fireworks", 3] }, NOW);
    expect(v.ok && v.data.extras).toEqual(["dj"]);
  });

  it("strips control characters and line breaks from the location", () => {
    const v = validateInquiry({ ...validBody(), location: "  Lewes\r\n\u0000DE  " }, NOW);
    expect(v.ok && v.data.location).toBe("Lewes DE");
  });

  it("source=book requires a location; contactMethod=email requires an email", () => {
    const a = validateInquiry({ ...bookBody(), location: "  " }, NOW);
    expect(!a.ok && a.fields.location).toMatch(/town or venue/i);
    const b = validateInquiry({ ...bookBody(), email: "" }, NOW);
    expect(!b.ok && b.fields.email).toMatch(/email/i);
    // the same gaps are fine on /contact (no source, no method)
    expect(validateInquiry({ ...validBody(), email: "" }, NOW).ok).toBe(true);
  });

  it("the owner email shows the booking details, escaped", () => {
    const v = validateInquiry(bookBody({ location: "<b>Lewes</b>" }), NOW);
    if (!v.ok) throw new Error("invalid");
    const mail = buildInquiryEmail({ v: 1, id: "abcdef12-0000-4000-8000-000000000000", idempotencyKey: "k", createdAt: NOW.toISOString(), data: v.data, notification: { state: "pending", attempts: 0 } });
    expect(mail.text).toMatch(/Date: June 14, 2027, 6:30 pm ET/);
    expect(mail.text).toMatch(/Hours: 4\.5/);
    expect(mail.text).toMatch(/Also asked for: Custom cocktails, A DJ/);
    expect(mail.text).toMatch(/Preferred contact: Email/);
    expect(mail.text).toMatch(/booking flow/);
    expect(mail.html).toContain("&lt;b&gt;Lewes&lt;/b&gt;");
    expect(mail.html).not.toContain("<b>Lewes</b>");
  });

  it("an older stored lead without the new fields still builds an email", () => {
    const v = validateInquiry(validBody(), NOW);
    if (!v.ok) throw new Error("invalid");
    const { eventTime: _t, location: _l, hours: _h, extras: _e, contactMethod: _m, source: _s, ...old } = v.data;
    void [_t, _l, _h, _e, _m, _s];
    const mail = buildInquiryEmail({ v: 1, id: "abcdef12-0000-4000-8000-000000000000", idempotencyKey: "k", createdAt: NOW.toISOString(), data: old, notification: { state: "pending", attempts: 0 } });
    expect(mail.text).toMatch(/Date: June 14, 2027\n/);
    expect(mail.text).not.toMatch(/Hours:|Town or venue|Preferred contact/);
  });
});

describe("POST /api/contact with a booking", () => {
  it("stores the booking in the durable store and notifies once", async () => {
    const { deps, store, notifier } = makeDeps();
    const res = await handleContact(contactRequest(bookBody()), deps);
    expect(res.status).toBe(200);
    const [lead] = await store.list(10);
    expect(lead.data).toMatchObject({ source: "book", location: "Rehoboth Beach", hours: 4.5 });
    expect(notifier.sent).toHaveLength(1);
  });

  it("idempotent double submit: same key twice → one lead, one email, same id, second marked duplicate", async () => {
    const { deps, store, notifier } = makeDeps();
    const key = uuid();
    const r1 = await handleContact(contactRequest(bookBody(), { key }), deps);
    const r2 = await handleContact(contactRequest(bookBody(), { key }), deps);
    const [b1, b2] = [await r1.json(), await r2.json()];
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(b2.id).toBe(b1.id);
    expect(b1.duplicate).toBe(false);
    expect(b2.duplicate).toBe(true);
    expect(await store.list(10)).toHaveLength(1);
    expect(notifier.sent).toHaveLength(1);
  });

  it("concurrent double submit (two clicks in flight) still stores one lead", async () => {
    const { deps, store, notifier } = makeDeps();
    const key = uuid();
    const [r1, r2] = await Promise.all([
      handleContact(contactRequest(bookBody(), { key }), deps),
      handleContact(contactRequest(bookBody(), { key }), deps),
    ]);
    // the second sees the first still pending: 202 (saved, notification not yet confirmed) or 409 (in progress)
    expect([r1.status, r2.status].every((s) => [200, 202, 409].includes(s))).toBe(true);
    expect(await store.list(10)).toHaveLength(1);
    expect(notifier.sent).toHaveLength(1);
  });

  it("a retry after a store outage, with the same key, saves exactly once", async () => {
    const { deps, store, notifier } = makeDeps();
    const key = uuid();
    store.failWith = new Error("down");
    const r1 = await handleContact(contactRequest(bookBody(), { key }), deps);
    expect(r1.status).toBe(503);
    store.failWith = null;
    const r2 = await handleContact(contactRequest(bookBody(), { key }), deps);
    expect(r2.status).toBe(200);
    expect(await store.list(10)).toHaveLength(1);
    expect(notifier.sent).toHaveLength(1);
  });

  it("honeypot still applies to bookings", async () => {
    const { deps, store, notifier } = makeDeps();
    const res = await handleContact(contactRequest(bookBody({ website: "spam" })), deps);
    expect(res.status).toBe(200);
    expect(await store.list(10)).toHaveLength(0);
    expect(notifier.sent).toHaveLength(0);
  });
});

describe("booking flow model", () => {
  it("the five steps are date, place, bar, you, review", () => {
    expect(STEPS.map((s) => s.key)).toEqual(["date", "place", "bar", "you", "review"]);
  });

  it("validates each step on its own, mirroring the server", () => {
    const d = { ...EMPTY_DRAFT };
    expect(Object.keys(validateStep("date", d, TODAY))).toEqual(["eventDate"]);
    expect(validateStep("date", { ...d, eventDate: "2026-10-09" }, TODAY).eventDate).toMatch(/today onward/);
    expect(validateStep("date", { ...d, eventDate: "2026-10-10" }, TODAY)).toEqual({});
    expect(validateStep("date", { ...d, eventDate: "2026-10-10", eventTime: "9" }, TODAY).eventTime).toBeTruthy();
    expect(Object.keys(validateStep("place", d, TODAY))).toEqual(["location"]);
    expect(Object.keys(validateStep("bar", d, TODAY)).sort()).toEqual(["event", "guests"]);
    expect(Object.keys(validateStep("you", d, TODAY)).sort()).toEqual(["name", "phone"]);
    expect(validateStep("you", { ...draft(), email: "" }, TODAY).email).toMatch(/another way/);
    expect(validateStep("review", draft(), TODAY)).toEqual({});
  });

  it("client checks agree with the server schema on the same answers", () => {
    const cases: Partial<Draft>[] = [{}, { guests: "0" }, { guests: "2001" }, { phone: "12" }, { email: "nope" }, { eventTime: "24:00" }, { location: "" }, { name: " " }];
    for (const o of cases) {
      const client = Object.keys(validateStep("review", draft(o), TODAY)).length === 0;
      const server = validateInquiry(bookBody(o), NOW).ok;
      expect(client, JSON.stringify(o)).toBe(server);
    }
  });

  it("the card fills the bar step and round-trips without personal data", () => {
    const d = fromSelection({ event: "birthday", guests: 40, hours: 3, tier: "dj", extras: ["dj"] });
    expect(d).toMatchObject({ event: "birthday", guests: "40", hours: "3", tier: "dj", extras: ["dj"] });
    const sel = toSelection({ ...d, name: "Jane", phone: "302", location: "Lewes" });
    expect(sel).toEqual({ event: "birthday", guests: 40, hours: 3, tier: "dj", extras: ["dj"] });
    expect(JSON.stringify(sel)).not.toMatch(/Jane|Lewes|302/);
  });

  it("maps server field errors back to the right step", () => {
    const e = fromServerFields({ guestCount: "Please enter the number of guests.", eventType: "x", unknown: "y" });
    expect(e).toEqual({ guests: "Please enter the number of guests.", event: "x" });
    expect(firstErrorStep(e)).toBe("bar");
    expect(firstErrorStep(fromServerFields({ eventDate: "x", phone: "y" }))).toBe("date");
  });

  it("interprets every response state", () => {
    expect(interpret(200, { ok: true, ref: "AB12", notification: "sent", duplicate: true, mode: "mock" }, null)).toEqual({ ok: true, ref: "AB12", notified: true, duplicate: true, mock: true });
    expect(interpret(202, { ok: true, ref: "X", notification: "failed" }, null)).toMatchObject({ ok: true, notified: false });
    expect(interpret(422, { fields: { phone: "bad" } }, null)).toMatchObject({ kind: "validation", errors: { phone: "bad" } });
    expect(interpret(429, { error: "Too many" }, "120")).toEqual({ kind: "rate_limited", message: "Too many", retryAfter: 120 });
    expect(interpret(503, { error: "down", code: "store_failed" }, null)).toMatchObject({ kind: "store" });
    expect(interpret(400, { error: "quick", code: "too_fast" }, null)).toMatchObject({ kind: "too_fast" });
    expect(interpret(400, { error: "old", code: "stale_form" }, null)).toMatchObject({ kind: "stale" });
    expect(interpret(500, null, null)).toMatchObject({ kind: "other" });
  });

  it("analytics error codes are a closed set", () => {
    expect(errorCode({ kind: "offline", message: "" })).toBe("network");
    expect(errorCode({ kind: "too_fast", message: "" })).toBe("other");
    expect(errorCode({ kind: "store", message: "" })).toBe("store");
  });

  it("idempotency keys are RFC 4122 v4, accepted by the handler", () => {
    expect(newKey()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const fallback = newKey({ getRandomValues: (b: Uint8Array) => b.fill(255) } as unknown as Crypto);
    expect(fallback).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
