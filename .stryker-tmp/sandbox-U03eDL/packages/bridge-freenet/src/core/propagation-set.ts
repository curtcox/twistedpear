// @ts-nocheck
const PROPAGATION_STATE_MAGIC = new Uint8Array([0x54, 0x50, 0x50, 0x53, 0x01]); // TPPS\x01
const HEADER_LENGTH = PROPAGATION_STATE_MAGIC.length + 4;
const ENTRY_FIXED_LENGTH = 32 + 8 + 4;
/** LXMF truncated destination hash length (`PROPAGATION_DESTINATION_HASH_SIZE`). */
const DESTINATION_HASH_BYTES = 16;
const TRANSIENT_ID_BYTES = 32;

export interface PropagationSetEntry {
  readonly transientId: Uint8Array;
  readonly storedAt: bigint;
  readonly lxmfData: Uint8Array;
}

export interface PropagationSetParameters {
  readonly destinationHash: Uint8Array;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

function equalPrefix(bytes: Uint8Array, prefix: Uint8Array): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = left[index]! - right[index]!;
    if (delta !== 0) return delta;
  }
  return left.length - right.length;
}

function assertDestinationHash(hash: Uint8Array): Uint8Array {
  if (hash.length !== DESTINATION_HASH_BYTES) {
    throw new Error("propagation-set destination hash must be 16 bytes");
  }
  return hash;
}

function assertTransientId(id: Uint8Array): Uint8Array {
  if (id.length !== TRANSIENT_ID_BYTES) {
    throw new Error("propagation-set transient id must be 32 bytes");
  }
  return id;
}

function transientKey(id: Uint8Array): string {
  let out = "";
  for (const value of id) {
    out += value.toString(16).padStart(2, "0");
  }
  return out;
}

function preferEntry(
  left: PropagationSetEntry,
  right: PropagationSetEntry
): PropagationSetEntry {
  if (left.storedAt < right.storedAt) return left;
  if (right.storedAt < left.storedAt) return right;
  return compareBytes(left.lxmfData, right.lxmfData) <= 0 ? left : right;
}

export function encodePropagationSetParameters(
  value: PropagationSetParameters
): Uint8Array {
  return Uint8Array.from(assertDestinationHash(value.destinationHash));
}

export function decodePropagationSetParameters(
  bytes: Uint8Array
): PropagationSetParameters {
  if (bytes.length !== DESTINATION_HASH_BYTES) {
    throw new Error("invalid propagation-set parameters");
  }
  return { destinationHash: Uint8Array.from(bytes) };
}

export function encodePropagationSetState(
  entries: ReadonlyArray<PropagationSetEntry>
): Uint8Array {
  if (entries.length > 0xffff_ffff) {
    throw new Error("too many propagation-set entries");
  }

  const sorted = [...entries].sort((left, right) =>
    compareBytes(left.transientId, right.transientId)
  );
  let payloadBytes = 0;
  let previousKey: string | null = null;
  for (const entry of sorted) {
    assertTransientId(entry.transientId);
    if (entry.lxmfData.length > 0xffff_ffff) {
      throw new Error("propagation-set message too large");
    }
    const key = transientKey(entry.transientId);
    if (previousKey !== null && previousKey >= key) {
      throw new Error("propagation-set entries not canonical");
    }
    previousKey = key;
    payloadBytes += ENTRY_FIXED_LENGTH + entry.lxmfData.length;
  }

  const out = new Uint8Array(HEADER_LENGTH + payloadBytes);
  out.set(PROPAGATION_STATE_MAGIC);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint32(PROPAGATION_STATE_MAGIC.length, sorted.length, false);

  let cursor = HEADER_LENGTH;
  for (const entry of sorted) {
    out.set(entry.transientId, cursor);
    view.setBigUint64(cursor + TRANSIENT_ID_BYTES, entry.storedAt, false);
    view.setUint32(
      cursor + TRANSIENT_ID_BYTES + 8,
      entry.lxmfData.length,
      false
    );
    out.set(entry.lxmfData, cursor + ENTRY_FIXED_LENGTH);
    cursor += ENTRY_FIXED_LENGTH + entry.lxmfData.length;
  }
  return out;
}

export function decodePropagationSetState(
  bytes: Uint8Array
): PropagationSetEntry[] {
  if (
    bytes.length < HEADER_LENGTH ||
    !equalPrefix(bytes, PROPAGATION_STATE_MAGIC)
  ) {
    throw new Error("invalid propagation-set state header");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(PROPAGATION_STATE_MAGIC.length, false);
  let cursor = HEADER_LENGTH;
  const entries: PropagationSetEntry[] = [];
  let previousKey: string | null = null;

  for (let index = 0; index < count; index += 1) {
    const headerEnd = cursor + ENTRY_FIXED_LENGTH;
    if (headerEnd > bytes.length) {
      throw new Error("truncated propagation-set entry header");
    }
    const transientId = Uint8Array.from(
      bytes.subarray(cursor, cursor + TRANSIENT_ID_BYTES)
    );
    const key = transientKey(transientId);
    if (previousKey !== null && previousKey >= key) {
      throw new Error("propagation-set entries not canonical");
    }
    previousKey = key;
    const storedAt = view.getBigUint64(cursor + TRANSIENT_ID_BYTES, false);
    const lxmfLength = view.getUint32(cursor + TRANSIENT_ID_BYTES + 8, false);
    const payloadEnd = headerEnd + lxmfLength;
    if (payloadEnd > bytes.length) {
      throw new Error("truncated propagation-set message");
    }
    entries.push({
      transientId,
      storedAt,
      lxmfData: Uint8Array.from(bytes.subarray(headerEnd, payloadEnd))
    });
    cursor = payloadEnd;
  }

  if (cursor !== bytes.length) {
    throw new Error("trailing propagation-set state bytes");
  }
  return entries;
}

export function mergePropagationSetStates(
  left: Uint8Array,
  right: Uint8Array
): Uint8Array {
  const merged = new Map<string, PropagationSetEntry>();
  for (const entry of [
    ...decodePropagationSetState(left),
    ...decodePropagationSetState(right)
  ]) {
    const key = transientKey(entry.transientId);
    const existing = merged.get(key);
    merged.set(key, existing === undefined ? entry : preferEntry(existing, entry));
  }
  return encodePropagationSetState([...merged.values()]);
}

export function propagationSetEntryEquals(
  left: PropagationSetEntry,
  right: PropagationSetEntry
): boolean {
  return (
    equalBytes(left.transientId, right.transientId) &&
    left.storedAt === right.storedAt &&
    equalBytes(left.lxmfData, right.lxmfData)
  );
}
