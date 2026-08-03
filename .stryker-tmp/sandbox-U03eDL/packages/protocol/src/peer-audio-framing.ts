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
const MAGIC = new Uint8Array(stryMutAct_9fa48("25942") ? [] : (stryCov_9fa48("25942"), [0x54, 0x50, 0x41, 0x31]));
const HEADER_BYTES = 40;
const PARITY_FLAG = 1;
export const MAX_PEER_AUDIO_PAYLOAD_BYTES = 16_384;
export const MAX_PEER_AUDIO_CHUNK_BYTES = 192;
export const MAX_PEER_AUDIO_FRAMES = 256;
export type PeerAudioProfile = 1;
export interface PeerAudioFrame {
  readonly profile: PeerAudioProfile;
  readonly sessionId: Uint8Array;
  readonly sequence: number;
  readonly total: number;
  readonly totalLength: number;
  readonly payloadCrc32: number;
  readonly parity: boolean;
  readonly payload: Uint8Array;
}
export interface PeerAudioAssemblyState {
  readonly expiresAt: number;
  readonly profile: PeerAudioProfile | null;
  readonly sessionId: Uint8Array | null;
  readonly total: number | null;
  readonly totalLength: number | null;
  readonly payloadCrc32: number | null;
  readonly chunks: ReadonlyMap<number, Uint8Array>;
  readonly parity: Uint8Array | null;
}
export interface PeerAudioAssemblyResult {
  readonly state: PeerAudioAssemblyState;
  readonly payload: Uint8Array | null;
  readonly received: number;
  readonly total: number | null;
  readonly recovered: boolean;
}
export class PeerAudioFrameError extends Error {
  constructor(readonly code: "MALFORMED" | "OVERSIZED" | "MIXED_SESSION" | "EXPIRED" | "CRC", message: string) {
    super(message);
    this.name = stryMutAct_9fa48("25943") ? "" : (stryCov_9fa48("25943"), "PeerAudioFrameError");
  }
}
function crc32(bytes: Uint8Array): number {
  if (stryMutAct_9fa48("25944")) {
    {}
  } else {
    stryCov_9fa48("25944");
    let crc = 0xffff_ffff;
    for (const byte of bytes) {
      if (stryMutAct_9fa48("25945")) {
        {}
      } else {
        stryCov_9fa48("25945");
        crc ^= byte;
        for (let bit = 0; stryMutAct_9fa48("25948") ? bit >= 8 : stryMutAct_9fa48("25947") ? bit <= 8 : stryMutAct_9fa48("25946") ? false : (stryCov_9fa48("25946", "25947", "25948"), bit < 8); stryMutAct_9fa48("25949") ? bit -= 1 : (stryCov_9fa48("25949"), bit += 1)) crc = crc >>> 1 ^ (crc & 1 ? 0xedb8_8320 : 0);
      }
    }
    return (crc ^ 0xffff_ffff) >>> 0;
  }
}
function equal(left: Uint8Array, right: Uint8Array): boolean {
  if (stryMutAct_9fa48("25950")) {
    {}
  } else {
    stryCov_9fa48("25950");
    if (stryMutAct_9fa48("25953") ? left.length === right.length : stryMutAct_9fa48("25952") ? false : stryMutAct_9fa48("25951") ? true : (stryCov_9fa48("25951", "25952", "25953"), left.length !== right.length)) return stryMutAct_9fa48("25954") ? true : (stryCov_9fa48("25954"), false);
    let difference = 0;
    for (let index = 0; stryMutAct_9fa48("25957") ? index >= left.length : stryMutAct_9fa48("25956") ? index <= left.length : stryMutAct_9fa48("25955") ? false : (stryCov_9fa48("25955", "25956", "25957"), index < left.length); stryMutAct_9fa48("25958") ? index -= 1 : (stryCov_9fa48("25958"), index += 1)) stryMutAct_9fa48("25959") ? difference &= (left[index] ?? 0) ^ (right[index] ?? 0) : (stryCov_9fa48("25959"), difference |= (stryMutAct_9fa48("25960") ? left[index] && 0 : (stryCov_9fa48("25960"), left[index] ?? 0)) ^ (stryMutAct_9fa48("25961") ? right[index] && 0 : (stryCov_9fa48("25961"), right[index] ?? 0)));
    return stryMutAct_9fa48("25964") ? difference !== 0 : stryMutAct_9fa48("25963") ? false : stryMutAct_9fa48("25962") ? true : (stryCov_9fa48("25962", "25963", "25964"), difference === 0);
  }
}
function frameHeader(frame: Omit<PeerAudioFrame, "payload">, payloadLength: number): Uint8Array {
  if (stryMutAct_9fa48("25965")) {
    {}
  } else {
    stryCov_9fa48("25965");
    const header = new Uint8Array(HEADER_BYTES);
    header.set(MAGIC);
    header[4] = frame.profile;
    header[5] = frame.parity ? PARITY_FLAG : 0;
    header.set(frame.sessionId, 6);
    const view = new DataView(header.buffer);
    view.setUint16(22, frame.sequence, stryMutAct_9fa48("25966") ? true : (stryCov_9fa48("25966"), false));
    view.setUint16(24, frame.total, stryMutAct_9fa48("25967") ? true : (stryCov_9fa48("25967"), false));
    view.setUint32(26, frame.totalLength, stryMutAct_9fa48("25968") ? true : (stryCov_9fa48("25968"), false));
    view.setUint16(30, payloadLength, stryMutAct_9fa48("25969") ? true : (stryCov_9fa48("25969"), false));
    view.setUint32(32, frame.payloadCrc32, stryMutAct_9fa48("25970") ? true : (stryCov_9fa48("25970"), false));
    return header;
  }
}
export function encodePeerAudioFrame(frame: PeerAudioFrame): Uint8Array {
  if (stryMutAct_9fa48("25971")) {
    {}
  } else {
    stryCov_9fa48("25971");
    if (stryMutAct_9fa48("25974") ? (frame.profile !== 1 || frame.sessionId.length !== 16 || frame.total < 1 || frame.total > MAX_PEER_AUDIO_FRAMES || frame.sequence < 0 || frame.sequence > frame.total || frame.parity !== (frame.sequence === frame.total) || frame.payload.length < 1 || frame.payload.length > MAX_PEER_AUDIO_CHUNK_BYTES || frame.totalLength < 1) && frame.totalLength > MAX_PEER_AUDIO_PAYLOAD_BYTES : stryMutAct_9fa48("25973") ? false : stryMutAct_9fa48("25972") ? true : (stryCov_9fa48("25972", "25973", "25974"), (stryMutAct_9fa48("25976") ? (frame.profile !== 1 || frame.sessionId.length !== 16 || frame.total < 1 || frame.total > MAX_PEER_AUDIO_FRAMES || frame.sequence < 0 || frame.sequence > frame.total || frame.parity !== (frame.sequence === frame.total) || frame.payload.length < 1 || frame.payload.length > MAX_PEER_AUDIO_CHUNK_BYTES) && frame.totalLength < 1 : stryMutAct_9fa48("25975") ? false : (stryCov_9fa48("25975", "25976"), (stryMutAct_9fa48("25978") ? (frame.profile !== 1 || frame.sessionId.length !== 16 || frame.total < 1 || frame.total > MAX_PEER_AUDIO_FRAMES || frame.sequence < 0 || frame.sequence > frame.total || frame.parity !== (frame.sequence === frame.total) || frame.payload.length < 1) && frame.payload.length > MAX_PEER_AUDIO_CHUNK_BYTES : stryMutAct_9fa48("25977") ? false : (stryCov_9fa48("25977", "25978"), (stryMutAct_9fa48("25980") ? (frame.profile !== 1 || frame.sessionId.length !== 16 || frame.total < 1 || frame.total > MAX_PEER_AUDIO_FRAMES || frame.sequence < 0 || frame.sequence > frame.total || frame.parity !== (frame.sequence === frame.total)) && frame.payload.length < 1 : stryMutAct_9fa48("25979") ? false : (stryCov_9fa48("25979", "25980"), (stryMutAct_9fa48("25982") ? (frame.profile !== 1 || frame.sessionId.length !== 16 || frame.total < 1 || frame.total > MAX_PEER_AUDIO_FRAMES || frame.sequence < 0 || frame.sequence > frame.total) && frame.parity !== (frame.sequence === frame.total) : stryMutAct_9fa48("25981") ? false : (stryCov_9fa48("25981", "25982"), (stryMutAct_9fa48("25984") ? (frame.profile !== 1 || frame.sessionId.length !== 16 || frame.total < 1 || frame.total > MAX_PEER_AUDIO_FRAMES || frame.sequence < 0) && frame.sequence > frame.total : stryMutAct_9fa48("25983") ? false : (stryCov_9fa48("25983", "25984"), (stryMutAct_9fa48("25986") ? (frame.profile !== 1 || frame.sessionId.length !== 16 || frame.total < 1 || frame.total > MAX_PEER_AUDIO_FRAMES) && frame.sequence < 0 : stryMutAct_9fa48("25985") ? false : (stryCov_9fa48("25985", "25986"), (stryMutAct_9fa48("25988") ? (frame.profile !== 1 || frame.sessionId.length !== 16 || frame.total < 1) && frame.total > MAX_PEER_AUDIO_FRAMES : stryMutAct_9fa48("25987") ? false : (stryCov_9fa48("25987", "25988"), (stryMutAct_9fa48("25990") ? (frame.profile !== 1 || frame.sessionId.length !== 16) && frame.total < 1 : stryMutAct_9fa48("25989") ? false : (stryCov_9fa48("25989", "25990"), (stryMutAct_9fa48("25992") ? frame.profile !== 1 && frame.sessionId.length !== 16 : stryMutAct_9fa48("25991") ? false : (stryCov_9fa48("25991", "25992"), (stryMutAct_9fa48("25994") ? frame.profile === 1 : stryMutAct_9fa48("25993") ? false : (stryCov_9fa48("25993", "25994"), frame.profile !== 1)) || (stryMutAct_9fa48("25996") ? frame.sessionId.length === 16 : stryMutAct_9fa48("25995") ? false : (stryCov_9fa48("25995", "25996"), frame.sessionId.length !== 16)))) || (stryMutAct_9fa48("25999") ? frame.total >= 1 : stryMutAct_9fa48("25998") ? frame.total <= 1 : stryMutAct_9fa48("25997") ? false : (stryCov_9fa48("25997", "25998", "25999"), frame.total < 1)))) || (stryMutAct_9fa48("26002") ? frame.total <= MAX_PEER_AUDIO_FRAMES : stryMutAct_9fa48("26001") ? frame.total >= MAX_PEER_AUDIO_FRAMES : stryMutAct_9fa48("26000") ? false : (stryCov_9fa48("26000", "26001", "26002"), frame.total > MAX_PEER_AUDIO_FRAMES)))) || (stryMutAct_9fa48("26005") ? frame.sequence >= 0 : stryMutAct_9fa48("26004") ? frame.sequence <= 0 : stryMutAct_9fa48("26003") ? false : (stryCov_9fa48("26003", "26004", "26005"), frame.sequence < 0)))) || (stryMutAct_9fa48("26008") ? frame.sequence <= frame.total : stryMutAct_9fa48("26007") ? frame.sequence >= frame.total : stryMutAct_9fa48("26006") ? false : (stryCov_9fa48("26006", "26007", "26008"), frame.sequence > frame.total)))) || (stryMutAct_9fa48("26010") ? frame.parity === (frame.sequence === frame.total) : stryMutAct_9fa48("26009") ? false : (stryCov_9fa48("26009", "26010"), frame.parity !== (stryMutAct_9fa48("26013") ? frame.sequence !== frame.total : stryMutAct_9fa48("26012") ? false : stryMutAct_9fa48("26011") ? true : (stryCov_9fa48("26011", "26012", "26013"), frame.sequence === frame.total)))))) || (stryMutAct_9fa48("26016") ? frame.payload.length >= 1 : stryMutAct_9fa48("26015") ? frame.payload.length <= 1 : stryMutAct_9fa48("26014") ? false : (stryCov_9fa48("26014", "26015", "26016"), frame.payload.length < 1)))) || (stryMutAct_9fa48("26019") ? frame.payload.length <= MAX_PEER_AUDIO_CHUNK_BYTES : stryMutAct_9fa48("26018") ? frame.payload.length >= MAX_PEER_AUDIO_CHUNK_BYTES : stryMutAct_9fa48("26017") ? false : (stryCov_9fa48("26017", "26018", "26019"), frame.payload.length > MAX_PEER_AUDIO_CHUNK_BYTES)))) || (stryMutAct_9fa48("26022") ? frame.totalLength >= 1 : stryMutAct_9fa48("26021") ? frame.totalLength <= 1 : stryMutAct_9fa48("26020") ? false : (stryCov_9fa48("26020", "26021", "26022"), frame.totalLength < 1)))) || (stryMutAct_9fa48("26025") ? frame.totalLength <= MAX_PEER_AUDIO_PAYLOAD_BYTES : stryMutAct_9fa48("26024") ? frame.totalLength >= MAX_PEER_AUDIO_PAYLOAD_BYTES : stryMutAct_9fa48("26023") ? false : (stryCov_9fa48("26023", "26024", "26025"), frame.totalLength > MAX_PEER_AUDIO_PAYLOAD_BYTES)))) throw new PeerAudioFrameError(stryMutAct_9fa48("26026") ? "" : (stryCov_9fa48("26026"), "MALFORMED"), stryMutAct_9fa48("26027") ? "" : (stryCov_9fa48("26027"), "Invalid peer audio frame fields"));
    const header = frameHeader(frame, frame.payload.length);
    const body = new Uint8Array(stryMutAct_9fa48("26028") ? HEADER_BYTES - frame.payload.length : (stryCov_9fa48("26028"), HEADER_BYTES + frame.payload.length));
    body.set(header);
    body.set(frame.payload, HEADER_BYTES);
    new DataView(body.buffer).setUint32(36, (crc32(body.subarray(0, 36)) ^ crc32(frame.payload)) >>> 0, stryMutAct_9fa48("26029") ? true : (stryCov_9fa48("26029"), false));
    return body;
  }
}
export function decodePeerAudioFrame(bytes: Uint8Array): PeerAudioFrame {
  if (stryMutAct_9fa48("26030")) {
    {}
  } else {
    stryCov_9fa48("26030");
    if (stryMutAct_9fa48("26033") ? (bytes.length < HEADER_BYTES + 1 || bytes.length > HEADER_BYTES + MAX_PEER_AUDIO_CHUNK_BYTES) && !equal(bytes.subarray(0, 4), MAGIC) : stryMutAct_9fa48("26032") ? false : stryMutAct_9fa48("26031") ? true : (stryCov_9fa48("26031", "26032", "26033"), (stryMutAct_9fa48("26035") ? bytes.length < HEADER_BYTES + 1 && bytes.length > HEADER_BYTES + MAX_PEER_AUDIO_CHUNK_BYTES : stryMutAct_9fa48("26034") ? false : (stryCov_9fa48("26034", "26035"), (stryMutAct_9fa48("26038") ? bytes.length >= HEADER_BYTES + 1 : stryMutAct_9fa48("26037") ? bytes.length <= HEADER_BYTES + 1 : stryMutAct_9fa48("26036") ? false : (stryCov_9fa48("26036", "26037", "26038"), bytes.length < (stryMutAct_9fa48("26039") ? HEADER_BYTES - 1 : (stryCov_9fa48("26039"), HEADER_BYTES + 1)))) || (stryMutAct_9fa48("26042") ? bytes.length <= HEADER_BYTES + MAX_PEER_AUDIO_CHUNK_BYTES : stryMutAct_9fa48("26041") ? bytes.length >= HEADER_BYTES + MAX_PEER_AUDIO_CHUNK_BYTES : stryMutAct_9fa48("26040") ? false : (stryCov_9fa48("26040", "26041", "26042"), bytes.length > (stryMutAct_9fa48("26043") ? HEADER_BYTES - MAX_PEER_AUDIO_CHUNK_BYTES : (stryCov_9fa48("26043"), HEADER_BYTES + MAX_PEER_AUDIO_CHUNK_BYTES)))))) || (stryMutAct_9fa48("26044") ? equal(bytes.subarray(0, 4), MAGIC) : (stryCov_9fa48("26044"), !equal(bytes.subarray(0, 4), MAGIC))))) throw new PeerAudioFrameError(stryMutAct_9fa48("26045") ? "" : (stryCov_9fa48("26045"), "MALFORMED"), stryMutAct_9fa48("26046") ? "" : (stryCov_9fa48("26046"), "Malformed peer audio frame"));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const profile = bytes[4];
    const flags = stryMutAct_9fa48("26047") ? bytes[5] && 0 : (stryCov_9fa48("26047"), bytes[5] ?? 0);
    const sequence = view.getUint16(22, stryMutAct_9fa48("26048") ? true : (stryCov_9fa48("26048"), false));
    const total = view.getUint16(24, stryMutAct_9fa48("26049") ? true : (stryCov_9fa48("26049"), false));
    const totalLength = view.getUint32(26, stryMutAct_9fa48("26050") ? true : (stryCov_9fa48("26050"), false));
    const payloadLength = view.getUint16(30, stryMutAct_9fa48("26051") ? true : (stryCov_9fa48("26051"), false));
    const payloadCrc32 = view.getUint32(32, stryMutAct_9fa48("26052") ? true : (stryCov_9fa48("26052"), false));
    const parity = stryMutAct_9fa48("26055") ? (flags & PARITY_FLAG) === 0 : stryMutAct_9fa48("26054") ? false : stryMutAct_9fa48("26053") ? true : (stryCov_9fa48("26053", "26054", "26055"), (flags & PARITY_FLAG) !== 0);
    if (stryMutAct_9fa48("26058") ? (profile !== 1 || (flags & ~PARITY_FLAG) !== 0) && payloadLength !== bytes.length - HEADER_BYTES : stryMutAct_9fa48("26057") ? false : stryMutAct_9fa48("26056") ? true : (stryCov_9fa48("26056", "26057", "26058"), (stryMutAct_9fa48("26060") ? profile !== 1 && (flags & ~PARITY_FLAG) !== 0 : stryMutAct_9fa48("26059") ? false : (stryCov_9fa48("26059", "26060"), (stryMutAct_9fa48("26062") ? profile === 1 : stryMutAct_9fa48("26061") ? false : (stryCov_9fa48("26061", "26062"), profile !== 1)) || (stryMutAct_9fa48("26064") ? (flags & ~PARITY_FLAG) === 0 : stryMutAct_9fa48("26063") ? false : (stryCov_9fa48("26063", "26064"), (flags & (stryMutAct_9fa48("26065") ? PARITY_FLAG : (stryCov_9fa48("26065"), ~PARITY_FLAG))) !== 0)))) || (stryMutAct_9fa48("26067") ? payloadLength === bytes.length - HEADER_BYTES : stryMutAct_9fa48("26066") ? false : (stryCov_9fa48("26066", "26067"), payloadLength !== (stryMutAct_9fa48("26068") ? bytes.length + HEADER_BYTES : (stryCov_9fa48("26068"), bytes.length - HEADER_BYTES)))))) throw new PeerAudioFrameError(stryMutAct_9fa48("26069") ? "" : (stryCov_9fa48("26069"), "MALFORMED"), stryMutAct_9fa48("26070") ? "" : (stryCov_9fa48("26070"), "Invalid peer audio frame header"));
    const expectedFrameCrc = view.getUint32(36, stryMutAct_9fa48("26071") ? true : (stryCov_9fa48("26071"), false));
    const actualFrameCrc = (crc32(bytes.subarray(0, 36)) ^ crc32(bytes.subarray(HEADER_BYTES))) >>> 0;
    if (stryMutAct_9fa48("26074") ? expectedFrameCrc === actualFrameCrc : stryMutAct_9fa48("26073") ? false : stryMutAct_9fa48("26072") ? true : (stryCov_9fa48("26072", "26073", "26074"), expectedFrameCrc !== actualFrameCrc)) throw new PeerAudioFrameError(stryMutAct_9fa48("26075") ? "" : (stryCov_9fa48("26075"), "CRC"), stryMutAct_9fa48("26076") ? "" : (stryCov_9fa48("26076"), "Peer audio frame CRC mismatch"));
    const frame: PeerAudioFrame = stryMutAct_9fa48("26077") ? {} : (stryCov_9fa48("26077"), {
      profile,
      sessionId: stryMutAct_9fa48("26078") ? bytes : (stryCov_9fa48("26078"), bytes.slice(6, 22)),
      sequence,
      total,
      totalLength,
      payloadCrc32,
      parity,
      payload: stryMutAct_9fa48("26079") ? bytes : (stryCov_9fa48("26079"), bytes.slice(HEADER_BYTES))
    });
    encodePeerAudioFrame(frame);
    return frame;
  }
}
export function framePeerAudioPayload(sessionId: Uint8Array, payload: Uint8Array, chunkBytes = 128): ReadonlyArray<Uint8Array> {
  if (stryMutAct_9fa48("26080")) {
    {}
  } else {
    stryCov_9fa48("26080");
    if (stryMutAct_9fa48("26083") ? (sessionId.length !== 16 || payload.length < 1 || payload.length > MAX_PEER_AUDIO_PAYLOAD_BYTES || chunkBytes < 16) && chunkBytes > MAX_PEER_AUDIO_CHUNK_BYTES : stryMutAct_9fa48("26082") ? false : stryMutAct_9fa48("26081") ? true : (stryCov_9fa48("26081", "26082", "26083"), (stryMutAct_9fa48("26085") ? (sessionId.length !== 16 || payload.length < 1 || payload.length > MAX_PEER_AUDIO_PAYLOAD_BYTES) && chunkBytes < 16 : stryMutAct_9fa48("26084") ? false : (stryCov_9fa48("26084", "26085"), (stryMutAct_9fa48("26087") ? (sessionId.length !== 16 || payload.length < 1) && payload.length > MAX_PEER_AUDIO_PAYLOAD_BYTES : stryMutAct_9fa48("26086") ? false : (stryCov_9fa48("26086", "26087"), (stryMutAct_9fa48("26089") ? sessionId.length !== 16 && payload.length < 1 : stryMutAct_9fa48("26088") ? false : (stryCov_9fa48("26088", "26089"), (stryMutAct_9fa48("26091") ? sessionId.length === 16 : stryMutAct_9fa48("26090") ? false : (stryCov_9fa48("26090", "26091"), sessionId.length !== 16)) || (stryMutAct_9fa48("26094") ? payload.length >= 1 : stryMutAct_9fa48("26093") ? payload.length <= 1 : stryMutAct_9fa48("26092") ? false : (stryCov_9fa48("26092", "26093", "26094"), payload.length < 1)))) || (stryMutAct_9fa48("26097") ? payload.length <= MAX_PEER_AUDIO_PAYLOAD_BYTES : stryMutAct_9fa48("26096") ? payload.length >= MAX_PEER_AUDIO_PAYLOAD_BYTES : stryMutAct_9fa48("26095") ? false : (stryCov_9fa48("26095", "26096", "26097"), payload.length > MAX_PEER_AUDIO_PAYLOAD_BYTES)))) || (stryMutAct_9fa48("26100") ? chunkBytes >= 16 : stryMutAct_9fa48("26099") ? chunkBytes <= 16 : stryMutAct_9fa48("26098") ? false : (stryCov_9fa48("26098", "26099", "26100"), chunkBytes < 16)))) || (stryMutAct_9fa48("26103") ? chunkBytes <= MAX_PEER_AUDIO_CHUNK_BYTES : stryMutAct_9fa48("26102") ? chunkBytes >= MAX_PEER_AUDIO_CHUNK_BYTES : stryMutAct_9fa48("26101") ? false : (stryCov_9fa48("26101", "26102", "26103"), chunkBytes > MAX_PEER_AUDIO_CHUNK_BYTES)))) throw new PeerAudioFrameError(stryMutAct_9fa48("26104") ? "" : (stryCov_9fa48("26104"), "OVERSIZED"), stryMutAct_9fa48("26105") ? "" : (stryCov_9fa48("26105"), "Invalid peer audio payload or chunk budget"));
    const total = Math.ceil(stryMutAct_9fa48("26106") ? payload.length * chunkBytes : (stryCov_9fa48("26106"), payload.length / chunkBytes));
    if (stryMutAct_9fa48("26110") ? total <= MAX_PEER_AUDIO_FRAMES : stryMutAct_9fa48("26109") ? total >= MAX_PEER_AUDIO_FRAMES : stryMutAct_9fa48("26108") ? false : stryMutAct_9fa48("26107") ? true : (stryCov_9fa48("26107", "26108", "26109", "26110"), total > MAX_PEER_AUDIO_FRAMES)) throw new PeerAudioFrameError(stryMutAct_9fa48("26111") ? "" : (stryCov_9fa48("26111"), "OVERSIZED"), stryMutAct_9fa48("26112") ? "" : (stryCov_9fa48("26112"), "Peer audio payload requires too many frames"));
    const checksum = crc32(payload);
    const chunks = Array.from(stryMutAct_9fa48("26113") ? {} : (stryCov_9fa48("26113"), {
      length: total
    }), stryMutAct_9fa48("26114") ? () => undefined : (stryCov_9fa48("26114"), (_, sequence) => stryMutAct_9fa48("26115") ? payload : (stryCov_9fa48("26115"), payload.slice(stryMutAct_9fa48("26116") ? sequence / chunkBytes : (stryCov_9fa48("26116"), sequence * chunkBytes), stryMutAct_9fa48("26117") ? Math.max(payload.length, (sequence + 1) * chunkBytes) : (stryCov_9fa48("26117"), Math.min(payload.length, stryMutAct_9fa48("26118") ? (sequence + 1) / chunkBytes : (stryCov_9fa48("26118"), (stryMutAct_9fa48("26119") ? sequence - 1 : (stryCov_9fa48("26119"), sequence + 1)) * chunkBytes)))))));
    const parity = new Uint8Array(chunkBytes);
    for (const chunk of chunks) for (let index = 0; stryMutAct_9fa48("26122") ? index >= chunk.length : stryMutAct_9fa48("26121") ? index <= chunk.length : stryMutAct_9fa48("26120") ? false : (stryCov_9fa48("26120", "26121", "26122"), index < chunk.length); stryMutAct_9fa48("26123") ? index -= 1 : (stryCov_9fa48("26123"), index += 1)) parity[index] = (stryMutAct_9fa48("26124") ? parity[index] && 0 : (stryCov_9fa48("26124"), parity[index] ?? 0)) ^ (stryMutAct_9fa48("26125") ? chunk[index] && 0 : (stryCov_9fa48("26125"), chunk[index] ?? 0));
    return stryMutAct_9fa48("26126") ? [] : (stryCov_9fa48("26126"), [...chunks.map(stryMutAct_9fa48("26127") ? () => undefined : (stryCov_9fa48("26127"), (chunk, sequence) => encodePeerAudioFrame(stryMutAct_9fa48("26128") ? {} : (stryCov_9fa48("26128"), {
      profile: 1,
      sessionId,
      sequence,
      total,
      totalLength: payload.length,
      payloadCrc32: checksum,
      parity: stryMutAct_9fa48("26129") ? true : (stryCov_9fa48("26129"), false),
      payload: chunk
    })))), encodePeerAudioFrame(stryMutAct_9fa48("26130") ? {} : (stryCov_9fa48("26130"), {
      profile: 1,
      sessionId,
      sequence: total,
      total,
      totalLength: payload.length,
      payloadCrc32: checksum,
      parity: stryMutAct_9fa48("26131") ? false : (stryCov_9fa48("26131"), true),
      payload: parity
    }))]);
  }
}
export function initialPeerAudioAssemblyState(expiresAt: number): PeerAudioAssemblyState {
  if (stryMutAct_9fa48("26132")) {
    {}
  } else {
    stryCov_9fa48("26132");
    return stryMutAct_9fa48("26133") ? {} : (stryCov_9fa48("26133"), {
      expiresAt,
      profile: null,
      sessionId: null,
      total: null,
      totalLength: null,
      payloadCrc32: null,
      chunks: new Map(),
      parity: null
    });
  }
}
export function stepPeerAudioAssembly(state: PeerAudioAssemblyState, encodedFrame: Uint8Array, now: number): PeerAudioAssemblyResult {
  if (stryMutAct_9fa48("26134")) {
    {}
  } else {
    stryCov_9fa48("26134");
    if (stryMutAct_9fa48("26138") ? now < state.expiresAt : stryMutAct_9fa48("26137") ? now > state.expiresAt : stryMutAct_9fa48("26136") ? false : stryMutAct_9fa48("26135") ? true : (stryCov_9fa48("26135", "26136", "26137", "26138"), now >= state.expiresAt)) throw new PeerAudioFrameError(stryMutAct_9fa48("26139") ? "" : (stryCov_9fa48("26139"), "EXPIRED"), stryMutAct_9fa48("26140") ? "" : (stryCov_9fa48("26140"), "Peer audio assembly expired"));
    const frame = decodePeerAudioFrame(encodedFrame);
    if (stryMutAct_9fa48("26143") ? state.sessionId !== null || !equal(state.sessionId, frame.sessionId) || state.profile !== frame.profile || state.total !== frame.total || state.totalLength !== frame.totalLength || state.payloadCrc32 !== frame.payloadCrc32 : stryMutAct_9fa48("26142") ? false : stryMutAct_9fa48("26141") ? true : (stryCov_9fa48("26141", "26142", "26143"), (stryMutAct_9fa48("26145") ? state.sessionId === null : stryMutAct_9fa48("26144") ? true : (stryCov_9fa48("26144", "26145"), state.sessionId !== null)) && (stryMutAct_9fa48("26147") ? (!equal(state.sessionId, frame.sessionId) || state.profile !== frame.profile || state.total !== frame.total || state.totalLength !== frame.totalLength) && state.payloadCrc32 !== frame.payloadCrc32 : stryMutAct_9fa48("26146") ? true : (stryCov_9fa48("26146", "26147"), (stryMutAct_9fa48("26149") ? (!equal(state.sessionId, frame.sessionId) || state.profile !== frame.profile || state.total !== frame.total) && state.totalLength !== frame.totalLength : stryMutAct_9fa48("26148") ? false : (stryCov_9fa48("26148", "26149"), (stryMutAct_9fa48("26151") ? (!equal(state.sessionId, frame.sessionId) || state.profile !== frame.profile) && state.total !== frame.total : stryMutAct_9fa48("26150") ? false : (stryCov_9fa48("26150", "26151"), (stryMutAct_9fa48("26153") ? !equal(state.sessionId, frame.sessionId) && state.profile !== frame.profile : stryMutAct_9fa48("26152") ? false : (stryCov_9fa48("26152", "26153"), (stryMutAct_9fa48("26154") ? equal(state.sessionId, frame.sessionId) : (stryCov_9fa48("26154"), !equal(state.sessionId, frame.sessionId))) || (stryMutAct_9fa48("26156") ? state.profile === frame.profile : stryMutAct_9fa48("26155") ? false : (stryCov_9fa48("26155", "26156"), state.profile !== frame.profile)))) || (stryMutAct_9fa48("26158") ? state.total === frame.total : stryMutAct_9fa48("26157") ? false : (stryCov_9fa48("26157", "26158"), state.total !== frame.total)))) || (stryMutAct_9fa48("26160") ? state.totalLength === frame.totalLength : stryMutAct_9fa48("26159") ? false : (stryCov_9fa48("26159", "26160"), state.totalLength !== frame.totalLength)))) || (stryMutAct_9fa48("26162") ? state.payloadCrc32 === frame.payloadCrc32 : stryMutAct_9fa48("26161") ? false : (stryCov_9fa48("26161", "26162"), state.payloadCrc32 !== frame.payloadCrc32)))))) throw new PeerAudioFrameError(stryMutAct_9fa48("26163") ? "" : (stryCov_9fa48("26163"), "MIXED_SESSION"), stryMutAct_9fa48("26164") ? "" : (stryCov_9fa48("26164"), "Mixed peer audio sessions"));
    const chunks = new Map(state.chunks);
    let parity = state.parity;
    if (stryMutAct_9fa48("26166") ? false : stryMutAct_9fa48("26165") ? true : (stryCov_9fa48("26165", "26166"), frame.parity)) {
      if (stryMutAct_9fa48("26167")) {
        {}
      } else {
        stryCov_9fa48("26167");
        if (stryMutAct_9fa48("26170") ? parity !== null || !equal(parity, frame.payload) : stryMutAct_9fa48("26169") ? false : stryMutAct_9fa48("26168") ? true : (stryCov_9fa48("26168", "26169", "26170"), (stryMutAct_9fa48("26172") ? parity === null : stryMutAct_9fa48("26171") ? true : (stryCov_9fa48("26171", "26172"), parity !== null)) && (stryMutAct_9fa48("26173") ? equal(parity, frame.payload) : (stryCov_9fa48("26173"), !equal(parity, frame.payload))))) throw new PeerAudioFrameError(stryMutAct_9fa48("26174") ? "" : (stryCov_9fa48("26174"), "MALFORMED"), stryMutAct_9fa48("26175") ? "" : (stryCov_9fa48("26175"), "Conflicting peer audio parity frame"));
        parity = frame.payload;
      }
    } else {
      if (stryMutAct_9fa48("26176")) {
        {}
      } else {
        stryCov_9fa48("26176");
        const existing = chunks.get(frame.sequence);
        if (stryMutAct_9fa48("26179") ? existing !== undefined || !equal(existing, frame.payload) : stryMutAct_9fa48("26178") ? false : stryMutAct_9fa48("26177") ? true : (stryCov_9fa48("26177", "26178", "26179"), (stryMutAct_9fa48("26181") ? existing === undefined : stryMutAct_9fa48("26180") ? true : (stryCov_9fa48("26180", "26181"), existing !== undefined)) && (stryMutAct_9fa48("26182") ? equal(existing, frame.payload) : (stryCov_9fa48("26182"), !equal(existing, frame.payload))))) throw new PeerAudioFrameError(stryMutAct_9fa48("26183") ? "" : (stryCov_9fa48("26183"), "MALFORMED"), stryMutAct_9fa48("26184") ? "" : (stryCov_9fa48("26184"), "Conflicting peer audio frame"));
        chunks.set(frame.sequence, frame.payload);
      }
    }
    const next: PeerAudioAssemblyState = stryMutAct_9fa48("26185") ? {} : (stryCov_9fa48("26185"), {
      expiresAt: state.expiresAt,
      profile: frame.profile,
      sessionId: frame.sessionId,
      total: frame.total,
      totalLength: frame.totalLength,
      payloadCrc32: frame.payloadCrc32,
      chunks,
      parity
    });
    let recovered = stryMutAct_9fa48("26186") ? true : (stryCov_9fa48("26186"), false);
    if (stryMutAct_9fa48("26189") ? chunks.size === frame.total - 1 || parity !== null : stryMutAct_9fa48("26188") ? false : stryMutAct_9fa48("26187") ? true : (stryCov_9fa48("26187", "26188", "26189"), (stryMutAct_9fa48("26191") ? chunks.size !== frame.total - 1 : stryMutAct_9fa48("26190") ? true : (stryCov_9fa48("26190", "26191"), chunks.size === (stryMutAct_9fa48("26192") ? frame.total + 1 : (stryCov_9fa48("26192"), frame.total - 1)))) && (stryMutAct_9fa48("26194") ? parity === null : stryMutAct_9fa48("26193") ? true : (stryCov_9fa48("26193", "26194"), parity !== null)))) {
      if (stryMutAct_9fa48("26195")) {
        {}
      } else {
        stryCov_9fa48("26195");
        const missing = Array.from(stryMutAct_9fa48("26196") ? {} : (stryCov_9fa48("26196"), {
          length: frame.total
        }), stryMutAct_9fa48("26197") ? () => undefined : (stryCov_9fa48("26197"), (_, index) => index)).find(stryMutAct_9fa48("26198") ? () => undefined : (stryCov_9fa48("26198"), index => stryMutAct_9fa48("26199") ? chunks.has(index) : (stryCov_9fa48("26199"), !chunks.has(index))));
        if (stryMutAct_9fa48("26202") ? missing === undefined : stryMutAct_9fa48("26201") ? false : stryMutAct_9fa48("26200") ? true : (stryCov_9fa48("26200", "26201", "26202"), missing !== undefined)) {
          if (stryMutAct_9fa48("26203")) {
            {}
          } else {
            stryCov_9fa48("26203");
            const restored = stryMutAct_9fa48("26204") ? parity : (stryCov_9fa48("26204"), parity.slice());
            for (const chunk of chunks.values()) for (let index = 0; stryMutAct_9fa48("26207") ? index >= chunk.length : stryMutAct_9fa48("26206") ? index <= chunk.length : stryMutAct_9fa48("26205") ? false : (stryCov_9fa48("26205", "26206", "26207"), index < chunk.length); stryMutAct_9fa48("26208") ? index -= 1 : (stryCov_9fa48("26208"), index += 1)) restored[index] = (stryMutAct_9fa48("26209") ? restored[index] && 0 : (stryCov_9fa48("26209"), restored[index] ?? 0)) ^ (stryMutAct_9fa48("26210") ? chunk[index] && 0 : (stryCov_9fa48("26210"), chunk[index] ?? 0));
            const expectedLength = (stryMutAct_9fa48("26213") ? missing !== frame.total - 1 : stryMutAct_9fa48("26212") ? false : stryMutAct_9fa48("26211") ? true : (stryCov_9fa48("26211", "26212", "26213"), missing === (stryMutAct_9fa48("26214") ? frame.total + 1 : (stryCov_9fa48("26214"), frame.total - 1)))) ? stryMutAct_9fa48("26215") ? frame.totalLength + missing * parity.length : (stryCov_9fa48("26215"), frame.totalLength - (stryMutAct_9fa48("26216") ? missing / parity.length : (stryCov_9fa48("26216"), missing * parity.length))) : parity.length;
            chunks.set(missing, stryMutAct_9fa48("26217") ? restored : (stryCov_9fa48("26217"), restored.slice(0, expectedLength)));
            recovered = stryMutAct_9fa48("26218") ? false : (stryCov_9fa48("26218"), true);
          }
        }
      }
    }
    if (stryMutAct_9fa48("26221") ? chunks.size === frame.total : stryMutAct_9fa48("26220") ? false : stryMutAct_9fa48("26219") ? true : (stryCov_9fa48("26219", "26220", "26221"), chunks.size !== frame.total)) return stryMutAct_9fa48("26222") ? {} : (stryCov_9fa48("26222"), {
      state: stryMutAct_9fa48("26223") ? {} : (stryCov_9fa48("26223"), {
        ...next,
        chunks
      }),
      payload: null,
      received: chunks.size,
      total: frame.total,
      recovered
    });
    const payload = new Uint8Array(frame.totalLength);
    let offset = 0;
    for (let index = 0; stryMutAct_9fa48("26226") ? index >= frame.total : stryMutAct_9fa48("26225") ? index <= frame.total : stryMutAct_9fa48("26224") ? false : (stryCov_9fa48("26224", "26225", "26226"), index < frame.total); stryMutAct_9fa48("26227") ? index -= 1 : (stryCov_9fa48("26227"), index += 1)) {
      if (stryMutAct_9fa48("26228")) {
        {}
      } else {
        stryCov_9fa48("26228");
        const chunk = chunks.get(index);
        if (stryMutAct_9fa48("26231") ? chunk === undefined && offset + chunk.length > payload.length : stryMutAct_9fa48("26230") ? false : stryMutAct_9fa48("26229") ? true : (stryCov_9fa48("26229", "26230", "26231"), (stryMutAct_9fa48("26233") ? chunk !== undefined : stryMutAct_9fa48("26232") ? false : (stryCov_9fa48("26232", "26233"), chunk === undefined)) || (stryMutAct_9fa48("26236") ? offset + chunk.length <= payload.length : stryMutAct_9fa48("26235") ? offset + chunk.length >= payload.length : stryMutAct_9fa48("26234") ? false : (stryCov_9fa48("26234", "26235", "26236"), (stryMutAct_9fa48("26237") ? offset - chunk.length : (stryCov_9fa48("26237"), offset + chunk.length)) > payload.length)))) throw new PeerAudioFrameError(stryMutAct_9fa48("26238") ? "" : (stryCov_9fa48("26238"), "MALFORMED"), stryMutAct_9fa48("26239") ? "" : (stryCov_9fa48("26239"), "Invalid peer audio chunk layout"));
        payload.set(chunk, offset);
        stryMutAct_9fa48("26240") ? offset -= chunk.length : (stryCov_9fa48("26240"), offset += chunk.length);
      }
    }
    if (stryMutAct_9fa48("26243") ? offset !== payload.length && crc32(payload) !== frame.payloadCrc32 : stryMutAct_9fa48("26242") ? false : stryMutAct_9fa48("26241") ? true : (stryCov_9fa48("26241", "26242", "26243"), (stryMutAct_9fa48("26245") ? offset === payload.length : stryMutAct_9fa48("26244") ? false : (stryCov_9fa48("26244", "26245"), offset !== payload.length)) || (stryMutAct_9fa48("26247") ? crc32(payload) === frame.payloadCrc32 : stryMutAct_9fa48("26246") ? false : (stryCov_9fa48("26246", "26247"), crc32(payload) !== frame.payloadCrc32)))) throw new PeerAudioFrameError(stryMutAct_9fa48("26248") ? "" : (stryCov_9fa48("26248"), "CRC"), stryMutAct_9fa48("26249") ? "" : (stryCov_9fa48("26249"), "Peer audio payload CRC mismatch"));
    return stryMutAct_9fa48("26250") ? {} : (stryCov_9fa48("26250"), {
      state: stryMutAct_9fa48("26251") ? {} : (stryCov_9fa48("26251"), {
        ...next,
        chunks
      }),
      payload,
      received: chunks.size,
      total: frame.total,
      recovered
    });
  }
}