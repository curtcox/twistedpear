/** Strong Kleene operators over {false, unknown, true}. */

export type Trit = "false" | "unknown" | "true";

export const TRITS: readonly Trit[] = ["false", "unknown", "true"];

export function kleeneNot(value: Trit): Trit {
  if (value === "true") return "false";
  if (value === "false") return "true";
  return "unknown";
}

export function kleeneAll(values: readonly Trit[]): Trit {
  let unknown = false;
  for (const value of values) {
    if (value === "false") return "false";
    if (value === "unknown") unknown = true;
  }
  return unknown ? "unknown" : "true";
}

export function kleeneAny(values: readonly Trit[]): Trit {
  let unknown = false;
  for (const value of values) {
    if (value === "true") return "true";
    if (value === "unknown") unknown = true;
  }
  return unknown ? "unknown" : "false";
}

/** True only when the operand is true. Unknown becomes false. */
export function kleeneKnown(value: Trit): Trit {
  return value === "true" ? "true" : "false";
}

/** Unknown collapses to `fallback`; true and false are unchanged. */
export function kleeneAssume(value: Trit, fallback: boolean): Trit {
  if (value !== "unknown") return value;
  return fallback ? "true" : "false";
}

export function tritFromBoolean(value: boolean): Trit {
  return value ? "true" : "false";
}
