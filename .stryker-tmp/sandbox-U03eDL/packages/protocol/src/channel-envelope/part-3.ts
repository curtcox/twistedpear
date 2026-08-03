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
import { CHANNEL_ENVELOPE_HEADER_SIZE, CHANNEL_SEQ_MODULUS } from "./part-1.js";
import { channelEnvelopePackPlanFromActions, planChannelEnvelopePack } from "./part-2.js";
import type { ChannelEnvelopePackEvent, ChannelEnvelopePackPlan, ChannelEnvelopePackPlanAction, ChannelEnvelopePackPlanEvent } from "./part-2.js";
/**
 * Channel-envelope-pack-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelEnvelopePack`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepChannelEnvelopePackWithActions}.
 */
export type ChannelEnvelopePackPlanState = Record<string, never>;
export interface ChannelEnvelopePackPlanStepResult {
  readonly state: ChannelEnvelopePackPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelEnvelopePackPlanAction[];
}
export function initialChannelEnvelopePackPlanState(): ChannelEnvelopePackPlanState {
  if (stryMutAct_9fa48("3735")) {
    {}
  } else {
    stryCov_9fa48("3735");
    return {};
  }
}
export function stepChannelEnvelopePackPlanWithActions(state: ChannelEnvelopePackPlanState, event: ChannelEnvelopePackPlanEvent): ChannelEnvelopePackPlanStepResult {
  if (stryMutAct_9fa48("3736")) {
    {}
  } else {
    stryCov_9fa48("3736");
    if (stryMutAct_9fa48("3739") ? event.kind !== "channel/envelope-pack-plan-gate" : stryMutAct_9fa48("3738") ? false : stryMutAct_9fa48("3737") ? true : (stryCov_9fa48("3737", "3738", "3739"), event.kind === (stryMutAct_9fa48("3740") ? "" : (stryCov_9fa48("3740"), "channel/envelope-pack-plan-gate")))) {
      if (stryMutAct_9fa48("3741")) {
        {}
      } else {
        stryCov_9fa48("3741");
        return stryMutAct_9fa48("3742") ? {} : (stryCov_9fa48("3742"), {
          state,
          intents: stryMutAct_9fa48("3743") ? ["Stryker was here"] : (stryCov_9fa48("3743"), []),
          actions: stryMutAct_9fa48("3744") ? [] : (stryCov_9fa48("3744"), [stryMutAct_9fa48("3745") ? {} : (stryCov_9fa48("3745"), {
            kind: planChannelEnvelopePack(event.messagePresent)
          })])
        });
      }
    }
    return stryMutAct_9fa48("3746") ? {} : (stryCov_9fa48("3746"), {
      state,
      intents: stryMutAct_9fa48("3747") ? ["Stryker was here"] : (stryCov_9fa48("3747"), []),
      actions: stryMutAct_9fa48("3748") ? ["Stryker was here"] : (stryCov_9fa48("3748"), [])
    });
  }
}
export function shouldProceedChannelEnvelopePackPlan(actions: ReadonlyArray<ChannelEnvelopePackPlanAction>): boolean {
  if (stryMutAct_9fa48("3749")) {
    {}
  } else {
    stryCov_9fa48("3749");
    return stryMutAct_9fa48("3750") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("3750"), actions.some(stryMutAct_9fa48("3751") ? () => undefined : (stryCov_9fa48("3751"), action => stryMutAct_9fa48("3754") ? action.kind !== "ok" : stryMutAct_9fa48("3753") ? false : stryMutAct_9fa48("3752") ? true : (stryCov_9fa48("3752", "3753", "3754"), action.kind === (stryMutAct_9fa48("3755") ? "" : (stryCov_9fa48("3755"), "ok"))))));
  }
}
export function shouldRejectChannelEnvelopePackPlanMissingMessage(actions: ReadonlyArray<ChannelEnvelopePackPlanAction>): boolean {
  if (stryMutAct_9fa48("3756")) {
    {}
  } else {
    stryCov_9fa48("3756");
    return stryMutAct_9fa48("3757") ? actions.every(action => action.kind === "missing-message") : (stryCov_9fa48("3757"), actions.some(stryMutAct_9fa48("3758") ? () => undefined : (stryCov_9fa48("3758"), action => stryMutAct_9fa48("3761") ? action.kind !== "missing-message" : stryMutAct_9fa48("3760") ? false : stryMutAct_9fa48("3759") ? true : (stryCov_9fa48("3759", "3760", "3761"), action.kind === (stryMutAct_9fa48("3762") ? "" : (stryCov_9fa48("3762"), "missing-message"))))));
  }
}

/**
 * Channel envelope pack gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepChannelEnvelopePackPlanWithActions}
 * (`ok`|`missing-message`).
 */
export type ChannelEnvelopePackState = Record<string, never>;

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepChannelEnvelopePackPlanWithActions}
 * (`ok`|`missing-message`).
 */
export type ChannelEnvelopePackAction = {
  readonly kind: ChannelEnvelopePackPlan;
};
export interface ChannelEnvelopePackStepResult {
  readonly state: ChannelEnvelopePackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelEnvelopePackAction[];
}
export function initialChannelEnvelopePackState(): ChannelEnvelopePackState {
  if (stryMutAct_9fa48("3763")) {
    {}
  } else {
    stryCov_9fa48("3763");
    return {};
  }
}
export const stepChannelEnvelopePack: StepFn<ChannelEnvelopePackState> = (state, event) => {
  if (stryMutAct_9fa48("3764")) {
    {}
  } else {
    stryCov_9fa48("3764");
    const result = stepChannelEnvelopePackInner(state, event as ChannelEnvelopePackEvent);
    return stryMutAct_9fa48("3765") ? {} : (stryCov_9fa48("3765"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepChannelEnvelopePackWithActions(state: ChannelEnvelopePackState, event: ChannelEnvelopePackEvent): ChannelEnvelopePackStepResult {
  if (stryMutAct_9fa48("3766")) {
    {}
  } else {
    stryCov_9fa48("3766");
    return stepChannelEnvelopePackInner(state, event);
  }
}
export function shouldProceedChannelEnvelopePack(actions: ReadonlyArray<ChannelEnvelopePackAction>): boolean {
  if (stryMutAct_9fa48("3767")) {
    {}
  } else {
    stryCov_9fa48("3767");
    return stryMutAct_9fa48("3768") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("3768"), actions.some(stryMutAct_9fa48("3769") ? () => undefined : (stryCov_9fa48("3769"), action => stryMutAct_9fa48("3772") ? action.kind !== "ok" : stryMutAct_9fa48("3771") ? false : stryMutAct_9fa48("3770") ? true : (stryCov_9fa48("3770", "3771", "3772"), action.kind === (stryMutAct_9fa48("3773") ? "" : (stryCov_9fa48("3773"), "ok"))))));
  }
}
export function shouldRejectChannelEnvelopePackMissingMessage(actions: ReadonlyArray<ChannelEnvelopePackAction>): boolean {
  if (stryMutAct_9fa48("3774")) {
    {}
  } else {
    stryCov_9fa48("3774");
    return stryMutAct_9fa48("3775") ? actions.every(action => action.kind === "missing-message") : (stryCov_9fa48("3775"), actions.some(stryMutAct_9fa48("3776") ? () => undefined : (stryCov_9fa48("3776"), action => stryMutAct_9fa48("3779") ? action.kind !== "missing-message" : stryMutAct_9fa48("3778") ? false : stryMutAct_9fa48("3777") ? true : (stryCov_9fa48("3777", "3778", "3779"), action.kind === (stryMutAct_9fa48("3780") ? "" : (stryCov_9fa48("3780"), "missing-message"))))));
  }
}
function stepChannelEnvelopePackInner(state: ChannelEnvelopePackState, event: ChannelEnvelopePackEvent): ChannelEnvelopePackStepResult {
  if (stryMutAct_9fa48("3781")) {
    {}
  } else {
    stryCov_9fa48("3781");
    if (stryMutAct_9fa48("3784") ? event.kind !== "channel/envelope-pack-gate" : stryMutAct_9fa48("3783") ? false : stryMutAct_9fa48("3782") ? true : (stryCov_9fa48("3782", "3783", "3784"), event.kind === (stryMutAct_9fa48("3785") ? "" : (stryCov_9fa48("3785"), "channel/envelope-pack-gate")))) {
      if (stryMutAct_9fa48("3786")) {
        {}
      } else {
        stryCov_9fa48("3786");
        const planActions = stepChannelEnvelopePackPlanWithActions(initialChannelEnvelopePackPlanState(), stryMutAct_9fa48("3787") ? {} : (stryCov_9fa48("3787"), {
          kind: stryMutAct_9fa48("3788") ? "" : (stryCov_9fa48("3788"), "channel/envelope-pack-plan-gate"),
          messagePresent: event.messagePresent
        })).actions;
        const plan = channelEnvelopePackPlanFromActions(planActions);
        if (stryMutAct_9fa48("3791") ? plan !== null : stryMutAct_9fa48("3790") ? false : stryMutAct_9fa48("3789") ? true : (stryCov_9fa48("3789", "3790", "3791"), plan === null)) {
          if (stryMutAct_9fa48("3792")) {
            {}
          } else {
            stryCov_9fa48("3792");
            return stryMutAct_9fa48("3793") ? {} : (stryCov_9fa48("3793"), {
              state,
              intents: stryMutAct_9fa48("3794") ? ["Stryker was here"] : (stryCov_9fa48("3794"), []),
              actions: stryMutAct_9fa48("3795") ? ["Stryker was here"] : (stryCov_9fa48("3795"), [])
            });
          }
        }
        return stryMutAct_9fa48("3796") ? {} : (stryCov_9fa48("3796"), {
          state,
          intents: stryMutAct_9fa48("3797") ? ["Stryker was here"] : (stryCov_9fa48("3797"), []),
          actions: stryMutAct_9fa48("3798") ? [] : (stryCov_9fa48("3798"), [stryMutAct_9fa48("3799") ? {} : (stryCov_9fa48("3799"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("3800") ? {} : (stryCov_9fa48("3800"), {
      state,
      intents: stryMutAct_9fa48("3801") ? ["Stryker was here"] : (stryCov_9fa48("3801"), []),
      actions: stryMutAct_9fa48("3802") ? ["Stryker was here"] : (stryCov_9fa48("3802"), [])
    });
  }
}

/** Whether a channel message-handler list should receive a new member. */
export function shouldRegisterChannelMessageHandler(alreadyPresent: boolean): boolean {
  if (stryMutAct_9fa48("3803")) {
    {}
  } else {
    stryCov_9fa48("3803");
    return stryMutAct_9fa48("3804") ? alreadyPresent : (stryCov_9fa48("3804"), !alreadyPresent);
  }
}

/**
 * Channel message-handler register gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRegisterChannelMessageHandler`
 * reads beside the step).
 */
export type RegisterChannelMessageHandlerState = Record<string, never>;
export type RegisterChannelMessageHandlerEvent = Event | {
  readonly kind: "channel/register-message-handler-gate";
  readonly alreadyPresent: boolean;
};
export type RegisterChannelMessageHandlerAction = {
  readonly kind: "register";
} | {
  readonly kind: "skip";
};
export interface RegisterChannelMessageHandlerStepResult {
  readonly state: RegisterChannelMessageHandlerState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterChannelMessageHandlerAction[];
}
export function initialRegisterChannelMessageHandlerState(): RegisterChannelMessageHandlerState {
  if (stryMutAct_9fa48("3805")) {
    {}
  } else {
    stryCov_9fa48("3805");
    return {};
  }
}
export function stepRegisterChannelMessageHandlerWithActions(state: RegisterChannelMessageHandlerState, event: RegisterChannelMessageHandlerEvent): RegisterChannelMessageHandlerStepResult {
  if (stryMutAct_9fa48("3806")) {
    {}
  } else {
    stryCov_9fa48("3806");
    if (stryMutAct_9fa48("3809") ? event.kind !== "channel/register-message-handler-gate" : stryMutAct_9fa48("3808") ? false : stryMutAct_9fa48("3807") ? true : (stryCov_9fa48("3807", "3808", "3809"), event.kind === (stryMutAct_9fa48("3810") ? "" : (stryCov_9fa48("3810"), "channel/register-message-handler-gate")))) {
      if (stryMutAct_9fa48("3811")) {
        {}
      } else {
        stryCov_9fa48("3811");
        return stryMutAct_9fa48("3812") ? {} : (stryCov_9fa48("3812"), {
          state,
          intents: stryMutAct_9fa48("3813") ? ["Stryker was here"] : (stryCov_9fa48("3813"), []),
          actions: stryMutAct_9fa48("3814") ? [] : (stryCov_9fa48("3814"), [stryMutAct_9fa48("3815") ? {} : (stryCov_9fa48("3815"), {
            kind: shouldRegisterChannelMessageHandler(event.alreadyPresent) ? stryMutAct_9fa48("3816") ? "" : (stryCov_9fa48("3816"), "register") : stryMutAct_9fa48("3817") ? "" : (stryCov_9fa48("3817"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("3818") ? {} : (stryCov_9fa48("3818"), {
      state,
      intents: stryMutAct_9fa48("3819") ? ["Stryker was here"] : (stryCov_9fa48("3819"), []),
      actions: stryMutAct_9fa48("3820") ? ["Stryker was here"] : (stryCov_9fa48("3820"), [])
    });
  }
}
export function shouldRegisterChannelMessageHandlerNow(actions: ReadonlyArray<RegisterChannelMessageHandlerAction>): boolean {
  if (stryMutAct_9fa48("3821")) {
    {}
  } else {
    stryCov_9fa48("3821");
    return stryMutAct_9fa48("3822") ? actions.every(action => action.kind === "register") : (stryCov_9fa48("3822"), actions.some(stryMutAct_9fa48("3823") ? () => undefined : (stryCov_9fa48("3823"), action => stryMutAct_9fa48("3826") ? action.kind !== "register" : stryMutAct_9fa48("3825") ? false : stryMutAct_9fa48("3824") ? true : (stryCov_9fa48("3824", "3825", "3826"), action.kind === (stryMutAct_9fa48("3827") ? "" : (stryCov_9fa48("3827"), "register"))))));
  }
}
export function shouldSkipRegisterChannelMessageHandler(actions: ReadonlyArray<RegisterChannelMessageHandlerAction>): boolean {
  if (stryMutAct_9fa48("3828")) {
    {}
  } else {
    stryCov_9fa48("3828");
    return stryMutAct_9fa48("3829") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("3829"), actions.some(stryMutAct_9fa48("3830") ? () => undefined : (stryCov_9fa48("3830"), action => stryMutAct_9fa48("3833") ? action.kind !== "skip" : stryMutAct_9fa48("3832") ? false : stryMutAct_9fa48("3831") ? true : (stryCov_9fa48("3831", "3832", "3833"), action.kind === (stryMutAct_9fa48("3834") ? "" : (stryCov_9fa48("3834"), "skip"))))));
  }
}

/**
 * Unregister a channel message handler: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterChannelMessageHandler(index: number): number | null {
  if (stryMutAct_9fa48("3835")) {
    {}
  } else {
    stryCov_9fa48("3835");
    return (stryMutAct_9fa48("3839") ? index < 0 : stryMutAct_9fa48("3838") ? index > 0 : stryMutAct_9fa48("3837") ? false : stryMutAct_9fa48("3836") ? true : (stryCov_9fa48("3836", "3837", "3838", "3839"), index >= 0)) ? index : null;
  }
}

/** Whether unregister may splice a planned handler index. */
export function shouldUnregisterChannelMessageHandler(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("3840")) {
    {}
  } else {
    stryCov_9fa48("3840");
    return indexPresent;
  }
}

/**
 * Channel message-handler unregister plan leaf is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterChannelMessageHandler` reads beside the step). Nested under
 * {@link stepChannelMessageHandlerUnregisterWithActions}.
 */
export type ChannelMessageHandlerUnregisterPlanState = Record<string, never>;
export type ChannelMessageHandlerUnregisterPlanEvent = Event | {
  readonly kind: "channel/message-handler-unregister-plan-gate";
  readonly index: number;
};
export type ChannelMessageHandlerUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};
export interface ChannelMessageHandlerUnregisterPlanStepResult {
  readonly state: ChannelMessageHandlerUnregisterPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelMessageHandlerUnregisterPlanAction[];
}
export function initialChannelMessageHandlerUnregisterPlanState(): ChannelMessageHandlerUnregisterPlanState {
  if (stryMutAct_9fa48("3841")) {
    {}
  } else {
    stryCov_9fa48("3841");
    return {};
  }
}
export function stepChannelMessageHandlerUnregisterPlanWithActions(state: ChannelMessageHandlerUnregisterPlanState, event: ChannelMessageHandlerUnregisterPlanEvent): ChannelMessageHandlerUnregisterPlanStepResult {
  if (stryMutAct_9fa48("3842")) {
    {}
  } else {
    stryCov_9fa48("3842");
    if (stryMutAct_9fa48("3845") ? event.kind !== "channel/message-handler-unregister-plan-gate" : stryMutAct_9fa48("3844") ? false : stryMutAct_9fa48("3843") ? true : (stryCov_9fa48("3843", "3844", "3845"), event.kind === (stryMutAct_9fa48("3846") ? "" : (stryCov_9fa48("3846"), "channel/message-handler-unregister-plan-gate")))) {
      if (stryMutAct_9fa48("3847")) {
        {}
      } else {
        stryCov_9fa48("3847");
        const index = planUnregisterChannelMessageHandler(event.index);
        return stryMutAct_9fa48("3848") ? {} : (stryCov_9fa48("3848"), {
          state,
          intents: stryMutAct_9fa48("3849") ? ["Stryker was here"] : (stryCov_9fa48("3849"), []),
          actions: (stryMutAct_9fa48("3852") ? index !== null : stryMutAct_9fa48("3851") ? false : stryMutAct_9fa48("3850") ? true : (stryCov_9fa48("3850", "3851", "3852"), index === null)) ? stryMutAct_9fa48("3853") ? ["Stryker was here"] : (stryCov_9fa48("3853"), []) : stryMutAct_9fa48("3854") ? [] : (stryCov_9fa48("3854"), [stryMutAct_9fa48("3855") ? {} : (stryCov_9fa48("3855"), {
            kind: stryMutAct_9fa48("3856") ? "" : (stryCov_9fa48("3856"), "remove"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("3857") ? {} : (stryCov_9fa48("3857"), {
      state,
      intents: stryMutAct_9fa48("3858") ? ["Stryker was here"] : (stryCov_9fa48("3858"), []),
      actions: stryMutAct_9fa48("3859") ? ["Stryker was here"] : (stryCov_9fa48("3859"), [])
    });
  }
}
export function channelMessageHandlerUnregisterPlanIndex(actions: ReadonlyArray<ChannelMessageHandlerUnregisterPlanAction>): number | null {
  if (stryMutAct_9fa48("3860")) {
    {}
  } else {
    stryCov_9fa48("3860");
    const action = actions.find(stryMutAct_9fa48("3861") ? () => undefined : (stryCov_9fa48("3861"), entry => stryMutAct_9fa48("3864") ? entry.kind !== "remove" : stryMutAct_9fa48("3863") ? false : stryMutAct_9fa48("3862") ? true : (stryCov_9fa48("3862", "3863", "3864"), entry.kind === (stryMutAct_9fa48("3865") ? "" : (stryCov_9fa48("3865"), "remove")))));
    return (stryMutAct_9fa48("3868") ? action?.kind !== "remove" : stryMutAct_9fa48("3867") ? false : stryMutAct_9fa48("3866") ? true : (stryCov_9fa48("3866", "3867", "3868"), (stryMutAct_9fa48("3869") ? action.kind : (stryCov_9fa48("3869"), action?.kind)) === (stryMutAct_9fa48("3870") ? "" : (stryCov_9fa48("3870"), "remove")))) ? action.index : null;
  }
}
export function shouldRemoveChannelMessageHandlerUnregisterPlan(actions: ReadonlyArray<ChannelMessageHandlerUnregisterPlanAction>): boolean {
  if (stryMutAct_9fa48("3871")) {
    {}
  } else {
    stryCov_9fa48("3871");
    return stryMutAct_9fa48("3872") ? actions.every(action => action.kind === "remove") : (stryCov_9fa48("3872"), actions.some(stryMutAct_9fa48("3873") ? () => undefined : (stryCov_9fa48("3873"), action => stryMutAct_9fa48("3876") ? action.kind !== "remove" : stryMutAct_9fa48("3875") ? false : stryMutAct_9fa48("3874") ? true : (stryCov_9fa48("3874", "3875", "3876"), action.kind === (stryMutAct_9fa48("3877") ? "" : (stryCov_9fa48("3877"), "remove"))))));
  }
}

/**
 * Channel message-handler unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterChannelMessageHandler` reads beside the step).
 * Plan nested via {@link stepChannelMessageHandlerUnregisterPlanWithActions}
 * (`remove`).
 */
export type ChannelMessageHandlerUnregisterState = Record<string, never>;
export type ChannelMessageHandlerUnregisterEvent = Event | {
  readonly kind: "channel/message-handler-unregister-gate";
  readonly index: number;
};
export type ChannelMessageHandlerUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};
export interface ChannelMessageHandlerUnregisterStepResult {
  readonly state: ChannelMessageHandlerUnregisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelMessageHandlerUnregisterAction[];
}
export function initialChannelMessageHandlerUnregisterState(): ChannelMessageHandlerUnregisterState {
  if (stryMutAct_9fa48("3878")) {
    {}
  } else {
    stryCov_9fa48("3878");
    return {};
  }
}
export function stepChannelMessageHandlerUnregisterWithActions(state: ChannelMessageHandlerUnregisterState, event: ChannelMessageHandlerUnregisterEvent): ChannelMessageHandlerUnregisterStepResult {
  if (stryMutAct_9fa48("3879")) {
    {}
  } else {
    stryCov_9fa48("3879");
    if (stryMutAct_9fa48("3882") ? event.kind !== "channel/message-handler-unregister-gate" : stryMutAct_9fa48("3881") ? false : stryMutAct_9fa48("3880") ? true : (stryCov_9fa48("3880", "3881", "3882"), event.kind === (stryMutAct_9fa48("3883") ? "" : (stryCov_9fa48("3883"), "channel/message-handler-unregister-gate")))) {
      if (stryMutAct_9fa48("3884")) {
        {}
      } else {
        stryCov_9fa48("3884");
        const planActions = stepChannelMessageHandlerUnregisterPlanWithActions(initialChannelMessageHandlerUnregisterPlanState(), stryMutAct_9fa48("3885") ? {} : (stryCov_9fa48("3885"), {
          kind: stryMutAct_9fa48("3886") ? "" : (stryCov_9fa48("3886"), "channel/message-handler-unregister-plan-gate"),
          index: event.index
        })).actions;
        const index = channelMessageHandlerUnregisterPlanIndex(planActions);
        return stryMutAct_9fa48("3887") ? {} : (stryCov_9fa48("3887"), {
          state,
          intents: stryMutAct_9fa48("3888") ? ["Stryker was here"] : (stryCov_9fa48("3888"), []),
          actions: (stryMutAct_9fa48("3891") ? index !== null : stryMutAct_9fa48("3890") ? false : stryMutAct_9fa48("3889") ? true : (stryCov_9fa48("3889", "3890", "3891"), index === null)) ? stryMutAct_9fa48("3892") ? ["Stryker was here"] : (stryCov_9fa48("3892"), []) : stryMutAct_9fa48("3893") ? [] : (stryCov_9fa48("3893"), [stryMutAct_9fa48("3894") ? {} : (stryCov_9fa48("3894"), {
            kind: stryMutAct_9fa48("3895") ? "" : (stryCov_9fa48("3895"), "remove"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("3896") ? {} : (stryCov_9fa48("3896"), {
      state,
      intents: stryMutAct_9fa48("3897") ? ["Stryker was here"] : (stryCov_9fa48("3897"), []),
      actions: stryMutAct_9fa48("3898") ? ["Stryker was here"] : (stryCov_9fa48("3898"), [])
    });
  }
}
export function channelMessageHandlerUnregisterIndex(actions: ReadonlyArray<ChannelMessageHandlerUnregisterAction>): number | null {
  if (stryMutAct_9fa48("3899")) {
    {}
  } else {
    stryCov_9fa48("3899");
    const action = actions.find(stryMutAct_9fa48("3900") ? () => undefined : (stryCov_9fa48("3900"), entry => stryMutAct_9fa48("3903") ? entry.kind !== "remove" : stryMutAct_9fa48("3902") ? false : stryMutAct_9fa48("3901") ? true : (stryCov_9fa48("3901", "3902", "3903"), entry.kind === (stryMutAct_9fa48("3904") ? "" : (stryCov_9fa48("3904"), "remove")))));
    return (stryMutAct_9fa48("3907") ? action?.kind !== "remove" : stryMutAct_9fa48("3906") ? false : stryMutAct_9fa48("3905") ? true : (stryCov_9fa48("3905", "3906", "3907"), (stryMutAct_9fa48("3908") ? action.kind : (stryCov_9fa48("3908"), action?.kind)) === (stryMutAct_9fa48("3909") ? "" : (stryCov_9fa48("3909"), "remove")))) ? action.index : null;
  }
}
export function shouldRemoveChannelMessageHandler(actions: ReadonlyArray<ChannelMessageHandlerUnregisterAction>): boolean {
  if (stryMutAct_9fa48("3910")) {
    {}
  } else {
    stryCov_9fa48("3910");
    return stryMutAct_9fa48("3911") ? actions.every(action => action.kind === "remove") : (stryCov_9fa48("3911"), actions.some(stryMutAct_9fa48("3912") ? () => undefined : (stryCov_9fa48("3912"), action => stryMutAct_9fa48("3915") ? action.kind !== "remove" : stryMutAct_9fa48("3914") ? false : stryMutAct_9fa48("3913") ? true : (stryCov_9fa48("3913", "3914", "3915"), action.kind === (stryMutAct_9fa48("3916") ? "" : (stryCov_9fa48("3916"), "remove"))))));
  }
}

/** Whether channel message-handler fan-out should stop after a handler returns handled. */
export function shouldStopChannelHandlerFanout(handled: boolean): boolean {
  if (stryMutAct_9fa48("3917")) {
    {}
  } else {
    stryCov_9fa48("3917");
    return handled;
  }
}

/**
 * Channel message-handler fan-out stop gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldStopChannelHandlerFanout`
 * reads beside the step).
 */
export type StopChannelHandlerFanoutState = Record<string, never>;
export type StopChannelHandlerFanoutEvent = Event | {
  readonly kind: "channel/stop-handler-fanout-gate";
  readonly handled: boolean;
};
export type StopChannelHandlerFanoutAction = {
  readonly kind: "stop";
} | {
  readonly kind: "continue";
};
export interface StopChannelHandlerFanoutStepResult {
  readonly state: StopChannelHandlerFanoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StopChannelHandlerFanoutAction[];
}
export function initialStopChannelHandlerFanoutState(): StopChannelHandlerFanoutState {
  if (stryMutAct_9fa48("3918")) {
    {}
  } else {
    stryCov_9fa48("3918");
    return {};
  }
}
export function stepStopChannelHandlerFanoutWithActions(state: StopChannelHandlerFanoutState, event: StopChannelHandlerFanoutEvent): StopChannelHandlerFanoutStepResult {
  if (stryMutAct_9fa48("3919")) {
    {}
  } else {
    stryCov_9fa48("3919");
    if (stryMutAct_9fa48("3922") ? event.kind !== "channel/stop-handler-fanout-gate" : stryMutAct_9fa48("3921") ? false : stryMutAct_9fa48("3920") ? true : (stryCov_9fa48("3920", "3921", "3922"), event.kind === (stryMutAct_9fa48("3923") ? "" : (stryCov_9fa48("3923"), "channel/stop-handler-fanout-gate")))) {
      if (stryMutAct_9fa48("3924")) {
        {}
      } else {
        stryCov_9fa48("3924");
        return stryMutAct_9fa48("3925") ? {} : (stryCov_9fa48("3925"), {
          state,
          intents: stryMutAct_9fa48("3926") ? ["Stryker was here"] : (stryCov_9fa48("3926"), []),
          actions: stryMutAct_9fa48("3927") ? [] : (stryCov_9fa48("3927"), [stryMutAct_9fa48("3928") ? {} : (stryCov_9fa48("3928"), {
            kind: shouldStopChannelHandlerFanout(event.handled) ? stryMutAct_9fa48("3929") ? "" : (stryCov_9fa48("3929"), "stop") : stryMutAct_9fa48("3930") ? "" : (stryCov_9fa48("3930"), "continue")
          })])
        });
      }
    }
    return stryMutAct_9fa48("3931") ? {} : (stryCov_9fa48("3931"), {
      state,
      intents: stryMutAct_9fa48("3932") ? ["Stryker was here"] : (stryCov_9fa48("3932"), []),
      actions: stryMutAct_9fa48("3933") ? ["Stryker was here"] : (stryCov_9fa48("3933"), [])
    });
  }
}
export function shouldStopChannelHandlerFanoutNow(actions: ReadonlyArray<StopChannelHandlerFanoutAction>): boolean {
  if (stryMutAct_9fa48("3934")) {
    {}
  } else {
    stryCov_9fa48("3934");
    return stryMutAct_9fa48("3935") ? actions.every(action => action.kind === "stop") : (stryCov_9fa48("3935"), actions.some(stryMutAct_9fa48("3936") ? () => undefined : (stryCov_9fa48("3936"), action => stryMutAct_9fa48("3939") ? action.kind !== "stop" : stryMutAct_9fa48("3938") ? false : stryMutAct_9fa48("3937") ? true : (stryCov_9fa48("3937", "3938", "3939"), action.kind === (stryMutAct_9fa48("3940") ? "" : (stryCov_9fa48("3940"), "stop"))))));
  }
}
export function shouldContinueChannelHandlerFanout(actions: ReadonlyArray<StopChannelHandlerFanoutAction>): boolean {
  if (stryMutAct_9fa48("3941")) {
    {}
  } else {
    stryCov_9fa48("3941");
    return stryMutAct_9fa48("3942") ? actions.every(action => action.kind === "continue") : (stryCov_9fa48("3942"), actions.some(stryMutAct_9fa48("3943") ? () => undefined : (stryCov_9fa48("3943"), action => stryMutAct_9fa48("3946") ? action.kind !== "continue" : stryMutAct_9fa48("3945") ? false : stryMutAct_9fa48("3944") ? true : (stryCov_9fa48("3944", "3945", "3946"), action.kind === (stryMutAct_9fa48("3947") ? "" : (stryCov_9fa48("3947"), "continue"))))));
  }
}
export function channelPayloadMdu(outletMdu: number): number {
  if (stryMutAct_9fa48("3948")) {
    {}
  } else {
    stryCov_9fa48("3948");
    const value = stryMutAct_9fa48("3949") ? outletMdu + CHANNEL_ENVELOPE_HEADER_SIZE : (stryCov_9fa48("3949"), outletMdu - CHANNEL_ENVELOPE_HEADER_SIZE);
    return (stryMutAct_9fa48("3953") ? value <= 0xffff : stryMutAct_9fa48("3952") ? value >= 0xffff : stryMutAct_9fa48("3951") ? false : stryMutAct_9fa48("3950") ? true : (stryCov_9fa48("3950", "3951", "3952", "3953"), value > 0xffff)) ? 0xffff : value;
  }
}
export function nextChannelSequence(sequence: number): number {
  if (stryMutAct_9fa48("3954")) {
    {}
  } else {
    stryCov_9fa48("3954");
    return stryMutAct_9fa48("3955") ? (sequence + 1) * CHANNEL_SEQ_MODULUS : (stryCov_9fa48("3955"), (stryMutAct_9fa48("3956") ? sequence - 1 : (stryCov_9fa48("3956"), sequence + 1)) % CHANNEL_SEQ_MODULUS);
  }
}