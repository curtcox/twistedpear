/**
 * Pure destination proof-strategy codes and prove decision.
 * App `shouldProve` evaluation stays at the adapter edge.
 * Prove / emit conclusions leave via machine actions (no ad-hoc
 * `planDestinationProof` / `canEmitDestinationProof` reads beside the step).
 * Proof plan nested via {@link stepDestinationProofPlanWithActions}
 * (`prove`|`skip`).
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
export const DestinationProofStrategyCode = {
  PROVE_NONE: 0x21,
  PROVE_APP: 0x22,
  PROVE_ALL: 0x23
} as const;
export type DestinationProofStrategyCodeValue = (typeof DestinationProofStrategyCode)[keyof typeof DestinationProofStrategyCode];

/**
 * Decide whether to send a delivery proof.
 * For PROVE_APP, pass `appWantsProof` from the destination callback.
 */
export function planDestinationProof(input: {
  readonly strategy: number;
  readonly appWantsProof?: boolean;
}): boolean {
  if (stryMutAct_9fa48("6689")) {
    {}
  } else {
    stryCov_9fa48("6689");
    if (stryMutAct_9fa48("6692") ? input.strategy !== DestinationProofStrategyCode.PROVE_ALL : stryMutAct_9fa48("6691") ? false : stryMutAct_9fa48("6690") ? true : (stryCov_9fa48("6690", "6691", "6692"), input.strategy === DestinationProofStrategyCode.PROVE_ALL)) {
      if (stryMutAct_9fa48("6693")) {
        {}
      } else {
        stryCov_9fa48("6693");
        return stryMutAct_9fa48("6694") ? false : (stryCov_9fa48("6694"), true);
      }
    }
    if (stryMutAct_9fa48("6697") ? input.strategy !== DestinationProofStrategyCode.PROVE_APP : stryMutAct_9fa48("6696") ? false : stryMutAct_9fa48("6695") ? true : (stryCov_9fa48("6695", "6696", "6697"), input.strategy === DestinationProofStrategyCode.PROVE_APP)) {
      if (stryMutAct_9fa48("6698")) {
        {}
      } else {
        stryCov_9fa48("6698");
        return stryMutAct_9fa48("6701") ? input.appWantsProof !== true : stryMutAct_9fa48("6700") ? false : stryMutAct_9fa48("6699") ? true : (stryCov_9fa48("6699", "6700", "6701"), input.appWantsProof === (stryMutAct_9fa48("6702") ? false : (stryCov_9fa48("6702"), true)));
      }
    }
    return stryMutAct_9fa48("6703") ? true : (stryCov_9fa48("6703"), false);
  }
}

/** Whether transport may emit a destination delivery proof (identity required). */
export function canEmitDestinationProof(identityPresent: boolean): boolean {
  if (stryMutAct_9fa48("6704")) {
    {}
  } else {
    stryCov_9fa48("6704");
    return identityPresent;
  }
}

/**
 * Destination proof-emit gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canEmitDestinationProof`
 * reads beside the step).
 */
export type EmitDestinationProofState = Record<string, never>;
export type EmitDestinationProofEvent = Event | {
  readonly kind: "destination/emit-proof-gate";
  readonly identityPresent: boolean;
};
export type EmitDestinationProofAction = {
  readonly kind: "emit";
} | {
  readonly kind: "skip";
};
export interface EmitDestinationProofStepResult {
  readonly state: EmitDestinationProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EmitDestinationProofAction[];
}
export function initialEmitDestinationProofState(): EmitDestinationProofState {
  if (stryMutAct_9fa48("6705")) {
    {}
  } else {
    stryCov_9fa48("6705");
    return {};
  }
}
export function stepEmitDestinationProofWithActions(state: EmitDestinationProofState, event: EmitDestinationProofEvent): EmitDestinationProofStepResult {
  if (stryMutAct_9fa48("6706")) {
    {}
  } else {
    stryCov_9fa48("6706");
    if (stryMutAct_9fa48("6709") ? event.kind !== "destination/emit-proof-gate" : stryMutAct_9fa48("6708") ? false : stryMutAct_9fa48("6707") ? true : (stryCov_9fa48("6707", "6708", "6709"), event.kind === (stryMutAct_9fa48("6710") ? "" : (stryCov_9fa48("6710"), "destination/emit-proof-gate")))) {
      if (stryMutAct_9fa48("6711")) {
        {}
      } else {
        stryCov_9fa48("6711");
        return stryMutAct_9fa48("6712") ? {} : (stryCov_9fa48("6712"), {
          state,
          intents: stryMutAct_9fa48("6713") ? ["Stryker was here"] : (stryCov_9fa48("6713"), []),
          actions: stryMutAct_9fa48("6714") ? [] : (stryCov_9fa48("6714"), [stryMutAct_9fa48("6715") ? {} : (stryCov_9fa48("6715"), {
            kind: canEmitDestinationProof(event.identityPresent) ? stryMutAct_9fa48("6716") ? "" : (stryCov_9fa48("6716"), "emit") : stryMutAct_9fa48("6717") ? "" : (stryCov_9fa48("6717"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("6718") ? {} : (stryCov_9fa48("6718"), {
      state,
      intents: stryMutAct_9fa48("6719") ? ["Stryker was here"] : (stryCov_9fa48("6719"), []),
      actions: stryMutAct_9fa48("6720") ? ["Stryker was here"] : (stryCov_9fa48("6720"), [])
    });
  }
}
export function shouldEmitDestinationProofNow(actions: ReadonlyArray<EmitDestinationProofAction>): boolean {
  if (stryMutAct_9fa48("6721")) {
    {}
  } else {
    stryCov_9fa48("6721");
    return stryMutAct_9fa48("6722") ? actions.every(action => action.kind === "emit") : (stryCov_9fa48("6722"), actions.some(stryMutAct_9fa48("6723") ? () => undefined : (stryCov_9fa48("6723"), action => stryMutAct_9fa48("6726") ? action.kind !== "emit" : stryMutAct_9fa48("6725") ? false : stryMutAct_9fa48("6724") ? true : (stryCov_9fa48("6724", "6725", "6726"), action.kind === (stryMutAct_9fa48("6727") ? "" : (stryCov_9fa48("6727"), "emit"))))));
  }
}
export function shouldSkipEmitDestinationProof(actions: ReadonlyArray<EmitDestinationProofAction>): boolean {
  if (stryMutAct_9fa48("6728")) {
    {}
  } else {
    stryCov_9fa48("6728");
    return stryMutAct_9fa48("6729") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("6729"), actions.some(stryMutAct_9fa48("6730") ? () => undefined : (stryCov_9fa48("6730"), action => stryMutAct_9fa48("6733") ? action.kind !== "skip" : stryMutAct_9fa48("6732") ? false : stryMutAct_9fa48("6731") ? true : (stryCov_9fa48("6731", "6732", "6733"), action.kind === (stryMutAct_9fa48("6734") ? "" : (stryCov_9fa48("6734"), "skip"))))));
  }
}

/**
 * Destination-proof plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationProof`
 * reads beside the step). Nested under {@link stepDestinationProofWithActions}.
 */
export type DestinationProofPlan = "prove" | "skip";
export type DestinationProofPlanState = Record<string, never>;
export type DestinationProofPlanEvent = Event | {
  readonly kind: "destination/proof-plan-gate";
  readonly strategy: number;
  readonly appWantsProof?: boolean;
};
export type DestinationProofPlanAction = {
  readonly kind: DestinationProofPlan;
};
export interface DestinationProofPlanStepResult {
  readonly state: DestinationProofPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationProofPlanAction[];
}
export function initialDestinationProofPlanState(): DestinationProofPlanState {
  if (stryMutAct_9fa48("6735")) {
    {}
  } else {
    stryCov_9fa48("6735");
    return {};
  }
}
export function stepDestinationProofPlanWithActions(state: DestinationProofPlanState, event: DestinationProofPlanEvent): DestinationProofPlanStepResult {
  if (stryMutAct_9fa48("6736")) {
    {}
  } else {
    stryCov_9fa48("6736");
    if (stryMutAct_9fa48("6739") ? event.kind !== "destination/proof-plan-gate" : stryMutAct_9fa48("6738") ? false : stryMutAct_9fa48("6737") ? true : (stryCov_9fa48("6737", "6738", "6739"), event.kind === (stryMutAct_9fa48("6740") ? "" : (stryCov_9fa48("6740"), "destination/proof-plan-gate")))) {
      if (stryMutAct_9fa48("6741")) {
        {}
      } else {
        stryCov_9fa48("6741");
        const prove = planDestinationProof(stryMutAct_9fa48("6742") ? {} : (stryCov_9fa48("6742"), {
          strategy: event.strategy,
          ...((stryMutAct_9fa48("6745") ? event.appWantsProof === undefined : stryMutAct_9fa48("6744") ? false : stryMutAct_9fa48("6743") ? true : (stryCov_9fa48("6743", "6744", "6745"), event.appWantsProof !== undefined)) ? stryMutAct_9fa48("6746") ? {} : (stryCov_9fa48("6746"), {
            appWantsProof: event.appWantsProof
          }) : {})
        }));
        return stryMutAct_9fa48("6747") ? {} : (stryCov_9fa48("6747"), {
          state,
          intents: stryMutAct_9fa48("6748") ? ["Stryker was here"] : (stryCov_9fa48("6748"), []),
          actions: stryMutAct_9fa48("6749") ? [] : (stryCov_9fa48("6749"), [stryMutAct_9fa48("6750") ? {} : (stryCov_9fa48("6750"), {
            kind: prove ? stryMutAct_9fa48("6751") ? "" : (stryCov_9fa48("6751"), "prove") : stryMutAct_9fa48("6752") ? "" : (stryCov_9fa48("6752"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("6753") ? {} : (stryCov_9fa48("6753"), {
      state,
      intents: stryMutAct_9fa48("6754") ? ["Stryker was here"] : (stryCov_9fa48("6754"), []),
      actions: stryMutAct_9fa48("6755") ? ["Stryker was here"] : (stryCov_9fa48("6755"), [])
    });
  }
}

/** Extract the destination-proof plan from actions; null when empty. */
export function destinationProofPlanFromActions(actions: ReadonlyArray<DestinationProofPlanAction>): DestinationProofPlan | null {
  if (stryMutAct_9fa48("6756")) {
    {}
  } else {
    stryCov_9fa48("6756");
    const action = actions.find(stryMutAct_9fa48("6757") ? () => undefined : (stryCov_9fa48("6757"), entry => stryMutAct_9fa48("6760") ? entry.kind === "prove" && entry.kind === "skip" : stryMutAct_9fa48("6759") ? false : stryMutAct_9fa48("6758") ? true : (stryCov_9fa48("6758", "6759", "6760"), (stryMutAct_9fa48("6762") ? entry.kind !== "prove" : stryMutAct_9fa48("6761") ? false : (stryCov_9fa48("6761", "6762"), entry.kind === (stryMutAct_9fa48("6763") ? "" : (stryCov_9fa48("6763"), "prove")))) || (stryMutAct_9fa48("6765") ? entry.kind !== "skip" : stryMutAct_9fa48("6764") ? false : (stryCov_9fa48("6764", "6765"), entry.kind === (stryMutAct_9fa48("6766") ? "" : (stryCov_9fa48("6766"), "skip")))))));
    return stryMutAct_9fa48("6767") ? action?.kind && null : (stryCov_9fa48("6767"), (stryMutAct_9fa48("6768") ? action.kind : (stryCov_9fa48("6768"), action?.kind)) ?? null);
  }
}
export function shouldProveDestinationPlan(actions: ReadonlyArray<DestinationProofPlanAction>): boolean {
  if (stryMutAct_9fa48("6769")) {
    {}
  } else {
    stryCov_9fa48("6769");
    return stryMutAct_9fa48("6770") ? actions.every(action => action.kind === "prove") : (stryCov_9fa48("6770"), actions.some(stryMutAct_9fa48("6771") ? () => undefined : (stryCov_9fa48("6771"), action => stryMutAct_9fa48("6774") ? action.kind !== "prove" : stryMutAct_9fa48("6773") ? false : stryMutAct_9fa48("6772") ? true : (stryCov_9fa48("6772", "6773", "6774"), action.kind === (stryMutAct_9fa48("6775") ? "" : (stryCov_9fa48("6775"), "prove"))))));
  }
}
export function shouldSkipDestinationProofPlan(actions: ReadonlyArray<DestinationProofPlanAction>): boolean {
  if (stryMutAct_9fa48("6776")) {
    {}
  } else {
    stryCov_9fa48("6776");
    return stryMutAct_9fa48("6777") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("6777"), actions.some(stryMutAct_9fa48("6778") ? () => undefined : (stryCov_9fa48("6778"), action => stryMutAct_9fa48("6781") ? action.kind !== "skip" : stryMutAct_9fa48("6780") ? false : stryMutAct_9fa48("6779") ? true : (stryCov_9fa48("6779", "6780", "6781"), action.kind === (stryMutAct_9fa48("6782") ? "" : (stryCov_9fa48("6782"), "skip"))))));
  }
}

/**
 * Destination proof gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationProof`
 * reads beside the step).
 * Plan nested via {@link stepDestinationProofPlanWithActions} (`prove`|`skip`).
 */
export type DestinationProofState = Record<string, never>;
export type DestinationProofEvent = Event | {
  readonly kind: "destination/proof-gate";
  readonly strategy: number;
  readonly appWantsProof?: boolean;
};
export type DestinationProofAction = {
  readonly kind: "prove";
} | {
  readonly kind: "skip";
};
export interface DestinationProofStepResult {
  readonly state: DestinationProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationProofAction[];
}
export function initialDestinationProofState(): DestinationProofState {
  if (stryMutAct_9fa48("6783")) {
    {}
  } else {
    stryCov_9fa48("6783");
    return {};
  }
}
export function stepDestinationProofWithActions(state: DestinationProofState, event: DestinationProofEvent): DestinationProofStepResult {
  if (stryMutAct_9fa48("6784")) {
    {}
  } else {
    stryCov_9fa48("6784");
    if (stryMutAct_9fa48("6787") ? event.kind !== "destination/proof-gate" : stryMutAct_9fa48("6786") ? false : stryMutAct_9fa48("6785") ? true : (stryCov_9fa48("6785", "6786", "6787"), event.kind === (stryMutAct_9fa48("6788") ? "" : (stryCov_9fa48("6788"), "destination/proof-gate")))) {
      if (stryMutAct_9fa48("6789")) {
        {}
      } else {
        stryCov_9fa48("6789");
        const planActions = stepDestinationProofPlanWithActions(initialDestinationProofPlanState(), stryMutAct_9fa48("6790") ? {} : (stryCov_9fa48("6790"), {
          kind: stryMutAct_9fa48("6791") ? "" : (stryCov_9fa48("6791"), "destination/proof-plan-gate"),
          strategy: event.strategy,
          ...((stryMutAct_9fa48("6794") ? event.appWantsProof === undefined : stryMutAct_9fa48("6793") ? false : stryMutAct_9fa48("6792") ? true : (stryCov_9fa48("6792", "6793", "6794"), event.appWantsProof !== undefined)) ? stryMutAct_9fa48("6795") ? {} : (stryCov_9fa48("6795"), {
            appWantsProof: event.appWantsProof
          }) : {})
        })).actions;
        const plan = destinationProofPlanFromActions(planActions);
        if (stryMutAct_9fa48("6798") ? plan !== null : stryMutAct_9fa48("6797") ? false : stryMutAct_9fa48("6796") ? true : (stryCov_9fa48("6796", "6797", "6798"), plan === null)) {
          if (stryMutAct_9fa48("6799")) {
            {}
          } else {
            stryCov_9fa48("6799");
            return stryMutAct_9fa48("6800") ? {} : (stryCov_9fa48("6800"), {
              state,
              intents: stryMutAct_9fa48("6801") ? ["Stryker was here"] : (stryCov_9fa48("6801"), []),
              actions: stryMutAct_9fa48("6802") ? ["Stryker was here"] : (stryCov_9fa48("6802"), [])
            });
          }
        }
        return stryMutAct_9fa48("6803") ? {} : (stryCov_9fa48("6803"), {
          state,
          intents: stryMutAct_9fa48("6804") ? ["Stryker was here"] : (stryCov_9fa48("6804"), []),
          actions: stryMutAct_9fa48("6805") ? [] : (stryCov_9fa48("6805"), [stryMutAct_9fa48("6806") ? {} : (stryCov_9fa48("6806"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("6807") ? {} : (stryCov_9fa48("6807"), {
      state,
      intents: stryMutAct_9fa48("6808") ? ["Stryker was here"] : (stryCov_9fa48("6808"), []),
      actions: stryMutAct_9fa48("6809") ? ["Stryker was here"] : (stryCov_9fa48("6809"), [])
    });
  }
}
export function shouldProveDestination(actions: ReadonlyArray<DestinationProofAction>): boolean {
  if (stryMutAct_9fa48("6810")) {
    {}
  } else {
    stryCov_9fa48("6810");
    return stryMutAct_9fa48("6811") ? actions.every(action => action.kind === "prove") : (stryCov_9fa48("6811"), actions.some(stryMutAct_9fa48("6812") ? () => undefined : (stryCov_9fa48("6812"), action => stryMutAct_9fa48("6815") ? action.kind !== "prove" : stryMutAct_9fa48("6814") ? false : stryMutAct_9fa48("6813") ? true : (stryCov_9fa48("6813", "6814", "6815"), action.kind === (stryMutAct_9fa48("6816") ? "" : (stryCov_9fa48("6816"), "prove"))))));
  }
}
export function shouldSkipDestinationProof(actions: ReadonlyArray<DestinationProofAction>): boolean {
  if (stryMutAct_9fa48("6817")) {
    {}
  } else {
    stryCov_9fa48("6817");
    return stryMutAct_9fa48("6818") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("6818"), actions.some(stryMutAct_9fa48("6819") ? () => undefined : (stryCov_9fa48("6819"), action => stryMutAct_9fa48("6822") ? action.kind !== "skip" : stryMutAct_9fa48("6821") ? false : stryMutAct_9fa48("6820") ? true : (stryCov_9fa48("6820", "6821", "6822"), action.kind === (stryMutAct_9fa48("6823") ? "" : (stryCov_9fa48("6823"), "skip"))))));
  }
}