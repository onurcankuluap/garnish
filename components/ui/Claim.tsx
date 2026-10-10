import type { ReactNode } from "react";
import { placeholdersVisible, type Fact } from "@/lib/content/facts";

interface Props<T> {
  fact: Fact<T>;
  /** How to print the value; defaults to String(value). */
  children?: ReactNode;
  /** Shown instead when an unverified claim has no value (MISSING). */
  missing?: string;
}

/**
 * A business claim. Verified: the value, as is. Unverified: the value with a
 * dashed underline and "[to confirm]", or a bracketed placeholder when the
 * fact is missing. In a Vercel production deployment unverified claims render
 * nothing, so wrap whole sentences in <Claim> rather than single words.
 */
export default function Claim<T>({ fact, children, missing }: Props<T>) {
  const body = children ?? (fact.value === null ? null : String(fact.value));
  if (fact.verified) return <>{body}</>;
  if (!placeholdersVisible()) return null;
  const title = `To confirm with the owner (facts register #${fact.register}: ${fact.status}). Source: ${fact.source}`;
  if (fact.value === null || body === null || (Array.isArray(fact.value) && fact.value.length === 0)) {
    return (
      <span className="ph" title={title} data-claim="missing">
        [{missing ?? "to confirm"}]
      </span>
    );
  }
  return (
    <span data-claim="unverified" title={title}>
      <span className="tbc">{body}</span>
      <span className="tbc-tag">[to confirm]</span>
    </span>
  );
}

/** A visible placeholder for content the owner has to supply (copy, photos). */
export function Placeholder({ children }: { children: ReactNode }) {
  if (!placeholdersVisible()) return null;
  return (
    <span className="ph" data-claim="placeholder">
      [{children}]
    </span>
  );
}
