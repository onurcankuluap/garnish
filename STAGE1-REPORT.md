# Garnish Stage 1: reliability foundation

- **Date:** 2026-10-10
- **Baseline:** `main` = `origin/main` = `f1d2b1e`. Production deployment `dpl_7oT71VTuY7DsRktYEVArYJTkdaav` (the rollback reference).
- **Branches (local only, nothing pushed, merged or deployed):**
  - `fix/garnish-reliability`: Stage 1a, the reliability fixes (this report lives here).
  - `chore/next-upgrade`: Stage 1b, the Next.js 16 upgrade, stacked on 1a.
- **Safety:** no push, no deploy, no Vercel env changes or `env pull`, no DNS or AWS changes. No call to Resend, Upstash, the real chat upstream or any paid API. Every test used mocks or an in-memory store. Local servers ran only on ports 3460–3463 and are stopped. `docs/` was never staged or modified.

---

## 1. Defects fixed (Stage 1a)

Each finding was re-checked against the code at `f1d2b1e` before it was fixed. "Test" names refer to `tests/*.test.ts`. File references are to the 1a branch.

### A. Resend error handling

| | |
|---|---|
| **Before** | `app/api/contact/route.ts:209-219` awaited `resend.emails.send()` and ignored its `{ error }`. Resend v6 does not throw (confirmed in `node_modules/resend/dist/index.mjs`, `fetchRequest` catches everything), so any rejection, 429, bad key or network failure returned `{ ok: true }` and the visitor saw "Thank you". |
| **Fix** | `lib/contact/notifier.ts`: `createResendNotifier` (line 100) never throws and returns a typed result. `classify` (line 74) maps errors to codes: `config_missing`, `config_invalid`, `invalid_address`, `rejected`, `rate_limited` (429 or concurrent idempotent request), `quota_exceeded`, `timeout` (8 s, `withTimeout` at line 111), `network`, `provider_error` (5xx) and `unexpected_response` (no `data.id`). Only the code is stored, never provider text, which can echo addresses. Each send passes a stable Resend `idempotencyKey` (`garnish-lead-<id>`). |
| **Wording** | The success copy is "Your inquiry is saved". The word "delivered" never appears; Resend accepting a request is not delivery (`lib/contact/handler.ts:33`, `COPY`). |
| **Tests** | `notifier.test.ts`: 8 error mappings, 6 unexpected shapes, timeout, thrown network error, idempotency key passthrough. `contact.test.ts`: "Resend error object…", "Resend 429…", "Resend timeout…", "missing mail config…". |

Writing the tests caught a real bug: a 429 `daily_quota_exceeded` was being classified as `rate_limited`. The quota check now runs first.

### B. Verified sending domain

| | |
|---|---|
| **Before** | The sender was hard-coded to `Garnish <onboarding@resend.dev>`, Resend's sandbox. It delivers only to the Resend account owner's own address. |
| **Fix** | `resolveMailConfig` (`lib/contact/notifier.ts:54`): the sender comes from `CONTACT_FROM` and the recipient from `ADMIN_EMAIL` (or the alias `CONTACT_TO`). In any production build (`NODE_ENV=production`), a missing `CONTACT_FROM` is a config error and a `resend.dev` sender is refused. The sandbox fallback applies only in development. Mock mode never sends. |
| **Tests** | `notifier.test.ts`, "mail config" (5 cases). |
| **DNS** | See `DNS-PLAN.md` and §3. Prepared only, not applied. |

### C. Durable lead storage

| | |
|---|---|
| **Before** | The email was the only record. Any failure lost the lead with no trace. |
| **Fix** | A `LeadStore` interface (`lib/leads/types.ts`) with two implementations: `MemoryLeadStore` for tests and mock mode, and `RedisLeadStore` (`lib/leads/redisStore.ts:32`) on the existing `@upstash/redis`. |
| **Record** | Each record holds: `id` (UUID); `idempotencyKey`; `createdAt`; the validated form fields only (no IP, no user agent); and `notification` = `{ state: pending\|sent\|failed, attempts, lastError (code), lastAttemptAt, providerId }`. |
| **Order** | `lib/contact/handler.ts:50`: rate limit, then body, honeypot, fill time, idempotency key, validation, **persist** (step 7), **notify** (step 8), and finally record the state (`notifyLead`, `lib/leads/recovery.ts:18`). |
| **Persistence fails or is unconfigured** | `503`, nothing is sent and no success is shown. The form keeps every field. Test: "persistence failure…", "no store configured…". Browser check: `storefail`. |
| **Notification fails after persisting** | `202`, with "We've received your request and saved it. Our notification is delayed, so we'll confirm by phone or email. If you haven't heard from us within 24 hours, please call." The lead is marked `failed` with its code. Tests: "Resend error object…", "Resend timeout…". Browser check: `notifyfail`. |
| **Status write fails after sending** | The response still states the true outcome. The lead stays `pending`, and recovery picks it up after 5 minutes. Test: "status update failure…". |
| **Idempotency** | The client sends `Idempotency-Key` (a UUID per form session). Redis claims it with `SET NX EX 86400`. If the record write fails, the key is released so a retry works. A duplicate returns the original lead's answer: one lead, one email. Tests: "duplicate idempotency key…", "missing or malformed idempotency key…", plus `leads.test.ts` "dedupes…" and "a failed record write releases the idempotency key…". |
| **Recovery** | `GET /api/leads/recover` (`lib/leads/recoverHandler.ts:27`) re-sends notifications for `failed` leads and for `pending` leads older than 5 minutes, at most 8 attempts each. It reuses the same Resend idempotency key, so a send that timed out but was in fact accepted is not duplicated within 24 hours. `?dry=1` lists the leads without sending. Responses hold ids, states and codes only, no PII. The route returns **404 until `CRON_SECRET` (32+ characters) is set**, and **401** without `Authorization: Bearer <CRON_SECRET>` (constant-time compare). It is compatible with Vercel Cron, but no cron schedule was added. Tests: `leads.test.ts`, "recovery" and "recovery route" (6 cases). |

Recovery procedure for the owner, once `CRON_SECRET` is set in Production:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://www.garnish.info/api/leads/recover?dry=1"   # list
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://www.garnish.info/api/leads/recover"         # re-send
```

Optionally schedule it in `vercel.json` (`"crons": [{ "path": "/api/leads/recover", "schedule": "0 13 * * *" }]`; Hobby allows one run a day). That is an owner decision.

### D. Contact security

| Item | Before | Fix | Test |
|---|---|---|---|
| Validation | Hand checks; email not validated; only `<` and `>` stripped | zod schema `lib/contact/schema.ts:49` (name, phone 7–15 digits, email, event-type enum, package enum with URL spellings normalised, guests 1–2000, details ≤ 2000, control characters and line breaks stripped) | "invalid fields return 422…", "plan spellings…", "subject carries no line breaks" |
| HTML encoding | `"` and `'` unescaped; `href="tel:${phone}"` breakable | `escapeHtml` (`lib/contact/escape.ts:2`) on every user value; `telHref` keeps digits and `+` only; `lib/contact/email.ts` builds the email from the stored lead | "HTML injection is escaped…" |
| Dates | `min` used the UTC date, frozen at build time; past dates accepted by the server | Server: today in `America/New_York`, no past dates, at most 3 years ahead, real calendar dates (`lib/contact/dates.ts`, schema line 69). Client: `min` is New York's today, computed in the browser | "dates are judged in America/New_York…", "after 8 pm New York…"; browser check "date min is New York today" |
| Rate limit | An in-memory `Map`, which does nothing on serverless | Upstash sliding window of 5 per hour per **HMAC-hashed IP** (`RATE_LIMIT_SALT`), plus a fixed site-wide cap of 100 per day. If Redis times out, the limiter fails open and logs; the store then fails closed. Mock and dev modes use the in-memory limiter | "rate limit: sixth request…", "keys are hashed…", "global daily cap…", "limiter outage fails open…" |
| Honeypot | The field was named `website` but posted as `honeypot`, so direct-API bots bypassed it | The `website` field is checked server-side. A hit gets a silent success shape; nothing is stored or sent | "honeypot…" |
| Minimum fill time | None | `startedAt` must be at least 3 s and at most 24 h old. Failing it shows a visible error rather than a fake success, so a fast human with autofill can resend | "minimum fill time…" |
| Request size | Unbounded | A 16 KB cap, read as a stream, that does not trust `Content-Length` (413). Non-JSON gets 415; malformed JSON gets 400 | "oversized body…", "non-JSON content type…" |
| Methods | GET etc. fell through to Next's default | Explicit 405 with an `Allow: POST` header (verified with curl on `next start`) | Manual curl |
| Logs | `console.error("Resend error:", err)` | `lib/server/log.ts` writes JSON with codes and lead ids only. Verified in server output: no names, phones or IPs | "stored lead holds no IP…" |

### E. Accessibility

| Item | Fix | Evidence |
|---|---|---|
| Labels | `htmlFor`/`id` on every field (`components/ContactForm.tsx`) | Lighthouse `label` passes; browser check "every field has a label" |
| Contrast | `--muted` changed from #5a5a5a (2.87:1) to #858585 (5.4:1 on ink, 5.0:1 on the #141414 cards). `--muted-light` changed from #888 to #a3a3a3 to keep the hierarchy. Form labels are 11 px in muted-light. Underlines are white/40 (`app/globals.css:13`) | Lighthouse `color-contrast` passes; a11y 100 |
| Errors | Inline errors with `aria-invalid` and `aria-describedby`; focus moves to the first invalid field; a `role=alert` summary; focus moves to the success heading; a polite live region while saving | Browser checks (6) at 1440 and 390 |
| Focus | A global 2 px gold `:focus-visible` ring with a 3 px offset; `outline-none` removed from the form and chat inputs; a skip link | Browser check "visible focus ring", "first Tab focuses skip link" |
| Nav | `<nav aria-label="Main">`. The desktop header gets the "Book an Event" link it lacked. The mobile menu has a dynamic label, `aria-controls`, `hidden` when closed, Esc to close (focus returns) and 44 px targets | Browser checks "menu: opens…", "Esc closes" |
| Chat dialog | `role=dialog` (non-modal) with label and description; the launcher has `aria-expanded`/`aria-controls`; Esc closes and returns focus; the replies area is `role=log` with `aria-live`; the input has a real label | Browser checks (5) |
| Reduced motion | `animate-pulse`/`animate-ping` off; smooth scroll off. The cursor dot is not rendered for touch or reduced motion. The hero video starts only after hydration, stays paused for reduced motion or Save-Data, and pauses when the tab is hidden | Code review |
| Targets | Mobile menu, phone link and success link at ≥ 44 px; the scripted widget's 25 px chips are removed. The mobile hero CTAs sit above the chat launcher, which used to cover the edge of "Call Now" | Screenshots |
| Auto-redirect | The success screen no longer sends visitors home after 5 s | Browser check "no auto-redirect" |

### F. SEO and metadata

| Item | Before | After |
|---|---|---|
| OG image | `/og-image.jpg` returned 404 | `app/opengraph-image.tsx` and `app/twitter-image.tsx` (shared in `lib/og.tsx`) render a 1200×630 PNG from existing brand assets only: the coupe mark, the wordmark, ink/gold and the published event types |
| H1 | Two H1s (an sr-only one plus the visual one) | One visible H1 |
| Landmarks | No `nav` | `nav`, a skip link, and `<main id="main">` on every page |
| JSON-LD | Philadelphia and DC `areaServed`, former venues misused as `hasCredential`, `priceRange "$$"`, deprecated `containedIn`, "Seasonal Menus" | Only published facts: name, URL, image, description, the base town as the address, service types, founder, and the phone when configured |
| Meta copy | Descriptions said "8 years" and Philadelphia & DC; a `keywords` list | Neutral copy without the unverified claims; `keywords` removed. **The owner should confirm** before any claim returns (facts register #11–13) |
| Canonical | Set in the root layout, so the 404 claimed the home canonical | Set per page (home, contact); the 404 has none |
| 404 | The default page with the home canonical and no `main` | `app/not-found.tsx`: a real 404 status, a single `noindex`, `main`, an H1 and links. The redundant root `robots` meta was dropped so the 404 no longer also says `index, follow` |

### G. Repo hygiene

- `.claude/settings.local.json` was untracked with `git rm --cached` (it is still on disk) and added to `.gitignore`.
- `.gitignore` now ignores every `.env*` file except `.env.local.example`. The example lists variable **names** with comments only. It used to hold placeholder values.

### Chat (Stage 1 scope)

- **Overlapping launchers:** the scripted `BartenderWidget` is removed. Its launcher sat on top of the AI button, it said "I'm Onur", it faked typing and it repeated unverified claims. The browser check confirms the AI launcher is the topmost element at 1440 and 390.
- **Labelling:** the bot is labelled "AI Concierge" with an "AI" badge and the line "An automated assistant, not a person…". The static green "Online" status is gone.
- **Contract kept:** `POST {message ≤ 3000}` returns `200 {reply}` or `4xx/5xx {error}`, with the same 12/min limit, `X-RateLimit-*` headers and 10 s timeout.
- **New behaviour:**
  - malformed JSON gets 400 (it was 500);
  - a 16 KB body cap (413);
  - a bad upstream response shape gets 502 instead of a fake fallback reply;
  - replies are capped at 4,000 characters and rendered as text;
  - hashed IP keys, and `analytics: false`, which stops per-IP analytics being stored;
  - a site-wide cap of 1,000 per day;
  - the upstream must use `https://`;
  - an optional `X-Garnish-Secret` header, sent only once `GARNISH_AI_SHARED_SECRET` is set.
- **Mock upstream:** in mock mode the route answers from an in-process canned reply, or from a loopback-only `GARNISH_AI_MOCK_URL`. It never calls the real upstream. Tests in `chat.test.ts` (13): success, upstream error, timeout, network, oversize, malformed, rate limit, fail-closed, reply cap, and mode selection.

### Service modes (how previews and local runs stay isolated)

`lib/server/mode.ts:16`:

- `VERCEL_ENV=production` is always **live**. A mock flag there is ignored, so production can never silently stop sending.
- Everything else (local dev, `next start` and **Vercel Preview**) is **mock** unless `GARNISH_SERVICES=live`.
- In mock mode, nothing is emailed, leads are held in memory, chat is canned, and the success screen says "Test mode: nothing was emailed".
- Local UI checks can simulate failures with `GARNISH_MOCK_STORE=fail` and `GARNISH_MOCK_NOTIFY=fail|timeout`.

---

## 2. Durable store recommendation (owner decision)

**Recommendation: Upstash Redis, which is already provisioned through the Vercel Marketplace (`KV_*`). The adapter is implemented.** Postgres would be the step up if leads ever need querying, editing or a CRM-like view.

| Criterion | Upstash Redis (implemented) | Vercel Marketplace Postgres (e.g. Neon) | Google Sheet / email only |
|---|---|---|---|
| Persistence | Upstash docs: "persistence is always enabled"; every write goes to memory and block storage (for example EBS). **Eviction must stay OFF** on the database. It is off by default, and with it off Upstash rejects writes when full rather than dropping keys. Check this in the Upstash console. | Durable by design (WAL) | Depends on Google; the email path is the problem we are fixing |
| Backups | Daily backups on **paid plans only** (PAYG included); 3-day retention needs the Prod Pack. **The free plan has no backups.** | Point-in-time restore (window depends on plan) | Sheet history |
| Encryption | TLS in transit. Encryption at rest needs the **Prod Pack** add-on. | At rest by default on Neon | Google-managed |
| Access control | One REST token; the read-only token exists but is unused. Anyone with the token can read every lead. Keep it server-only (it is). | Roles/users, row-level security possible | Google account sharing |
| Retention | Built in: a TTL per record (`LEAD_RETENTION_DAYS`, default **90**, range 7–730) and an index pruned on write | Needs a scheduled delete | Manual |
| Data minimisation | Form fields only; no IP or user agent; error codes, not messages | Same, if implemented | Same |
| Cost | Free: 256 MB, enough for hundreds of thousands of leads. PAYG: $0.20 per 100k commands (about 6 commands per lead) | Free tiers exist; paid around $19/month and up | Free |
| Vercel integration | Already connected; env vars exist in Prod and Preview | One-click Marketplace | API credentials and a service account |

**What the owner needs to decide:**

1. Keep Upstash and move the database to **PAYG**, so daily backups exist. Optionally add the Prod Pack for encryption at rest.
2. Confirm that **eviction is disabled**.
3. Confirm the 90-day retention, and add it to a privacy notice.
4. Consider a **separate Upstash database for leads**, distinct from the rate-limit keys, so the rate limiter's token is not also the leads token.

---

## 3. DNS plan summary (`DNS-PLAN.md`; not applied)

- **Current records** (`dig`): the nameservers are IONOS; the apex MX is IONOS; the apex SPF is `v=spf1 include:_spf-us.ionos.com ~all`; `_dmarc` is a CNAME to IONOS (`p=none`); IONOS DKIM CNAMEs exist (`s1-ionos`, `s2-ionos`). Nothing exists on `send` or `resend._domainkey`.
- **To add (values from the Resend dashboard):**
  - `send` MX 10 `feedback-smtp.<region>.amazonses.com`;
  - `send` TXT `v=spf1 include:amazonses.com ~all`;
  - `resend._domainkey` TXT `p=<key>`.
- **What stays as it is:** the apex MX, apex SPF and DMARC are untouched, so there is still exactly one SPF record per name.
- **Tracking:** keep Resend tracking off, so no `links` CNAME is needed.
- **After verification:** set Production `CONTACT_FROM="Garnish <bookings@garnish.info>"` and a sending-only, domain-restricted API key.

---

## 4. AWS findings that need owner approval (no AWS changes were made)

1. **Upstream authentication.** Vercel calls `GARNISH_AI_API_URL` with no credential. If that URL is a public API Gateway, anyone who learns it bypasses every Vercel-side limit.
   - The proposal is a shared secret: set `GARNISH_AI_SHARED_SECRET` (32+ random characters) in Vercel Production. The code already sends it as `X-Garnish-Secret`. Verify it in the Lambda (constant-time compare, 403 otherwise), or with an API Gateway API key plus a usage plan.
   - Rotation: support two valid secrets during a swap.
2. **Throttling.** Configure stage or route throttling on API Gateway, for example 5 requests per second with a burst of 10, plus a usage-plan quota per day. The README lists these as *future*, so assume they are absent.
3. **Cost ceilings.**
   - An AWS Budget with an alarm (for example $10 per month), plus a Bedrock-specific alarm;
   - a `max_tokens` cap in the Lambda;
   - the new Vercel-side daily cap (1,000 chat requests per day) is only a first line of defence.
4. **Evidence.** None of these AWS components can be verified from this repo: Lambda, IAM scope, Guardrails, the model, CloudWatch, or the README's test tables. Share the IaC or console exports before any of them is claimed publicly (facts register #37–38).
5. **Non-production stage.** A separate AWS stage with its own Guardrail and budget alarm is needed for any injection or grounding tests. That is paid, so it needs owner approval.

---

## 5. Preview isolation requirements

Previews today share Production's `RESEND_API_KEY`, `ADMIN_EMAIL` and `KV_*`.

- **Built in now:** a Preview deployment runs in **mock** mode by default. It sends no email, writes no Redis keys and makes no upstream chat call. The page says "Test mode".
- **Before anyone sets `GARNISH_SERVICES=live` on Preview,** the owner must:
  1. scope `RESEND_API_KEY`, `ADMIN_EMAIL` and `CONTACT_FROM` to **Production only**, then give Preview a test inbox and a separate, restricted Resend key (or none);
  2. give Preview a **separate Upstash database** (`KV_*` scoped per environment), so preview leads and rate-limit keys never mix with production;
  3. keep `GARNISH_AI_API_URL` Production-only (it already is), or point Preview at a non-production AWS stage;
  4. keep `CRON_SECRET` Production-only.
- **Pushing a branch** still creates a Preview, but with this code it runs in mock mode. Pushing was not done, per instructions.

---

## 6. Test results

| Check | Baseline `main` | Stage 1a | Stage 1b |
|---|---|---|---|
| `tsc --noEmit` | pass | pass | pass |
| Lint | **not runnable**: no config, `next lint` prompted | pass (`next lint`, eslint 8) | pass (`eslint .`, flat config, React Compiler rules) |
| Build | pass (Next 14) | pass (Next 14) | pass (Next 16 Turbopack) |
| Unit and integration tests | none | **72/72** (contact 25, notifier 23, leads 11, chat 13) | **72/72** |
| `npm audit --omit=dev` | 4 (1 critical, 3 high) | 4 (unchanged; fix is 1b) | **0** |
| Browser (Playwright + Google Chrome, `next start`, 1440 and 390) | n/a | **80/80**: main 68, store-failure 8, notify-failure 4. 0 console errors, no horizontal overflow, keyboard-only form and chat | **80/80** |

The browser checks covered:

- skip link, a single H1, the nav landmark, and the AI launcher being topmost;
- the chat opened by keyboard, with disclosure, a mock reply, and Esc returning focus;
- the mobile menu;
- every field labelled, the New York date minimum, and the keyboard path into the form;
- the focus ring, empty-submit errors with focus and `aria-describedby`, and the past-date error;
- success copy ("saved", never "delivered"), success focus, the test-mode notice and no auto-redirect;
- the 404's status, `main` and missing canonical;
- the store-failure path (error shown, input kept, alert focused) and the notify-failure path (success-with-status copy).

### Lighthouse 13.5.0 (local `next start`, simulated throttling)

This machine was heavily loaded (load average 30–49), so runs are paired: baseline and 1a were built from the same machine and interleaved.

| Page | Run | Baseline perf / a11y / BP / SEO | 1a perf / a11y / BP / SEO | 1b perf / a11y / BP / SEO |
|---|---|---|---|---|
| Home mobile | r1 | 95 / **96** / 100 / 100 (LCP 2.5 s, TBT 190 ms, bench 1531) | 93 / **100** / 100 / 100 (LCP 2.5 s, TBT 240 ms, bench 771) | 97 / **100** / 100 / 100 (LCP 2.6 s, TBT 70 ms, bench 1891) |
| Home mobile | r2 | 96 / 96 / 100 / 100 (bench 1821) | 96 / 100 / 100 / 100 (bench 1800) | 85 / 100 / 100 / 100 (TBT 480 ms, bench 1580) |
| Home desktop | r1 | 100 / 96 / 100 / 100 | 100 / 100 / 100 / 100 | 98 / 100 / 100 / 100 |
| Contact mobile | r1 | 97 / **85** / 100 / 100 | 93 / **100** / 100 / 100 | 88 / 100 / 100 / 100 (bench 1615) |
| Contact mobile | r2 | 90 / 85 / 100 / 100 (bench 557) | 94 / 100 / 100 / 100 (bench 1762) | 76 / 100 / 100 / 100 (bench 724) |
| Contact desktop | r1 | 100 / **84** / 100 / 100 | 100 / **100** / 100 / 100 | 100 / 100 / 100 / 100 |

- **The audit's production baseline** (`docs/redesign-audit/lighthouse/`) was home 96/96/100/100 and contact 99–100/84–85/100/100.
- **Accessibility:** 96 → 100 on home and 84–85 → 100 on contact. The `color-contrast` and `label` failures are gone.
- **Performance:** unchanged within noise for 1a at matched `benchmarkIndex`.
- **1b JavaScript:** React 19 plus Next 16 adds about 38 KiB of transferred JavaScript (110 → 148 KiB). Mobile TBT varied from 70 to 770 ms with machine load, so re-measure 1b on a quiet machine or on a Preview before promoting.
- **Page weight:** unchanged at 5.4 MB on home. That is the hero video, which is out of Stage 1 scope.
- The raw reports were kept in the session scratchpad and are not committed.

---

## 7. Stage 1b upgrade notes (`chore/next-upgrade`)

- **Versions:** `next` 14.2.35 → **16.3.8**, and `react`/`react-dom` 18 → **19.3.0** with matching `@types`.
  - 16.3.8 is the patched 16.3 line, published 2026-09-30. 16.4.0 is only 4 days old; 16.3.8 is preferred for its soak time, and both are outside every advisory range.
  - `source-map-js` went from 1.2.1 to 1.2.2 through an in-range lockfile update, not `npm audit fix --force`.
  - Result: **0 production advisories**.
- **Read before upgrading:** the bundled `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-15.md` and `version-16.md`, the ESLint config reference, and the ctx7 upgrade guide.
- **Checked against this code:**
  - Route handlers use only `Request`/`Response`, with no async `cookies()`/`headers()`/`params`. They declare `dynamic = "force-dynamic"` and `runtime = "nodejs"`, and `fetch` uses `cache: "no-store"`.
  - `opengraph-image`/`twitter-image` take no params, so the "async params for image functions" change does not apply.
  - Metadata API: unchanged.
  - `next/font/google` (Cormorant, Inter): works. `app/fonts/Geist*.woff` is unused and was left in place.
  - Tailwind 3.4 with `postcss.config.mjs` builds under Turbopack. **Tailwind 3 is kept.**
  - No middleware, so no rename to `proxy`. No `next/image`, so the image-config breaking changes do not apply. The `next.config.mjs` security headers are unchanged.
- **Changes that were required:**
  - `next lint` was removed, so ESLint 9 flat config (`eslint.config.mjs`, `eslint-config-next` 16.3.8) replaces it and the `lint` script is now `eslint .`.
  - The React Compiler lint rules required two form refactors: focus by id instead of a ref-callback registry, and `useSyncExternalStore` for the New York `min` date.
  - `data-scroll-behavior="smooth"` on `<html>` keeps the pre-16 navigation scroll behaviour.
  - Next rewrote `tsconfig.json` (`jsx: react-jsx`, `target: ES2017`, `.next/dev/types`).
- **Node:** `engines.node` is `22.x` and `.nvmrc` is `22`. `dev.sh` used to hard-code Node 18.20.8, which Next 16 refuses; it now runs `nvm use`.
  - **On Vercel,** `engines` overrides the project's 24.x setting, so builds and functions move to Node 22.x (LTS until April 2027).
  - Everything was verified locally on 22.23.1; Node 24 is not installed on this machine.
  - If the owner prefers 24.x, change both `engines` and `.nvmrc` and re-run the checks.
- **Not done:** the upgrade was not deployed to a Preview, which needs a push. Do that before merging, with Preview in mock mode (the default) and the environment scoping from §5.

---

## 8. Remaining risks and follow-ups

1. **The owner must act before 1a is useful in production:**
   - verify DNS;
   - set `CONTACT_FROM`;
   - move Upstash to PAYG for backups, and confirm eviction is off;
   - set `RATE_LIMIT_SALT` and `CRON_SECRET`.
   - Until `CONTACT_FROM` is set, Production saves every lead but reports "notification delayed", because the sandbox sender is refused in production. That is deliberate and honest, and the leads are recoverable. Set the variable **before** merging, or merge only after DNS verification.
2. **Nothing triggers recovery automatically yet.** Add the cron, or run the curl calls in §1C manually.
3. **Pre-existing visual bug** (not fixed, since it is the redesign's job): Tailwind 3 only generates opacity steps from its scale. `border-white/6`, `/8` and `/12` and `bg-white/6` produce **no CSS**, so those borders fall back to the default `#e5e7eb` and render as bright hairlines. One example is the vertical rule on `/contact`. The audit's "white/12 underline ≈ 1.4:1" was really this fallback. The form underlines now use `/40` explicitly.
4. **Date field:** Chrome shows its own (dark) picker icon next to the custom one. This is pre-existing and cosmetic.
5. **Unverified badges are still on the page:** "Most Popular" (facts register #23) and "Now Booking 2026", which goes stale on 2027-01-01 (#25). The owner should confirm them.
6. **The hero video is 5.3 MB.** It now starts only after hydration, and never for reduced motion or Save-Data. A proper rendition is Stage 2+.
7. **Fail-open trade-offs:**
   - A Redis timeout on the rate limiter allows the request. Storage still fails closed.
   - A honeypot false positive (aggressive autofill) is silently dropped. The field is hidden and set to `autocomplete=off`, so the risk is low, but non-zero.
8. **`startedAt` is client-supplied.** It filters naive bots only; scripted spam still meets the per-IP and daily caps.
9. **Resend has no abort signal.** The 8 s timeout stops waiting, but the HTTP request may still complete. The Resend idempotency key, valid for 24 h, keeps a retry from duplicating it.
10. **Recovery uses GET with side effects,** as Vercel Cron requires. It is protected by a bearer secret and returns 404 when disabled.
11. **Privacy:** leads are personal data kept for 90 days. Add a privacy notice and set the retention policy, both owner decisions.
12. **Copy changes needing owner confirmation:**
    - the meta descriptions no longer mention Philadelphia/DC or "8 years";
    - the JSON-LD lost `areaServed`, `hasCredential` and `priceRange`;
    - the success copy now says "Expect a call within 24 hours", reusing the existing published promise.
