/**
 * Device stream sidecar framing — compact binary frames for raw sample data.
 * Control messages are forbidden on this channel (enforced by message kind).
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
const MAGIC_V1 = new Uint8Array(stryMutAct_9fa48("8174") ? [] : (stryCov_9fa48("8174"), [0x54, 0x50, 0x44, 0x31])); // TPD1
const MAGIC_V2 = new Uint8Array(stryMutAct_9fa48("8175") ? [] : (stryCov_9fa48("8175"), [0x54, 0x50, 0x44, 0x32])); // TPD2
const HEADER_BYTES_V1 = 24;
const HEADER_BYTES_V2 = 36;
export const MAX_DEVICE_STREAM_PAYLOAD_BYTES = 1_048_576;
export const MAX_DEVICE_STREAM_CHUNK_BYTES = 65_536;
export type DeviceStreamSampleKind = 1 | 2 | 3 | 4 | 5;
/** 1=camera-frame, 2=pcm, 3=motion-samples, 4=screen-frame, 5=derived-event */

export const DEVICE_STREAM_KIND = {
  cameraFrame: 1,
  pcm: 2,
  motionSamples: 3,
  screenFrame: 4,
  derivedEvent: 5
} as const;
interface DeviceStreamFrameBase {
  readonly sampleKind: DeviceStreamSampleKind;
  readonly sessionToken: number;
  readonly sequence: number;
  readonly payload: Uint8Array;
}
export type DeviceStreamFrame = (DeviceStreamFrameBase & {
  readonly version: 1;
}) | (DeviceStreamFrameBase & {
  readonly version: 2;
  readonly captureAtUs: number;
  readonly clockId: number;
});
export class DeviceStreamFrameError extends Error {
  constructor(readonly code: "MALFORMED" | "OVERSIZED" | "CONTROL_FORBIDDEN", message: string) {
    super(message);
    this.name = stryMutAct_9fa48("8176") ? "" : (stryCov_9fa48("8176"), "DeviceStreamFrameError");
  }
}
export function encodeDeviceStreamFrame(frame: DeviceStreamFrame): Uint8Array {
  if (stryMutAct_9fa48("8177")) {
    {}
  } else {
    stryCov_9fa48("8177");
    if (stryMutAct_9fa48("8180") ? frame.version !== 1 || frame.version !== 2 : stryMutAct_9fa48("8179") ? false : stryMutAct_9fa48("8178") ? true : (stryCov_9fa48("8178", "8179", "8180"), (stryMutAct_9fa48("8182") ? frame.version === 1 : stryMutAct_9fa48("8181") ? true : (stryCov_9fa48("8181", "8182"), frame.version !== 1)) && (stryMutAct_9fa48("8184") ? frame.version === 2 : stryMutAct_9fa48("8183") ? true : (stryCov_9fa48("8183", "8184"), frame.version !== 2)))) {
      if (stryMutAct_9fa48("8185")) {
        {}
      } else {
        stryCov_9fa48("8185");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8186") ? "" : (stryCov_9fa48("8186"), "MALFORMED"), stryMutAct_9fa48("8187") ? "" : (stryCov_9fa48("8187"), "Unsupported device stream version."));
      }
    }
    if (stryMutAct_9fa48("8190") ? false : stryMutAct_9fa48("8189") ? true : stryMutAct_9fa48("8188") ? [1, 2, 3, 4, 5].includes(frame.sampleKind) : (stryCov_9fa48("8188", "8189", "8190"), !(stryMutAct_9fa48("8191") ? [] : (stryCov_9fa48("8191"), [1, 2, 3, 4, 5])).includes(frame.sampleKind))) {
      if (stryMutAct_9fa48("8192")) {
        {}
      } else {
        stryCov_9fa48("8192");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8193") ? "" : (stryCov_9fa48("8193"), "CONTROL_FORBIDDEN"), stryMutAct_9fa48("8194") ? "" : (stryCov_9fa48("8194"), "Device stream sidecar refuses control messages."));
      }
    }
    if (stryMutAct_9fa48("8197") ? !Number.isSafeInteger(frame.sessionToken) && frame.sessionToken < 0 : stryMutAct_9fa48("8196") ? false : stryMutAct_9fa48("8195") ? true : (stryCov_9fa48("8195", "8196", "8197"), (stryMutAct_9fa48("8198") ? Number.isSafeInteger(frame.sessionToken) : (stryCov_9fa48("8198"), !Number.isSafeInteger(frame.sessionToken))) || (stryMutAct_9fa48("8201") ? frame.sessionToken >= 0 : stryMutAct_9fa48("8200") ? frame.sessionToken <= 0 : stryMutAct_9fa48("8199") ? false : (stryCov_9fa48("8199", "8200", "8201"), frame.sessionToken < 0)))) {
      if (stryMutAct_9fa48("8202")) {
        {}
      } else {
        stryCov_9fa48("8202");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8203") ? "" : (stryCov_9fa48("8203"), "MALFORMED"), stryMutAct_9fa48("8204") ? "" : (stryCov_9fa48("8204"), "Invalid session token."));
      }
    }
    if (stryMutAct_9fa48("8207") ? !Number.isSafeInteger(frame.sequence) && frame.sequence < 0 : stryMutAct_9fa48("8206") ? false : stryMutAct_9fa48("8205") ? true : (stryCov_9fa48("8205", "8206", "8207"), (stryMutAct_9fa48("8208") ? Number.isSafeInteger(frame.sequence) : (stryCov_9fa48("8208"), !Number.isSafeInteger(frame.sequence))) || (stryMutAct_9fa48("8211") ? frame.sequence >= 0 : stryMutAct_9fa48("8210") ? frame.sequence <= 0 : stryMutAct_9fa48("8209") ? false : (stryCov_9fa48("8209", "8210", "8211"), frame.sequence < 0)))) {
      if (stryMutAct_9fa48("8212")) {
        {}
      } else {
        stryCov_9fa48("8212");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8213") ? "" : (stryCov_9fa48("8213"), "MALFORMED"), stryMutAct_9fa48("8214") ? "" : (stryCov_9fa48("8214"), "Invalid sequence."));
      }
    }
    if (stryMutAct_9fa48("8218") ? frame.payload.length <= MAX_DEVICE_STREAM_PAYLOAD_BYTES : stryMutAct_9fa48("8217") ? frame.payload.length >= MAX_DEVICE_STREAM_PAYLOAD_BYTES : stryMutAct_9fa48("8216") ? false : stryMutAct_9fa48("8215") ? true : (stryCov_9fa48("8215", "8216", "8217", "8218"), frame.payload.length > MAX_DEVICE_STREAM_PAYLOAD_BYTES)) {
      if (stryMutAct_9fa48("8219")) {
        {}
      } else {
        stryCov_9fa48("8219");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8220") ? "" : (stryCov_9fa48("8220"), "OVERSIZED"), stryMutAct_9fa48("8221") ? "" : (stryCov_9fa48("8221"), "Device stream payload exceeds max size."));
      }
    }
    const headerBytes = (stryMutAct_9fa48("8224") ? frame.version !== 1 : stryMutAct_9fa48("8223") ? false : stryMutAct_9fa48("8222") ? true : (stryCov_9fa48("8222", "8223", "8224"), frame.version === 1)) ? HEADER_BYTES_V1 : HEADER_BYTES_V2;
    const body = new Uint8Array(stryMutAct_9fa48("8225") ? headerBytes - frame.payload.length : (stryCov_9fa48("8225"), headerBytes + frame.payload.length));
    body.set((stryMutAct_9fa48("8228") ? frame.version !== 1 : stryMutAct_9fa48("8227") ? false : stryMutAct_9fa48("8226") ? true : (stryCov_9fa48("8226", "8227", "8228"), frame.version === 1)) ? MAGIC_V1 : MAGIC_V2, 0);
    body[4] = frame.version;
    body[5] = frame.sampleKind;
    const view = new DataView(body.buffer);
    view.setUint32(8, frame.sessionToken >>> 0, stryMutAct_9fa48("8229") ? true : (stryCov_9fa48("8229"), false));
    view.setUint32(12, frame.sequence >>> 0, stryMutAct_9fa48("8230") ? true : (stryCov_9fa48("8230"), false));
    view.setUint32(16, frame.payload.length >>> 0, stryMutAct_9fa48("8231") ? true : (stryCov_9fa48("8231"), false));
    view.setUint32(20, crc32(frame.payload), stryMutAct_9fa48("8232") ? true : (stryCov_9fa48("8232"), false));
    if (stryMutAct_9fa48("8235") ? frame.version !== 2 : stryMutAct_9fa48("8234") ? false : stryMutAct_9fa48("8233") ? true : (stryCov_9fa48("8233", "8234", "8235"), frame.version === 2)) {
      if (stryMutAct_9fa48("8236")) {
        {}
      } else {
        stryCov_9fa48("8236");
        if (stryMutAct_9fa48("8239") ? !Number.isSafeInteger(frame.captureAtUs) && frame.captureAtUs < 0 : stryMutAct_9fa48("8238") ? false : stryMutAct_9fa48("8237") ? true : (stryCov_9fa48("8237", "8238", "8239"), (stryMutAct_9fa48("8240") ? Number.isSafeInteger(frame.captureAtUs) : (stryCov_9fa48("8240"), !Number.isSafeInteger(frame.captureAtUs))) || (stryMutAct_9fa48("8243") ? frame.captureAtUs >= 0 : stryMutAct_9fa48("8242") ? frame.captureAtUs <= 0 : stryMutAct_9fa48("8241") ? false : (stryCov_9fa48("8241", "8242", "8243"), frame.captureAtUs < 0)))) {
          if (stryMutAct_9fa48("8244")) {
            {}
          } else {
            stryCov_9fa48("8244");
            throw new DeviceStreamFrameError(stryMutAct_9fa48("8245") ? "" : (stryCov_9fa48("8245"), "MALFORMED"), stryMutAct_9fa48("8246") ? "" : (stryCov_9fa48("8246"), "Invalid capture timestamp."));
          }
        }
        if (stryMutAct_9fa48("8249") ? (!Number.isSafeInteger(frame.clockId) || frame.clockId < 0) && frame.clockId > 0xffff_ffff : stryMutAct_9fa48("8248") ? false : stryMutAct_9fa48("8247") ? true : (stryCov_9fa48("8247", "8248", "8249"), (stryMutAct_9fa48("8251") ? !Number.isSafeInteger(frame.clockId) && frame.clockId < 0 : stryMutAct_9fa48("8250") ? false : (stryCov_9fa48("8250", "8251"), (stryMutAct_9fa48("8252") ? Number.isSafeInteger(frame.clockId) : (stryCov_9fa48("8252"), !Number.isSafeInteger(frame.clockId))) || (stryMutAct_9fa48("8255") ? frame.clockId >= 0 : stryMutAct_9fa48("8254") ? frame.clockId <= 0 : stryMutAct_9fa48("8253") ? false : (stryCov_9fa48("8253", "8254", "8255"), frame.clockId < 0)))) || (stryMutAct_9fa48("8258") ? frame.clockId <= 0xffff_ffff : stryMutAct_9fa48("8257") ? frame.clockId >= 0xffff_ffff : stryMutAct_9fa48("8256") ? false : (stryCov_9fa48("8256", "8257", "8258"), frame.clockId > 0xffff_ffff)))) {
          if (stryMutAct_9fa48("8259")) {
            {}
          } else {
            stryCov_9fa48("8259");
            throw new DeviceStreamFrameError(stryMutAct_9fa48("8260") ? "" : (stryCov_9fa48("8260"), "MALFORMED"), stryMutAct_9fa48("8261") ? "" : (stryCov_9fa48("8261"), "Invalid clock id."));
          }
        }
        view.setBigUint64(24, BigInt(frame.captureAtUs), stryMutAct_9fa48("8262") ? true : (stryCov_9fa48("8262"), false));
        view.setUint32(32, frame.clockId, stryMutAct_9fa48("8263") ? true : (stryCov_9fa48("8263"), false));
      }
    }
    body.set(frame.payload, headerBytes);
    return body;
  }
}
export function decodeDeviceStreamFrame(bytes: Uint8Array): DeviceStreamFrame {
  if (stryMutAct_9fa48("8264")) {
    {}
  } else {
    stryCov_9fa48("8264");
    if (stryMutAct_9fa48("8268") ? bytes.length >= HEADER_BYTES_V1 : stryMutAct_9fa48("8267") ? bytes.length <= HEADER_BYTES_V1 : stryMutAct_9fa48("8266") ? false : stryMutAct_9fa48("8265") ? true : (stryCov_9fa48("8265", "8266", "8267", "8268"), bytes.length < HEADER_BYTES_V1)) {
      if (stryMutAct_9fa48("8269")) {
        {}
      } else {
        stryCov_9fa48("8269");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8270") ? "" : (stryCov_9fa48("8270"), "MALFORMED"), stryMutAct_9fa48("8271") ? "" : (stryCov_9fa48("8271"), "Device stream frame too short."));
      }
    }
    const isV1 = equal(bytes.subarray(0, 4), MAGIC_V1);
    const isV2 = equal(bytes.subarray(0, 4), MAGIC_V2);
    if (stryMutAct_9fa48("8274") ? !isV1 || !isV2 : stryMutAct_9fa48("8273") ? false : stryMutAct_9fa48("8272") ? true : (stryCov_9fa48("8272", "8273", "8274"), (stryMutAct_9fa48("8275") ? isV1 : (stryCov_9fa48("8275"), !isV1)) && (stryMutAct_9fa48("8276") ? isV2 : (stryCov_9fa48("8276"), !isV2)))) {
      if (stryMutAct_9fa48("8277")) {
        {}
      } else {
        stryCov_9fa48("8277");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8278") ? "" : (stryCov_9fa48("8278"), "MALFORMED"), stryMutAct_9fa48("8279") ? "" : (stryCov_9fa48("8279"), "Bad device stream magic."));
      }
    }
    const version = bytes[4];
    const sampleKind = bytes[5] as DeviceStreamSampleKind;
    if (stryMutAct_9fa48("8282") ? isV1 && version !== 1 && isV2 && version !== 2 : stryMutAct_9fa48("8281") ? false : stryMutAct_9fa48("8280") ? true : (stryCov_9fa48("8280", "8281", "8282"), (stryMutAct_9fa48("8284") ? isV1 || version !== 1 : stryMutAct_9fa48("8283") ? false : (stryCov_9fa48("8283", "8284"), isV1 && (stryMutAct_9fa48("8286") ? version === 1 : stryMutAct_9fa48("8285") ? true : (stryCov_9fa48("8285", "8286"), version !== 1)))) || (stryMutAct_9fa48("8288") ? isV2 || version !== 2 : stryMutAct_9fa48("8287") ? false : (stryCov_9fa48("8287", "8288"), isV2 && (stryMutAct_9fa48("8290") ? version === 2 : stryMutAct_9fa48("8289") ? true : (stryCov_9fa48("8289", "8290"), version !== 2)))))) {
      if (stryMutAct_9fa48("8291")) {
        {}
      } else {
        stryCov_9fa48("8291");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8292") ? "" : (stryCov_9fa48("8292"), "MALFORMED"), stryMutAct_9fa48("8293") ? "" : (stryCov_9fa48("8293"), "Unsupported device stream version."));
      }
    }
    // Kind 0 and any non-sample kind are treated as control and refused.
    if (stryMutAct_9fa48("8296") ? sampleKind < 1 && sampleKind > 5 : stryMutAct_9fa48("8295") ? false : stryMutAct_9fa48("8294") ? true : (stryCov_9fa48("8294", "8295", "8296"), (stryMutAct_9fa48("8299") ? sampleKind >= 1 : stryMutAct_9fa48("8298") ? sampleKind <= 1 : stryMutAct_9fa48("8297") ? false : (stryCov_9fa48("8297", "8298", "8299"), sampleKind < 1)) || (stryMutAct_9fa48("8302") ? sampleKind <= 5 : stryMutAct_9fa48("8301") ? sampleKind >= 5 : stryMutAct_9fa48("8300") ? false : (stryCov_9fa48("8300", "8301", "8302"), sampleKind > 5)))) {
      if (stryMutAct_9fa48("8303")) {
        {}
      } else {
        stryCov_9fa48("8303");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8304") ? "" : (stryCov_9fa48("8304"), "CONTROL_FORBIDDEN"), stryMutAct_9fa48("8305") ? "" : (stryCov_9fa48("8305"), "Device stream sidecar refuses control messages."));
      }
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const sessionToken = view.getUint32(8, stryMutAct_9fa48("8306") ? true : (stryCov_9fa48("8306"), false));
    const sequence = view.getUint32(12, stryMutAct_9fa48("8307") ? true : (stryCov_9fa48("8307"), false));
    const payloadLength = view.getUint32(16, stryMutAct_9fa48("8308") ? true : (stryCov_9fa48("8308"), false));
    const payloadCrc = view.getUint32(20, stryMutAct_9fa48("8309") ? true : (stryCov_9fa48("8309"), false));
    const headerBytes = (stryMutAct_9fa48("8312") ? version !== 1 : stryMutAct_9fa48("8311") ? false : stryMutAct_9fa48("8310") ? true : (stryCov_9fa48("8310", "8311", "8312"), version === 1)) ? HEADER_BYTES_V1 : HEADER_BYTES_V2;
    if (stryMutAct_9fa48("8315") ? bytes.length < headerBytes && payloadLength !== bytes.length - headerBytes : stryMutAct_9fa48("8314") ? false : stryMutAct_9fa48("8313") ? true : (stryCov_9fa48("8313", "8314", "8315"), (stryMutAct_9fa48("8318") ? bytes.length >= headerBytes : stryMutAct_9fa48("8317") ? bytes.length <= headerBytes : stryMutAct_9fa48("8316") ? false : (stryCov_9fa48("8316", "8317", "8318"), bytes.length < headerBytes)) || (stryMutAct_9fa48("8320") ? payloadLength === bytes.length - headerBytes : stryMutAct_9fa48("8319") ? false : (stryCov_9fa48("8319", "8320"), payloadLength !== (stryMutAct_9fa48("8321") ? bytes.length + headerBytes : (stryCov_9fa48("8321"), bytes.length - headerBytes)))))) {
      if (stryMutAct_9fa48("8322")) {
        {}
      } else {
        stryCov_9fa48("8322");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8323") ? "" : (stryCov_9fa48("8323"), "MALFORMED"), stryMutAct_9fa48("8324") ? "" : (stryCov_9fa48("8324"), "Device stream payload length mismatch."));
      }
    }
    if (stryMutAct_9fa48("8328") ? payloadLength <= MAX_DEVICE_STREAM_PAYLOAD_BYTES : stryMutAct_9fa48("8327") ? payloadLength >= MAX_DEVICE_STREAM_PAYLOAD_BYTES : stryMutAct_9fa48("8326") ? false : stryMutAct_9fa48("8325") ? true : (stryCov_9fa48("8325", "8326", "8327", "8328"), payloadLength > MAX_DEVICE_STREAM_PAYLOAD_BYTES)) {
      if (stryMutAct_9fa48("8329")) {
        {}
      } else {
        stryCov_9fa48("8329");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8330") ? "" : (stryCov_9fa48("8330"), "OVERSIZED"), stryMutAct_9fa48("8331") ? "" : (stryCov_9fa48("8331"), "Device stream payload exceeds max size."));
      }
    }
    const payload = stryMutAct_9fa48("8332") ? bytes : (stryCov_9fa48("8332"), bytes.slice(headerBytes));
    if (stryMutAct_9fa48("8335") ? crc32(payload) === payloadCrc : stryMutAct_9fa48("8334") ? false : stryMutAct_9fa48("8333") ? true : (stryCov_9fa48("8333", "8334", "8335"), crc32(payload) !== payloadCrc)) {
      if (stryMutAct_9fa48("8336")) {
        {}
      } else {
        stryCov_9fa48("8336");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8337") ? "" : (stryCov_9fa48("8337"), "MALFORMED"), stryMutAct_9fa48("8338") ? "" : (stryCov_9fa48("8338"), "Device stream payload CRC mismatch."));
      }
    }
    if (stryMutAct_9fa48("8341") ? version !== 1 : stryMutAct_9fa48("8340") ? false : stryMutAct_9fa48("8339") ? true : (stryCov_9fa48("8339", "8340", "8341"), version === 1)) return stryMutAct_9fa48("8342") ? {} : (stryCov_9fa48("8342"), {
      version: 1,
      sampleKind,
      sessionToken,
      sequence,
      payload
    });
    const captureAtUs = Number(view.getBigUint64(24, stryMutAct_9fa48("8343") ? true : (stryCov_9fa48("8343"), false)));
    if (stryMutAct_9fa48("8346") ? false : stryMutAct_9fa48("8345") ? true : stryMutAct_9fa48("8344") ? Number.isSafeInteger(captureAtUs) : (stryCov_9fa48("8344", "8345", "8346"), !Number.isSafeInteger(captureAtUs))) {
      if (stryMutAct_9fa48("8347")) {
        {}
      } else {
        stryCov_9fa48("8347");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8348") ? "" : (stryCov_9fa48("8348"), "MALFORMED"), stryMutAct_9fa48("8349") ? "" : (stryCov_9fa48("8349"), "Capture timestamp exceeds safe integer range."));
      }
    }
    return stryMutAct_9fa48("8350") ? {} : (stryCov_9fa48("8350"), {
      version: 2,
      sampleKind,
      sessionToken,
      sequence,
      captureAtUs,
      clockId: view.getUint32(32, stryMutAct_9fa48("8351") ? true : (stryCov_9fa48("8351"), false)),
      payload
    });
  }
}

/** Split a large payload into chunked sidecar frames (fixed header + payload). */
export function frameDeviceStreamPayload(sessionToken: number, sampleKind: DeviceStreamSampleKind, payload: Uint8Array, chunkBytes = MAX_DEVICE_STREAM_CHUNK_BYTES, timing: {
  readonly captureAtUs: number;
  readonly clockId: number;
} = stryMutAct_9fa48("8352") ? {} : (stryCov_9fa48("8352"), {
  captureAtUs: 0,
  clockId: 0
})): ReadonlyArray<Uint8Array> {
  if (stryMutAct_9fa48("8353")) {
    {}
  } else {
    stryCov_9fa48("8353");
    if (stryMutAct_9fa48("8357") ? payload.length >= 1 : stryMutAct_9fa48("8356") ? payload.length <= 1 : stryMutAct_9fa48("8355") ? false : stryMutAct_9fa48("8354") ? true : (stryCov_9fa48("8354", "8355", "8356", "8357"), payload.length < 1)) {
      if (stryMutAct_9fa48("8358")) {
        {}
      } else {
        stryCov_9fa48("8358");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8359") ? "" : (stryCov_9fa48("8359"), "MALFORMED"), stryMutAct_9fa48("8360") ? "" : (stryCov_9fa48("8360"), "Empty device stream payload."));
      }
    }
    if (stryMutAct_9fa48("8363") ? chunkBytes < 64 && chunkBytes > MAX_DEVICE_STREAM_CHUNK_BYTES : stryMutAct_9fa48("8362") ? false : stryMutAct_9fa48("8361") ? true : (stryCov_9fa48("8361", "8362", "8363"), (stryMutAct_9fa48("8366") ? chunkBytes >= 64 : stryMutAct_9fa48("8365") ? chunkBytes <= 64 : stryMutAct_9fa48("8364") ? false : (stryCov_9fa48("8364", "8365", "8366"), chunkBytes < 64)) || (stryMutAct_9fa48("8369") ? chunkBytes <= MAX_DEVICE_STREAM_CHUNK_BYTES : stryMutAct_9fa48("8368") ? chunkBytes >= MAX_DEVICE_STREAM_CHUNK_BYTES : stryMutAct_9fa48("8367") ? false : (stryCov_9fa48("8367", "8368", "8369"), chunkBytes > MAX_DEVICE_STREAM_CHUNK_BYTES)))) {
      if (stryMutAct_9fa48("8370")) {
        {}
      } else {
        stryCov_9fa48("8370");
        throw new DeviceStreamFrameError(stryMutAct_9fa48("8371") ? "" : (stryCov_9fa48("8371"), "OVERSIZED"), stryMutAct_9fa48("8372") ? "" : (stryCov_9fa48("8372"), "Invalid device stream chunk size."));
      }
    }
    const frames: Uint8Array[] = stryMutAct_9fa48("8373") ? ["Stryker was here"] : (stryCov_9fa48("8373"), []);
    let sequence = 0;
    for (let offset = 0; stryMutAct_9fa48("8376") ? offset >= payload.length : stryMutAct_9fa48("8375") ? offset <= payload.length : stryMutAct_9fa48("8374") ? false : (stryCov_9fa48("8374", "8375", "8376"), offset < payload.length); stryMutAct_9fa48("8377") ? offset -= chunkBytes : (stryCov_9fa48("8377"), offset += chunkBytes)) {
      if (stryMutAct_9fa48("8378")) {
        {}
      } else {
        stryCov_9fa48("8378");
        frames.push(encodeDeviceStreamFrame(stryMutAct_9fa48("8379") ? {} : (stryCov_9fa48("8379"), {
          version: 2,
          sampleKind,
          sessionToken,
          sequence,
          ...timing,
          payload: payload.subarray(offset, stryMutAct_9fa48("8380") ? Math.max(payload.length, offset + chunkBytes) : (stryCov_9fa48("8380"), Math.min(payload.length, stryMutAct_9fa48("8381") ? offset - chunkBytes : (stryCov_9fa48("8381"), offset + chunkBytes))))
        })));
        stryMutAct_9fa48("8382") ? sequence -= 1 : (stryCov_9fa48("8382"), sequence += 1);
      }
    }
    return frames;
  }
}
function equal(left: Uint8Array, right: Uint8Array): boolean {
  if (stryMutAct_9fa48("8383")) {
    {}
  } else {
    stryCov_9fa48("8383");
    if (stryMutAct_9fa48("8386") ? left.length === right.length : stryMutAct_9fa48("8385") ? false : stryMutAct_9fa48("8384") ? true : (stryCov_9fa48("8384", "8385", "8386"), left.length !== right.length)) return stryMutAct_9fa48("8387") ? true : (stryCov_9fa48("8387"), false);
    for (let i = 0; stryMutAct_9fa48("8390") ? i >= left.length : stryMutAct_9fa48("8389") ? i <= left.length : stryMutAct_9fa48("8388") ? false : (stryCov_9fa48("8388", "8389", "8390"), i < left.length); stryMutAct_9fa48("8391") ? i -= 1 : (stryCov_9fa48("8391"), i += 1)) {
      if (stryMutAct_9fa48("8392")) {
        {}
      } else {
        stryCov_9fa48("8392");
        if (stryMutAct_9fa48("8395") ? left[i] === right[i] : stryMutAct_9fa48("8394") ? false : stryMutAct_9fa48("8393") ? true : (stryCov_9fa48("8393", "8394", "8395"), left[i] !== right[i])) return stryMutAct_9fa48("8396") ? true : (stryCov_9fa48("8396"), false);
      }
    }
    return stryMutAct_9fa48("8397") ? false : (stryCov_9fa48("8397"), true);
  }
}
function crc32(bytes: Uint8Array): number {
  if (stryMutAct_9fa48("8398")) {
    {}
  } else {
    stryCov_9fa48("8398");
    let crc = 0xffff_ffff;
    for (const byte of bytes) {
      if (stryMutAct_9fa48("8399")) {
        {}
      } else {
        stryCov_9fa48("8399");
        crc ^= byte;
        for (let bit = 0; stryMutAct_9fa48("8402") ? bit >= 8 : stryMutAct_9fa48("8401") ? bit <= 8 : stryMutAct_9fa48("8400") ? false : (stryCov_9fa48("8400", "8401", "8402"), bit < 8); stryMutAct_9fa48("8403") ? bit -= 1 : (stryCov_9fa48("8403"), bit += 1)) {
          if (stryMutAct_9fa48("8404")) {
            {}
          } else {
            stryCov_9fa48("8404");
            crc = crc >>> 1 ^ (crc & 1 ? 0xedb8_8320 : 0);
          }
        }
      }
    }
    return (crc ^ 0xffff_ffff) >>> 0;
  }
}