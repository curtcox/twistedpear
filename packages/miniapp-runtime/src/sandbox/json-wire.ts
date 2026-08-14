/**
 * JSON-safe wire encoding for Uint8Array values that cross worker↔page IPC
 * (JSON.stringify turns typed arrays into numeric-key plain objects).
 */

export type JsonWireBytes = {
  readonly __tp: "u8";
  readonly d: ReadonlyArray<number>;
};

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
        encodeJsonWireValue(entry),
      ]),
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
    return reviveJsonWireArray(value);
  }

  if (value !== null && typeof value === "object") {
    return reviveJsonWireObject(value as Record<string, unknown>);
  }

  return value;
}

function reviveJsonWireArray(value: unknown[]): unknown {
  if (value.length > 0 && value.every((item) => typeof item === "number")) {
    return new Uint8Array(value);
  }
  return value.map(reviveJsonWireValue);
}

function reviveJsonWireObject(value: Record<string, unknown>): unknown {
  const record = value as { type?: string; data?: ReadonlyArray<number> };
  if (record.type === "Buffer" && Array.isArray(record.data)) {
    return new Uint8Array(record.data);
  }

  const dense = reviveDenseNumericObject(value);
  if (dense !== undefined) return dense;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      reviveJsonWireValue(entry),
    ]),
  );
}

/** Legacy JSON.stringify(Uint8Array) shape: { "0": n, "1": n, ... } */
function reviveDenseNumericObject(
  value: Record<string, unknown>,
): Uint8Array | undefined {
  const keys = Object.keys(value);
  if (
    keys.length === 0 ||
    !keys.every((key) => /^\d+$/.test(key)) ||
    !keys
      .map(Number)
      .sort((a, b) => a - b)
      .every((index, order) => index === order)
  ) {
    return undefined;
  }

  const bytes = new Uint8Array(keys.length);
  for (let index = 0; index < keys.length; index += 1) {
    const entry = value[String(index)];
    if (typeof entry !== "number") return undefined;
    bytes[index] = entry;
  }
  return bytes;
}
