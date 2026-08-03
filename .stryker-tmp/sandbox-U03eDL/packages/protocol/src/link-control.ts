/**
 * Sans-IO `TPL1` link-control envelope.
 *
 * The peer-media readiness exchange (G3) and the active link probe (G2) both
 * ride the same authenticated peer route, so both hosts and the app-facing
 * Link Observatory must agree on one bounded wire form. Bytes in, bytes out —
 * no clocks, no sockets, no transport.
 */
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
import { normalizeMediaReadiness, type PeerMediaReadiness } from "./media-readiness.js";
import { utf8Decode, utf8Encode } from "./utf8.js";

/** 1 = readiness, 2 = probe request, 3 = probe reply, 4 = session invite. */
export type LinkControlType = 1 | 2 | 3 | 4;
export interface LinkControlEnvelope {
  readonly type: LinkControlType;
  readonly id: string;
  readonly payload: Uint8Array;
}
export const LINK_CONTROL_MAGIC: ReadonlyArray<number> = stryMutAct_9fa48("11989") ? [] : (stryCov_9fa48("11989"), [0x54, 0x50, 0x4c, 0x31]);
export const LINK_CONTROL_HEADER_BYTES = 8;
export const LINK_CONTROL_MAX_ID_BYTES = 64;
export const LINK_CONTROL_MAX_PAYLOAD_BYTES = 8192;

/** Both peers send this id first; the answer carries `READINESS_RESPONSE_ID`. */
export const READINESS_REQUEST_ID = stryMutAct_9fa48("11990") ? "" : (stryCov_9fa48("11990"), "readiness");
export const READINESS_RESPONSE_ID = stryMutAct_9fa48("11991") ? "" : (stryCov_9fa48("11991"), "readiness-response");
const BUCKETS: ReadonlyArray<string> = stryMutAct_9fa48("11992") ? [] : (stryCov_9fa48("11992"), [stryMutAct_9fa48("11993") ? "" : (stryCov_9fa48("11993"), "none"), stryMutAct_9fa48("11994") ? "" : (stryCov_9fa48("11994"), "derived"), stryMutAct_9fa48("11995") ? "" : (stryCov_9fa48("11995"), "narrowband"), stryMutAct_9fa48("11996") ? "" : (stryCov_9fa48("11996"), "audio"), stryMutAct_9fa48("11997") ? "" : (stryCov_9fa48("11997"), "sd-video"), stryMutAct_9fa48("11998") ? "" : (stryCov_9fa48("11998"), "hd-video")]);
const POSTURES: ReadonlyArray<string> = stryMutAct_9fa48("11999") ? [] : (stryCov_9fa48("11999"), [stryMutAct_9fa48("12000") ? "" : (stryCov_9fa48("12000"), "open"), stryMutAct_9fa48("12001") ? "" : (stryCov_9fa48("12001"), "ask"), stryMutAct_9fa48("12002") ? "" : (stryCov_9fa48("12002"), "closed")]);
const CONSTRAINTS: ReadonlyArray<string> = stryMutAct_9fa48("12003") ? [] : (stryCov_9fa48("12003"), [stryMutAct_9fa48("12004") ? "" : (stryCov_9fa48("12004"), "metered"), stryMutAct_9fa48("12005") ? "" : (stryCov_9fa48("12005"), "low-battery"), stryMutAct_9fa48("12006") ? "" : (stryCov_9fa48("12006"), "thermal"), stryMutAct_9fa48("12007") ? "" : (stryCov_9fa48("12007"), "foreground-only")]);
const CLASS_IDS: ReadonlyArray<string> = stryMutAct_9fa48("12008") ? [] : (stryCov_9fa48("12008"), [stryMutAct_9fa48("12009") ? "" : (stryCov_9fa48("12009"), "camera"), stryMutAct_9fa48("12010") ? "" : (stryCov_9fa48("12010"), "microphone"), stryMutAct_9fa48("12011") ? "" : (stryCov_9fa48("12011"), "screen-capture")]);
export function encodeLinkControl(envelope: LinkControlEnvelope): Uint8Array {
  if (stryMutAct_9fa48("12012")) {
    {}
  } else {
    stryCov_9fa48("12012");
    const id = utf8Encode(envelope.id);
    if (stryMutAct_9fa48("12015") ? id.length < 1 && id.length > LINK_CONTROL_MAX_ID_BYTES : stryMutAct_9fa48("12014") ? false : stryMutAct_9fa48("12013") ? true : (stryCov_9fa48("12013", "12014", "12015"), (stryMutAct_9fa48("12018") ? id.length >= 1 : stryMutAct_9fa48("12017") ? id.length <= 1 : stryMutAct_9fa48("12016") ? false : (stryCov_9fa48("12016", "12017", "12018"), id.length < 1)) || (stryMutAct_9fa48("12021") ? id.length <= LINK_CONTROL_MAX_ID_BYTES : stryMutAct_9fa48("12020") ? id.length >= LINK_CONTROL_MAX_ID_BYTES : stryMutAct_9fa48("12019") ? false : (stryCov_9fa48("12019", "12020", "12021"), id.length > LINK_CONTROL_MAX_ID_BYTES)))) {
      if (stryMutAct_9fa48("12022")) {
        {}
      } else {
        stryCov_9fa48("12022");
        throw new Error(stryMutAct_9fa48("12023") ? "" : (stryCov_9fa48("12023"), "Link control envelope id exceeds bounds."));
      }
    }
    if (stryMutAct_9fa48("12027") ? envelope.payload.length <= LINK_CONTROL_MAX_PAYLOAD_BYTES : stryMutAct_9fa48("12026") ? envelope.payload.length >= LINK_CONTROL_MAX_PAYLOAD_BYTES : stryMutAct_9fa48("12025") ? false : stryMutAct_9fa48("12024") ? true : (stryCov_9fa48("12024", "12025", "12026", "12027"), envelope.payload.length > LINK_CONTROL_MAX_PAYLOAD_BYTES)) {
      if (stryMutAct_9fa48("12028")) {
        {}
      } else {
        stryCov_9fa48("12028");
        throw new Error(stryMutAct_9fa48("12029") ? "" : (stryCov_9fa48("12029"), "Link control envelope exceeds bounds."));
      }
    }
    const out = new Uint8Array(stryMutAct_9fa48("12030") ? LINK_CONTROL_HEADER_BYTES + id.length - envelope.payload.length : (stryCov_9fa48("12030"), (stryMutAct_9fa48("12031") ? LINK_CONTROL_HEADER_BYTES - id.length : (stryCov_9fa48("12031"), LINK_CONTROL_HEADER_BYTES + id.length)) + envelope.payload.length));
    out.set(LINK_CONTROL_MAGIC);
    out[4] = envelope.type;
    out[5] = id.length;
    new DataView(out.buffer).setUint16(6, envelope.payload.length, stryMutAct_9fa48("12032") ? true : (stryCov_9fa48("12032"), false));
    out.set(id, LINK_CONTROL_HEADER_BYTES);
    out.set(envelope.payload, stryMutAct_9fa48("12033") ? LINK_CONTROL_HEADER_BYTES - id.length : (stryCov_9fa48("12033"), LINK_CONTROL_HEADER_BYTES + id.length));
    return out;
  }
}

/** Returns null for anything that is not a well-formed, in-bounds envelope. */
export function decodeLinkControl(bytes: Uint8Array): LinkControlEnvelope | null {
  if (stryMutAct_9fa48("12034")) {
    {}
  } else {
    stryCov_9fa48("12034");
    if (stryMutAct_9fa48("12038") ? bytes.length >= LINK_CONTROL_HEADER_BYTES : stryMutAct_9fa48("12037") ? bytes.length <= LINK_CONTROL_HEADER_BYTES : stryMutAct_9fa48("12036") ? false : stryMutAct_9fa48("12035") ? true : (stryCov_9fa48("12035", "12036", "12037", "12038"), bytes.length < LINK_CONTROL_HEADER_BYTES)) return null;
    if (stryMutAct_9fa48("12041") ? false : stryMutAct_9fa48("12040") ? true : stryMutAct_9fa48("12039") ? LINK_CONTROL_MAGIC.every((value, index) => bytes[index] === value) : (stryCov_9fa48("12039", "12040", "12041"), !(stryMutAct_9fa48("12042") ? LINK_CONTROL_MAGIC.some((value, index) => bytes[index] === value) : (stryCov_9fa48("12042"), LINK_CONTROL_MAGIC.every(stryMutAct_9fa48("12043") ? () => undefined : (stryCov_9fa48("12043"), (value, index) => stryMutAct_9fa48("12046") ? bytes[index] !== value : stryMutAct_9fa48("12045") ? false : stryMutAct_9fa48("12044") ? true : (stryCov_9fa48("12044", "12045", "12046"), bytes[index] === value))))))) return null;
    const type = bytes[4];
    const idLength = stryMutAct_9fa48("12047") ? bytes[5] && 0 : (stryCov_9fa48("12047"), bytes[5] ?? 0);
    const payloadLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(6, stryMutAct_9fa48("12048") ? true : (stryCov_9fa48("12048"), false));
    if (stryMutAct_9fa48("12051") ? type !== 1 && type !== 2 && type !== 3 || type !== 4 : stryMutAct_9fa48("12050") ? false : stryMutAct_9fa48("12049") ? true : (stryCov_9fa48("12049", "12050", "12051"), (stryMutAct_9fa48("12053") ? type !== 1 && type !== 2 || type !== 3 : stryMutAct_9fa48("12052") ? true : (stryCov_9fa48("12052", "12053"), (stryMutAct_9fa48("12055") ? type !== 1 || type !== 2 : stryMutAct_9fa48("12054") ? true : (stryCov_9fa48("12054", "12055"), (stryMutAct_9fa48("12057") ? type === 1 : stryMutAct_9fa48("12056") ? true : (stryCov_9fa48("12056", "12057"), type !== 1)) && (stryMutAct_9fa48("12059") ? type === 2 : stryMutAct_9fa48("12058") ? true : (stryCov_9fa48("12058", "12059"), type !== 2)))) && (stryMutAct_9fa48("12061") ? type === 3 : stryMutAct_9fa48("12060") ? true : (stryCov_9fa48("12060", "12061"), type !== 3)))) && (stryMutAct_9fa48("12063") ? type === 4 : stryMutAct_9fa48("12062") ? true : (stryCov_9fa48("12062", "12063"), type !== 4)))) return null;
    if (stryMutAct_9fa48("12066") ? idLength < 1 && idLength > LINK_CONTROL_MAX_ID_BYTES : stryMutAct_9fa48("12065") ? false : stryMutAct_9fa48("12064") ? true : (stryCov_9fa48("12064", "12065", "12066"), (stryMutAct_9fa48("12069") ? idLength >= 1 : stryMutAct_9fa48("12068") ? idLength <= 1 : stryMutAct_9fa48("12067") ? false : (stryCov_9fa48("12067", "12068", "12069"), idLength < 1)) || (stryMutAct_9fa48("12072") ? idLength <= LINK_CONTROL_MAX_ID_BYTES : stryMutAct_9fa48("12071") ? idLength >= LINK_CONTROL_MAX_ID_BYTES : stryMutAct_9fa48("12070") ? false : (stryCov_9fa48("12070", "12071", "12072"), idLength > LINK_CONTROL_MAX_ID_BYTES)))) return null;
    if (stryMutAct_9fa48("12076") ? payloadLength <= LINK_CONTROL_MAX_PAYLOAD_BYTES : stryMutAct_9fa48("12075") ? payloadLength >= LINK_CONTROL_MAX_PAYLOAD_BYTES : stryMutAct_9fa48("12074") ? false : stryMutAct_9fa48("12073") ? true : (stryCov_9fa48("12073", "12074", "12075", "12076"), payloadLength > LINK_CONTROL_MAX_PAYLOAD_BYTES)) return null;
    if (stryMutAct_9fa48("12079") ? bytes.length === LINK_CONTROL_HEADER_BYTES + idLength + payloadLength : stryMutAct_9fa48("12078") ? false : stryMutAct_9fa48("12077") ? true : (stryCov_9fa48("12077", "12078", "12079"), bytes.length !== (stryMutAct_9fa48("12080") ? LINK_CONTROL_HEADER_BYTES + idLength - payloadLength : (stryCov_9fa48("12080"), (stryMutAct_9fa48("12081") ? LINK_CONTROL_HEADER_BYTES - idLength : (stryCov_9fa48("12081"), LINK_CONTROL_HEADER_BYTES + idLength)) + payloadLength)))) return null;
    return stryMutAct_9fa48("12082") ? {} : (stryCov_9fa48("12082"), {
      type,
      id: utf8Decode(bytes.subarray(LINK_CONTROL_HEADER_BYTES, stryMutAct_9fa48("12083") ? LINK_CONTROL_HEADER_BYTES - idLength : (stryCov_9fa48("12083"), LINK_CONTROL_HEADER_BYTES + idLength))),
      payload: stryMutAct_9fa48("12084") ? bytes : (stryCov_9fa48("12084"), bytes.slice(stryMutAct_9fa48("12085") ? LINK_CONTROL_HEADER_BYTES - idLength : (stryCov_9fa48("12085"), LINK_CONTROL_HEADER_BYTES + idLength)))
    });
  }
}
export function encodeReadinessEnvelope(id: typeof READINESS_REQUEST_ID | typeof READINESS_RESPONSE_ID, readiness: PeerMediaReadiness): Uint8Array {
  if (stryMutAct_9fa48("12086")) {
    {}
  } else {
    stryCov_9fa48("12086");
    return encodeLinkControl(stryMutAct_9fa48("12087") ? {} : (stryCov_9fa48("12087"), {
      type: 1,
      id,
      payload: utf8Encode(JSON.stringify(normalizeMediaReadiness(readiness)))
    }));
  }
}

/**
 * Parses a readiness payload from an untrusted peer. A malformed body and a
 * refusal are both `null`, so a peer that declines to answer is not
 * distinguishable from one that cannot.
 */
export function parseMediaReadiness(payload: Uint8Array): PeerMediaReadiness | null {
  if (stryMutAct_9fa48("12088")) {
    {}
  } else {
    stryCov_9fa48("12088");
    if (stryMutAct_9fa48("12092") ? payload.length <= LINK_CONTROL_MAX_PAYLOAD_BYTES : stryMutAct_9fa48("12091") ? payload.length >= LINK_CONTROL_MAX_PAYLOAD_BYTES : stryMutAct_9fa48("12090") ? false : stryMutAct_9fa48("12089") ? true : (stryCov_9fa48("12089", "12090", "12091", "12092"), payload.length > LINK_CONTROL_MAX_PAYLOAD_BYTES)) return null;
    let value: unknown;
    try {
      if (stryMutAct_9fa48("12093")) {
        {}
      } else {
        stryCov_9fa48("12093");
        value = JSON.parse(utf8Decode(payload));
      }
    } catch {
      if (stryMutAct_9fa48("12094")) {
        {}
      } else {
        stryCov_9fa48("12094");
        return null;
      }
    }
    return isMediaReadiness(value) ? normalizeMediaReadiness(value) : null;
  }
}

/** Ids are echoed into host chrome, so keep them to a printable, bounded set. */
const SESSION_INVITE_ID_PATTERN = stryMutAct_9fa48("12098") ? /^[^A-Za-z0-9_-]{1,64}$/ : stryMutAct_9fa48("12097") ? /^[A-Za-z0-9_-]$/ : stryMutAct_9fa48("12096") ? /^[A-Za-z0-9_-]{1,64}/ : stryMutAct_9fa48("12095") ? /[A-Za-z0-9_-]{1,64}$/ : (stryCov_9fa48("12095", "12096", "12097", "12098"), /^[A-Za-z0-9_-]{1,64}$/);
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
  if (stryMutAct_9fa48("12099")) {
    {}
  } else {
    stryCov_9fa48("12099");
    if (stryMutAct_9fa48("12102") ? false : stryMutAct_9fa48("12101") ? true : stryMutAct_9fa48("12100") ? SESSION_INVITE_ID_PATTERN.test(invite.id) : (stryCov_9fa48("12100", "12101", "12102"), !SESSION_INVITE_ID_PATTERN.test(invite.id))) throw new Error(stryMutAct_9fa48("12103") ? "" : (stryCov_9fa48("12103"), "Session invite id is invalid."));
    if (stryMutAct_9fa48("12106") ? false : stryMutAct_9fa48("12105") ? true : stryMutAct_9fa48("12104") ? SESSION_INVITE_ID_PATTERN.test(invite.appId) : (stryCov_9fa48("12104", "12105", "12106"), !SESSION_INVITE_ID_PATTERN.test(invite.appId))) throw new Error(stryMutAct_9fa48("12107") ? "" : (stryCov_9fa48("12107"), "Session invite app id is invalid."));
    const payload = utf8Encode(JSON.stringify(stryMutAct_9fa48("12108") ? {} : (stryCov_9fa48("12108"), {
      appId: invite.appId,
      requestedClasses: stryMutAct_9fa48("12109") ? [] : (stryCov_9fa48("12109"), [...invite.requestedClasses]),
      expiresAt: Math.floor(invite.expiresAt)
    })));
    if (stryMutAct_9fa48("12113") ? payload.length <= SESSION_INVITE_MAX_BODY_BYTES : stryMutAct_9fa48("12112") ? payload.length >= SESSION_INVITE_MAX_BODY_BYTES : stryMutAct_9fa48("12111") ? false : stryMutAct_9fa48("12110") ? true : (stryCov_9fa48("12110", "12111", "12112", "12113"), payload.length > SESSION_INVITE_MAX_BODY_BYTES)) throw new Error(stryMutAct_9fa48("12114") ? "" : (stryCov_9fa48("12114"), "Session invite exceeds bounds."));
    return encodeLinkControl(stryMutAct_9fa48("12115") ? {} : (stryCov_9fa48("12115"), {
      type: 4,
      id: invite.id,
      payload
    }));
  }
}

/**
 * Parses an invite from an untrusted peer. Anything malformed, oversized, or
 * out of the closed class set is `null` — a host never guesses at a partially
 * understood request for a camera.
 */
export function parseSessionInvite(envelope: LinkControlEnvelope): SessionInviteRequest | null {
  if (stryMutAct_9fa48("12116")) {
    {}
  } else {
    stryCov_9fa48("12116");
    if (stryMutAct_9fa48("12119") ? envelope.type === 4 : stryMutAct_9fa48("12118") ? false : stryMutAct_9fa48("12117") ? true : (stryCov_9fa48("12117", "12118", "12119"), envelope.type !== 4)) return null;
    if (stryMutAct_9fa48("12122") ? false : stryMutAct_9fa48("12121") ? true : stryMutAct_9fa48("12120") ? SESSION_INVITE_ID_PATTERN.test(envelope.id) : (stryCov_9fa48("12120", "12121", "12122"), !SESSION_INVITE_ID_PATTERN.test(envelope.id))) return null;
    if (stryMutAct_9fa48("12126") ? envelope.payload.length <= SESSION_INVITE_MAX_BODY_BYTES : stryMutAct_9fa48("12125") ? envelope.payload.length >= SESSION_INVITE_MAX_BODY_BYTES : stryMutAct_9fa48("12124") ? false : stryMutAct_9fa48("12123") ? true : (stryCov_9fa48("12123", "12124", "12125", "12126"), envelope.payload.length > SESSION_INVITE_MAX_BODY_BYTES)) return null;
    let value: unknown;
    try {
      if (stryMutAct_9fa48("12127")) {
        {}
      } else {
        stryCov_9fa48("12127");
        value = JSON.parse(utf8Decode(envelope.payload));
      }
    } catch {
      if (stryMutAct_9fa48("12128")) {
        {}
      } else {
        stryCov_9fa48("12128");
        return null;
      }
    }
    if (stryMutAct_9fa48("12131") ? typeof value !== "object" && value === null : stryMutAct_9fa48("12130") ? false : stryMutAct_9fa48("12129") ? true : (stryCov_9fa48("12129", "12130", "12131"), (stryMutAct_9fa48("12133") ? typeof value === "object" : stryMutAct_9fa48("12132") ? false : (stryCov_9fa48("12132", "12133"), typeof value !== (stryMutAct_9fa48("12134") ? "" : (stryCov_9fa48("12134"), "object")))) || (stryMutAct_9fa48("12136") ? value !== null : stryMutAct_9fa48("12135") ? false : (stryCov_9fa48("12135", "12136"), value === null)))) return null;
    const candidate = value as {
      appId?: unknown;
      requestedClasses?: unknown;
      expiresAt?: unknown;
    };
    if (stryMutAct_9fa48("12139") ? typeof candidate.appId !== "string" && !SESSION_INVITE_ID_PATTERN.test(candidate.appId) : stryMutAct_9fa48("12138") ? false : stryMutAct_9fa48("12137") ? true : (stryCov_9fa48("12137", "12138", "12139"), (stryMutAct_9fa48("12141") ? typeof candidate.appId === "string" : stryMutAct_9fa48("12140") ? false : (stryCov_9fa48("12140", "12141"), typeof candidate.appId !== (stryMutAct_9fa48("12142") ? "" : (stryCov_9fa48("12142"), "string")))) || (stryMutAct_9fa48("12143") ? SESSION_INVITE_ID_PATTERN.test(candidate.appId) : (stryCov_9fa48("12143"), !SESSION_INVITE_ID_PATTERN.test(candidate.appId))))) return null;
    if (stryMutAct_9fa48("12146") ? typeof candidate.expiresAt !== "number" && !Number.isFinite(candidate.expiresAt) : stryMutAct_9fa48("12145") ? false : stryMutAct_9fa48("12144") ? true : (stryCov_9fa48("12144", "12145", "12146"), (stryMutAct_9fa48("12148") ? typeof candidate.expiresAt === "number" : stryMutAct_9fa48("12147") ? false : (stryCov_9fa48("12147", "12148"), typeof candidate.expiresAt !== (stryMutAct_9fa48("12149") ? "" : (stryCov_9fa48("12149"), "number")))) || (stryMutAct_9fa48("12150") ? Number.isFinite(candidate.expiresAt) : (stryCov_9fa48("12150"), !Number.isFinite(candidate.expiresAt))))) return null;
    if (stryMutAct_9fa48("12153") ? false : stryMutAct_9fa48("12152") ? true : stryMutAct_9fa48("12151") ? Array.isArray(candidate.requestedClasses) : (stryCov_9fa48("12151", "12152", "12153"), !Array.isArray(candidate.requestedClasses))) return null;
    const requestedClasses = candidate.requestedClasses;
    if (stryMutAct_9fa48("12156") ? requestedClasses.length < 1 && requestedClasses.length > CLASS_IDS.length : stryMutAct_9fa48("12155") ? false : stryMutAct_9fa48("12154") ? true : (stryCov_9fa48("12154", "12155", "12156"), (stryMutAct_9fa48("12159") ? requestedClasses.length >= 1 : stryMutAct_9fa48("12158") ? requestedClasses.length <= 1 : stryMutAct_9fa48("12157") ? false : (stryCov_9fa48("12157", "12158", "12159"), requestedClasses.length < 1)) || (stryMutAct_9fa48("12162") ? requestedClasses.length <= CLASS_IDS.length : stryMutAct_9fa48("12161") ? requestedClasses.length >= CLASS_IDS.length : stryMutAct_9fa48("12160") ? false : (stryCov_9fa48("12160", "12161", "12162"), requestedClasses.length > CLASS_IDS.length)))) return null;
    if (stryMutAct_9fa48("12165") ? false : stryMutAct_9fa48("12164") ? true : stryMutAct_9fa48("12163") ? requestedClasses.every(entry => typeof entry === "string" && CLASS_IDS.includes(entry)) : (stryCov_9fa48("12163", "12164", "12165"), !(stryMutAct_9fa48("12166") ? requestedClasses.some(entry => typeof entry === "string" && CLASS_IDS.includes(entry)) : (stryCov_9fa48("12166"), requestedClasses.every(stryMutAct_9fa48("12167") ? () => undefined : (stryCov_9fa48("12167"), entry => stryMutAct_9fa48("12170") ? typeof entry === "string" || CLASS_IDS.includes(entry) : stryMutAct_9fa48("12169") ? false : stryMutAct_9fa48("12168") ? true : (stryCov_9fa48("12168", "12169", "12170"), (stryMutAct_9fa48("12172") ? typeof entry !== "string" : stryMutAct_9fa48("12171") ? true : (stryCov_9fa48("12171", "12172"), typeof entry === (stryMutAct_9fa48("12173") ? "" : (stryCov_9fa48("12173"), "string")))) && CLASS_IDS.includes(entry)))))))) return null;
    if (stryMutAct_9fa48("12176") ? new Set(requestedClasses).size === requestedClasses.length : stryMutAct_9fa48("12175") ? false : stryMutAct_9fa48("12174") ? true : (stryCov_9fa48("12174", "12175", "12176"), new Set(requestedClasses).size !== requestedClasses.length)) return null;
    return stryMutAct_9fa48("12177") ? {} : (stryCov_9fa48("12177"), {
      id: envelope.id,
      appId: candidate.appId,
      requestedClasses: requestedClasses as ReadonlyArray<"camera" | "microphone" | "screen-capture">,
      expiresAt: Math.floor(candidate.expiresAt)
    });
  }
}
export function isMediaReadiness(value: unknown): value is PeerMediaReadiness {
  if (stryMutAct_9fa48("12178")) {
    {}
  } else {
    stryCov_9fa48("12178");
    if (stryMutAct_9fa48("12181") ? typeof value !== "object" && value === null : stryMutAct_9fa48("12180") ? false : stryMutAct_9fa48("12179") ? true : (stryCov_9fa48("12179", "12180", "12181"), (stryMutAct_9fa48("12183") ? typeof value === "object" : stryMutAct_9fa48("12182") ? false : (stryCov_9fa48("12182", "12183"), typeof value !== (stryMutAct_9fa48("12184") ? "" : (stryCov_9fa48("12184"), "object")))) || (stryMutAct_9fa48("12186") ? value !== null : stryMutAct_9fa48("12185") ? false : (stryCov_9fa48("12185", "12186"), value === null)))) return stryMutAct_9fa48("12187") ? true : (stryCov_9fa48("12187"), false);
    const candidate = value as Partial<PeerMediaReadiness>;
    return stryMutAct_9fa48("12190") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) && candidate.accepts.every(isReadinessClass) && Array.isArray(candidate.offers) && candidate.offers.every(isReadinessClass) && typeof candidate.downlinkBucket === "string" && BUCKETS.includes(candidate.downlinkBucket) && Array.isArray(candidate.constrained) && candidate.constrained.every(entry => typeof entry === "string" && CONSTRAINTS.includes(entry)) && typeof candidate.consentPosture === "string" && POSTURES.includes(candidate.consentPosture) && typeof candidate.expiresAt === "number" || Number.isFinite(candidate.expiresAt) : stryMutAct_9fa48("12189") ? false : stryMutAct_9fa48("12188") ? true : (stryCov_9fa48("12188", "12189", "12190"), (stryMutAct_9fa48("12192") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) && candidate.accepts.every(isReadinessClass) && Array.isArray(candidate.offers) && candidate.offers.every(isReadinessClass) && typeof candidate.downlinkBucket === "string" && BUCKETS.includes(candidate.downlinkBucket) && Array.isArray(candidate.constrained) && candidate.constrained.every(entry => typeof entry === "string" && CONSTRAINTS.includes(entry)) && typeof candidate.consentPosture === "string" && POSTURES.includes(candidate.consentPosture) || typeof candidate.expiresAt === "number" : stryMutAct_9fa48("12191") ? true : (stryCov_9fa48("12191", "12192"), (stryMutAct_9fa48("12194") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) && candidate.accepts.every(isReadinessClass) && Array.isArray(candidate.offers) && candidate.offers.every(isReadinessClass) && typeof candidate.downlinkBucket === "string" && BUCKETS.includes(candidate.downlinkBucket) && Array.isArray(candidate.constrained) && candidate.constrained.every(entry => typeof entry === "string" && CONSTRAINTS.includes(entry)) && typeof candidate.consentPosture === "string" || POSTURES.includes(candidate.consentPosture) : stryMutAct_9fa48("12193") ? true : (stryCov_9fa48("12193", "12194"), (stryMutAct_9fa48("12196") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) && candidate.accepts.every(isReadinessClass) && Array.isArray(candidate.offers) && candidate.offers.every(isReadinessClass) && typeof candidate.downlinkBucket === "string" && BUCKETS.includes(candidate.downlinkBucket) && Array.isArray(candidate.constrained) && candidate.constrained.every(entry => typeof entry === "string" && CONSTRAINTS.includes(entry)) || typeof candidate.consentPosture === "string" : stryMutAct_9fa48("12195") ? true : (stryCov_9fa48("12195", "12196"), (stryMutAct_9fa48("12198") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) && candidate.accepts.every(isReadinessClass) && Array.isArray(candidate.offers) && candidate.offers.every(isReadinessClass) && typeof candidate.downlinkBucket === "string" && BUCKETS.includes(candidate.downlinkBucket) && Array.isArray(candidate.constrained) || candidate.constrained.every(entry => typeof entry === "string" && CONSTRAINTS.includes(entry)) : stryMutAct_9fa48("12197") ? true : (stryCov_9fa48("12197", "12198"), (stryMutAct_9fa48("12200") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) && candidate.accepts.every(isReadinessClass) && Array.isArray(candidate.offers) && candidate.offers.every(isReadinessClass) && typeof candidate.downlinkBucket === "string" && BUCKETS.includes(candidate.downlinkBucket) || Array.isArray(candidate.constrained) : stryMutAct_9fa48("12199") ? true : (stryCov_9fa48("12199", "12200"), (stryMutAct_9fa48("12202") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) && candidate.accepts.every(isReadinessClass) && Array.isArray(candidate.offers) && candidate.offers.every(isReadinessClass) && typeof candidate.downlinkBucket === "string" || BUCKETS.includes(candidate.downlinkBucket) : stryMutAct_9fa48("12201") ? true : (stryCov_9fa48("12201", "12202"), (stryMutAct_9fa48("12204") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) && candidate.accepts.every(isReadinessClass) && Array.isArray(candidate.offers) && candidate.offers.every(isReadinessClass) || typeof candidate.downlinkBucket === "string" : stryMutAct_9fa48("12203") ? true : (stryCov_9fa48("12203", "12204"), (stryMutAct_9fa48("12206") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) && candidate.accepts.every(isReadinessClass) && Array.isArray(candidate.offers) || candidate.offers.every(isReadinessClass) : stryMutAct_9fa48("12205") ? true : (stryCov_9fa48("12205", "12206"), (stryMutAct_9fa48("12208") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) && candidate.accepts.every(isReadinessClass) || Array.isArray(candidate.offers) : stryMutAct_9fa48("12207") ? true : (stryCov_9fa48("12207", "12208"), (stryMutAct_9fa48("12210") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 && Array.isArray(candidate.accepts) || candidate.accepts.every(isReadinessClass) : stryMutAct_9fa48("12209") ? true : (stryCov_9fa48("12209", "12210"), (stryMutAct_9fa48("12212") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 && candidate.hostApi.length <= 32 || Array.isArray(candidate.accepts) : stryMutAct_9fa48("12211") ? true : (stryCov_9fa48("12211", "12212"), (stryMutAct_9fa48("12214") ? typeof candidate.hostApi === "string" && candidate.hostApi.length > 0 || candidate.hostApi.length <= 32 : stryMutAct_9fa48("12213") ? true : (stryCov_9fa48("12213", "12214"), (stryMutAct_9fa48("12216") ? typeof candidate.hostApi === "string" || candidate.hostApi.length > 0 : stryMutAct_9fa48("12215") ? true : (stryCov_9fa48("12215", "12216"), (stryMutAct_9fa48("12218") ? typeof candidate.hostApi !== "string" : stryMutAct_9fa48("12217") ? true : (stryCov_9fa48("12217", "12218"), typeof candidate.hostApi === (stryMutAct_9fa48("12219") ? "" : (stryCov_9fa48("12219"), "string")))) && (stryMutAct_9fa48("12222") ? candidate.hostApi.length <= 0 : stryMutAct_9fa48("12221") ? candidate.hostApi.length >= 0 : stryMutAct_9fa48("12220") ? true : (stryCov_9fa48("12220", "12221", "12222"), candidate.hostApi.length > 0)))) && (stryMutAct_9fa48("12225") ? candidate.hostApi.length > 32 : stryMutAct_9fa48("12224") ? candidate.hostApi.length < 32 : stryMutAct_9fa48("12223") ? true : (stryCov_9fa48("12223", "12224", "12225"), candidate.hostApi.length <= 32)))) && Array.isArray(candidate.accepts))) && (stryMutAct_9fa48("12226") ? candidate.accepts.some(isReadinessClass) : (stryCov_9fa48("12226"), candidate.accepts.every(isReadinessClass))))) && Array.isArray(candidate.offers))) && (stryMutAct_9fa48("12227") ? candidate.offers.some(isReadinessClass) : (stryCov_9fa48("12227"), candidate.offers.every(isReadinessClass))))) && (stryMutAct_9fa48("12229") ? typeof candidate.downlinkBucket !== "string" : stryMutAct_9fa48("12228") ? true : (stryCov_9fa48("12228", "12229"), typeof candidate.downlinkBucket === (stryMutAct_9fa48("12230") ? "" : (stryCov_9fa48("12230"), "string")))))) && BUCKETS.includes(candidate.downlinkBucket))) && Array.isArray(candidate.constrained))) && (stryMutAct_9fa48("12231") ? candidate.constrained.some(entry => typeof entry === "string" && CONSTRAINTS.includes(entry)) : (stryCov_9fa48("12231"), candidate.constrained.every(stryMutAct_9fa48("12232") ? () => undefined : (stryCov_9fa48("12232"), entry => stryMutAct_9fa48("12235") ? typeof entry === "string" || CONSTRAINTS.includes(entry) : stryMutAct_9fa48("12234") ? false : stryMutAct_9fa48("12233") ? true : (stryCov_9fa48("12233", "12234", "12235"), (stryMutAct_9fa48("12237") ? typeof entry !== "string" : stryMutAct_9fa48("12236") ? true : (stryCov_9fa48("12236", "12237"), typeof entry === (stryMutAct_9fa48("12238") ? "" : (stryCov_9fa48("12238"), "string")))) && CONSTRAINTS.includes(entry)))))))) && (stryMutAct_9fa48("12240") ? typeof candidate.consentPosture !== "string" : stryMutAct_9fa48("12239") ? true : (stryCov_9fa48("12239", "12240"), typeof candidate.consentPosture === (stryMutAct_9fa48("12241") ? "" : (stryCov_9fa48("12241"), "string")))))) && POSTURES.includes(candidate.consentPosture))) && (stryMutAct_9fa48("12243") ? typeof candidate.expiresAt !== "number" : stryMutAct_9fa48("12242") ? true : (stryCov_9fa48("12242", "12243"), typeof candidate.expiresAt === (stryMutAct_9fa48("12244") ? "" : (stryCov_9fa48("12244"), "number")))))) && Number.isFinite(candidate.expiresAt));
  }
}
function isReadinessClass(value: unknown): boolean {
  if (stryMutAct_9fa48("12245")) {
    {}
  } else {
    stryCov_9fa48("12245");
    if (stryMutAct_9fa48("12248") ? typeof value !== "object" && value === null : stryMutAct_9fa48("12247") ? false : stryMutAct_9fa48("12246") ? true : (stryCov_9fa48("12246", "12247", "12248"), (stryMutAct_9fa48("12250") ? typeof value === "object" : stryMutAct_9fa48("12249") ? false : (stryCov_9fa48("12249", "12250"), typeof value !== (stryMutAct_9fa48("12251") ? "" : (stryCov_9fa48("12251"), "object")))) || (stryMutAct_9fa48("12253") ? value !== null : stryMutAct_9fa48("12252") ? false : (stryCov_9fa48("12252", "12253"), value === null)))) return stryMutAct_9fa48("12254") ? true : (stryCov_9fa48("12254"), false);
    const entry = value as {
      classId?: unknown;
      maxRung?: unknown;
      encodings?: unknown;
    };
    return stryMutAct_9fa48("12257") ? typeof entry.classId === "string" && CLASS_IDS.includes(entry.classId) && typeof entry.maxRung === "string" && entry.maxRung.length > 0 && entry.maxRung.length <= 64 && Array.isArray(entry.encodings) && entry.encodings.length <= 16 || entry.encodings.every(encoding => typeof encoding === "string" && encoding.length > 0 && encoding.length <= 64) : stryMutAct_9fa48("12256") ? false : stryMutAct_9fa48("12255") ? true : (stryCov_9fa48("12255", "12256", "12257"), (stryMutAct_9fa48("12259") ? typeof entry.classId === "string" && CLASS_IDS.includes(entry.classId) && typeof entry.maxRung === "string" && entry.maxRung.length > 0 && entry.maxRung.length <= 64 && Array.isArray(entry.encodings) || entry.encodings.length <= 16 : stryMutAct_9fa48("12258") ? true : (stryCov_9fa48("12258", "12259"), (stryMutAct_9fa48("12261") ? typeof entry.classId === "string" && CLASS_IDS.includes(entry.classId) && typeof entry.maxRung === "string" && entry.maxRung.length > 0 && entry.maxRung.length <= 64 || Array.isArray(entry.encodings) : stryMutAct_9fa48("12260") ? true : (stryCov_9fa48("12260", "12261"), (stryMutAct_9fa48("12263") ? typeof entry.classId === "string" && CLASS_IDS.includes(entry.classId) && typeof entry.maxRung === "string" && entry.maxRung.length > 0 || entry.maxRung.length <= 64 : stryMutAct_9fa48("12262") ? true : (stryCov_9fa48("12262", "12263"), (stryMutAct_9fa48("12265") ? typeof entry.classId === "string" && CLASS_IDS.includes(entry.classId) && typeof entry.maxRung === "string" || entry.maxRung.length > 0 : stryMutAct_9fa48("12264") ? true : (stryCov_9fa48("12264", "12265"), (stryMutAct_9fa48("12267") ? typeof entry.classId === "string" && CLASS_IDS.includes(entry.classId) || typeof entry.maxRung === "string" : stryMutAct_9fa48("12266") ? true : (stryCov_9fa48("12266", "12267"), (stryMutAct_9fa48("12269") ? typeof entry.classId === "string" || CLASS_IDS.includes(entry.classId) : stryMutAct_9fa48("12268") ? true : (stryCov_9fa48("12268", "12269"), (stryMutAct_9fa48("12271") ? typeof entry.classId !== "string" : stryMutAct_9fa48("12270") ? true : (stryCov_9fa48("12270", "12271"), typeof entry.classId === (stryMutAct_9fa48("12272") ? "" : (stryCov_9fa48("12272"), "string")))) && CLASS_IDS.includes(entry.classId))) && (stryMutAct_9fa48("12274") ? typeof entry.maxRung !== "string" : stryMutAct_9fa48("12273") ? true : (stryCov_9fa48("12273", "12274"), typeof entry.maxRung === (stryMutAct_9fa48("12275") ? "" : (stryCov_9fa48("12275"), "string")))))) && (stryMutAct_9fa48("12278") ? entry.maxRung.length <= 0 : stryMutAct_9fa48("12277") ? entry.maxRung.length >= 0 : stryMutAct_9fa48("12276") ? true : (stryCov_9fa48("12276", "12277", "12278"), entry.maxRung.length > 0)))) && (stryMutAct_9fa48("12281") ? entry.maxRung.length > 64 : stryMutAct_9fa48("12280") ? entry.maxRung.length < 64 : stryMutAct_9fa48("12279") ? true : (stryCov_9fa48("12279", "12280", "12281"), entry.maxRung.length <= 64)))) && Array.isArray(entry.encodings))) && (stryMutAct_9fa48("12284") ? entry.encodings.length > 16 : stryMutAct_9fa48("12283") ? entry.encodings.length < 16 : stryMutAct_9fa48("12282") ? true : (stryCov_9fa48("12282", "12283", "12284"), entry.encodings.length <= 16)))) && (stryMutAct_9fa48("12285") ? entry.encodings.some(encoding => typeof encoding === "string" && encoding.length > 0 && encoding.length <= 64) : (stryCov_9fa48("12285"), entry.encodings.every(stryMutAct_9fa48("12286") ? () => undefined : (stryCov_9fa48("12286"), encoding => stryMutAct_9fa48("12289") ? typeof encoding === "string" && encoding.length > 0 || encoding.length <= 64 : stryMutAct_9fa48("12288") ? false : stryMutAct_9fa48("12287") ? true : (stryCov_9fa48("12287", "12288", "12289"), (stryMutAct_9fa48("12291") ? typeof encoding === "string" || encoding.length > 0 : stryMutAct_9fa48("12290") ? true : (stryCov_9fa48("12290", "12291"), (stryMutAct_9fa48("12293") ? typeof encoding !== "string" : stryMutAct_9fa48("12292") ? true : (stryCov_9fa48("12292", "12293"), typeof encoding === (stryMutAct_9fa48("12294") ? "" : (stryCov_9fa48("12294"), "string")))) && (stryMutAct_9fa48("12297") ? encoding.length <= 0 : stryMutAct_9fa48("12296") ? encoding.length >= 0 : stryMutAct_9fa48("12295") ? true : (stryCov_9fa48("12295", "12296", "12297"), encoding.length > 0)))) && (stryMutAct_9fa48("12300") ? encoding.length > 64 : stryMutAct_9fa48("12299") ? encoding.length < 64 : stryMutAct_9fa48("12298") ? true : (stryCov_9fa48("12298", "12299", "12300"), encoding.length <= 64))))))));
  }
}