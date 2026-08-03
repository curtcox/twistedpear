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
export const PEER_QR_FRAME_VERSION = 1;
export const MAX_PEER_QR_FRAME_PAYLOAD_BYTES = 256;
export const MAX_PEER_QR_FRAMES = 128;
export const MAX_PEER_QR_ASSEMBLED_BYTES = 16_384;
const MAGIC = new Uint8Array(stryMutAct_9fa48("27105") ? [] : (stryCov_9fa48("27105"), [0x54, 0x50, 0x51, 0x52])); // TPQR

export interface PeerQrFrame {
  readonly sessionId: Uint8Array;
  readonly sequence: number;
  readonly total: number;
  readonly payload: Uint8Array;
}
export class PeerQrFrameError extends Error {
  constructor(readonly code: "MALFORMED" | "CRC_MISMATCH" | "MIXED_SESSION" | "CONFLICTING_FRAME" | "EXPIRED" | "OVERSIZED", message: string) {
    super(message);
    this.name = stryMutAct_9fa48("27106") ? "" : (stryCov_9fa48("27106"), "PeerQrFrameError");
  }
}
function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (stryMutAct_9fa48("27107")) {
    {}
  } else {
    stryCov_9fa48("27107");
    if (stryMutAct_9fa48("27110") ? left.length === right.length : stryMutAct_9fa48("27109") ? false : stryMutAct_9fa48("27108") ? true : (stryCov_9fa48("27108", "27109", "27110"), left.length !== right.length)) return stryMutAct_9fa48("27111") ? true : (stryCov_9fa48("27111"), false);
    let difference = 0;
    for (let index = 0; stryMutAct_9fa48("27114") ? index >= left.length : stryMutAct_9fa48("27113") ? index <= left.length : stryMutAct_9fa48("27112") ? false : (stryCov_9fa48("27112", "27113", "27114"), index < left.length); stryMutAct_9fa48("27115") ? index -= 1 : (stryCov_9fa48("27115"), index += 1)) stryMutAct_9fa48("27116") ? difference &= (left[index] ?? 0) ^ (right[index] ?? 0) : (stryCov_9fa48("27116"), difference |= (stryMutAct_9fa48("27117") ? left[index] && 0 : (stryCov_9fa48("27117"), left[index] ?? 0)) ^ (stryMutAct_9fa48("27118") ? right[index] && 0 : (stryCov_9fa48("27118"), right[index] ?? 0)));
    return stryMutAct_9fa48("27121") ? difference !== 0 : stryMutAct_9fa48("27120") ? false : stryMutAct_9fa48("27119") ? true : (stryCov_9fa48("27119", "27120", "27121"), difference === 0);
  }
}
export function peerQrCrc32(bytes: Uint8Array): number {
  if (stryMutAct_9fa48("27122")) {
    {}
  } else {
    stryCov_9fa48("27122");
    let crc = 0xffff_ffff;
    for (const byte of bytes) {
      if (stryMutAct_9fa48("27123")) {
        {}
      } else {
        stryCov_9fa48("27123");
        crc ^= byte;
        for (let bit = 0; stryMutAct_9fa48("27126") ? bit >= 8 : stryMutAct_9fa48("27125") ? bit <= 8 : stryMutAct_9fa48("27124") ? false : (stryCov_9fa48("27124", "27125", "27126"), bit < 8); stryMutAct_9fa48("27127") ? bit -= 1 : (stryCov_9fa48("27127"), bit += 1)) crc = crc >>> 1 ^ 0xedb8_8320 & (stryMutAct_9fa48("27128") ? +(crc & 1) : (stryCov_9fa48("27128"), -(crc & 1)));
      }
    }
    return (crc ^ 0xffff_ffff) >>> 0;
  }
}
function validateFrame(frame: PeerQrFrame): void {
  if (stryMutAct_9fa48("27129")) {
    {}
  } else {
    stryCov_9fa48("27129");
    if (stryMutAct_9fa48("27132") ? frame.sessionId.length < 16 && frame.sessionId.length > 32 : stryMutAct_9fa48("27131") ? false : stryMutAct_9fa48("27130") ? true : (stryCov_9fa48("27130", "27131", "27132"), (stryMutAct_9fa48("27135") ? frame.sessionId.length >= 16 : stryMutAct_9fa48("27134") ? frame.sessionId.length <= 16 : stryMutAct_9fa48("27133") ? false : (stryCov_9fa48("27133", "27134", "27135"), frame.sessionId.length < 16)) || (stryMutAct_9fa48("27138") ? frame.sessionId.length <= 32 : stryMutAct_9fa48("27137") ? frame.sessionId.length >= 32 : stryMutAct_9fa48("27136") ? false : (stryCov_9fa48("27136", "27137", "27138"), frame.sessionId.length > 32)))) throw new PeerQrFrameError(stryMutAct_9fa48("27139") ? "" : (stryCov_9fa48("27139"), "MALFORMED"), stryMutAct_9fa48("27140") ? "" : (stryCov_9fa48("27140"), "QR session id must be 16..32 bytes"));
    if (stryMutAct_9fa48("27143") ? (!Number.isInteger(frame.total) || frame.total < 1) && frame.total > MAX_PEER_QR_FRAMES : stryMutAct_9fa48("27142") ? false : stryMutAct_9fa48("27141") ? true : (stryCov_9fa48("27141", "27142", "27143"), (stryMutAct_9fa48("27145") ? !Number.isInteger(frame.total) && frame.total < 1 : stryMutAct_9fa48("27144") ? false : (stryCov_9fa48("27144", "27145"), (stryMutAct_9fa48("27146") ? Number.isInteger(frame.total) : (stryCov_9fa48("27146"), !Number.isInteger(frame.total))) || (stryMutAct_9fa48("27149") ? frame.total >= 1 : stryMutAct_9fa48("27148") ? frame.total <= 1 : stryMutAct_9fa48("27147") ? false : (stryCov_9fa48("27147", "27148", "27149"), frame.total < 1)))) || (stryMutAct_9fa48("27152") ? frame.total <= MAX_PEER_QR_FRAMES : stryMutAct_9fa48("27151") ? frame.total >= MAX_PEER_QR_FRAMES : stryMutAct_9fa48("27150") ? false : (stryCov_9fa48("27150", "27151", "27152"), frame.total > MAX_PEER_QR_FRAMES)))) throw new PeerQrFrameError(stryMutAct_9fa48("27153") ? "" : (stryCov_9fa48("27153"), "MALFORMED"), stryMutAct_9fa48("27154") ? "" : (stryCov_9fa48("27154"), "invalid QR frame total"));
    if (stryMutAct_9fa48("27157") ? (!Number.isInteger(frame.sequence) || frame.sequence < 0) && frame.sequence >= frame.total : stryMutAct_9fa48("27156") ? false : stryMutAct_9fa48("27155") ? true : (stryCov_9fa48("27155", "27156", "27157"), (stryMutAct_9fa48("27159") ? !Number.isInteger(frame.sequence) && frame.sequence < 0 : stryMutAct_9fa48("27158") ? false : (stryCov_9fa48("27158", "27159"), (stryMutAct_9fa48("27160") ? Number.isInteger(frame.sequence) : (stryCov_9fa48("27160"), !Number.isInteger(frame.sequence))) || (stryMutAct_9fa48("27163") ? frame.sequence >= 0 : stryMutAct_9fa48("27162") ? frame.sequence <= 0 : stryMutAct_9fa48("27161") ? false : (stryCov_9fa48("27161", "27162", "27163"), frame.sequence < 0)))) || (stryMutAct_9fa48("27166") ? frame.sequence < frame.total : stryMutAct_9fa48("27165") ? frame.sequence > frame.total : stryMutAct_9fa48("27164") ? false : (stryCov_9fa48("27164", "27165", "27166"), frame.sequence >= frame.total)))) throw new PeerQrFrameError(stryMutAct_9fa48("27167") ? "" : (stryCov_9fa48("27167"), "MALFORMED"), stryMutAct_9fa48("27168") ? "" : (stryCov_9fa48("27168"), "invalid QR frame sequence"));
    if (stryMutAct_9fa48("27171") ? frame.payload.length < 1 && frame.payload.length > MAX_PEER_QR_FRAME_PAYLOAD_BYTES : stryMutAct_9fa48("27170") ? false : stryMutAct_9fa48("27169") ? true : (stryCov_9fa48("27169", "27170", "27171"), (stryMutAct_9fa48("27174") ? frame.payload.length >= 1 : stryMutAct_9fa48("27173") ? frame.payload.length <= 1 : stryMutAct_9fa48("27172") ? false : (stryCov_9fa48("27172", "27173", "27174"), frame.payload.length < 1)) || (stryMutAct_9fa48("27177") ? frame.payload.length <= MAX_PEER_QR_FRAME_PAYLOAD_BYTES : stryMutAct_9fa48("27176") ? frame.payload.length >= MAX_PEER_QR_FRAME_PAYLOAD_BYTES : stryMutAct_9fa48("27175") ? false : (stryCov_9fa48("27175", "27176", "27177"), frame.payload.length > MAX_PEER_QR_FRAME_PAYLOAD_BYTES)))) throw new PeerQrFrameError(stryMutAct_9fa48("27178") ? "" : (stryCov_9fa48("27178"), "MALFORMED"), stryMutAct_9fa48("27179") ? "" : (stryCov_9fa48("27179"), "invalid QR frame payload size"));
  }
}
export function encodePeerQrFrame(frame: PeerQrFrame): Uint8Array {
  if (stryMutAct_9fa48("27180")) {
    {}
  } else {
    stryCov_9fa48("27180");
    validateFrame(frame);
    const headerLength = stryMutAct_9fa48("27181") ? 12 - frame.sessionId.length : (stryCov_9fa48("27181"), 12 + frame.sessionId.length);
    const output = new Uint8Array(stryMutAct_9fa48("27182") ? headerLength + frame.payload.length - 4 : (stryCov_9fa48("27182"), (stryMutAct_9fa48("27183") ? headerLength - frame.payload.length : (stryCov_9fa48("27183"), headerLength + frame.payload.length)) + 4));
    output.set(MAGIC, 0);
    output[4] = PEER_QR_FRAME_VERSION;
    output[5] = frame.sessionId.length;
    const view = new DataView(output.buffer);
    view.setUint16(6, frame.sequence, stryMutAct_9fa48("27184") ? true : (stryCov_9fa48("27184"), false));
    view.setUint16(8, frame.total, stryMutAct_9fa48("27185") ? true : (stryCov_9fa48("27185"), false));
    view.setUint16(10, frame.payload.length, stryMutAct_9fa48("27186") ? true : (stryCov_9fa48("27186"), false));
    output.set(frame.sessionId, 12);
    output.set(frame.payload, headerLength);
    view.setUint32(stryMutAct_9fa48("27187") ? headerLength - frame.payload.length : (stryCov_9fa48("27187"), headerLength + frame.payload.length), peerQrCrc32(output.subarray(0, stryMutAct_9fa48("27188") ? headerLength - frame.payload.length : (stryCov_9fa48("27188"), headerLength + frame.payload.length))), stryMutAct_9fa48("27189") ? true : (stryCov_9fa48("27189"), false));
    return output;
  }
}
export function decodePeerQrFrame(bytes: Uint8Array): PeerQrFrame {
  if (stryMutAct_9fa48("27190")) {
    {}
  } else {
    stryCov_9fa48("27190");
    if (stryMutAct_9fa48("27193") ? (bytes.length < 33 || !sameBytes(bytes.subarray(0, 4), MAGIC)) && bytes[4] !== PEER_QR_FRAME_VERSION : stryMutAct_9fa48("27192") ? false : stryMutAct_9fa48("27191") ? true : (stryCov_9fa48("27191", "27192", "27193"), (stryMutAct_9fa48("27195") ? bytes.length < 33 && !sameBytes(bytes.subarray(0, 4), MAGIC) : stryMutAct_9fa48("27194") ? false : (stryCov_9fa48("27194", "27195"), (stryMutAct_9fa48("27198") ? bytes.length >= 33 : stryMutAct_9fa48("27197") ? bytes.length <= 33 : stryMutAct_9fa48("27196") ? false : (stryCov_9fa48("27196", "27197", "27198"), bytes.length < 33)) || (stryMutAct_9fa48("27199") ? sameBytes(bytes.subarray(0, 4), MAGIC) : (stryCov_9fa48("27199"), !sameBytes(bytes.subarray(0, 4), MAGIC))))) || (stryMutAct_9fa48("27201") ? bytes[4] === PEER_QR_FRAME_VERSION : stryMutAct_9fa48("27200") ? false : (stryCov_9fa48("27200", "27201"), bytes[4] !== PEER_QR_FRAME_VERSION)))) throw new PeerQrFrameError(stryMutAct_9fa48("27202") ? "" : (stryCov_9fa48("27202"), "MALFORMED"), stryMutAct_9fa48("27203") ? "" : (stryCov_9fa48("27203"), "invalid QR frame header"));
    const sessionLength = stryMutAct_9fa48("27204") ? bytes[5] && 0 : (stryCov_9fa48("27204"), bytes[5] ?? 0);
    if (stryMutAct_9fa48("27207") ? sessionLength < 16 && sessionLength > 32 : stryMutAct_9fa48("27206") ? false : stryMutAct_9fa48("27205") ? true : (stryCov_9fa48("27205", "27206", "27207"), (stryMutAct_9fa48("27210") ? sessionLength >= 16 : stryMutAct_9fa48("27209") ? sessionLength <= 16 : stryMutAct_9fa48("27208") ? false : (stryCov_9fa48("27208", "27209", "27210"), sessionLength < 16)) || (stryMutAct_9fa48("27213") ? sessionLength <= 32 : stryMutAct_9fa48("27212") ? sessionLength >= 32 : stryMutAct_9fa48("27211") ? false : (stryCov_9fa48("27211", "27212", "27213"), sessionLength > 32)))) throw new PeerQrFrameError(stryMutAct_9fa48("27214") ? "" : (stryCov_9fa48("27214"), "MALFORMED"), stryMutAct_9fa48("27215") ? "" : (stryCov_9fa48("27215"), "invalid QR session id length"));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const sequence = view.getUint16(6, stryMutAct_9fa48("27216") ? true : (stryCov_9fa48("27216"), false));
    const total = view.getUint16(8, stryMutAct_9fa48("27217") ? true : (stryCov_9fa48("27217"), false));
    const payloadLength = view.getUint16(10, stryMutAct_9fa48("27218") ? true : (stryCov_9fa48("27218"), false));
    const headerLength = stryMutAct_9fa48("27219") ? 12 - sessionLength : (stryCov_9fa48("27219"), 12 + sessionLength);
    if (stryMutAct_9fa48("27222") ? bytes.length === headerLength + payloadLength + 4 : stryMutAct_9fa48("27221") ? false : stryMutAct_9fa48("27220") ? true : (stryCov_9fa48("27220", "27221", "27222"), bytes.length !== (stryMutAct_9fa48("27223") ? headerLength + payloadLength - 4 : (stryCov_9fa48("27223"), (stryMutAct_9fa48("27224") ? headerLength - payloadLength : (stryCov_9fa48("27224"), headerLength + payloadLength)) + 4)))) throw new PeerQrFrameError(stryMutAct_9fa48("27225") ? "" : (stryCov_9fa48("27225"), "MALFORMED"), stryMutAct_9fa48("27226") ? "" : (stryCov_9fa48("27226"), "QR frame length mismatch"));
    const expected = view.getUint32(stryMutAct_9fa48("27227") ? bytes.length + 4 : (stryCov_9fa48("27227"), bytes.length - 4), stryMutAct_9fa48("27228") ? true : (stryCov_9fa48("27228"), false));
    if (stryMutAct_9fa48("27231") ? peerQrCrc32(bytes.subarray(0, -4)) === expected : stryMutAct_9fa48("27230") ? false : stryMutAct_9fa48("27229") ? true : (stryCov_9fa48("27229", "27230", "27231"), peerQrCrc32(bytes.subarray(0, stryMutAct_9fa48("27232") ? +4 : (stryCov_9fa48("27232"), -4))) !== expected)) throw new PeerQrFrameError(stryMutAct_9fa48("27233") ? "" : (stryCov_9fa48("27233"), "CRC_MISMATCH"), stryMutAct_9fa48("27234") ? "" : (stryCov_9fa48("27234"), "QR frame checksum mismatch"));
    const frame = stryMutAct_9fa48("27235") ? {} : (stryCov_9fa48("27235"), {
      sessionId: stryMutAct_9fa48("27236") ? bytes : (stryCov_9fa48("27236"), bytes.slice(12, headerLength)),
      sequence,
      total,
      payload: stryMutAct_9fa48("27237") ? bytes : (stryCov_9fa48("27237"), bytes.slice(headerLength, stryMutAct_9fa48("27238") ? +4 : (stryCov_9fa48("27238"), -4)))
    });
    validateFrame(frame);
    return frame;
  }
}
export function framePeerQrPayload(sessionId: Uint8Array, payload: Uint8Array, framePayloadBytes = MAX_PEER_QR_FRAME_PAYLOAD_BYTES): ReadonlyArray<Uint8Array> {
  if (stryMutAct_9fa48("27239")) {
    {}
  } else {
    stryCov_9fa48("27239");
    if (stryMutAct_9fa48("27242") ? payload.length < 1 && payload.length > MAX_PEER_QR_ASSEMBLED_BYTES : stryMutAct_9fa48("27241") ? false : stryMutAct_9fa48("27240") ? true : (stryCov_9fa48("27240", "27241", "27242"), (stryMutAct_9fa48("27245") ? payload.length >= 1 : stryMutAct_9fa48("27244") ? payload.length <= 1 : stryMutAct_9fa48("27243") ? false : (stryCov_9fa48("27243", "27244", "27245"), payload.length < 1)) || (stryMutAct_9fa48("27248") ? payload.length <= MAX_PEER_QR_ASSEMBLED_BYTES : stryMutAct_9fa48("27247") ? payload.length >= MAX_PEER_QR_ASSEMBLED_BYTES : stryMutAct_9fa48("27246") ? false : (stryCov_9fa48("27246", "27247", "27248"), payload.length > MAX_PEER_QR_ASSEMBLED_BYTES)))) throw new PeerQrFrameError(stryMutAct_9fa48("27249") ? "" : (stryCov_9fa48("27249"), "OVERSIZED"), stryMutAct_9fa48("27250") ? "" : (stryCov_9fa48("27250"), "QR payload exceeds assembly budget"));
    if (stryMutAct_9fa48("27253") ? (!Number.isInteger(framePayloadBytes) || framePayloadBytes < 1) && framePayloadBytes > MAX_PEER_QR_FRAME_PAYLOAD_BYTES : stryMutAct_9fa48("27252") ? false : stryMutAct_9fa48("27251") ? true : (stryCov_9fa48("27251", "27252", "27253"), (stryMutAct_9fa48("27255") ? !Number.isInteger(framePayloadBytes) && framePayloadBytes < 1 : stryMutAct_9fa48("27254") ? false : (stryCov_9fa48("27254", "27255"), (stryMutAct_9fa48("27256") ? Number.isInteger(framePayloadBytes) : (stryCov_9fa48("27256"), !Number.isInteger(framePayloadBytes))) || (stryMutAct_9fa48("27259") ? framePayloadBytes >= 1 : stryMutAct_9fa48("27258") ? framePayloadBytes <= 1 : stryMutAct_9fa48("27257") ? false : (stryCov_9fa48("27257", "27258", "27259"), framePayloadBytes < 1)))) || (stryMutAct_9fa48("27262") ? framePayloadBytes <= MAX_PEER_QR_FRAME_PAYLOAD_BYTES : stryMutAct_9fa48("27261") ? framePayloadBytes >= MAX_PEER_QR_FRAME_PAYLOAD_BYTES : stryMutAct_9fa48("27260") ? false : (stryCov_9fa48("27260", "27261", "27262"), framePayloadBytes > MAX_PEER_QR_FRAME_PAYLOAD_BYTES)))) throw new PeerQrFrameError(stryMutAct_9fa48("27263") ? "" : (stryCov_9fa48("27263"), "MALFORMED"), stryMutAct_9fa48("27264") ? "" : (stryCov_9fa48("27264"), "invalid QR chunk size"));
    const total = Math.ceil(stryMutAct_9fa48("27265") ? payload.length * framePayloadBytes : (stryCov_9fa48("27265"), payload.length / framePayloadBytes));
    if (stryMutAct_9fa48("27269") ? total <= MAX_PEER_QR_FRAMES : stryMutAct_9fa48("27268") ? total >= MAX_PEER_QR_FRAMES : stryMutAct_9fa48("27267") ? false : stryMutAct_9fa48("27266") ? true : (stryCov_9fa48("27266", "27267", "27268", "27269"), total > MAX_PEER_QR_FRAMES)) throw new PeerQrFrameError(stryMutAct_9fa48("27270") ? "" : (stryCov_9fa48("27270"), "OVERSIZED"), stryMutAct_9fa48("27271") ? "" : (stryCov_9fa48("27271"), "QR payload requires too many frames"));
    return Array.from(stryMutAct_9fa48("27272") ? {} : (stryCov_9fa48("27272"), {
      length: total
    }), stryMutAct_9fa48("27273") ? () => undefined : (stryCov_9fa48("27273"), (_, sequence) => encodePeerQrFrame(stryMutAct_9fa48("27274") ? {} : (stryCov_9fa48("27274"), {
      sessionId,
      sequence,
      total,
      payload: stryMutAct_9fa48("27275") ? payload : (stryCov_9fa48("27275"), payload.slice(stryMutAct_9fa48("27276") ? sequence / framePayloadBytes : (stryCov_9fa48("27276"), sequence * framePayloadBytes), stryMutAct_9fa48("27277") ? Math.max(payload.length, (sequence + 1) * framePayloadBytes) : (stryCov_9fa48("27277"), Math.min(payload.length, stryMutAct_9fa48("27278") ? (sequence + 1) / framePayloadBytes : (stryCov_9fa48("27278"), (stryMutAct_9fa48("27279") ? sequence - 1 : (stryCov_9fa48("27279"), sequence + 1)) * framePayloadBytes)))))
    }))));
  }
}
export interface PeerQrAssemblyState {
  readonly sessionId: Uint8Array | null;
  readonly total: number | null;
  readonly expiresAt: number;
  readonly chunks: ReadonlyArray<Uint8Array | null>;
  readonly received: number;
}
export type PeerQrAssemblyResult = {
  readonly state: PeerQrAssemblyState;
  readonly payload: Uint8Array | null;
};
export function initialPeerQrAssemblyState(expiresAt: number): PeerQrAssemblyState {
  if (stryMutAct_9fa48("27280")) {
    {}
  } else {
    stryCov_9fa48("27280");
    return stryMutAct_9fa48("27281") ? {} : (stryCov_9fa48("27281"), {
      sessionId: null,
      total: null,
      expiresAt,
      chunks: stryMutAct_9fa48("27282") ? ["Stryker was here"] : (stryCov_9fa48("27282"), []),
      received: 0
    });
  }
}
export function stepPeerQrAssembly(state: PeerQrAssemblyState, encodedFrame: Uint8Array, now: number): PeerQrAssemblyResult {
  if (stryMutAct_9fa48("27283")) {
    {}
  } else {
    stryCov_9fa48("27283");
    if (stryMutAct_9fa48("27287") ? now < state.expiresAt : stryMutAct_9fa48("27286") ? now > state.expiresAt : stryMutAct_9fa48("27285") ? false : stryMutAct_9fa48("27284") ? true : (stryCov_9fa48("27284", "27285", "27286", "27287"), now >= state.expiresAt)) throw new PeerQrFrameError(stryMutAct_9fa48("27288") ? "" : (stryCov_9fa48("27288"), "EXPIRED"), stryMutAct_9fa48("27289") ? "" : (stryCov_9fa48("27289"), "QR assembly expired"));
    const frame = decodePeerQrFrame(encodedFrame);
    if (stryMutAct_9fa48("27292") ? state.sessionId !== null || !sameBytes(state.sessionId, frame.sessionId) : stryMutAct_9fa48("27291") ? false : stryMutAct_9fa48("27290") ? true : (stryCov_9fa48("27290", "27291", "27292"), (stryMutAct_9fa48("27294") ? state.sessionId === null : stryMutAct_9fa48("27293") ? true : (stryCov_9fa48("27293", "27294"), state.sessionId !== null)) && (stryMutAct_9fa48("27295") ? sameBytes(state.sessionId, frame.sessionId) : (stryCov_9fa48("27295"), !sameBytes(state.sessionId, frame.sessionId))))) throw new PeerQrFrameError(stryMutAct_9fa48("27296") ? "" : (stryCov_9fa48("27296"), "MIXED_SESSION"), stryMutAct_9fa48("27297") ? "" : (stryCov_9fa48("27297"), "QR frames belong to different sessions"));
    if (stryMutAct_9fa48("27300") ? state.total !== null || state.total !== frame.total : stryMutAct_9fa48("27299") ? false : stryMutAct_9fa48("27298") ? true : (stryCov_9fa48("27298", "27299", "27300"), (stryMutAct_9fa48("27302") ? state.total === null : stryMutAct_9fa48("27301") ? true : (stryCov_9fa48("27301", "27302"), state.total !== null)) && (stryMutAct_9fa48("27304") ? state.total === frame.total : stryMutAct_9fa48("27303") ? true : (stryCov_9fa48("27303", "27304"), state.total !== frame.total)))) throw new PeerQrFrameError(stryMutAct_9fa48("27305") ? "" : (stryCov_9fa48("27305"), "MIXED_SESSION"), stryMutAct_9fa48("27306") ? "" : (stryCov_9fa48("27306"), "QR frame totals do not match"));
    const chunks = (stryMutAct_9fa48("27309") ? state.chunks.length !== 0 : stryMutAct_9fa48("27308") ? false : stryMutAct_9fa48("27307") ? true : (stryCov_9fa48("27307", "27308", "27309"), state.chunks.length === 0)) ? stryMutAct_9fa48("27310") ? Array().fill(null) : (stryCov_9fa48("27310"), Array<Uint8Array | null>(frame.total).fill(null)) : stryMutAct_9fa48("27311") ? [] : (stryCov_9fa48("27311"), [...state.chunks]);
    const existing = chunks[frame.sequence];
    if (stryMutAct_9fa48("27314") ? existing !== null || existing !== undefined : stryMutAct_9fa48("27313") ? false : stryMutAct_9fa48("27312") ? true : (stryCov_9fa48("27312", "27313", "27314"), (stryMutAct_9fa48("27316") ? existing === null : stryMutAct_9fa48("27315") ? true : (stryCov_9fa48("27315", "27316"), existing !== null)) && (stryMutAct_9fa48("27318") ? existing === undefined : stryMutAct_9fa48("27317") ? true : (stryCov_9fa48("27317", "27318"), existing !== undefined)))) {
      if (stryMutAct_9fa48("27319")) {
        {}
      } else {
        stryCov_9fa48("27319");
        if (stryMutAct_9fa48("27322") ? false : stryMutAct_9fa48("27321") ? true : stryMutAct_9fa48("27320") ? sameBytes(existing, frame.payload) : (stryCov_9fa48("27320", "27321", "27322"), !sameBytes(existing, frame.payload))) throw new PeerQrFrameError(stryMutAct_9fa48("27323") ? "" : (stryCov_9fa48("27323"), "CONFLICTING_FRAME"), stryMutAct_9fa48("27324") ? "" : (stryCov_9fa48("27324"), "duplicate QR frame has different payload"));
        return stryMutAct_9fa48("27325") ? {} : (stryCov_9fa48("27325"), {
          state,
          payload: null
        });
      }
    }
    chunks[frame.sequence] = frame.payload;
    const received = stryMutAct_9fa48("27326") ? state.received - 1 : (stryCov_9fa48("27326"), state.received + 1);
    const next: PeerQrAssemblyState = stryMutAct_9fa48("27327") ? {} : (stryCov_9fa48("27327"), {
      sessionId: frame.sessionId,
      total: frame.total,
      expiresAt: state.expiresAt,
      chunks,
      received
    });
    if (stryMutAct_9fa48("27330") ? received === frame.total : stryMutAct_9fa48("27329") ? false : stryMutAct_9fa48("27328") ? true : (stryCov_9fa48("27328", "27329", "27330"), received !== frame.total)) return stryMutAct_9fa48("27331") ? {} : (stryCov_9fa48("27331"), {
      state: next,
      payload: null
    });
    const size = chunks.reduce(stryMutAct_9fa48("27332") ? () => undefined : (stryCov_9fa48("27332"), (sum, chunk) => stryMutAct_9fa48("27333") ? sum - (chunk?.length ?? 0) : (stryCov_9fa48("27333"), sum + (stryMutAct_9fa48("27334") ? chunk?.length && 0 : (stryCov_9fa48("27334"), (stryMutAct_9fa48("27335") ? chunk.length : (stryCov_9fa48("27335"), chunk?.length)) ?? 0)))), 0);
    if (stryMutAct_9fa48("27339") ? size <= MAX_PEER_QR_ASSEMBLED_BYTES : stryMutAct_9fa48("27338") ? size >= MAX_PEER_QR_ASSEMBLED_BYTES : stryMutAct_9fa48("27337") ? false : stryMutAct_9fa48("27336") ? true : (stryCov_9fa48("27336", "27337", "27338", "27339"), size > MAX_PEER_QR_ASSEMBLED_BYTES)) throw new PeerQrFrameError(stryMutAct_9fa48("27340") ? "" : (stryCov_9fa48("27340"), "OVERSIZED"), stryMutAct_9fa48("27341") ? "" : (stryCov_9fa48("27341"), "assembled QR payload exceeds budget"));
    const payload = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      if (stryMutAct_9fa48("27342")) {
        {}
      } else {
        stryCov_9fa48("27342");
        if (stryMutAct_9fa48("27345") ? chunk !== null : stryMutAct_9fa48("27344") ? false : stryMutAct_9fa48("27343") ? true : (stryCov_9fa48("27343", "27344", "27345"), chunk === null)) throw new PeerQrFrameError(stryMutAct_9fa48("27346") ? "" : (stryCov_9fa48("27346"), "MALFORMED"), stryMutAct_9fa48("27347") ? "" : (stryCov_9fa48("27347"), "QR assembly is incomplete"));
        payload.set(chunk, offset);
        stryMutAct_9fa48("27348") ? offset -= chunk.length : (stryCov_9fa48("27348"), offset += chunk.length);
      }
    }
    return stryMutAct_9fa48("27349") ? {} : (stryCov_9fa48("27349"), {
      state: next,
      payload
    });
  }
}