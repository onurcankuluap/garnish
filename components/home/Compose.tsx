"use client";

import { useEffect, useId, useState } from "react";
import Claim from "@/components/ui/Claim";
import { business, eventTypes, extras, pricingTerms, tiers, type ExtraKey } from "@/lib/content/facts";
import { EMPTY, LIMITS, allRatesVerified, clampGuests, clampHours, compose, eventLabel, tierRateLabel, usd, type Selection } from "@/lib/compose/quote";
import { bookHref, hasAny, load, save } from "@/lib/compose/selection";
import { track } from "@/lib/analytics";

/**
 * II. Compose your bar: assembling a menu card. Native radios and checkboxes
 * in fieldsets (keyboard, screen readers and touch for free), steppers with
 * 44px targets, and a result that is a request for a quote until a rate is
 * verified in facts.ts (then an "Estimate, not a quote"). The card persists
 * in sessionStorage and travels to /book in the URL.
 */
export default function Compose() {
  const [sel, setSel] = useState<Selection>(EMPTY);
  const [restored, setRestored] = useState(false);
  const id = useId();

  // restore a card composed earlier in this session (after hydration)
  useEffect(() => {
    const saved = load();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from sessionStorage after hydration */
    if (hasAny(saved)) setSel(saved);
    setRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (restored) save(sel);
  }, [sel, restored]);

  const result = compose(sel);
  const set = (patch: Partial<Selection>) => setSel((s) => ({ ...s, ...patch }));
  const toggleExtra = (k: ExtraKey) =>
    setSel((s) => ({ ...s, extras: s.extras.includes(k) ? s.extras.filter((x) => x !== k) : [...s.extras, k] }));

  const guests = sel.guests ?? LIMITS.guests.start;
  const hours = sel.hours ?? LIMITS.hours.start;
  const href = bookHref(sel);
  const over50 = (sel.guests ?? 0) > pricingTerms.over50Threshold.value;

  return (
    <section className="sec paper" id="compose" aria-labelledby={`${id}-h`}>
      <div className="cmp">
        <div>
          <div className="sec-head">
            <p className="eyebrow">
              <span className="r" aria-hidden="true" />
              <span className="rn">II.</span>&nbsp;Compose your bar
            </p>
            <h2 className="h2" id={`${id}-h`}>
              Three bars, <em>one</em> evening.
            </h2>
            <p className="lead">Set the card for your evening. It carries into your date check, and Onur confirms the quote with you.</p>
          </div>

          <form className="menu-card" onSubmit={(e) => e.preventDefault()} aria-label="Your bar">
            <fieldset>
              <legend>
                <span className="rn">i.</span> The occasion
              </legend>
              <div className="opts">
                {eventTypes.value.map((e) => (
                  <label key={e.key} className="opt">
                    <input type="radio" name={`${id}-event`} value={e.key} checked={sel.event === e.key} onChange={() => set({ event: e.key })} />
                    <span>{e.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>
                <span className="rn">ii.</span> Guests and hours
              </legend>
              <div className="steppers">
                <Stepper
                  id={`${id}-guests`}
                  label="Guests"
                  value={guests}
                  set={sel.guests !== null}
                  min={LIMITS.guests.min}
                  max={LIMITS.guests.max}
                  step={LIMITS.guests.step}
                  onChange={(v) => set({ guests: clampGuests(v) })}
                />
                <Stepper
                  id={`${id}-hours`}
                  label="Hours of service"
                  value={hours}
                  set={sel.hours !== null}
                  min={LIMITS.hours.min}
                  max={LIMITS.hours.max}
                  step={LIMITS.hours.step}
                  onChange={(v) => set({ hours: clampHours(v) })}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>
                <span className="rn">iii.</span> The bar
              </legend>
              <div className="tierlist">
                {tiers.map((t) => (
                  <label key={t.key} className="tier">
                    <input
                      type="radio"
                      name={`${id}-tier`}
                      value={t.key}
                      checked={sel.tier === t.key}
                      onChange={() => {
                        set({ tier: t.key });
                        track("package_select", { tier: t.key });
                      }}
                    />
                    <span className="mark" aria-hidden="true" />
                    <span className="nm">
                      {t.name} <span className="dots" aria-hidden="true" />
                    </span>
                    {/* no figure until the owner verifies the rate, in any environment */}
                    <span className="pr num">{tierRateLabel(t) ?? <span className="q">By quote</span>}</span>
                    {sel.tier === t.key && (
                      <span className="inc">
                        {t.inclusions.map((f, i) => (
                          <span key={f.value}>
                            {i > 0 && "; "}
                            <Claim fact={f} />
                          </span>
                        ))}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>
                <span className="rn">iv.</span> Anything else
              </legend>
              <div className="opts">
                {extras.map((x) => (
                  <label key={x.key} className="opt">
                    <input type="checkbox" checked={sel.extras.includes(x.key)} onChange={() => toggleExtra(x.key)} />
                    <span>{x.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="fineprint">
              {!allRatesVerified() && "Starting rates are being confirmed, so every card gets a personal quote. "}
              Over-{pricingTerms.over50Threshold.value} rate, minimum hours, travel and deposit aren&rsquo;t published yet; {business.ownerFirstName.value} confirms them
              with your quote.
            </p>
          </form>
        </div>

        <aside className="result" aria-labelledby={`${id}-card`}>
          <p className="eyebrow" id={`${id}-card`}>
            <span className="r" aria-hidden="true" />
            Your card
          </p>
          <ul className="card-lines">
            <li>
              <b>Occasion</b>
              {eventLabel(sel.event) ?? <span className="empty">to choose</span>}
            </li>
            <li>
              <b>Guests</b>
              <span className="num">{sel.guests ?? <span className="empty">to set</span>}</span>
            </li>
            <li>
              <b>Hours</b>
              <span className="num">{sel.hours ?? <span className="empty">to set</span>}</span>
            </li>
            <li>
              <b>Bar</b>
              {result.tier?.name ?? <span className="empty">to choose</span>}
            </li>
            {sel.extras.length > 0 && (
              <li>
                <b>Also</b>
                {sel.extras.map((k) => extras.find((x) => x.key === k)?.label).join(", ")}
              </li>
            )}
          </ul>

          {/* the verdict is announced politely as it changes */}
          <div className="verdict" role="status" aria-live="polite">
            {result.mode === "estimate" ? (
              <>
                <span className="label-est">{result.label}</span>
                <span className="big num" style={{ display: "block" }}>
                  <span className="from">from</span>
                  {usd(result.from)}
                </span>
                <span className="note" style={{ display: "block" }}>{result.basis}. What can change the final quote:</span>
                <ul className="change">
                  {result.canChange.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <span className="big" style={{ display: "block" }}>
                  {result.complete ? "Ready for a quote." : "A quote, by request."}
                </span>
                <span className="note" style={{ display: "block" }}>
                  {result.reason}
                  {result.openItems.length > 0 && ` Still open: ${result.openItems.join(", ")}.`}
                  {over50 && ` Parties over ${pricingTerms.over50Threshold.value} guests have an additional hourly rate.`}
                </span>
                {result.inclusions.length > 0 && (
                  <ul className="inclist">
                    {result.inclusions.map((f) => (
                      <li key={f.text}>{f.verified ? f.text : <span><span className="tbc">{f.text}</span><span className="tbc-tag">[to confirm]</span></span>}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="actions">
            <a className="btn btn-gold" href={href} onClick={() => track("compose_to_book", { tier: sel.tier ?? "none", complete: result.complete })}>
              Check your date with this card <span className="ar" aria-hidden="true" />
            </a>
            {hasAny(sel) && (
              <button type="button" className="tlink" style={{ background: "none", border: 0, borderBottom: "1px solid var(--gold)" }} onClick={() => setSel(EMPTY)}>
                Clear the card
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function Stepper(props: {
  id: string;
  label: string;
  value: number;
  set: boolean;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const { id, label, value, set, min, max, step, onChange } = props;
  return (
    <div className="step">
      <label htmlFor={id}>{label}</label>
      <div className="ctl">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} aria-controls={id} disabled={set && value <= min} onClick={() => onChange(set ? value - step : value)}>
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode={step % 1 ? "decimal" : "numeric"}
          min={min}
          max={max}
          step={step}
          value={set ? value : ""}
          placeholder={String(value)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
          }}
        />
        <button type="button" aria-label={`More ${label.toLowerCase()}`} aria-controls={id} disabled={set && value >= max} onClick={() => onChange(set ? value + step : value)}>
          +
        </button>
      </div>
    </div>
  );
}
