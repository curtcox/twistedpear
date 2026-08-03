/**
 * JSON-safe wire encoding for Uint8Array values that cross worker↔page IPC
 * (JSON.stringify turns typed arrays into numeric-key plain objects).
 */
// @ts-nocheck


export type JsonWireBytes = { readonly __tp: "u8"; readonly d: ReadonlyArray<number> };

export function isJsonWireBytes(value: unknown): value is JsonWireBytes {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as { __tp?: unknown }).__tp === "u8" &&
    Array.isArray((value as { d?: unknown }).d)
  );
}

export function encodeJsonWireValue(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return { __tp: "u8", d: Array.from(value) } satisfies JsonWireBytes;
  }

  if (Array.isArray(value)) {
    return value.map(encodeJsonWireValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        encodeJsonWireValue(entry)
      ])
    );
  }

  return value;
}

export function reviveJsonWireValue(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (isJsonWireBytes(value)) {
    return Uint8Array.from(value.d);
  }

  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((item) => typeof item === "number")) {
      return new Uint8Array(value);
    }
    return value.map(reviveJsonWireValue);
  }

  if (value !== null && typeof value === "object") {
    const record = value as { type?: string; data?: ReadonlyArray<number> };
    if (record.type === "Buffer" && Array.isArray(record.data)) {
      return new Uint8Array(record.data);
    }

    // Legacy JSON.stringify(Uint8Array) shape: { "0": n, "1": n, ... }
    const keys = Object.keys(value as object);
    if (
      keys.length > 0 &&
      keys.every((key) => /^\d+$/.test(key)) &&
      keys.map(Number).sort((a, b) => a - b).every((index, order) => index === order)
    ) {
      const length = keys.length;
      const bytes = new Uint8Array(length);
      let valid = true;
      for (let index = 0; index < length; index += 1) {
        const entry = (value as Record<string, unknown>)[String(index)];
        if (typeof entry !== "number") {
          valid = false;
          break;
        }
        bytes[index] = entry;
      }
      if (valid) {
        return bytes;
      }
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        reviveJsonWireValue(entry)
      ])
    );
  }

  return value;
}
