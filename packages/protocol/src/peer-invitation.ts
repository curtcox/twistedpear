import { sha256 } from "@noble/hashes/sha256.js";
import { utf8Decode, utf8Encode } from "./utf8.js";

export const PEER_INVITATION_VERSION = 1;
export const MAX_PEER_INVITATION_BYTES = 16_384;
export const MAX_PEER_INVITATION_LIFETIME_MS = 5 * 60_000;
export const MAX_PEER_SERVICE_LENGTH = 128;
export const MAX_PEER_DISPLAY_LENGTH = 96;
export const MAX_PEER_CANDIDATES = 8;
export const MAX_PEER_CAPABILITIES = 16;

export type PeerInvitationRole = "offer" | "answer";
export type PeerCandidateKind = "reticulum" | "webrtc" | "gateway";

export interface PeerCandidate {
  readonly kind: PeerCandidateKind;
  readonly value: Uint8Array;
}

export interface PeerInvitation {
  readonly version: 1;
  readonly sessionId: Uint8Array;
  readonly service: string;
  readonly role: PeerInvitationRole;
  readonly peerEphemeralKey: Uint8Array;
  readonly identityProof?: Uint8Array;
  readonly candidates: ReadonlyArray<PeerCandidate>;
  readonly display: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly capabilities: ReadonlyArray<string>;
  readonly signature: Uint8Array;
}

export class PeerInvitationError extends Error {
  constructor(
    readonly code: "MALFORMED" | "OVERSIZED" | "EXPIRED" | "INVALID_SCOPE",
    message: string,
  ) {
    super(message);
    this.name = "PeerInvitationError";
  }
}

function assertBytes(
  value: unknown,
  name: string,
  min: number,
  max: number,
): asserts value is Uint8Array {
  if (
    !(value instanceof Uint8Array) ||
    value.length < min ||
    value.length > max
  ) {
    throw new PeerInvitationError(
      "MALFORMED",
      `${name} must be ${min}..${max} bytes`,
    );
  }
}

function assertText(
  value: unknown,
  name: string,
  min: number,
  max: number,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length < min ||
    value.length > max ||
    [...value].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127;
    })
  ) {
    throw new PeerInvitationError("MALFORMED", `${name} is invalid`);
  }
}

export function validatePeerInvitation(
  invitation: PeerInvitation,
  now?: number,
): void {
  if (invitation.version !== PEER_INVITATION_VERSION)
    throw new PeerInvitationError(
      "MALFORMED",
      "unsupported invitation version",
    );
  assertBytes(invitation.sessionId, "session id", 16, 32);
  assertText(invitation.service, "service", 1, MAX_PEER_SERVICE_LENGTH);
  if (invitation.role !== "offer" && invitation.role !== "answer")
    throw new PeerInvitationError("MALFORMED", "invalid role");
  assertBytes(invitation.peerEphemeralKey, "ephemeral key", 32, 65);
  if (invitation.identityProof !== undefined)
    assertBytes(invitation.identityProof, "identity proof", 16, 512);
  if (
    !Array.isArray(invitation.candidates) ||
    invitation.candidates.length > MAX_PEER_CANDIDATES
  )
    throw new PeerInvitationError("MALFORMED", "too many candidates");
  for (const candidate of invitation.candidates) {
    if (!(["reticulum", "webrtc", "gateway"] as const).includes(candidate.kind))
      throw new PeerInvitationError("MALFORMED", "invalid candidate kind");
    assertBytes(candidate.value, "candidate", 1, 16_384);
  }
  assertText(invitation.display, "display", 0, MAX_PEER_DISPLAY_LENGTH);
  if (
    !Number.isSafeInteger(invitation.issuedAt) ||
    !Number.isSafeInteger(invitation.expiresAt) ||
    invitation.expiresAt <= invitation.issuedAt ||
    invitation.expiresAt - invitation.issuedAt > MAX_PEER_INVITATION_LIFETIME_MS
  ) {
    throw new PeerInvitationError("MALFORMED", "invalid invitation lifetime");
  }
  if (
    now !== undefined &&
    (now < invitation.issuedAt - 30_000 || now >= invitation.expiresAt)
  )
    throw new PeerInvitationError(
      "EXPIRED",
      "invitation is expired or not yet valid",
    );
  if (
    !Array.isArray(invitation.capabilities) ||
    invitation.capabilities.length > MAX_PEER_CAPABILITIES
  )
    throw new PeerInvitationError("MALFORMED", "too many capabilities");
  for (const capability of invitation.capabilities)
    assertText(capability, "capability", 1, 64);
  assertBytes(invitation.signature, "signature", 32, 512);
}

interface CborMap {
  readonly [key: string]: CborValue;
}
type CborValue =
  number | string | Uint8Array | ReadonlyArray<CborValue> | CborMap;
function concat(parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const size = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
function head(major: number, value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new PeerInvitationError("MALFORMED", "invalid CBOR integer");
  if (value < 24) return new Uint8Array([(major << 5) | value]);
  if (value <= 0xff) return new Uint8Array([(major << 5) | 24, value]);
  if (value <= 0xffff)
    return new Uint8Array([(major << 5) | 25, value >>> 8, value & 255]);
  if (value <= 0xffff_ffff) {
    const out = new Uint8Array(5);
    out[0] = (major << 5) | 26;
    new DataView(out.buffer).setUint32(1, value, false);
    return out;
  }
  const out = new Uint8Array(9);
  out[0] = (major << 5) | 27;
  new DataView(out.buffer).setBigUint64(1, BigInt(value), false);
  return out;
}
function cbor(value: CborValue): Uint8Array {
  if (typeof value === "number") return head(0, value);
  if (typeof value === "string") {
    const bytes = utf8Encode(value);
    return concat([head(3, bytes.length), bytes]);
  }
  if (value instanceof Uint8Array)
    return concat([head(2, value.length), value]);
  if (Array.isArray(value))
    return concat([head(4, value.length), ...value.map(cbor)]);
  const entries = Object.entries(value)
    .map(([key, item]) => [cbor(key), item] as const)
    .sort(([a], [b]) => a.length - b.length || compare(a, b));
  return concat([
    head(5, entries.length),
    ...entries.flatMap(([key, item]) => [key, cbor(item)]),
  ]);
}
function compare(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return a.length - b.length;
}

function fields(
  invitation: PeerInvitation,
  signature: boolean,
): Record<string, CborValue> {
  const value: Record<string, CborValue> = {
    v: invitation.version,
    sid: invitation.sessionId,
    svc: invitation.service,
    role: invitation.role,
    key: invitation.peerEphemeralKey,
    cand: invitation.candidates.map((x) => [x.kind, x.value]),
    display: invitation.display,
    iat: invitation.issuedAt,
    exp: invitation.expiresAt,
    caps: invitation.capabilities,
  };
  if (invitation.identityProof !== undefined)
    value.id = invitation.identityProof;
  if (signature) value.sig = invitation.signature;
  return value;
}

export function peerInvitationSigningBytes(
  invitation: PeerInvitation,
): Uint8Array {
  validatePeerInvitation(invitation);
  return cbor(fields(invitation, false));
}
export function encodePeerInvitation(invitation: PeerInvitation): Uint8Array {
  validatePeerInvitation(invitation);
  const out = cbor(fields(invitation, true));
  if (out.length > MAX_PEER_INVITATION_BYTES)
    throw new PeerInvitationError(
      "OVERSIZED",
      "invitation exceeds size budget",
    );
  return out;
}

class Reader {
  at = 0;
  constructor(readonly bytes: Uint8Array) {}
  take(n: number): Uint8Array {
    if (n < 0 || this.at + n > this.bytes.length)
      throw new PeerInvitationError("MALFORMED", "truncated CBOR");
    const out = this.bytes.subarray(this.at, this.at + n);
    this.at += n;
    return out;
  }
  length(add: number): number {
    if (add < 24) return add;
    if (add === 24) return this.take(1)[0] ?? 0;
    if (add === 25) {
      const x = this.take(2);
      return ((x[0] ?? 0) << 8) | (x[1] ?? 0);
    }
    if (add === 26)
      return new DataView(
        this.take(4).buffer,
        this.bytes.byteOffset + this.at - 4,
        4,
      ).getUint32(0, false);
    if (add === 27) {
      const x = new DataView(
        this.take(8).buffer,
        this.bytes.byteOffset + this.at - 8,
        8,
      ).getBigUint64(0, false);
      const n = Number(x);
      if (!Number.isSafeInteger(n))
        throw new PeerInvitationError("MALFORMED", "integer too large");
      return n;
    }
    throw new PeerInvitationError("MALFORMED", "indefinite CBOR forbidden");
  }
  read(depth = 0): CborValue {
    if (depth > 8)
      throw new PeerInvitationError("MALFORMED", "CBOR nesting limit");
    const first = this.take(1)[0] ?? 0;
    const major = first >>> 5;
    const len = this.length(first & 31);
    if (major === 0) return len;
    if (major === 2) return this.take(len);
    if (major === 3) return utf8Decode(this.take(len));
    if (major === 4)
      return Array.from({ length: len }, () => this.read(depth + 1));
    if (major === 5) {
      const out: Record<string, CborValue> = {};
      for (let i = 0; i < len; i++) {
        const key = this.read(depth + 1);
        if (typeof key !== "string" || key in out)
          throw new PeerInvitationError("MALFORMED", "invalid CBOR map");
        out[key] = this.read(depth + 1);
      }
      return out;
    }
    throw new PeerInvitationError("MALFORMED", "unsupported CBOR type");
  }
}
function map(value: CborValue): CborMap {
  if (
    typeof value !== "object" ||
    value === null ||
    value instanceof Uint8Array ||
    Array.isArray(value)
  )
    throw new PeerInvitationError("MALFORMED", "expected map");
  return value as CborMap;
}
function array(value: CborValue | undefined): ReadonlyArray<CborValue> {
  if (!Array.isArray(value))
    throw new PeerInvitationError("MALFORMED", "expected array");
  return value;
}

export function decodePeerInvitation(
  bytes: Uint8Array,
  now?: number,
): PeerInvitation {
  if (bytes.length > MAX_PEER_INVITATION_BYTES)
    throw new PeerInvitationError(
      "OVERSIZED",
      "invitation exceeds size budget",
    );
  const reader = new Reader(bytes);
  const x = map(reader.read());
  if (reader.at !== bytes.length)
    throw new PeerInvitationError("MALFORMED", "trailing CBOR data");
  const candidates = array(x.cand).map((entry) => {
    const pair = array(entry);
    return { kind: pair[0] as PeerCandidateKind, value: pair[1] as Uint8Array };
  });
  const invitation: PeerInvitation = {
    version: x.v as 1,
    sessionId: x.sid as Uint8Array,
    service: x.svc as string,
    role: x.role as PeerInvitationRole,
    peerEphemeralKey: x.key as Uint8Array,
    candidates,
    display: x.display as string,
    issuedAt: x.iat as number,
    expiresAt: x.exp as number,
    capabilities: array(x.caps) as string[],
    signature: x.sig as Uint8Array,
    ...(x.id === undefined ? {} : { identityProof: x.id as Uint8Array }),
  };
  validatePeerInvitation(invitation, now);
  if (compare(encodePeerInvitation(invitation), bytes) !== 0)
    throw new PeerInvitationError(
      "MALFORMED",
      "invitation is not canonical CBOR",
    );
  return invitation;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function encodePeerInvitationText(bytes: Uint8Array): string {
  if (bytes.length > MAX_PEER_INVITATION_BYTES)
    throw new PeerInvitationError(
      "OVERSIZED",
      "invitation exceeds size budget",
    );
  const checked = concat([bytes, sha256(bytes).subarray(0, 4)]);
  let bits = 0,
    value = 0,
    out = "";
  for (const byte of checked) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits -= 5)) & 31];
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out.match(/.{1,5}/g)?.join("-") ?? "";
}
export function decodePeerInvitationText(text: string): Uint8Array {
  const clean = text.toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z2-7]+$/.test(clean) || clean.length > 40_000)
    throw new PeerInvitationError("MALFORMED", "invalid Base32 invitation");
  let bits = 0,
    value = 0;
  const out: number[] = [];
  for (const char of clean) {
    value = (value << 5) | ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) out.push((value >>> (bits -= 8)) & 255);
  }
  if (out.length < 5)
    throw new PeerInvitationError("MALFORMED", "invitation text is too short");
  const all = new Uint8Array(out);
  const body = all.subarray(0, -4);
  if (compare(all.subarray(-4), sha256(body).subarray(0, 4)) !== 0)
    throw new PeerInvitationError("MALFORMED", "invitation checksum mismatch");
  return body;
}

const ACCESSIBILITY_SYMBOLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-:";
const ACCESSIBILITY_MORSE = [
  ".-",
  "-...",
  "-.-.",
  "-..",
  ".",
  "..-.",
  "--.",
  "....",
  "..",
  ".---",
  "-.-",
  ".-..",
  "--",
  "-.",
  "---",
  ".--.",
  "--.-",
  ".-.",
  "...",
  "-",
  "..-",
  "...-",
  ".--",
  "-..-",
  "-.--",
  "--..",
  "-----",
  ".----",
  "..---",
  "...--",
  "....-",
  ".....",
  "-....",
  "--...",
  "---..",
  "----.",
  "-....-",
  "---...",
] as const;
const ACCESSIBILITY_SPOKEN = [
  "alpha",
  "bravo",
  "charlie",
  "delta",
  "echo",
  "foxtrot",
  "golf",
  "hotel",
  "india",
  "juliett",
  "kilo",
  "lima",
  "mike",
  "november",
  "oscar",
  "papa",
  "quebec",
  "romeo",
  "sierra",
  "tango",
  "uniform",
  "victor",
  "whiskey",
  "x-ray",
  "yankee",
  "zulu",
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "dash",
  "colon",
] as const;
function accessibilityCode(code: string): string {
  const value = code.trim().toUpperCase();
  if (
    value.length < 1 ||
    value.length > 40_000 ||
    [...value].some((symbol) => !ACCESSIBILITY_SYMBOLS.includes(symbol))
  )
    throw new PeerInvitationError(
      "MALFORMED",
      "peer accessibility code contains an unsupported symbol or exceeds its size budget",
    );
  return value;
}

/** Deterministic spelling suitable for trusted-host speech synthesis. */
export function spellPeerAccessibilityCode(code: string): string {
  return [...accessibilityCode(code)]
    .map(
      (symbol) => ACCESSIBILITY_SPOKEN[ACCESSIBILITY_SYMBOLS.indexOf(symbol)],
    )
    .join(" ");
}
/** Textual ITU-style Morse fallback. Symbols are space-delimited. */
export function encodePeerAccessibilityMorse(code: string): string {
  return [...accessibilityCode(code)]
    .map((symbol) => ACCESSIBILITY_MORSE[ACCESSIBILITY_SYMBOLS.indexOf(symbol)])
    .join(" ");
}
export function decodePeerAccessibilityMorse(encoded: string): string {
  if (encoded.length < 1 || encoded.length > 240_000)
    throw new PeerInvitationError(
      "OVERSIZED",
      "peer Morse code exceeds its size budget",
    );
  return accessibilityCode(
    encoded
      .trim()
      .split(/\s+/)
      .map((token) => {
        const index = ACCESSIBILITY_MORSE.indexOf(
          token as (typeof ACCESSIBILITY_MORSE)[number],
        );
        if (index < 0)
          throw new PeerInvitationError(
            "MALFORMED",
            "peer Morse code contains an unknown symbol",
          );
        return ACCESSIBILITY_SYMBOLS[index];
      })
      .join(""),
  );
}
