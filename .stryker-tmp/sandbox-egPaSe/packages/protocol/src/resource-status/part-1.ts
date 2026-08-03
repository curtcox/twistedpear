/** Extracted from resource-status.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure resource transfer status transitions and gates.
 * Crypto, link send, and timers stay at the adapter edge.
 * Continue-transfer / receive-part / request-next / watchdog /
 * prove / advertise / incoming-adv / assemble / proof-accept
 * conclusions leave via machine actions (no ad-hoc plan /
 * `can*` / `should*` / `plan ===` reads beside the step).
 * Assemble, proof-accept, and advertise-phase plans nested via
 * {@link stepResourceAssembleOutcomePlanWithActions} /
 * {@link stepResourceProofAcceptPlanWithActions} /
 * {@link stepResourceAdvertisePhasePlanWithActions}.
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
import { ResourceStatus, type ResourceStatusValue } from "../resource-watchdog.js";
export interface ResourceStatusState {
  readonly status: ResourceStatusValue;
}
export type ResourceStatusEvent = Event | {
  readonly kind: "resource/queue";
} | {
  readonly kind: "resource/advertise";
} | {
  readonly kind: "resource/transferring";
} | {
  readonly kind: "resource/awaiting-proof";
} | {
  readonly kind: "resource/assemble";
} | {
  readonly kind: "resource/complete";
} | {
  readonly kind: "resource/corrupt";
} | {
  readonly kind: "resource/fail";
};
export function initialResourceStatusState(status: ResourceStatusValue = ResourceStatus.NONE): ResourceStatusState {
  if (stryMutAct_9fa48("31105")) {
    {}
  } else {
    stryCov_9fa48("31105");
    return stryMutAct_9fa48("31106") ? {} : (stryCov_9fa48("31106"), {
      status
    });
  }
}
export function isResourceFailed(status: ResourceStatusValue): boolean {
  if (stryMutAct_9fa48("31107")) {
    {}
  } else {
    stryCov_9fa48("31107");
    return stryMutAct_9fa48("31110") ? status !== ResourceStatus.FAILED : stryMutAct_9fa48("31109") ? false : stryMutAct_9fa48("31108") ? true : (stryCov_9fa48("31108", "31109", "31110"), status === ResourceStatus.FAILED);
  }
}
export function isResourceComplete(status: ResourceStatusValue): boolean {
  if (stryMutAct_9fa48("31111")) {
    {}
  } else {
    stryCov_9fa48("31111");
    return stryMutAct_9fa48("31114") ? status !== ResourceStatus.COMPLETE : stryMutAct_9fa48("31113") ? false : stryMutAct_9fa48("31112") ? true : (stryCov_9fa48("31112", "31113", "31114"), status === ResourceStatus.COMPLETE);
  }
}

/**
 * Resource complete gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isResourceComplete`
 * reads beside the step).
 */
export type ResourceCompleteState = Record<string, never>;
export type ResourceCompleteEvent = Event | {
  readonly kind: "resource/complete-gate";
  readonly status: ResourceStatusValue;
};
export type ResourceCompleteAction = {
  readonly kind: "complete";
} | {
  readonly kind: "incomplete";
};
export interface ResourceCompleteStepResult {
  readonly state: ResourceCompleteState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceCompleteAction[];
}
export function initialResourceCompleteState(): ResourceCompleteState {
  if (stryMutAct_9fa48("31115")) {
    {}
  } else {
    stryCov_9fa48("31115");
    return {};
  }
}
export function stepResourceCompleteWithActions(state: ResourceCompleteState, event: ResourceCompleteEvent): ResourceCompleteStepResult {
  if (stryMutAct_9fa48("31116")) {
    {}
  } else {
    stryCov_9fa48("31116");
    if (stryMutAct_9fa48("31119") ? event.kind !== "resource/complete-gate" : stryMutAct_9fa48("31118") ? false : stryMutAct_9fa48("31117") ? true : (stryCov_9fa48("31117", "31118", "31119"), event.kind === (stryMutAct_9fa48("31120") ? "" : (stryCov_9fa48("31120"), "resource/complete-gate")))) {
      if (stryMutAct_9fa48("31121")) {
        {}
      } else {
        stryCov_9fa48("31121");
        return stryMutAct_9fa48("31122") ? {} : (stryCov_9fa48("31122"), {
          state,
          intents: stryMutAct_9fa48("31123") ? ["Stryker was here"] : (stryCov_9fa48("31123"), []),
          actions: stryMutAct_9fa48("31124") ? [] : (stryCov_9fa48("31124"), [stryMutAct_9fa48("31125") ? {} : (stryCov_9fa48("31125"), {
            kind: isResourceComplete(event.status) ? stryMutAct_9fa48("31126") ? "" : (stryCov_9fa48("31126"), "complete") : stryMutAct_9fa48("31127") ? "" : (stryCov_9fa48("31127"), "incomplete")
          })])
        });
      }
    }
    return stryMutAct_9fa48("31128") ? {} : (stryCov_9fa48("31128"), {
      state,
      intents: stryMutAct_9fa48("31129") ? ["Stryker was here"] : (stryCov_9fa48("31129"), []),
      actions: stryMutAct_9fa48("31130") ? ["Stryker was here"] : (stryCov_9fa48("31130"), [])
    });
  }
}
export function shouldTreatResourceComplete(actions: ReadonlyArray<ResourceCompleteAction>): boolean {
  if (stryMutAct_9fa48("31131")) {
    {}
  } else {
    stryCov_9fa48("31131");
    return stryMutAct_9fa48("31132") ? actions.every(action => action.kind === "complete") : (stryCov_9fa48("31132"), actions.some(stryMutAct_9fa48("31133") ? () => undefined : (stryCov_9fa48("31133"), action => stryMutAct_9fa48("31136") ? action.kind !== "complete" : stryMutAct_9fa48("31135") ? false : stryMutAct_9fa48("31134") ? true : (stryCov_9fa48("31134", "31135", "31136"), action.kind === (stryMutAct_9fa48("31137") ? "" : (stryCov_9fa48("31137"), "complete"))))));
  }
}
export function shouldTreatResourceIncomplete(actions: ReadonlyArray<ResourceCompleteAction>): boolean {
  if (stryMutAct_9fa48("31138")) {
    {}
  } else {
    stryCov_9fa48("31138");
    return stryMutAct_9fa48("31139") ? actions.every(action => action.kind === "incomplete") : (stryCov_9fa48("31139"), actions.some(stryMutAct_9fa48("31140") ? () => undefined : (stryCov_9fa48("31140"), action => stryMutAct_9fa48("31143") ? action.kind !== "incomplete" : stryMutAct_9fa48("31142") ? false : stryMutAct_9fa48("31141") ? true : (stryCov_9fa48("31141", "31142", "31143"), action.kind === (stryMutAct_9fa48("31144") ? "" : (stryCov_9fa48("31144"), "incomplete"))))));
  }
}
export function isResourceTerminal(status: ResourceStatusValue): boolean {
  if (stryMutAct_9fa48("31145")) {
    {}
  } else {
    stryCov_9fa48("31145");
    return stryMutAct_9fa48("31148") ? status === ResourceStatus.COMPLETE && status === ResourceStatus.FAILED : stryMutAct_9fa48("31147") ? false : stryMutAct_9fa48("31146") ? true : (stryCov_9fa48("31146", "31147", "31148"), (stryMutAct_9fa48("31150") ? status !== ResourceStatus.COMPLETE : stryMutAct_9fa48("31149") ? false : (stryCov_9fa48("31149", "31150"), status === ResourceStatus.COMPLETE)) || (stryMutAct_9fa48("31152") ? status !== ResourceStatus.FAILED : stryMutAct_9fa48("31151") ? false : (stryCov_9fa48("31151", "31152"), status === ResourceStatus.FAILED)));
  }
}

/** Gate for handleRequest / hashmapUpdate / assemble / requestNext early-out. */
export function canResourceContinueTransfer(status: ResourceStatusValue): boolean {
  if (stryMutAct_9fa48("31153")) {
    {}
  } else {
    stryCov_9fa48("31153");
    return stryMutAct_9fa48("31156") ? status === ResourceStatus.FAILED : stryMutAct_9fa48("31155") ? false : stryMutAct_9fa48("31154") ? true : (stryCov_9fa48("31154", "31155", "31156"), status !== ResourceStatus.FAILED);
  }
}

/**
 * Resource continue-transfer gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canResourceContinueTransfer`
 * reads beside the step).
 */
export type ResourceContinueTransferState = Record<string, never>;
export type ResourceContinueTransferEvent = Event | {
  readonly kind: "resource/continue-transfer-gate";
  readonly status: ResourceStatusValue;
};
export type ResourceContinueTransferAction = {
  readonly kind: "continue";
} | {
  readonly kind: "stop";
};
export interface ResourceContinueTransferStepResult {
  readonly state: ResourceContinueTransferState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceContinueTransferAction[];
}
export function initialResourceContinueTransferState(): ResourceContinueTransferState {
  if (stryMutAct_9fa48("31157")) {
    {}
  } else {
    stryCov_9fa48("31157");
    return {};
  }
}
export function stepResourceContinueTransferWithActions(state: ResourceContinueTransferState, event: ResourceContinueTransferEvent): ResourceContinueTransferStepResult {
  if (stryMutAct_9fa48("31158")) {
    {}
  } else {
    stryCov_9fa48("31158");
    if (stryMutAct_9fa48("31161") ? event.kind !== "resource/continue-transfer-gate" : stryMutAct_9fa48("31160") ? false : stryMutAct_9fa48("31159") ? true : (stryCov_9fa48("31159", "31160", "31161"), event.kind === (stryMutAct_9fa48("31162") ? "" : (stryCov_9fa48("31162"), "resource/continue-transfer-gate")))) {
      if (stryMutAct_9fa48("31163")) {
        {}
      } else {
        stryCov_9fa48("31163");
        return stryMutAct_9fa48("31164") ? {} : (stryCov_9fa48("31164"), {
          state,
          intents: stryMutAct_9fa48("31165") ? ["Stryker was here"] : (stryCov_9fa48("31165"), []),
          actions: stryMutAct_9fa48("31166") ? [] : (stryCov_9fa48("31166"), [stryMutAct_9fa48("31167") ? {} : (stryCov_9fa48("31167"), {
            kind: canResourceContinueTransfer(event.status) ? stryMutAct_9fa48("31168") ? "" : (stryCov_9fa48("31168"), "continue") : stryMutAct_9fa48("31169") ? "" : (stryCov_9fa48("31169"), "stop")
          })])
        });
      }
    }
    return stryMutAct_9fa48("31170") ? {} : (stryCov_9fa48("31170"), {
      state,
      intents: stryMutAct_9fa48("31171") ? ["Stryker was here"] : (stryCov_9fa48("31171"), []),
      actions: stryMutAct_9fa48("31172") ? ["Stryker was here"] : (stryCov_9fa48("31172"), [])
    });
  }
}
export function shouldContinueResourceTransfer(actions: ReadonlyArray<ResourceContinueTransferAction>): boolean {
  if (stryMutAct_9fa48("31173")) {
    {}
  } else {
    stryCov_9fa48("31173");
    return stryMutAct_9fa48("31174") ? actions.every(action => action.kind === "continue") : (stryCov_9fa48("31174"), actions.some(stryMutAct_9fa48("31175") ? () => undefined : (stryCov_9fa48("31175"), action => stryMutAct_9fa48("31178") ? action.kind !== "continue" : stryMutAct_9fa48("31177") ? false : stryMutAct_9fa48("31176") ? true : (stryCov_9fa48("31176", "31177", "31178"), action.kind === (stryMutAct_9fa48("31179") ? "" : (stryCov_9fa48("31179"), "continue"))))));
  }
}
export function shouldStopResourceTransfer(actions: ReadonlyArray<ResourceContinueTransferAction>): boolean {
  if (stryMutAct_9fa48("31180")) {
    {}
  } else {
    stryCov_9fa48("31180");
    return stryMutAct_9fa48("31181") ? actions.every(action => action.kind === "stop") : (stryCov_9fa48("31181"), actions.some(stryMutAct_9fa48("31182") ? () => undefined : (stryCov_9fa48("31182"), action => stryMutAct_9fa48("31185") ? action.kind !== "stop" : stryMutAct_9fa48("31184") ? false : stryMutAct_9fa48("31183") ? true : (stryCov_9fa48("31183", "31184", "31185"), action.kind === (stryMutAct_9fa48("31186") ? "" : (stryCov_9fa48("31186"), "stop"))))));
  }
}
export function canReceiveResourcePart(status: ResourceStatusValue): boolean {
  if (stryMutAct_9fa48("31187")) {
    {}
  } else {
    stryCov_9fa48("31187");
    return stryMutAct_9fa48("31190") ? status !== ResourceStatus.FAILED || status !== ResourceStatus.COMPLETE : stryMutAct_9fa48("31189") ? false : stryMutAct_9fa48("31188") ? true : (stryCov_9fa48("31188", "31189", "31190"), (stryMutAct_9fa48("31192") ? status === ResourceStatus.FAILED : stryMutAct_9fa48("31191") ? true : (stryCov_9fa48("31191", "31192"), status !== ResourceStatus.FAILED)) && (stryMutAct_9fa48("31194") ? status === ResourceStatus.COMPLETE : stryMutAct_9fa48("31193") ? true : (stryCov_9fa48("31193", "31194"), status !== ResourceStatus.COMPLETE)));
  }
}

/**
 * Resource receive-part allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canReceiveResourcePart`
 * reads beside the step).
 */
export type ResourceReceivePartAllowState = Record<string, never>;
export type ResourceReceivePartAllowEvent = Event | {
  readonly kind: "resource/receive-part-allow-gate";
  readonly status: ResourceStatusValue;
};
export type ResourceReceivePartAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface ResourceReceivePartAllowStepResult {
  readonly state: ResourceReceivePartAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceReceivePartAllowAction[];
}
export function initialResourceReceivePartAllowState(): ResourceReceivePartAllowState {
  if (stryMutAct_9fa48("31195")) {
    {}
  } else {
    stryCov_9fa48("31195");
    return {};
  }
}
export function stepResourceReceivePartAllowWithActions(state: ResourceReceivePartAllowState, event: ResourceReceivePartAllowEvent): ResourceReceivePartAllowStepResult {
  if (stryMutAct_9fa48("31196")) {
    {}
  } else {
    stryCov_9fa48("31196");
    if (stryMutAct_9fa48("31199") ? event.kind !== "resource/receive-part-allow-gate" : stryMutAct_9fa48("31198") ? false : stryMutAct_9fa48("31197") ? true : (stryCov_9fa48("31197", "31198", "31199"), event.kind === (stryMutAct_9fa48("31200") ? "" : (stryCov_9fa48("31200"), "resource/receive-part-allow-gate")))) {
      if (stryMutAct_9fa48("31201")) {
        {}
      } else {
        stryCov_9fa48("31201");
        return stryMutAct_9fa48("31202") ? {} : (stryCov_9fa48("31202"), {
          state,
          intents: stryMutAct_9fa48("31203") ? ["Stryker was here"] : (stryCov_9fa48("31203"), []),
          actions: stryMutAct_9fa48("31204") ? [] : (stryCov_9fa48("31204"), [stryMutAct_9fa48("31205") ? {} : (stryCov_9fa48("31205"), {
            kind: canReceiveResourcePart(event.status) ? stryMutAct_9fa48("31206") ? "" : (stryCov_9fa48("31206"), "allow") : stryMutAct_9fa48("31207") ? "" : (stryCov_9fa48("31207"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("31208") ? {} : (stryCov_9fa48("31208"), {
      state,
      intents: stryMutAct_9fa48("31209") ? ["Stryker was here"] : (stryCov_9fa48("31209"), []),
      actions: stryMutAct_9fa48("31210") ? ["Stryker was here"] : (stryCov_9fa48("31210"), [])
    });
  }
}
export function shouldAllowResourceReceivePart(actions: ReadonlyArray<ResourceReceivePartAllowAction>): boolean {
  if (stryMutAct_9fa48("31211")) {
    {}
  } else {
    stryCov_9fa48("31211");
    return stryMutAct_9fa48("31212") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("31212"), actions.some(stryMutAct_9fa48("31213") ? () => undefined : (stryCov_9fa48("31213"), action => stryMutAct_9fa48("31216") ? action.kind !== "allow" : stryMutAct_9fa48("31215") ? false : stryMutAct_9fa48("31214") ? true : (stryCov_9fa48("31214", "31215", "31216"), action.kind === (stryMutAct_9fa48("31217") ? "" : (stryCov_9fa48("31217"), "allow"))))));
  }
}
export function shouldDenyResourceReceivePart(actions: ReadonlyArray<ResourceReceivePartAllowAction>): boolean {
  if (stryMutAct_9fa48("31218")) {
    {}
  } else {
    stryCov_9fa48("31218");
    return stryMutAct_9fa48("31219") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("31219"), actions.some(stryMutAct_9fa48("31220") ? () => undefined : (stryCov_9fa48("31220"), action => stryMutAct_9fa48("31223") ? action.kind !== "deny" : stryMutAct_9fa48("31222") ? false : stryMutAct_9fa48("31221") ? true : (stryCov_9fa48("31221", "31222", "31223"), action.kind === (stryMutAct_9fa48("31224") ? "" : (stryCov_9fa48("31224"), "deny"))))));
  }
}
export function canValidateResourceProof(status: ResourceStatusValue): boolean {
  if (stryMutAct_9fa48("31225")) {
    {}
  } else {
    stryCov_9fa48("31225");
    return stryMutAct_9fa48("31228") ? status === ResourceStatus.FAILED : stryMutAct_9fa48("31227") ? false : stryMutAct_9fa48("31226") ? true : (stryCov_9fa48("31226", "31227", "31228"), status !== ResourceStatus.FAILED);
  }
}
export function canRunResourceWatchdog(status: ResourceStatusValue): boolean {
  if (stryMutAct_9fa48("31229")) {
    {}
  } else {
    stryCov_9fa48("31229");
    return stryMutAct_9fa48("31230") ? isResourceTerminal(status) : (stryCov_9fa48("31230"), !isResourceTerminal(status));
  }
}

/**
 * Resource watchdog-allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRunResourceWatchdog`
 * reads beside the step).
 */
export type ResourceWatchdogAllowState = Record<string, never>;
export type ResourceWatchdogAllowEvent = Event | {
  readonly kind: "resource/watchdog-allow-gate";
  readonly status: ResourceStatusValue;
};
export type ResourceWatchdogAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface ResourceWatchdogAllowStepResult {
  readonly state: ResourceWatchdogAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceWatchdogAllowAction[];
}
export function initialResourceWatchdogAllowState(): ResourceWatchdogAllowState {
  if (stryMutAct_9fa48("31231")) {
    {}
  } else {
    stryCov_9fa48("31231");
    return {};
  }
}
export function stepResourceWatchdogAllowWithActions(state: ResourceWatchdogAllowState, event: ResourceWatchdogAllowEvent): ResourceWatchdogAllowStepResult {
  if (stryMutAct_9fa48("31232")) {
    {}
  } else {
    stryCov_9fa48("31232");
    if (stryMutAct_9fa48("31235") ? event.kind !== "resource/watchdog-allow-gate" : stryMutAct_9fa48("31234") ? false : stryMutAct_9fa48("31233") ? true : (stryCov_9fa48("31233", "31234", "31235"), event.kind === (stryMutAct_9fa48("31236") ? "" : (stryCov_9fa48("31236"), "resource/watchdog-allow-gate")))) {
      if (stryMutAct_9fa48("31237")) {
        {}
      } else {
        stryCov_9fa48("31237");
        return stryMutAct_9fa48("31238") ? {} : (stryCov_9fa48("31238"), {
          state,
          intents: stryMutAct_9fa48("31239") ? ["Stryker was here"] : (stryCov_9fa48("31239"), []),
          actions: stryMutAct_9fa48("31240") ? [] : (stryCov_9fa48("31240"), [stryMutAct_9fa48("31241") ? {} : (stryCov_9fa48("31241"), {
            kind: canRunResourceWatchdog(event.status) ? stryMutAct_9fa48("31242") ? "" : (stryCov_9fa48("31242"), "allow") : stryMutAct_9fa48("31243") ? "" : (stryCov_9fa48("31243"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("31244") ? {} : (stryCov_9fa48("31244"), {
      state,
      intents: stryMutAct_9fa48("31245") ? ["Stryker was here"] : (stryCov_9fa48("31245"), []),
      actions: stryMutAct_9fa48("31246") ? ["Stryker was here"] : (stryCov_9fa48("31246"), [])
    });
  }
}
export function shouldAllowResourceWatchdog(actions: ReadonlyArray<ResourceWatchdogAllowAction>): boolean {
  if (stryMutAct_9fa48("31247")) {
    {}
  } else {
    stryCov_9fa48("31247");
    return stryMutAct_9fa48("31248") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("31248"), actions.some(stryMutAct_9fa48("31249") ? () => undefined : (stryCov_9fa48("31249"), action => stryMutAct_9fa48("31252") ? action.kind !== "allow" : stryMutAct_9fa48("31251") ? false : stryMutAct_9fa48("31250") ? true : (stryCov_9fa48("31250", "31251", "31252"), action.kind === (stryMutAct_9fa48("31253") ? "" : (stryCov_9fa48("31253"), "allow"))))));
  }
}
export function shouldDenyResourceWatchdog(actions: ReadonlyArray<ResourceWatchdogAllowAction>): boolean {
  if (stryMutAct_9fa48("31254")) {
    {}
  } else {
    stryCov_9fa48("31254");
    return stryMutAct_9fa48("31255") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("31255"), actions.some(stryMutAct_9fa48("31256") ? () => undefined : (stryCov_9fa48("31256"), action => stryMutAct_9fa48("31259") ? action.kind !== "deny" : stryMutAct_9fa48("31258") ? false : stryMutAct_9fa48("31257") ? true : (stryCov_9fa48("31257", "31258", "31259"), action.kind === (stryMutAct_9fa48("31260") ? "" : (stryCov_9fa48("31260"), "deny"))))));
  }
}

/** Gate for requestNext early-out (failed status or waiting for hashmap). */
export function canRequestResourceNext(input: {
  readonly status: ResourceStatusValue;
  readonly waitingForHashmap: boolean;
}): boolean {
  if (stryMutAct_9fa48("31261")) {
    {}
  } else {
    stryCov_9fa48("31261");
    return stryMutAct_9fa48("31264") ? canResourceContinueTransfer(input.status) || !input.waitingForHashmap : stryMutAct_9fa48("31263") ? false : stryMutAct_9fa48("31262") ? true : (stryCov_9fa48("31262", "31263", "31264"), canResourceContinueTransfer(input.status) && (stryMutAct_9fa48("31265") ? input.waitingForHashmap : (stryCov_9fa48("31265"), !input.waitingForHashmap)));
  }
}

/**
 * Resource request-next allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRequestResourceNext`
 * reads beside the step).
 */
export type ResourceRequestNextAllowState = Record<string, never>;
export type ResourceRequestNextAllowEvent = Event | {
  readonly kind: "resource/request-next-allow-gate";
  readonly status: ResourceStatusValue;
  readonly waitingForHashmap: boolean;
};
export type ResourceRequestNextAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface ResourceRequestNextAllowStepResult {
  readonly state: ResourceRequestNextAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceRequestNextAllowAction[];
}
export function initialResourceRequestNextAllowState(): ResourceRequestNextAllowState {
  if (stryMutAct_9fa48("31266")) {
    {}
  } else {
    stryCov_9fa48("31266");
    return {};
  }
}
export function stepResourceRequestNextAllowWithActions(state: ResourceRequestNextAllowState, event: ResourceRequestNextAllowEvent): ResourceRequestNextAllowStepResult {
  if (stryMutAct_9fa48("31267")) {
    {}
  } else {
    stryCov_9fa48("31267");
    if (stryMutAct_9fa48("31270") ? event.kind !== "resource/request-next-allow-gate" : stryMutAct_9fa48("31269") ? false : stryMutAct_9fa48("31268") ? true : (stryCov_9fa48("31268", "31269", "31270"), event.kind === (stryMutAct_9fa48("31271") ? "" : (stryCov_9fa48("31271"), "resource/request-next-allow-gate")))) {
      if (stryMutAct_9fa48("31272")) {
        {}
      } else {
        stryCov_9fa48("31272");
        return stryMutAct_9fa48("31273") ? {} : (stryCov_9fa48("31273"), {
          state,
          intents: stryMutAct_9fa48("31274") ? ["Stryker was here"] : (stryCov_9fa48("31274"), []),
          actions: stryMutAct_9fa48("31275") ? [] : (stryCov_9fa48("31275"), [stryMutAct_9fa48("31276") ? {} : (stryCov_9fa48("31276"), {
            kind: canRequestResourceNext(stryMutAct_9fa48("31277") ? {} : (stryCov_9fa48("31277"), {
              status: event.status,
              waitingForHashmap: event.waitingForHashmap
            })) ? stryMutAct_9fa48("31278") ? "" : (stryCov_9fa48("31278"), "allow") : stryMutAct_9fa48("31279") ? "" : (stryCov_9fa48("31279"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("31280") ? {} : (stryCov_9fa48("31280"), {
      state,
      intents: stryMutAct_9fa48("31281") ? ["Stryker was here"] : (stryCov_9fa48("31281"), []),
      actions: stryMutAct_9fa48("31282") ? ["Stryker was here"] : (stryCov_9fa48("31282"), [])
    });
  }
}
export function shouldAllowResourceRequestNext(actions: ReadonlyArray<ResourceRequestNextAllowAction>): boolean {
  if (stryMutAct_9fa48("31283")) {
    {}
  } else {
    stryCov_9fa48("31283");
    return stryMutAct_9fa48("31284") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("31284"), actions.some(stryMutAct_9fa48("31285") ? () => undefined : (stryCov_9fa48("31285"), action => stryMutAct_9fa48("31288") ? action.kind !== "allow" : stryMutAct_9fa48("31287") ? false : stryMutAct_9fa48("31286") ? true : (stryCov_9fa48("31286", "31287", "31288"), action.kind === (stryMutAct_9fa48("31289") ? "" : (stryCov_9fa48("31289"), "allow"))))));
  }
}
export function shouldDenyResourceRequestNext(actions: ReadonlyArray<ResourceRequestNextAllowAction>): boolean {
  if (stryMutAct_9fa48("31290")) {
    {}
  } else {
    stryCov_9fa48("31290");
    return stryMutAct_9fa48("31291") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("31291"), actions.some(stryMutAct_9fa48("31292") ? () => undefined : (stryCov_9fa48("31292"), action => stryMutAct_9fa48("31295") ? action.kind !== "deny" : stryMutAct_9fa48("31294") ? false : stryMutAct_9fa48("31293") ? true : (stryCov_9fa48("31293", "31294", "31295"), action.kind === (stryMutAct_9fa48("31296") ? "" : (stryCov_9fa48("31296"), "deny"))))));
  }
}

/** Whether an incoming ADV should create a new resource (not already incoming). */
export function shouldAcceptIncomingResourceAdvertisement(alreadyIncoming: boolean): boolean {
  if (stryMutAct_9fa48("31297")) {
    {}
  } else {
    stryCov_9fa48("31297");
    return stryMutAct_9fa48("31298") ? alreadyIncoming : (stryCov_9fa48("31298"), !alreadyIncoming);
  }
}

/**
 * Incoming resource ADV accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptIncomingResourceAdvertisement` reads beside the step).
 */
export type AcceptIncomingResourceAdvertisementState = Record<string, never>;
export type AcceptIncomingResourceAdvertisementEvent = Event | {
  readonly kind: "resource/accept-incoming-adv-gate";
  readonly alreadyIncoming: boolean;
};
export type AcceptIncomingResourceAdvertisementAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptIncomingResourceAdvertisementStepResult {
  readonly state: AcceptIncomingResourceAdvertisementState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptIncomingResourceAdvertisementAction[];
}
export function initialAcceptIncomingResourceAdvertisementState(): AcceptIncomingResourceAdvertisementState {
  if (stryMutAct_9fa48("31299")) {
    {}
  } else {
    stryCov_9fa48("31299");
    return {};
  }
}
export function stepAcceptIncomingResourceAdvertisementWithActions(state: AcceptIncomingResourceAdvertisementState, event: AcceptIncomingResourceAdvertisementEvent): AcceptIncomingResourceAdvertisementStepResult {
  if (stryMutAct_9fa48("31300")) {
    {}
  } else {
    stryCov_9fa48("31300");
    if (stryMutAct_9fa48("31303") ? event.kind !== "resource/accept-incoming-adv-gate" : stryMutAct_9fa48("31302") ? false : stryMutAct_9fa48("31301") ? true : (stryCov_9fa48("31301", "31302", "31303"), event.kind === (stryMutAct_9fa48("31304") ? "" : (stryCov_9fa48("31304"), "resource/accept-incoming-adv-gate")))) {
      if (stryMutAct_9fa48("31305")) {
        {}
      } else {
        stryCov_9fa48("31305");
        return stryMutAct_9fa48("31306") ? {} : (stryCov_9fa48("31306"), {
          state,
          intents: stryMutAct_9fa48("31307") ? ["Stryker was here"] : (stryCov_9fa48("31307"), []),
          actions: stryMutAct_9fa48("31308") ? [] : (stryCov_9fa48("31308"), [stryMutAct_9fa48("31309") ? {} : (stryCov_9fa48("31309"), {
            kind: shouldAcceptIncomingResourceAdvertisement(event.alreadyIncoming) ? stryMutAct_9fa48("31310") ? "" : (stryCov_9fa48("31310"), "accept") : stryMutAct_9fa48("31311") ? "" : (stryCov_9fa48("31311"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("31312") ? {} : (stryCov_9fa48("31312"), {
      state,
      intents: stryMutAct_9fa48("31313") ? ["Stryker was here"] : (stryCov_9fa48("31313"), []),
      actions: stryMutAct_9fa48("31314") ? ["Stryker was here"] : (stryCov_9fa48("31314"), [])
    });
  }
}
export function shouldAcceptIncomingResourceAdvertisementNow(actions: ReadonlyArray<AcceptIncomingResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("31315")) {
    {}
  } else {
    stryCov_9fa48("31315");
    return stryMutAct_9fa48("31316") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("31316"), actions.some(stryMutAct_9fa48("31317") ? () => undefined : (stryCov_9fa48("31317"), action => stryMutAct_9fa48("31320") ? action.kind !== "accept" : stryMutAct_9fa48("31319") ? false : stryMutAct_9fa48("31318") ? true : (stryCov_9fa48("31318", "31319", "31320"), action.kind === (stryMutAct_9fa48("31321") ? "" : (stryCov_9fa48("31321"), "accept"))))));
  }
}
export function shouldSkipIncomingResourceAdvertisement(actions: ReadonlyArray<AcceptIncomingResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("31322")) {
    {}
  } else {
    stryCov_9fa48("31322");
    return stryMutAct_9fa48("31323") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("31323"), actions.some(stryMutAct_9fa48("31324") ? () => undefined : (stryCov_9fa48("31324"), action => stryMutAct_9fa48("31327") ? action.kind !== "skip" : stryMutAct_9fa48("31326") ? false : stryMutAct_9fa48("31325") ? true : (stryCov_9fa48("31325", "31326", "31327"), action.kind === (stryMutAct_9fa48("31328") ? "" : (stryCov_9fa48("31328"), "skip"))))));
  }
}

/** Map link readiness to the next advertise-phase status event. */
export function planResourceAdvertisePhase(linkReady: boolean): "queue" | "advertise" {
  if (stryMutAct_9fa48("31329")) {
    {}
  } else {
    stryCov_9fa48("31329");
    return linkReady ? stryMutAct_9fa48("31330") ? "" : (stryCov_9fa48("31330"), "advertise") : stryMutAct_9fa48("31331") ? "" : (stryCov_9fa48("31331"), "queue");
  }
}
export type ResourceAdvertisePhasePlan = "queue" | "advertise";