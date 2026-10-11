/**
 * Service mode: decides whether the API routes talk to real services
 * (Resend, Upstash, the AI upstream) or to local mocks.
 *
 * - A Vercel Production deployment is always "live" (a mock flag there is
 *   ignored, so production can never silently stop sending).
 * - Everything else (local `next dev` / `next start`, Vercel Preview) is
 *   "mock" unless GARNISH_SERVICES=live is set explicitly. This keeps preview
 *   deployments, which share the production Resend key and Redis, from
 *   emailing real inboxes or writing production keys.
 */
export type ServiceMode = "live" | "mock";

type Env = Record<string, string | undefined>;

export function serviceMode(env: Env = process.env): ServiceMode {
  if (env.VERCEL_ENV === "production") return "live";
  return env.GARNISH_SERVICES === "live" ? "live" : "mock";
}

/** True for any production-built runtime (Vercel or `next start`). */
export function isProductionBuild(env: Env = process.env): boolean {
  return env.NODE_ENV === "production";
}
