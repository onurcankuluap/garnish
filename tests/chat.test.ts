import { describe, expect, it } from "vitest";
import { handleChat, type ChatDeps, type Upstream } from "@/lib/chat/handler";
import { chatDepsFromEnv } from "@/lib/chat/deps";
import { MemoryRateLimiter } from "@/lib/server/rateLimit";

const T = 1_790_000_000_000;

function deps(upstream: Upstream | null, overrides: Partial<ChatDeps> = {}): ChatDeps {
  return {
    limiter: new MemoryRateLimiter(12, 60_000, () => T),
    globalLimiter: new MemoryRateLimiter(1000, 86_400_000, () => T),
    upstream,
    hashIp: (ip) => `h:${ip}`,
    now: () => T,
    timeoutMs: 50,
    ...overrides,
  };
}

const req = (body: unknown, raw?: string) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.5" },
    body: raw ?? JSON.stringify(body),
  });

const ok = (reply: unknown) => async () =>
  new Response(JSON.stringify({ reply }), { status: 200, headers: { "content-type": "application/json" } });

describe("POST /api/chat", () => {
  it("success keeps the { message } -> { reply } contract and rate headers", async () => {
    let sent: string | undefined;
    const res = await handleChat(
      req({ message: "  Do you do weddings?  " }),
      deps(async (m) => ((sent = m), ok("Yes, weddings are on the list.")()))
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reply: "Yes, weddings are on the list." });
    expect(sent).toBe("Do you do weddings?");
    expect(res.headers.get("x-ratelimit-limit")).toBe("12");
  });

  it("upstream error status -> 502 with a structured error", async () => {
    const res = await handleChat(req({ message: "hi" }), deps(async () => new Response("boom", { status: 500 })));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Chat service is temporarily unavailable" });
  });

  it("upstream returns a bad shape -> 502 (no fake fallback reply)", async () => {
    expect((await handleChat(req({ message: "hi" }), deps(ok(42)))).status).toBe(502);
    expect((await handleChat(req({ message: "hi" }), deps(async () => new Response("not json")))).status).toBe(502);
  });

  it("upstream timeout -> 504", async () => {
    const hang: Upstream = (_m, signal) =>
      new Promise((_, reject) =>
        signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))
      );
    const res = await handleChat(req({ message: "hi" }), deps(hang));
    expect(res.status).toBe(504);
  });

  it("network failure -> 502", async () => {
    const res = await handleChat(req({ message: "hi" }), deps(async () => { throw new TypeError("fetch failed"); }));
    expect(res.status).toBe(502);
  });

  it("oversize input: > 3000 chars -> 400, > 16 KB body -> 413; upstream never called", async () => {
    let called = false;
    const up: Upstream = async () => ((called = true), ok("x")());
    expect((await handleChat(req({ message: "a".repeat(3001) }), deps(up))).status).toBe(400);
    expect((await handleChat(req({ message: "a".repeat(20_000) }), deps(up))).status).toBe(413);
    expect(called).toBe(false);
  });

  it("empty message -> 400; malformed JSON -> 400 (was 500)", async () => {
    expect((await handleChat(req({ message: "   " }), deps(ok("x")))).status).toBe(400);
    expect((await handleChat(req(null, "{oops"), deps(ok("x")))).status).toBe(400);
  });

  it("13th message in a minute -> 429", async () => {
    const d = deps(ok("x"));
    for (let i = 0; i < 12; i++) expect((await handleChat(req({ message: "hi" }), d)).status).toBe(200);
    const res = await handleChat(req({ message: "hi" }), d);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("no limiter in live mode fails closed (503)", async () => {
    expect((await handleChat(req({ message: "hi" }), deps(ok("x"), { limiter: null }))).status).toBe(503);
  });

  it("reply text is returned as data, capped, never as HTML", async () => {
    const res = await handleChat(req({ message: "hi" }), deps(ok("<b>" + "x".repeat(5000))));
    const { reply } = (await res.json()) as { reply: string };
    expect(reply.length).toBe(4000);
  });
});

describe("chat mode selection", () => {
  it("mock mode never uses the real upstream URL", async () => {
    const d = chatDepsFromEnv({ GARNISH_AI_API_URL: "https://example.invalid/prod", NODE_ENV: "production" });
    const res = await handleChat(req({ message: "hello" }), d);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { reply: string }).reply).toMatch(/^Test mode/);
  });

  it("mock URL must be loopback", () => {
    const d = chatDepsFromEnv({ GARNISH_AI_MOCK_URL: "https://evil.example" });
    expect(d.upstream).not.toBeNull(); // falls back to the in-process mock
  });

  it("live mode requires https upstream", () => {
    const d = chatDepsFromEnv({ VERCEL_ENV: "production", GARNISH_AI_API_URL: "http://plain.example" });
    expect(d.upstream).toBeNull();
  });
});
