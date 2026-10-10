import { extras, tiers } from "@/lib/content/facts";
import { eventLabel, type Selection } from "@/lib/compose/quote";
import { hasAny } from "@/lib/compose/selection";

/**
 * The card carried over from Compose your bar, as a live summary of the
 * booking flow's bar step (components/book/BookingFlow owns the state).
 * Editing happens in the flow ("Edit the card" jumps to the bar step).
 */
export default function BookCard({
  sel,
  onEdit,
  onAsk,
}: {
  sel: Selection;
  onEdit?: () => void;
  onAsk?: (opener: HTMLElement) => void;
}) {
  const tier = tiers.find((t) => t.key === sel.tier);
  const rows: [string, string | null][] = [
    ["Occasion", eventLabel(sel.event)],
    ["Guests", sel.guests ? String(sel.guests) : null],
    ["Hours", sel.hours ? String(sel.hours) : null],
    ["Bar", tier?.name ?? null],
    ["Also", sel.extras.length ? sel.extras.map((k) => extras.find((x) => x.key === k)?.label).join(", ") : null],
  ];

  return (
    <aside className="receipt" aria-labelledby="card-h">
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
        <p className="empty">No card yet. Choose the bar in step three, or simply tell us the date.</p>
      )}
      <div className="rc-actions">
        {onEdit && (
          <button type="button" className="edit" onClick={onEdit}>
            {hasAny(sel) ? "Edit the card" : "Choose the bar"}
          </button>
        )}
        {onAsk && (
          <button type="button" className="edit" onClick={(e) => onAsk(e.currentTarget)}>
            Questions? Ask the AI concierge
          </button>
        )}
      </div>
    </aside>
  );
}
