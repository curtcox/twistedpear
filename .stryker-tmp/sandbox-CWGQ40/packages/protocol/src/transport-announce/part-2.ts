/** Extracted from transport-announce.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure transport announce / path-response / hop-clone field planning.
 * Packet construction and identity hashing stay at the adapter edge.
 * Announce ingress gate conclusions leave via machine actions (no ad-hoc
 * `planAnnounceIngressGates` reads beside the step). Hop-clone / transport
 * announce / path-response field conclusions leave via machine actions
 * (no ad-hoc `planClonePacketWithHops` / `planTransportAnnounceFields` /
 * `planPathResponseAnnounceFields` reads beside the step). Hop-clone /
 * transport-announce plans nest via
 * {@link stepClonePacketWithHopsPlanWithActions} /
 * {@link stepTransportAnnounceFieldsPlanWithActions} /
 * {@link stepPathResponseAnnounceFieldsPlanWithActions} (`use-fields`).
 * Announce ingress plan nested via
 * {@link stepAnnounceIngressGatesPlanWithActions} (`use-gates`).
 * Local-announce
 * ignore / handler dispatch / PATH_RESPONSE receive / aspect-filter match
 * conclusions leave via machine actions (no ad-hoc
 * `shouldIgnoreLocalAnnounce` / `canDispatchAnnounceHandlers` /
 * `shouldReceiveAnnouncePathResponse` / `shouldMatchAnnounceAspect` /
 * `shouldAcceptCachedPathResponsePacket` reads beside the step).
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
import { PACKET_CONTEXT_PATH_RESPONSE, PACKET_CONTEXT_NONE } from "../packet-context.js";
import { PACKET_HEADER_2, PACKET_TYPE_ANNOUNCE, type PacketHeaderFields } from "../packet-header.js";
import { TRANSPORT_TRANSPORT } from "../transport-framing.js";
import { pathResponseAnnounceFieldsPlanFromActions, planPathResponseAnnounceFields } from "./part-1.js";
import type { PathResponseAnnounceFieldsAction, PathResponseAnnounceFieldsEvent, PathResponseAnnounceFieldsPlanAction, PathResponseAnnounceFieldsPlanEvent } from "./part-1.js";
/**
 * Path-response announce field plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planPathResponseAnnounceFields` reads beside the step). Nested under
 * {@link stepPathResponseAnnounceFieldsWithActions}.
 */
export type PathResponseAnnounceFieldsPlanState = Record<string, never>;
export interface PathResponseAnnounceFieldsPlanStepResult {
  readonly state: PathResponseAnnounceFieldsPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathResponseAnnounceFieldsPlanAction[];
}
export function initialPathResponseAnnounceFieldsPlanState(): PathResponseAnnounceFieldsPlanState {
  if (stryMutAct_9fa48("33267")) {
    {}
  } else {
    stryCov_9fa48("33267");
    return {};
  }
}
export function stepPathResponseAnnounceFieldsPlanWithActions(state: PathResponseAnnounceFieldsPlanState, event: PathResponseAnnounceFieldsPlanEvent): PathResponseAnnounceFieldsPlanStepResult {
  if (stryMutAct_9fa48("33268")) {
    {}
  } else {
    stryCov_9fa48("33268");
    if (stryMutAct_9fa48("33271") ? event.kind !== "transport/path-response-announce-fields-plan-gate" : stryMutAct_9fa48("33270") ? false : stryMutAct_9fa48("33269") ? true : (stryCov_9fa48("33269", "33270", "33271"), event.kind === (stryMutAct_9fa48("33272") ? "" : (stryCov_9fa48("33272"), "transport/path-response-announce-fields-plan-gate")))) {
      if (stryMutAct_9fa48("33273")) {
        {}
      } else {
        stryCov_9fa48("33273");
        return stryMutAct_9fa48("33274") ? {} : (stryCov_9fa48("33274"), {
          state,
          intents: stryMutAct_9fa48("33275") ? ["Stryker was here"] : (stryCov_9fa48("33275"), []),
          actions: stryMutAct_9fa48("33276") ? [] : (stryCov_9fa48("33276"), [stryMutAct_9fa48("33277") ? {} : (stryCov_9fa48("33277"), {
            kind: stryMutAct_9fa48("33278") ? "" : (stryCov_9fa48("33278"), "use-fields"),
            fields: planPathResponseAnnounceFields(stryMutAct_9fa48("33279") ? {} : (stryCov_9fa48("33279"), {
              source: event.source,
              transportId: event.transportId,
              hops: event.hops
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("33280") ? {} : (stryCov_9fa48("33280"), {
      state,
      intents: stryMutAct_9fa48("33281") ? ["Stryker was here"] : (stryCov_9fa48("33281"), []),
      actions: stryMutAct_9fa48("33282") ? ["Stryker was here"] : (stryCov_9fa48("33282"), [])
    });
  }
}
export function shouldUsePathResponseAnnounceFieldsPlan(actions: ReadonlyArray<PathResponseAnnounceFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("33283")) {
    {}
  } else {
    stryCov_9fa48("33283");
    return stryMutAct_9fa48("33284") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("33284"), actions.some(stryMutAct_9fa48("33285") ? () => undefined : (stryCov_9fa48("33285"), action => stryMutAct_9fa48("33288") ? action.kind !== "use-fields" : stryMutAct_9fa48("33287") ? false : stryMutAct_9fa48("33286") ? true : (stryCov_9fa48("33286", "33287", "33288"), action.kind === (stryMutAct_9fa48("33289") ? "" : (stryCov_9fa48("33289"), "use-fields"))))));
  }
}

/**
 * Path-response announce field planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planPathResponseAnnounceFields` reads beside the step).
 * Plan nested via {@link stepPathResponseAnnounceFieldsPlanWithActions}
 * (`use-fields`).
 */
export type PathResponseAnnounceFieldsState = Record<string, never>;
export interface PathResponseAnnounceFieldsStepResult {
  readonly state: PathResponseAnnounceFieldsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathResponseAnnounceFieldsAction[];
}
export function initialPathResponseAnnounceFieldsState(): PathResponseAnnounceFieldsState {
  if (stryMutAct_9fa48("33290")) {
    {}
  } else {
    stryCov_9fa48("33290");
    return {};
  }
}
export function stepPathResponseAnnounceFieldsWithActions(state: PathResponseAnnounceFieldsState, event: PathResponseAnnounceFieldsEvent): PathResponseAnnounceFieldsStepResult {
  if (stryMutAct_9fa48("33291")) {
    {}
  } else {
    stryCov_9fa48("33291");
    if (stryMutAct_9fa48("33294") ? event.kind !== "transport/path-response-announce-fields-gate" : stryMutAct_9fa48("33293") ? false : stryMutAct_9fa48("33292") ? true : (stryCov_9fa48("33292", "33293", "33294"), event.kind === (stryMutAct_9fa48("33295") ? "" : (stryCov_9fa48("33295"), "transport/path-response-announce-fields-gate")))) {
      if (stryMutAct_9fa48("33296")) {
        {}
      } else {
        stryCov_9fa48("33296");
        const planActions = stepPathResponseAnnounceFieldsPlanWithActions(initialPathResponseAnnounceFieldsPlanState(), stryMutAct_9fa48("33297") ? {} : (stryCov_9fa48("33297"), {
          kind: stryMutAct_9fa48("33298") ? "" : (stryCov_9fa48("33298"), "transport/path-response-announce-fields-plan-gate"),
          source: event.source,
          transportId: event.transportId,
          hops: event.hops
        })).actions;
        const fields = pathResponseAnnounceFieldsPlanFromActions(planActions);
        if (stryMutAct_9fa48("33301") ? fields !== null : stryMutAct_9fa48("33300") ? false : stryMutAct_9fa48("33299") ? true : (stryCov_9fa48("33299", "33300", "33301"), fields === null)) {
          if (stryMutAct_9fa48("33302")) {
            {}
          } else {
            stryCov_9fa48("33302");
            return stryMutAct_9fa48("33303") ? {} : (stryCov_9fa48("33303"), {
              state,
              intents: stryMutAct_9fa48("33304") ? ["Stryker was here"] : (stryCov_9fa48("33304"), []),
              actions: stryMutAct_9fa48("33305") ? ["Stryker was here"] : (stryCov_9fa48("33305"), [])
            });
          }
        }
        return stryMutAct_9fa48("33306") ? {} : (stryCov_9fa48("33306"), {
          state,
          intents: stryMutAct_9fa48("33307") ? ["Stryker was here"] : (stryCov_9fa48("33307"), []),
          actions: stryMutAct_9fa48("33308") ? [] : (stryCov_9fa48("33308"), [stryMutAct_9fa48("33309") ? {} : (stryCov_9fa48("33309"), {
            kind: stryMutAct_9fa48("33310") ? "" : (stryCov_9fa48("33310"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("33311") ? {} : (stryCov_9fa48("33311"), {
      state,
      intents: stryMutAct_9fa48("33312") ? ["Stryker was here"] : (stryCov_9fa48("33312"), []),
      actions: stryMutAct_9fa48("33313") ? ["Stryker was here"] : (stryCov_9fa48("33313"), [])
    });
  }
}
export function shouldUsePathResponseAnnounceFields(actions: ReadonlyArray<PathResponseAnnounceFieldsAction>): boolean {
  if (stryMutAct_9fa48("33314")) {
    {}
  } else {
    stryCov_9fa48("33314");
    return stryMutAct_9fa48("33315") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("33315"), actions.some(stryMutAct_9fa48("33316") ? () => undefined : (stryCov_9fa48("33316"), action => stryMutAct_9fa48("33319") ? action.kind !== "use-fields" : stryMutAct_9fa48("33318") ? false : stryMutAct_9fa48("33317") ? true : (stryCov_9fa48("33317", "33318", "33319"), action.kind === (stryMutAct_9fa48("33320") ? "" : (stryCov_9fa48("33320"), "use-fields"))))));
  }
}

/** Extract path-response announce fields from step actions; null when no `use-fields`. */
export function pathResponseAnnounceFieldsFromActions(actions: ReadonlyArray<PathResponseAnnounceFieldsAction>): PacketHeaderFields | null {
  if (stryMutAct_9fa48("33321")) {
    {}
  } else {
    stryCov_9fa48("33321");
    const action = actions.find(stryMutAct_9fa48("33322") ? () => undefined : (stryCov_9fa48("33322"), entry => stryMutAct_9fa48("33325") ? entry.kind !== "use-fields" : stryMutAct_9fa48("33324") ? false : stryMutAct_9fa48("33323") ? true : (stryCov_9fa48("33323", "33324", "33325"), entry.kind === (stryMutAct_9fa48("33326") ? "" : (stryCov_9fa48("33326"), "use-fields")))));
    return (stryMutAct_9fa48("33329") ? action?.kind !== "use-fields" : stryMutAct_9fa48("33328") ? false : stryMutAct_9fa48("33327") ? true : (stryCov_9fa48("33327", "33328", "33329"), (stryMutAct_9fa48("33330") ? action.kind : (stryCov_9fa48("33330"), action?.kind)) === (stryMutAct_9fa48("33331") ? "" : (stryCov_9fa48("33331"), "use-fields")))) ? action.fields : null;
  }
}

/** Whether a cached path-response announce packet decoded successfully. */
export function shouldAcceptCachedPathResponsePacket(decodedOk: boolean): boolean {
  if (stryMutAct_9fa48("33332")) {
    {}
  } else {
    stryCov_9fa48("33332");
    return decodedOk;
  }
}

/**
 * shouldAcceptCachedPathResponsePacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptCachedPathResponsePacket` reads beside the step).
 */
export type AcceptCachedPathResponsePacketState = Record<string, never>;
export type AcceptCachedPathResponsePacketEvent = Event | {
  readonly kind: "path-response/accept-cached-packet-gate";
  readonly decodedOk: boolean;
};
export type AcceptCachedPathResponsePacketAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptCachedPathResponsePacketStepResult {
  readonly state: AcceptCachedPathResponsePacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptCachedPathResponsePacketAction[];
}
export function initialAcceptCachedPathResponsePacketState(): AcceptCachedPathResponsePacketState {
  if (stryMutAct_9fa48("33333")) {
    {}
  } else {
    stryCov_9fa48("33333");
    return {};
  }
}
export function stepAcceptCachedPathResponsePacketWithActions(state: AcceptCachedPathResponsePacketState, event: AcceptCachedPathResponsePacketEvent): AcceptCachedPathResponsePacketStepResult {
  if (stryMutAct_9fa48("33334")) {
    {}
  } else {
    stryCov_9fa48("33334");
    if (stryMutAct_9fa48("33337") ? event.kind !== "path-response/accept-cached-packet-gate" : stryMutAct_9fa48("33336") ? false : stryMutAct_9fa48("33335") ? true : (stryCov_9fa48("33335", "33336", "33337"), event.kind === (stryMutAct_9fa48("33338") ? "" : (stryCov_9fa48("33338"), "path-response/accept-cached-packet-gate")))) {
      if (stryMutAct_9fa48("33339")) {
        {}
      } else {
        stryCov_9fa48("33339");
        return stryMutAct_9fa48("33340") ? {} : (stryCov_9fa48("33340"), {
          state,
          intents: stryMutAct_9fa48("33341") ? ["Stryker was here"] : (stryCov_9fa48("33341"), []),
          actions: stryMutAct_9fa48("33342") ? [] : (stryCov_9fa48("33342"), [stryMutAct_9fa48("33343") ? {} : (stryCov_9fa48("33343"), {
            kind: shouldAcceptCachedPathResponsePacket(event.decodedOk) ? stryMutAct_9fa48("33344") ? "" : (stryCov_9fa48("33344"), "accept") : stryMutAct_9fa48("33345") ? "" : (stryCov_9fa48("33345"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("33346") ? {} : (stryCov_9fa48("33346"), {
      state,
      intents: stryMutAct_9fa48("33347") ? ["Stryker was here"] : (stryCov_9fa48("33347"), []),
      actions: stryMutAct_9fa48("33348") ? ["Stryker was here"] : (stryCov_9fa48("33348"), [])
    });
  }
}
export function shouldAcceptCachedPathResponsePacketNow(actions: ReadonlyArray<AcceptCachedPathResponsePacketAction>): boolean {
  if (stryMutAct_9fa48("33349")) {
    {}
  } else {
    stryCov_9fa48("33349");
    return stryMutAct_9fa48("33350") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("33350"), actions.some(stryMutAct_9fa48("33351") ? () => undefined : (stryCov_9fa48("33351"), action => stryMutAct_9fa48("33354") ? action.kind !== "accept" : stryMutAct_9fa48("33353") ? false : stryMutAct_9fa48("33352") ? true : (stryCov_9fa48("33352", "33353", "33354"), action.kind === (stryMutAct_9fa48("33355") ? "" : (stryCov_9fa48("33355"), "accept"))))));
  }
}
export function shouldSkipAcceptCachedPathResponsePacket(actions: ReadonlyArray<AcceptCachedPathResponsePacketAction>): boolean {
  if (stryMutAct_9fa48("33356")) {
    {}
  } else {
    stryCov_9fa48("33356");
    return stryMutAct_9fa48("33357") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("33357"), actions.some(stryMutAct_9fa48("33358") ? () => undefined : (stryCov_9fa48("33358"), action => stryMutAct_9fa48("33361") ? action.kind !== "skip" : stryMutAct_9fa48("33360") ? false : stryMutAct_9fa48("33359") ? true : (stryCov_9fa48("33359", "33360", "33361"), action.kind === (stryMutAct_9fa48("33362") ? "" : (stryCov_9fa48("33362"), "skip"))))));
  }
}

/**
 * Whether an announce handler should receive this packet given PATH_RESPONSE opt-in.
 * Non-path-response announces always pass; path responses require `receivePathResponses === true`.
 */
export function shouldReceiveAnnouncePathResponse(input: {
  readonly context: number;
  readonly receivePathResponses?: boolean;
}): boolean {
  if (stryMutAct_9fa48("33363")) {
    {}
  } else {
    stryCov_9fa48("33363");
    if (stryMutAct_9fa48("33366") ? input.context === PACKET_CONTEXT_PATH_RESPONSE : stryMutAct_9fa48("33365") ? false : stryMutAct_9fa48("33364") ? true : (stryCov_9fa48("33364", "33365", "33366"), input.context !== PACKET_CONTEXT_PATH_RESPONSE)) {
      if (stryMutAct_9fa48("33367")) {
        {}
      } else {
        stryCov_9fa48("33367");
        return stryMutAct_9fa48("33368") ? false : (stryCov_9fa48("33368"), true);
      }
    }
    return stryMutAct_9fa48("33371") ? input.receivePathResponses !== true : stryMutAct_9fa48("33370") ? false : stryMutAct_9fa48("33369") ? true : (stryCov_9fa48("33369", "33370", "33371"), input.receivePathResponses === (stryMutAct_9fa48("33372") ? false : (stryCov_9fa48("33372"), true)));
  }
}

/**
 * shouldReceiveAnnouncePathResponse gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldReceiveAnnouncePathResponse` reads beside the step).
 */
export type ReceiveAnnouncePathResponseState = Record<string, never>;
export type ReceiveAnnouncePathResponseEvent = Event | {
  readonly kind: "announce/receive-path-response-gate";
  readonly context: number;
  readonly receivePathResponses?: boolean;
};
export type ReceiveAnnouncePathResponseAction = {
  readonly kind: "receive";
} | {
  readonly kind: "skip";
};
export interface ReceiveAnnouncePathResponseStepResult {
  readonly state: ReceiveAnnouncePathResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReceiveAnnouncePathResponseAction[];
}
export function initialReceiveAnnouncePathResponseState(): ReceiveAnnouncePathResponseState {
  if (stryMutAct_9fa48("33373")) {
    {}
  } else {
    stryCov_9fa48("33373");
    return {};
  }
}
export function stepReceiveAnnouncePathResponseWithActions(state: ReceiveAnnouncePathResponseState, event: ReceiveAnnouncePathResponseEvent): ReceiveAnnouncePathResponseStepResult {
  if (stryMutAct_9fa48("33374")) {
    {}
  } else {
    stryCov_9fa48("33374");
    if (stryMutAct_9fa48("33377") ? event.kind !== "announce/receive-path-response-gate" : stryMutAct_9fa48("33376") ? false : stryMutAct_9fa48("33375") ? true : (stryCov_9fa48("33375", "33376", "33377"), event.kind === (stryMutAct_9fa48("33378") ? "" : (stryCov_9fa48("33378"), "announce/receive-path-response-gate")))) {
      if (stryMutAct_9fa48("33379")) {
        {}
      } else {
        stryCov_9fa48("33379");
        return stryMutAct_9fa48("33380") ? {} : (stryCov_9fa48("33380"), {
          state,
          intents: stryMutAct_9fa48("33381") ? ["Stryker was here"] : (stryCov_9fa48("33381"), []),
          actions: stryMutAct_9fa48("33382") ? [] : (stryCov_9fa48("33382"), [stryMutAct_9fa48("33383") ? {} : (stryCov_9fa48("33383"), {
            kind: shouldReceiveAnnouncePathResponse(stryMutAct_9fa48("33384") ? {} : (stryCov_9fa48("33384"), {
              context: event.context,
              ...((stryMutAct_9fa48("33387") ? event.receivePathResponses === undefined : stryMutAct_9fa48("33386") ? false : stryMutAct_9fa48("33385") ? true : (stryCov_9fa48("33385", "33386", "33387"), event.receivePathResponses !== undefined)) ? stryMutAct_9fa48("33388") ? {} : (stryCov_9fa48("33388"), {
                receivePathResponses: event.receivePathResponses
              }) : {})
            })) ? stryMutAct_9fa48("33389") ? "" : (stryCov_9fa48("33389"), "receive") : stryMutAct_9fa48("33390") ? "" : (stryCov_9fa48("33390"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("33391") ? {} : (stryCov_9fa48("33391"), {
      state,
      intents: stryMutAct_9fa48("33392") ? ["Stryker was here"] : (stryCov_9fa48("33392"), []),
      actions: stryMutAct_9fa48("33393") ? ["Stryker was here"] : (stryCov_9fa48("33393"), [])
    });
  }
}
export function shouldReceiveAnnouncePathResponseNow(actions: ReadonlyArray<ReceiveAnnouncePathResponseAction>): boolean {
  if (stryMutAct_9fa48("33394")) {
    {}
  } else {
    stryCov_9fa48("33394");
    return stryMutAct_9fa48("33395") ? actions.every(action => action.kind === "receive") : (stryCov_9fa48("33395"), actions.some(stryMutAct_9fa48("33396") ? () => undefined : (stryCov_9fa48("33396"), action => stryMutAct_9fa48("33399") ? action.kind !== "receive" : stryMutAct_9fa48("33398") ? false : stryMutAct_9fa48("33397") ? true : (stryCov_9fa48("33397", "33398", "33399"), action.kind === (stryMutAct_9fa48("33400") ? "" : (stryCov_9fa48("33400"), "receive"))))));
  }
}
export function shouldSkipAnnouncePathResponse(actions: ReadonlyArray<ReceiveAnnouncePathResponseAction>): boolean {
  if (stryMutAct_9fa48("33401")) {
    {}
  } else {
    stryCov_9fa48("33401");
    return stryMutAct_9fa48("33402") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("33402"), actions.some(stryMutAct_9fa48("33403") ? () => undefined : (stryCov_9fa48("33403"), action => stryMutAct_9fa48("33406") ? action.kind !== "skip" : stryMutAct_9fa48("33405") ? false : stryMutAct_9fa48("33404") ? true : (stryCov_9fa48("33404", "33405", "33406"), action.kind === (stryMutAct_9fa48("33407") ? "" : (stryCov_9fa48("33407"), "skip"))))));
  }
}

/** Drop announces that target a local IN destination (already ours). */
export function shouldIgnoreLocalAnnounce(hasLocalInboundDestination: boolean): boolean {
  if (stryMutAct_9fa48("33408")) {
    {}
  } else {
    stryCov_9fa48("33408");
    return hasLocalInboundDestination;
  }
}

/**
 * shouldIgnoreLocalAnnounce gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldIgnoreLocalAnnounce`
 * reads beside the step).
 */
export type IgnoreLocalAnnounceState = Record<string, never>;
export type IgnoreLocalAnnounceEvent = Event | {
  readonly kind: "announce/ignore-local-gate";
  readonly hasLocalInboundDestination: boolean;
};
export type IgnoreLocalAnnounceAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "proceed";
};
export interface IgnoreLocalAnnounceStepResult {
  readonly state: IgnoreLocalAnnounceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IgnoreLocalAnnounceAction[];
}
export function initialIgnoreLocalAnnounceState(): IgnoreLocalAnnounceState {
  if (stryMutAct_9fa48("33409")) {
    {}
  } else {
    stryCov_9fa48("33409");
    return {};
  }
}
export function stepIgnoreLocalAnnounceWithActions(state: IgnoreLocalAnnounceState, event: IgnoreLocalAnnounceEvent): IgnoreLocalAnnounceStepResult {
  if (stryMutAct_9fa48("33410")) {
    {}
  } else {
    stryCov_9fa48("33410");
    if (stryMutAct_9fa48("33413") ? event.kind !== "announce/ignore-local-gate" : stryMutAct_9fa48("33412") ? false : stryMutAct_9fa48("33411") ? true : (stryCov_9fa48("33411", "33412", "33413"), event.kind === (stryMutAct_9fa48("33414") ? "" : (stryCov_9fa48("33414"), "announce/ignore-local-gate")))) {
      if (stryMutAct_9fa48("33415")) {
        {}
      } else {
        stryCov_9fa48("33415");
        return stryMutAct_9fa48("33416") ? {} : (stryCov_9fa48("33416"), {
          state,
          intents: stryMutAct_9fa48("33417") ? ["Stryker was here"] : (stryCov_9fa48("33417"), []),
          actions: stryMutAct_9fa48("33418") ? [] : (stryCov_9fa48("33418"), [stryMutAct_9fa48("33419") ? {} : (stryCov_9fa48("33419"), {
            kind: shouldIgnoreLocalAnnounce(event.hasLocalInboundDestination) ? stryMutAct_9fa48("33420") ? "" : (stryCov_9fa48("33420"), "ignore") : stryMutAct_9fa48("33421") ? "" : (stryCov_9fa48("33421"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("33422") ? {} : (stryCov_9fa48("33422"), {
      state,
      intents: stryMutAct_9fa48("33423") ? ["Stryker was here"] : (stryCov_9fa48("33423"), []),
      actions: stryMutAct_9fa48("33424") ? ["Stryker was here"] : (stryCov_9fa48("33424"), [])
    });
  }
}
export function shouldIgnoreLocalAnnounceNow(actions: ReadonlyArray<IgnoreLocalAnnounceAction>): boolean {
  if (stryMutAct_9fa48("33425")) {
    {}
  } else {
    stryCov_9fa48("33425");
    return stryMutAct_9fa48("33426") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("33426"), actions.some(stryMutAct_9fa48("33427") ? () => undefined : (stryCov_9fa48("33427"), action => stryMutAct_9fa48("33430") ? action.kind !== "ignore" : stryMutAct_9fa48("33429") ? false : stryMutAct_9fa48("33428") ? true : (stryCov_9fa48("33428", "33429", "33430"), action.kind === (stryMutAct_9fa48("33431") ? "" : (stryCov_9fa48("33431"), "ignore"))))));
  }
}
export function shouldProceedLocalAnnounce(actions: ReadonlyArray<IgnoreLocalAnnounceAction>): boolean {
  if (stryMutAct_9fa48("33432")) {
    {}
  } else {
    stryCov_9fa48("33432");
    return stryMutAct_9fa48("33433") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("33433"), actions.some(stryMutAct_9fa48("33434") ? () => undefined : (stryCov_9fa48("33434"), action => stryMutAct_9fa48("33437") ? action.kind !== "proceed" : stryMutAct_9fa48("33436") ? false : stryMutAct_9fa48("33435") ? true : (stryCov_9fa48("33435", "33436", "33437"), action.kind === (stryMutAct_9fa48("33438") ? "" : (stryCov_9fa48("33438"), "proceed"))))));
  }
}

/** Whether announce-handler fanout may run after Identity.recall. */
export function canDispatchAnnounceHandlers(identityPresent: boolean): boolean {
  if (stryMutAct_9fa48("33439")) {
    {}
  } else {
    stryCov_9fa48("33439");
    return identityPresent;
  }
}

/**
 * canDispatchAnnounceHandlers gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canDispatchAnnounceHandlers`
 * reads beside the step).
 */
export type DispatchAnnounceHandlersState = Record<string, never>;
export type DispatchAnnounceHandlersEvent = Event | {
  readonly kind: "announce/dispatch-handlers-gate";
  readonly identityPresent: boolean;
};
export type DispatchAnnounceHandlersAction = {
  readonly kind: "dispatch";
} | {
  readonly kind: "skip";
};
export interface DispatchAnnounceHandlersStepResult {
  readonly state: DispatchAnnounceHandlersState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DispatchAnnounceHandlersAction[];
}
export function initialDispatchAnnounceHandlersState(): DispatchAnnounceHandlersState {
  if (stryMutAct_9fa48("33440")) {
    {}
  } else {
    stryCov_9fa48("33440");
    return {};
  }
}
export function stepDispatchAnnounceHandlersWithActions(state: DispatchAnnounceHandlersState, event: DispatchAnnounceHandlersEvent): DispatchAnnounceHandlersStepResult {
  if (stryMutAct_9fa48("33441")) {
    {}
  } else {
    stryCov_9fa48("33441");
    if (stryMutAct_9fa48("33444") ? event.kind !== "announce/dispatch-handlers-gate" : stryMutAct_9fa48("33443") ? false : stryMutAct_9fa48("33442") ? true : (stryCov_9fa48("33442", "33443", "33444"), event.kind === (stryMutAct_9fa48("33445") ? "" : (stryCov_9fa48("33445"), "announce/dispatch-handlers-gate")))) {
      if (stryMutAct_9fa48("33446")) {
        {}
      } else {
        stryCov_9fa48("33446");
        return stryMutAct_9fa48("33447") ? {} : (stryCov_9fa48("33447"), {
          state,
          intents: stryMutAct_9fa48("33448") ? ["Stryker was here"] : (stryCov_9fa48("33448"), []),
          actions: stryMutAct_9fa48("33449") ? [] : (stryCov_9fa48("33449"), [stryMutAct_9fa48("33450") ? {} : (stryCov_9fa48("33450"), {
            kind: canDispatchAnnounceHandlers(event.identityPresent) ? stryMutAct_9fa48("33451") ? "" : (stryCov_9fa48("33451"), "dispatch") : stryMutAct_9fa48("33452") ? "" : (stryCov_9fa48("33452"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("33453") ? {} : (stryCov_9fa48("33453"), {
      state,
      intents: stryMutAct_9fa48("33454") ? ["Stryker was here"] : (stryCov_9fa48("33454"), []),
      actions: stryMutAct_9fa48("33455") ? ["Stryker was here"] : (stryCov_9fa48("33455"), [])
    });
  }
}
export function shouldDispatchAnnounceHandlersNow(actions: ReadonlyArray<DispatchAnnounceHandlersAction>): boolean {
  if (stryMutAct_9fa48("33456")) {
    {}
  } else {
    stryCov_9fa48("33456");
    return stryMutAct_9fa48("33457") ? actions.every(action => action.kind === "dispatch") : (stryCov_9fa48("33457"), actions.some(stryMutAct_9fa48("33458") ? () => undefined : (stryCov_9fa48("33458"), action => stryMutAct_9fa48("33461") ? action.kind !== "dispatch" : stryMutAct_9fa48("33460") ? false : stryMutAct_9fa48("33459") ? true : (stryCov_9fa48("33459", "33460", "33461"), action.kind === (stryMutAct_9fa48("33462") ? "" : (stryCov_9fa48("33462"), "dispatch"))))));
  }
}
export function shouldSkipDispatchAnnounceHandlers(actions: ReadonlyArray<DispatchAnnounceHandlersAction>): boolean {
  if (stryMutAct_9fa48("33463")) {
    {}
  } else {
    stryCov_9fa48("33463");
    return stryMutAct_9fa48("33464") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("33464"), actions.some(stryMutAct_9fa48("33465") ? () => undefined : (stryCov_9fa48("33465"), action => stryMutAct_9fa48("33468") ? action.kind !== "skip" : stryMutAct_9fa48("33467") ? false : stryMutAct_9fa48("33466") ? true : (stryCov_9fa48("33466", "33467", "33468"), action.kind === (stryMutAct_9fa48("33469") ? "" : (stryCov_9fa48("33469"), "skip"))))));
  }
}

/**
 * Whether an announce handler's optional aspect filter matches the packet hash.
 * Filter parse / Destination.hash stay at the adapter edge as boolean inputs.
 */
export function shouldMatchAnnounceAspect(input: {
  readonly hasFilter: boolean;
  readonly filterParsed: boolean;
  readonly hashMatches: boolean;
}): boolean {
  if (stryMutAct_9fa48("33470")) {
    {}
  } else {
    stryCov_9fa48("33470");
    if (stryMutAct_9fa48("33473") ? false : stryMutAct_9fa48("33472") ? true : stryMutAct_9fa48("33471") ? input.hasFilter : (stryCov_9fa48("33471", "33472", "33473"), !input.hasFilter)) {
      if (stryMutAct_9fa48("33474")) {
        {}
      } else {
        stryCov_9fa48("33474");
        return stryMutAct_9fa48("33475") ? false : (stryCov_9fa48("33475"), true);
      }
    }
    return stryMutAct_9fa48("33478") ? input.filterParsed || input.hashMatches : stryMutAct_9fa48("33477") ? false : stryMutAct_9fa48("33476") ? true : (stryCov_9fa48("33476", "33477", "33478"), input.filterParsed && input.hashMatches);
  }
}

/**
 * shouldMatchAnnounceAspect gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldMatchAnnounceAspect`
 * reads beside the step).
 */
export type MatchAnnounceAspectState = Record<string, never>;
export type MatchAnnounceAspectEvent = Event | {
  readonly kind: "announce/match-aspect-gate";
  readonly hasFilter: boolean;
  readonly filterParsed: boolean;
  readonly hashMatches: boolean;
};
export type MatchAnnounceAspectAction = {
  readonly kind: "match";
} | {
  readonly kind: "mismatch";
};
export interface MatchAnnounceAspectStepResult {
  readonly state: MatchAnnounceAspectState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MatchAnnounceAspectAction[];
}
export function initialMatchAnnounceAspectState(): MatchAnnounceAspectState {
  if (stryMutAct_9fa48("33479")) {
    {}
  } else {
    stryCov_9fa48("33479");
    return {};
  }
}