"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import BookCard from "./BookCard";
import Claim from "@/components/ui/Claim";
import { business, claims, eventTypes, extras as EXTRAS, phone, pricingTerms, tiers, type ExtraKey } from "@/lib/content/facts";
import { compose, eventLabel, type Selection } from "@/lib/compose/quote";
import { hasAny, load, save } from "@/lib/compose/selection";
import { MAX_HORIZON_DAYS, addDays, formatLongDate, formatTime, todayInBusinessTz } from "@/lib/contact/dates";
import { MAX_LOCATION_CHARS } from "@/lib/contact/limits";
import {
  FIELDS_BY_STEP,
  HOUR_OPTIONS,
  MAX_DETAILS_CHARS,
  MESSAGES,
  STEPS,
  errorCode,
  extraLabel,
  firstErrorStep,
  fromSelection,
  interpret,
  newKey,
  stepIndex,
  toPayload,
  toSelection,
  validateStep,
  type Draft,
  type DraftErrors,
  type DraftField,
  type StepKey,
  type SubmitFailure,
  type SubmitSuccess,
} from "@/lib/book/flow";
import { openConcierge } from "@/lib/concierge/events";
import { track } from "@/lib/analytics";

const noop = () => () => {};
const subscribeOnline = (cb: () => void) => {
  addEventListener("online", cb);
  addEventListener("offline", cb);
  return () => {
    removeEventListener("online", cb);
    removeEventListener("offline", cb);
  };
};

const SUBMIT_TIMEOUT_MS = 20_000;
const ROMAN = ["i.", "ii.", "iii.", "iv.", "v."];

/** Field ids, so error-summary links and focus land on the control. */
const fid = (f: DraftField) => `bk-${f}`;

/**
 * /book: the booking flow on the durable lead system (POST /api/contact:
 * zod validation, persist-then-notify, idempotency key, rate limit,
 * honeypot). Five steps in one native form; the card from Compose your bar
 * fills step three and stays editable. One idempotency key per booking, so a
 * retry can never create a second lead.
 */
export default function BookingFlow({ fromUrl, children }: { fromUrl: Selection; children?: ReactNode }) {
  const uid = useId();
  const [draft, setDraft] = useState<Draft>(() => fromSelection(fromUrl));
  const [step, setStep] = useState<StepKey>("date");
  const [errors, setErrors] = useState<DraftErrors>({});
  const [showSummary, setShowSummary] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [failure, setFailure] = useState<SubmitFailure | null>(null);
  const [success, setSuccess] = useState<SubmitSuccess | null>(null);
  const [restored, setRestored] = useState(false);
  const [fromCard, setFromCard] = useState(hasAny(fromUrl));

  // New York's today, client only (the server snapshot is "" so the static
  // HTML never freezes the build date).
  const today = useSyncExternalStore(noop, () => todayInBusinessTz(), () => "");
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const key = useRef("");
  const startedAt = useRef(0);
  const inflight = useRef(false);
  const completed = useRef(false);
  const moved = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const failureRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  // One idempotency key and start time per booking (kept across retries).
  useEffect(() => {
    key.current = newKey();
    startedAt.current = Date.now();
  }, []);

  // The card: from the URL (also when the concierge hands off while already
  // on /book), else the session's saved card.
  useEffect(() => {
    track("booking_start", { withCard: hasAny(fromUrl) });
    /* eslint-disable react-hooks/set-state-in-effect -- restore the card from the URL or sessionStorage after hydration */
    if (hasAny(fromUrl)) {
      save(fromUrl);
      setDraft((d) => fromSelection(fromUrl, d));
      setFromCard(true);
    } else {
      const saved = load();
      if (hasAny(saved)) {
        setDraft((d) => fromSelection(saved, d));
        setFromCard(true);
      }
    }
    setRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fromUrl]);

  // The card (never personal fields) is saved back for the session.
  const sel = toSelection(draft);
  const selKey = JSON.stringify(sel);
  useEffect(() => {
    if (restored) save(JSON.parse(selKey) as Selection);
  }, [selKey, restored]);

  // Focus follows the flow: the step heading on step change, the summary on errors.
  useEffect(() => {
    if (!moved.current) return;
    const h = headingRef.current;
    if (!h) return;
    h.focus({ preventScroll: true });
    h.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [step]);
  useEffect(() => {
    if (status === "done") successRef.current?.focus();
  }, [status]);

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => (e[k as DraftField] ? { ...e, [k]: undefined } : e));
  }, []);

  function go(next: StepKey) {
    moved.current = true;
    setShowSummary(false);
    setFailure(null);
    setStep(next);
  }

  function showErrors(errs: DraftErrors, at: StepKey) {
    setErrors(errs);
    setShowSummary(true);
    if (at !== step) {
      moved.current = true;
      setStep(at);
    }
    // after render: focus the summary (it lists every problem, with links)
    requestAnimationFrame(() => requestAnimationFrame(() => summaryRef.current?.focus()));
  }

  function next() {
    const errs = validateStep(step, draft, today);
    if (Object.keys(errs).length) return showErrors(errs, step);
    setErrors({});
    go(STEPS[stepIndex(step) + 1].key);
  }

  function back() {
    const i = stepIndex(step);
    if (i > 0) go(STEPS[i - 1].key);
  }

  function fail(f: SubmitFailure) {
    track("booking_error", { code: errorCode(f), step: stepIndex(step) + 1 });
    if (f.kind === "validation") {
      const at = firstErrorStep(f.errors) ?? "review";
      return showErrors(f.errors, at);
    }
    setFailure(f);
    requestAnimationFrame(() => requestAnimationFrame(() => failureRef.current?.focus()));
  }

  async function submit() {
    if (inflight.current || status === "done") return; // never two requests at once
    const errs = validateStep("review", draft, today);
    if (Object.keys(errs).length) return showErrors(errs, firstErrorStep(errs) ?? "review");
    if (!navigator.onLine) return fail({ kind: "offline", message: MESSAGES.offline });

    inflight.current = true;
    setStatus("submitting");
    setFailure(null);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SUBMIT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key.current },
        body: JSON.stringify(toPayload(draft, startedAt.current)),
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const r = interpret(res.status, data, res.headers.get("retry-after"));
      if ("ok" in r) {
        if (!completed.current) {
          completed.current = true;
          track("booking_complete", { notify: r.notified ? "sent" : "delayed", tier: draft.tier || "none" });
        }
        setSuccess(r);
        setStatus("done");
        return;
      }
      setStatus("idle");
      fail(r);
    } catch {
      setStatus("idle");
      fail(navigator.onLine ? { kind: "network", message: MESSAGES.network } : { kind: "offline", message: MESSAGES.offline });
    } finally {
      clearTimeout(timer);
      inflight.current = false;
    }
  }

  const i = stepIndex(step);
  const current = STEPS[i];
  const err = (f: DraftField) => errors[f];
  const describe = (f: DraftField, hint?: boolean) =>
    [hint ? `${fid(f)}-hint` : "", err(f) ? `${fid(f)}-err` : ""].filter(Boolean).join(" ") || undefined;
  const errorList = (Object.keys(errors) as DraftField[]).filter((f) => errors[f]);
  const result = compose(sel);
  const tierName = tiers.find((t) => t.key === draft.tier)?.name;
  const method = draft.contactMethod === "email" ? "email" : "phone";

  const askConcierge = (opener: HTMLElement) => openConcierge({ opener, surface: "book" });

  if (status === "done" && success) {
    return (
      <>
        <div>
          {children}
          <section className="bk bk-done" aria-labelledby={`${uid}-done`}>
            <h2 id={`${uid}-done`} ref={successRef} tabIndex={-1} className="bk-h">
              Your request is <em>saved.</em>
            </h2>
            {success.ref && (
              <p className="bk-ref num">
                Reference <b>{success.ref}</b>
              </p>
            )}
            <h3 className="bk-sub">What happens next</h3>
            <ol className="bk-next">
              <li>
                {business.ownerFirstName.value} checks {formatLongDate(draft.eventDate)} and your card, then gets in touch by{" "}
                {method === "email" ? "email" : "phone"} to confirm availability and your quote.{" "}
                <Claim fact={claims.callback}>{business.ownerFirstName.value} calls you back within 24 hours, personally.</Claim>
              </li>
              <li>Nothing is booked or charged yet: no payment was taken, and there is no account.</li>
              {!success.notified && (
                <li>
                  Our notification to {business.ownerFirstName.value} is delayed, but your request is saved. If you haven&rsquo;t
                  heard back, please call{" "}
                  <a className="tlink num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="confirmation">
                    {phone.display}
                  </a>
                  .
                </li>
              )}
            </ol>
            {success.mock && (
              <p className="bk-mock" data-mode="mock">
                Test mode: saved in a temporary local store. No email was sent.
              </p>
            )}
            <div className="ctas bk-ctas">
              <Link className="btn btn-gold" href="/">
                Back to the home page <span className="ar" aria-hidden="true" />
              </Link>
              <a className="tlink num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="confirmation">
                or call {phone.display}
              </a>
            </div>
          </section>
        </div>
        <BookCard sel={sel} />
      </>
    );
  }

  return (
    <>
      <div>
        {children}
        <section className="bk" aria-label="Booking" data-ready={restored ? "" : undefined}>
          <noscript>
            <p className="bk-offline">
              This form needs JavaScript. Please call {phone.display} to check your date.
            </p>
          </noscript>
          <ol className="bk-prog" aria-label="Progress">
            {STEPS.map((s, n) => (
              <li key={s.key} aria-current={n === i ? "step" : undefined} data-state={n < i ? "done" : n === i ? "now" : "next"}>
                <span className="rn" aria-hidden="true">
                  {ROMAN[n]}
                </span>
                <span>
                  {s.short}
                  {n < i && <span className="sr-only"> (done)</span>}
                </span>
              </li>
            ))}
          </ol>

          {!online && (
            <p className="bk-offline" role="status">
              You&rsquo;re offline. Your answers stay on this page; send them once you&rsquo;re back online, or call {phone.display}.
            </p>
          )}

          <form
            className="bk-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (step === "review") void submit();
              else next();
            }}
          >
            {/* honeypot: hidden from people and assistive tech; only bots fill it */}
            <div className="bk-hp" aria-hidden="true">
              <label htmlFor={`${uid}-website`}>Website</label>
              <input
                id={`${uid}-website`}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={draft.website}
                onChange={(e) => set("website", e.target.value)}
              />
            </div>

            <fieldset className="bk-step" key={step} aria-describedby={`${uid}-count`}>
              <legend>
                <h2 className="bk-h" ref={headingRef} tabIndex={-1}>
                  {current.title}
                </h2>
              </legend>
              <p id={`${uid}-count`} className="bk-count num">
                Step {i + 1} of {STEPS.length}
              </p>

              {showSummary && errorList.length > 0 && (
                <div className="bk-summary" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby={`${uid}-sum`}>
                  <h3 id={`${uid}-sum`}>
                    {errorList.length === 1 ? "One answer needs a look" : `${errorList.length} answers need a look`}
                  </h3>
                  <ul>
                    {errorList.map((f) => (
                      <li key={f}>
                        {FIELDS_BY_STEP[step].includes(f) ? (
                          <a
                            href={`#${fid(f)}`}
                            onClick={(e) => {
                              e.preventDefault();
                              const el = document.getElementById(fid(f));
                              const target = el?.matches("input,select,textarea") ? el : el?.querySelector<HTMLElement>("input,select,textarea");
                              target?.focus();
                            }}
                          >
                            {errors[f]}
                          </a>
                        ) : (
                          errors[f]
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step === "date" && (
                <>
                  <Field id={fid("eventDate")} label="Date of your event" error={err("eventDate")} hint="Eastern Time, as in Rehoboth Beach.">
                    <input
                      id={fid("eventDate")}
                      type="date"
                      required
                      min={today || undefined}
                      max={today ? addDays(today, MAX_HORIZON_DAYS) : undefined}
                      value={draft.eventDate}
                      onChange={(e) => set("eventDate", e.target.value)}
                      aria-invalid={err("eventDate") ? true : undefined}
                      aria-describedby={describe("eventDate", true)}
                    />
                  </Field>
                  {draft.eventDate && !err("eventDate") && /^\d{4}-\d{2}-\d{2}$/.test(draft.eventDate) && (
                    <p className="bk-readout" aria-live="polite">
                      {weekday(draft.eventDate)}, {formatLongDate(draft.eventDate)}
                    </p>
                  )}
                  <Field id={fid("eventTime")} label="Start time" optional error={err("eventTime")} hint="When the bar should open. Leave it blank if it isn't set yet.">
                    <input
                      id={fid("eventTime")}
                      type="time"
                      step={900}
                      value={draft.eventTime}
                      onChange={(e) => set("eventTime", e.target.value)}
                      aria-invalid={err("eventTime") ? true : undefined}
                      aria-describedby={describe("eventTime", true)}
                    />
                  </Field>
                </>
              )}

              {step === "place" && (
                <>
                  <Field id={fid("location")} label="Town or venue" error={err("location")} hint={`For example "Lewes", or the venue's name. ${business.ownerFirstName.value} is based in ${business.baseTown.value.label}.`}>
                    <input
                      id={fid("location")}
                      type="text"
                      required
                      autoComplete="address-level2"
                      maxLength={MAX_LOCATION_CHARS}
                      value={draft.location}
                      onChange={(e) => set("location", e.target.value)}
                      aria-invalid={err("location") ? true : undefined}
                      aria-describedby={describe("location", true)}
                    />
                  </Field>
                  <p className="bk-note">
                    <Claim fact={pricingTerms.travelFee} missing="Travel beyond Rehoboth Beach: terms to confirm" />
                  </p>
                </>
              )}

              {step === "bar" && (
                <>
                  {fromCard && <p className="bk-note">Filled in from your card. Change anything you like.</p>}
                  <fieldset className={`bk-group${err("event") ? " bad" : ""}`} aria-describedby={err("event") ? `${fid("event")}-err` : undefined}>
                    <legend>The occasion</legend>
                    <div className="bk-opts" id={fid("event")} tabIndex={-1}>
                      {eventTypes.value.map((ev) => (
                        <label key={ev.key} className="bk-opt">
                          <input
                            type="radio"
                            name={`${uid}-event`}
                            value={ev.key}
                            checked={draft.event === ev.key}
                            onChange={() => set("event", ev.key)}
                          />
                          <span>{ev.label}</span>
                        </label>
                      ))}
                    </div>
                    {err("event") && <ErrorText id={`${fid("event")}-err`}>{err("event")}</ErrorText>}
                  </fieldset>

                  <div className="bk-row">
                    <Field id={fid("guests")} label="Guests" error={err("guests")}>
                      <input
                        id={fid("guests")}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        maxLength={5}
                        value={draft.guests}
                        onChange={(e) => set("guests", e.target.value.replace(/[^\d]/g, ""))}
                        aria-invalid={err("guests") ? true : undefined}
                        aria-describedby={describe("guests")}
                      />
                    </Field>
                    <Field id={fid("hours")} label="Hours of service" optional error={err("hours")}>
                      <select
                        id={fid("hours")}
                        value={draft.hours}
                        onChange={(e) => set("hours", e.target.value)}
                        aria-invalid={err("hours") ? true : undefined}
                        aria-describedby={describe("hours")}
                      >
                        <option value="">Not sure yet</option>
                        {HOUR_OPTIONS.map((h) => (
                          <option key={h} value={String(h)}>
                            {h} {h === 1 ? "hour" : "hours"}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <fieldset className="bk-group">
                    <legend>The bar</legend>
                    <div className="bk-opts">
                      {tiers.map((t) => (
                        <label key={t.key} className="bk-opt">
                          <input type="radio" name={`${uid}-tier`} value={t.key} checked={draft.tier === t.key} onChange={() => set("tier", t.key)} />
                          <span>{t.name}</span>
                        </label>
                      ))}
                      <label className="bk-opt">
                        <input type="radio" name={`${uid}-tier`} value="" checked={draft.tier === ""} onChange={() => set("tier", "")} />
                        <span>Not sure yet</span>
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="bk-group">
                    <legend>Also ask about</legend>
                    <div className="bk-opts">
                      {EXTRAS.map((x) => (
                        <label key={x.key} className="bk-opt">
                          <input
                            type="checkbox"
                            value={x.key}
                            checked={draft.extras.includes(x.key)}
                            onChange={() =>
                              set(
                                "extras",
                                draft.extras.includes(x.key) ? draft.extras.filter((k) => k !== x.key) : [...draft.extras, x.key as ExtraKey],
                              )
                            }
                          />
                          <span>{x.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {result.mode === "request" && (
                    <p className="bk-note">Rates are being confirmed, so {business.ownerFirstName.value} sends you a personal quote.</p>
                  )}
                </>
              )}

              {step === "you" && (
                <>
                  <Field id={fid("name")} label="Your name" error={err("name")}>
                    <input
                      id={fid("name")}
                      type="text"
                      autoComplete="name"
                      maxLength={100}
                      value={draft.name}
                      onChange={(e) => set("name", e.target.value)}
                      aria-invalid={err("name") ? true : undefined}
                      aria-describedby={describe("name")}
                    />
                  </Field>
                  <Field id={fid("phone")} label="Phone" error={err("phone")}>
                    <input
                      id={fid("phone")}
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={30}
                      value={draft.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      aria-invalid={err("phone") ? true : undefined}
                      aria-describedby={describe("phone")}
                    />
                  </Field>
                  <Field id={fid("email")} label="Email" optional={draft.contactMethod !== "email"} error={err("email")}>
                    <input
                      id={fid("email")}
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={draft.email}
                      onChange={(e) => set("email", e.target.value)}
                      aria-invalid={err("email") ? true : undefined}
                      aria-describedby={describe("email")}
                    />
                  </Field>
                  <fieldset className="bk-group">
                    <legend>Best way to reach you</legend>
                    <div className="bk-opts">
                      {(
                        [
                          ["phone", "Phone call"],
                          ["email", "Email"],
                        ] as const
                      ).map(([v, l]) => (
                        <label key={v} className="bk-opt">
                          <input
                            type="radio"
                            name={`${uid}-method`}
                            value={v}
                            checked={draft.contactMethod === v}
                            onChange={() => set("contactMethod", v)}
                          />
                          <span>{l}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field id={fid("details")} label="Anything else" optional error={err("details")} hint="The venue, the mood, drinks you love. Please don't include payment details.">
                    <textarea
                      id={fid("details")}
                      rows={4}
                      maxLength={MAX_DETAILS_CHARS}
                      value={draft.details}
                      onChange={(e) => set("details", e.target.value)}
                      aria-invalid={err("details") ? true : undefined}
                      aria-describedby={describe("details", true)}
                    />
                  </Field>
                  {draft.details.length > MAX_DETAILS_CHARS * 0.8 && (
                    <p className="bk-counter num" aria-live="polite">
                      {MAX_DETAILS_CHARS - draft.details.length} characters left
                    </p>
                  )}
                </>
              )}

              {step === "review" && (
                <>
                  <dl className="bk-review">
                    <ReviewRow label="Date" onEdit={() => go("date")}>
                      {draft.eventDate ? `${weekday(draft.eventDate)}, ${formatLongDate(draft.eventDate)}` : "–"}
                      {draft.eventTime ? `, ${formatTime(draft.eventTime)} ET` : ""}
                    </ReviewRow>
                    <ReviewRow label="Place" onEdit={() => go("place")}>
                      {draft.location || "–"}
                    </ReviewRow>
                    <ReviewRow label="Your bar" onEdit={() => go("bar")}>
                      {[
                        eventLabel(draft.event || null),
                        draft.guests ? `${draft.guests} guests` : null,
                        draft.hours ? `${draft.hours} hours` : null,
                        tierName ?? "Bar not chosen yet",
                        draft.extras.length ? `also ${draft.extras.map(extraLabel).join(", ").toLowerCase()}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </ReviewRow>
                    <ReviewRow label="You" onEdit={() => go("you")}>
                      {[draft.name, draft.phone, draft.email].filter(Boolean).join(" · ")}
                      <br />
                      <span className="bk-muted">Prefers {method === "email" ? "email" : "a phone call"}</span>
                    </ReviewRow>
                    {draft.details && (
                      <ReviewRow label="Notes" onEdit={() => go("you")}>
                        <span className="bk-pre">{draft.details}</span>
                      </ReviewRow>
                    )}
                  </dl>
                  <p className="bk-note">
                    This sends a request, not a booking. {business.ownerFirstName.value} confirms availability and your quote with you.
                    No payment, no account.
                  </p>

                  {failure && (
                    <div className="bk-failure" role="alert" tabIndex={-1} ref={failureRef} data-kind={failure.kind}>
                      <h3>{failure.kind === "rate_limited" ? "Too many tries for now" : "Not sent yet"}</h3>
                      <p>{failure.message}</p>
                      {failure.kind === "rate_limited" && failure.retryAfter && (
                        <p className="bk-muted">You can try again in about {Math.ceil(failure.retryAfter / 60)} minutes.</p>
                      )}
                      <div className="bk-failure-actions">
                        {failure.kind === "stale" ? (
                          <button type="button" className="btn btn-line" onClick={() => location.reload()}>
                            Refresh the page
                          </button>
                        ) : (
                          <button type="submit" className="btn btn-line" disabled={status === "submitting"}>
                            Try again
                          </button>
                        )}
                        <a className="tlink num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="booking_step">
                          or call {phone.display}
                        </a>
                      </div>
                    </div>
                  )}
                </>
              )}
            </fieldset>

            <div className="bk-nav">
              {i > 0 && (
                <button type="button" className="bk-back" onClick={back} disabled={status === "submitting"}>
                  <span aria-hidden="true">← </span>Back
                </button>
              )}
              {step === "review" ? (
                failure ? null : (
                  <button type="submit" className="btn btn-gold" disabled={status === "submitting"} aria-busy={status === "submitting"}>
                    {status === "submitting" ? "Sending…" : "Send your request"} <span className="ar" aria-hidden="true" />
                  </button>
                )
              ) : (
                <button type="submit" className="btn btn-gold">
                  Continue <span className="sr-only">to {STEPS[i + 1].title.toLowerCase()}</span>
                  <span className="ar" aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="sr-only" role="status" aria-live="polite">
              {status === "submitting" ? "Sending your request…" : ""}
            </p>
          </form>

          <p className="bk-alt">
            Rather talk it through?{" "}
            <a className="tlink num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="booking_step">
              Call {phone.display}
            </a>
          </p>
        </section>
      </div>
      <BookCard sel={sel} onEdit={() => go("bar")} onAsk={askConcierge} />
    </>
  );
}

function weekday(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long" });
}

function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`bk-field${error ? " bad" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="bk-opt-tag"> (optional)</span>}
      </label>
      {hint && (
        <p className="bk-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {children}
      {error && <ErrorText id={`${id}-err`}>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="bk-err" id={id}>
      <span className="sr-only">Error: </span>
      {children}
    </p>
  );
}

function ReviewRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="bk-rrow">
      <dt>{label}</dt>
      <dd>{children}</dd>
      <dd className="bk-redit">
        <button type="button" onClick={onEdit}>
          Edit <span className="sr-only">{label.toLowerCase()}</span>
        </button>
      </dd>
    </div>
  );
}
