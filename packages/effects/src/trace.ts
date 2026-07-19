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

/**
 * JSON for hashing — encodes Uint8Array as {$bytes: hex}. Keys serialize in
 * insertion order (NOT sorted); deterministic here because all entries are built
 * by the same code paths. SPEC-TRACE tracks defining a sorted-key canonical form.
 */
export function serializeTrace(entries: readonly TraceEntry[]): string {
  return JSON.stringify(entries, (_key, value: unknown) => {
    if (value instanceof Uint8Array) {
      return { $bytes: bytesToHex(value) };
    }
    return value;
  });
}

/** FNV-1a 64-bit as hex — pure, no crypto dependency. */
export function hashTrace(entries: readonly TraceEntry[]): string {
  const text = serializeTrace(entries);
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < text.length; i += 1) {
    h ^= BigInt(text.charCodeAt(i));
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}
