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
import { channelMessageTypeRegistrationPlanFromActions, planChannelMessageTypeRegistration } from "./part-1.js";
import type { ChannelMessageTypeRegistrationEvent, ChannelMessageTypeRegistrationPlan, ChannelMessageTypeRegistrationPlanAction, ChannelMessageTypeRegistrationPlanEvent } from "./part-1.js";
/**
 * Channel-message-type-registration-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelMessageTypeRegistration`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepChannelMessageTypeRegistrationWithActions}.
 */
export type ChannelMessageTypeRegistrationPlanState = Record<string, never>;
export interface ChannelMessageTypeRegistrationPlanStepResult {
  readonly state: ChannelMessageTypeRegistrationPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelMessageTypeRegistrationPlanAction[];
}
export function initialChannelMessageTypeRegistrationPlanState(): ChannelMessageTypeRegistrationPlanState {
  if (stryMutAct_9fa48("3499")) {
    {}
  } else {
    stryCov_9fa48("3499");
    return {};
  }
}
export function stepChannelMessageTypeRegistrationPlanWithActions(state: ChannelMessageTypeRegistrationPlanState, event: ChannelMessageTypeRegistrationPlanEvent): ChannelMessageTypeRegistrationPlanStepResult {
  if (stryMutAct_9fa48("3500")) {
    {}
  } else {
    stryCov_9fa48("3500");
    if (stryMutAct_9fa48("3503") ? event.kind !== "channel/message-type-registration-plan-gate" : stryMutAct_9fa48("3502") ? false : stryMutAct_9fa48("3501") ? true : (stryCov_9fa48("3501", "3502", "3503"), event.kind === (stryMutAct_9fa48("3504") ? "" : (stryCov_9fa48("3504"), "channel/message-type-registration-plan-gate")))) {
      if (stryMutAct_9fa48("3505")) {
        {}
      } else {
        stryCov_9fa48("3505");
        return stryMutAct_9fa48("3506") ? {} : (stryCov_9fa48("3506"), {
          state,
          intents: stryMutAct_9fa48("3507") ? ["Stryker was here"] : (stryCov_9fa48("3507"), []),
          actions: stryMutAct_9fa48("3508") ? [] : (stryCov_9fa48("3508"), [stryMutAct_9fa48("3509") ? {} : (stryCov_9fa48("3509"), {
            kind: planChannelMessageTypeRegistration(stryMutAct_9fa48("3510") ? {} : (stryCov_9fa48("3510"), {
              msgType: event.msgType,
              isSystemType: event.isSystemType
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("3511") ? {} : (stryCov_9fa48("3511"), {
      state,
      intents: stryMutAct_9fa48("3512") ? ["Stryker was here"] : (stryCov_9fa48("3512"), []),
      actions: stryMutAct_9fa48("3513") ? ["Stryker was here"] : (stryCov_9fa48("3513"), [])
    });
  }
}
export function shouldProceedChannelMessageTypeRegistrationPlan(actions: ReadonlyArray<ChannelMessageTypeRegistrationPlanAction>): boolean {
  if (stryMutAct_9fa48("3514")) {
    {}
  } else {
    stryCov_9fa48("3514");
    return stryMutAct_9fa48("3515") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("3515"), actions.some(stryMutAct_9fa48("3516") ? () => undefined : (stryCov_9fa48("3516"), action => stryMutAct_9fa48("3519") ? action.kind !== "ok" : stryMutAct_9fa48("3518") ? false : stryMutAct_9fa48("3517") ? true : (stryCov_9fa48("3517", "3518", "3519"), action.kind === (stryMutAct_9fa48("3520") ? "" : (stryCov_9fa48("3520"), "ok"))))));
  }
}
export function shouldRejectChannelMessageTypeRegistrationPlanMissingMsgtype(actions: ReadonlyArray<ChannelMessageTypeRegistrationPlanAction>): boolean {
  if (stryMutAct_9fa48("3521")) {
    {}
  } else {
    stryCov_9fa48("3521");
    return stryMutAct_9fa48("3522") ? actions.every(action => action.kind === "missing-msgtype") : (stryCov_9fa48("3522"), actions.some(stryMutAct_9fa48("3523") ? () => undefined : (stryCov_9fa48("3523"), action => stryMutAct_9fa48("3526") ? action.kind !== "missing-msgtype" : stryMutAct_9fa48("3525") ? false : stryMutAct_9fa48("3524") ? true : (stryCov_9fa48("3524", "3525", "3526"), action.kind === (stryMutAct_9fa48("3527") ? "" : (stryCov_9fa48("3527"), "missing-msgtype"))))));
  }
}
export function shouldRejectChannelMessageTypeRegistrationPlanSystemReserved(actions: ReadonlyArray<ChannelMessageTypeRegistrationPlanAction>): boolean {
  if (stryMutAct_9fa48("3528")) {
    {}
  } else {
    stryCov_9fa48("3528");
    return stryMutAct_9fa48("3529") ? actions.every(action => action.kind === "system-reserved") : (stryCov_9fa48("3529"), actions.some(stryMutAct_9fa48("3530") ? () => undefined : (stryCov_9fa48("3530"), action => stryMutAct_9fa48("3533") ? action.kind !== "system-reserved" : stryMutAct_9fa48("3532") ? false : stryMutAct_9fa48("3531") ? true : (stryCov_9fa48("3531", "3532", "3533"), action.kind === (stryMutAct_9fa48("3534") ? "" : (stryCov_9fa48("3534"), "system-reserved"))))));
  }
}

/**
 * Channel MSGTYPE registration gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepChannelMessageTypeRegistrationPlanWithActions}
 * (`ok`|`missing-msgtype`|`system-reserved`).
 */
export type ChannelMessageTypeRegistrationState = Record<string, never>;

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepChannelMessageTypeRegistrationPlanWithActions}
 * (`ok`|`missing-msgtype`|`system-reserved`).
 */
export type ChannelMessageTypeRegistrationAction = {
  readonly kind: ChannelMessageTypeRegistrationPlan;
};
export interface ChannelMessageTypeRegistrationStepResult {
  readonly state: ChannelMessageTypeRegistrationState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelMessageTypeRegistrationAction[];
}
export function initialChannelMessageTypeRegistrationState(): ChannelMessageTypeRegistrationState {
  if (stryMutAct_9fa48("3535")) {
    {}
  } else {
    stryCov_9fa48("3535");
    return {};
  }
}
export const stepChannelMessageTypeRegistration: StepFn<ChannelMessageTypeRegistrationState> = (state, event) => {
  if (stryMutAct_9fa48("3536")) {
    {}
  } else {
    stryCov_9fa48("3536");
    const result = stepChannelMessageTypeRegistrationInner(state, event as ChannelMessageTypeRegistrationEvent);
    return stryMutAct_9fa48("3537") ? {} : (stryCov_9fa48("3537"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepChannelMessageTypeRegistrationWithActions(state: ChannelMessageTypeRegistrationState, event: ChannelMessageTypeRegistrationEvent): ChannelMessageTypeRegistrationStepResult {
  if (stryMutAct_9fa48("3538")) {
    {}
  } else {
    stryCov_9fa48("3538");
    return stepChannelMessageTypeRegistrationInner(state, event);
  }
}
export function shouldProceedChannelMessageTypeRegistration(actions: ReadonlyArray<ChannelMessageTypeRegistrationAction>): boolean {
  if (stryMutAct_9fa48("3539")) {
    {}
  } else {
    stryCov_9fa48("3539");
    return stryMutAct_9fa48("3540") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("3540"), actions.some(stryMutAct_9fa48("3541") ? () => undefined : (stryCov_9fa48("3541"), action => stryMutAct_9fa48("3544") ? action.kind !== "ok" : stryMutAct_9fa48("3543") ? false : stryMutAct_9fa48("3542") ? true : (stryCov_9fa48("3542", "3543", "3544"), action.kind === (stryMutAct_9fa48("3545") ? "" : (stryCov_9fa48("3545"), "ok"))))));
  }
}
export function shouldRejectChannelMessageTypeMissingMsgtype(actions: ReadonlyArray<ChannelMessageTypeRegistrationAction>): boolean {
  if (stryMutAct_9fa48("3546")) {
    {}
  } else {
    stryCov_9fa48("3546");
    return stryMutAct_9fa48("3547") ? actions.every(action => action.kind === "missing-msgtype") : (stryCov_9fa48("3547"), actions.some(stryMutAct_9fa48("3548") ? () => undefined : (stryCov_9fa48("3548"), action => stryMutAct_9fa48("3551") ? action.kind !== "missing-msgtype" : stryMutAct_9fa48("3550") ? false : stryMutAct_9fa48("3549") ? true : (stryCov_9fa48("3549", "3550", "3551"), action.kind === (stryMutAct_9fa48("3552") ? "" : (stryCov_9fa48("3552"), "missing-msgtype"))))));
  }
}
export function shouldRejectChannelMessageTypeSystemReserved(actions: ReadonlyArray<ChannelMessageTypeRegistrationAction>): boolean {
  if (stryMutAct_9fa48("3553")) {
    {}
  } else {
    stryCov_9fa48("3553");
    return stryMutAct_9fa48("3554") ? actions.every(action => action.kind === "system-reserved") : (stryCov_9fa48("3554"), actions.some(stryMutAct_9fa48("3555") ? () => undefined : (stryCov_9fa48("3555"), action => stryMutAct_9fa48("3558") ? action.kind !== "system-reserved" : stryMutAct_9fa48("3557") ? false : stryMutAct_9fa48("3556") ? true : (stryCov_9fa48("3556", "3557", "3558"), action.kind === (stryMutAct_9fa48("3559") ? "" : (stryCov_9fa48("3559"), "system-reserved"))))));
  }
}
function stepChannelMessageTypeRegistrationInner(state: ChannelMessageTypeRegistrationState, event: ChannelMessageTypeRegistrationEvent): ChannelMessageTypeRegistrationStepResult {
  if (stryMutAct_9fa48("3560")) {
    {}
  } else {
    stryCov_9fa48("3560");
    if (stryMutAct_9fa48("3563") ? event.kind !== "channel/message-type-registration-gate" : stryMutAct_9fa48("3562") ? false : stryMutAct_9fa48("3561") ? true : (stryCov_9fa48("3561", "3562", "3563"), event.kind === (stryMutAct_9fa48("3564") ? "" : (stryCov_9fa48("3564"), "channel/message-type-registration-gate")))) {
      if (stryMutAct_9fa48("3565")) {
        {}
      } else {
        stryCov_9fa48("3565");
        const planActions = stepChannelMessageTypeRegistrationPlanWithActions(initialChannelMessageTypeRegistrationPlanState(), stryMutAct_9fa48("3566") ? {} : (stryCov_9fa48("3566"), {
          kind: stryMutAct_9fa48("3567") ? "" : (stryCov_9fa48("3567"), "channel/message-type-registration-plan-gate"),
          msgType: event.msgType,
          isSystemType: event.isSystemType
        })).actions;
        const plan = channelMessageTypeRegistrationPlanFromActions(planActions);
        if (stryMutAct_9fa48("3570") ? plan !== null : stryMutAct_9fa48("3569") ? false : stryMutAct_9fa48("3568") ? true : (stryCov_9fa48("3568", "3569", "3570"), plan === null)) {
          if (stryMutAct_9fa48("3571")) {
            {}
          } else {
            stryCov_9fa48("3571");
            return stryMutAct_9fa48("3572") ? {} : (stryCov_9fa48("3572"), {
              state,
              intents: stryMutAct_9fa48("3573") ? ["Stryker was here"] : (stryCov_9fa48("3573"), []),
              actions: stryMutAct_9fa48("3574") ? ["Stryker was here"] : (stryCov_9fa48("3574"), [])
            });
          }
        }
        return stryMutAct_9fa48("3575") ? {} : (stryCov_9fa48("3575"), {
          state,
          intents: stryMutAct_9fa48("3576") ? ["Stryker was here"] : (stryCov_9fa48("3576"), []),
          actions: stryMutAct_9fa48("3577") ? [] : (stryCov_9fa48("3577"), [stryMutAct_9fa48("3578") ? {} : (stryCov_9fa48("3578"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("3579") ? {} : (stryCov_9fa48("3579"), {
      state,
      intents: stryMutAct_9fa48("3580") ? ["Stryker was here"] : (stryCov_9fa48("3580"), []),
      actions: stryMutAct_9fa48("3581") ? ["Stryker was here"] : (stryCov_9fa48("3581"), [])
    });
  }
}
export type ChannelEnvelopeUnpackPlan = "ok" | "missing-raw" | "truncated" | "not-registered";

/** Whether Envelope.unpack may construct a typed message from raw bytes. */
export function planChannelEnvelopeUnpack(input: {
  readonly rawPresent: boolean;
  readonly framingOk: boolean;
  readonly factoryRegistered: boolean;
}): ChannelEnvelopeUnpackPlan {
  if (stryMutAct_9fa48("3582")) {
    {}
  } else {
    stryCov_9fa48("3582");
    if (stryMutAct_9fa48("3585") ? false : stryMutAct_9fa48("3584") ? true : stryMutAct_9fa48("3583") ? input.rawPresent : (stryCov_9fa48("3583", "3584", "3585"), !input.rawPresent)) {
      if (stryMutAct_9fa48("3586")) {
        {}
      } else {
        stryCov_9fa48("3586");
        return stryMutAct_9fa48("3587") ? "" : (stryCov_9fa48("3587"), "missing-raw");
      }
    }
    if (stryMutAct_9fa48("3590") ? false : stryMutAct_9fa48("3589") ? true : stryMutAct_9fa48("3588") ? input.framingOk : (stryCov_9fa48("3588", "3589", "3590"), !input.framingOk)) {
      if (stryMutAct_9fa48("3591")) {
        {}
      } else {
        stryCov_9fa48("3591");
        return stryMutAct_9fa48("3592") ? "" : (stryCov_9fa48("3592"), "truncated");
      }
    }
    if (stryMutAct_9fa48("3595") ? false : stryMutAct_9fa48("3594") ? true : stryMutAct_9fa48("3593") ? input.factoryRegistered : (stryCov_9fa48("3593", "3594", "3595"), !input.factoryRegistered)) {
      if (stryMutAct_9fa48("3596")) {
        {}
      } else {
        stryCov_9fa48("3596");
        return stryMutAct_9fa48("3597") ? "" : (stryCov_9fa48("3597"), "not-registered");
      }
    }
    return stryMutAct_9fa48("3598") ? "" : (stryCov_9fa48("3598"), "ok");
  }
}

/**
 * Channel-envelope-unpack-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelEnvelopeUnpack`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepChannelEnvelopeUnpackWithActions}.
 */
export type ChannelEnvelopeUnpackPlanState = Record<string, never>;
export type ChannelEnvelopeUnpackPlanEvent = Event | {
  readonly kind: "channel/envelope-unpack-plan-gate";
  readonly rawPresent: boolean;
  readonly framingOk: boolean;
  readonly factoryRegistered: boolean;
};
export type ChannelEnvelopeUnpackPlanAction = {
  readonly kind: ChannelEnvelopeUnpackPlan;
};
export interface ChannelEnvelopeUnpackPlanStepResult {
  readonly state: ChannelEnvelopeUnpackPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelEnvelopeUnpackPlanAction[];
}
export function initialChannelEnvelopeUnpackPlanState(): ChannelEnvelopeUnpackPlanState {
  if (stryMutAct_9fa48("3599")) {
    {}
  } else {
    stryCov_9fa48("3599");
    return {};
  }
}
export function stepChannelEnvelopeUnpackPlanWithActions(state: ChannelEnvelopeUnpackPlanState, event: ChannelEnvelopeUnpackPlanEvent): ChannelEnvelopeUnpackPlanStepResult {
  if (stryMutAct_9fa48("3600")) {
    {}
  } else {
    stryCov_9fa48("3600");
    if (stryMutAct_9fa48("3603") ? event.kind !== "channel/envelope-unpack-plan-gate" : stryMutAct_9fa48("3602") ? false : stryMutAct_9fa48("3601") ? true : (stryCov_9fa48("3601", "3602", "3603"), event.kind === (stryMutAct_9fa48("3604") ? "" : (stryCov_9fa48("3604"), "channel/envelope-unpack-plan-gate")))) {
      if (stryMutAct_9fa48("3605")) {
        {}
      } else {
        stryCov_9fa48("3605");
        return stryMutAct_9fa48("3606") ? {} : (stryCov_9fa48("3606"), {
          state,
          intents: stryMutAct_9fa48("3607") ? ["Stryker was here"] : (stryCov_9fa48("3607"), []),
          actions: stryMutAct_9fa48("3608") ? [] : (stryCov_9fa48("3608"), [stryMutAct_9fa48("3609") ? {} : (stryCov_9fa48("3609"), {
            kind: planChannelEnvelopeUnpack(stryMutAct_9fa48("3610") ? {} : (stryCov_9fa48("3610"), {
              rawPresent: event.rawPresent,
              framingOk: event.framingOk,
              factoryRegistered: event.factoryRegistered
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("3611") ? {} : (stryCov_9fa48("3611"), {
      state,
      intents: stryMutAct_9fa48("3612") ? ["Stryker was here"] : (stryCov_9fa48("3612"), []),
      actions: stryMutAct_9fa48("3613") ? ["Stryker was here"] : (stryCov_9fa48("3613"), [])
    });
  }
}

/** Extract the unpack plan from actions; null when empty. */
export function channelEnvelopeUnpackPlanFromActions(actions: ReadonlyArray<ChannelEnvelopeUnpackPlanAction>): ChannelEnvelopeUnpackPlan | null {
  if (stryMutAct_9fa48("3614")) {
    {}
  } else {
    stryCov_9fa48("3614");
    const action = actions.find(stryMutAct_9fa48("3615") ? () => undefined : (stryCov_9fa48("3615"), entry => stryMutAct_9fa48("3618") ? (entry.kind === "ok" || entry.kind === "missing-raw" || entry.kind === "truncated") && entry.kind === "not-registered" : stryMutAct_9fa48("3617") ? false : stryMutAct_9fa48("3616") ? true : (stryCov_9fa48("3616", "3617", "3618"), (stryMutAct_9fa48("3620") ? (entry.kind === "ok" || entry.kind === "missing-raw") && entry.kind === "truncated" : stryMutAct_9fa48("3619") ? false : (stryCov_9fa48("3619", "3620"), (stryMutAct_9fa48("3622") ? entry.kind === "ok" && entry.kind === "missing-raw" : stryMutAct_9fa48("3621") ? false : (stryCov_9fa48("3621", "3622"), (stryMutAct_9fa48("3624") ? entry.kind !== "ok" : stryMutAct_9fa48("3623") ? false : (stryCov_9fa48("3623", "3624"), entry.kind === (stryMutAct_9fa48("3625") ? "" : (stryCov_9fa48("3625"), "ok")))) || (stryMutAct_9fa48("3627") ? entry.kind !== "missing-raw" : stryMutAct_9fa48("3626") ? false : (stryCov_9fa48("3626", "3627"), entry.kind === (stryMutAct_9fa48("3628") ? "" : (stryCov_9fa48("3628"), "missing-raw")))))) || (stryMutAct_9fa48("3630") ? entry.kind !== "truncated" : stryMutAct_9fa48("3629") ? false : (stryCov_9fa48("3629", "3630"), entry.kind === (stryMutAct_9fa48("3631") ? "" : (stryCov_9fa48("3631"), "truncated")))))) || (stryMutAct_9fa48("3633") ? entry.kind !== "not-registered" : stryMutAct_9fa48("3632") ? false : (stryCov_9fa48("3632", "3633"), entry.kind === (stryMutAct_9fa48("3634") ? "" : (stryCov_9fa48("3634"), "not-registered")))))));
    return stryMutAct_9fa48("3635") ? action?.kind && null : (stryCov_9fa48("3635"), (stryMutAct_9fa48("3636") ? action.kind : (stryCov_9fa48("3636"), action?.kind)) ?? null);
  }
}
export function shouldProceedChannelEnvelopeUnpackPlan(actions: ReadonlyArray<ChannelEnvelopeUnpackPlanAction>): boolean {
  if (stryMutAct_9fa48("3637")) {
    {}
  } else {
    stryCov_9fa48("3637");
    return stryMutAct_9fa48("3638") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("3638"), actions.some(stryMutAct_9fa48("3639") ? () => undefined : (stryCov_9fa48("3639"), action => stryMutAct_9fa48("3642") ? action.kind !== "ok" : stryMutAct_9fa48("3641") ? false : stryMutAct_9fa48("3640") ? true : (stryCov_9fa48("3640", "3641", "3642"), action.kind === (stryMutAct_9fa48("3643") ? "" : (stryCov_9fa48("3643"), "ok"))))));
  }
}
export function shouldRejectChannelEnvelopeUnpackPlanMissingRaw(actions: ReadonlyArray<ChannelEnvelopeUnpackPlanAction>): boolean {
  if (stryMutAct_9fa48("3644")) {
    {}
  } else {
    stryCov_9fa48("3644");
    return stryMutAct_9fa48("3645") ? actions.every(action => action.kind === "missing-raw") : (stryCov_9fa48("3645"), actions.some(stryMutAct_9fa48("3646") ? () => undefined : (stryCov_9fa48("3646"), action => stryMutAct_9fa48("3649") ? action.kind !== "missing-raw" : stryMutAct_9fa48("3648") ? false : stryMutAct_9fa48("3647") ? true : (stryCov_9fa48("3647", "3648", "3649"), action.kind === (stryMutAct_9fa48("3650") ? "" : (stryCov_9fa48("3650"), "missing-raw"))))));
  }
}
export function shouldRejectChannelEnvelopeUnpackPlanTruncate(actions: ReadonlyArray<ChannelEnvelopeUnpackPlanAction>): boolean {
  if (stryMutAct_9fa48("3651")) {
    {}
  } else {
    stryCov_9fa48("3651");
    return stryMutAct_9fa48("3652") ? actions.every(action => action.kind === "truncated") : (stryCov_9fa48("3652"), actions.some(stryMutAct_9fa48("3653") ? () => undefined : (stryCov_9fa48("3653"), action => stryMutAct_9fa48("3656") ? action.kind !== "truncated" : stryMutAct_9fa48("3655") ? false : stryMutAct_9fa48("3654") ? true : (stryCov_9fa48("3654", "3655", "3656"), action.kind === (stryMutAct_9fa48("3657") ? "" : (stryCov_9fa48("3657"), "truncated"))))));
  }
}
export function shouldRejectChannelEnvelopeUnpackPlanNotRegistered(actions: ReadonlyArray<ChannelEnvelopeUnpackPlanAction>): boolean {
  if (stryMutAct_9fa48("3658")) {
    {}
  } else {
    stryCov_9fa48("3658");
    return stryMutAct_9fa48("3659") ? actions.every(action => action.kind === "not-registered") : (stryCov_9fa48("3659"), actions.some(stryMutAct_9fa48("3660") ? () => undefined : (stryCov_9fa48("3660"), action => stryMutAct_9fa48("3663") ? action.kind !== "not-registered" : stryMutAct_9fa48("3662") ? false : stryMutAct_9fa48("3661") ? true : (stryCov_9fa48("3661", "3662", "3663"), action.kind === (stryMutAct_9fa48("3664") ? "" : (stryCov_9fa48("3664"), "not-registered"))))));
  }
}

/**
 * Channel envelope unpack gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepChannelEnvelopeUnpackPlanWithActions}
 * (`ok`|`missing-raw`|`truncated`|`not-registered`).
 */
export type ChannelEnvelopeUnpackState = Record<string, never>;
export type ChannelEnvelopeUnpackEvent = Event | {
  readonly kind: "channel/envelope-unpack-gate";
  readonly rawPresent: boolean;
  readonly framingOk: boolean;
  readonly factoryRegistered: boolean;
};

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepChannelEnvelopeUnpackPlanWithActions}
 * (`ok`|`missing-raw`|`truncated`|`not-registered`).
 */
export type ChannelEnvelopeUnpackAction = {
  readonly kind: ChannelEnvelopeUnpackPlan;
};
export interface ChannelEnvelopeUnpackStepResult {
  readonly state: ChannelEnvelopeUnpackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelEnvelopeUnpackAction[];
}
export function initialChannelEnvelopeUnpackState(): ChannelEnvelopeUnpackState {
  if (stryMutAct_9fa48("3665")) {
    {}
  } else {
    stryCov_9fa48("3665");
    return {};
  }
}
export const stepChannelEnvelopeUnpack: StepFn<ChannelEnvelopeUnpackState> = (state, event) => {
  if (stryMutAct_9fa48("3666")) {
    {}
  } else {
    stryCov_9fa48("3666");
    const result = stepChannelEnvelopeUnpackInner(state, event as ChannelEnvelopeUnpackEvent);
    return stryMutAct_9fa48("3667") ? {} : (stryCov_9fa48("3667"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepChannelEnvelopeUnpackWithActions(state: ChannelEnvelopeUnpackState, event: ChannelEnvelopeUnpackEvent): ChannelEnvelopeUnpackStepResult {
  if (stryMutAct_9fa48("3668")) {
    {}
  } else {
    stryCov_9fa48("3668");
    return stepChannelEnvelopeUnpackInner(state, event);
  }
}
export function shouldProceedChannelEnvelopeUnpack(actions: ReadonlyArray<ChannelEnvelopeUnpackAction>): boolean {
  if (stryMutAct_9fa48("3669")) {
    {}
  } else {
    stryCov_9fa48("3669");
    return stryMutAct_9fa48("3670") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("3670"), actions.some(stryMutAct_9fa48("3671") ? () => undefined : (stryCov_9fa48("3671"), action => stryMutAct_9fa48("3674") ? action.kind !== "ok" : stryMutAct_9fa48("3673") ? false : stryMutAct_9fa48("3672") ? true : (stryCov_9fa48("3672", "3673", "3674"), action.kind === (stryMutAct_9fa48("3675") ? "" : (stryCov_9fa48("3675"), "ok"))))));
  }
}
export function shouldRejectChannelEnvelopeUnpackMissingRaw(actions: ReadonlyArray<ChannelEnvelopeUnpackAction>): boolean {
  if (stryMutAct_9fa48("3676")) {
    {}
  } else {
    stryCov_9fa48("3676");
    return stryMutAct_9fa48("3677") ? actions.every(action => action.kind === "missing-raw") : (stryCov_9fa48("3677"), actions.some(stryMutAct_9fa48("3678") ? () => undefined : (stryCov_9fa48("3678"), action => stryMutAct_9fa48("3681") ? action.kind !== "missing-raw" : stryMutAct_9fa48("3680") ? false : stryMutAct_9fa48("3679") ? true : (stryCov_9fa48("3679", "3680", "3681"), action.kind === (stryMutAct_9fa48("3682") ? "" : (stryCov_9fa48("3682"), "missing-raw"))))));
  }
}
export function shouldRejectChannelEnvelopeUnpackTruncate(actions: ReadonlyArray<ChannelEnvelopeUnpackAction>): boolean {
  if (stryMutAct_9fa48("3683")) {
    {}
  } else {
    stryCov_9fa48("3683");
    return stryMutAct_9fa48("3684") ? actions.every(action => action.kind === "truncated") : (stryCov_9fa48("3684"), actions.some(stryMutAct_9fa48("3685") ? () => undefined : (stryCov_9fa48("3685"), action => stryMutAct_9fa48("3688") ? action.kind !== "truncated" : stryMutAct_9fa48("3687") ? false : stryMutAct_9fa48("3686") ? true : (stryCov_9fa48("3686", "3687", "3688"), action.kind === (stryMutAct_9fa48("3689") ? "" : (stryCov_9fa48("3689"), "truncated"))))));
  }
}
export function shouldRejectChannelEnvelopeUnpackNotRegistered(actions: ReadonlyArray<ChannelEnvelopeUnpackAction>): boolean {
  if (stryMutAct_9fa48("3690")) {
    {}
  } else {
    stryCov_9fa48("3690");
    return stryMutAct_9fa48("3691") ? actions.every(action => action.kind === "not-registered") : (stryCov_9fa48("3691"), actions.some(stryMutAct_9fa48("3692") ? () => undefined : (stryCov_9fa48("3692"), action => stryMutAct_9fa48("3695") ? action.kind !== "not-registered" : stryMutAct_9fa48("3694") ? false : stryMutAct_9fa48("3693") ? true : (stryCov_9fa48("3693", "3694", "3695"), action.kind === (stryMutAct_9fa48("3696") ? "" : (stryCov_9fa48("3696"), "not-registered"))))));
  }
}
function stepChannelEnvelopeUnpackInner(state: ChannelEnvelopeUnpackState, event: ChannelEnvelopeUnpackEvent): ChannelEnvelopeUnpackStepResult {
  if (stryMutAct_9fa48("3697")) {
    {}
  } else {
    stryCov_9fa48("3697");
    if (stryMutAct_9fa48("3700") ? event.kind !== "channel/envelope-unpack-gate" : stryMutAct_9fa48("3699") ? false : stryMutAct_9fa48("3698") ? true : (stryCov_9fa48("3698", "3699", "3700"), event.kind === (stryMutAct_9fa48("3701") ? "" : (stryCov_9fa48("3701"), "channel/envelope-unpack-gate")))) {
      if (stryMutAct_9fa48("3702")) {
        {}
      } else {
        stryCov_9fa48("3702");
        const planActions = stepChannelEnvelopeUnpackPlanWithActions(initialChannelEnvelopeUnpackPlanState(), stryMutAct_9fa48("3703") ? {} : (stryCov_9fa48("3703"), {
          kind: stryMutAct_9fa48("3704") ? "" : (stryCov_9fa48("3704"), "channel/envelope-unpack-plan-gate"),
          rawPresent: event.rawPresent,
          framingOk: event.framingOk,
          factoryRegistered: event.factoryRegistered
        })).actions;
        const plan = channelEnvelopeUnpackPlanFromActions(planActions);
        if (stryMutAct_9fa48("3707") ? plan !== null : stryMutAct_9fa48("3706") ? false : stryMutAct_9fa48("3705") ? true : (stryCov_9fa48("3705", "3706", "3707"), plan === null)) {
          if (stryMutAct_9fa48("3708")) {
            {}
          } else {
            stryCov_9fa48("3708");
            return stryMutAct_9fa48("3709") ? {} : (stryCov_9fa48("3709"), {
              state,
              intents: stryMutAct_9fa48("3710") ? ["Stryker was here"] : (stryCov_9fa48("3710"), []),
              actions: stryMutAct_9fa48("3711") ? ["Stryker was here"] : (stryCov_9fa48("3711"), [])
            });
          }
        }
        return stryMutAct_9fa48("3712") ? {} : (stryCov_9fa48("3712"), {
          state,
          intents: stryMutAct_9fa48("3713") ? ["Stryker was here"] : (stryCov_9fa48("3713"), []),
          actions: stryMutAct_9fa48("3714") ? [] : (stryCov_9fa48("3714"), [stryMutAct_9fa48("3715") ? {} : (stryCov_9fa48("3715"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("3716") ? {} : (stryCov_9fa48("3716"), {
      state,
      intents: stryMutAct_9fa48("3717") ? ["Stryker was here"] : (stryCov_9fa48("3717"), []),
      actions: stryMutAct_9fa48("3718") ? ["Stryker was here"] : (stryCov_9fa48("3718"), [])
    });
  }
}
export type ChannelEnvelopePackPlan = "missing-message" | "ok";

/** Whether Envelope.pack may serialize from a typed message. */
export function planChannelEnvelopePack(messagePresent: boolean): ChannelEnvelopePackPlan {
  if (stryMutAct_9fa48("3719")) {
    {}
  } else {
    stryCov_9fa48("3719");
    return messagePresent ? stryMutAct_9fa48("3720") ? "" : (stryCov_9fa48("3720"), "ok") : stryMutAct_9fa48("3721") ? "" : (stryCov_9fa48("3721"), "missing-message");
  }
}
export type ChannelEnvelopePackPlanEvent = Event | {
  readonly kind: "channel/envelope-pack-plan-gate";
  readonly messagePresent: boolean;
};
export type ChannelEnvelopePackPlanAction = {
  readonly kind: ChannelEnvelopePackPlan;
};

/** Extract the pack plan from actions; null when empty. */
export function channelEnvelopePackPlanFromActions(actions: ReadonlyArray<ChannelEnvelopePackPlanAction>): ChannelEnvelopePackPlan | null {
  if (stryMutAct_9fa48("3722")) {
    {}
  } else {
    stryCov_9fa48("3722");
    const action = actions.find(stryMutAct_9fa48("3723") ? () => undefined : (stryCov_9fa48("3723"), entry => stryMutAct_9fa48("3726") ? entry.kind === "ok" && entry.kind === "missing-message" : stryMutAct_9fa48("3725") ? false : stryMutAct_9fa48("3724") ? true : (stryCov_9fa48("3724", "3725", "3726"), (stryMutAct_9fa48("3728") ? entry.kind !== "ok" : stryMutAct_9fa48("3727") ? false : (stryCov_9fa48("3727", "3728"), entry.kind === (stryMutAct_9fa48("3729") ? "" : (stryCov_9fa48("3729"), "ok")))) || (stryMutAct_9fa48("3731") ? entry.kind !== "missing-message" : stryMutAct_9fa48("3730") ? false : (stryCov_9fa48("3730", "3731"), entry.kind === (stryMutAct_9fa48("3732") ? "" : (stryCov_9fa48("3732"), "missing-message")))))));
    return stryMutAct_9fa48("3733") ? action?.kind && null : (stryCov_9fa48("3733"), (stryMutAct_9fa48("3734") ? action.kind : (stryCov_9fa48("3734"), action?.kind)) ?? null);
  }
}
export type ChannelEnvelopePackEvent = Event | {
  readonly kind: "channel/envelope-pack-gate";
  readonly messagePresent: boolean;
};