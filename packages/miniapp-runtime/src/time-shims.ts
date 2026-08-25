/**
 * Sandbox clock and entropy shims. Date.now / Math.random / crypto.getRandomValues
 * become host-injected sources so a session can be recorded without wall-clock
 * or OS CSPRNG leaks. Recording itself is host-side and is not visible here.
 */

export interface TimeShimGlobal {
  Date: { now: () => number };
  Math: { random: () => number };
  crypto?: {
    getRandomValues: <T extends ArrayBufferView>(array: T) => T;
  };
}

export interface TimeShimOptions {
  readonly now: () => number;
  readonly randomBytes: (n: number) => Uint8Array;
  readonly recordClock?: () => void;
  readonly recordEntropy?: (byteCount: number) => void;
}

export interface TimeShimHandle {
  restore(): void;
}

const TIME_SHIM_FLAG = "__tpTimeShim";

/** Replace Date.now, Math.random, and crypto.getRandomValues on `target`. */
export function installTimeShims(
  target: TimeShimGlobal,
  options: TimeShimOptions,
): TimeShimHandle {
  const nativeNow = target.Date.now.bind(target.Date);
  const nativeRandom = target.Math.random.bind(target.Math);
  const nativeFill = target.crypto?.getRandomValues?.bind(target.crypto);

  const shimNow = () => {
    options.recordClock?.();
    return options.now();
  };
  Object.defineProperty(shimNow, TIME_SHIM_FLAG, { value: true });
  target.Date.now = shimNow;
  target.Math.random = () => {
    options.recordEntropy?.(8);
    const bytes = options.randomBytes(8);
    const view = new DataView(bytes.buffer, bytes.byteOffset, 8);
    const bits = view.getUint32(0, true) >>> 0;
    return bits / 0x1_0000_0000;
  };
  if (target.crypto !== undefined && nativeFill !== undefined) {
    target.crypto.getRandomValues = <T extends ArrayBufferView>(
      array: T,
    ): T => {
      options.recordEntropy?.(array.byteLength);
      const bytes = options.randomBytes(array.byteLength);
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(
        bytes,
      );
      return array;
    };
  }

  return {
    restore() {
      target.Date.now = nativeNow;
      target.Math.random = nativeRandom;
      if (target.crypto !== undefined && nativeFill !== undefined) {
        target.crypto.getRandomValues = nativeFill;
      }
    },
  };
}

export function isNativeDateNow(target: TimeShimGlobal): boolean {
  return !Object.prototype.hasOwnProperty.call(target.Date.now, TIME_SHIM_FLAG);
}

/** Worker-side snippet. `post` is `parentPort.postMessage` or `self.postMessage`. */
export function timeShimsFragment(post: string): string {
  return `
var ${TIME_SHIM_FLAG} = true;
var __tpClockMs = 0;
var __tpShimClock = true;
try {
  if (typeof workerData !== "undefined" && workerData) {
    if (typeof workerData.clockMs === "number") __tpClockMs = workerData.clockMs;
    if (workerData.shimClock === false) __tpShimClock = false;
  }
} catch (e) {}
var __tpEntropyState = (__tpClockMs + 0x9e3779b9) >>> 0;
function __tpRandomBytes(n) {
  var out = new Uint8Array(n);
  for (var i = 0; i < n; i++) {
    __tpEntropyState = (Math.imul(__tpEntropyState, 1664525) + 1013904223) >>> 0;
    out[i] = __tpEntropyState >>> 24;
  }
  return out;
}
function __tpInstallTimeShims() {
  if (!__tpShimClock) {
    ${post}({ type: "trace-probe", shimmed: false });
    return;
  }
  var NativeDateNow = Date.now.bind(Date);
  var NativeRandom = Math.random.bind(Math);
  var nativeCrypto = typeof crypto !== "undefined" ? crypto : null;
  var NativeFill = nativeCrypto && nativeCrypto.getRandomValues
    ? nativeCrypto.getRandomValues.bind(nativeCrypto)
    : null;
  Date.now = function () {
    ${post}({ type: "trace-clock" });
    return __tpClockMs;
  };
  Date.now.${TIME_SHIM_FLAG} = true;
  Math.random = function () {
    ${post}({ type: "trace-entropy", byteCount: 8 });
    var bytes = __tpRandomBytes(8);
    return bytes[0] / 256 + bytes[1] / 65536;
  };
  if (nativeCrypto && NativeFill) {
    nativeCrypto.getRandomValues = function (array) {
      ${post}({ type: "trace-entropy", byteCount: array.byteLength });
      var bytes = __tpRandomBytes(array.byteLength);
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(bytes);
      return array;
    };
  }
  ${post}({ type: "trace-probe", shimmed: true });
  void NativeDateNow;
  void NativeRandom;
}
function __tpHandleTimeShimMessage(message) {
  if (!message || typeof message !== "object") return false;
  if (message.type === "trace-set-clock" && typeof message.at === "number") {
    __tpClockMs = message.at;
    return true;
  }
  return false;
}
__tpInstallTimeShims();
`;
}

export function isSandboxTraceMessage(
  message: unknown,
): message is
  | { type: "trace-clock" }
  | { type: "trace-entropy"; byteCount: number }
  | { type: "trace-probe"; shimmed: boolean } {
  if (typeof message !== "object" || message === null) return false;
  const type = (message as { type?: unknown }).type;
  return (
    type === "trace-clock" || type === "trace-entropy" || type === "trace-probe"
  );
}
