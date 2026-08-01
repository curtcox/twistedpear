/**
 * Sans-IO `TPL1` link-control envelope.
 *
 * The peer-media readiness exchange (G3) and the active link probe (G2) both
 * ride the same authenticated peer route, so both hosts and the app-facing
 * Link Observatory must agree on one bounded wire form. Bytes in, bytes out —
 * no clocks, no sockets, no transport.
 */

import { normalizeMediaReadiness, type PeerMediaReadiness } from "./media-readiness.js";
import { utf8Decode, utf8Encode } from "./utf8.js";

/** 1 = readiness, 2 = probe request, 3 = probe reply, 4 = session invite. */
export type LinkControlType = 1 | 2 | 3 | 4;

export interface LinkControlEnvelope {
  readonly type: LinkControlType;
  readonly id: string;
  readonly payload: Uint8Array;
}

export const LINK_CONTROL_MAGIC: ReadonlyArray<number> = [0x54, 0x50, 0x4c, 0x31];
export const LINK_CONTROL_HEADER_BYTES = 8;
export const LINK_CONTROL_MAX_ID_BYTES = 64;
export const LINK_CONTROL_MAX_PAYLOAD_BYTES = 8192;

/** Both peers send this id first; the answer carries `READINESS_RESPONSE_ID`. */
export const READINESS_REQUEST_ID = "readiness";
export const READINESS_RESPONSE_ID = "readiness-response";

const BUCKETS: ReadonlyArray<string> = ["none", "derived", "narrowband", "audio", "sd-video", "hd-video"];
const POSTURES: ReadonlyArray<string> = ["open", "ask", "closed"];
const CONSTRAINTS: ReadonlyArray<string> = ["metered", "low-battery", "thermal", "foreground-only"];
const CLASS_IDS: ReadonlyArray<string> = ["camera", "microphone", "screen-capture"];

export function encodeLinkControl(envelope: LinkControlEnvelope): Uint8Array {
  const id = utf8Encode(envelope.id);
  if (id.length < 1 || id.length > LINK_CONTROL_MAX_ID_BYTES) {
    throw new Error("Link control envelope id exceeds bounds.");
  }
  if (envelope.payload.length > LINK_CONTROL_MAX_PAYLOAD_BYTES) {
    throw new Error("Link control envelope exceeds bounds.");
  }
  const out = new Uint8Array(LINK_CONTROL_HEADER_BYTES + id.length + envelope.payload.length);
  out.set(LINK_CONTROL_MAGIC);
  out[4] = envelope.type;
  out[5] = id.length;
  new DataView(out.buffer).setUint16(6, envelope.payload.length, false);
  out.set(id, LINK_CONTROL_HEADER_BYTES);
  out.set(envelope.payload, LINK_CONTROL_HEADER_BYTES + id.length);
  return out;
}

/** Returns null for anything that is not a well-formed, in-bounds envelope. */
export function decodeLinkControl(bytes: Uint8Array): LinkControlEnvelope | null {
  if (bytes.length < LINK_CONTROL_HEADER_BYTES) return null;
  if (!LINK_CONTROL_MAGIC.every((value, index) => bytes[index] === value)) return null;
  const type = bytes[4];
  const idLength = bytes[5] ?? 0;
  const payloadLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(6, false);
  if (type !== 1 && type !== 2 && type !== 3 && type !== 4) return null;
  if (idLength < 1 || idLength > LINK_CONTROL_MAX_ID_BYTES) return null;
  if (payloadLength > LINK_CONTROL_MAX_PAYLOAD_BYTES) return null;
  if (bytes.length !== LINK_CONTROL_HEADER_BYTES + idLength + payloadLength) return null;
  return {
    type,
    id: utf8Decode(bytes.subarray(LINK_CONTROL_HEADER_BYTES, LINK_CONTROL_HEADER_BYTES + idLength)),
    payload: bytes.slice(LINK_CONTROL_HEADER_BYTES + idLength)
  };
}

export function encodeReadinessEnvelope(
  id: typeof READINESS_REQUEST_ID | typeof READINESS_RESPONSE_ID,
  readiness: PeerMediaReadiness
): Uint8Array {
  return encodeLinkControl({
    type: 1,
    id,
    payload: utf8Encode(JSON.stringify(normalizeMediaReadiness(readiness)))
  });
}

/**
 * Parses a readiness payload from an untrusted peer. A malformed body and a
 * refusal are both `null`, so a peer that declines to answer is not
 * distinguishable from one that cannot.
 */
export function parseMediaReadiness(payload: Uint8Array): PeerMediaReadiness | null {
  if (payload.length > LINK_CONTROL_MAX_PAYLOAD_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(payload));
  } catch {
    return null;
  }
  return isMediaReadiness(value) ? normalizeMediaReadiness(value) : null;
}

/** Ids are echoed into host chrome, so keep them to a printable, bounded set. */
const SESSION_INVITE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
/** Body bound; an invite must fit a single opportunistic LXMF packet. */
export const SESSION_INVITE_MAX_BODY_BYTES = 256;

/**
 * A peer asking to start realtime media in one registered app.
 *
 * This is the *request*, not the invitation the user sees: it carries no peer
 * label and no consent. The receiving host names the verified peer itself,
 * because a label supplied by the sender is exactly the field an attacker
 * would use to impersonate someone in trusted chrome.
 */
export interface SessionInviteRequest {
  readonly id: string;
  readonly appId: string;
  readonly requestedClasses: ReadonlyArray<"camera" | "microphone" | "screen-capture">;
  readonly expiresAt: number;
}

export function encodeSessionInviteEnvelope(invite: SessionInviteRequest): Uint8Array {
  if (!SESSION_INVITE_ID_PATTERN.test(invite.id)) throw new Error("Session invite id is invalid.");
  if (!SESSION_INVITE_ID_PATTERN.test(invite.appId)) throw new Error("Session invite app id is invalid.");
  const payload = utf8Encode(JSON.stringify({
    appId: invite.appId,
    requestedClasses: [...invite.requestedClasses],
    expiresAt: Math.floor(invite.expiresAt)
  }));
  if (payload.length > SESSION_INVITE_MAX_BODY_BYTES) throw new Error("Session invite exceeds bounds.");
  return encodeLinkControl({ type: 4, id: invite.id, payload });
}

/**
 * Parses an invite from an untrusted peer. Anything malformed, oversized, or
 * out of the closed class set is `null` — a host never guesses at a partially
 * understood request for a camera.
 */
export function parseSessionInvite(envelope: LinkControlEnvelope): SessionInviteRequest | null {
  if (envelope.type !== 4) return null;
  if (!SESSION_INVITE_ID_PATTERN.test(envelope.id)) return null;
  if (envelope.payload.length > SESSION_INVITE_MAX_BODY_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(envelope.payload));
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as { appId?: unknown; requestedClasses?: unknown; expiresAt?: unknown };
  if (typeof candidate.appId !== "string" || !SESSION_INVITE_ID_PATTERN.test(candidate.appId)) return null;
  if (typeof candidate.expiresAt !== "number" || !Number.isFinite(candidate.expiresAt)) return null;
  if (!Array.isArray(candidate.requestedClasses)) return null;
  const requestedClasses = candidate.requestedClasses;
  if (requestedClasses.length < 1 || requestedClasses.length > CLASS_IDS.length) return null;
  if (!requestedClasses.every((entry) => typeof entry === "string" && CLASS_IDS.includes(entry))) return null;
  if (new Set(requestedClasses).size !== requestedClasses.length) return null;
  return {
    id: envelope.id,
    appId: candidate.appId,
    requestedClasses: requestedClasses as ReadonlyArray<"camera" | "microphone" | "screen-capture">,
    expiresAt: Math.floor(candidate.expiresAt)
  };
}

export function isMediaReadiness(value: unknown): value is PeerMediaReadiness {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PeerMediaReadiness>;
  return (
    typeof candidate.hostApi === "string" &&
    candidate.hostApi.length > 0 &&
    candidate.hostApi.length <= 32 &&
    Array.isArray(candidate.accepts) &&
    candidate.accepts.every(isReadinessClass) &&
    Array.isArray(candidate.offers) &&
    candidate.offers.every(isReadinessClass) &&
    typeof candidate.downlinkBucket === "string" &&
    BUCKETS.includes(candidate.downlinkBucket) &&
    Array.isArray(candidate.constrained) &&
    candidate.constrained.every((entry) => typeof entry === "string" && CONSTRAINTS.includes(entry)) &&
    typeof candidate.consentPosture === "string" &&
    POSTURES.includes(candidate.consentPosture) &&
    typeof candidate.expiresAt === "number" &&
    Number.isFinite(candidate.expiresAt)
  );
}

function isReadinessClass(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as { classId?: unknown; maxRung?: unknown; encodings?: unknown };
  return (
    typeof entry.classId === "string" &&
    CLASS_IDS.includes(entry.classId) &&
    typeof entry.maxRung === "string" &&
    entry.maxRung.length > 0 &&
    entry.maxRung.length <= 64 &&
    Array.isArray(entry.encodings) &&
    entry.encodings.length <= 16 &&
    entry.encodings.every((encoding) => typeof encoding === "string" && encoding.length > 0 && encoding.length <= 64)
  );
}
