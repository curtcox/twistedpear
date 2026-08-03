/**
 * Fingerprinting mitigations for raw device tiers.
 * Strip calibration / device-identity metadata before samples leave the host.
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
export interface RawCameraFrameInput {
  readonly width: number;
  readonly height: number;
  readonly format: "rgba8" | "yuv420" | "jpeg";
  readonly bytes: Uint8Array | ReadonlyArray<number>;
  /** Stripped — never forwarded to apps. */
  readonly deviceModel?: string;
  readonly sensorCalibration?: unknown;
  readonly lensIntrinsics?: unknown;
}
export interface RawCameraFrame {
  readonly width: number;
  readonly height: number;
  readonly format: "rgba8" | "yuv420" | "jpeg";
  readonly bytes: Uint8Array;
}
export interface RawPcmInput {
  readonly sampleRate: number;
  readonly channels: 1 | 2;
  readonly samples: Float32Array | ReadonlyArray<number>;
  readonly deviceId?: string;
  readonly hardwareLatencyMs?: number;
}
export interface RawPcmSample {
  readonly sampleRate: number;
  readonly channels: 1 | 2;
  readonly samples: ReadonlyArray<number>;
}
export interface RawMotionInput {
  readonly accel: readonly [number, number, number];
  readonly gyro: readonly [number, number, number];
  readonly mag?: readonly [number, number, number];
  readonly calibrationBias?: unknown;
  readonly deviceSerial?: string;
}
export interface RawMotionSampleOut {
  readonly accel: readonly [number, number, number];
  readonly gyro: readonly [number, number, number];
  readonly mag?: readonly [number, number, number];
}
export function sanitizeCameraFrame(input: RawCameraFrameInput): RawCameraFrame {
  if (stryMutAct_9fa48("7540")) {
    {}
  } else {
    stryCov_9fa48("7540");
    if (stryMutAct_9fa48("7543") ? (!Number.isFinite(input.width) || input.width < 1) && input.width > 4096 : stryMutAct_9fa48("7542") ? false : stryMutAct_9fa48("7541") ? true : (stryCov_9fa48("7541", "7542", "7543"), (stryMutAct_9fa48("7545") ? !Number.isFinite(input.width) && input.width < 1 : stryMutAct_9fa48("7544") ? false : (stryCov_9fa48("7544", "7545"), (stryMutAct_9fa48("7546") ? Number.isFinite(input.width) : (stryCov_9fa48("7546"), !Number.isFinite(input.width))) || (stryMutAct_9fa48("7549") ? input.width >= 1 : stryMutAct_9fa48("7548") ? input.width <= 1 : stryMutAct_9fa48("7547") ? false : (stryCov_9fa48("7547", "7548", "7549"), input.width < 1)))) || (stryMutAct_9fa48("7552") ? input.width <= 4096 : stryMutAct_9fa48("7551") ? input.width >= 4096 : stryMutAct_9fa48("7550") ? false : (stryCov_9fa48("7550", "7551", "7552"), input.width > 4096)))) {
      if (stryMutAct_9fa48("7553")) {
        {}
      } else {
        stryCov_9fa48("7553");
        throw new Error(stryMutAct_9fa48("7554") ? "" : (stryCov_9fa48("7554"), "invalid camera frame width"));
      }
    }
    if (stryMutAct_9fa48("7557") ? (!Number.isFinite(input.height) || input.height < 1) && input.height > 4096 : stryMutAct_9fa48("7556") ? false : stryMutAct_9fa48("7555") ? true : (stryCov_9fa48("7555", "7556", "7557"), (stryMutAct_9fa48("7559") ? !Number.isFinite(input.height) && input.height < 1 : stryMutAct_9fa48("7558") ? false : (stryCov_9fa48("7558", "7559"), (stryMutAct_9fa48("7560") ? Number.isFinite(input.height) : (stryCov_9fa48("7560"), !Number.isFinite(input.height))) || (stryMutAct_9fa48("7563") ? input.height >= 1 : stryMutAct_9fa48("7562") ? input.height <= 1 : stryMutAct_9fa48("7561") ? false : (stryCov_9fa48("7561", "7562", "7563"), input.height < 1)))) || (stryMutAct_9fa48("7566") ? input.height <= 4096 : stryMutAct_9fa48("7565") ? input.height >= 4096 : stryMutAct_9fa48("7564") ? false : (stryCov_9fa48("7564", "7565", "7566"), input.height > 4096)))) {
      if (stryMutAct_9fa48("7567")) {
        {}
      } else {
        stryCov_9fa48("7567");
        throw new Error(stryMutAct_9fa48("7568") ? "" : (stryCov_9fa48("7568"), "invalid camera frame height"));
      }
    }
    if (stryMutAct_9fa48("7571") ? false : stryMutAct_9fa48("7570") ? true : stryMutAct_9fa48("7569") ? ["rgba8", "yuv420", "jpeg"].includes(input.format) : (stryCov_9fa48("7569", "7570", "7571"), !(stryMutAct_9fa48("7572") ? [] : (stryCov_9fa48("7572"), [stryMutAct_9fa48("7573") ? "" : (stryCov_9fa48("7573"), "rgba8"), stryMutAct_9fa48("7574") ? "" : (stryCov_9fa48("7574"), "yuv420"), stryMutAct_9fa48("7575") ? "" : (stryCov_9fa48("7575"), "jpeg")])).includes(input.format))) {
      if (stryMutAct_9fa48("7576")) {
        {}
      } else {
        stryCov_9fa48("7576");
        throw new Error(stryMutAct_9fa48("7577") ? "" : (stryCov_9fa48("7577"), "invalid camera frame format"));
      }
    }
    return stryMutAct_9fa48("7578") ? {} : (stryCov_9fa48("7578"), {
      width: Math.floor(input.width),
      height: Math.floor(input.height),
      format: input.format,
      bytes: Uint8Array.from(input.bytes, stryMutAct_9fa48("7579") ? () => undefined : (stryCov_9fa48("7579"), value => Number.isFinite(value) ? stryMutAct_9fa48("7580") ? Math.min(0, Math.min(255, Math.floor(value))) : (stryCov_9fa48("7580"), Math.max(0, stryMutAct_9fa48("7581") ? Math.max(255, Math.floor(value)) : (stryCov_9fa48("7581"), Math.min(255, Math.floor(value))))) : 0))
    });
  }
}
export function sanitizePcmSample(input: RawPcmInput): RawPcmSample {
  if (stryMutAct_9fa48("7582")) {
    {}
  } else {
    stryCov_9fa48("7582");
    const allowedRates = new Set(stryMutAct_9fa48("7583") ? [] : (stryCov_9fa48("7583"), [8_000, 16_000, 22_050, 24_000, 44_100, 48_000]));
    if (stryMutAct_9fa48("7586") ? false : stryMutAct_9fa48("7585") ? true : stryMutAct_9fa48("7584") ? allowedRates.has(input.sampleRate) : (stryCov_9fa48("7584", "7585", "7586"), !allowedRates.has(input.sampleRate))) {
      if (stryMutAct_9fa48("7587")) {
        {}
      } else {
        stryCov_9fa48("7587");
        throw new Error(stryMutAct_9fa48("7588") ? "" : (stryCov_9fa48("7588"), "unsupported pcm sample rate"));
      }
    }
    if (stryMutAct_9fa48("7591") ? input.channels !== 1 || input.channels !== 2 : stryMutAct_9fa48("7590") ? false : stryMutAct_9fa48("7589") ? true : (stryCov_9fa48("7589", "7590", "7591"), (stryMutAct_9fa48("7593") ? input.channels === 1 : stryMutAct_9fa48("7592") ? true : (stryCov_9fa48("7592", "7593"), input.channels !== 1)) && (stryMutAct_9fa48("7595") ? input.channels === 2 : stryMutAct_9fa48("7594") ? true : (stryCov_9fa48("7594", "7595"), input.channels !== 2)))) {
      if (stryMutAct_9fa48("7596")) {
        {}
      } else {
        stryCov_9fa48("7596");
        throw new Error(stryMutAct_9fa48("7597") ? "" : (stryCov_9fa48("7597"), "pcm channels must be 1 or 2"));
      }
    }
    const samples = Array.from(input.samples, value => {
      if (stryMutAct_9fa48("7598")) {
        {}
      } else {
        stryCov_9fa48("7598");
        if (stryMutAct_9fa48("7601") ? false : stryMutAct_9fa48("7600") ? true : stryMutAct_9fa48("7599") ? Number.isFinite(value) : (stryCov_9fa48("7599", "7600", "7601"), !Number.isFinite(value))) return 0;
        return stryMutAct_9fa48("7602") ? Math.min(-1, Math.min(1, value)) : (stryCov_9fa48("7602"), Math.max(stryMutAct_9fa48("7603") ? +1 : (stryCov_9fa48("7603"), -1), stryMutAct_9fa48("7604") ? Math.max(1, value) : (stryCov_9fa48("7604"), Math.min(1, value))));
      }
    });
    return stryMutAct_9fa48("7605") ? {} : (stryCov_9fa48("7605"), {
      sampleRate: input.sampleRate,
      channels: input.channels,
      samples
    });
  }
}
export function sanitizeMotionSamples(input: RawMotionInput): RawMotionSampleOut {
  if (stryMutAct_9fa48("7606")) {
    {}
  } else {
    stryCov_9fa48("7606");
    const quantize = stryMutAct_9fa48("7607") ? () => undefined : (stryCov_9fa48("7607"), (() => {
      const quantize = (value: number) => stryMutAct_9fa48("7608") ? Math.round(value * 1_000) * 1_000 : (stryCov_9fa48("7608"), Math.round(stryMutAct_9fa48("7609") ? value / 1_000 : (stryCov_9fa48("7609"), value * 1_000)) / 1_000);
      return quantize;
    })());
    return stryMutAct_9fa48("7610") ? {} : (stryCov_9fa48("7610"), {
      accel: stryMutAct_9fa48("7611") ? [] : (stryCov_9fa48("7611"), [quantize(input.accel[0]), quantize(input.accel[1]), quantize(input.accel[2])]),
      gyro: stryMutAct_9fa48("7612") ? [] : (stryCov_9fa48("7612"), [quantize(input.gyro[0]), quantize(input.gyro[1]), quantize(input.gyro[2])]),
      ...((stryMutAct_9fa48("7615") ? input.mag === undefined : stryMutAct_9fa48("7614") ? false : stryMutAct_9fa48("7613") ? true : (stryCov_9fa48("7613", "7614", "7615"), input.mag !== undefined)) ? stryMutAct_9fa48("7616") ? {} : (stryCov_9fa48("7616"), {
        mag: [quantize(input.mag[0]), quantize(input.mag[1]), quantize(input.mag[2])] as const
      }) : {})
    });
  }
}