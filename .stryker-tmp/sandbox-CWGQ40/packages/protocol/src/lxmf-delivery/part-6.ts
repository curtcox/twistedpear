/** Extracted from lxmf-delivery.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure LXMF delivery method / representation planning.
 * Encryption and hashing stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` /
 * `planLxmfDelivery` /
 * `canAcceptLxmfPropagationLocalDelivery` /
 * `canUnpackLxmfPropagationLocalIngress` /
 * `shouldAwaitLxmfDeliveryReceipt` / `shouldInvokeLxmfDeliveryCallback`
 * reads beside the step).
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
import { LxmfUnverifiedReason, type LxmfUnverifiedReasonValue } from "../lxmf-fields.js";
import { LxmfDeliveryRepresentation } from "./part-1.js";
import { planLxmfPropagationLinkReady } from "./part-5.js";
import type { LxmfPropagationLinkReadyEvent, LxmfPropagationLinkReadyPlan, LxmfPropagationLinkReadyPlanAction, LxmfPropagationLinkReadyPlanEvent } from "./part-5.js";
/**
 * Propagation link-ready-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagationLinkReady` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagationLinkReadyWithActions}.
 */
export type LxmfPropagationLinkReadyPlanState = Record<string, never>;
export interface LxmfPropagationLinkReadyPlanStepResult {
  readonly state: LxmfPropagationLinkReadyPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationLinkReadyPlanAction[];
}
export function initialLxmfPropagationLinkReadyPlanState(): LxmfPropagationLinkReadyPlanState {
  if (stryMutAct_9fa48("20294")) {
    {}
  } else {
    stryCov_9fa48("20294");
    return {};
  }
}
export function stepLxmfPropagationLinkReadyPlanWithActions(state: LxmfPropagationLinkReadyPlanState, event: LxmfPropagationLinkReadyPlanEvent): LxmfPropagationLinkReadyPlanStepResult {
  if (stryMutAct_9fa48("20295")) {
    {}
  } else {
    stryCov_9fa48("20295");
    if (stryMutAct_9fa48("20298") ? event.kind !== "propagation-link/plan-gate" : stryMutAct_9fa48("20297") ? false : stryMutAct_9fa48("20296") ? true : (stryCov_9fa48("20296", "20297", "20298"), event.kind === (stryMutAct_9fa48("20299") ? "" : (stryCov_9fa48("20299"), "propagation-link/plan-gate")))) {
      if (stryMutAct_9fa48("20300")) {
        {}
      } else {
        stryCov_9fa48("20300");
        return stryMutAct_9fa48("20301") ? {} : (stryCov_9fa48("20301"), {
          state,
          intents: stryMutAct_9fa48("20302") ? ["Stryker was here"] : (stryCov_9fa48("20302"), []),
          actions: stryMutAct_9fa48("20303") ? [] : (stryCov_9fa48("20303"), [stryMutAct_9fa48("20304") ? {} : (stryCov_9fa48("20304"), {
            kind: planLxmfPropagationLinkReady(stryMutAct_9fa48("20305") ? {} : (stryCov_9fa48("20305"), {
              canReuseLink: event.canReuseLink,
              nodeConfigured: event.nodeConfigured,
              nodeIdentityPresent: event.nodeIdentityPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("20306") ? {} : (stryCov_9fa48("20306"), {
      state,
      intents: stryMutAct_9fa48("20307") ? ["Stryker was here"] : (stryCov_9fa48("20307"), []),
      actions: stryMutAct_9fa48("20308") ? ["Stryker was here"] : (stryCov_9fa48("20308"), [])
    });
  }
}

/** Whether plan actions reuse an existing propagation link. */
export function shouldPlanLxmfPropagationLinkReadyReuse(actions: ReadonlyArray<LxmfPropagationLinkReadyPlanAction>): boolean {
  if (stryMutAct_9fa48("20309")) {
    {}
  } else {
    stryCov_9fa48("20309");
    return stryMutAct_9fa48("20310") ? actions.every(action => action.kind === "reuse") : (stryCov_9fa48("20310"), actions.some(stryMutAct_9fa48("20311") ? () => undefined : (stryCov_9fa48("20311"), action => stryMutAct_9fa48("20314") ? action.kind !== "reuse" : stryMutAct_9fa48("20313") ? false : stryMutAct_9fa48("20312") ? true : (stryCov_9fa48("20312", "20313", "20314"), action.kind === (stryMutAct_9fa48("20315") ? "" : (stryCov_9fa48("20315"), "reuse"))))));
  }
}

/** Whether plan actions establish a new propagation link. */
export function shouldPlanLxmfPropagationLinkReadyEstablish(actions: ReadonlyArray<LxmfPropagationLinkReadyPlanAction>): boolean {
  if (stryMutAct_9fa48("20316")) {
    {}
  } else {
    stryCov_9fa48("20316");
    return stryMutAct_9fa48("20317") ? actions.every(action => action.kind === "establish") : (stryCov_9fa48("20317"), actions.some(stryMutAct_9fa48("20318") ? () => undefined : (stryCov_9fa48("20318"), action => stryMutAct_9fa48("20321") ? action.kind !== "establish" : stryMutAct_9fa48("20320") ? false : stryMutAct_9fa48("20319") ? true : (stryCov_9fa48("20319", "20320", "20321"), action.kind === (stryMutAct_9fa48("20322") ? "" : (stryCov_9fa48("20322"), "establish"))))));
  }
}

/** Whether plan actions reject a missing propagation node. */
export function shouldRejectLxmfPropagationLinkReadyPlanMissingNode(actions: ReadonlyArray<LxmfPropagationLinkReadyPlanAction>): boolean {
  if (stryMutAct_9fa48("20323")) {
    {}
  } else {
    stryCov_9fa48("20323");
    return stryMutAct_9fa48("20324") ? actions.every(action => action.kind === "missing-node") : (stryCov_9fa48("20324"), actions.some(stryMutAct_9fa48("20325") ? () => undefined : (stryCov_9fa48("20325"), action => stryMutAct_9fa48("20328") ? action.kind !== "missing-node" : stryMutAct_9fa48("20327") ? false : stryMutAct_9fa48("20326") ? true : (stryCov_9fa48("20326", "20327", "20328"), action.kind === (stryMutAct_9fa48("20329") ? "" : (stryCov_9fa48("20329"), "missing-node"))))));
  }
}

/** Whether plan actions reject a missing node identity. */
export function shouldRejectLxmfPropagationLinkReadyPlanMissingIdentity(actions: ReadonlyArray<LxmfPropagationLinkReadyPlanAction>): boolean {
  if (stryMutAct_9fa48("20330")) {
    {}
  } else {
    stryCov_9fa48("20330");
    return stryMutAct_9fa48("20331") ? actions.every(action => action.kind === "missing-identity") : (stryCov_9fa48("20331"), actions.some(stryMutAct_9fa48("20332") ? () => undefined : (stryCov_9fa48("20332"), action => stryMutAct_9fa48("20335") ? action.kind !== "missing-identity" : stryMutAct_9fa48("20334") ? false : stryMutAct_9fa48("20333") ? true : (stryCov_9fa48("20333", "20334", "20335"), action.kind === (stryMutAct_9fa48("20336") ? "" : (stryCov_9fa48("20336"), "missing-identity"))))));
  }
}

/** Extract the link-ready plan from actions; null when empty. */
export function lxmfPropagationLinkReadyPlanFromActions(actions: ReadonlyArray<LxmfPropagationLinkReadyPlanAction>): LxmfPropagationLinkReadyPlan | null {
  if (stryMutAct_9fa48("20337")) {
    {}
  } else {
    stryCov_9fa48("20337");
    const action = actions.find(stryMutAct_9fa48("20338") ? () => undefined : (stryCov_9fa48("20338"), entry => stryMutAct_9fa48("20341") ? (entry.kind === "reuse" || entry.kind === "establish" || entry.kind === "missing-node") && entry.kind === "missing-identity" : stryMutAct_9fa48("20340") ? false : stryMutAct_9fa48("20339") ? true : (stryCov_9fa48("20339", "20340", "20341"), (stryMutAct_9fa48("20343") ? (entry.kind === "reuse" || entry.kind === "establish") && entry.kind === "missing-node" : stryMutAct_9fa48("20342") ? false : (stryCov_9fa48("20342", "20343"), (stryMutAct_9fa48("20345") ? entry.kind === "reuse" && entry.kind === "establish" : stryMutAct_9fa48("20344") ? false : (stryCov_9fa48("20344", "20345"), (stryMutAct_9fa48("20347") ? entry.kind !== "reuse" : stryMutAct_9fa48("20346") ? false : (stryCov_9fa48("20346", "20347"), entry.kind === (stryMutAct_9fa48("20348") ? "" : (stryCov_9fa48("20348"), "reuse")))) || (stryMutAct_9fa48("20350") ? entry.kind !== "establish" : stryMutAct_9fa48("20349") ? false : (stryCov_9fa48("20349", "20350"), entry.kind === (stryMutAct_9fa48("20351") ? "" : (stryCov_9fa48("20351"), "establish")))))) || (stryMutAct_9fa48("20353") ? entry.kind !== "missing-node" : stryMutAct_9fa48("20352") ? false : (stryCov_9fa48("20352", "20353"), entry.kind === (stryMutAct_9fa48("20354") ? "" : (stryCov_9fa48("20354"), "missing-node")))))) || (stryMutAct_9fa48("20356") ? entry.kind !== "missing-identity" : stryMutAct_9fa48("20355") ? false : (stryCov_9fa48("20355", "20356"), entry.kind === (stryMutAct_9fa48("20357") ? "" : (stryCov_9fa48("20357"), "missing-identity")))))));
    return stryMutAct_9fa48("20358") ? action?.kind && null : (stryCov_9fa48("20358"), (stryMutAct_9fa48("20359") ? action.kind : (stryCov_9fa48("20359"), action?.kind)) ?? null);
  }
}

/**
 * Propagation link-ready gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagationLinkReadyPlanWithActions}
 * (`reuse`|`establish`|`missing-node`|`missing-identity`).
 */
export type LxmfPropagationLinkReadyState = Record<string, never>;

/**
 * Adapter applies reuse / establish / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagationLinkReadyPlanWithActions}
 * (`reuse`|`establish`|`missing-node`|`missing-identity`).
 */
export type LxmfPropagationLinkReadyAction = {
  readonly kind: "reuse";
} | {
  readonly kind: "establish";
} | {
  readonly kind: "reject-missing-node";
} | {
  readonly kind: "reject-missing-identity";
};
export interface LxmfPropagationLinkReadyStepResult {
  readonly state: LxmfPropagationLinkReadyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationLinkReadyAction[];
}
export function initialLxmfPropagationLinkReadyState(): LxmfPropagationLinkReadyState {
  if (stryMutAct_9fa48("20360")) {
    {}
  } else {
    stryCov_9fa48("20360");
    return {};
  }
}
export const stepLxmfPropagationLinkReady: StepFn<LxmfPropagationLinkReadyState> = (state, event) => {
  if (stryMutAct_9fa48("20361")) {
    {}
  } else {
    stryCov_9fa48("20361");
    const result = stepLxmfPropagationLinkReadyInner(state, event as LxmfPropagationLinkReadyEvent);
    return stryMutAct_9fa48("20362") ? {} : (stryCov_9fa48("20362"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfPropagationLinkReadyWithActions(state: LxmfPropagationLinkReadyState, event: LxmfPropagationLinkReadyEvent): LxmfPropagationLinkReadyStepResult {
  if (stryMutAct_9fa48("20363")) {
    {}
  } else {
    stryCov_9fa48("20363");
    return stepLxmfPropagationLinkReadyInner(state, event);
  }
}
export function shouldReuseLxmfPropagationLink(actions: ReadonlyArray<LxmfPropagationLinkReadyAction>): boolean {
  if (stryMutAct_9fa48("20364")) {
    {}
  } else {
    stryCov_9fa48("20364");
    return stryMutAct_9fa48("20365") ? actions.every(action => action.kind === "reuse") : (stryCov_9fa48("20365"), actions.some(stryMutAct_9fa48("20366") ? () => undefined : (stryCov_9fa48("20366"), action => stryMutAct_9fa48("20369") ? action.kind !== "reuse" : stryMutAct_9fa48("20368") ? false : stryMutAct_9fa48("20367") ? true : (stryCov_9fa48("20367", "20368", "20369"), action.kind === (stryMutAct_9fa48("20370") ? "" : (stryCov_9fa48("20370"), "reuse"))))));
  }
}
export function shouldEstablishLxmfPropagationLink(actions: ReadonlyArray<LxmfPropagationLinkReadyAction>): boolean {
  if (stryMutAct_9fa48("20371")) {
    {}
  } else {
    stryCov_9fa48("20371");
    return stryMutAct_9fa48("20372") ? actions.every(action => action.kind === "establish") : (stryCov_9fa48("20372"), actions.some(stryMutAct_9fa48("20373") ? () => undefined : (stryCov_9fa48("20373"), action => stryMutAct_9fa48("20376") ? action.kind !== "establish" : stryMutAct_9fa48("20375") ? false : stryMutAct_9fa48("20374") ? true : (stryCov_9fa48("20374", "20375", "20376"), action.kind === (stryMutAct_9fa48("20377") ? "" : (stryCov_9fa48("20377"), "establish"))))));
  }
}
export function shouldRejectLxmfPropagationMissingNode(actions: ReadonlyArray<LxmfPropagationLinkReadyAction>): boolean {
  if (stryMutAct_9fa48("20378")) {
    {}
  } else {
    stryCov_9fa48("20378");
    return stryMutAct_9fa48("20379") ? actions.every(action => action.kind === "reject-missing-node") : (stryCov_9fa48("20379"), actions.some(stryMutAct_9fa48("20380") ? () => undefined : (stryCov_9fa48("20380"), action => stryMutAct_9fa48("20383") ? action.kind !== "reject-missing-node" : stryMutAct_9fa48("20382") ? false : stryMutAct_9fa48("20381") ? true : (stryCov_9fa48("20381", "20382", "20383"), action.kind === (stryMutAct_9fa48("20384") ? "" : (stryCov_9fa48("20384"), "reject-missing-node"))))));
  }
}
export function shouldRejectLxmfPropagationMissingIdentity(actions: ReadonlyArray<LxmfPropagationLinkReadyAction>): boolean {
  if (stryMutAct_9fa48("20385")) {
    {}
  } else {
    stryCov_9fa48("20385");
    return stryMutAct_9fa48("20386") ? actions.every(action => action.kind === "reject-missing-identity") : (stryCov_9fa48("20386"), actions.some(stryMutAct_9fa48("20387") ? () => undefined : (stryCov_9fa48("20387"), action => stryMutAct_9fa48("20390") ? action.kind !== "reject-missing-identity" : stryMutAct_9fa48("20389") ? false : stryMutAct_9fa48("20388") ? true : (stryCov_9fa48("20388", "20389", "20390"), action.kind === (stryMutAct_9fa48("20391") ? "" : (stryCov_9fa48("20391"), "reject-missing-identity"))))));
  }
}
function stepLxmfPropagationLinkReadyInner(state: LxmfPropagationLinkReadyState, event: LxmfPropagationLinkReadyEvent): LxmfPropagationLinkReadyStepResult {
  if (stryMutAct_9fa48("20392")) {
    {}
  } else {
    stryCov_9fa48("20392");
    if (stryMutAct_9fa48("20395") ? event.kind !== "propagation-link/gate" : stryMutAct_9fa48("20394") ? false : stryMutAct_9fa48("20393") ? true : (stryCov_9fa48("20393", "20394", "20395"), event.kind === (stryMutAct_9fa48("20396") ? "" : (stryCov_9fa48("20396"), "propagation-link/gate")))) {
      if (stryMutAct_9fa48("20397")) {
        {}
      } else {
        stryCov_9fa48("20397");
        const planActions = stepLxmfPropagationLinkReadyPlanWithActions(initialLxmfPropagationLinkReadyPlanState(), stryMutAct_9fa48("20398") ? {} : (stryCov_9fa48("20398"), {
          kind: stryMutAct_9fa48("20399") ? "" : (stryCov_9fa48("20399"), "propagation-link/plan-gate"),
          canReuseLink: event.canReuseLink,
          nodeConfigured: event.nodeConfigured,
          nodeIdentityPresent: event.nodeIdentityPresent
        })).actions;
        if (stryMutAct_9fa48("20401") ? false : stryMutAct_9fa48("20400") ? true : (stryCov_9fa48("20400", "20401"), shouldPlanLxmfPropagationLinkReadyReuse(planActions))) {
          if (stryMutAct_9fa48("20402")) {
            {}
          } else {
            stryCov_9fa48("20402");
            return stryMutAct_9fa48("20403") ? {} : (stryCov_9fa48("20403"), {
              state,
              intents: stryMutAct_9fa48("20404") ? ["Stryker was here"] : (stryCov_9fa48("20404"), []),
              actions: stryMutAct_9fa48("20405") ? [] : (stryCov_9fa48("20405"), [stryMutAct_9fa48("20406") ? {} : (stryCov_9fa48("20406"), {
                kind: stryMutAct_9fa48("20407") ? "" : (stryCov_9fa48("20407"), "reuse")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20409") ? false : stryMutAct_9fa48("20408") ? true : (stryCov_9fa48("20408", "20409"), shouldRejectLxmfPropagationLinkReadyPlanMissingNode(planActions))) {
          if (stryMutAct_9fa48("20410")) {
            {}
          } else {
            stryCov_9fa48("20410");
            return stryMutAct_9fa48("20411") ? {} : (stryCov_9fa48("20411"), {
              state,
              intents: stryMutAct_9fa48("20412") ? ["Stryker was here"] : (stryCov_9fa48("20412"), []),
              actions: stryMutAct_9fa48("20413") ? [] : (stryCov_9fa48("20413"), [stryMutAct_9fa48("20414") ? {} : (stryCov_9fa48("20414"), {
                kind: stryMutAct_9fa48("20415") ? "" : (stryCov_9fa48("20415"), "reject-missing-node")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20417") ? false : stryMutAct_9fa48("20416") ? true : (stryCov_9fa48("20416", "20417"), shouldRejectLxmfPropagationLinkReadyPlanMissingIdentity(planActions))) {
          if (stryMutAct_9fa48("20418")) {
            {}
          } else {
            stryCov_9fa48("20418");
            return stryMutAct_9fa48("20419") ? {} : (stryCov_9fa48("20419"), {
              state,
              intents: stryMutAct_9fa48("20420") ? ["Stryker was here"] : (stryCov_9fa48("20420"), []),
              actions: stryMutAct_9fa48("20421") ? [] : (stryCov_9fa48("20421"), [stryMutAct_9fa48("20422") ? {} : (stryCov_9fa48("20422"), {
                kind: stryMutAct_9fa48("20423") ? "" : (stryCov_9fa48("20423"), "reject-missing-identity")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20426") ? false : stryMutAct_9fa48("20425") ? true : stryMutAct_9fa48("20424") ? shouldPlanLxmfPropagationLinkReadyEstablish(planActions) : (stryCov_9fa48("20424", "20425", "20426"), !shouldPlanLxmfPropagationLinkReadyEstablish(planActions))) {
          if (stryMutAct_9fa48("20427")) {
            {}
          } else {
            stryCov_9fa48("20427");
            return stryMutAct_9fa48("20428") ? {} : (stryCov_9fa48("20428"), {
              state,
              intents: stryMutAct_9fa48("20429") ? ["Stryker was here"] : (stryCov_9fa48("20429"), []),
              actions: stryMutAct_9fa48("20430") ? ["Stryker was here"] : (stryCov_9fa48("20430"), [])
            });
          }
        }
        return stryMutAct_9fa48("20431") ? {} : (stryCov_9fa48("20431"), {
          state,
          intents: stryMutAct_9fa48("20432") ? ["Stryker was here"] : (stryCov_9fa48("20432"), []),
          actions: stryMutAct_9fa48("20433") ? [] : (stryCov_9fa48("20433"), [stryMutAct_9fa48("20434") ? {} : (stryCov_9fa48("20434"), {
            kind: stryMutAct_9fa48("20435") ? "" : (stryCov_9fa48("20435"), "establish")
          })])
        });
      }
    }
    return stryMutAct_9fa48("20436") ? {} : (stryCov_9fa48("20436"), {
      state,
      intents: stryMutAct_9fa48("20437") ? ["Stryker was here"] : (stryCov_9fa48("20437"), []),
      actions: stryMutAct_9fa48("20438") ? ["Stryker was here"] : (stryCov_9fa48("20438"), [])
    });
  }
}
export type LxmfPropagatedSendPlan = "ok" | "missing-node" | "missing-packed" | "resource-unimplemented";

/** Whether PROPAGATED send may proceed (node + packed envelope + PACKET representation). */
export function planLxmfPropagatedSend(input: {
  readonly nodeConfigured: boolean;
  readonly hasPropagationPacked: boolean;
  readonly representation: number;
}): LxmfPropagatedSendPlan {
  if (stryMutAct_9fa48("20439")) {
    {}
  } else {
    stryCov_9fa48("20439");
    if (stryMutAct_9fa48("20442") ? false : stryMutAct_9fa48("20441") ? true : stryMutAct_9fa48("20440") ? input.nodeConfigured : (stryCov_9fa48("20440", "20441", "20442"), !input.nodeConfigured)) {
      if (stryMutAct_9fa48("20443")) {
        {}
      } else {
        stryCov_9fa48("20443");
        return stryMutAct_9fa48("20444") ? "" : (stryCov_9fa48("20444"), "missing-node");
      }
    }
    if (stryMutAct_9fa48("20447") ? false : stryMutAct_9fa48("20446") ? true : stryMutAct_9fa48("20445") ? input.hasPropagationPacked : (stryCov_9fa48("20445", "20446", "20447"), !input.hasPropagationPacked)) {
      if (stryMutAct_9fa48("20448")) {
        {}
      } else {
        stryCov_9fa48("20448");
        return stryMutAct_9fa48("20449") ? "" : (stryCov_9fa48("20449"), "missing-packed");
      }
    }
    if (stryMutAct_9fa48("20452") ? input.representation === LxmfDeliveryRepresentation.PACKET : stryMutAct_9fa48("20451") ? false : stryMutAct_9fa48("20450") ? true : (stryCov_9fa48("20450", "20451", "20452"), input.representation !== LxmfDeliveryRepresentation.PACKET)) {
      if (stryMutAct_9fa48("20453")) {
        {}
      } else {
        stryCov_9fa48("20453");
        return stryMutAct_9fa48("20454") ? "" : (stryCov_9fa48("20454"), "resource-unimplemented");
      }
    }
    return stryMutAct_9fa48("20455") ? "" : (stryCov_9fa48("20455"), "ok");
  }
}

/**
 * PROPAGATED send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagatedSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagatedSendWithActions}.
 */
export type LxmfPropagatedSendPlanState = Record<string, never>;
export type LxmfPropagatedSendPlanEvent = Event | {
  readonly kind: "propagated-send/plan-gate";
  readonly nodeConfigured: boolean;
  readonly hasPropagationPacked: boolean;
  readonly representation: number;
};
export type LxmfPropagatedSendPlanAction = {
  readonly kind: "ok";
} | {
  readonly kind: "missing-node";
} | {
  readonly kind: "missing-packed";
} | {
  readonly kind: "resource-unimplemented";
};
export interface LxmfPropagatedSendPlanStepResult {
  readonly state: LxmfPropagatedSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedSendPlanAction[];
}
export function initialLxmfPropagatedSendPlanState(): LxmfPropagatedSendPlanState {
  if (stryMutAct_9fa48("20456")) {
    {}
  } else {
    stryCov_9fa48("20456");
    return {};
  }
}
export function stepLxmfPropagatedSendPlanWithActions(state: LxmfPropagatedSendPlanState, event: LxmfPropagatedSendPlanEvent): LxmfPropagatedSendPlanStepResult {
  if (stryMutAct_9fa48("20457")) {
    {}
  } else {
    stryCov_9fa48("20457");
    if (stryMutAct_9fa48("20460") ? event.kind !== "propagated-send/plan-gate" : stryMutAct_9fa48("20459") ? false : stryMutAct_9fa48("20458") ? true : (stryCov_9fa48("20458", "20459", "20460"), event.kind === (stryMutAct_9fa48("20461") ? "" : (stryCov_9fa48("20461"), "propagated-send/plan-gate")))) {
      if (stryMutAct_9fa48("20462")) {
        {}
      } else {
        stryCov_9fa48("20462");
        return stryMutAct_9fa48("20463") ? {} : (stryCov_9fa48("20463"), {
          state,
          intents: stryMutAct_9fa48("20464") ? ["Stryker was here"] : (stryCov_9fa48("20464"), []),
          actions: stryMutAct_9fa48("20465") ? [] : (stryCov_9fa48("20465"), [stryMutAct_9fa48("20466") ? {} : (stryCov_9fa48("20466"), {
            kind: planLxmfPropagatedSend(stryMutAct_9fa48("20467") ? {} : (stryCov_9fa48("20467"), {
              nodeConfigured: event.nodeConfigured,
              hasPropagationPacked: event.hasPropagationPacked,
              representation: event.representation
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("20468") ? {} : (stryCov_9fa48("20468"), {
      state,
      intents: stryMutAct_9fa48("20469") ? ["Stryker was here"] : (stryCov_9fa48("20469"), []),
      actions: stryMutAct_9fa48("20470") ? ["Stryker was here"] : (stryCov_9fa48("20470"), [])
    });
  }
}

/** Whether plan actions allow PROPAGATED send to proceed. */
export function shouldPlanLxmfPropagatedSendOk(actions: ReadonlyArray<LxmfPropagatedSendPlanAction>): boolean {
  if (stryMutAct_9fa48("20471")) {
    {}
  } else {
    stryCov_9fa48("20471");
    return stryMutAct_9fa48("20472") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("20472"), actions.some(stryMutAct_9fa48("20473") ? () => undefined : (stryCov_9fa48("20473"), action => stryMutAct_9fa48("20476") ? action.kind !== "ok" : stryMutAct_9fa48("20475") ? false : stryMutAct_9fa48("20474") ? true : (stryCov_9fa48("20474", "20475", "20476"), action.kind === (stryMutAct_9fa48("20477") ? "" : (stryCov_9fa48("20477"), "ok"))))));
  }
}

/** Whether plan actions reject a missing propagation node. */
export function shouldRejectLxmfPropagatedSendPlanMissingNode(actions: ReadonlyArray<LxmfPropagatedSendPlanAction>): boolean {
  if (stryMutAct_9fa48("20478")) {
    {}
  } else {
    stryCov_9fa48("20478");
    return stryMutAct_9fa48("20479") ? actions.every(action => action.kind === "missing-node") : (stryCov_9fa48("20479"), actions.some(stryMutAct_9fa48("20480") ? () => undefined : (stryCov_9fa48("20480"), action => stryMutAct_9fa48("20483") ? action.kind !== "missing-node" : stryMutAct_9fa48("20482") ? false : stryMutAct_9fa48("20481") ? true : (stryCov_9fa48("20481", "20482", "20483"), action.kind === (stryMutAct_9fa48("20484") ? "" : (stryCov_9fa48("20484"), "missing-node"))))));
  }
}

/** Whether plan actions reject a missing packed envelope. */
export function shouldRejectLxmfPropagatedSendPlanMissingPacked(actions: ReadonlyArray<LxmfPropagatedSendPlanAction>): boolean {
  if (stryMutAct_9fa48("20485")) {
    {}
  } else {
    stryCov_9fa48("20485");
    return stryMutAct_9fa48("20486") ? actions.every(action => action.kind === "missing-packed") : (stryCov_9fa48("20486"), actions.some(stryMutAct_9fa48("20487") ? () => undefined : (stryCov_9fa48("20487"), action => stryMutAct_9fa48("20490") ? action.kind !== "missing-packed" : stryMutAct_9fa48("20489") ? false : stryMutAct_9fa48("20488") ? true : (stryCov_9fa48("20488", "20489", "20490"), action.kind === (stryMutAct_9fa48("20491") ? "" : (stryCov_9fa48("20491"), "missing-packed"))))));
  }
}

/** Whether plan actions reject unimplemented RESOURCE representation. */
export function shouldRejectLxmfPropagatedSendPlanResourceUnimplemented(actions: ReadonlyArray<LxmfPropagatedSendPlanAction>): boolean {
  if (stryMutAct_9fa48("20492")) {
    {}
  } else {
    stryCov_9fa48("20492");
    return stryMutAct_9fa48("20493") ? actions.every(action => action.kind === "resource-unimplemented") : (stryCov_9fa48("20493"), actions.some(stryMutAct_9fa48("20494") ? () => undefined : (stryCov_9fa48("20494"), action => stryMutAct_9fa48("20497") ? action.kind !== "resource-unimplemented" : stryMutAct_9fa48("20496") ? false : stryMutAct_9fa48("20495") ? true : (stryCov_9fa48("20495", "20496", "20497"), action.kind === (stryMutAct_9fa48("20498") ? "" : (stryCov_9fa48("20498"), "resource-unimplemented"))))));
  }
}

/** Extract the PROPAGATED send plan from actions; null when empty. */
export function lxmfPropagatedSendPlanFromActions(actions: ReadonlyArray<LxmfPropagatedSendPlanAction>): LxmfPropagatedSendPlan | null {
  if (stryMutAct_9fa48("20499")) {
    {}
  } else {
    stryCov_9fa48("20499");
    const action = actions.find(stryMutAct_9fa48("20500") ? () => undefined : (stryCov_9fa48("20500"), entry => stryMutAct_9fa48("20503") ? (entry.kind === "ok" || entry.kind === "missing-node" || entry.kind === "missing-packed") && entry.kind === "resource-unimplemented" : stryMutAct_9fa48("20502") ? false : stryMutAct_9fa48("20501") ? true : (stryCov_9fa48("20501", "20502", "20503"), (stryMutAct_9fa48("20505") ? (entry.kind === "ok" || entry.kind === "missing-node") && entry.kind === "missing-packed" : stryMutAct_9fa48("20504") ? false : (stryCov_9fa48("20504", "20505"), (stryMutAct_9fa48("20507") ? entry.kind === "ok" && entry.kind === "missing-node" : stryMutAct_9fa48("20506") ? false : (stryCov_9fa48("20506", "20507"), (stryMutAct_9fa48("20509") ? entry.kind !== "ok" : stryMutAct_9fa48("20508") ? false : (stryCov_9fa48("20508", "20509"), entry.kind === (stryMutAct_9fa48("20510") ? "" : (stryCov_9fa48("20510"), "ok")))) || (stryMutAct_9fa48("20512") ? entry.kind !== "missing-node" : stryMutAct_9fa48("20511") ? false : (stryCov_9fa48("20511", "20512"), entry.kind === (stryMutAct_9fa48("20513") ? "" : (stryCov_9fa48("20513"), "missing-node")))))) || (stryMutAct_9fa48("20515") ? entry.kind !== "missing-packed" : stryMutAct_9fa48("20514") ? false : (stryCov_9fa48("20514", "20515"), entry.kind === (stryMutAct_9fa48("20516") ? "" : (stryCov_9fa48("20516"), "missing-packed")))))) || (stryMutAct_9fa48("20518") ? entry.kind !== "resource-unimplemented" : stryMutAct_9fa48("20517") ? false : (stryCov_9fa48("20517", "20518"), entry.kind === (stryMutAct_9fa48("20519") ? "" : (stryCov_9fa48("20519"), "resource-unimplemented")))))));
    return stryMutAct_9fa48("20520") ? action?.kind && null : (stryCov_9fa48("20520"), (stryMutAct_9fa48("20521") ? action.kind : (stryCov_9fa48("20521"), action?.kind)) ?? null);
  }
}

/**
 * PROPAGATED send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagatedSendPlanWithActions}
 * (`ok`|`missing-node`|`missing-packed`|`resource-unimplemented`).
 */
export type LxmfPropagatedSendState = Record<string, never>;
export type LxmfPropagatedSendEvent = Event | {
  readonly kind: "propagated-send/gate";
  readonly nodeConfigured: boolean;
  readonly hasPropagationPacked: boolean;
  readonly representation: number;
};

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagatedSendPlanWithActions}
 * (`ok`|`missing-node`|`missing-packed`|`resource-unimplemented`).
 */
export type LxmfPropagatedSendAction = {
  readonly kind: "proceed";
} | {
  readonly kind: "reject-missing-node";
} | {
  readonly kind: "reject-missing-packed";
} | {
  readonly kind: "reject-resource-unimplemented";
};
export interface LxmfPropagatedSendStepResult {
  readonly state: LxmfPropagatedSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedSendAction[];
}
export function initialLxmfPropagatedSendState(): LxmfPropagatedSendState {
  if (stryMutAct_9fa48("20522")) {
    {}
  } else {
    stryCov_9fa48("20522");
    return {};
  }
}
export const stepLxmfPropagatedSend: StepFn<LxmfPropagatedSendState> = (state, event) => {
  if (stryMutAct_9fa48("20523")) {
    {}
  } else {
    stryCov_9fa48("20523");
    const result = stepLxmfPropagatedSendInner(state, event as LxmfPropagatedSendEvent);
    return stryMutAct_9fa48("20524") ? {} : (stryCov_9fa48("20524"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfPropagatedSendWithActions(state: LxmfPropagatedSendState, event: LxmfPropagatedSendEvent): LxmfPropagatedSendStepResult {
  if (stryMutAct_9fa48("20525")) {
    {}
  } else {
    stryCov_9fa48("20525");
    return stepLxmfPropagatedSendInner(state, event);
  }
}
export function shouldProceedLxmfPropagatedSend(actions: ReadonlyArray<LxmfPropagatedSendAction>): boolean {
  if (stryMutAct_9fa48("20526")) {
    {}
  } else {
    stryCov_9fa48("20526");
    return stryMutAct_9fa48("20527") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("20527"), actions.some(stryMutAct_9fa48("20528") ? () => undefined : (stryCov_9fa48("20528"), action => stryMutAct_9fa48("20531") ? action.kind !== "proceed" : stryMutAct_9fa48("20530") ? false : stryMutAct_9fa48("20529") ? true : (stryCov_9fa48("20529", "20530", "20531"), action.kind === (stryMutAct_9fa48("20532") ? "" : (stryCov_9fa48("20532"), "proceed"))))));
  }
}
export function shouldRejectLxmfPropagatedMissingNode(actions: ReadonlyArray<LxmfPropagatedSendAction>): boolean {
  if (stryMutAct_9fa48("20533")) {
    {}
  } else {
    stryCov_9fa48("20533");
    return stryMutAct_9fa48("20534") ? actions.every(action => action.kind === "reject-missing-node") : (stryCov_9fa48("20534"), actions.some(stryMutAct_9fa48("20535") ? () => undefined : (stryCov_9fa48("20535"), action => stryMutAct_9fa48("20538") ? action.kind !== "reject-missing-node" : stryMutAct_9fa48("20537") ? false : stryMutAct_9fa48("20536") ? true : (stryCov_9fa48("20536", "20537", "20538"), action.kind === (stryMutAct_9fa48("20539") ? "" : (stryCov_9fa48("20539"), "reject-missing-node"))))));
  }
}
export function shouldRejectLxmfPropagatedMissingPacked(actions: ReadonlyArray<LxmfPropagatedSendAction>): boolean {
  if (stryMutAct_9fa48("20540")) {
    {}
  } else {
    stryCov_9fa48("20540");
    return stryMutAct_9fa48("20541") ? actions.every(action => action.kind === "reject-missing-packed") : (stryCov_9fa48("20541"), actions.some(stryMutAct_9fa48("20542") ? () => undefined : (stryCov_9fa48("20542"), action => stryMutAct_9fa48("20545") ? action.kind !== "reject-missing-packed" : stryMutAct_9fa48("20544") ? false : stryMutAct_9fa48("20543") ? true : (stryCov_9fa48("20543", "20544", "20545"), action.kind === (stryMutAct_9fa48("20546") ? "" : (stryCov_9fa48("20546"), "reject-missing-packed"))))));
  }
}
export function shouldRejectLxmfPropagatedResourceUnimplemented(actions: ReadonlyArray<LxmfPropagatedSendAction>): boolean {
  if (stryMutAct_9fa48("20547")) {
    {}
  } else {
    stryCov_9fa48("20547");
    return stryMutAct_9fa48("20548") ? actions.every(action => action.kind === "reject-resource-unimplemented") : (stryCov_9fa48("20548"), actions.some(stryMutAct_9fa48("20549") ? () => undefined : (stryCov_9fa48("20549"), action => stryMutAct_9fa48("20552") ? action.kind !== "reject-resource-unimplemented" : stryMutAct_9fa48("20551") ? false : stryMutAct_9fa48("20550") ? true : (stryCov_9fa48("20550", "20551", "20552"), action.kind === (stryMutAct_9fa48("20553") ? "" : (stryCov_9fa48("20553"), "reject-resource-unimplemented"))))));
  }
}
function stepLxmfPropagatedSendInner(state: LxmfPropagatedSendState, event: LxmfPropagatedSendEvent): LxmfPropagatedSendStepResult {
  if (stryMutAct_9fa48("20554")) {
    {}
  } else {
    stryCov_9fa48("20554");
    if (stryMutAct_9fa48("20557") ? event.kind !== "propagated-send/gate" : stryMutAct_9fa48("20556") ? false : stryMutAct_9fa48("20555") ? true : (stryCov_9fa48("20555", "20556", "20557"), event.kind === (stryMutAct_9fa48("20558") ? "" : (stryCov_9fa48("20558"), "propagated-send/gate")))) {
      if (stryMutAct_9fa48("20559")) {
        {}
      } else {
        stryCov_9fa48("20559");
        const planActions = stepLxmfPropagatedSendPlanWithActions(initialLxmfPropagatedSendPlanState(), stryMutAct_9fa48("20560") ? {} : (stryCov_9fa48("20560"), {
          kind: stryMutAct_9fa48("20561") ? "" : (stryCov_9fa48("20561"), "propagated-send/plan-gate"),
          nodeConfigured: event.nodeConfigured,
          hasPropagationPacked: event.hasPropagationPacked,
          representation: event.representation
        })).actions;
        if (stryMutAct_9fa48("20563") ? false : stryMutAct_9fa48("20562") ? true : (stryCov_9fa48("20562", "20563"), shouldRejectLxmfPropagatedSendPlanMissingNode(planActions))) {
          if (stryMutAct_9fa48("20564")) {
            {}
          } else {
            stryCov_9fa48("20564");
            return stryMutAct_9fa48("20565") ? {} : (stryCov_9fa48("20565"), {
              state,
              intents: stryMutAct_9fa48("20566") ? ["Stryker was here"] : (stryCov_9fa48("20566"), []),
              actions: stryMutAct_9fa48("20567") ? [] : (stryCov_9fa48("20567"), [stryMutAct_9fa48("20568") ? {} : (stryCov_9fa48("20568"), {
                kind: stryMutAct_9fa48("20569") ? "" : (stryCov_9fa48("20569"), "reject-missing-node")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20571") ? false : stryMutAct_9fa48("20570") ? true : (stryCov_9fa48("20570", "20571"), shouldRejectLxmfPropagatedSendPlanMissingPacked(planActions))) {
          if (stryMutAct_9fa48("20572")) {
            {}
          } else {
            stryCov_9fa48("20572");
            return stryMutAct_9fa48("20573") ? {} : (stryCov_9fa48("20573"), {
              state,
              intents: stryMutAct_9fa48("20574") ? ["Stryker was here"] : (stryCov_9fa48("20574"), []),
              actions: stryMutAct_9fa48("20575") ? [] : (stryCov_9fa48("20575"), [stryMutAct_9fa48("20576") ? {} : (stryCov_9fa48("20576"), {
                kind: stryMutAct_9fa48("20577") ? "" : (stryCov_9fa48("20577"), "reject-missing-packed")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20579") ? false : stryMutAct_9fa48("20578") ? true : (stryCov_9fa48("20578", "20579"), shouldRejectLxmfPropagatedSendPlanResourceUnimplemented(planActions))) {
          if (stryMutAct_9fa48("20580")) {
            {}
          } else {
            stryCov_9fa48("20580");
            return stryMutAct_9fa48("20581") ? {} : (stryCov_9fa48("20581"), {
              state,
              intents: stryMutAct_9fa48("20582") ? ["Stryker was here"] : (stryCov_9fa48("20582"), []),
              actions: stryMutAct_9fa48("20583") ? [] : (stryCov_9fa48("20583"), [stryMutAct_9fa48("20584") ? {} : (stryCov_9fa48("20584"), {
                kind: stryMutAct_9fa48("20585") ? "" : (stryCov_9fa48("20585"), "reject-resource-unimplemented")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20588") ? false : stryMutAct_9fa48("20587") ? true : stryMutAct_9fa48("20586") ? shouldPlanLxmfPropagatedSendOk(planActions) : (stryCov_9fa48("20586", "20587", "20588"), !shouldPlanLxmfPropagatedSendOk(planActions))) {
          if (stryMutAct_9fa48("20589")) {
            {}
          } else {
            stryCov_9fa48("20589");
            return stryMutAct_9fa48("20590") ? {} : (stryCov_9fa48("20590"), {
              state,
              intents: stryMutAct_9fa48("20591") ? ["Stryker was here"] : (stryCov_9fa48("20591"), []),
              actions: stryMutAct_9fa48("20592") ? ["Stryker was here"] : (stryCov_9fa48("20592"), [])
            });
          }
        }
        return stryMutAct_9fa48("20593") ? {} : (stryCov_9fa48("20593"), {
          state,
          intents: stryMutAct_9fa48("20594") ? ["Stryker was here"] : (stryCov_9fa48("20594"), []),
          actions: stryMutAct_9fa48("20595") ? [] : (stryCov_9fa48("20595"), [stryMutAct_9fa48("20596") ? {} : (stryCov_9fa48("20596"), {
            kind: stryMutAct_9fa48("20597") ? "" : (stryCov_9fa48("20597"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("20598") ? {} : (stryCov_9fa48("20598"), {
      state,
      intents: stryMutAct_9fa48("20599") ? ["Stryker was here"] : (stryCov_9fa48("20599"), []),
      actions: stryMutAct_9fa48("20600") ? ["Stryker was here"] : (stryCov_9fa48("20600"), [])
    });
  }
}

/** Whether outbound LXMF should await / poll a delivery receipt. */
export function shouldAwaitLxmfDeliveryReceipt(receiptPresent: boolean): boolean {
  if (stryMutAct_9fa48("20601")) {
    {}
  } else {
    stryCov_9fa48("20601");
    return receiptPresent;
  }
}

/**
 * LXMF delivery-receipt await gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAwaitLxmfDeliveryReceipt` reads beside the step).
 */
export type AwaitLxmfDeliveryReceiptState = Record<string, never>;
export type AwaitLxmfDeliveryReceiptEvent = Event | {
  readonly kind: "lxmf/await-delivery-receipt-gate";
  readonly receiptPresent: boolean;
};
export type AwaitLxmfDeliveryReceiptAction = {
  readonly kind: "await";
} | {
  readonly kind: "skip";
};
export interface AwaitLxmfDeliveryReceiptStepResult {
  readonly state: AwaitLxmfDeliveryReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AwaitLxmfDeliveryReceiptAction[];
}
export function initialAwaitLxmfDeliveryReceiptState(): AwaitLxmfDeliveryReceiptState {
  if (stryMutAct_9fa48("20602")) {
    {}
  } else {
    stryCov_9fa48("20602");
    return {};
  }
}