// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { sha256 } from "@noble/hashes/sha256.js";
import { utf8Decode, utf8Encode } from "./utf8.js";
export const PEER_INVITATION_VERSION = 1;
export const MAX_PEER_INVITATION_BYTES = 16_384;
export const MAX_PEER_INVITATION_LIFETIME_MS = stryMutAct_9fa48("26560") ? 5 / 60_000 : (stryCov_9fa48("26560"), 5 * 60_000);
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
  constructor(readonly code: "MALFORMED" | "OVERSIZED" | "EXPIRED" | "INVALID_SCOPE", message: string) {
    super(message);
    this.name = stryMutAct_9fa48("26561") ? "" : (stryCov_9fa48("26561"), "PeerInvitationError");
  }
}
function assertBytes(value: unknown, name: string, min: number, max: number): asserts value is Uint8Array {
  if (stryMutAct_9fa48("26562")) {
    {}
  } else {
    stryCov_9fa48("26562");
    if (stryMutAct_9fa48("26565") ? (!(value instanceof Uint8Array) || value.length < min) && value.length > max : stryMutAct_9fa48("26564") ? false : stryMutAct_9fa48("26563") ? true : (stryCov_9fa48("26563", "26564", "26565"), (stryMutAct_9fa48("26567") ? !(value instanceof Uint8Array) && value.length < min : stryMutAct_9fa48("26566") ? false : (stryCov_9fa48("26566", "26567"), (stryMutAct_9fa48("26568") ? value instanceof Uint8Array : (stryCov_9fa48("26568"), !(value instanceof Uint8Array))) || (stryMutAct_9fa48("26571") ? value.length >= min : stryMutAct_9fa48("26570") ? value.length <= min : stryMutAct_9fa48("26569") ? false : (stryCov_9fa48("26569", "26570", "26571"), value.length < min)))) || (stryMutAct_9fa48("26574") ? value.length <= max : stryMutAct_9fa48("26573") ? value.length >= max : stryMutAct_9fa48("26572") ? false : (stryCov_9fa48("26572", "26573", "26574"), value.length > max)))) {
      if (stryMutAct_9fa48("26575")) {
        {}
      } else {
        stryCov_9fa48("26575");
        throw new PeerInvitationError(stryMutAct_9fa48("26576") ? "" : (stryCov_9fa48("26576"), "MALFORMED"), stryMutAct_9fa48("26577") ? `` : (stryCov_9fa48("26577"), `${name} must be ${min}..${max} bytes`));
      }
    }
  }
}
function assertText(value: unknown, name: string, min: number, max: number): asserts value is string {
  if (stryMutAct_9fa48("26578")) {
    {}
  } else {
    stryCov_9fa48("26578");
    if (stryMutAct_9fa48("26581") ? (typeof value !== "string" || value.length < min || value.length > max) && [...value].some(character => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127;
    }) : stryMutAct_9fa48("26580") ? false : stryMutAct_9fa48("26579") ? true : (stryCov_9fa48("26579", "26580", "26581"), (stryMutAct_9fa48("26583") ? (typeof value !== "string" || value.length < min) && value.length > max : stryMutAct_9fa48("26582") ? false : (stryCov_9fa48("26582", "26583"), (stryMutAct_9fa48("26585") ? typeof value !== "string" && value.length < min : stryMutAct_9fa48("26584") ? false : (stryCov_9fa48("26584", "26585"), (stryMutAct_9fa48("26587") ? typeof value === "string" : stryMutAct_9fa48("26586") ? false : (stryCov_9fa48("26586", "26587"), typeof value !== (stryMutAct_9fa48("26588") ? "" : (stryCov_9fa48("26588"), "string")))) || (stryMutAct_9fa48("26591") ? value.length >= min : stryMutAct_9fa48("26590") ? value.length <= min : stryMutAct_9fa48("26589") ? false : (stryCov_9fa48("26589", "26590", "26591"), value.length < min)))) || (stryMutAct_9fa48("26594") ? value.length <= max : stryMutAct_9fa48("26593") ? value.length >= max : stryMutAct_9fa48("26592") ? false : (stryCov_9fa48("26592", "26593", "26594"), value.length > max)))) || (stryMutAct_9fa48("26595") ? [...value].every(character => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127;
    }) : (stryCov_9fa48("26595"), (stryMutAct_9fa48("26596") ? [] : (stryCov_9fa48("26596"), [...value])).some(character => {
      if (stryMutAct_9fa48("26597")) {
        {}
      } else {
        stryCov_9fa48("26597");
        const code = stryMutAct_9fa48("26598") ? character.codePointAt(0) && 0 : (stryCov_9fa48("26598"), character.codePointAt(0) ?? 0);
        return stryMutAct_9fa48("26601") ? code < 32 && code === 127 : stryMutAct_9fa48("26600") ? false : stryMutAct_9fa48("26599") ? true : (stryCov_9fa48("26599", "26600", "26601"), (stryMutAct_9fa48("26604") ? code >= 32 : stryMutAct_9fa48("26603") ? code <= 32 : stryMutAct_9fa48("26602") ? false : (stryCov_9fa48("26602", "26603", "26604"), code < 32)) || (stryMutAct_9fa48("26606") ? code !== 127 : stryMutAct_9fa48("26605") ? false : (stryCov_9fa48("26605", "26606"), code === 127)));
      }
    }))))) {
      if (stryMutAct_9fa48("26607")) {
        {}
      } else {
        stryCov_9fa48("26607");
        throw new PeerInvitationError(stryMutAct_9fa48("26608") ? "" : (stryCov_9fa48("26608"), "MALFORMED"), stryMutAct_9fa48("26609") ? `` : (stryCov_9fa48("26609"), `${name} is invalid`));
      }
    }
  }
}
export function validatePeerInvitation(invitation: PeerInvitation, now?: number): void {
  if (stryMutAct_9fa48("26610")) {
    {}
  } else {
    stryCov_9fa48("26610");
    if (stryMutAct_9fa48("26613") ? invitation.version === PEER_INVITATION_VERSION : stryMutAct_9fa48("26612") ? false : stryMutAct_9fa48("26611") ? true : (stryCov_9fa48("26611", "26612", "26613"), invitation.version !== PEER_INVITATION_VERSION)) throw new PeerInvitationError(stryMutAct_9fa48("26614") ? "" : (stryCov_9fa48("26614"), "MALFORMED"), stryMutAct_9fa48("26615") ? "" : (stryCov_9fa48("26615"), "unsupported invitation version"));
    assertBytes(invitation.sessionId, stryMutAct_9fa48("26616") ? "" : (stryCov_9fa48("26616"), "session id"), 16, 32);
    assertText(invitation.service, stryMutAct_9fa48("26617") ? "" : (stryCov_9fa48("26617"), "service"), 1, MAX_PEER_SERVICE_LENGTH);
    if (stryMutAct_9fa48("26620") ? invitation.role !== "offer" || invitation.role !== "answer" : stryMutAct_9fa48("26619") ? false : stryMutAct_9fa48("26618") ? true : (stryCov_9fa48("26618", "26619", "26620"), (stryMutAct_9fa48("26622") ? invitation.role === "offer" : stryMutAct_9fa48("26621") ? true : (stryCov_9fa48("26621", "26622"), invitation.role !== (stryMutAct_9fa48("26623") ? "" : (stryCov_9fa48("26623"), "offer")))) && (stryMutAct_9fa48("26625") ? invitation.role === "answer" : stryMutAct_9fa48("26624") ? true : (stryCov_9fa48("26624", "26625"), invitation.role !== (stryMutAct_9fa48("26626") ? "" : (stryCov_9fa48("26626"), "answer")))))) throw new PeerInvitationError(stryMutAct_9fa48("26627") ? "" : (stryCov_9fa48("26627"), "MALFORMED"), stryMutAct_9fa48("26628") ? "" : (stryCov_9fa48("26628"), "invalid role"));
    assertBytes(invitation.peerEphemeralKey, stryMutAct_9fa48("26629") ? "" : (stryCov_9fa48("26629"), "ephemeral key"), 32, 65);
    if (stryMutAct_9fa48("26632") ? invitation.identityProof === undefined : stryMutAct_9fa48("26631") ? false : stryMutAct_9fa48("26630") ? true : (stryCov_9fa48("26630", "26631", "26632"), invitation.identityProof !== undefined)) assertBytes(invitation.identityProof, stryMutAct_9fa48("26633") ? "" : (stryCov_9fa48("26633"), "identity proof"), 16, 512);
    if (stryMutAct_9fa48("26636") ? !Array.isArray(invitation.candidates) && invitation.candidates.length > MAX_PEER_CANDIDATES : stryMutAct_9fa48("26635") ? false : stryMutAct_9fa48("26634") ? true : (stryCov_9fa48("26634", "26635", "26636"), (stryMutAct_9fa48("26637") ? Array.isArray(invitation.candidates) : (stryCov_9fa48("26637"), !Array.isArray(invitation.candidates))) || (stryMutAct_9fa48("26640") ? invitation.candidates.length <= MAX_PEER_CANDIDATES : stryMutAct_9fa48("26639") ? invitation.candidates.length >= MAX_PEER_CANDIDATES : stryMutAct_9fa48("26638") ? false : (stryCov_9fa48("26638", "26639", "26640"), invitation.candidates.length > MAX_PEER_CANDIDATES)))) throw new PeerInvitationError(stryMutAct_9fa48("26641") ? "" : (stryCov_9fa48("26641"), "MALFORMED"), stryMutAct_9fa48("26642") ? "" : (stryCov_9fa48("26642"), "too many candidates"));
    for (const candidate of invitation.candidates) {
      if (stryMutAct_9fa48("26643")) {
        {}
      } else {
        stryCov_9fa48("26643");
        if (stryMutAct_9fa48("26646") ? false : stryMutAct_9fa48("26645") ? true : stryMutAct_9fa48("26644") ? (["reticulum", "webrtc", "gateway"] as const).includes(candidate.kind) : (stryCov_9fa48("26644", "26645", "26646"), !(["reticulum", "webrtc", "gateway"] as const).includes(candidate.kind))) throw new PeerInvitationError(stryMutAct_9fa48("26647") ? "" : (stryCov_9fa48("26647"), "MALFORMED"), stryMutAct_9fa48("26648") ? "" : (stryCov_9fa48("26648"), "invalid candidate kind"));
        assertBytes(candidate.value, stryMutAct_9fa48("26649") ? "" : (stryCov_9fa48("26649"), "candidate"), 1, 16_384);
      }
    }
    assertText(invitation.display, stryMutAct_9fa48("26650") ? "" : (stryCov_9fa48("26650"), "display"), 0, MAX_PEER_DISPLAY_LENGTH);
    if (stryMutAct_9fa48("26653") ? (!Number.isSafeInteger(invitation.issuedAt) || !Number.isSafeInteger(invitation.expiresAt) || invitation.expiresAt <= invitation.issuedAt) && invitation.expiresAt - invitation.issuedAt > MAX_PEER_INVITATION_LIFETIME_MS : stryMutAct_9fa48("26652") ? false : stryMutAct_9fa48("26651") ? true : (stryCov_9fa48("26651", "26652", "26653"), (stryMutAct_9fa48("26655") ? (!Number.isSafeInteger(invitation.issuedAt) || !Number.isSafeInteger(invitation.expiresAt)) && invitation.expiresAt <= invitation.issuedAt : stryMutAct_9fa48("26654") ? false : (stryCov_9fa48("26654", "26655"), (stryMutAct_9fa48("26657") ? !Number.isSafeInteger(invitation.issuedAt) && !Number.isSafeInteger(invitation.expiresAt) : stryMutAct_9fa48("26656") ? false : (stryCov_9fa48("26656", "26657"), (stryMutAct_9fa48("26658") ? Number.isSafeInteger(invitation.issuedAt) : (stryCov_9fa48("26658"), !Number.isSafeInteger(invitation.issuedAt))) || (stryMutAct_9fa48("26659") ? Number.isSafeInteger(invitation.expiresAt) : (stryCov_9fa48("26659"), !Number.isSafeInteger(invitation.expiresAt))))) || (stryMutAct_9fa48("26662") ? invitation.expiresAt > invitation.issuedAt : stryMutAct_9fa48("26661") ? invitation.expiresAt < invitation.issuedAt : stryMutAct_9fa48("26660") ? false : (stryCov_9fa48("26660", "26661", "26662"), invitation.expiresAt <= invitation.issuedAt)))) || (stryMutAct_9fa48("26665") ? invitation.expiresAt - invitation.issuedAt <= MAX_PEER_INVITATION_LIFETIME_MS : stryMutAct_9fa48("26664") ? invitation.expiresAt - invitation.issuedAt >= MAX_PEER_INVITATION_LIFETIME_MS : stryMutAct_9fa48("26663") ? false : (stryCov_9fa48("26663", "26664", "26665"), (stryMutAct_9fa48("26666") ? invitation.expiresAt + invitation.issuedAt : (stryCov_9fa48("26666"), invitation.expiresAt - invitation.issuedAt)) > MAX_PEER_INVITATION_LIFETIME_MS)))) {
      if (stryMutAct_9fa48("26667")) {
        {}
      } else {
        stryCov_9fa48("26667");
        throw new PeerInvitationError(stryMutAct_9fa48("26668") ? "" : (stryCov_9fa48("26668"), "MALFORMED"), stryMutAct_9fa48("26669") ? "" : (stryCov_9fa48("26669"), "invalid invitation lifetime"));
      }
    }
    if (stryMutAct_9fa48("26672") ? now !== undefined || now < invitation.issuedAt - 30_000 || now >= invitation.expiresAt : stryMutAct_9fa48("26671") ? false : stryMutAct_9fa48("26670") ? true : (stryCov_9fa48("26670", "26671", "26672"), (stryMutAct_9fa48("26674") ? now === undefined : stryMutAct_9fa48("26673") ? true : (stryCov_9fa48("26673", "26674"), now !== undefined)) && (stryMutAct_9fa48("26676") ? now < invitation.issuedAt - 30_000 && now >= invitation.expiresAt : stryMutAct_9fa48("26675") ? true : (stryCov_9fa48("26675", "26676"), (stryMutAct_9fa48("26679") ? now >= invitation.issuedAt - 30_000 : stryMutAct_9fa48("26678") ? now <= invitation.issuedAt - 30_000 : stryMutAct_9fa48("26677") ? false : (stryCov_9fa48("26677", "26678", "26679"), now < (stryMutAct_9fa48("26680") ? invitation.issuedAt + 30_000 : (stryCov_9fa48("26680"), invitation.issuedAt - 30_000)))) || (stryMutAct_9fa48("26683") ? now < invitation.expiresAt : stryMutAct_9fa48("26682") ? now > invitation.expiresAt : stryMutAct_9fa48("26681") ? false : (stryCov_9fa48("26681", "26682", "26683"), now >= invitation.expiresAt)))))) throw new PeerInvitationError(stryMutAct_9fa48("26684") ? "" : (stryCov_9fa48("26684"), "EXPIRED"), stryMutAct_9fa48("26685") ? "" : (stryCov_9fa48("26685"), "invitation is expired or not yet valid"));
    if (stryMutAct_9fa48("26688") ? !Array.isArray(invitation.capabilities) && invitation.capabilities.length > MAX_PEER_CAPABILITIES : stryMutAct_9fa48("26687") ? false : stryMutAct_9fa48("26686") ? true : (stryCov_9fa48("26686", "26687", "26688"), (stryMutAct_9fa48("26689") ? Array.isArray(invitation.capabilities) : (stryCov_9fa48("26689"), !Array.isArray(invitation.capabilities))) || (stryMutAct_9fa48("26692") ? invitation.capabilities.length <= MAX_PEER_CAPABILITIES : stryMutAct_9fa48("26691") ? invitation.capabilities.length >= MAX_PEER_CAPABILITIES : stryMutAct_9fa48("26690") ? false : (stryCov_9fa48("26690", "26691", "26692"), invitation.capabilities.length > MAX_PEER_CAPABILITIES)))) throw new PeerInvitationError(stryMutAct_9fa48("26693") ? "" : (stryCov_9fa48("26693"), "MALFORMED"), stryMutAct_9fa48("26694") ? "" : (stryCov_9fa48("26694"), "too many capabilities"));
    for (const capability of invitation.capabilities) assertText(capability, stryMutAct_9fa48("26695") ? "" : (stryCov_9fa48("26695"), "capability"), 1, 64);
    assertBytes(invitation.signature, stryMutAct_9fa48("26696") ? "" : (stryCov_9fa48("26696"), "signature"), 32, 512);
  }
}
interface CborMap {
  readonly [key: string]: CborValue;
}
type CborValue = number | string | Uint8Array | ReadonlyArray<CborValue> | CborMap;
function concat(parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("26697")) {
    {}
  } else {
    stryCov_9fa48("26697");
    const size = parts.reduce(stryMutAct_9fa48("26698") ? () => undefined : (stryCov_9fa48("26698"), (n, p) => stryMutAct_9fa48("26699") ? n - p.length : (stryCov_9fa48("26699"), n + p.length)), 0);
    const out = new Uint8Array(size);
    let at = 0;
    for (const p of parts) {
      if (stryMutAct_9fa48("26700")) {
        {}
      } else {
        stryCov_9fa48("26700");
        out.set(p, at);
        stryMutAct_9fa48("26701") ? at -= p.length : (stryCov_9fa48("26701"), at += p.length);
      }
    }
    return out;
  }
}
function head(major: number, value: number): Uint8Array {
  if (stryMutAct_9fa48("26702")) {
    {}
  } else {
    stryCov_9fa48("26702");
    if (stryMutAct_9fa48("26705") ? !Number.isSafeInteger(value) && value < 0 : stryMutAct_9fa48("26704") ? false : stryMutAct_9fa48("26703") ? true : (stryCov_9fa48("26703", "26704", "26705"), (stryMutAct_9fa48("26706") ? Number.isSafeInteger(value) : (stryCov_9fa48("26706"), !Number.isSafeInteger(value))) || (stryMutAct_9fa48("26709") ? value >= 0 : stryMutAct_9fa48("26708") ? value <= 0 : stryMutAct_9fa48("26707") ? false : (stryCov_9fa48("26707", "26708", "26709"), value < 0)))) throw new PeerInvitationError(stryMutAct_9fa48("26710") ? "" : (stryCov_9fa48("26710"), "MALFORMED"), stryMutAct_9fa48("26711") ? "" : (stryCov_9fa48("26711"), "invalid CBOR integer"));
    if (stryMutAct_9fa48("26715") ? value >= 24 : stryMutAct_9fa48("26714") ? value <= 24 : stryMutAct_9fa48("26713") ? false : stryMutAct_9fa48("26712") ? true : (stryCov_9fa48("26712", "26713", "26714", "26715"), value < 24)) return new Uint8Array(stryMutAct_9fa48("26716") ? [] : (stryCov_9fa48("26716"), [major << 5 | value]));
    if (stryMutAct_9fa48("26720") ? value > 0xff : stryMutAct_9fa48("26719") ? value < 0xff : stryMutAct_9fa48("26718") ? false : stryMutAct_9fa48("26717") ? true : (stryCov_9fa48("26717", "26718", "26719", "26720"), value <= 0xff)) return new Uint8Array(stryMutAct_9fa48("26721") ? [] : (stryCov_9fa48("26721"), [major << 5 | 24, value]));
    if (stryMutAct_9fa48("26725") ? value > 0xffff : stryMutAct_9fa48("26724") ? value < 0xffff : stryMutAct_9fa48("26723") ? false : stryMutAct_9fa48("26722") ? true : (stryCov_9fa48("26722", "26723", "26724", "26725"), value <= 0xffff)) return new Uint8Array(stryMutAct_9fa48("26726") ? [] : (stryCov_9fa48("26726"), [major << 5 | 25, value >>> 8, value & 255]));
    if (stryMutAct_9fa48("26730") ? value > 0xffff_ffff : stryMutAct_9fa48("26729") ? value < 0xffff_ffff : stryMutAct_9fa48("26728") ? false : stryMutAct_9fa48("26727") ? true : (stryCov_9fa48("26727", "26728", "26729", "26730"), value <= 0xffff_ffff)) {
      if (stryMutAct_9fa48("26731")) {
        {}
      } else {
        stryCov_9fa48("26731");
        const out = new Uint8Array(5);
        out[0] = major << 5 | 26;
        new DataView(out.buffer).setUint32(1, value, stryMutAct_9fa48("26732") ? true : (stryCov_9fa48("26732"), false));
        return out;
      }
    }
    const out = new Uint8Array(9);
    out[0] = major << 5 | 27;
    new DataView(out.buffer).setBigUint64(1, BigInt(value), stryMutAct_9fa48("26733") ? true : (stryCov_9fa48("26733"), false));
    return out;
  }
}
function cbor(value: CborValue): Uint8Array {
  if (stryMutAct_9fa48("26734")) {
    {}
  } else {
    stryCov_9fa48("26734");
    if (stryMutAct_9fa48("26737") ? typeof value !== "number" : stryMutAct_9fa48("26736") ? false : stryMutAct_9fa48("26735") ? true : (stryCov_9fa48("26735", "26736", "26737"), typeof value === (stryMutAct_9fa48("26738") ? "" : (stryCov_9fa48("26738"), "number")))) return head(0, value);
    if (stryMutAct_9fa48("26741") ? typeof value !== "string" : stryMutAct_9fa48("26740") ? false : stryMutAct_9fa48("26739") ? true : (stryCov_9fa48("26739", "26740", "26741"), typeof value === (stryMutAct_9fa48("26742") ? "" : (stryCov_9fa48("26742"), "string")))) {
      if (stryMutAct_9fa48("26743")) {
        {}
      } else {
        stryCov_9fa48("26743");
        const bytes = utf8Encode(value);
        return concat(stryMutAct_9fa48("26744") ? [] : (stryCov_9fa48("26744"), [head(3, bytes.length), bytes]));
      }
    }
    if (stryMutAct_9fa48("26746") ? false : stryMutAct_9fa48("26745") ? true : (stryCov_9fa48("26745", "26746"), value instanceof Uint8Array)) return concat(stryMutAct_9fa48("26747") ? [] : (stryCov_9fa48("26747"), [head(2, value.length), value]));
    if (stryMutAct_9fa48("26749") ? false : stryMutAct_9fa48("26748") ? true : (stryCov_9fa48("26748", "26749"), Array.isArray(value))) return concat(stryMutAct_9fa48("26750") ? [] : (stryCov_9fa48("26750"), [head(4, value.length), ...value.map(cbor)]));
    const entries = stryMutAct_9fa48("26751") ? Object.entries(value).map(([key, item]) => [cbor(key), item] as const) : (stryCov_9fa48("26751"), Object.entries(value).map(stryMutAct_9fa48("26752") ? () => undefined : (stryCov_9fa48("26752"), ([key, item]) => [cbor(key), item] as const)).sort(stryMutAct_9fa48("26753") ? () => undefined : (stryCov_9fa48("26753"), ([a], [b]) => stryMutAct_9fa48("26756") ? a.length - b.length && compare(a, b) : stryMutAct_9fa48("26755") ? false : stryMutAct_9fa48("26754") ? true : (stryCov_9fa48("26754", "26755", "26756"), (stryMutAct_9fa48("26757") ? a.length + b.length : (stryCov_9fa48("26757"), a.length - b.length)) || compare(a, b)))));
    return concat(stryMutAct_9fa48("26758") ? [] : (stryCov_9fa48("26758"), [head(5, entries.length), ...entries.flatMap(stryMutAct_9fa48("26759") ? () => undefined : (stryCov_9fa48("26759"), ([key, item]) => stryMutAct_9fa48("26760") ? [] : (stryCov_9fa48("26760"), [key, cbor(item)])))]));
  }
}
function compare(a: Uint8Array, b: Uint8Array): number {
  if (stryMutAct_9fa48("26761")) {
    {}
  } else {
    stryCov_9fa48("26761");
    for (let i = 0; stryMutAct_9fa48("26764") ? i >= Math.min(a.length, b.length) : stryMutAct_9fa48("26763") ? i <= Math.min(a.length, b.length) : stryMutAct_9fa48("26762") ? false : (stryCov_9fa48("26762", "26763", "26764"), i < (stryMutAct_9fa48("26765") ? Math.max(a.length, b.length) : (stryCov_9fa48("26765"), Math.min(a.length, b.length)))); stryMutAct_9fa48("26766") ? i-- : (stryCov_9fa48("26766"), i++)) {
      if (stryMutAct_9fa48("26767")) {
        {}
      } else {
        stryCov_9fa48("26767");
        const d = stryMutAct_9fa48("26768") ? (a[i] ?? 0) + (b[i] ?? 0) : (stryCov_9fa48("26768"), (stryMutAct_9fa48("26769") ? a[i] && 0 : (stryCov_9fa48("26769"), a[i] ?? 0)) - (stryMutAct_9fa48("26770") ? b[i] && 0 : (stryCov_9fa48("26770"), b[i] ?? 0)));
        if (stryMutAct_9fa48("26773") ? d === 0 : stryMutAct_9fa48("26772") ? false : stryMutAct_9fa48("26771") ? true : (stryCov_9fa48("26771", "26772", "26773"), d !== 0)) return d;
      }
    }
    return stryMutAct_9fa48("26774") ? a.length + b.length : (stryCov_9fa48("26774"), a.length - b.length);
  }
}
function fields(invitation: PeerInvitation, signature: boolean): Record<string, CborValue> {
  if (stryMutAct_9fa48("26775")) {
    {}
  } else {
    stryCov_9fa48("26775");
    const value: Record<string, CborValue> = stryMutAct_9fa48("26776") ? {} : (stryCov_9fa48("26776"), {
      v: invitation.version,
      sid: invitation.sessionId,
      svc: invitation.service,
      role: invitation.role,
      key: invitation.peerEphemeralKey,
      cand: invitation.candidates.map(stryMutAct_9fa48("26777") ? () => undefined : (stryCov_9fa48("26777"), x => stryMutAct_9fa48("26778") ? [] : (stryCov_9fa48("26778"), [x.kind, x.value]))),
      display: invitation.display,
      iat: invitation.issuedAt,
      exp: invitation.expiresAt,
      caps: invitation.capabilities
    });
    if (stryMutAct_9fa48("26781") ? invitation.identityProof === undefined : stryMutAct_9fa48("26780") ? false : stryMutAct_9fa48("26779") ? true : (stryCov_9fa48("26779", "26780", "26781"), invitation.identityProof !== undefined)) value.id = invitation.identityProof;
    if (stryMutAct_9fa48("26783") ? false : stryMutAct_9fa48("26782") ? true : (stryCov_9fa48("26782", "26783"), signature)) value.sig = invitation.signature;
    return value;
  }
}
export function peerInvitationSigningBytes(invitation: PeerInvitation): Uint8Array {
  if (stryMutAct_9fa48("26784")) {
    {}
  } else {
    stryCov_9fa48("26784");
    validatePeerInvitation(invitation);
    return cbor(fields(invitation, stryMutAct_9fa48("26785") ? true : (stryCov_9fa48("26785"), false)));
  }
}
export function encodePeerInvitation(invitation: PeerInvitation): Uint8Array {
  if (stryMutAct_9fa48("26786")) {
    {}
  } else {
    stryCov_9fa48("26786");
    validatePeerInvitation(invitation);
    const out = cbor(fields(invitation, stryMutAct_9fa48("26787") ? false : (stryCov_9fa48("26787"), true)));
    if (stryMutAct_9fa48("26791") ? out.length <= MAX_PEER_INVITATION_BYTES : stryMutAct_9fa48("26790") ? out.length >= MAX_PEER_INVITATION_BYTES : stryMutAct_9fa48("26789") ? false : stryMutAct_9fa48("26788") ? true : (stryCov_9fa48("26788", "26789", "26790", "26791"), out.length > MAX_PEER_INVITATION_BYTES)) throw new PeerInvitationError(stryMutAct_9fa48("26792") ? "" : (stryCov_9fa48("26792"), "OVERSIZED"), stryMutAct_9fa48("26793") ? "" : (stryCov_9fa48("26793"), "invitation exceeds size budget"));
    return out;
  }
}
class Reader {
  at = 0;
  constructor(readonly bytes: Uint8Array) {}
  take(n: number): Uint8Array {
    if (stryMutAct_9fa48("26794")) {
      {}
    } else {
      stryCov_9fa48("26794");
      if (stryMutAct_9fa48("26797") ? n < 0 && this.at + n > this.bytes.length : stryMutAct_9fa48("26796") ? false : stryMutAct_9fa48("26795") ? true : (stryCov_9fa48("26795", "26796", "26797"), (stryMutAct_9fa48("26800") ? n >= 0 : stryMutAct_9fa48("26799") ? n <= 0 : stryMutAct_9fa48("26798") ? false : (stryCov_9fa48("26798", "26799", "26800"), n < 0)) || (stryMutAct_9fa48("26803") ? this.at + n <= this.bytes.length : stryMutAct_9fa48("26802") ? this.at + n >= this.bytes.length : stryMutAct_9fa48("26801") ? false : (stryCov_9fa48("26801", "26802", "26803"), (stryMutAct_9fa48("26804") ? this.at - n : (stryCov_9fa48("26804"), this.at + n)) > this.bytes.length)))) throw new PeerInvitationError(stryMutAct_9fa48("26805") ? "" : (stryCov_9fa48("26805"), "MALFORMED"), stryMutAct_9fa48("26806") ? "" : (stryCov_9fa48("26806"), "truncated CBOR"));
      const out = this.bytes.subarray(this.at, stryMutAct_9fa48("26807") ? this.at - n : (stryCov_9fa48("26807"), this.at + n));
      stryMutAct_9fa48("26808") ? this.at -= n : (stryCov_9fa48("26808"), this.at += n);
      return out;
    }
  }
  length(add: number): number {
    if (stryMutAct_9fa48("26809")) {
      {}
    } else {
      stryCov_9fa48("26809");
      if (stryMutAct_9fa48("26813") ? add >= 24 : stryMutAct_9fa48("26812") ? add <= 24 : stryMutAct_9fa48("26811") ? false : stryMutAct_9fa48("26810") ? true : (stryCov_9fa48("26810", "26811", "26812", "26813"), add < 24)) return add;
      if (stryMutAct_9fa48("26816") ? add !== 24 : stryMutAct_9fa48("26815") ? false : stryMutAct_9fa48("26814") ? true : (stryCov_9fa48("26814", "26815", "26816"), add === 24)) return stryMutAct_9fa48("26817") ? this.take(1)[0] && 0 : (stryCov_9fa48("26817"), this.take(1)[0] ?? 0);
      if (stryMutAct_9fa48("26820") ? add !== 25 : stryMutAct_9fa48("26819") ? false : stryMutAct_9fa48("26818") ? true : (stryCov_9fa48("26818", "26819", "26820"), add === 25)) {
        if (stryMutAct_9fa48("26821")) {
          {}
        } else {
          stryCov_9fa48("26821");
          const x = this.take(2);
          return (stryMutAct_9fa48("26822") ? x[0] && 0 : (stryCov_9fa48("26822"), x[0] ?? 0)) << 8 | (stryMutAct_9fa48("26823") ? x[1] && 0 : (stryCov_9fa48("26823"), x[1] ?? 0));
        }
      }
      if (stryMutAct_9fa48("26826") ? add !== 26 : stryMutAct_9fa48("26825") ? false : stryMutAct_9fa48("26824") ? true : (stryCov_9fa48("26824", "26825", "26826"), add === 26)) return new DataView(this.take(4).buffer, stryMutAct_9fa48("26827") ? this.bytes.byteOffset + this.at + 4 : (stryCov_9fa48("26827"), (stryMutAct_9fa48("26828") ? this.bytes.byteOffset - this.at : (stryCov_9fa48("26828"), this.bytes.byteOffset + this.at)) - 4), 4).getUint32(0, stryMutAct_9fa48("26829") ? true : (stryCov_9fa48("26829"), false));
      if (stryMutAct_9fa48("26832") ? add !== 27 : stryMutAct_9fa48("26831") ? false : stryMutAct_9fa48("26830") ? true : (stryCov_9fa48("26830", "26831", "26832"), add === 27)) {
        if (stryMutAct_9fa48("26833")) {
          {}
        } else {
          stryCov_9fa48("26833");
          const x = new DataView(this.take(8).buffer, stryMutAct_9fa48("26834") ? this.bytes.byteOffset + this.at + 8 : (stryCov_9fa48("26834"), (stryMutAct_9fa48("26835") ? this.bytes.byteOffset - this.at : (stryCov_9fa48("26835"), this.bytes.byteOffset + this.at)) - 8), 8).getBigUint64(0, stryMutAct_9fa48("26836") ? true : (stryCov_9fa48("26836"), false));
          const n = Number(x);
          if (stryMutAct_9fa48("26839") ? false : stryMutAct_9fa48("26838") ? true : stryMutAct_9fa48("26837") ? Number.isSafeInteger(n) : (stryCov_9fa48("26837", "26838", "26839"), !Number.isSafeInteger(n))) throw new PeerInvitationError(stryMutAct_9fa48("26840") ? "" : (stryCov_9fa48("26840"), "MALFORMED"), stryMutAct_9fa48("26841") ? "" : (stryCov_9fa48("26841"), "integer too large"));
          return n;
        }
      }
      throw new PeerInvitationError(stryMutAct_9fa48("26842") ? "" : (stryCov_9fa48("26842"), "MALFORMED"), stryMutAct_9fa48("26843") ? "" : (stryCov_9fa48("26843"), "indefinite CBOR forbidden"));
    }
  }
  read(depth = 0): CborValue {
    if (stryMutAct_9fa48("26844")) {
      {}
    } else {
      stryCov_9fa48("26844");
      if (stryMutAct_9fa48("26848") ? depth <= 8 : stryMutAct_9fa48("26847") ? depth >= 8 : stryMutAct_9fa48("26846") ? false : stryMutAct_9fa48("26845") ? true : (stryCov_9fa48("26845", "26846", "26847", "26848"), depth > 8)) throw new PeerInvitationError(stryMutAct_9fa48("26849") ? "" : (stryCov_9fa48("26849"), "MALFORMED"), stryMutAct_9fa48("26850") ? "" : (stryCov_9fa48("26850"), "CBOR nesting limit"));
      const first = stryMutAct_9fa48("26851") ? this.take(1)[0] && 0 : (stryCov_9fa48("26851"), this.take(1)[0] ?? 0);
      const major = first >>> 5;
      const len = this.length(first & 31);
      if (stryMutAct_9fa48("26854") ? major !== 0 : stryMutAct_9fa48("26853") ? false : stryMutAct_9fa48("26852") ? true : (stryCov_9fa48("26852", "26853", "26854"), major === 0)) return len;
      if (stryMutAct_9fa48("26857") ? major !== 2 : stryMutAct_9fa48("26856") ? false : stryMutAct_9fa48("26855") ? true : (stryCov_9fa48("26855", "26856", "26857"), major === 2)) return this.take(len);
      if (stryMutAct_9fa48("26860") ? major !== 3 : stryMutAct_9fa48("26859") ? false : stryMutAct_9fa48("26858") ? true : (stryCov_9fa48("26858", "26859", "26860"), major === 3)) return utf8Decode(this.take(len));
      if (stryMutAct_9fa48("26863") ? major !== 4 : stryMutAct_9fa48("26862") ? false : stryMutAct_9fa48("26861") ? true : (stryCov_9fa48("26861", "26862", "26863"), major === 4)) return Array.from(stryMutAct_9fa48("26864") ? {} : (stryCov_9fa48("26864"), {
        length: len
      }), stryMutAct_9fa48("26865") ? () => undefined : (stryCov_9fa48("26865"), () => this.read(stryMutAct_9fa48("26866") ? depth - 1 : (stryCov_9fa48("26866"), depth + 1))));
      if (stryMutAct_9fa48("26869") ? major !== 5 : stryMutAct_9fa48("26868") ? false : stryMutAct_9fa48("26867") ? true : (stryCov_9fa48("26867", "26868", "26869"), major === 5)) {
        if (stryMutAct_9fa48("26870")) {
          {}
        } else {
          stryCov_9fa48("26870");
          const out: Record<string, CborValue> = {};
          for (let i = 0; stryMutAct_9fa48("26873") ? i >= len : stryMutAct_9fa48("26872") ? i <= len : stryMutAct_9fa48("26871") ? false : (stryCov_9fa48("26871", "26872", "26873"), i < len); stryMutAct_9fa48("26874") ? i-- : (stryCov_9fa48("26874"), i++)) {
            if (stryMutAct_9fa48("26875")) {
              {}
            } else {
              stryCov_9fa48("26875");
              const key = this.read(stryMutAct_9fa48("26876") ? depth - 1 : (stryCov_9fa48("26876"), depth + 1));
              if (stryMutAct_9fa48("26879") ? typeof key !== "string" && key in out : stryMutAct_9fa48("26878") ? false : stryMutAct_9fa48("26877") ? true : (stryCov_9fa48("26877", "26878", "26879"), (stryMutAct_9fa48("26881") ? typeof key === "string" : stryMutAct_9fa48("26880") ? false : (stryCov_9fa48("26880", "26881"), typeof key !== (stryMutAct_9fa48("26882") ? "" : (stryCov_9fa48("26882"), "string")))) || key in out)) throw new PeerInvitationError(stryMutAct_9fa48("26883") ? "" : (stryCov_9fa48("26883"), "MALFORMED"), stryMutAct_9fa48("26884") ? "" : (stryCov_9fa48("26884"), "invalid CBOR map"));
              out[key] = this.read(stryMutAct_9fa48("26885") ? depth - 1 : (stryCov_9fa48("26885"), depth + 1));
            }
          }
          return out;
        }
      }
      throw new PeerInvitationError(stryMutAct_9fa48("26886") ? "" : (stryCov_9fa48("26886"), "MALFORMED"), stryMutAct_9fa48("26887") ? "" : (stryCov_9fa48("26887"), "unsupported CBOR type"));
    }
  }
}
function map(value: CborValue): CborMap {
  if (stryMutAct_9fa48("26888")) {
    {}
  } else {
    stryCov_9fa48("26888");
    if (stryMutAct_9fa48("26891") ? (typeof value !== "object" || value === null || value instanceof Uint8Array) && Array.isArray(value) : stryMutAct_9fa48("26890") ? false : stryMutAct_9fa48("26889") ? true : (stryCov_9fa48("26889", "26890", "26891"), (stryMutAct_9fa48("26893") ? (typeof value !== "object" || value === null) && value instanceof Uint8Array : stryMutAct_9fa48("26892") ? false : (stryCov_9fa48("26892", "26893"), (stryMutAct_9fa48("26895") ? typeof value !== "object" && value === null : stryMutAct_9fa48("26894") ? false : (stryCov_9fa48("26894", "26895"), (stryMutAct_9fa48("26897") ? typeof value === "object" : stryMutAct_9fa48("26896") ? false : (stryCov_9fa48("26896", "26897"), typeof value !== (stryMutAct_9fa48("26898") ? "" : (stryCov_9fa48("26898"), "object")))) || (stryMutAct_9fa48("26900") ? value !== null : stryMutAct_9fa48("26899") ? false : (stryCov_9fa48("26899", "26900"), value === null)))) || value instanceof Uint8Array)) || Array.isArray(value))) throw new PeerInvitationError(stryMutAct_9fa48("26901") ? "" : (stryCov_9fa48("26901"), "MALFORMED"), stryMutAct_9fa48("26902") ? "" : (stryCov_9fa48("26902"), "expected map"));
    return value as CborMap;
  }
}
function array(value: CborValue | undefined): ReadonlyArray<CborValue> {
  if (stryMutAct_9fa48("26903")) {
    {}
  } else {
    stryCov_9fa48("26903");
    if (stryMutAct_9fa48("26906") ? false : stryMutAct_9fa48("26905") ? true : stryMutAct_9fa48("26904") ? Array.isArray(value) : (stryCov_9fa48("26904", "26905", "26906"), !Array.isArray(value))) throw new PeerInvitationError(stryMutAct_9fa48("26907") ? "" : (stryCov_9fa48("26907"), "MALFORMED"), stryMutAct_9fa48("26908") ? "" : (stryCov_9fa48("26908"), "expected array"));
    return value;
  }
}
export function decodePeerInvitation(bytes: Uint8Array, now?: number): PeerInvitation {
  if (stryMutAct_9fa48("26909")) {
    {}
  } else {
    stryCov_9fa48("26909");
    if (stryMutAct_9fa48("26913") ? bytes.length <= MAX_PEER_INVITATION_BYTES : stryMutAct_9fa48("26912") ? bytes.length >= MAX_PEER_INVITATION_BYTES : stryMutAct_9fa48("26911") ? false : stryMutAct_9fa48("26910") ? true : (stryCov_9fa48("26910", "26911", "26912", "26913"), bytes.length > MAX_PEER_INVITATION_BYTES)) throw new PeerInvitationError(stryMutAct_9fa48("26914") ? "" : (stryCov_9fa48("26914"), "OVERSIZED"), stryMutAct_9fa48("26915") ? "" : (stryCov_9fa48("26915"), "invitation exceeds size budget"));
    const reader = new Reader(bytes);
    const x = map(reader.read());
    if (stryMutAct_9fa48("26918") ? reader.at === bytes.length : stryMutAct_9fa48("26917") ? false : stryMutAct_9fa48("26916") ? true : (stryCov_9fa48("26916", "26917", "26918"), reader.at !== bytes.length)) throw new PeerInvitationError(stryMutAct_9fa48("26919") ? "" : (stryCov_9fa48("26919"), "MALFORMED"), stryMutAct_9fa48("26920") ? "" : (stryCov_9fa48("26920"), "trailing CBOR data"));
    const candidates = array(x.cand).map(entry => {
      if (stryMutAct_9fa48("26921")) {
        {}
      } else {
        stryCov_9fa48("26921");
        const pair = array(entry);
        return stryMutAct_9fa48("26922") ? {} : (stryCov_9fa48("26922"), {
          kind: pair[0] as PeerCandidateKind,
          value: pair[1] as Uint8Array
        });
      }
    });
    const invitation: PeerInvitation = stryMutAct_9fa48("26923") ? {} : (stryCov_9fa48("26923"), {
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
      ...((stryMutAct_9fa48("26926") ? x.id !== undefined : stryMutAct_9fa48("26925") ? false : stryMutAct_9fa48("26924") ? true : (stryCov_9fa48("26924", "26925", "26926"), x.id === undefined)) ? {} : stryMutAct_9fa48("26927") ? {} : (stryCov_9fa48("26927"), {
        identityProof: x.id as Uint8Array
      }))
    });
    validatePeerInvitation(invitation, now);
    if (stryMutAct_9fa48("26930") ? compare(encodePeerInvitation(invitation), bytes) === 0 : stryMutAct_9fa48("26929") ? false : stryMutAct_9fa48("26928") ? true : (stryCov_9fa48("26928", "26929", "26930"), compare(encodePeerInvitation(invitation), bytes) !== 0)) throw new PeerInvitationError(stryMutAct_9fa48("26931") ? "" : (stryCov_9fa48("26931"), "MALFORMED"), stryMutAct_9fa48("26932") ? "" : (stryCov_9fa48("26932"), "invitation is not canonical CBOR"));
    return invitation;
  }
}
const ALPHABET = stryMutAct_9fa48("26933") ? "" : (stryCov_9fa48("26933"), "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
export function encodePeerInvitationText(bytes: Uint8Array): string {
  if (stryMutAct_9fa48("26934")) {
    {}
  } else {
    stryCov_9fa48("26934");
    if (stryMutAct_9fa48("26938") ? bytes.length <= MAX_PEER_INVITATION_BYTES : stryMutAct_9fa48("26937") ? bytes.length >= MAX_PEER_INVITATION_BYTES : stryMutAct_9fa48("26936") ? false : stryMutAct_9fa48("26935") ? true : (stryCov_9fa48("26935", "26936", "26937", "26938"), bytes.length > MAX_PEER_INVITATION_BYTES)) throw new PeerInvitationError(stryMutAct_9fa48("26939") ? "" : (stryCov_9fa48("26939"), "OVERSIZED"), stryMutAct_9fa48("26940") ? "" : (stryCov_9fa48("26940"), "invitation exceeds size budget"));
    const checked = concat(stryMutAct_9fa48("26941") ? [] : (stryCov_9fa48("26941"), [bytes, sha256(bytes).subarray(0, 4)]));
    let bits = 0,
      value = 0,
      out = stryMutAct_9fa48("26942") ? "Stryker was here!" : (stryCov_9fa48("26942"), "");
    for (const byte of checked) {
      if (stryMutAct_9fa48("26943")) {
        {}
      } else {
        stryCov_9fa48("26943");
        value = value << 8 | byte;
        stryMutAct_9fa48("26944") ? bits -= 8 : (stryCov_9fa48("26944"), bits += 8);
        while (stryMutAct_9fa48("26947") ? bits < 5 : stryMutAct_9fa48("26946") ? bits > 5 : stryMutAct_9fa48("26945") ? false : (stryCov_9fa48("26945", "26946", "26947"), bits >= 5)) {
          if (stryMutAct_9fa48("26948")) {
            {}
          } else {
            stryCov_9fa48("26948");
            stryMutAct_9fa48("26949") ? out -= ALPHABET[value >>> (bits -= 5) & 31] : (stryCov_9fa48("26949"), out += ALPHABET[value >>> (stryMutAct_9fa48("26950") ? bits += 5 : (stryCov_9fa48("26950"), bits -= 5)) & 31]);
          }
        }
      }
    }
    if (stryMutAct_9fa48("26954") ? bits <= 0 : stryMutAct_9fa48("26953") ? bits >= 0 : stryMutAct_9fa48("26952") ? false : stryMutAct_9fa48("26951") ? true : (stryCov_9fa48("26951", "26952", "26953", "26954"), bits > 0)) stryMutAct_9fa48("26955") ? out -= ALPHABET[value << 5 - bits & 31] : (stryCov_9fa48("26955"), out += ALPHABET[value << (stryMutAct_9fa48("26956") ? 5 + bits : (stryCov_9fa48("26956"), 5 - bits)) & 31]);
    return stryMutAct_9fa48("26957") ? out.match(/.{1,5}/g)?.join("-") && "" : (stryCov_9fa48("26957"), (stryMutAct_9fa48("26958") ? out.match(/.{1,5}/g).join("-") : (stryCov_9fa48("26958"), out.match(stryMutAct_9fa48("26959") ? /./g : (stryCov_9fa48("26959"), /.{1,5}/g))?.join(stryMutAct_9fa48("26960") ? "" : (stryCov_9fa48("26960"), "-")))) ?? (stryMutAct_9fa48("26961") ? "Stryker was here!" : (stryCov_9fa48("26961"), "")));
  }
}
export function decodePeerInvitationText(text: string): Uint8Array {
  if (stryMutAct_9fa48("26962")) {
    {}
  } else {
    stryCov_9fa48("26962");
    const clean = stryMutAct_9fa48("26963") ? text.toLowerCase().replace(/[\s-]/g, "") : (stryCov_9fa48("26963"), text.toUpperCase().replace(stryMutAct_9fa48("26965") ? /[\S-]/g : stryMutAct_9fa48("26964") ? /[^\s-]/g : (stryCov_9fa48("26964", "26965"), /[\s-]/g), stryMutAct_9fa48("26966") ? "Stryker was here!" : (stryCov_9fa48("26966"), "")));
    if (stryMutAct_9fa48("26969") ? !/^[A-Z2-7]+$/.test(clean) && clean.length > 40_000 : stryMutAct_9fa48("26968") ? false : stryMutAct_9fa48("26967") ? true : (stryCov_9fa48("26967", "26968", "26969"), (stryMutAct_9fa48("26970") ? /^[A-Z2-7]+$/.test(clean) : (stryCov_9fa48("26970"), !(stryMutAct_9fa48("26974") ? /^[^A-Z2-7]+$/ : stryMutAct_9fa48("26973") ? /^[A-Z2-7]$/ : stryMutAct_9fa48("26972") ? /^[A-Z2-7]+/ : stryMutAct_9fa48("26971") ? /[A-Z2-7]+$/ : (stryCov_9fa48("26971", "26972", "26973", "26974"), /^[A-Z2-7]+$/)).test(clean))) || (stryMutAct_9fa48("26977") ? clean.length <= 40_000 : stryMutAct_9fa48("26976") ? clean.length >= 40_000 : stryMutAct_9fa48("26975") ? false : (stryCov_9fa48("26975", "26976", "26977"), clean.length > 40_000)))) throw new PeerInvitationError(stryMutAct_9fa48("26978") ? "" : (stryCov_9fa48("26978"), "MALFORMED"), stryMutAct_9fa48("26979") ? "" : (stryCov_9fa48("26979"), "invalid Base32 invitation"));
    let bits = 0,
      value = 0;
    const out: number[] = stryMutAct_9fa48("26980") ? ["Stryker was here"] : (stryCov_9fa48("26980"), []);
    for (const char of clean) {
      if (stryMutAct_9fa48("26981")) {
        {}
      } else {
        stryCov_9fa48("26981");
        value = value << 5 | ALPHABET.indexOf(char);
        stryMutAct_9fa48("26982") ? bits -= 5 : (stryCov_9fa48("26982"), bits += 5);
        if (stryMutAct_9fa48("26986") ? bits < 8 : stryMutAct_9fa48("26985") ? bits > 8 : stryMutAct_9fa48("26984") ? false : stryMutAct_9fa48("26983") ? true : (stryCov_9fa48("26983", "26984", "26985", "26986"), bits >= 8)) out.push(value >>> (stryMutAct_9fa48("26987") ? bits += 8 : (stryCov_9fa48("26987"), bits -= 8)) & 255);
      }
    }
    if (stryMutAct_9fa48("26991") ? out.length >= 5 : stryMutAct_9fa48("26990") ? out.length <= 5 : stryMutAct_9fa48("26989") ? false : stryMutAct_9fa48("26988") ? true : (stryCov_9fa48("26988", "26989", "26990", "26991"), out.length < 5)) throw new PeerInvitationError(stryMutAct_9fa48("26992") ? "" : (stryCov_9fa48("26992"), "MALFORMED"), stryMutAct_9fa48("26993") ? "" : (stryCov_9fa48("26993"), "invitation text is too short"));
    const all = new Uint8Array(out);
    const body = all.subarray(0, stryMutAct_9fa48("26994") ? +4 : (stryCov_9fa48("26994"), -4));
    if (stryMutAct_9fa48("26997") ? compare(all.subarray(-4), sha256(body).subarray(0, 4)) === 0 : stryMutAct_9fa48("26996") ? false : stryMutAct_9fa48("26995") ? true : (stryCov_9fa48("26995", "26996", "26997"), compare(all.subarray(stryMutAct_9fa48("26998") ? +4 : (stryCov_9fa48("26998"), -4)), sha256(body).subarray(0, 4)) !== 0)) throw new PeerInvitationError(stryMutAct_9fa48("26999") ? "" : (stryCov_9fa48("26999"), "MALFORMED"), stryMutAct_9fa48("27000") ? "" : (stryCov_9fa48("27000"), "invitation checksum mismatch"));
    return body;
  }
}