/** Extracted from channel-envelope.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS Channel envelope framing (MSGTYPE + sequence + length + payload).
 * Pack / unpack framing conclusions leave via machine actions (no ad-hoc
 * `packChannelEnvelope` / `unpackChannelEnvelope` reads beside the step).
 * Pack / unpack / MSGTYPE-registration gate conclusions leave via machine
 * actions (no ad-hoc plan reads beside the step).
 * Message-state-from-receipt mapping conclusions leave via machine actions
 * (no ad-hoc `channelMessageStateFromPacketReceipt` reads beside the step).
 */function stryNS_9fa48() {
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
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import type { PacketReceiptStatusValue } from "../packet-receipt-timeout.js";
import { PacketReceiptStatus } from "../packet-receipt-timeout.js";
export const CHANNEL_ENVELOPE_HEADER_SIZE = 6;
export const CHANNEL_SEQ_MAX = 0xffff;
export const CHANNEL_SEQ_MODULUS = stryMutAct_9fa48("3263") ? CHANNEL_SEQ_MAX - 1 : (stryCov_9fa48("3263"), CHANNEL_SEQ_MAX + 1);
export const CHANNEL_SYSTEM_MSGTYPE_MIN = 0xf000;

/** Mirrors RNS/Channel.py MessageState. */
export const ChannelMessageState = {
  MSGSTATE_NEW: 0,
  MSGSTATE_SENT: 1,
  MSGSTATE_DELIVERED: 2,
  MSGSTATE_FAILED: 3
} as const;
export type ChannelMessageStateValue = (typeof ChannelMessageState)[keyof typeof ChannelMessageState];

/** Mirrors RNS/Channel.py ChannelException types. */
export const ChannelExceptionTypeCode = {
  ME_NO_MSG_TYPE: 0,
  ME_INVALID_MSG_TYPE: 1,
  ME_NOT_REGISTERED: 2,
  ME_LINK_NOT_READY: 3,
  ME_ALREADY_SENT: 4,
  ME_TOO_BIG: 5
} as const;
export type ChannelExceptionTypeCodeValue = (typeof ChannelExceptionTypeCode)[keyof typeof ChannelExceptionTypeCode];

/** Map packet-receipt status to channel message state. */
export function channelMessageStateFromPacketReceipt(receiptStatus: PacketReceiptStatusValue | null): ChannelMessageStateValue {
  if (stryMutAct_9fa48("3264")) {
    {}
  } else {
    stryCov_9fa48("3264");
    if (stryMutAct_9fa48("3267") ? receiptStatus !== null : stryMutAct_9fa48("3266") ? false : stryMutAct_9fa48("3265") ? true : (stryCov_9fa48("3265", "3266", "3267"), receiptStatus === null)) {
      if (stryMutAct_9fa48("3268")) {
        {}
      } else {
        stryCov_9fa48("3268");
        return ChannelMessageState.MSGSTATE_FAILED;
      }
    }
    if (stryMutAct_9fa48("3271") ? receiptStatus !== PacketReceiptStatus.SENT : stryMutAct_9fa48("3270") ? false : stryMutAct_9fa48("3269") ? true : (stryCov_9fa48("3269", "3270", "3271"), receiptStatus === PacketReceiptStatus.SENT)) {
      if (stryMutAct_9fa48("3272")) {
        {}
      } else {
        stryCov_9fa48("3272");
        return ChannelMessageState.MSGSTATE_SENT;
      }
    }
    if (stryMutAct_9fa48("3275") ? receiptStatus !== PacketReceiptStatus.DELIVERED : stryMutAct_9fa48("3274") ? false : stryMutAct_9fa48("3273") ? true : (stryCov_9fa48("3273", "3274", "3275"), receiptStatus === PacketReceiptStatus.DELIVERED)) {
      if (stryMutAct_9fa48("3276")) {
        {}
      } else {
        stryCov_9fa48("3276");
        return ChannelMessageState.MSGSTATE_DELIVERED;
      }
    }
    return ChannelMessageState.MSGSTATE_FAILED;
  }
}

/**
 * Channel message-state mapping is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `channelMessageStateFromPacketReceipt` reads beside the step).
 */
export type ChannelMessageStateFromPacketReceiptState = Record<string, never>;
export type ChannelMessageStateFromPacketReceiptEvent = Event | {
  readonly kind: "channel/message-state-from-receipt-gate";
  readonly receiptStatus: PacketReceiptStatusValue | null;
};
export type ChannelMessageStateFromPacketReceiptAction = {
  readonly kind: "use-state";
  readonly messageState: ChannelMessageStateValue;
};
export interface ChannelMessageStateFromPacketReceiptStepResult {
  readonly state: ChannelMessageStateFromPacketReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelMessageStateFromPacketReceiptAction[];
}
export function initialChannelMessageStateFromPacketReceiptState(): ChannelMessageStateFromPacketReceiptState {
  if (stryMutAct_9fa48("3277")) {
    {}
  } else {
    stryCov_9fa48("3277");
    return {};
  }
}
export function stepChannelMessageStateFromPacketReceiptWithActions(state: ChannelMessageStateFromPacketReceiptState, event: ChannelMessageStateFromPacketReceiptEvent): ChannelMessageStateFromPacketReceiptStepResult {
  if (stryMutAct_9fa48("3278")) {
    {}
  } else {
    stryCov_9fa48("3278");
    if (stryMutAct_9fa48("3281") ? event.kind !== "channel/message-state-from-receipt-gate" : stryMutAct_9fa48("3280") ? false : stryMutAct_9fa48("3279") ? true : (stryCov_9fa48("3279", "3280", "3281"), event.kind === (stryMutAct_9fa48("3282") ? "" : (stryCov_9fa48("3282"), "channel/message-state-from-receipt-gate")))) {
      if (stryMutAct_9fa48("3283")) {
        {}
      } else {
        stryCov_9fa48("3283");
        return stryMutAct_9fa48("3284") ? {} : (stryCov_9fa48("3284"), {
          state,
          intents: stryMutAct_9fa48("3285") ? ["Stryker was here"] : (stryCov_9fa48("3285"), []),
          actions: stryMutAct_9fa48("3286") ? [] : (stryCov_9fa48("3286"), [stryMutAct_9fa48("3287") ? {} : (stryCov_9fa48("3287"), {
            kind: stryMutAct_9fa48("3288") ? "" : (stryCov_9fa48("3288"), "use-state"),
            messageState: channelMessageStateFromPacketReceipt(event.receiptStatus)
          })])
        });
      }
    }
    return stryMutAct_9fa48("3289") ? {} : (stryCov_9fa48("3289"), {
      state,
      intents: stryMutAct_9fa48("3290") ? ["Stryker was here"] : (stryCov_9fa48("3290"), []),
      actions: stryMutAct_9fa48("3291") ? ["Stryker was here"] : (stryCov_9fa48("3291"), [])
    });
  }
}
export function shouldUseChannelMessageStateFromPacketReceipt(actions: ReadonlyArray<ChannelMessageStateFromPacketReceiptAction>): boolean {
  if (stryMutAct_9fa48("3292")) {
    {}
  } else {
    stryCov_9fa48("3292");
    return stryMutAct_9fa48("3293") ? actions.every(action => action.kind === "use-state") : (stryCov_9fa48("3293"), actions.some(stryMutAct_9fa48("3294") ? () => undefined : (stryCov_9fa48("3294"), action => stryMutAct_9fa48("3297") ? action.kind !== "use-state" : stryMutAct_9fa48("3296") ? false : stryMutAct_9fa48("3295") ? true : (stryCov_9fa48("3295", "3296", "3297"), action.kind === (stryMutAct_9fa48("3298") ? "" : (stryCov_9fa48("3298"), "use-state"))))));
  }
}

/** Extract channel message state from step actions; null when no `use-state`. */
export function channelMessageStateFromActions(actions: ReadonlyArray<ChannelMessageStateFromPacketReceiptAction>): ChannelMessageStateValue | null {
  if (stryMutAct_9fa48("3299")) {
    {}
  } else {
    stryCov_9fa48("3299");
    const action = actions.find(stryMutAct_9fa48("3300") ? () => undefined : (stryCov_9fa48("3300"), entry => stryMutAct_9fa48("3303") ? entry.kind !== "use-state" : stryMutAct_9fa48("3302") ? false : stryMutAct_9fa48("3301") ? true : (stryCov_9fa48("3301", "3302", "3303"), entry.kind === (stryMutAct_9fa48("3304") ? "" : (stryCov_9fa48("3304"), "use-state")))));
    return (stryMutAct_9fa48("3307") ? action?.kind !== "use-state" : stryMutAct_9fa48("3306") ? false : stryMutAct_9fa48("3305") ? true : (stryCov_9fa48("3305", "3306", "3307"), (stryMutAct_9fa48("3308") ? action.kind : (stryCov_9fa48("3308"), action?.kind)) === (stryMutAct_9fa48("3309") ? "" : (stryCov_9fa48("3309"), "use-state")))) ? action.messageState : null;
  }
}

/** Whether send/resend should immediately fire packetDelivered for an already-delivered outlet state. */
export function shouldEmitChannelImmediateDelivery(packetState: number): boolean {
  if (stryMutAct_9fa48("3310")) {
    {}
  } else {
    stryCov_9fa48("3310");
    return stryMutAct_9fa48("3313") ? packetState !== ChannelMessageState.MSGSTATE_DELIVERED : stryMutAct_9fa48("3312") ? false : stryMutAct_9fa48("3311") ? true : (stryCov_9fa48("3311", "3312", "3313"), packetState === ChannelMessageState.MSGSTATE_DELIVERED);
  }
}

/**
 * Channel immediate-delivery emit gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldEmitChannelImmediateDelivery`
 * reads beside the step).
 */
export type EmitChannelImmediateDeliveryState = Record<string, never>;
export type EmitChannelImmediateDeliveryEvent = Event | {
  readonly kind: "channel/emit-immediate-delivery-gate";
  readonly packetState: number;
};
export type EmitChannelImmediateDeliveryAction = {
  readonly kind: "emit";
} | {
  readonly kind: "skip";
};
export interface EmitChannelImmediateDeliveryStepResult {
  readonly state: EmitChannelImmediateDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EmitChannelImmediateDeliveryAction[];
}
export function initialEmitChannelImmediateDeliveryState(): EmitChannelImmediateDeliveryState {
  if (stryMutAct_9fa48("3314")) {
    {}
  } else {
    stryCov_9fa48("3314");
    return {};
  }
}
export function stepEmitChannelImmediateDeliveryWithActions(state: EmitChannelImmediateDeliveryState, event: EmitChannelImmediateDeliveryEvent): EmitChannelImmediateDeliveryStepResult {
  if (stryMutAct_9fa48("3315")) {
    {}
  } else {
    stryCov_9fa48("3315");
    if (stryMutAct_9fa48("3318") ? event.kind !== "channel/emit-immediate-delivery-gate" : stryMutAct_9fa48("3317") ? false : stryMutAct_9fa48("3316") ? true : (stryCov_9fa48("3316", "3317", "3318"), event.kind === (stryMutAct_9fa48("3319") ? "" : (stryCov_9fa48("3319"), "channel/emit-immediate-delivery-gate")))) {
      if (stryMutAct_9fa48("3320")) {
        {}
      } else {
        stryCov_9fa48("3320");
        return stryMutAct_9fa48("3321") ? {} : (stryCov_9fa48("3321"), {
          state,
          intents: stryMutAct_9fa48("3322") ? ["Stryker was here"] : (stryCov_9fa48("3322"), []),
          actions: stryMutAct_9fa48("3323") ? [] : (stryCov_9fa48("3323"), [stryMutAct_9fa48("3324") ? {} : (stryCov_9fa48("3324"), {
            kind: shouldEmitChannelImmediateDelivery(event.packetState) ? stryMutAct_9fa48("3325") ? "" : (stryCov_9fa48("3325"), "emit") : stryMutAct_9fa48("3326") ? "" : (stryCov_9fa48("3326"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("3327") ? {} : (stryCov_9fa48("3327"), {
      state,
      intents: stryMutAct_9fa48("3328") ? ["Stryker was here"] : (stryCov_9fa48("3328"), []),
      actions: stryMutAct_9fa48("3329") ? ["Stryker was here"] : (stryCov_9fa48("3329"), [])
    });
  }
}
export function shouldEmitChannelImmediateDeliveryNow(actions: ReadonlyArray<EmitChannelImmediateDeliveryAction>): boolean {
  if (stryMutAct_9fa48("3330")) {
    {}
  } else {
    stryCov_9fa48("3330");
    return stryMutAct_9fa48("3331") ? actions.every(action => action.kind === "emit") : (stryCov_9fa48("3331"), actions.some(stryMutAct_9fa48("3332") ? () => undefined : (stryCov_9fa48("3332"), action => stryMutAct_9fa48("3335") ? action.kind !== "emit" : stryMutAct_9fa48("3334") ? false : stryMutAct_9fa48("3333") ? true : (stryCov_9fa48("3333", "3334", "3335"), action.kind === (stryMutAct_9fa48("3336") ? "" : (stryCov_9fa48("3336"), "emit"))))));
  }
}
export function shouldSkipEmitChannelImmediateDelivery(actions: ReadonlyArray<EmitChannelImmediateDeliveryAction>): boolean {
  if (stryMutAct_9fa48("3337")) {
    {}
  } else {
    stryCov_9fa48("3337");
    return stryMutAct_9fa48("3338") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("3338"), actions.some(stryMutAct_9fa48("3339") ? () => undefined : (stryCov_9fa48("3339"), action => stryMutAct_9fa48("3342") ? action.kind !== "skip" : stryMutAct_9fa48("3341") ? false : stryMutAct_9fa48("3340") ? true : (stryCov_9fa48("3340", "3341", "3342"), action.kind === (stryMutAct_9fa48("3343") ? "" : (stryCov_9fa48("3343"), "skip"))))));
  }
}
export interface PackedChannelEnvelope {
  readonly msgType: number;
  readonly sequence: number;
  readonly payload: Uint8Array;
}
export interface UnpackedChannelEnvelope {
  readonly msgType: number;
  readonly sequence: number;
  readonly length: number;
  readonly payload: Uint8Array;
}
export function packChannelEnvelope(input: PackedChannelEnvelope): Uint8Array {
  if (stryMutAct_9fa48("3344")) {
    {}
  } else {
    stryCov_9fa48("3344");
    const header = new Uint8Array(CHANNEL_ENVELOPE_HEADER_SIZE);
    const view = new DataView(header.buffer);
    view.setUint16(0, input.msgType & 0xffff, stryMutAct_9fa48("3345") ? true : (stryCov_9fa48("3345"), false));
    view.setUint16(2, input.sequence & 0xffff, stryMutAct_9fa48("3346") ? true : (stryCov_9fa48("3346"), false));
    view.setUint16(4, input.payload.length & 0xffff, stryMutAct_9fa48("3347") ? true : (stryCov_9fa48("3347"), false));
    const out = new Uint8Array(stryMutAct_9fa48("3348") ? CHANNEL_ENVELOPE_HEADER_SIZE - input.payload.length : (stryCov_9fa48("3348"), CHANNEL_ENVELOPE_HEADER_SIZE + input.payload.length));
    out.set(header, 0);
    out.set(input.payload, CHANNEL_ENVELOPE_HEADER_SIZE);
    return out;
  }
}
export function unpackChannelEnvelope(raw: Uint8Array): UnpackedChannelEnvelope | null {
  if (stryMutAct_9fa48("3349")) {
    {}
  } else {
    stryCov_9fa48("3349");
    if (stryMutAct_9fa48("3353") ? raw.length >= CHANNEL_ENVELOPE_HEADER_SIZE : stryMutAct_9fa48("3352") ? raw.length <= CHANNEL_ENVELOPE_HEADER_SIZE : stryMutAct_9fa48("3351") ? false : stryMutAct_9fa48("3350") ? true : (stryCov_9fa48("3350", "3351", "3352", "3353"), raw.length < CHANNEL_ENVELOPE_HEADER_SIZE)) {
      if (stryMutAct_9fa48("3354")) {
        {}
      } else {
        stryCov_9fa48("3354");
        return null;
      }
    }
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const msgType = view.getUint16(0, stryMutAct_9fa48("3355") ? true : (stryCov_9fa48("3355"), false));
    const sequence = view.getUint16(2, stryMutAct_9fa48("3356") ? true : (stryCov_9fa48("3356"), false));
    const length = view.getUint16(4, stryMutAct_9fa48("3357") ? true : (stryCov_9fa48("3357"), false));
    if (stryMutAct_9fa48("3361") ? raw.length >= CHANNEL_ENVELOPE_HEADER_SIZE + length : stryMutAct_9fa48("3360") ? raw.length <= CHANNEL_ENVELOPE_HEADER_SIZE + length : stryMutAct_9fa48("3359") ? false : stryMutAct_9fa48("3358") ? true : (stryCov_9fa48("3358", "3359", "3360", "3361"), raw.length < (stryMutAct_9fa48("3362") ? CHANNEL_ENVELOPE_HEADER_SIZE - length : (stryCov_9fa48("3362"), CHANNEL_ENVELOPE_HEADER_SIZE + length)))) {
      if (stryMutAct_9fa48("3363")) {
        {}
      } else {
        stryCov_9fa48("3363");
        return null;
      }
    }
    return stryMutAct_9fa48("3364") ? {} : (stryCov_9fa48("3364"), {
      msgType,
      sequence,
      length,
      payload: raw.subarray(CHANNEL_ENVELOPE_HEADER_SIZE, stryMutAct_9fa48("3365") ? CHANNEL_ENVELOPE_HEADER_SIZE - length : (stryCov_9fa48("3365"), CHANNEL_ENVELOPE_HEADER_SIZE + length))
    });
  }
}

/**
 * Channel envelope pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packChannelEnvelope`
 * reads beside the step). Pack failures become `reject`.
 */
export type PackChannelEnvelopeState = Record<string, never>;
export type PackChannelEnvelopeEvent = Event | {
  readonly kind: "channel-envelope/pack-gate";
  readonly msgType: number;
  readonly sequence: number;
  readonly payload: Uint8Array;
};
export type PackChannelEnvelopeAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface PackChannelEnvelopeStepResult {
  readonly state: PackChannelEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackChannelEnvelopeAction[];
}
export function initialPackChannelEnvelopeState(): PackChannelEnvelopeState {
  if (stryMutAct_9fa48("3366")) {
    {}
  } else {
    stryCov_9fa48("3366");
    return {};
  }
}
export function stepPackChannelEnvelopeWithActions(state: PackChannelEnvelopeState, event: PackChannelEnvelopeEvent): PackChannelEnvelopeStepResult {
  if (stryMutAct_9fa48("3367")) {
    {}
  } else {
    stryCov_9fa48("3367");
    if (stryMutAct_9fa48("3370") ? event.kind !== "channel-envelope/pack-gate" : stryMutAct_9fa48("3369") ? false : stryMutAct_9fa48("3368") ? true : (stryCov_9fa48("3368", "3369", "3370"), event.kind === (stryMutAct_9fa48("3371") ? "" : (stryCov_9fa48("3371"), "channel-envelope/pack-gate")))) {
      if (stryMutAct_9fa48("3372")) {
        {}
      } else {
        stryCov_9fa48("3372");
        try {
          if (stryMutAct_9fa48("3373")) {
            {}
          } else {
            stryCov_9fa48("3373");
            return stryMutAct_9fa48("3374") ? {} : (stryCov_9fa48("3374"), {
              state,
              intents: stryMutAct_9fa48("3375") ? ["Stryker was here"] : (stryCov_9fa48("3375"), []),
              actions: stryMutAct_9fa48("3376") ? [] : (stryCov_9fa48("3376"), [stryMutAct_9fa48("3377") ? {} : (stryCov_9fa48("3377"), {
                kind: stryMutAct_9fa48("3378") ? "" : (stryCov_9fa48("3378"), "use-raw"),
                raw: packChannelEnvelope(stryMutAct_9fa48("3379") ? {} : (stryCov_9fa48("3379"), {
                  msgType: event.msgType,
                  sequence: event.sequence,
                  payload: event.payload
                }))
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("3380")) {
            {}
          } else {
            stryCov_9fa48("3380");
            return stryMutAct_9fa48("3381") ? {} : (stryCov_9fa48("3381"), {
              state,
              intents: stryMutAct_9fa48("3382") ? ["Stryker was here"] : (stryCov_9fa48("3382"), []),
              actions: stryMutAct_9fa48("3383") ? [] : (stryCov_9fa48("3383"), [stryMutAct_9fa48("3384") ? {} : (stryCov_9fa48("3384"), {
                kind: stryMutAct_9fa48("3385") ? "" : (stryCov_9fa48("3385"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("3386") ? {} : (stryCov_9fa48("3386"), {
      state,
      intents: stryMutAct_9fa48("3387") ? ["Stryker was here"] : (stryCov_9fa48("3387"), []),
      actions: stryMutAct_9fa48("3388") ? ["Stryker was here"] : (stryCov_9fa48("3388"), [])
    });
  }
}
export function shouldUsePackChannelEnvelope(actions: ReadonlyArray<PackChannelEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("3389")) {
    {}
  } else {
    stryCov_9fa48("3389");
    return stryMutAct_9fa48("3390") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("3390"), actions.some(stryMutAct_9fa48("3391") ? () => undefined : (stryCov_9fa48("3391"), action => stryMutAct_9fa48("3394") ? action.kind !== "use-raw" : stryMutAct_9fa48("3393") ? false : stryMutAct_9fa48("3392") ? true : (stryCov_9fa48("3392", "3393", "3394"), action.kind === (stryMutAct_9fa48("3395") ? "" : (stryCov_9fa48("3395"), "use-raw"))))));
  }
}
export function shouldRejectPackChannelEnvelope(actions: ReadonlyArray<PackChannelEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("3396")) {
    {}
  } else {
    stryCov_9fa48("3396");
    return stryMutAct_9fa48("3397") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("3397"), actions.some(stryMutAct_9fa48("3398") ? () => undefined : (stryCov_9fa48("3398"), action => stryMutAct_9fa48("3401") ? action.kind !== "reject" : stryMutAct_9fa48("3400") ? false : stryMutAct_9fa48("3399") ? true : (stryCov_9fa48("3399", "3400", "3401"), action.kind === (stryMutAct_9fa48("3402") ? "" : (stryCov_9fa48("3402"), "reject"))))));
  }
}

/** Extract packed channel envelope from step actions; null when no `use-raw`. */
export function packChannelEnvelopeRawFromActions(actions: ReadonlyArray<PackChannelEnvelopeAction>): Uint8Array | null {
  if (stryMutAct_9fa48("3403")) {
    {}
  } else {
    stryCov_9fa48("3403");
    const action = actions.find(stryMutAct_9fa48("3404") ? () => undefined : (stryCov_9fa48("3404"), entry => stryMutAct_9fa48("3407") ? entry.kind !== "use-raw" : stryMutAct_9fa48("3406") ? false : stryMutAct_9fa48("3405") ? true : (stryCov_9fa48("3405", "3406", "3407"), entry.kind === (stryMutAct_9fa48("3408") ? "" : (stryCov_9fa48("3408"), "use-raw")))));
    return (stryMutAct_9fa48("3411") ? action?.kind !== "use-raw" : stryMutAct_9fa48("3410") ? false : stryMutAct_9fa48("3409") ? true : (stryCov_9fa48("3409", "3410", "3411"), (stryMutAct_9fa48("3412") ? action.kind : (stryCov_9fa48("3412"), action?.kind)) === (stryMutAct_9fa48("3413") ? "" : (stryCov_9fa48("3413"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Channel envelope unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackChannelEnvelope`
 * reads beside the step). Truncated frames become `reject`.
 */
export type UnpackChannelEnvelopeState = Record<string, never>;
export type UnpackChannelEnvelopeEvent = Event | {
  readonly kind: "channel-envelope/unpack-gate";
  readonly raw: Uint8Array;
};
export type UnpackChannelEnvelopeAction = {
  readonly kind: "use-fields";
  readonly fields: UnpackedChannelEnvelope;
} | {
  readonly kind: "reject";
};
export interface UnpackChannelEnvelopeStepResult {
  readonly state: UnpackChannelEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackChannelEnvelopeAction[];
}
export function initialUnpackChannelEnvelopeState(): UnpackChannelEnvelopeState {
  if (stryMutAct_9fa48("3414")) {
    {}
  } else {
    stryCov_9fa48("3414");
    return {};
  }
}
export function stepUnpackChannelEnvelopeWithActions(state: UnpackChannelEnvelopeState, event: UnpackChannelEnvelopeEvent): UnpackChannelEnvelopeStepResult {
  if (stryMutAct_9fa48("3415")) {
    {}
  } else {
    stryCov_9fa48("3415");
    if (stryMutAct_9fa48("3418") ? event.kind !== "channel-envelope/unpack-gate" : stryMutAct_9fa48("3417") ? false : stryMutAct_9fa48("3416") ? true : (stryCov_9fa48("3416", "3417", "3418"), event.kind === (stryMutAct_9fa48("3419") ? "" : (stryCov_9fa48("3419"), "channel-envelope/unpack-gate")))) {
      if (stryMutAct_9fa48("3420")) {
        {}
      } else {
        stryCov_9fa48("3420");
        const fields = unpackChannelEnvelope(event.raw);
        if (stryMutAct_9fa48("3423") ? fields !== null : stryMutAct_9fa48("3422") ? false : stryMutAct_9fa48("3421") ? true : (stryCov_9fa48("3421", "3422", "3423"), fields === null)) {
          if (stryMutAct_9fa48("3424")) {
            {}
          } else {
            stryCov_9fa48("3424");
            return stryMutAct_9fa48("3425") ? {} : (stryCov_9fa48("3425"), {
              state,
              intents: stryMutAct_9fa48("3426") ? ["Stryker was here"] : (stryCov_9fa48("3426"), []),
              actions: stryMutAct_9fa48("3427") ? [] : (stryCov_9fa48("3427"), [stryMutAct_9fa48("3428") ? {} : (stryCov_9fa48("3428"), {
                kind: stryMutAct_9fa48("3429") ? "" : (stryCov_9fa48("3429"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("3430") ? {} : (stryCov_9fa48("3430"), {
          state,
          intents: stryMutAct_9fa48("3431") ? ["Stryker was here"] : (stryCov_9fa48("3431"), []),
          actions: stryMutAct_9fa48("3432") ? [] : (stryCov_9fa48("3432"), [stryMutAct_9fa48("3433") ? {} : (stryCov_9fa48("3433"), {
            kind: stryMutAct_9fa48("3434") ? "" : (stryCov_9fa48("3434"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("3435") ? {} : (stryCov_9fa48("3435"), {
      state,
      intents: stryMutAct_9fa48("3436") ? ["Stryker was here"] : (stryCov_9fa48("3436"), []),
      actions: stryMutAct_9fa48("3437") ? ["Stryker was here"] : (stryCov_9fa48("3437"), [])
    });
  }
}
export function shouldUseUnpackChannelEnvelope(actions: ReadonlyArray<UnpackChannelEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("3438")) {
    {}
  } else {
    stryCov_9fa48("3438");
    return stryMutAct_9fa48("3439") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("3439"), actions.some(stryMutAct_9fa48("3440") ? () => undefined : (stryCov_9fa48("3440"), action => stryMutAct_9fa48("3443") ? action.kind !== "use-fields" : stryMutAct_9fa48("3442") ? false : stryMutAct_9fa48("3441") ? true : (stryCov_9fa48("3441", "3442", "3443"), action.kind === (stryMutAct_9fa48("3444") ? "" : (stryCov_9fa48("3444"), "use-fields"))))));
  }
}
export function shouldRejectUnpackChannelEnvelope(actions: ReadonlyArray<UnpackChannelEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("3445")) {
    {}
  } else {
    stryCov_9fa48("3445");
    return stryMutAct_9fa48("3446") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("3446"), actions.some(stryMutAct_9fa48("3447") ? () => undefined : (stryCov_9fa48("3447"), action => stryMutAct_9fa48("3450") ? action.kind !== "reject" : stryMutAct_9fa48("3449") ? false : stryMutAct_9fa48("3448") ? true : (stryCov_9fa48("3448", "3449", "3450"), action.kind === (stryMutAct_9fa48("3451") ? "" : (stryCov_9fa48("3451"), "reject"))))));
  }
}

/** Extract unpacked channel envelope from step actions; null when no `use-fields`. */
export function channelEnvelopeFieldsFromActions(actions: ReadonlyArray<UnpackChannelEnvelopeAction>): UnpackedChannelEnvelope | null {
  if (stryMutAct_9fa48("3452")) {
    {}
  } else {
    stryCov_9fa48("3452");
    const action = actions.find(stryMutAct_9fa48("3453") ? () => undefined : (stryCov_9fa48("3453"), entry => stryMutAct_9fa48("3456") ? entry.kind !== "use-fields" : stryMutAct_9fa48("3455") ? false : stryMutAct_9fa48("3454") ? true : (stryCov_9fa48("3454", "3455", "3456"), entry.kind === (stryMutAct_9fa48("3457") ? "" : (stryCov_9fa48("3457"), "use-fields")))));
    return (stryMutAct_9fa48("3460") ? action?.kind !== "use-fields" : stryMutAct_9fa48("3459") ? false : stryMutAct_9fa48("3458") ? true : (stryCov_9fa48("3458", "3459", "3460"), (stryMutAct_9fa48("3461") ? action.kind : (stryCov_9fa48("3461"), action?.kind)) === (stryMutAct_9fa48("3462") ? "" : (stryCov_9fa48("3462"), "use-fields")))) ? action.fields : null;
  }
}
export function isChannelSystemMsgType(msgType: number): boolean {
  if (stryMutAct_9fa48("3463")) {
    {}
  } else {
    stryCov_9fa48("3463");
    return stryMutAct_9fa48("3467") ? msgType < CHANNEL_SYSTEM_MSGTYPE_MIN : stryMutAct_9fa48("3466") ? msgType > CHANNEL_SYSTEM_MSGTYPE_MIN : stryMutAct_9fa48("3465") ? false : stryMutAct_9fa48("3464") ? true : (stryCov_9fa48("3464", "3465", "3466", "3467"), msgType >= CHANNEL_SYSTEM_MSGTYPE_MIN);
  }
}
export type ChannelMessageTypeRegistrationPlan = "ok" | "missing-msgtype" | "system-reserved";

/** Whether a channel MSGTYPE may be registered (missing / system-reserved gates). */
export function planChannelMessageTypeRegistration(input: {
  readonly msgType: number | undefined;
  readonly isSystemType: boolean;
}): ChannelMessageTypeRegistrationPlan {
  if (stryMutAct_9fa48("3468")) {
    {}
  } else {
    stryCov_9fa48("3468");
    if (stryMutAct_9fa48("3471") ? input.msgType !== undefined : stryMutAct_9fa48("3470") ? false : stryMutAct_9fa48("3469") ? true : (stryCov_9fa48("3469", "3470", "3471"), input.msgType === undefined)) {
      if (stryMutAct_9fa48("3472")) {
        {}
      } else {
        stryCov_9fa48("3472");
        return stryMutAct_9fa48("3473") ? "" : (stryCov_9fa48("3473"), "missing-msgtype");
      }
    }
    if (stryMutAct_9fa48("3476") ? isChannelSystemMsgType(input.msgType) || !input.isSystemType : stryMutAct_9fa48("3475") ? false : stryMutAct_9fa48("3474") ? true : (stryCov_9fa48("3474", "3475", "3476"), isChannelSystemMsgType(input.msgType) && (stryMutAct_9fa48("3477") ? input.isSystemType : (stryCov_9fa48("3477"), !input.isSystemType)))) {
      if (stryMutAct_9fa48("3478")) {
        {}
      } else {
        stryCov_9fa48("3478");
        return stryMutAct_9fa48("3479") ? "" : (stryCov_9fa48("3479"), "system-reserved");
      }
    }
    return stryMutAct_9fa48("3480") ? "" : (stryCov_9fa48("3480"), "ok");
  }
}
export type ChannelMessageTypeRegistrationPlanEvent = Event | {
  readonly kind: "channel/message-type-registration-plan-gate";
  readonly msgType: number | undefined;
  readonly isSystemType: boolean;
};
export type ChannelMessageTypeRegistrationPlanAction = {
  readonly kind: ChannelMessageTypeRegistrationPlan;
};

/** Extract the registration plan from actions; null when empty. */
export function channelMessageTypeRegistrationPlanFromActions(actions: ReadonlyArray<ChannelMessageTypeRegistrationPlanAction>): ChannelMessageTypeRegistrationPlan | null {
  if (stryMutAct_9fa48("3481")) {
    {}
  } else {
    stryCov_9fa48("3481");
    const action = actions.find(stryMutAct_9fa48("3482") ? () => undefined : (stryCov_9fa48("3482"), entry => stryMutAct_9fa48("3485") ? (entry.kind === "ok" || entry.kind === "missing-msgtype") && entry.kind === "system-reserved" : stryMutAct_9fa48("3484") ? false : stryMutAct_9fa48("3483") ? true : (stryCov_9fa48("3483", "3484", "3485"), (stryMutAct_9fa48("3487") ? entry.kind === "ok" && entry.kind === "missing-msgtype" : stryMutAct_9fa48("3486") ? false : (stryCov_9fa48("3486", "3487"), (stryMutAct_9fa48("3489") ? entry.kind !== "ok" : stryMutAct_9fa48("3488") ? false : (stryCov_9fa48("3488", "3489"), entry.kind === (stryMutAct_9fa48("3490") ? "" : (stryCov_9fa48("3490"), "ok")))) || (stryMutAct_9fa48("3492") ? entry.kind !== "missing-msgtype" : stryMutAct_9fa48("3491") ? false : (stryCov_9fa48("3491", "3492"), entry.kind === (stryMutAct_9fa48("3493") ? "" : (stryCov_9fa48("3493"), "missing-msgtype")))))) || (stryMutAct_9fa48("3495") ? entry.kind !== "system-reserved" : stryMutAct_9fa48("3494") ? false : (stryCov_9fa48("3494", "3495"), entry.kind === (stryMutAct_9fa48("3496") ? "" : (stryCov_9fa48("3496"), "system-reserved")))))));
    return stryMutAct_9fa48("3497") ? action?.kind && null : (stryCov_9fa48("3497"), (stryMutAct_9fa48("3498") ? action.kind : (stryCov_9fa48("3498"), action?.kind)) ?? null);
  }
}
export type ChannelMessageTypeRegistrationEvent = Event | {
  readonly kind: "channel/message-type-registration-gate";
  readonly msgType: number | undefined;
  readonly isSystemType: boolean;
};