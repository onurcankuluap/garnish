"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { extras, tiers } from "@/lib/content/facts";
import { eventLabel, type Selection } from "@/lib/compose/quote";
import { hasAny, load, save } from "@/lib/compose/selection";
import { track } from "@/lib/analytics";

/**
 * The card carried over from Compose your bar. The URL wins (it was just
 * composed); otherwise the session's saved card is used. Extension point for
 * the booking flow (Phase 7): read the same `Selection` with `fromParams` /
 * `load` from lib/compose/selection.
 */
export default function BookCard({ fromUrl }: { fromUrl: Selection }) {
  const [sel, setSel] = useState<Selection>(fromUrl);

  useEffect(() => {
    track("booking_start", { withCard: hasAny(fromUrl) });
    if (hasAny(fromUrl)) {
      save(fromUrl);
      return;
    }
    const saved = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the session's card after hydration
    if (hasAny(saved)) setSel(saved);
  }, [fromUrl]);

  const tier = tiers.find((t) => t.key === sel.tier);
  const rows: [string, string | null][] = [
    ["Occasion", eventLabel(sel.event)],
    ["Guests", sel.guests ? String(sel.guests) : null],
    ["Hours", sel.hours ? String(sel.hours) : null],
    ["Bar", tier?.name ?? null],
    ["Also", sel.extras.length ? sel.extras.map((k) => extras.find((x) => x.key === k)?.label).join(", ") : null],
  ];

  return (
    <div className="receipt" aria-labelledby="card-h">
      <h2 id="card-h">Your card</h2>
      {hasAny(sel) ? (
        <ul>
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <li key={k}>
                <b>{k}</b>
                <span className="num">{v}</span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="empty">No card yet. Compose one, or simply tell us the date.</p>
      )}
      <Link className="edit" href="/#compose">
        {hasAny(sel) ? "Edit the card" : "Compose your bar"}
      </Link>
    </div>
  );
}
