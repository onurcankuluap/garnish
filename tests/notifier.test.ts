import { describe, expect, it } from "vitest";
import { createResendNotifier, resolveMailConfig, type EmailClient } from "@/lib/contact/notifier";

const email = { subject: "s", html: "<p>h</p>", text: "t", idempotencyKey: "garnish-lead-1" };

function notifierReturning(impl: () => Promise<unknown>, timeoutMs = 50) {
  const client: EmailClient = { emails: { send: () => impl() } };
  return createResendNotifier({ client, from: "Garnish <bookings@send.garnish.info>", to: "owner@example.com", timeoutMs });
}

describe("Resend notifier", () => {
  it("success needs a message id", async () => {
    expect(await notifierReturning(async () => ({ data: { id: "em_1" }, error: null })).send(email)).toEqual({
      ok: true,
      providerId: "em_1",
    });
  });

  it.each([
    [{ name: "rate_limit_exceeded", statusCode: 429, message: "" }, "rate_limited"],
    [{ name: "daily_quota_exceeded", statusCode: 429, message: "" }, "quota_exceeded"],
    [{ name: "invalid_api_key", statusCode: 403, message: "" }, "config_invalid"],
    [{ name: "invalid_from_address", statusCode: 422, message: "" }, "invalid_address"],
    [{ name: "validation_error", statusCode: 422, message: "Invalid `to` field." }, "invalid_address"],
    [{ name: "validation_error", statusCode: 422, message: "The domain is not verified." }, "rejected"],
    [{ name: "application_error", statusCode: null, message: "Unable to fetch data." }, "network"],
    [{ name: "internal_server_error", statusCode: 500, message: "" }, "provider_error"],
  ])("maps %o to %s", async (error, code) => {
    const r = await notifierReturning(async () => ({ data: null, error })).send(email);
    expect(r).toMatchObject({ ok: false, code });
  });

  it.each([
    [undefined],
    [null],
    ["OK"],
    [{ data: null, error: null }],
    [{ data: { id: 42 }, error: null }],
    [{}],
  ])("unexpected response shape %o is a failure", async (shape) => {
    expect(await notifierReturning(async () => shape).send(email)).toMatchObject({ ok: false, code: "unexpected_response" });
  });

  it("times out", async () => {
    expect(await notifierReturning(() => new Promise(() => {}), 10).send(email)).toMatchObject({ ok: false, code: "timeout" });
  });

  it("a thrown network error is a failure, not an exception", async () => {
    expect(
      await notifierReturning(async () => {
        throw new TypeError("fetch failed");
      }).send(email)
    ).toMatchObject({ ok: false, code: "network" });
  });

  it("passes the idempotency key through to Resend", async () => {
    let seen: unknown;
    const client: EmailClient = {
      emails: { send: async (_p, o) => ((seen = o), { data: { id: "x" }, error: null }) },
    };
    await createResendNotifier({ client, from: "f", to: "t" }).send(email);
    expect(seen).toEqual({ idempotencyKey: "garnish-lead-1" });
  });
});

describe("mail config", () => {
  const base = { RESEND_API_KEY: "re_test", ADMIN_EMAIL: "owner@example.com" };

  it("production requires CONTACT_FROM", () => {
    expect(resolveMailConfig({ ...base, NODE_ENV: "production" })).toMatchObject({ ok: false, code: "config_missing" });
  });

  it("production refuses the resend.dev sandbox sender", () => {
    expect(
      resolveMailConfig({ ...base, NODE_ENV: "production", CONTACT_FROM: "Garnish <onboarding@resend.dev>" })
    ).toMatchObject({ ok: false, code: "config_invalid" });
  });

  it("development falls back to the sandbox sender", () => {
    expect(resolveMailConfig({ ...base, NODE_ENV: "development" })).toMatchObject({
      ok: true,
      from: "Garnish <onboarding@resend.dev>",
    });
  });

  it("missing key or recipient is a config error", () => {
    expect(resolveMailConfig({ NODE_ENV: "development" })).toMatchObject({
      ok: false,
      missing: ["RESEND_API_KEY", "ADMIN_EMAIL"],
    });
  });

  it("production with a verified-domain sender is accepted", () => {
    expect(
      resolveMailConfig({ ...base, NODE_ENV: "production", CONTACT_FROM: "Garnish <bookings@send.garnish.info>" })
    ).toMatchObject({ ok: true });
  });
});
