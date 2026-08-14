const PREAMBLE_BYTES = 16;
const PREAMBLE = 0xa5;
const HEADER_BYTES = PREAMBLE_BYTES + 2;
export const MAX_PEER_AUDIO_MODEM_BYTES = 4_096;
export interface PeerAudioFskOptions {
  readonly sampleRate?: number;
  readonly baud?: number;
  readonly markHz?: number;
  readonly spaceHz?: number;
  readonly amplitude?: number;
}

export class PeerAudioFskError extends Error {
  constructor(
    readonly code: "MALFORMED" | "OVERSIZED" | "CRC" | "SIGNAL",
    message: string,
  ) {
    super(message);
    this.name = "PeerAudioFskError";
  }
}
function crc32(bytes: Uint8Array): number {
  let crc = 0xffff_ffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb8_8320 : 0);
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}
function profileInRange(config: {
  readonly sampleRate: number;
  readonly baud: number;
  readonly markHz: number;
  readonly spaceHz: number;
  readonly amplitude: number;
}): boolean {
  if (config.sampleRate < 8_000 || config.sampleRate > 192_000) return false;
  if (config.baud < 100 || config.baud > 4_800) return false;
  if (config.markHz <= config.baud / 2 || config.spaceHz <= config.baud / 2)
    return false;
  if (Math.max(config.markHz, config.spaceHz) >= config.sampleRate / 2)
    return false;
  return config.amplitude > 0 && config.amplitude <= 1;
}

function settings(options: PeerAudioFskOptions) {
  const config = {
    sampleRate: options.sampleRate ?? 48_000,
    baud: options.baud ?? 1_200,
    markHz: options.markHz ?? 2_400,
    spaceHz: options.spaceHz ?? 1_200,
    amplitude: options.amplitude ?? 0.7,
  };
  if (!profileInRange(config))
    throw new PeerAudioFskError("MALFORMED", "Invalid audible FSK profile");
  return config;
}
function packet(payload: Uint8Array): Uint8Array {
  if (payload.length < 1 || payload.length > MAX_PEER_AUDIO_MODEM_BYTES)
    throw new PeerAudioFskError(
      "OVERSIZED",
      "Audible FSK payload exceeds size budget",
    );
  const out = new Uint8Array(HEADER_BYTES + payload.length + 4);
  out.fill(PREAMBLE, 0, PREAMBLE_BYTES);
  new DataView(out.buffer).setUint16(PREAMBLE_BYTES, payload.length, false);
  out.set(payload, HEADER_BYTES);
  new DataView(out.buffer).setUint32(
    HEADER_BYTES + payload.length,
    crc32(payload),
    false,
  );
  return out;
}

/** Conservative audible binary FSK. PCM remains a trusted-host effect and never crosses the broker. */
export function encodePeerAudioFsk(
  payload: Uint8Array,
  options: PeerAudioFskOptions = {},
): Float32Array {
  const config = settings(options);
  const bytes = packet(payload);
  const symbols = bytes.length * 8;
  const totalSamples = Math.round((symbols * config.sampleRate) / config.baud);
  const pcm = new Float32Array(totalSamples);
  let phase = 0;
  for (let symbol = 0; symbol < symbols; symbol += 1) {
    const byte = bytes[Math.floor(symbol / 8)] ?? 0;
    const bit = (byte >>> (7 - (symbol % 8))) & 1;
    const frequency = bit === 1 ? config.markHz : config.spaceHz;
    const start = Math.round((symbol * config.sampleRate) / config.baud);
    const end = Math.round(((symbol + 1) * config.sampleRate) / config.baud);
    const step = (2 * Math.PI * frequency) / config.sampleRate;
    for (let index = start; index < end; index += 1) {
      pcm[index] = Math.sin(phase) * config.amplitude;
      phase = (phase + step) % (2 * Math.PI);
    }
  }
  return pcm;
}

function energy(
  pcm: Float32Array,
  start: number,
  end: number,
  frequency: number,
  sampleRate: number,
): number {
  let sin = 0;
  let cos = 0;
  const step = (2 * Math.PI * frequency) / sampleRate;
  for (let index = start; index < end; index += 1) {
    const value = pcm[index] ?? 0;
    const phase = step * (index - start);
    sin += value * Math.sin(phase);
    cos += value * Math.cos(phase);
  }
  return sin * sin + cos * cos;
}

function decodeFskBits(
  pcm: Float32Array,
  config: ReturnType<typeof settings>,
): Uint8Array {
  const symbols = Math.floor((pcm.length * config.baud) / config.sampleRate);
  if (symbols < (HEADER_BYTES + 4) * 8)
    throw new PeerAudioFskError("SIGNAL", "Audible FSK signal is too short");
  const decoded = new Uint8Array(Math.floor(symbols / 8));
  for (let symbol = 0; symbol < decoded.length * 8; symbol += 1) {
    const start = Math.round((symbol * config.sampleRate) / config.baud);
    const end = Math.round(((symbol + 1) * config.sampleRate) / config.baud);
    const mark = energy(pcm, start, end, config.markHz, config.sampleRate);
    const space = energy(pcm, start, end, config.spaceHz, config.sampleRate);
    if (Math.max(mark, space) < 1e-6)
      throw new PeerAudioFskError(
        "SIGNAL",
        "Audible FSK carrier was not detected",
      );
    if (mark > space)
      decoded[Math.floor(symbol / 8)] =
        (decoded[Math.floor(symbol / 8)] ?? 0) | (1 << (7 - (symbol % 8)));
  }
  return decoded;
}

function payloadFromFskFrame(decoded: Uint8Array): Uint8Array {
  if (!decoded.subarray(0, PREAMBLE_BYTES).every((byte) => byte === PREAMBLE))
    throw new PeerAudioFskError(
      "SIGNAL",
      "Audible FSK preamble was not detected",
    );
  const length = new DataView(
    decoded.buffer,
    decoded.byteOffset,
    decoded.byteLength,
  ).getUint16(PREAMBLE_BYTES, false);
  if (
    length < 1 ||
    length > MAX_PEER_AUDIO_MODEM_BYTES ||
    HEADER_BYTES + length + 4 > decoded.length
  )
    throw new PeerAudioFskError(
      "MALFORMED",
      "Audible FSK packet length is invalid",
    );
  const payload = decoded.slice(HEADER_BYTES, HEADER_BYTES + length);
  const expected = new DataView(
    decoded.buffer,
    decoded.byteOffset,
    decoded.byteLength,
  ).getUint32(HEADER_BYTES + length, false);
  if (crc32(payload) !== expected)
    throw new PeerAudioFskError("CRC", "Audible FSK payload CRC mismatch");
  return payload;
}

export function decodePeerAudioFsk(
  pcm: Float32Array,
  options: PeerAudioFskOptions = {},
): Uint8Array {
  return payloadFromFskFrame(decodeFskBits(pcm, settings(options)));
}

/** Extracts bounded FSK bursts from microphone PCM containing silence between frames. */
function activityWindows(
  pcm: Float32Array,
  windowSamples: number,
): boolean[] {
  const active: boolean[] = [];
  for (let start = 0; start < pcm.length; start += windowSamples) {
    let energySum = 0;
    const end = Math.min(pcm.length, start + windowSamples);
    for (let index = start; index < end; index += 1)
      energySum += (pcm[index] ?? 0) ** 2;
    active.push(Math.sqrt(energySum / Math.max(1, end - start)) > 0.02);
  }
  return active;
}

function burstBounds(
  pcm: Float32Array,
  windowSamples: number,
  first: number,
  last: number,
): { readonly start: number; readonly end: number } {
  let firstSignal = first * windowSamples;
  const firstWindowEnd = Math.min(pcm.length, (first + 1) * windowSamples);
  while (firstSignal < firstWindowEnd && Math.abs(pcm[firstSignal] ?? 0) <= 0.02)
    firstSignal += 1;
  const start = Math.max(0, firstSignal - 1);
  let lastSignal = Math.min(pcm.length, last * windowSamples) - 1;
  const lastWindowStart = Math.max(start, (last - 1) * windowSamples);
  while (lastSignal > lastWindowStart && Math.abs(pcm[lastSignal] ?? 0) <= 0.02)
    lastSignal -= 1;
  return { start, end: Math.min(pcm.length, lastSignal + 2) };
}

function decodeBurst(
  pcm: Float32Array,
  options: PeerAudioFskOptions,
  symbolSamples: number,
  bounds: { readonly start: number; readonly end: number },
): Uint8Array | null {
  for (
    let adjustment = 0;
    adjustment <= Math.ceil(symbolSamples / 2);
    adjustment += 1
  ) {
    try {
      return decodePeerAudioFsk(
        pcm.slice(bounds.start + adjustment, bounds.end),
        options,
      );
    } catch {
      /* Try the next bounded alignment. */
    }
  }
  return null;
}

export function decodePeerAudioFskStream(
  pcm: Float32Array,
  options: PeerAudioFskOptions = {},
): ReadonlyArray<Uint8Array> {
  const config = settings(options);
  const windowSamples = Math.max(8, Math.round(config.sampleRate * 0.01));
  const active = activityWindows(pcm, windowSamples);
  const decoded: Uint8Array[] = [];
  let window = 0;
  while (window < active.length) {
    while (window < active.length && !active[window]) window += 1;
    if (window >= active.length) break;
    const first = window;
    while (window < active.length && active[window]) window += 1;
    const payload = decodeBurst(
      pcm,
      options,
      config.sampleRate / config.baud,
      burstBounds(pcm, windowSamples, first, window),
    );
    if (payload !== null) decoded.push(payload);
  }
  return decoded;
}
