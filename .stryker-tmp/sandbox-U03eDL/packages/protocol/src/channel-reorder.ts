/**
 * Pure RNS Channel RX sequence acceptance, ring insertion, and contiguous drain.
 * Ring-sequence index conclusions leave via machine actions (no ad-hoc
 * `indexOfChannelRingSequence` reads beside the step).
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
import type { Event, Intent } from "@twistedpear/effects";
import { CHANNEL_SEQ_MAX, CHANNEL_SEQ_MODULUS, nextChannelSequence } from "./channel-envelope.js";

/** Whether an inbound sequence is inside the acceptable RX window. */
export function shouldAcceptChannelSequence(input: {
  readonly sequence: number;
  readonly nextRxSequence: number;
  readonly windowMax: number;
}): boolean {
  if (stryMutAct_9fa48("3957")) {
    {}
  } else {
    stryCov_9fa48("3957");
    if (stryMutAct_9fa48("3961") ? input.sequence < input.nextRxSequence : stryMutAct_9fa48("3960") ? input.sequence > input.nextRxSequence : stryMutAct_9fa48("3959") ? false : stryMutAct_9fa48("3958") ? true : (stryCov_9fa48("3958", "3959", "3960", "3961"), input.sequence >= input.nextRxSequence)) {
      if (stryMutAct_9fa48("3962")) {
        {}
      } else {
        stryCov_9fa48("3962");
        return stryMutAct_9fa48("3963") ? false : (stryCov_9fa48("3963"), true);
      }
    }
    const windowOverflow = stryMutAct_9fa48("3964") ? (input.nextRxSequence + input.windowMax) * CHANNEL_SEQ_MODULUS : (stryCov_9fa48("3964"), (stryMutAct_9fa48("3965") ? input.nextRxSequence - input.windowMax : (stryCov_9fa48("3965"), input.nextRxSequence + input.windowMax)) % CHANNEL_SEQ_MODULUS);
    if (stryMutAct_9fa48("3969") ? windowOverflow >= input.nextRxSequence : stryMutAct_9fa48("3968") ? windowOverflow <= input.nextRxSequence : stryMutAct_9fa48("3967") ? false : stryMutAct_9fa48("3966") ? true : (stryCov_9fa48("3966", "3967", "3968", "3969"), windowOverflow < input.nextRxSequence)) {
      if (stryMutAct_9fa48("3970")) {
        {}
      } else {
        stryCov_9fa48("3970");
        return stryMutAct_9fa48("3974") ? input.sequence > windowOverflow : stryMutAct_9fa48("3973") ? input.sequence < windowOverflow : stryMutAct_9fa48("3972") ? false : stryMutAct_9fa48("3971") ? true : (stryCov_9fa48("3971", "3972", "3973", "3974"), input.sequence <= windowOverflow);
      }
    }
    return stryMutAct_9fa48("3975") ? true : (stryCov_9fa48("3975"), false);
  }
}

/**
 * Channel RX sequence accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptChannelSequence`
 * reads beside the step).
 */
export type AcceptChannelSequenceState = Record<string, never>;
export type AcceptChannelSequenceEvent = Event | {
  readonly kind: "channel/accept-sequence-gate";
  readonly sequence: number;
  readonly nextRxSequence: number;
  readonly windowMax: number;
};
export type AcceptChannelSequenceAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptChannelSequenceStepResult {
  readonly state: AcceptChannelSequenceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptChannelSequenceAction[];
}
export function initialAcceptChannelSequenceState(): AcceptChannelSequenceState {
  if (stryMutAct_9fa48("3976")) {
    {}
  } else {
    stryCov_9fa48("3976");
    return {};
  }
}
export function stepAcceptChannelSequenceWithActions(state: AcceptChannelSequenceState, event: AcceptChannelSequenceEvent): AcceptChannelSequenceStepResult {
  if (stryMutAct_9fa48("3977")) {
    {}
  } else {
    stryCov_9fa48("3977");
    if (stryMutAct_9fa48("3980") ? event.kind !== "channel/accept-sequence-gate" : stryMutAct_9fa48("3979") ? false : stryMutAct_9fa48("3978") ? true : (stryCov_9fa48("3978", "3979", "3980"), event.kind === (stryMutAct_9fa48("3981") ? "" : (stryCov_9fa48("3981"), "channel/accept-sequence-gate")))) {
      if (stryMutAct_9fa48("3982")) {
        {}
      } else {
        stryCov_9fa48("3982");
        return stryMutAct_9fa48("3983") ? {} : (stryCov_9fa48("3983"), {
          state,
          intents: stryMutAct_9fa48("3984") ? ["Stryker was here"] : (stryCov_9fa48("3984"), []),
          actions: stryMutAct_9fa48("3985") ? [] : (stryCov_9fa48("3985"), [stryMutAct_9fa48("3986") ? {} : (stryCov_9fa48("3986"), {
            kind: shouldAcceptChannelSequence(stryMutAct_9fa48("3987") ? {} : (stryCov_9fa48("3987"), {
              sequence: event.sequence,
              nextRxSequence: event.nextRxSequence,
              windowMax: event.windowMax
            })) ? stryMutAct_9fa48("3988") ? "" : (stryCov_9fa48("3988"), "accept") : stryMutAct_9fa48("3989") ? "" : (stryCov_9fa48("3989"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("3990") ? {} : (stryCov_9fa48("3990"), {
      state,
      intents: stryMutAct_9fa48("3991") ? ["Stryker was here"] : (stryCov_9fa48("3991"), []),
      actions: stryMutAct_9fa48("3992") ? ["Stryker was here"] : (stryCov_9fa48("3992"), [])
    });
  }
}
export function shouldAcceptChannelSequenceNow(actions: ReadonlyArray<AcceptChannelSequenceAction>): boolean {
  if (stryMutAct_9fa48("3993")) {
    {}
  } else {
    stryCov_9fa48("3993");
    return stryMutAct_9fa48("3994") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("3994"), actions.some(stryMutAct_9fa48("3995") ? () => undefined : (stryCov_9fa48("3995"), action => stryMutAct_9fa48("3998") ? action.kind !== "accept" : stryMutAct_9fa48("3997") ? false : stryMutAct_9fa48("3996") ? true : (stryCov_9fa48("3996", "3997", "3998"), action.kind === (stryMutAct_9fa48("3999") ? "" : (stryCov_9fa48("3999"), "accept"))))));
  }
}
export function shouldSkipAcceptChannelSequence(actions: ReadonlyArray<AcceptChannelSequenceAction>): boolean {
  if (stryMutAct_9fa48("4000")) {
    {}
  } else {
    stryCov_9fa48("4000");
    return stryMutAct_9fa48("4001") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("4001"), actions.some(stryMutAct_9fa48("4002") ? () => undefined : (stryCov_9fa48("4002"), action => stryMutAct_9fa48("4005") ? action.kind !== "skip" : stryMutAct_9fa48("4004") ? false : stryMutAct_9fa48("4003") ? true : (stryCov_9fa48("4003", "4004", "4005"), action.kind === (stryMutAct_9fa48("4006") ? "" : (stryCov_9fa48("4006"), "skip"))))));
  }
}

/**
 * Insert index for a sequence into an ordered ring, or null if duplicate.
 * `wrapBaseSequence` mirrors RNS Channel.next_rx_sequence used for wrap-aware ordering.
 */
export function channelEmplaceIndex(input: {
  readonly sequence: number;
  readonly ringSequences: readonly number[];
  readonly wrapBaseSequence: number;
}): number | null {
  if (stryMutAct_9fa48("4007")) {
    {}
  } else {
    stryCov_9fa48("4007");
    for (const existing of input.ringSequences) {
      if (stryMutAct_9fa48("4008")) {
        {}
      } else {
        stryCov_9fa48("4008");
        if (stryMutAct_9fa48("4011") ? existing !== input.sequence : stryMutAct_9fa48("4010") ? false : stryMutAct_9fa48("4009") ? true : (stryCov_9fa48("4009", "4010", "4011"), existing === input.sequence)) {
          if (stryMutAct_9fa48("4012")) {
            {}
          } else {
            stryCov_9fa48("4012");
            return null;
          }
        }
      }
    }
    for (let index = 0; stryMutAct_9fa48("4015") ? index >= input.ringSequences.length : stryMutAct_9fa48("4014") ? index <= input.ringSequences.length : stryMutAct_9fa48("4013") ? false : (stryCov_9fa48("4013", "4014", "4015"), index < input.ringSequences.length); stryMutAct_9fa48("4016") ? index -= 1 : (stryCov_9fa48("4016"), index += 1)) {
      if (stryMutAct_9fa48("4017")) {
        {}
      } else {
        stryCov_9fa48("4017");
        const existing = input.ringSequences[index]!;
        if (stryMutAct_9fa48("4020") ? input.sequence < existing || !(input.wrapBaseSequence - input.sequence > CHANNEL_SEQ_MAX / 2) : stryMutAct_9fa48("4019") ? false : stryMutAct_9fa48("4018") ? true : (stryCov_9fa48("4018", "4019", "4020"), (stryMutAct_9fa48("4023") ? input.sequence >= existing : stryMutAct_9fa48("4022") ? input.sequence <= existing : stryMutAct_9fa48("4021") ? true : (stryCov_9fa48("4021", "4022", "4023"), input.sequence < existing)) && (stryMutAct_9fa48("4024") ? input.wrapBaseSequence - input.sequence > CHANNEL_SEQ_MAX / 2 : (stryCov_9fa48("4024"), !(stryMutAct_9fa48("4028") ? input.wrapBaseSequence - input.sequence <= CHANNEL_SEQ_MAX / 2 : stryMutAct_9fa48("4027") ? input.wrapBaseSequence - input.sequence >= CHANNEL_SEQ_MAX / 2 : stryMutAct_9fa48("4026") ? false : stryMutAct_9fa48("4025") ? true : (stryCov_9fa48("4025", "4026", "4027", "4028"), (stryMutAct_9fa48("4029") ? input.wrapBaseSequence + input.sequence : (stryCov_9fa48("4029"), input.wrapBaseSequence - input.sequence)) > (stryMutAct_9fa48("4030") ? CHANNEL_SEQ_MAX * 2 : (stryCov_9fa48("4030"), CHANNEL_SEQ_MAX / 2)))))))) {
          if (stryMutAct_9fa48("4031")) {
            {}
          } else {
            stryCov_9fa48("4031");
            return index;
          }
        }
      }
    }
    return input.ringSequences.length;
  }
}

/** Whether an emplace index may insert into the RX/TX ring (duplicate → miss). */
export function shouldEmplaceChannelEnvelope(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("4032")) {
    {}
  } else {
    stryCov_9fa48("4032");
    return indexPresent;
  }
}

/**
 * Channel envelope emplace gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldEmplaceChannelEnvelope`
 * reads beside the step).
 */
export type EmplaceChannelEnvelopeState = Record<string, never>;
export type EmplaceChannelEnvelopeEvent = Event | {
  readonly kind: "channel/emplace-envelope-gate";
  readonly indexPresent: boolean;
};
export type EmplaceChannelEnvelopeAction = {
  readonly kind: "emplace";
} | {
  readonly kind: "skip";
};
export interface EmplaceChannelEnvelopeStepResult {
  readonly state: EmplaceChannelEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EmplaceChannelEnvelopeAction[];
}
export function initialEmplaceChannelEnvelopeState(): EmplaceChannelEnvelopeState {
  if (stryMutAct_9fa48("4033")) {
    {}
  } else {
    stryCov_9fa48("4033");
    return {};
  }
}
export function stepEmplaceChannelEnvelopeWithActions(state: EmplaceChannelEnvelopeState, event: EmplaceChannelEnvelopeEvent): EmplaceChannelEnvelopeStepResult {
  if (stryMutAct_9fa48("4034")) {
    {}
  } else {
    stryCov_9fa48("4034");
    if (stryMutAct_9fa48("4037") ? event.kind !== "channel/emplace-envelope-gate" : stryMutAct_9fa48("4036") ? false : stryMutAct_9fa48("4035") ? true : (stryCov_9fa48("4035", "4036", "4037"), event.kind === (stryMutAct_9fa48("4038") ? "" : (stryCov_9fa48("4038"), "channel/emplace-envelope-gate")))) {
      if (stryMutAct_9fa48("4039")) {
        {}
      } else {
        stryCov_9fa48("4039");
        return stryMutAct_9fa48("4040") ? {} : (stryCov_9fa48("4040"), {
          state,
          intents: stryMutAct_9fa48("4041") ? ["Stryker was here"] : (stryCov_9fa48("4041"), []),
          actions: stryMutAct_9fa48("4042") ? [] : (stryCov_9fa48("4042"), [stryMutAct_9fa48("4043") ? {} : (stryCov_9fa48("4043"), {
            kind: shouldEmplaceChannelEnvelope(event.indexPresent) ? stryMutAct_9fa48("4044") ? "" : (stryCov_9fa48("4044"), "emplace") : stryMutAct_9fa48("4045") ? "" : (stryCov_9fa48("4045"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("4046") ? {} : (stryCov_9fa48("4046"), {
      state,
      intents: stryMutAct_9fa48("4047") ? ["Stryker was here"] : (stryCov_9fa48("4047"), []),
      actions: stryMutAct_9fa48("4048") ? ["Stryker was here"] : (stryCov_9fa48("4048"), [])
    });
  }
}
export function shouldEmplaceChannelEnvelopeNow(actions: ReadonlyArray<EmplaceChannelEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("4049")) {
    {}
  } else {
    stryCov_9fa48("4049");
    return stryMutAct_9fa48("4050") ? actions.every(action => action.kind === "emplace") : (stryCov_9fa48("4050"), actions.some(stryMutAct_9fa48("4051") ? () => undefined : (stryCov_9fa48("4051"), action => stryMutAct_9fa48("4054") ? action.kind !== "emplace" : stryMutAct_9fa48("4053") ? false : stryMutAct_9fa48("4052") ? true : (stryCov_9fa48("4052", "4053", "4054"), action.kind === (stryMutAct_9fa48("4055") ? "" : (stryCov_9fa48("4055"), "emplace"))))));
  }
}
export function shouldSkipEmplaceChannelEnvelope(actions: ReadonlyArray<EmplaceChannelEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("4056")) {
    {}
  } else {
    stryCov_9fa48("4056");
    return stryMutAct_9fa48("4057") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("4057"), actions.some(stryMutAct_9fa48("4058") ? () => undefined : (stryCov_9fa48("4058"), action => stryMutAct_9fa48("4061") ? action.kind !== "skip" : stryMutAct_9fa48("4060") ? false : stryMutAct_9fa48("4059") ? true : (stryCov_9fa48("4059", "4060", "4061"), action.kind === (stryMutAct_9fa48("4062") ? "" : (stryCov_9fa48("4062"), "skip"))))));
  }
}

/** Whether RX drain may splice/unpack a contiguous ring sequence by lookup index. */
export function shouldDrainChannelRingIndex(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("4063")) {
    {}
  } else {
    stryCov_9fa48("4063");
    return indexPresent;
  }
}

/**
 * Channel RX ring-index drain gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldDrainChannelRingIndex`
 * reads beside the step).
 */
export type DrainChannelRingIndexState = Record<string, never>;
export type DrainChannelRingIndexEvent = Event | {
  readonly kind: "channel/drain-ring-index-gate";
  readonly indexPresent: boolean;
};
export type DrainChannelRingIndexAction = {
  readonly kind: "drain";
} | {
  readonly kind: "skip";
};
export interface DrainChannelRingIndexStepResult {
  readonly state: DrainChannelRingIndexState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DrainChannelRingIndexAction[];
}
export function initialDrainChannelRingIndexState(): DrainChannelRingIndexState {
  if (stryMutAct_9fa48("4064")) {
    {}
  } else {
    stryCov_9fa48("4064");
    return {};
  }
}
export function stepDrainChannelRingIndexWithActions(state: DrainChannelRingIndexState, event: DrainChannelRingIndexEvent): DrainChannelRingIndexStepResult {
  if (stryMutAct_9fa48("4065")) {
    {}
  } else {
    stryCov_9fa48("4065");
    if (stryMutAct_9fa48("4068") ? event.kind !== "channel/drain-ring-index-gate" : stryMutAct_9fa48("4067") ? false : stryMutAct_9fa48("4066") ? true : (stryCov_9fa48("4066", "4067", "4068"), event.kind === (stryMutAct_9fa48("4069") ? "" : (stryCov_9fa48("4069"), "channel/drain-ring-index-gate")))) {
      if (stryMutAct_9fa48("4070")) {
        {}
      } else {
        stryCov_9fa48("4070");
        return stryMutAct_9fa48("4071") ? {} : (stryCov_9fa48("4071"), {
          state,
          intents: stryMutAct_9fa48("4072") ? ["Stryker was here"] : (stryCov_9fa48("4072"), []),
          actions: stryMutAct_9fa48("4073") ? [] : (stryCov_9fa48("4073"), [stryMutAct_9fa48("4074") ? {} : (stryCov_9fa48("4074"), {
            kind: shouldDrainChannelRingIndex(event.indexPresent) ? stryMutAct_9fa48("4075") ? "" : (stryCov_9fa48("4075"), "drain") : stryMutAct_9fa48("4076") ? "" : (stryCov_9fa48("4076"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("4077") ? {} : (stryCov_9fa48("4077"), {
      state,
      intents: stryMutAct_9fa48("4078") ? ["Stryker was here"] : (stryCov_9fa48("4078"), []),
      actions: stryMutAct_9fa48("4079") ? ["Stryker was here"] : (stryCov_9fa48("4079"), [])
    });
  }
}
export function shouldDrainChannelRingIndexNow(actions: ReadonlyArray<DrainChannelRingIndexAction>): boolean {
  if (stryMutAct_9fa48("4080")) {
    {}
  } else {
    stryCov_9fa48("4080");
    return stryMutAct_9fa48("4081") ? actions.every(action => action.kind === "drain") : (stryCov_9fa48("4081"), actions.some(stryMutAct_9fa48("4082") ? () => undefined : (stryCov_9fa48("4082"), action => stryMutAct_9fa48("4085") ? action.kind !== "drain" : stryMutAct_9fa48("4084") ? false : stryMutAct_9fa48("4083") ? true : (stryCov_9fa48("4083", "4084", "4085"), action.kind === (stryMutAct_9fa48("4086") ? "" : (stryCov_9fa48("4086"), "drain"))))));
  }
}
export function shouldSkipDrainChannelRingIndex(actions: ReadonlyArray<DrainChannelRingIndexAction>): boolean {
  if (stryMutAct_9fa48("4087")) {
    {}
  } else {
    stryCov_9fa48("4087");
    return stryMutAct_9fa48("4088") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("4088"), actions.some(stryMutAct_9fa48("4089") ? () => undefined : (stryCov_9fa48("4089"), action => stryMutAct_9fa48("4092") ? action.kind !== "skip" : stryMutAct_9fa48("4091") ? false : stryMutAct_9fa48("4090") ? true : (stryCov_9fa48("4090", "4091", "4092"), action.kind === (stryMutAct_9fa48("4093") ? "" : (stryCov_9fa48("4093"), "skip"))))));
  }
}

/** Index of `target` in a ring of sequences, or null if absent. */
export function indexOfChannelRingSequence(input: {
  readonly ringSequences: ReadonlyArray<number>;
  readonly target: number;
}): number | null {
  if (stryMutAct_9fa48("4094")) {
    {}
  } else {
    stryCov_9fa48("4094");
    for (let index = 0; stryMutAct_9fa48("4097") ? index >= input.ringSequences.length : stryMutAct_9fa48("4096") ? index <= input.ringSequences.length : stryMutAct_9fa48("4095") ? false : (stryCov_9fa48("4095", "4096", "4097"), index < input.ringSequences.length); stryMutAct_9fa48("4098") ? index -= 1 : (stryCov_9fa48("4098"), index += 1)) {
      if (stryMutAct_9fa48("4099")) {
        {}
      } else {
        stryCov_9fa48("4099");
        if (stryMutAct_9fa48("4102") ? input.ringSequences[index] !== input.target : stryMutAct_9fa48("4101") ? false : stryMutAct_9fa48("4100") ? true : (stryCov_9fa48("4100", "4101", "4102"), input.ringSequences[index] === input.target)) {
          if (stryMutAct_9fa48("4103")) {
            {}
          } else {
            stryCov_9fa48("4103");
            return index;
          }
        }
      }
    }
    return null;
  }
}

/**
 * Channel ring-sequence index lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `indexOfChannelRingSequence`
 * reads beside the step).
 */
export type IndexOfChannelRingSequenceState = Record<string, never>;
export type IndexOfChannelRingSequenceEvent = Event | {
  readonly kind: "channel/ring-sequence-index-gate";
  readonly ringSequences: ReadonlyArray<number>;
  readonly target: number;
};
export type IndexOfChannelRingSequenceAction = {
  readonly kind: "use-index";
  readonly index: number;
} | {
  readonly kind: "miss";
};
export interface IndexOfChannelRingSequenceStepResult {
  readonly state: IndexOfChannelRingSequenceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IndexOfChannelRingSequenceAction[];
}
export function initialIndexOfChannelRingSequenceState(): IndexOfChannelRingSequenceState {
  if (stryMutAct_9fa48("4104")) {
    {}
  } else {
    stryCov_9fa48("4104");
    return {};
  }
}
export function stepIndexOfChannelRingSequenceWithActions(state: IndexOfChannelRingSequenceState, event: IndexOfChannelRingSequenceEvent): IndexOfChannelRingSequenceStepResult {
  if (stryMutAct_9fa48("4105")) {
    {}
  } else {
    stryCov_9fa48("4105");
    if (stryMutAct_9fa48("4108") ? event.kind !== "channel/ring-sequence-index-gate" : stryMutAct_9fa48("4107") ? false : stryMutAct_9fa48("4106") ? true : (stryCov_9fa48("4106", "4107", "4108"), event.kind === (stryMutAct_9fa48("4109") ? "" : (stryCov_9fa48("4109"), "channel/ring-sequence-index-gate")))) {
      if (stryMutAct_9fa48("4110")) {
        {}
      } else {
        stryCov_9fa48("4110");
        const index = indexOfChannelRingSequence(stryMutAct_9fa48("4111") ? {} : (stryCov_9fa48("4111"), {
          ringSequences: event.ringSequences,
          target: event.target
        }));
        return stryMutAct_9fa48("4112") ? {} : (stryCov_9fa48("4112"), {
          state,
          intents: stryMutAct_9fa48("4113") ? ["Stryker was here"] : (stryCov_9fa48("4113"), []),
          actions: (stryMutAct_9fa48("4116") ? index !== null : stryMutAct_9fa48("4115") ? false : stryMutAct_9fa48("4114") ? true : (stryCov_9fa48("4114", "4115", "4116"), index === null)) ? stryMutAct_9fa48("4117") ? [] : (stryCov_9fa48("4117"), [stryMutAct_9fa48("4118") ? {} : (stryCov_9fa48("4118"), {
            kind: stryMutAct_9fa48("4119") ? "" : (stryCov_9fa48("4119"), "miss")
          })]) : stryMutAct_9fa48("4120") ? [] : (stryCov_9fa48("4120"), [stryMutAct_9fa48("4121") ? {} : (stryCov_9fa48("4121"), {
            kind: stryMutAct_9fa48("4122") ? "" : (stryCov_9fa48("4122"), "use-index"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("4123") ? {} : (stryCov_9fa48("4123"), {
      state,
      intents: stryMutAct_9fa48("4124") ? ["Stryker was here"] : (stryCov_9fa48("4124"), []),
      actions: stryMutAct_9fa48("4125") ? ["Stryker was here"] : (stryCov_9fa48("4125"), [])
    });
  }
}
export function shouldUseChannelRingSequenceIndex(actions: ReadonlyArray<IndexOfChannelRingSequenceAction>): boolean {
  if (stryMutAct_9fa48("4126")) {
    {}
  } else {
    stryCov_9fa48("4126");
    return stryMutAct_9fa48("4127") ? actions.every(action => action.kind === "use-index") : (stryCov_9fa48("4127"), actions.some(stryMutAct_9fa48("4128") ? () => undefined : (stryCov_9fa48("4128"), action => stryMutAct_9fa48("4131") ? action.kind !== "use-index" : stryMutAct_9fa48("4130") ? false : stryMutAct_9fa48("4129") ? true : (stryCov_9fa48("4129", "4130", "4131"), action.kind === (stryMutAct_9fa48("4132") ? "" : (stryCov_9fa48("4132"), "use-index"))))));
  }
}
export function shouldMissChannelRingSequenceIndex(actions: ReadonlyArray<IndexOfChannelRingSequenceAction>): boolean {
  if (stryMutAct_9fa48("4133")) {
    {}
  } else {
    stryCov_9fa48("4133");
    return stryMutAct_9fa48("4134") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("4134"), actions.some(stryMutAct_9fa48("4135") ? () => undefined : (stryCov_9fa48("4135"), action => stryMutAct_9fa48("4138") ? action.kind !== "miss" : stryMutAct_9fa48("4137") ? false : stryMutAct_9fa48("4136") ? true : (stryCov_9fa48("4136", "4137", "4138"), action.kind === (stryMutAct_9fa48("4139") ? "" : (stryCov_9fa48("4139"), "miss"))))));
  }
}

/** Extract ring-sequence index from step actions; null when no `use-index`. */
export function channelRingSequenceIndexFromActions(actions: ReadonlyArray<IndexOfChannelRingSequenceAction>): number | null {
  if (stryMutAct_9fa48("4140")) {
    {}
  } else {
    stryCov_9fa48("4140");
    const action = actions.find(stryMutAct_9fa48("4141") ? () => undefined : (stryCov_9fa48("4141"), entry => stryMutAct_9fa48("4144") ? entry.kind !== "use-index" : stryMutAct_9fa48("4143") ? false : stryMutAct_9fa48("4142") ? true : (stryCov_9fa48("4142", "4143", "4144"), entry.kind === (stryMutAct_9fa48("4145") ? "" : (stryCov_9fa48("4145"), "use-index")))));
    return (stryMutAct_9fa48("4148") ? action?.kind !== "use-index" : stryMutAct_9fa48("4147") ? false : stryMutAct_9fa48("4146") ? true : (stryCov_9fa48("4146", "4147", "4148"), (stryMutAct_9fa48("4149") ? action.kind : (stryCov_9fa48("4149"), action?.kind)) === (stryMutAct_9fa48("4150") ? "" : (stryCov_9fa48("4150"), "use-index")))) ? action.index : null;
  }
}
export function insertChannelSequence(ringSequences: readonly number[], sequence: number, wrapBaseSequence: number): {
  readonly inserted: boolean;
  readonly ring: readonly number[];
} {
  if (stryMutAct_9fa48("4151")) {
    {}
  } else {
    stryCov_9fa48("4151");
    const index = channelEmplaceIndex(stryMutAct_9fa48("4152") ? {} : (stryCov_9fa48("4152"), {
      sequence,
      ringSequences,
      wrapBaseSequence
    }));
    if (stryMutAct_9fa48("4155") ? index !== null : stryMutAct_9fa48("4154") ? false : stryMutAct_9fa48("4153") ? true : (stryCov_9fa48("4153", "4154", "4155"), index === null)) {
      if (stryMutAct_9fa48("4156")) {
        {}
      } else {
        stryCov_9fa48("4156");
        return stryMutAct_9fa48("4157") ? {} : (stryCov_9fa48("4157"), {
          inserted: stryMutAct_9fa48("4158") ? true : (stryCov_9fa48("4158"), false),
          ring: ringSequences
        });
      }
    }
    const ring = stryMutAct_9fa48("4159") ? [] : (stryCov_9fa48("4159"), [...ringSequences]);
    ring.splice(index, 0, sequence);
    return stryMutAct_9fa48("4160") ? {} : (stryCov_9fa48("4160"), {
      inserted: stryMutAct_9fa48("4161") ? false : (stryCov_9fa48("4161"), true),
      ring
    });
  }
}

/** Drain contiguous sequences starting at nextRxSequence (in ring order). */
export function drainContiguousChannelSequences(input: {
  readonly ringSequences: readonly number[];
  readonly nextRxSequence: number;
}): {
  readonly contiguous: readonly number[];
  readonly remaining: readonly number[];
  readonly nextRxSequence: number;
} {
  if (stryMutAct_9fa48("4162")) {
    {}
  } else {
    stryCov_9fa48("4162");
    const remaining = stryMutAct_9fa48("4163") ? [] : (stryCov_9fa48("4163"), [...input.ringSequences]);
    const contiguous: number[] = stryMutAct_9fa48("4164") ? ["Stryker was here"] : (stryCov_9fa48("4164"), []);
    let nextRxSequence = input.nextRxSequence;

    // Walk a snapshot of original ring order like RNS Channel.receive.
    for (const sequence of input.ringSequences) {
      if (stryMutAct_9fa48("4165")) {
        {}
      } else {
        stryCov_9fa48("4165");
        if (stryMutAct_9fa48("4168") ? sequence !== nextRxSequence : stryMutAct_9fa48("4167") ? false : stryMutAct_9fa48("4166") ? true : (stryCov_9fa48("4166", "4167", "4168"), sequence === nextRxSequence)) {
          if (stryMutAct_9fa48("4169")) {
            {}
          } else {
            stryCov_9fa48("4169");
            contiguous.push(sequence);
            nextRxSequence = nextChannelSequence(nextRxSequence);
            const index = indexOfChannelRingSequence(stryMutAct_9fa48("4170") ? {} : (stryCov_9fa48("4170"), {
              ringSequences: remaining,
              target: sequence
            }));
            if (stryMutAct_9fa48("4172") ? false : stryMutAct_9fa48("4171") ? true : (stryCov_9fa48("4171", "4172"), shouldDrainChannelRingIndex(stryMutAct_9fa48("4175") ? index === null : stryMutAct_9fa48("4174") ? false : stryMutAct_9fa48("4173") ? true : (stryCov_9fa48("4173", "4174", "4175"), index !== null)))) {
              if (stryMutAct_9fa48("4176")) {
                {}
              } else {
                stryCov_9fa48("4176");
                remaining.splice(index!, 1);
              }
            }
          }
        }
      }
    }
    return stryMutAct_9fa48("4177") ? {} : (stryCov_9fa48("4177"), {
      contiguous,
      remaining,
      nextRxSequence
    });
  }
}