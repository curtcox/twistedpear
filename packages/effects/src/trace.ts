import type { Event, Intent } from "./types.js";

export type TraceEntry =
  | { readonly t: "event"; readonly node: string; readonly event: Event }
  | { readonly t: "intent"; readonly node: string; readonly intent: Intent }
  | { readonly t: "advance"; readonly at: number };

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

function canonicalNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`non-finite number is not canonicalizable: ${value}`);
  }
  return JSON.stringify(value);
}

function canonicalArray(values: readonly unknown[]): string {
  return `[${values.map((item) => canonicalJson(item ?? null)).join(",")}]`;
}

function canonicalRecord(record: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of Object.keys(record).sort()) {
    const item = record[key];
    if (item === undefined) continue;
    parts.push(`${JSON.stringify(key)}:${canonicalJson(item)}`);
  }
  return `{${parts.join(",")}}`;
}

/**
 * SPEC-TRACE canonical JSON: object keys sorted by UTF-16 code units,
 * `Uint8Array` as {"$bytes":"<lowercase hex>"}, no whitespace, numbers in
 * ECMAScript Number::toString form. Non-finite numbers and non-JSON values
 * are rejected so every producer serializes byte-identically.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return canonicalNumber(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (value instanceof Uint8Array) {
    return `{"$bytes":"${bytesToHex(value)}"}`;
  }
  if (Array.isArray(value)) return canonicalArray(value);
  if (typeof value === "object")
    return canonicalRecord(value as Record<string, unknown>);
  throw new Error(`value of type ${typeof value} is not canonicalizable`);
}

/** Canonical serialization of a trace (SPEC-TRACE) — the hash preimage. */
export function serializeTrace(entries: readonly TraceEntry[]): string {
  return canonicalJson(entries);
}

/** FNV-1a 64-bit over UTF-16 code units, as 16 hex digits. */
export function fnv1a64Hex(text: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < text.length; i += 1) {
    h ^= BigInt(text.charCodeAt(i));
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

/** FNV-1a 64-bit over the UTF-16 code units of the canonical form, as 16 hex digits. */
export function hashTrace(entries: readonly TraceEntry[]): string {
  return fnv1a64Hex(serializeTrace(entries));
}
