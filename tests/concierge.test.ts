import { describe, expect, it, vi } from "vitest";
import { SAFE_REPLY, extractSelection, guardReply, intents, localAnswer, turnBand } from "@/lib/concierge/grounding";
import { MAX_INPUT_CHARS, ask } from "@/lib/concierge/client";
import { handleChat, type Upstream } from "@/lib/chat/handler";
import { MemoryRateLimiter } from "@/lib/server/rateLimit";
import { bookHref } from "@/lib/compose/selection";
import { business, claims, pricingTerms, tiers } from "@/lib/content/facts";

/** Every string an unverified or missing fact holds: none may ever be stated. */
function unverifiedStrings(): string[] {
  const out: string[] = [];
  for (const f of Object.values(claims)) {
    if (f.verified || f.value === null) continue;
    if (Array.isArray(f.value)) out.push(...f.value.map(String));
    else out.push(String(f.value));
  }
  for (const t of tiers) if (!t.rate.verified) out.push(`$${t.rate.value}`, `${t.rate.value}/hr`);
  for (const f of Object.values(pricingTerms)) if (!f.verified && f.value !== null) out.push(String(f.value));
  return out.filter((s) => s.length > 1);
}

const QUESTIONS = [
  "How much does it cost?",
  "What are your prices per hour?",
  "Do you travel to Philadelphia?",
  "Do you serve Washington DC?",
  "Do you bring the alcohol? Are you licensed and insured?",
  "What's the deposit and cancellation policy?",
  "How many years of experience do you have?",
  "Who is the bartender?",
  "What packages do you have?",
  "Do you do weddings?",
  "How can I contact you?",
  "Are you a real person?",
  "hi",
  "Are you available on June 14 for a wedding with 80 guests for 5 hours?",
];

describe("concierge grounding: local answers come from facts.ts only", () => {
  it("answers every business-fact question locally, without the AI", () => {
    for (const q of QUESTIONS) expect(localAnswer(q), q).not.toBeNull();
  });

  it("never states an unverified or missing fact, in any local answer", () => {
    const banned = unverifiedStrings();
    expect(banned.length).toBeGreaterThan(5);
    for (const q of QUESTIONS) {
      const a = localAnswer(q)!;
      for (const b of banned) expect(a.text, `${q} → ${b}`).not.toContain(b);
      expect(guardReply(a.text).replaced, q).toBe(false);
    }
  });

  it("for unverified facts it says Onur will confirm", () => {
    const owner = business.ownerFirstName.value;
    for (const q of ["How much does it cost?", "Do you bring the alcohol?", "Is there a deposit?", "Do you travel to Philadelphia?"]) {
      expect(localAnswer(q)!.text, q).toMatch(new RegExp(`${owner} (confirms|sends)`));
    }
  });

  it("states verified facts: base town, phone, event types, AI identity", () => {
    expect(localAnswer("Where are you based?")!.text).toContain(business.baseTown.value.label);
    expect(localAnswer("What's your phone number?")!.text).toContain(business.phone.value.display);
    expect(localAnswer("Do you do weddings?")!.text).toMatch(/weddings/);
    expect(localAnswer("Are you a bot?")!.text).toMatch(/AI assistant, not Onur/);
  });

  it("leaves other questions to the AI", () => {
    expect(localAnswer("Can you make a smoky mezcal drink?")).toBeNull();
    expect(localAnswer("What garnish goes with a gin and tonic?")).toBeNull();
  });

  it("intent detection", () => {
    expect(intents("Are you free on Saturday?")).toContain("book");
    expect(intents("how much for 4 hours")).toContain("price");
    expect(intents("Is a deposit required?")).toContain("terms");
  });
});

describe("concierge → booking handoff", () => {
  it("booking intent offers the action, pre-filled through selection.ts", () => {
    const a = localAnswer("Can I book you for a wedding with 80 guests for 5 hours, standard bar with a DJ?")!;
    expect(a.action?.kind).toBe("book");
    expect(a.action!.selection).toEqual({ event: "wedding", guests: 80, hours: 5, tier: "standard", extras: ["dj"] });
    expect(bookHref(a.action!.selection)).toBe("/book?event=wedding&guests=80&hours=5&tier=standard&extras=dj");
  });

  it("price questions also hand off (the quote comes through booking)", () => {
    expect(localAnswer("How much for a birthday?")!.action?.selection.event).toBe("birthday");
  });

  it("extraction is validated: out-of-range values and unknown words are dropped", () => {
    expect(extractSelection("a party of 99999 guests for 40 hours")).toEqual({ event: "private-party", guests: null, hours: null, tier: null, extras: [] });
    expect(extractSelection("bartender + dj for a corporate event")).toMatchObject({ event: "corporate", tier: "dj", extras: [] });
  });

  it("no personal data reaches the handoff URL", () => {
    const a = localAnswer("Book me, Jane Smith, jane@example.com, 302-555-0100, for a wedding in Lewes on June 14")!;
    expect(bookHref(a.action!.selection)).toBe("/book?event=wedding");
  });

  it("turn bands for analytics", () => {
    expect([1, 2, 3, 4, 9].map(turnBand)).toEqual(["1", "2-3", "2-3", "4+", "4+"]);
  });
});

describe("reply guard", () => {
  it("replaces AI replies that assert unverified claims", () => {
    for (const r of [
      "Basic starts at $75/hr.",
      "Standard is 110 an hour.",
      "We serve Philadelphia and Washington DC.",
      "Onur has 8 years of experience.",
      "He worked at Bardea Food & Drink.",
      "Onur will call you back within 24 hours.",
      "Yes, we're fully licensed and insured.",
      "A 50% deposit is required.",
      "Standard is our most popular package.",
    ]) {
      expect(guardReply(r), r).toEqual({ text: SAFE_REPLY, replaced: true });
    }
  });

  it("passes ordinary replies through untouched", () => {
    const r = "A gin and tonic loves a twist of grapefruit and a sprig of rosemary.";
    expect(guardReply(r)).toEqual({ text: r, replaced: false });
  });

  it("the safe reply itself states nothing unverified", () => {
    for (const b of unverifiedStrings()) expect(SAFE_REPLY).not.toContain(b);
  });
});

describe("/api/chat applies the guard (contract unchanged, upstream mocked)", () => {
  const T = 1_790_000_000_000;
  const deps = (upstream: Upstream) => ({
    limiter: new MemoryRateLimiter(12, 60_000, () => T),
    globalLimiter: new MemoryRateLimiter(1000, 86_400_000, () => T),
    upstream,
    hashIp: (ip: string) => `h:${ip}`,
    now: () => T,
    timeoutMs: 50,
  });
  const req = (message: string) =>
    new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) });
  const reply = (text: string): Upstream => async () => new Response(JSON.stringify({ reply: text }), { status: 200 });

  it("an unverified claim from the upstream is replaced; shape stays { reply }", async () => {
    const res = await handleChat(req("tell me about pricing"), deps(reply("Basic is $75 per hour.")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reply: SAFE_REPLY });
  });

  it("a harmless reply is passed through as is", async () => {
    const res = await handleChat(req("gin?"), deps(reply("Try a gin fizz.")));
    expect(await res.json()).toEqual({ reply: "Try a gin fizz." });
  });
});

describe("client wrapper (no network: fetch is mocked)", () => {
  const okFetch = (reply: string) => vi.fn(async () => new Response(JSON.stringify({ reply }), { status: 200 }));

  it("fact questions never call fetch", async () => {
    const f = vi.fn();
    const r = await ask("How much is it?", { fetchImpl: f as unknown as typeof fetch, online: true });
    expect(f).not.toHaveBeenCalled();
    expect(r.ok && r.answer.source).toBe("facts");
  });

  it("other questions call /api/chat with exactly { message }", async () => {
    const f = okFetch("Try a gin fizz.");
    const r = await ask("  Can you make a gin fizz?  ", { fetchImpl: f as unknown as typeof fetch, online: true });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/chat");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ message: "Can you make a gin fizz?" });
    expect(r).toMatchObject({ ok: true, answer: { text: "Try a gin fizz.", source: "upstream" } });
  });

  it("a guarded reply carries the booking action", async () => {
    const r = await ask("Tell me something about a smoky drink", { fetchImpl: okFetch("It is $75.") as unknown as typeof fetch, online: true });
    expect(r).toMatchObject({ ok: true, answer: { source: "guard", text: SAFE_REPLY, action: { kind: "book" } } });
  });

  it("rate limit, timeout, server error, network and offline map to clear states", async () => {
    const res = (status: number, body: unknown, headers: Record<string, string> = {}) =>
      vi.fn(async () => new Response(JSON.stringify(body), { status, headers })) as unknown as typeof fetch;
    const q = "Can you make a negroni?";
    expect(await ask(q, { fetchImpl: res(429, { error: "x" }, { "Retry-After": "30" }), online: true })).toMatchObject({ ok: false, kind: "rate_limited", retryAfter: 30, retry: false });
    expect(await ask(q, { fetchImpl: res(504, { error: "x" }), online: true })).toMatchObject({ kind: "timeout", retry: true });
    expect(await ask(q, { fetchImpl: res(502, { error: "x" }), online: true })).toMatchObject({ kind: "unavailable", retry: true });
    expect(await ask(q, { fetchImpl: res(200, { nope: 1 }), online: true })).toMatchObject({ kind: "unavailable" });
    const boom = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await ask(q, { fetchImpl: boom, online: true })).toMatchObject({ kind: "network", retry: true });
    const never = vi.fn((_u: string, init: RequestInit) => new Promise<Response>((_, rej) => init.signal!.addEventListener("abort", () => rej(new Error("aborted"))))) as unknown as typeof fetch;
    expect(await ask(q, { fetchImpl: never, online: true, timeoutMs: 20 })).toMatchObject({ kind: "timeout" });
    const f = vi.fn();
    expect(await ask(q, { fetchImpl: f as unknown as typeof fetch, online: false })).toMatchObject({ kind: "offline" });
    expect(f).not.toHaveBeenCalled();
  });

  it("enforces the input limit before any request", async () => {
    const f = vi.fn();
    expect(await ask("x".repeat(MAX_INPUT_CHARS + 1), { fetchImpl: f as unknown as typeof fetch, online: true })).toMatchObject({ kind: "too_long" });
    expect(await ask("   ", { fetchImpl: f as unknown as typeof fetch, online: true })).toMatchObject({ kind: "empty" });
    expect(f).not.toHaveBeenCalled();
  });
});
