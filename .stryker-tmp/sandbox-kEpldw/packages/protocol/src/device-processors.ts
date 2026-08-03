/**
 * Host-side derived-tier processors. Pure over recorded sample tapes —
 * adapters supply raw readings; these never touch hardware.
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
export interface RawMotionSample {
  readonly accel: readonly [number, number, number];
  readonly gyro: readonly [number, number, number];
  readonly mag?: readonly [number, number, number];
}
export interface MotionDerivedSample {
  readonly orientation: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;
  };
  readonly events: ReadonlyArray<"step" | "shake" | "tilt">;
}
export interface CameraDerivedInput {
  readonly barcodes?: ReadonlyArray<{
    readonly format: string;
    readonly value: string;
  }>;
  readonly motionDetected?: boolean;
  readonly faceCount?: number;
  readonly objectCount?: number;
}
export interface CameraDerivedSample {
  readonly barcodes: ReadonlyArray<{
    readonly format: string;
    readonly value: string;
  }>;
  readonly motionDetected: boolean;
  readonly faceCount: number;
  readonly objectCount: number;
}
export interface MicrophoneDerivedInput {
  /** Interleaved PCM samples in [-1, 1], or a precomputed RMS level in [0, 1]. */
  readonly pcm?: ReadonlyArray<number>;
  readonly level?: number;
  readonly tones?: ReadonlyArray<string>;
}
export interface MicrophoneDerivedSample {
  readonly level: number;
  readonly voiceActive: boolean;
  readonly tones: ReadonlyArray<string>;
}
const SHAKE_ACCEL_THRESHOLD = 2.5;
const TILT_ACCEL_THRESHOLD = 0.7;
const STEP_ACCEL_THRESHOLD = 1.4;
const VAD_LEVEL_THRESHOLD = 0.08;

/** Fuse a raw IMU reading into orientation + discrete events (≤ derived rate). */
export function deriveMotionSample(raw: RawMotionSample): MotionDerivedSample {
  if (stryMutAct_9fa48("7691")) {
    {}
  } else {
    stryCov_9fa48("7691");
    const [ax, ay, az] = raw.accel;
    const magnitude = Math.sqrt(stryMutAct_9fa48("7692") ? ax * ax + ay * ay - az * az : (stryCov_9fa48("7692"), (stryMutAct_9fa48("7693") ? ax * ax - ay * ay : (stryCov_9fa48("7693"), (stryMutAct_9fa48("7694") ? ax / ax : (stryCov_9fa48("7694"), ax * ax)) + (stryMutAct_9fa48("7695") ? ay / ay : (stryCov_9fa48("7695"), ay * ay)))) + (stryMutAct_9fa48("7696") ? az / az : (stryCov_9fa48("7696"), az * az))));
    const events: Array<"step" | "shake" | "tilt"> = stryMutAct_9fa48("7697") ? ["Stryker was here"] : (stryCov_9fa48("7697"), []);
    if (stryMutAct_9fa48("7701") ? magnitude < SHAKE_ACCEL_THRESHOLD : stryMutAct_9fa48("7700") ? magnitude > SHAKE_ACCEL_THRESHOLD : stryMutAct_9fa48("7699") ? false : stryMutAct_9fa48("7698") ? true : (stryCov_9fa48("7698", "7699", "7700", "7701"), magnitude >= SHAKE_ACCEL_THRESHOLD)) events.push(stryMutAct_9fa48("7702") ? "" : (stryCov_9fa48("7702"), "shake"));else if (stryMutAct_9fa48("7706") ? magnitude < STEP_ACCEL_THRESHOLD : stryMutAct_9fa48("7705") ? magnitude > STEP_ACCEL_THRESHOLD : stryMutAct_9fa48("7704") ? false : stryMutAct_9fa48("7703") ? true : (stryCov_9fa48("7703", "7704", "7705", "7706"), magnitude >= STEP_ACCEL_THRESHOLD)) events.push(stryMutAct_9fa48("7707") ? "" : (stryCov_9fa48("7707"), "step"));
    if (stryMutAct_9fa48("7710") ? Math.abs(ax) >= TILT_ACCEL_THRESHOLD && Math.abs(ay) >= TILT_ACCEL_THRESHOLD : stryMutAct_9fa48("7709") ? false : stryMutAct_9fa48("7708") ? true : (stryCov_9fa48("7708", "7709", "7710"), (stryMutAct_9fa48("7713") ? Math.abs(ax) < TILT_ACCEL_THRESHOLD : stryMutAct_9fa48("7712") ? Math.abs(ax) > TILT_ACCEL_THRESHOLD : stryMutAct_9fa48("7711") ? false : (stryCov_9fa48("7711", "7712", "7713"), Math.abs(ax) >= TILT_ACCEL_THRESHOLD)) || (stryMutAct_9fa48("7716") ? Math.abs(ay) < TILT_ACCEL_THRESHOLD : stryMutAct_9fa48("7715") ? Math.abs(ay) > TILT_ACCEL_THRESHOLD : stryMutAct_9fa48("7714") ? false : (stryCov_9fa48("7714", "7715", "7716"), Math.abs(ay) >= TILT_ACCEL_THRESHOLD)))) {
      if (stryMutAct_9fa48("7717")) {
        {}
      } else {
        stryCov_9fa48("7717");
        events.push(stryMutAct_9fa48("7718") ? "" : (stryCov_9fa48("7718"), "tilt"));
      }
    }

    // Gravity-aligned tilt quaternion (no gyro integration — derived tier only).
    const norm = (stryMutAct_9fa48("7721") ? magnitude !== 0 : stryMutAct_9fa48("7720") ? false : stryMutAct_9fa48("7719") ? true : (stryCov_9fa48("7719", "7720", "7721"), magnitude === 0)) ? 1 : magnitude;
    const x = stryMutAct_9fa48("7722") ? ax * norm : (stryCov_9fa48("7722"), ax / norm);
    const y = stryMutAct_9fa48("7723") ? ay * norm : (stryCov_9fa48("7723"), ay / norm);
    const z = stryMutAct_9fa48("7724") ? az * norm : (stryCov_9fa48("7724"), az / norm);
    const w = Math.sqrt(stryMutAct_9fa48("7725") ? Math.min(0, 1 - Math.min(1, x * x + y * y + z * z)) : (stryCov_9fa48("7725"), Math.max(0, stryMutAct_9fa48("7726") ? 1 + Math.min(1, x * x + y * y + z * z) : (stryCov_9fa48("7726"), 1 - (stryMutAct_9fa48("7727") ? Math.max(1, x * x + y * y + z * z) : (stryCov_9fa48("7727"), Math.min(1, stryMutAct_9fa48("7728") ? x * x + y * y - z * z : (stryCov_9fa48("7728"), (stryMutAct_9fa48("7729") ? x * x - y * y : (stryCov_9fa48("7729"), (stryMutAct_9fa48("7730") ? x / x : (stryCov_9fa48("7730"), x * x)) + (stryMutAct_9fa48("7731") ? y / y : (stryCov_9fa48("7731"), y * y)))) + (stryMutAct_9fa48("7732") ? z / z : (stryCov_9fa48("7732"), z * z))))))))));
    return stryMutAct_9fa48("7733") ? {} : (stryCov_9fa48("7733"), {
      orientation: stryMutAct_9fa48("7734") ? {} : (stryCov_9fa48("7734"), {
        x,
        y,
        z,
        w
      }),
      events
    });
  }
}

/** Strip camera raw input down to derived-tier fields (never frames). */
export function deriveCameraSample(input: CameraDerivedInput): CameraDerivedSample {
  if (stryMutAct_9fa48("7735")) {
    {}
  } else {
    stryCov_9fa48("7735");
    const barcodes = stryMutAct_9fa48("7736") ? (input.barcodes ?? []).map(entry => ({
      format: entry.format,
      value: entry.value.slice(0, 512)
    })) : (stryCov_9fa48("7736"), (stryMutAct_9fa48("7737") ? input.barcodes && [] : (stryCov_9fa48("7737"), input.barcodes ?? (stryMutAct_9fa48("7738") ? ["Stryker was here"] : (stryCov_9fa48("7738"), [])))).filter(stryMutAct_9fa48("7739") ? () => undefined : (stryCov_9fa48("7739"), entry => stryMutAct_9fa48("7742") ? typeof entry.format === "string" || typeof entry.value === "string" : stryMutAct_9fa48("7741") ? false : stryMutAct_9fa48("7740") ? true : (stryCov_9fa48("7740", "7741", "7742"), (stryMutAct_9fa48("7744") ? typeof entry.format !== "string" : stryMutAct_9fa48("7743") ? true : (stryCov_9fa48("7743", "7744"), typeof entry.format === (stryMutAct_9fa48("7745") ? "" : (stryCov_9fa48("7745"), "string")))) && (stryMutAct_9fa48("7747") ? typeof entry.value !== "string" : stryMutAct_9fa48("7746") ? true : (stryCov_9fa48("7746", "7747"), typeof entry.value === (stryMutAct_9fa48("7748") ? "" : (stryCov_9fa48("7748"), "string"))))))).map(stryMutAct_9fa48("7749") ? () => undefined : (stryCov_9fa48("7749"), entry => stryMutAct_9fa48("7750") ? {} : (stryCov_9fa48("7750"), {
      format: entry.format,
      value: stryMutAct_9fa48("7751") ? entry.value : (stryCov_9fa48("7751"), entry.value.slice(0, 512))
    }))));
    return stryMutAct_9fa48("7752") ? {} : (stryCov_9fa48("7752"), {
      barcodes,
      motionDetected: Boolean(input.motionDetected),
      faceCount: clampCount(input.faceCount),
      objectCount: clampCount(input.objectCount)
    });
  }
}

/** Compute level / VAD / tones from PCM or a precomputed level. */
export function deriveMicrophoneSample(input: MicrophoneDerivedInput): MicrophoneDerivedSample {
  if (stryMutAct_9fa48("7753")) {
    {}
  } else {
    stryCov_9fa48("7753");
    const level = (stryMutAct_9fa48("7756") ? typeof input.level === "number" || Number.isFinite(input.level) : stryMutAct_9fa48("7755") ? false : stryMutAct_9fa48("7754") ? true : (stryCov_9fa48("7754", "7755", "7756"), (stryMutAct_9fa48("7758") ? typeof input.level !== "number" : stryMutAct_9fa48("7757") ? true : (stryCov_9fa48("7757", "7758"), typeof input.level === (stryMutAct_9fa48("7759") ? "" : (stryCov_9fa48("7759"), "number")))) && Number.isFinite(input.level))) ? clamp01(input.level) : rmsLevel(stryMutAct_9fa48("7760") ? input.pcm && [] : (stryCov_9fa48("7760"), input.pcm ?? (stryMutAct_9fa48("7761") ? ["Stryker was here"] : (stryCov_9fa48("7761"), []))));
    const tones = stryMutAct_9fa48("7763") ? (input.tones ?? []).slice(0, 16) : stryMutAct_9fa48("7762") ? (input.tones ?? []).filter(tone => typeof tone === "string") : (stryCov_9fa48("7762", "7763"), (stryMutAct_9fa48("7764") ? input.tones && [] : (stryCov_9fa48("7764"), input.tones ?? (stryMutAct_9fa48("7765") ? ["Stryker was here"] : (stryCov_9fa48("7765"), [])))).filter(stryMutAct_9fa48("7766") ? () => undefined : (stryCov_9fa48("7766"), tone => stryMutAct_9fa48("7769") ? typeof tone !== "string" : stryMutAct_9fa48("7768") ? false : stryMutAct_9fa48("7767") ? true : (stryCov_9fa48("7767", "7768", "7769"), typeof tone === (stryMutAct_9fa48("7770") ? "" : (stryCov_9fa48("7770"), "string"))))).slice(0, 16));
    return stryMutAct_9fa48("7771") ? {} : (stryCov_9fa48("7771"), {
      level,
      voiceActive: stryMutAct_9fa48("7775") ? level < VAD_LEVEL_THRESHOLD : stryMutAct_9fa48("7774") ? level > VAD_LEVEL_THRESHOLD : stryMutAct_9fa48("7773") ? false : stryMutAct_9fa48("7772") ? true : (stryCov_9fa48("7772", "7773", "7774", "7775"), level >= VAD_LEVEL_THRESHOLD),
      tones
    });
  }
}
function rmsLevel(pcm: ReadonlyArray<number>): number {
  if (stryMutAct_9fa48("7776")) {
    {}
  } else {
    stryCov_9fa48("7776");
    if (stryMutAct_9fa48("7779") ? pcm.length !== 0 : stryMutAct_9fa48("7778") ? false : stryMutAct_9fa48("7777") ? true : (stryCov_9fa48("7777", "7778", "7779"), pcm.length === 0)) return 0;
    let sum = 0;
    for (const sample of pcm) {
      if (stryMutAct_9fa48("7780")) {
        {}
      } else {
        stryCov_9fa48("7780");
        const value = Number.isFinite(sample) ? sample : 0;
        stryMutAct_9fa48("7781") ? sum -= value * value : (stryCov_9fa48("7781"), sum += stryMutAct_9fa48("7782") ? value / value : (stryCov_9fa48("7782"), value * value));
      }
    }
    return clamp01(Math.sqrt(stryMutAct_9fa48("7783") ? sum * pcm.length : (stryCov_9fa48("7783"), sum / pcm.length)));
  }
}
function clamp01(value: number): number {
  if (stryMutAct_9fa48("7784")) {
    {}
  } else {
    stryCov_9fa48("7784");
    if (stryMutAct_9fa48("7787") ? false : stryMutAct_9fa48("7786") ? true : stryMutAct_9fa48("7785") ? Number.isFinite(value) : (stryCov_9fa48("7785", "7786", "7787"), !Number.isFinite(value))) return 0;
    return stryMutAct_9fa48("7788") ? Math.max(1, Math.max(0, value)) : (stryCov_9fa48("7788"), Math.min(1, stryMutAct_9fa48("7789") ? Math.min(0, value) : (stryCov_9fa48("7789"), Math.max(0, value))));
  }
}
function clampCount(value: number | undefined): number {
  if (stryMutAct_9fa48("7790")) {
    {}
  } else {
    stryCov_9fa48("7790");
    if (stryMutAct_9fa48("7793") ? (typeof value !== "number" || !Number.isFinite(value)) && value < 0 : stryMutAct_9fa48("7792") ? false : stryMutAct_9fa48("7791") ? true : (stryCov_9fa48("7791", "7792", "7793"), (stryMutAct_9fa48("7795") ? typeof value !== "number" && !Number.isFinite(value) : stryMutAct_9fa48("7794") ? false : (stryCov_9fa48("7794", "7795"), (stryMutAct_9fa48("7797") ? typeof value === "number" : stryMutAct_9fa48("7796") ? false : (stryCov_9fa48("7796", "7797"), typeof value !== (stryMutAct_9fa48("7798") ? "" : (stryCov_9fa48("7798"), "number")))) || (stryMutAct_9fa48("7799") ? Number.isFinite(value) : (stryCov_9fa48("7799"), !Number.isFinite(value))))) || (stryMutAct_9fa48("7802") ? value >= 0 : stryMutAct_9fa48("7801") ? value <= 0 : stryMutAct_9fa48("7800") ? false : (stryCov_9fa48("7800", "7801", "7802"), value < 0)))) return 0;
    return stryMutAct_9fa48("7803") ? Math.max(100, Math.floor(value)) : (stryCov_9fa48("7803"), Math.min(100, Math.floor(value)));
  }
}