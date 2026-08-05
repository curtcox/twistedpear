const PACKET_LOG_STATE_MAGIC = new Uint8Array([0x54, 0x50, 0x4c, 0x47, 0x01]); // TPLG\x01
const HEADER_LENGTH = PACKET_LOG_STATE_MAGIC.length + 4;
const ENTRY_HEADER_LENGTH = 11;

export interface PacketLogEntry {
  readonly direction: 0 | 1;
  readonly index: bigint;
  readonly payload: Uint8Array;
}

export interface PacketLogParameters {
  readonly retentionPerDirection: number;
  /** Optional 32-byte peer-pair rendezvous so tunnels do not share one contract key. */
  readonly rendezvous?: Uint8Array;
}

function equalPrefix(bytes: Uint8Array, prefix: Uint8Array): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function assertRetention(retention: number): number {
  if (!Number.isInteger(retention) || retention < 1 || retention > 0xffff) {
    throw new Error("packet-log retention must be an integer in 1..65535");
  }
  return retention;
}

function assertRendezvous(rendezvous: Uint8Array | undefined): Uint8Array | undefined {
  if (rendezvous === undefined) return undefined;
  if (rendezvous.length !== 32) {
    throw new Error("packet-log rendezvous must be 32 bytes");
  }
  return rendezvous;
}

function entryKey(entry: PacketLogEntry): string {
  return `${entry.direction}:${entry.index.toString()}`;
}

function comparePayload(left: Uint8Array, right: Uint8Array): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = left[index]! - right[index]!;
    if (delta !== 0) return delta;
  }
  return left.length - right.length;
}

export function encodePacketLogParameters(
  value: PacketLogParameters
): Uint8Array {
  const retention = assertRetention(value.retentionPerDirection);
  const rendezvous = assertRendezvous(value.rendezvous);
  const out = new Uint8Array(rendezvous === undefined ? 2 : 34);
  new DataView(out.buffer).setUint16(0, retention, false);
  if (rendezvous !== undefined) {
    out.set(rendezvous, 2);
  }
  return out;
}

export function decodePacketLogParameters(
  bytes: Uint8Array
): PacketLogParameters {
  if (bytes.length !== 2 && bytes.length !== 34) {
    throw new Error("invalid packet-log parameters");
  }
  const retentionPerDirection = assertRetention(
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(
      0,
      false
    )
  );
  if (bytes.length === 2) {
    return { retentionPerDirection };
  }
  return {
    retentionPerDirection,
    rendezvous: Uint8Array.from(bytes.subarray(2))
  };
}

export function encodePacketLogState(
  entries: ReadonlyArray<PacketLogEntry>
): Uint8Array {
  if (entries.length > 0xffff_ffff) {
    throw new Error("too many packet-log entries");
  }

  let payloadBytes = 0;
  let previousKey: { direction: number; index: bigint } | null = null;
  for (const entry of entries) {
    if (entry.direction !== 0 && entry.direction !== 1) {
      throw new Error("invalid packet-log direction");
    }
    if (entry.payload.length > 0xffff) {
      throw new Error("packet-log payload too large");
    }
    if (
      previousKey !== null &&
      (previousKey.direction > entry.direction ||
        (previousKey.direction === entry.direction &&
          previousKey.index >= entry.index))
    ) {
      throw new Error("packet-log entries not canonical");
    }
    previousKey = { direction: entry.direction, index: entry.index };
    payloadBytes += ENTRY_HEADER_LENGTH + entry.payload.length;
  }

  const out = new Uint8Array(HEADER_LENGTH + payloadBytes);
  out.set(PACKET_LOG_STATE_MAGIC);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint32(PACKET_LOG_STATE_MAGIC.length, entries.length, false);

  let cursor = HEADER_LENGTH;
  for (const entry of entries) {
    out[cursor] = entry.direction;
    view.setBigUint64(cursor + 1, entry.index, false);
    view.setUint16(cursor + 9, entry.payload.length, false);
    out.set(entry.payload, cursor + ENTRY_HEADER_LENGTH);
    cursor += ENTRY_HEADER_LENGTH + entry.payload.length;
  }
  return out;
}

export function decodePacketLogState(
  bytes: Uint8Array,
  retentionPerDirection: number
): PacketLogEntry[] {
  const retention = assertRetention(retentionPerDirection);
  if (
    bytes.length < HEADER_LENGTH ||
    !equalPrefix(bytes, PACKET_LOG_STATE_MAGIC)
  ) {
    throw new Error("invalid packet-log state header");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(PACKET_LOG_STATE_MAGIC.length, false);
  let cursor = HEADER_LENGTH;
  const entries: PacketLogEntry[] = [];
  let previousKey: { direction: number; index: bigint } | null = null;
  const directionCounts = [0, 0];

  for (let index = 0; index < count; index += 1) {
    const headerEnd = cursor + ENTRY_HEADER_LENGTH;
    if (headerEnd > bytes.length) {
      throw new Error("truncated packet-log entry header");
    }
    const direction = bytes[cursor]!;
    if (direction !== 0 && direction !== 1) {
      throw new Error("invalid packet-log direction");
    }
    const entryIndex = view.getBigUint64(cursor + 1, false);
    const payloadLength = view.getUint16(cursor + 9, false);
    const payloadEnd = headerEnd + payloadLength;
    if (payloadEnd > bytes.length) {
      throw new Error("truncated packet-log payload");
    }
    if (
      previousKey !== null &&
      (previousKey.direction > direction ||
        (previousKey.direction === direction &&
          previousKey.index >= entryIndex))
    ) {
      throw new Error("packet-log entries not canonical");
    }
    previousKey = { direction, index: entryIndex };
    directionCounts[direction]! += 1;
    if (directionCounts[direction]! > retention) {
      throw new Error("packet-log retention exceeded");
    }
    entries.push({
      direction: direction as 0 | 1,
      index: entryIndex,
      payload: Uint8Array.from(bytes.subarray(headerEnd, payloadEnd))
    });
    cursor = payloadEnd;
  }

  if (cursor !== bytes.length) {
    throw new Error("trailing packet-log state bytes");
  }
  return entries;
}

export function mergePacketLogStates(
  retentionPerDirection: number,
  left: Uint8Array,
  right: Uint8Array
): Uint8Array {
  const retention = assertRetention(retentionPerDirection);
  const merged = new Map<string, PacketLogEntry>();

  for (const entry of [
    ...decodePacketLogState(left, retention),
    ...decodePacketLogState(right, retention)
  ]) {
    const key = entryKey(entry);
    const existing = merged.get(key);
    if (
      existing === undefined ||
      comparePayload(entry.payload, existing.payload) < 0
    ) {
      merged.set(key, entry);
    }
  }

  const entries: PacketLogEntry[] = [];
  for (const direction of [0, 1] as const) {
    const selected = [...merged.values()]
      .filter((entry) => entry.direction === direction)
      .sort((a, b) => (a.index < b.index ? -1 : a.index > b.index ? 1 : 0));
    if (selected.length > retention) {
      selected.splice(0, selected.length - retention);
    }
    entries.push(...selected);
  }

  return encodePacketLogState(entries);
}
