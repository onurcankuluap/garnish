import { MemoryLeadStore } from "@/lib/leads/memoryStore";
import { MemoryRateLimiter } from "@/lib/server/rateLimit";
import { MockNotifier, type Notifier } from "@/lib/contact/notifier";
import type { ContactDeps } from "@/lib/contact/handler";

/** 2026-10-10 15:00 New York (19:00 UTC). */
export const NOW = new Date("2026-10-10T19:00:00Z");

export function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jane Smith",
    phone: "+1 (302) 555-0100",
    email: "jane@example.com",
    eventType: "Wedding",
    eventDate: "2027-06-14",
    guestCount: "60",
    details: "Beach venue, sunset ceremony.",
    plan: "Standard",
    website: "",
    startedAt: NOW.getTime() - 60_000,
    ...overrides,
  };
}

let seq = 0;
export function uuid() {
  seq++;
  return `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
}

export function contactRequest(
  body: unknown,
  opts: { key?: string | null; ip?: string; contentType?: string; method?: string; raw?: string } = {}
) {
  const headers: Record<string, string> = {
    "content-type": opts.contentType ?? "application/json",
    "x-forwarded-for": opts.ip ?? "203.0.113.7",
  };
  if (opts.key !== null) headers["idempotency-key"] = opts.key ?? uuid();
  return new Request("http://localhost/api/contact", {
    method: opts.method ?? "POST",
    headers,
    body: opts.raw ?? JSON.stringify(body),
  });
}

export function makeDeps(overrides: Partial<ContactDeps> = {}) {
  const store = new MemoryLeadStore(() => NOW.getTime());
  const notifier = new MockNotifier();
  let id = 0;
  const deps: ContactDeps = {
    mode: "live",
    store,
    notifier: notifier as Notifier,
    limiter: new MemoryRateLimiter(5, 3_600_000, () => NOW.getTime()),
    globalLimiter: new MemoryRateLimiter(100, 86_400_000, () => NOW.getTime()),
    hashIp: (ip) => `h:${ip}`,
    now: () => NOW,
    newId: () => `0000000${++id}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    ...overrides,
  };
  return { deps, store, notifier };
}
