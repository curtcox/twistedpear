/**
 * Pure link MTU→MDU conversion and hop-matching decisions.
 * Initiator/responder MTU selection and hops-match conclusions leave via
 * machine actions (no ad-hoc `planLinkInitiatorMtu` /
 * `planLinkRequestResponderMtu` / `linkHopsMatch` reads beside the step).
 * Initiator/responder MTU plans nested via
 * {@link stepLinkInitiatorMtuPlanWithActions} /
 * {@link stepLinkRequestResponderMtuPlanWithActions} (`use-mtu`).
 * MDU computation conclusions leave via machine actions (no ad-hoc
 * `computeLinkMdu` reads beside the step).
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
export const LINK_MDU_HEADER_MAX = 18;
export const LINK_MDU_IFAC_MIN = 0;
export const LINK_MDU_TOKEN_OVERHEAD = 48;
export const LINK_MDU_BLOCK_SIZE = 16;
export function computeLinkMdu(mtu: number): number {
  if (stryMutAct_9fa48("15704")) {
    {}
  } else {
    stryCov_9fa48("15704");
    return stryMutAct_9fa48("15705") ? Math.floor((mtu - LINK_MDU_IFAC_MIN - LINK_MDU_HEADER_MAX - LINK_MDU_TOKEN_OVERHEAD) / LINK_MDU_BLOCK_SIZE) * LINK_MDU_BLOCK_SIZE + 1 : (stryCov_9fa48("15705"), (stryMutAct_9fa48("15706") ? Math.floor((mtu - LINK_MDU_IFAC_MIN - LINK_MDU_HEADER_MAX - LINK_MDU_TOKEN_OVERHEAD) / LINK_MDU_BLOCK_SIZE) / LINK_MDU_BLOCK_SIZE : (stryCov_9fa48("15706"), Math.floor(stryMutAct_9fa48("15707") ? (mtu - LINK_MDU_IFAC_MIN - LINK_MDU_HEADER_MAX - LINK_MDU_TOKEN_OVERHEAD) * LINK_MDU_BLOCK_SIZE : (stryCov_9fa48("15707"), (stryMutAct_9fa48("15708") ? mtu - LINK_MDU_IFAC_MIN - LINK_MDU_HEADER_MAX + LINK_MDU_TOKEN_OVERHEAD : (stryCov_9fa48("15708"), (stryMutAct_9fa48("15709") ? mtu - LINK_MDU_IFAC_MIN + LINK_MDU_HEADER_MAX : (stryCov_9fa48("15709"), (stryMutAct_9fa48("15710") ? mtu + LINK_MDU_IFAC_MIN : (stryCov_9fa48("15710"), mtu - LINK_MDU_IFAC_MIN)) - LINK_MDU_HEADER_MAX)) - LINK_MDU_TOKEN_OVERHEAD)) / LINK_MDU_BLOCK_SIZE)) * LINK_MDU_BLOCK_SIZE)) - 1);
  }
}

/**
 * Link MDU computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeLinkMdu`
 * reads beside the step).
 */
export type ComputeLinkMduState = Record<string, never>;
export type ComputeLinkMduEvent = Event | {
  readonly kind: "link/mdu-gate";
  readonly mtu: number;
};
export type ComputeLinkMduAction = {
  readonly kind: "use-mdu";
  readonly mdu: number;
};
export interface ComputeLinkMduStepResult {
  readonly state: ComputeLinkMduState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeLinkMduAction[];
}
export function initialComputeLinkMduState(): ComputeLinkMduState {
  if (stryMutAct_9fa48("15711")) {
    {}
  } else {
    stryCov_9fa48("15711");
    return {};
  }
}
export function stepComputeLinkMduWithActions(state: ComputeLinkMduState, event: ComputeLinkMduEvent): ComputeLinkMduStepResult {
  if (stryMutAct_9fa48("15712")) {
    {}
  } else {
    stryCov_9fa48("15712");
    if (stryMutAct_9fa48("15715") ? event.kind !== "link/mdu-gate" : stryMutAct_9fa48("15714") ? false : stryMutAct_9fa48("15713") ? true : (stryCov_9fa48("15713", "15714", "15715"), event.kind === (stryMutAct_9fa48("15716") ? "" : (stryCov_9fa48("15716"), "link/mdu-gate")))) {
      if (stryMutAct_9fa48("15717")) {
        {}
      } else {
        stryCov_9fa48("15717");
        return stryMutAct_9fa48("15718") ? {} : (stryCov_9fa48("15718"), {
          state,
          intents: stryMutAct_9fa48("15719") ? ["Stryker was here"] : (stryCov_9fa48("15719"), []),
          actions: stryMutAct_9fa48("15720") ? [] : (stryCov_9fa48("15720"), [stryMutAct_9fa48("15721") ? {} : (stryCov_9fa48("15721"), {
            kind: stryMutAct_9fa48("15722") ? "" : (stryCov_9fa48("15722"), "use-mdu"),
            mdu: computeLinkMdu(event.mtu)
          })])
        });
      }
    }
    return stryMutAct_9fa48("15723") ? {} : (stryCov_9fa48("15723"), {
      state,
      intents: stryMutAct_9fa48("15724") ? ["Stryker was here"] : (stryCov_9fa48("15724"), []),
      actions: stryMutAct_9fa48("15725") ? ["Stryker was here"] : (stryCov_9fa48("15725"), [])
    });
  }
}
export function shouldUseLinkMdu(actions: ReadonlyArray<ComputeLinkMduAction>): boolean {
  if (stryMutAct_9fa48("15726")) {
    {}
  } else {
    stryCov_9fa48("15726");
    return stryMutAct_9fa48("15727") ? actions.every(action => action.kind === "use-mdu") : (stryCov_9fa48("15727"), actions.some(stryMutAct_9fa48("15728") ? () => undefined : (stryCov_9fa48("15728"), action => stryMutAct_9fa48("15731") ? action.kind !== "use-mdu" : stryMutAct_9fa48("15730") ? false : stryMutAct_9fa48("15729") ? true : (stryCov_9fa48("15729", "15730", "15731"), action.kind === (stryMutAct_9fa48("15732") ? "" : (stryCov_9fa48("15732"), "use-mdu"))))));
  }
}

/** Extract MDU from step actions; null when no `use-mdu`. */
export function linkMduFromActions(actions: ReadonlyArray<ComputeLinkMduAction>): number | null {
  if (stryMutAct_9fa48("15733")) {
    {}
  } else {
    stryCov_9fa48("15733");
    const action = actions.find(stryMutAct_9fa48("15734") ? () => undefined : (stryCov_9fa48("15734"), entry => stryMutAct_9fa48("15737") ? entry.kind !== "use-mdu" : stryMutAct_9fa48("15736") ? false : stryMutAct_9fa48("15735") ? true : (stryCov_9fa48("15735", "15736", "15737"), entry.kind === (stryMutAct_9fa48("15738") ? "" : (stryCov_9fa48("15738"), "use-mdu")))));
    return (stryMutAct_9fa48("15741") ? action?.kind !== "use-mdu" : stryMutAct_9fa48("15740") ? false : stryMutAct_9fa48("15739") ? true : (stryCov_9fa48("15739", "15740", "15741"), (stryMutAct_9fa48("15742") ? action.kind : (stryCov_9fa48("15742"), action?.kind)) === (stryMutAct_9fa48("15743") ? "" : (stryCov_9fa48("15743"), "use-mdu")))) ? action.mdu : null;
  }
}

/** Whether a packed payload fits within the link (or outlet) MDU. */
export function linkPayloadFitsMdu(packedLength: number, mdu: number): boolean {
  if (stryMutAct_9fa48("15744")) {
    {}
  } else {
    stryCov_9fa48("15744");
    return stryMutAct_9fa48("15748") ? packedLength > mdu : stryMutAct_9fa48("15747") ? packedLength < mdu : stryMutAct_9fa48("15746") ? false : stryMutAct_9fa48("15745") ? true : (stryCov_9fa48("15745", "15746", "15747", "15748"), packedLength <= mdu);
  }
}

/** Initiator MTU selection (optional next-hop discovery vs default). */
export function planLinkInitiatorMtu(input: {
  readonly discoveryEnabled: boolean;
  readonly nextHopMtu: number | null;
  readonly defaultMtu: number;
}): number {
  if (stryMutAct_9fa48("15749")) {
    {}
  } else {
    stryCov_9fa48("15749");
    if (stryMutAct_9fa48("15752") ? input.discoveryEnabled || input.nextHopMtu !== null : stryMutAct_9fa48("15751") ? false : stryMutAct_9fa48("15750") ? true : (stryCov_9fa48("15750", "15751", "15752"), input.discoveryEnabled && (stryMutAct_9fa48("15754") ? input.nextHopMtu === null : stryMutAct_9fa48("15753") ? true : (stryCov_9fa48("15753", "15754"), input.nextHopMtu !== null)))) {
      if (stryMutAct_9fa48("15755")) {
        {}
      } else {
        stryCov_9fa48("15755");
        return input.nextHopMtu;
      }
    }
    return input.defaultMtu;
  }
}

/**
 * Link initiator MTU plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkInitiatorMtu`
 * reads beside the step). Nested under {@link stepLinkInitiatorMtuWithActions}.
 */
export type LinkInitiatorMtuPlanState = Record<string, never>;
export type LinkInitiatorMtuPlanEvent = Event | {
  readonly kind: "link/initiator-mtu-plan-gate";
  readonly discoveryEnabled: boolean;
  readonly nextHopMtu: number | null;
  readonly defaultMtu: number;
};
export type LinkInitiatorMtuPlanAction = {
  readonly kind: "use-mtu";
  readonly mtu: number;
};
export interface LinkInitiatorMtuPlanStepResult {
  readonly state: LinkInitiatorMtuPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkInitiatorMtuPlanAction[];
}
export function initialLinkInitiatorMtuPlanState(): LinkInitiatorMtuPlanState {
  if (stryMutAct_9fa48("15756")) {
    {}
  } else {
    stryCov_9fa48("15756");
    return {};
  }
}
export function stepLinkInitiatorMtuPlanWithActions(state: LinkInitiatorMtuPlanState, event: LinkInitiatorMtuPlanEvent): LinkInitiatorMtuPlanStepResult {
  if (stryMutAct_9fa48("15757")) {
    {}
  } else {
    stryCov_9fa48("15757");
    if (stryMutAct_9fa48("15760") ? event.kind !== "link/initiator-mtu-plan-gate" : stryMutAct_9fa48("15759") ? false : stryMutAct_9fa48("15758") ? true : (stryCov_9fa48("15758", "15759", "15760"), event.kind === (stryMutAct_9fa48("15761") ? "" : (stryCov_9fa48("15761"), "link/initiator-mtu-plan-gate")))) {
      if (stryMutAct_9fa48("15762")) {
        {}
      } else {
        stryCov_9fa48("15762");
        return stryMutAct_9fa48("15763") ? {} : (stryCov_9fa48("15763"), {
          state,
          intents: stryMutAct_9fa48("15764") ? ["Stryker was here"] : (stryCov_9fa48("15764"), []),
          actions: stryMutAct_9fa48("15765") ? [] : (stryCov_9fa48("15765"), [stryMutAct_9fa48("15766") ? {} : (stryCov_9fa48("15766"), {
            kind: stryMutAct_9fa48("15767") ? "" : (stryCov_9fa48("15767"), "use-mtu"),
            mtu: planLinkInitiatorMtu(stryMutAct_9fa48("15768") ? {} : (stryCov_9fa48("15768"), {
              discoveryEnabled: event.discoveryEnabled,
              nextHopMtu: event.nextHopMtu,
              defaultMtu: event.defaultMtu
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("15769") ? {} : (stryCov_9fa48("15769"), {
      state,
      intents: stryMutAct_9fa48("15770") ? ["Stryker was here"] : (stryCov_9fa48("15770"), []),
      actions: stryMutAct_9fa48("15771") ? ["Stryker was here"] : (stryCov_9fa48("15771"), [])
    });
  }
}

/** Extract initiator MTU from plan actions; null when no `use-mtu` action. */
export function linkInitiatorMtuPlanFromActions(actions: ReadonlyArray<LinkInitiatorMtuPlanAction>): number | null {
  if (stryMutAct_9fa48("15772")) {
    {}
  } else {
    stryCov_9fa48("15772");
    const action = actions.find(stryMutAct_9fa48("15773") ? () => undefined : (stryCov_9fa48("15773"), entry => stryMutAct_9fa48("15776") ? entry.kind !== "use-mtu" : stryMutAct_9fa48("15775") ? false : stryMutAct_9fa48("15774") ? true : (stryCov_9fa48("15774", "15775", "15776"), entry.kind === (stryMutAct_9fa48("15777") ? "" : (stryCov_9fa48("15777"), "use-mtu")))));
    return (stryMutAct_9fa48("15780") ? action?.kind !== "use-mtu" : stryMutAct_9fa48("15779") ? false : stryMutAct_9fa48("15778") ? true : (stryCov_9fa48("15778", "15779", "15780"), (stryMutAct_9fa48("15781") ? action.kind : (stryCov_9fa48("15781"), action?.kind)) === (stryMutAct_9fa48("15782") ? "" : (stryCov_9fa48("15782"), "use-mtu")))) ? action.mtu : null;
  }
}
export function shouldUseLinkInitiatorMtuPlan(actions: ReadonlyArray<LinkInitiatorMtuPlanAction>): boolean {
  if (stryMutAct_9fa48("15783")) {
    {}
  } else {
    stryCov_9fa48("15783");
    return stryMutAct_9fa48("15784") ? actions.every(action => action.kind === "use-mtu") : (stryCov_9fa48("15784"), actions.some(stryMutAct_9fa48("15785") ? () => undefined : (stryCov_9fa48("15785"), action => stryMutAct_9fa48("15788") ? action.kind !== "use-mtu" : stryMutAct_9fa48("15787") ? false : stryMutAct_9fa48("15786") ? true : (stryCov_9fa48("15786", "15787", "15788"), action.kind === (stryMutAct_9fa48("15789") ? "" : (stryCov_9fa48("15789"), "use-mtu"))))));
  }
}

/**
 * Responder MTU from LINKREQUEST signalling (keep current when absent).
 * `signallingMtu` is pre-parsed via {@link mtuFromLinkRequestData} at the edge.
 */
export function planLinkRequestResponderMtu(input: {
  readonly signallingPresent: boolean;
  readonly signallingMtu: number | null;
  readonly currentMtu: number;
  readonly defaultMtu: number;
}): number {
  if (stryMutAct_9fa48("15790")) {
    {}
  } else {
    stryCov_9fa48("15790");
    if (stryMutAct_9fa48("15793") ? false : stryMutAct_9fa48("15792") ? true : stryMutAct_9fa48("15791") ? input.signallingPresent : (stryCov_9fa48("15791", "15792", "15793"), !input.signallingPresent)) {
      if (stryMutAct_9fa48("15794")) {
        {}
      } else {
        stryCov_9fa48("15794");
        return input.currentMtu;
      }
    }
    return stryMutAct_9fa48("15795") ? input.signallingMtu && input.defaultMtu : (stryCov_9fa48("15795"), input.signallingMtu ?? input.defaultMtu);
  }
}

/**
 * Link responder MTU plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRequestResponderMtu`
 * reads beside the step). Nested under
 * {@link stepLinkRequestResponderMtuWithActions}.
 */
export type LinkRequestResponderMtuPlanState = Record<string, never>;
export type LinkRequestResponderMtuPlanEvent = Event | {
  readonly kind: "link/request-responder-mtu-plan-gate";
  readonly signallingPresent: boolean;
  readonly signallingMtu: number | null;
  readonly currentMtu: number;
  readonly defaultMtu: number;
};
export type LinkRequestResponderMtuPlanAction = {
  readonly kind: "use-mtu";
  readonly mtu: number;
};
export interface LinkRequestResponderMtuPlanStepResult {
  readonly state: LinkRequestResponderMtuPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRequestResponderMtuPlanAction[];
}
export function initialLinkRequestResponderMtuPlanState(): LinkRequestResponderMtuPlanState {
  if (stryMutAct_9fa48("15796")) {
    {}
  } else {
    stryCov_9fa48("15796");
    return {};
  }
}
export function stepLinkRequestResponderMtuPlanWithActions(state: LinkRequestResponderMtuPlanState, event: LinkRequestResponderMtuPlanEvent): LinkRequestResponderMtuPlanStepResult {
  if (stryMutAct_9fa48("15797")) {
    {}
  } else {
    stryCov_9fa48("15797");
    if (stryMutAct_9fa48("15800") ? event.kind !== "link/request-responder-mtu-plan-gate" : stryMutAct_9fa48("15799") ? false : stryMutAct_9fa48("15798") ? true : (stryCov_9fa48("15798", "15799", "15800"), event.kind === (stryMutAct_9fa48("15801") ? "" : (stryCov_9fa48("15801"), "link/request-responder-mtu-plan-gate")))) {
      if (stryMutAct_9fa48("15802")) {
        {}
      } else {
        stryCov_9fa48("15802");
        return stryMutAct_9fa48("15803") ? {} : (stryCov_9fa48("15803"), {
          state,
          intents: stryMutAct_9fa48("15804") ? ["Stryker was here"] : (stryCov_9fa48("15804"), []),
          actions: stryMutAct_9fa48("15805") ? [] : (stryCov_9fa48("15805"), [stryMutAct_9fa48("15806") ? {} : (stryCov_9fa48("15806"), {
            kind: stryMutAct_9fa48("15807") ? "" : (stryCov_9fa48("15807"), "use-mtu"),
            mtu: planLinkRequestResponderMtu(stryMutAct_9fa48("15808") ? {} : (stryCov_9fa48("15808"), {
              signallingPresent: event.signallingPresent,
              signallingMtu: event.signallingMtu,
              currentMtu: event.currentMtu,
              defaultMtu: event.defaultMtu
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("15809") ? {} : (stryCov_9fa48("15809"), {
      state,
      intents: stryMutAct_9fa48("15810") ? ["Stryker was here"] : (stryCov_9fa48("15810"), []),
      actions: stryMutAct_9fa48("15811") ? ["Stryker was here"] : (stryCov_9fa48("15811"), [])
    });
  }
}

/** Extract responder MTU from plan actions; null when no `use-mtu` action. */
export function linkRequestResponderMtuPlanFromActions(actions: ReadonlyArray<LinkRequestResponderMtuPlanAction>): number | null {
  if (stryMutAct_9fa48("15812")) {
    {}
  } else {
    stryCov_9fa48("15812");
    const action = actions.find(stryMutAct_9fa48("15813") ? () => undefined : (stryCov_9fa48("15813"), entry => stryMutAct_9fa48("15816") ? entry.kind !== "use-mtu" : stryMutAct_9fa48("15815") ? false : stryMutAct_9fa48("15814") ? true : (stryCov_9fa48("15814", "15815", "15816"), entry.kind === (stryMutAct_9fa48("15817") ? "" : (stryCov_9fa48("15817"), "use-mtu")))));
    return (stryMutAct_9fa48("15820") ? action?.kind !== "use-mtu" : stryMutAct_9fa48("15819") ? false : stryMutAct_9fa48("15818") ? true : (stryCov_9fa48("15818", "15819", "15820"), (stryMutAct_9fa48("15821") ? action.kind : (stryCov_9fa48("15821"), action?.kind)) === (stryMutAct_9fa48("15822") ? "" : (stryCov_9fa48("15822"), "use-mtu")))) ? action.mtu : null;
  }
}
export function shouldUseLinkRequestResponderMtuPlan(actions: ReadonlyArray<LinkRequestResponderMtuPlanAction>): boolean {
  if (stryMutAct_9fa48("15823")) {
    {}
  } else {
    stryCov_9fa48("15823");
    return stryMutAct_9fa48("15824") ? actions.every(action => action.kind === "use-mtu") : (stryCov_9fa48("15824"), actions.some(stryMutAct_9fa48("15825") ? () => undefined : (stryCov_9fa48("15825"), action => stryMutAct_9fa48("15828") ? action.kind !== "use-mtu" : stryMutAct_9fa48("15827") ? false : stryMutAct_9fa48("15826") ? true : (stryCov_9fa48("15826", "15827", "15828"), action.kind === (stryMutAct_9fa48("15829") ? "" : (stryCov_9fa48("15829"), "use-mtu"))))));
  }
}
export function linkHopsMatch(input: {
  readonly expectedHops: number | null;
  readonly packetHops: number;
  readonly pathfinderMaxHops: number;
}): boolean {
  if (stryMutAct_9fa48("15830")) {
    {}
  } else {
    stryCov_9fa48("15830");
    if (stryMutAct_9fa48("15833") ? input.expectedHops !== null : stryMutAct_9fa48("15832") ? false : stryMutAct_9fa48("15831") ? true : (stryCov_9fa48("15831", "15832", "15833"), input.expectedHops === null)) {
      if (stryMutAct_9fa48("15834")) {
        {}
      } else {
        stryCov_9fa48("15834");
        return stryMutAct_9fa48("15835") ? false : (stryCov_9fa48("15835"), true);
      }
    }
    return stryMutAct_9fa48("15838") ? input.packetHops === input.expectedHops && input.expectedHops === input.pathfinderMaxHops : stryMutAct_9fa48("15837") ? false : stryMutAct_9fa48("15836") ? true : (stryCov_9fa48("15836", "15837", "15838"), (stryMutAct_9fa48("15840") ? input.packetHops !== input.expectedHops : stryMutAct_9fa48("15839") ? false : (stryCov_9fa48("15839", "15840"), input.packetHops === input.expectedHops)) || (stryMutAct_9fa48("15842") ? input.expectedHops !== input.pathfinderMaxHops : stryMutAct_9fa48("15841") ? false : (stryCov_9fa48("15841", "15842"), input.expectedHops === input.pathfinderMaxHops)));
  }
}

/**
 * Link hops-match is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `linkHopsMatch` reads
 * beside the step).
 */
export type LinkHopsMatchState = Record<string, never>;
export type LinkHopsMatchEvent = Event | {
  readonly kind: "link/hops-match-gate";
  readonly expectedHops: number | null;
  readonly packetHops: number;
  readonly pathfinderMaxHops: number;
};
export type LinkHopsMatchAction = {
  readonly kind: "match";
} | {
  readonly kind: "mismatch";
};
export interface LinkHopsMatchStepResult {
  readonly state: LinkHopsMatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkHopsMatchAction[];
}
export function initialLinkHopsMatchState(): LinkHopsMatchState {
  if (stryMutAct_9fa48("15843")) {
    {}
  } else {
    stryCov_9fa48("15843");
    return {};
  }
}
export function stepLinkHopsMatchWithActions(state: LinkHopsMatchState, event: LinkHopsMatchEvent): LinkHopsMatchStepResult {
  if (stryMutAct_9fa48("15844")) {
    {}
  } else {
    stryCov_9fa48("15844");
    if (stryMutAct_9fa48("15847") ? event.kind !== "link/hops-match-gate" : stryMutAct_9fa48("15846") ? false : stryMutAct_9fa48("15845") ? true : (stryCov_9fa48("15845", "15846", "15847"), event.kind === (stryMutAct_9fa48("15848") ? "" : (stryCov_9fa48("15848"), "link/hops-match-gate")))) {
      if (stryMutAct_9fa48("15849")) {
        {}
      } else {
        stryCov_9fa48("15849");
        return stryMutAct_9fa48("15850") ? {} : (stryCov_9fa48("15850"), {
          state,
          intents: stryMutAct_9fa48("15851") ? ["Stryker was here"] : (stryCov_9fa48("15851"), []),
          actions: stryMutAct_9fa48("15852") ? [] : (stryCov_9fa48("15852"), [stryMutAct_9fa48("15853") ? {} : (stryCov_9fa48("15853"), {
            kind: linkHopsMatch(stryMutAct_9fa48("15854") ? {} : (stryCov_9fa48("15854"), {
              expectedHops: event.expectedHops,
              packetHops: event.packetHops,
              pathfinderMaxHops: event.pathfinderMaxHops
            })) ? stryMutAct_9fa48("15855") ? "" : (stryCov_9fa48("15855"), "match") : stryMutAct_9fa48("15856") ? "" : (stryCov_9fa48("15856"), "mismatch")
          })])
        });
      }
    }
    return stryMutAct_9fa48("15857") ? {} : (stryCov_9fa48("15857"), {
      state,
      intents: stryMutAct_9fa48("15858") ? ["Stryker was here"] : (stryCov_9fa48("15858"), []),
      actions: stryMutAct_9fa48("15859") ? ["Stryker was here"] : (stryCov_9fa48("15859"), [])
    });
  }
}
export function shouldMatchLinkHops(actions: ReadonlyArray<LinkHopsMatchAction>): boolean {
  if (stryMutAct_9fa48("15860")) {
    {}
  } else {
    stryCov_9fa48("15860");
    return stryMutAct_9fa48("15861") ? actions.every(action => action.kind === "match") : (stryCov_9fa48("15861"), actions.some(stryMutAct_9fa48("15862") ? () => undefined : (stryCov_9fa48("15862"), action => stryMutAct_9fa48("15865") ? action.kind !== "match" : stryMutAct_9fa48("15864") ? false : stryMutAct_9fa48("15863") ? true : (stryCov_9fa48("15863", "15864", "15865"), action.kind === (stryMutAct_9fa48("15866") ? "" : (stryCov_9fa48("15866"), "match"))))));
  }
}
export function shouldMismatchLinkHops(actions: ReadonlyArray<LinkHopsMatchAction>): boolean {
  if (stryMutAct_9fa48("15867")) {
    {}
  } else {
    stryCov_9fa48("15867");
    return stryMutAct_9fa48("15868") ? actions.every(action => action.kind === "mismatch") : (stryCov_9fa48("15868"), actions.some(stryMutAct_9fa48("15869") ? () => undefined : (stryCov_9fa48("15869"), action => stryMutAct_9fa48("15872") ? action.kind !== "mismatch" : stryMutAct_9fa48("15871") ? false : stryMutAct_9fa48("15870") ? true : (stryCov_9fa48("15870", "15871", "15872"), action.kind === (stryMutAct_9fa48("15873") ? "" : (stryCov_9fa48("15873"), "mismatch"))))));
  }
}

/**
 * Link initiator MTU selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkInitiatorMtu`
 * reads beside the step).
 * Plan nested via {@link stepLinkInitiatorMtuPlanWithActions} (`use-mtu`).
 */
export type LinkInitiatorMtuState = Record<string, never>;
export type LinkInitiatorMtuEvent = Event | {
  readonly kind: "link/initiator-mtu-gate";
  readonly discoveryEnabled: boolean;
  readonly nextHopMtu: number | null;
  readonly defaultMtu: number;
};
export type LinkInitiatorMtuAction = {
  readonly kind: "use-mtu";
  readonly mtu: number;
};
export interface LinkInitiatorMtuStepResult {
  readonly state: LinkInitiatorMtuState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkInitiatorMtuAction[];
}
export function initialLinkInitiatorMtuState(): LinkInitiatorMtuState {
  if (stryMutAct_9fa48("15874")) {
    {}
  } else {
    stryCov_9fa48("15874");
    return {};
  }
}
export function stepLinkInitiatorMtuWithActions(state: LinkInitiatorMtuState, event: LinkInitiatorMtuEvent): LinkInitiatorMtuStepResult {
  if (stryMutAct_9fa48("15875")) {
    {}
  } else {
    stryCov_9fa48("15875");
    if (stryMutAct_9fa48("15878") ? event.kind !== "link/initiator-mtu-gate" : stryMutAct_9fa48("15877") ? false : stryMutAct_9fa48("15876") ? true : (stryCov_9fa48("15876", "15877", "15878"), event.kind === (stryMutAct_9fa48("15879") ? "" : (stryCov_9fa48("15879"), "link/initiator-mtu-gate")))) {
      if (stryMutAct_9fa48("15880")) {
        {}
      } else {
        stryCov_9fa48("15880");
        const planActions = stepLinkInitiatorMtuPlanWithActions(initialLinkInitiatorMtuPlanState(), stryMutAct_9fa48("15881") ? {} : (stryCov_9fa48("15881"), {
          kind: stryMutAct_9fa48("15882") ? "" : (stryCov_9fa48("15882"), "link/initiator-mtu-plan-gate"),
          discoveryEnabled: event.discoveryEnabled,
          nextHopMtu: event.nextHopMtu,
          defaultMtu: event.defaultMtu
        })).actions;
        const mtu = linkInitiatorMtuPlanFromActions(planActions);
        if (stryMutAct_9fa48("15885") ? mtu !== null : stryMutAct_9fa48("15884") ? false : stryMutAct_9fa48("15883") ? true : (stryCov_9fa48("15883", "15884", "15885"), mtu === null)) {
          if (stryMutAct_9fa48("15886")) {
            {}
          } else {
            stryCov_9fa48("15886");
            return stryMutAct_9fa48("15887") ? {} : (stryCov_9fa48("15887"), {
              state,
              intents: stryMutAct_9fa48("15888") ? ["Stryker was here"] : (stryCov_9fa48("15888"), []),
              actions: stryMutAct_9fa48("15889") ? ["Stryker was here"] : (stryCov_9fa48("15889"), [])
            });
          }
        }
        return stryMutAct_9fa48("15890") ? {} : (stryCov_9fa48("15890"), {
          state,
          intents: stryMutAct_9fa48("15891") ? ["Stryker was here"] : (stryCov_9fa48("15891"), []),
          actions: stryMutAct_9fa48("15892") ? [] : (stryCov_9fa48("15892"), [stryMutAct_9fa48("15893") ? {} : (stryCov_9fa48("15893"), {
            kind: stryMutAct_9fa48("15894") ? "" : (stryCov_9fa48("15894"), "use-mtu"),
            mtu
          })])
        });
      }
    }
    return stryMutAct_9fa48("15895") ? {} : (stryCov_9fa48("15895"), {
      state,
      intents: stryMutAct_9fa48("15896") ? ["Stryker was here"] : (stryCov_9fa48("15896"), []),
      actions: stryMutAct_9fa48("15897") ? ["Stryker was here"] : (stryCov_9fa48("15897"), [])
    });
  }
}

/** Extract initiator MTU from step actions; null when no `use-mtu` action. */
export function linkInitiatorMtuFromActions(actions: ReadonlyArray<LinkInitiatorMtuAction>): number | null {
  if (stryMutAct_9fa48("15898")) {
    {}
  } else {
    stryCov_9fa48("15898");
    const action = actions.find(stryMutAct_9fa48("15899") ? () => undefined : (stryCov_9fa48("15899"), entry => stryMutAct_9fa48("15902") ? entry.kind !== "use-mtu" : stryMutAct_9fa48("15901") ? false : stryMutAct_9fa48("15900") ? true : (stryCov_9fa48("15900", "15901", "15902"), entry.kind === (stryMutAct_9fa48("15903") ? "" : (stryCov_9fa48("15903"), "use-mtu")))));
    return (stryMutAct_9fa48("15906") ? action?.kind !== "use-mtu" : stryMutAct_9fa48("15905") ? false : stryMutAct_9fa48("15904") ? true : (stryCov_9fa48("15904", "15905", "15906"), (stryMutAct_9fa48("15907") ? action.kind : (stryCov_9fa48("15907"), action?.kind)) === (stryMutAct_9fa48("15908") ? "" : (stryCov_9fa48("15908"), "use-mtu")))) ? action.mtu : null;
  }
}
export function shouldUseLinkInitiatorMtu(actions: ReadonlyArray<LinkInitiatorMtuAction>): boolean {
  if (stryMutAct_9fa48("15909")) {
    {}
  } else {
    stryCov_9fa48("15909");
    return stryMutAct_9fa48("15910") ? actions.every(action => action.kind === "use-mtu") : (stryCov_9fa48("15910"), actions.some(stryMutAct_9fa48("15911") ? () => undefined : (stryCov_9fa48("15911"), action => stryMutAct_9fa48("15914") ? action.kind !== "use-mtu" : stryMutAct_9fa48("15913") ? false : stryMutAct_9fa48("15912") ? true : (stryCov_9fa48("15912", "15913", "15914"), action.kind === (stryMutAct_9fa48("15915") ? "" : (stryCov_9fa48("15915"), "use-mtu"))))));
  }
}

/**
 * Link responder MTU selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRequestResponderMtu`
 * reads beside the step).
 * Plan nested via {@link stepLinkRequestResponderMtuPlanWithActions} (`use-mtu`).
 */
export type LinkRequestResponderMtuState = Record<string, never>;
export type LinkRequestResponderMtuEvent = Event | {
  readonly kind: "link/request-responder-mtu-gate";
  readonly signallingPresent: boolean;
  readonly signallingMtu: number | null;
  readonly currentMtu: number;
  readonly defaultMtu: number;
};
export type LinkRequestResponderMtuAction = {
  readonly kind: "use-mtu";
  readonly mtu: number;
};
export interface LinkRequestResponderMtuStepResult {
  readonly state: LinkRequestResponderMtuState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRequestResponderMtuAction[];
}
export function initialLinkRequestResponderMtuState(): LinkRequestResponderMtuState {
  if (stryMutAct_9fa48("15916")) {
    {}
  } else {
    stryCov_9fa48("15916");
    return {};
  }
}
export function stepLinkRequestResponderMtuWithActions(state: LinkRequestResponderMtuState, event: LinkRequestResponderMtuEvent): LinkRequestResponderMtuStepResult {
  if (stryMutAct_9fa48("15917")) {
    {}
  } else {
    stryCov_9fa48("15917");
    if (stryMutAct_9fa48("15920") ? event.kind !== "link/request-responder-mtu-gate" : stryMutAct_9fa48("15919") ? false : stryMutAct_9fa48("15918") ? true : (stryCov_9fa48("15918", "15919", "15920"), event.kind === (stryMutAct_9fa48("15921") ? "" : (stryCov_9fa48("15921"), "link/request-responder-mtu-gate")))) {
      if (stryMutAct_9fa48("15922")) {
        {}
      } else {
        stryCov_9fa48("15922");
        const planActions = stepLinkRequestResponderMtuPlanWithActions(initialLinkRequestResponderMtuPlanState(), stryMutAct_9fa48("15923") ? {} : (stryCov_9fa48("15923"), {
          kind: stryMutAct_9fa48("15924") ? "" : (stryCov_9fa48("15924"), "link/request-responder-mtu-plan-gate"),
          signallingPresent: event.signallingPresent,
          signallingMtu: event.signallingMtu,
          currentMtu: event.currentMtu,
          defaultMtu: event.defaultMtu
        })).actions;
        const mtu = linkRequestResponderMtuPlanFromActions(planActions);
        if (stryMutAct_9fa48("15927") ? mtu !== null : stryMutAct_9fa48("15926") ? false : stryMutAct_9fa48("15925") ? true : (stryCov_9fa48("15925", "15926", "15927"), mtu === null)) {
          if (stryMutAct_9fa48("15928")) {
            {}
          } else {
            stryCov_9fa48("15928");
            return stryMutAct_9fa48("15929") ? {} : (stryCov_9fa48("15929"), {
              state,
              intents: stryMutAct_9fa48("15930") ? ["Stryker was here"] : (stryCov_9fa48("15930"), []),
              actions: stryMutAct_9fa48("15931") ? ["Stryker was here"] : (stryCov_9fa48("15931"), [])
            });
          }
        }
        return stryMutAct_9fa48("15932") ? {} : (stryCov_9fa48("15932"), {
          state,
          intents: stryMutAct_9fa48("15933") ? ["Stryker was here"] : (stryCov_9fa48("15933"), []),
          actions: stryMutAct_9fa48("15934") ? [] : (stryCov_9fa48("15934"), [stryMutAct_9fa48("15935") ? {} : (stryCov_9fa48("15935"), {
            kind: stryMutAct_9fa48("15936") ? "" : (stryCov_9fa48("15936"), "use-mtu"),
            mtu
          })])
        });
      }
    }
    return stryMutAct_9fa48("15937") ? {} : (stryCov_9fa48("15937"), {
      state,
      intents: stryMutAct_9fa48("15938") ? ["Stryker was here"] : (stryCov_9fa48("15938"), []),
      actions: stryMutAct_9fa48("15939") ? ["Stryker was here"] : (stryCov_9fa48("15939"), [])
    });
  }
}

/** Extract responder MTU from step actions; null when no `use-mtu` action. */
export function linkRequestResponderMtuFromActions(actions: ReadonlyArray<LinkRequestResponderMtuAction>): number | null {
  if (stryMutAct_9fa48("15940")) {
    {}
  } else {
    stryCov_9fa48("15940");
    const action = actions.find(stryMutAct_9fa48("15941") ? () => undefined : (stryCov_9fa48("15941"), entry => stryMutAct_9fa48("15944") ? entry.kind !== "use-mtu" : stryMutAct_9fa48("15943") ? false : stryMutAct_9fa48("15942") ? true : (stryCov_9fa48("15942", "15943", "15944"), entry.kind === (stryMutAct_9fa48("15945") ? "" : (stryCov_9fa48("15945"), "use-mtu")))));
    return (stryMutAct_9fa48("15948") ? action?.kind !== "use-mtu" : stryMutAct_9fa48("15947") ? false : stryMutAct_9fa48("15946") ? true : (stryCov_9fa48("15946", "15947", "15948"), (stryMutAct_9fa48("15949") ? action.kind : (stryCov_9fa48("15949"), action?.kind)) === (stryMutAct_9fa48("15950") ? "" : (stryCov_9fa48("15950"), "use-mtu")))) ? action.mtu : null;
  }
}
export function shouldUseLinkRequestResponderMtu(actions: ReadonlyArray<LinkRequestResponderMtuAction>): boolean {
  if (stryMutAct_9fa48("15951")) {
    {}
  } else {
    stryCov_9fa48("15951");
    return stryMutAct_9fa48("15952") ? actions.every(action => action.kind === "use-mtu") : (stryCov_9fa48("15952"), actions.some(stryMutAct_9fa48("15953") ? () => undefined : (stryCov_9fa48("15953"), action => stryMutAct_9fa48("15956") ? action.kind !== "use-mtu" : stryMutAct_9fa48("15955") ? false : stryMutAct_9fa48("15954") ? true : (stryCov_9fa48("15954", "15955", "15956"), action.kind === (stryMutAct_9fa48("15957") ? "" : (stryCov_9fa48("15957"), "use-mtu"))))));
  }
}