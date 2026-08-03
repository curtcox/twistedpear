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
import type { DeviceStreamFrame } from "./device-stream-framing.js";
export interface ClockOffsetEstimate {
  readonly offsetUs: number;
  readonly rttUs: number;
  readonly samples: number;
}
export interface ClockOffsetSample {
  readonly sentAtUs: number;
  readonly receivedAtUs: number;
  readonly remoteAtUs: number;
}
export function updateClockOffset(previous: ClockOffsetEstimate | null, sample: ClockOffsetSample): ClockOffsetEstimate {
  if (stryMutAct_9fa48("22248")) {
    {}
  } else {
    stryCov_9fa48("22248");
    const rttUs = stryMutAct_9fa48("22249") ? Math.min(0, sample.receivedAtUs - sample.sentAtUs) : (stryCov_9fa48("22249"), Math.max(0, stryMutAct_9fa48("22250") ? sample.receivedAtUs + sample.sentAtUs : (stryCov_9fa48("22250"), sample.receivedAtUs - sample.sentAtUs)));
    const offsetUs = stryMutAct_9fa48("22251") ? sample.remoteAtUs + (sample.sentAtUs + rttUs / 2) : (stryCov_9fa48("22251"), sample.remoteAtUs - (stryMutAct_9fa48("22252") ? sample.sentAtUs - rttUs / 2 : (stryCov_9fa48("22252"), sample.sentAtUs + (stryMutAct_9fa48("22253") ? rttUs * 2 : (stryCov_9fa48("22253"), rttUs / 2)))));
    const alpha = (stryMutAct_9fa48("22256") ? previous !== null : stryMutAct_9fa48("22255") ? false : stryMutAct_9fa48("22254") ? true : (stryCov_9fa48("22254", "22255", "22256"), previous === null)) ? 1 : 0.25;
    return stryMutAct_9fa48("22257") ? {} : (stryCov_9fa48("22257"), {
      offsetUs: (stryMutAct_9fa48("22260") ? previous !== null : stryMutAct_9fa48("22259") ? false : stryMutAct_9fa48("22258") ? true : (stryCov_9fa48("22258", "22259", "22260"), previous === null)) ? offsetUs : stryMutAct_9fa48("22261") ? previous.offsetUs - alpha * (offsetUs - previous.offsetUs) : (stryCov_9fa48("22261"), previous.offsetUs + (stryMutAct_9fa48("22262") ? alpha / (offsetUs - previous.offsetUs) : (stryCov_9fa48("22262"), alpha * (stryMutAct_9fa48("22263") ? offsetUs + previous.offsetUs : (stryCov_9fa48("22263"), offsetUs - previous.offsetUs))))),
      rttUs: (stryMutAct_9fa48("22266") ? previous !== null : stryMutAct_9fa48("22265") ? false : stryMutAct_9fa48("22264") ? true : (stryCov_9fa48("22264", "22265", "22266"), previous === null)) ? rttUs : stryMutAct_9fa48("22267") ? previous.rttUs - alpha * (rttUs - previous.rttUs) : (stryCov_9fa48("22267"), previous.rttUs + (stryMutAct_9fa48("22268") ? alpha / (rttUs - previous.rttUs) : (stryCov_9fa48("22268"), alpha * (stryMutAct_9fa48("22269") ? rttUs + previous.rttUs : (stryCov_9fa48("22269"), rttUs - previous.rttUs))))),
      samples: stryMutAct_9fa48("22270") ? (previous?.samples ?? 0) - 1 : (stryCov_9fa48("22270"), (stryMutAct_9fa48("22271") ? previous?.samples && 0 : (stryCov_9fa48("22271"), (stryMutAct_9fa48("22272") ? previous.samples : (stryCov_9fa48("22272"), previous?.samples)) ?? 0)) + 1)
    });
  }
}
export interface TimedMediaFrame {
  readonly frame: Extract<DeviceStreamFrame, {
    readonly version: 2;
  }>;
  readonly receivedAtUs: number;
}
export interface JitterBufferState {
  readonly targetDelayUs: number;
  readonly frames: ReadonlyArray<TimedMediaFrame>;
  readonly droppedLate: number;
}
export function initialJitterBuffer(targetDelayUs = 120_000): JitterBufferState {
  if (stryMutAct_9fa48("22273")) {
    {}
  } else {
    stryCov_9fa48("22273");
    return stryMutAct_9fa48("22274") ? {} : (stryCov_9fa48("22274"), {
      targetDelayUs: stryMutAct_9fa48("22275") ? Math.min(0, targetDelayUs) : (stryCov_9fa48("22275"), Math.max(0, targetDelayUs)),
      frames: stryMutAct_9fa48("22276") ? ["Stryker was here"] : (stryCov_9fa48("22276"), []),
      droppedLate: 0
    });
  }
}
export function pushJitterFrame(state: JitterBufferState, timed: TimedMediaFrame, nowUs: number, clockOffsetUs = 0): JitterBufferState {
  if (stryMutAct_9fa48("22277")) {
    {}
  } else {
    stryCov_9fa48("22277");
    const presentationAt = stryMutAct_9fa48("22278") ? timed.frame.captureAtUs - clockOffsetUs - state.targetDelayUs : (stryCov_9fa48("22278"), (stryMutAct_9fa48("22279") ? timed.frame.captureAtUs + clockOffsetUs : (stryCov_9fa48("22279"), timed.frame.captureAtUs - clockOffsetUs)) + state.targetDelayUs);
    if (stryMutAct_9fa48("22283") ? presentationAt >= nowUs - state.targetDelayUs : stryMutAct_9fa48("22282") ? presentationAt <= nowUs - state.targetDelayUs : stryMutAct_9fa48("22281") ? false : stryMutAct_9fa48("22280") ? true : (stryCov_9fa48("22280", "22281", "22282", "22283"), presentationAt < (stryMutAct_9fa48("22284") ? nowUs + state.targetDelayUs : (stryCov_9fa48("22284"), nowUs - state.targetDelayUs)))) {
      if (stryMutAct_9fa48("22285")) {
        {}
      } else {
        stryCov_9fa48("22285");
        return stryMutAct_9fa48("22286") ? {} : (stryCov_9fa48("22286"), {
          ...state,
          droppedLate: stryMutAct_9fa48("22287") ? state.droppedLate - 1 : (stryCov_9fa48("22287"), state.droppedLate + 1)
        });
      }
    }
    const frames = stryMutAct_9fa48("22288") ? [...state.frames, timed] : (stryCov_9fa48("22288"), (stryMutAct_9fa48("22289") ? [] : (stryCov_9fa48("22289"), [...state.frames, timed])).sort(stryMutAct_9fa48("22290") ? () => undefined : (stryCov_9fa48("22290"), (left, right) => stryMutAct_9fa48("22293") ? left.frame.captureAtUs - right.frame.captureAtUs && left.frame.sequence - right.frame.sequence : stryMutAct_9fa48("22292") ? false : stryMutAct_9fa48("22291") ? true : (stryCov_9fa48("22291", "22292", "22293"), (stryMutAct_9fa48("22294") ? left.frame.captureAtUs + right.frame.captureAtUs : (stryCov_9fa48("22294"), left.frame.captureAtUs - right.frame.captureAtUs)) || (stryMutAct_9fa48("22295") ? left.frame.sequence + right.frame.sequence : (stryCov_9fa48("22295"), left.frame.sequence - right.frame.sequence))))));
    return stryMutAct_9fa48("22296") ? {} : (stryCov_9fa48("22296"), {
      ...state,
      frames
    });
  }
}
export function drainJitterBuffer(state: JitterBufferState, nowUs: number, clockOffsetUs = 0): {
  readonly state: JitterBufferState;
  readonly ready: ReadonlyArray<TimedMediaFrame>;
} {
  if (stryMutAct_9fa48("22297")) {
    {}
  } else {
    stryCov_9fa48("22297");
    const ready: TimedMediaFrame[] = stryMutAct_9fa48("22298") ? ["Stryker was here"] : (stryCov_9fa48("22298"), []);
    const pending: TimedMediaFrame[] = stryMutAct_9fa48("22299") ? ["Stryker was here"] : (stryCov_9fa48("22299"), []);
    for (const timed of state.frames) {
      if (stryMutAct_9fa48("22300")) {
        {}
      } else {
        stryCov_9fa48("22300");
        const presentationAt = stryMutAct_9fa48("22301") ? timed.frame.captureAtUs - clockOffsetUs - state.targetDelayUs : (stryCov_9fa48("22301"), (stryMutAct_9fa48("22302") ? timed.frame.captureAtUs + clockOffsetUs : (stryCov_9fa48("22302"), timed.frame.captureAtUs - clockOffsetUs)) + state.targetDelayUs);
        ((stryMutAct_9fa48("22306") ? presentationAt > nowUs : stryMutAct_9fa48("22305") ? presentationAt < nowUs : stryMutAct_9fa48("22304") ? false : stryMutAct_9fa48("22303") ? true : (stryCov_9fa48("22303", "22304", "22305", "22306"), presentationAt <= nowUs)) ? ready : pending).push(timed);
      }
    }
    return stryMutAct_9fa48("22307") ? {} : (stryCov_9fa48("22307"), {
      state: stryMutAct_9fa48("22308") ? {} : (stryCov_9fa48("22308"), {
        ...state,
        frames: pending
      }),
      ready
    });
  }
}