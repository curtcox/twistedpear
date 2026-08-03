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
import { shouldMatchAnnounceAspect } from "./part-2.js";
import type { MatchAnnounceAspectAction, MatchAnnounceAspectEvent, MatchAnnounceAspectState, MatchAnnounceAspectStepResult } from "./part-2.js";
export function stepMatchAnnounceAspectWithActions(state: MatchAnnounceAspectState, event: MatchAnnounceAspectEvent): MatchAnnounceAspectStepResult {
  if (stryMutAct_9fa48("33480")) {
    {}
  } else {
    stryCov_9fa48("33480");
    if (stryMutAct_9fa48("33483") ? event.kind !== "announce/match-aspect-gate" : stryMutAct_9fa48("33482") ? false : stryMutAct_9fa48("33481") ? true : (stryCov_9fa48("33481", "33482", "33483"), event.kind === (stryMutAct_9fa48("33484") ? "" : (stryCov_9fa48("33484"), "announce/match-aspect-gate")))) {
      if (stryMutAct_9fa48("33485")) {
        {}
      } else {
        stryCov_9fa48("33485");
        return stryMutAct_9fa48("33486") ? {} : (stryCov_9fa48("33486"), {
          state,
          intents: stryMutAct_9fa48("33487") ? ["Stryker was here"] : (stryCov_9fa48("33487"), []),
          actions: stryMutAct_9fa48("33488") ? [] : (stryCov_9fa48("33488"), [stryMutAct_9fa48("33489") ? {} : (stryCov_9fa48("33489"), {
            kind: shouldMatchAnnounceAspect(stryMutAct_9fa48("33490") ? {} : (stryCov_9fa48("33490"), {
              hasFilter: event.hasFilter,
              filterParsed: event.filterParsed,
              hashMatches: event.hashMatches
            })) ? stryMutAct_9fa48("33491") ? "" : (stryCov_9fa48("33491"), "match") : stryMutAct_9fa48("33492") ? "" : (stryCov_9fa48("33492"), "mismatch")
          })])
        });
      }
    }
    return stryMutAct_9fa48("33493") ? {} : (stryCov_9fa48("33493"), {
      state,
      intents: stryMutAct_9fa48("33494") ? ["Stryker was here"] : (stryCov_9fa48("33494"), []),
      actions: stryMutAct_9fa48("33495") ? ["Stryker was here"] : (stryCov_9fa48("33495"), [])
    });
  }
}
export function shouldMatchAnnounceAspectNow(actions: ReadonlyArray<MatchAnnounceAspectAction>): boolean {
  if (stryMutAct_9fa48("33496")) {
    {}
  } else {
    stryCov_9fa48("33496");
    return stryMutAct_9fa48("33497") ? actions.every(action => action.kind === "match") : (stryCov_9fa48("33497"), actions.some(stryMutAct_9fa48("33498") ? () => undefined : (stryCov_9fa48("33498"), action => stryMutAct_9fa48("33501") ? action.kind !== "match" : stryMutAct_9fa48("33500") ? false : stryMutAct_9fa48("33499") ? true : (stryCov_9fa48("33499", "33500", "33501"), action.kind === (stryMutAct_9fa48("33502") ? "" : (stryCov_9fa48("33502"), "match"))))));
  }
}
export function shouldMismatchAnnounceAspect(actions: ReadonlyArray<MatchAnnounceAspectAction>): boolean {
  if (stryMutAct_9fa48("33503")) {
    {}
  } else {
    stryCov_9fa48("33503");
    return stryMutAct_9fa48("33504") ? actions.every(action => action.kind === "mismatch") : (stryCov_9fa48("33504"), actions.some(stryMutAct_9fa48("33505") ? () => undefined : (stryCov_9fa48("33505"), action => stryMutAct_9fa48("33508") ? action.kind !== "mismatch" : stryMutAct_9fa48("33507") ? false : stryMutAct_9fa48("33506") ? true : (stryCov_9fa48("33506", "33507", "33508"), action.kind === (stryMutAct_9fa48("33509") ? "" : (stryCov_9fa48("33509"), "mismatch"))))));
  }
}
export interface AnnounceIngressGates {
  readonly applyRateLimit: boolean;
  readonly recordRate: boolean;
  readonly rebroadcast: boolean;
}

/**
 * PATH_RESPONSE announces skip rate-limit / rate-record / rebroadcast.
 * Non-path-response announces enable all three.
 */
export function planAnnounceIngressGates(context: number): AnnounceIngressGates {
  if (stryMutAct_9fa48("33510")) {
    {}
  } else {
    stryCov_9fa48("33510");
    const allow = stryMutAct_9fa48("33513") ? context === PACKET_CONTEXT_PATH_RESPONSE : stryMutAct_9fa48("33512") ? false : stryMutAct_9fa48("33511") ? true : (stryCov_9fa48("33511", "33512", "33513"), context !== PACKET_CONTEXT_PATH_RESPONSE);
    return stryMutAct_9fa48("33514") ? {} : (stryCov_9fa48("33514"), {
      applyRateLimit: allow,
      recordRate: allow,
      rebroadcast: allow
    });
  }
}

/**
 * Announce ingress gates plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planAnnounceIngressGates`
 * reads beside the step). Nested under {@link stepAnnounceIngressGatesWithActions}.
 */
export type AnnounceIngressGatesPlanState = Record<string, never>;
export type AnnounceIngressGatesPlanEvent = Event | {
  readonly kind: "announce/ingress-gates-plan-gate";
  readonly context: number;
};
export type AnnounceIngressGatesPlanAction = {
  readonly kind: "use-gates";
  readonly applyRateLimit: boolean;
  readonly recordRate: boolean;
  readonly rebroadcast: boolean;
};
export interface AnnounceIngressGatesPlanStepResult {
  readonly state: AnnounceIngressGatesPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceIngressGatesPlanAction[];
}
export function initialAnnounceIngressGatesPlanState(): AnnounceIngressGatesPlanState {
  if (stryMutAct_9fa48("33515")) {
    {}
  } else {
    stryCov_9fa48("33515");
    return {};
  }
}
export function stepAnnounceIngressGatesPlanWithActions(state: AnnounceIngressGatesPlanState, event: AnnounceIngressGatesPlanEvent): AnnounceIngressGatesPlanStepResult {
  if (stryMutAct_9fa48("33516")) {
    {}
  } else {
    stryCov_9fa48("33516");
    if (stryMutAct_9fa48("33519") ? event.kind !== "announce/ingress-gates-plan-gate" : stryMutAct_9fa48("33518") ? false : stryMutAct_9fa48("33517") ? true : (stryCov_9fa48("33517", "33518", "33519"), event.kind === (stryMutAct_9fa48("33520") ? "" : (stryCov_9fa48("33520"), "announce/ingress-gates-plan-gate")))) {
      if (stryMutAct_9fa48("33521")) {
        {}
      } else {
        stryCov_9fa48("33521");
        const gates = planAnnounceIngressGates(event.context);
        return stryMutAct_9fa48("33522") ? {} : (stryCov_9fa48("33522"), {
          state,
          intents: stryMutAct_9fa48("33523") ? ["Stryker was here"] : (stryCov_9fa48("33523"), []),
          actions: stryMutAct_9fa48("33524") ? [] : (stryCov_9fa48("33524"), [stryMutAct_9fa48("33525") ? {} : (stryCov_9fa48("33525"), {
            kind: stryMutAct_9fa48("33526") ? "" : (stryCov_9fa48("33526"), "use-gates"),
            applyRateLimit: gates.applyRateLimit,
            recordRate: gates.recordRate,
            rebroadcast: gates.rebroadcast
          })])
        });
      }
    }
    return stryMutAct_9fa48("33527") ? {} : (stryCov_9fa48("33527"), {
      state,
      intents: stryMutAct_9fa48("33528") ? ["Stryker was here"] : (stryCov_9fa48("33528"), []),
      actions: stryMutAct_9fa48("33529") ? ["Stryker was here"] : (stryCov_9fa48("33529"), [])
    });
  }
}
export function shouldUseAnnounceIngressGatesPlan(actions: ReadonlyArray<AnnounceIngressGatesPlanAction>): boolean {
  if (stryMutAct_9fa48("33530")) {
    {}
  } else {
    stryCov_9fa48("33530");
    return stryMutAct_9fa48("33531") ? actions.every(action => action.kind === "use-gates") : (stryCov_9fa48("33531"), actions.some(stryMutAct_9fa48("33532") ? () => undefined : (stryCov_9fa48("33532"), action => stryMutAct_9fa48("33535") ? action.kind !== "use-gates" : stryMutAct_9fa48("33534") ? false : stryMutAct_9fa48("33533") ? true : (stryCov_9fa48("33533", "33534", "33535"), action.kind === (stryMutAct_9fa48("33536") ? "" : (stryCov_9fa48("33536"), "use-gates"))))));
  }
}

/** Extract announce ingress gates from plan actions; null when no `use-gates`. */
export function announceIngressGatesPlanFromActions(actions: ReadonlyArray<AnnounceIngressGatesPlanAction>): AnnounceIngressGates | null {
  if (stryMutAct_9fa48("33537")) {
    {}
  } else {
    stryCov_9fa48("33537");
    const action = actions.find(stryMutAct_9fa48("33538") ? () => undefined : (stryCov_9fa48("33538"), entry => stryMutAct_9fa48("33541") ? entry.kind !== "use-gates" : stryMutAct_9fa48("33540") ? false : stryMutAct_9fa48("33539") ? true : (stryCov_9fa48("33539", "33540", "33541"), entry.kind === (stryMutAct_9fa48("33542") ? "" : (stryCov_9fa48("33542"), "use-gates")))));
    return (stryMutAct_9fa48("33545") ? action?.kind !== "use-gates" : stryMutAct_9fa48("33544") ? false : stryMutAct_9fa48("33543") ? true : (stryCov_9fa48("33543", "33544", "33545"), (stryMutAct_9fa48("33546") ? action.kind : (stryCov_9fa48("33546"), action?.kind)) === (stryMutAct_9fa48("33547") ? "" : (stryCov_9fa48("33547"), "use-gates")))) ? stryMutAct_9fa48("33548") ? {} : (stryCov_9fa48("33548"), {
      applyRateLimit: action.applyRateLimit,
      recordRate: action.recordRate,
      rebroadcast: action.rebroadcast
    }) : null;
  }
}

/**
 * Announce ingress gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepAnnounceIngressGatesPlanWithActions} (`use-gates`).
 */
export type AnnounceIngressGatesState = Record<string, never>;
export type AnnounceIngressGatesEvent = Event | {
  readonly kind: "announce/ingress-gates";
  readonly context: number;
};
export type AnnounceIngressGatesAction = {
  readonly kind: "apply-rate-limit";
} | {
  readonly kind: "record-rate";
} | {
  readonly kind: "rebroadcast";
};
export interface AnnounceIngressGatesStepResult {
  readonly state: AnnounceIngressGatesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceIngressGatesAction[];
}
export function initialAnnounceIngressGatesState(): AnnounceIngressGatesState {
  if (stryMutAct_9fa48("33549")) {
    {}
  } else {
    stryCov_9fa48("33549");
    return {};
  }
}
export const stepAnnounceIngressGates: StepFn<AnnounceIngressGatesState> = (state, event) => {
  if (stryMutAct_9fa48("33550")) {
    {}
  } else {
    stryCov_9fa48("33550");
    const result = stepAnnounceIngressGatesInner(state, event as AnnounceIngressGatesEvent);
    return stryMutAct_9fa48("33551") ? {} : (stryCov_9fa48("33551"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepAnnounceIngressGatesWithActions(state: AnnounceIngressGatesState, event: AnnounceIngressGatesEvent): AnnounceIngressGatesStepResult {
  if (stryMutAct_9fa48("33552")) {
    {}
  } else {
    stryCov_9fa48("33552");
    return stepAnnounceIngressGatesInner(state, event);
  }
}
export function shouldApplyAnnounceRateLimit(actions: ReadonlyArray<AnnounceIngressGatesAction>): boolean {
  if (stryMutAct_9fa48("33553")) {
    {}
  } else {
    stryCov_9fa48("33553");
    return stryMutAct_9fa48("33554") ? actions.every(action => action.kind === "apply-rate-limit") : (stryCov_9fa48("33554"), actions.some(stryMutAct_9fa48("33555") ? () => undefined : (stryCov_9fa48("33555"), action => stryMutAct_9fa48("33558") ? action.kind !== "apply-rate-limit" : stryMutAct_9fa48("33557") ? false : stryMutAct_9fa48("33556") ? true : (stryCov_9fa48("33556", "33557", "33558"), action.kind === (stryMutAct_9fa48("33559") ? "" : (stryCov_9fa48("33559"), "apply-rate-limit"))))));
  }
}
export function shouldRecordAnnounceRate(actions: ReadonlyArray<AnnounceIngressGatesAction>): boolean {
  if (stryMutAct_9fa48("33560")) {
    {}
  } else {
    stryCov_9fa48("33560");
    return stryMutAct_9fa48("33561") ? actions.every(action => action.kind === "record-rate") : (stryCov_9fa48("33561"), actions.some(stryMutAct_9fa48("33562") ? () => undefined : (stryCov_9fa48("33562"), action => stryMutAct_9fa48("33565") ? action.kind !== "record-rate" : stryMutAct_9fa48("33564") ? false : stryMutAct_9fa48("33563") ? true : (stryCov_9fa48("33563", "33564", "33565"), action.kind === (stryMutAct_9fa48("33566") ? "" : (stryCov_9fa48("33566"), "record-rate"))))));
  }
}
export function shouldRebroadcastAnnounce(actions: ReadonlyArray<AnnounceIngressGatesAction>): boolean {
  if (stryMutAct_9fa48("33567")) {
    {}
  } else {
    stryCov_9fa48("33567");
    return stryMutAct_9fa48("33568") ? actions.every(action => action.kind === "rebroadcast") : (stryCov_9fa48("33568"), actions.some(stryMutAct_9fa48("33569") ? () => undefined : (stryCov_9fa48("33569"), action => stryMutAct_9fa48("33572") ? action.kind !== "rebroadcast" : stryMutAct_9fa48("33571") ? false : stryMutAct_9fa48("33570") ? true : (stryCov_9fa48("33570", "33571", "33572"), action.kind === (stryMutAct_9fa48("33573") ? "" : (stryCov_9fa48("33573"), "rebroadcast"))))));
  }
}
function stepAnnounceIngressGatesInner(state: AnnounceIngressGatesState, event: AnnounceIngressGatesEvent): AnnounceIngressGatesStepResult {
  if (stryMutAct_9fa48("33574")) {
    {}
  } else {
    stryCov_9fa48("33574");
    if (stryMutAct_9fa48("33577") ? event.kind !== "announce/ingress-gates" : stryMutAct_9fa48("33576") ? false : stryMutAct_9fa48("33575") ? true : (stryCov_9fa48("33575", "33576", "33577"), event.kind === (stryMutAct_9fa48("33578") ? "" : (stryCov_9fa48("33578"), "announce/ingress-gates")))) {
      if (stryMutAct_9fa48("33579")) {
        {}
      } else {
        stryCov_9fa48("33579");
        const planActions = stepAnnounceIngressGatesPlanWithActions(initialAnnounceIngressGatesPlanState(), stryMutAct_9fa48("33580") ? {} : (stryCov_9fa48("33580"), {
          kind: stryMutAct_9fa48("33581") ? "" : (stryCov_9fa48("33581"), "announce/ingress-gates-plan-gate"),
          context: event.context
        })).actions;
        const plan = announceIngressGatesPlanFromActions(planActions);
        if (stryMutAct_9fa48("33584") ? plan !== null : stryMutAct_9fa48("33583") ? false : stryMutAct_9fa48("33582") ? true : (stryCov_9fa48("33582", "33583", "33584"), plan === null)) {
          if (stryMutAct_9fa48("33585")) {
            {}
          } else {
            stryCov_9fa48("33585");
            return stryMutAct_9fa48("33586") ? {} : (stryCov_9fa48("33586"), {
              state,
              intents: stryMutAct_9fa48("33587") ? ["Stryker was here"] : (stryCov_9fa48("33587"), []),
              actions: stryMutAct_9fa48("33588") ? ["Stryker was here"] : (stryCov_9fa48("33588"), [])
            });
          }
        }
        const actions: AnnounceIngressGatesAction[] = stryMutAct_9fa48("33589") ? ["Stryker was here"] : (stryCov_9fa48("33589"), []);
        if (stryMutAct_9fa48("33591") ? false : stryMutAct_9fa48("33590") ? true : (stryCov_9fa48("33590", "33591"), plan.applyRateLimit)) {
          if (stryMutAct_9fa48("33592")) {
            {}
          } else {
            stryCov_9fa48("33592");
            actions.push(stryMutAct_9fa48("33593") ? {} : (stryCov_9fa48("33593"), {
              kind: stryMutAct_9fa48("33594") ? "" : (stryCov_9fa48("33594"), "apply-rate-limit")
            }));
          }
        }
        if (stryMutAct_9fa48("33596") ? false : stryMutAct_9fa48("33595") ? true : (stryCov_9fa48("33595", "33596"), plan.recordRate)) {
          if (stryMutAct_9fa48("33597")) {
            {}
          } else {
            stryCov_9fa48("33597");
            actions.push(stryMutAct_9fa48("33598") ? {} : (stryCov_9fa48("33598"), {
              kind: stryMutAct_9fa48("33599") ? "" : (stryCov_9fa48("33599"), "record-rate")
            }));
          }
        }
        if (stryMutAct_9fa48("33601") ? false : stryMutAct_9fa48("33600") ? true : (stryCov_9fa48("33600", "33601"), plan.rebroadcast)) {
          if (stryMutAct_9fa48("33602")) {
            {}
          } else {
            stryCov_9fa48("33602");
            actions.push(stryMutAct_9fa48("33603") ? {} : (stryCov_9fa48("33603"), {
              kind: stryMutAct_9fa48("33604") ? "" : (stryCov_9fa48("33604"), "rebroadcast")
            }));
          }
        }
        return stryMutAct_9fa48("33605") ? {} : (stryCov_9fa48("33605"), {
          state,
          intents: stryMutAct_9fa48("33606") ? ["Stryker was here"] : (stryCov_9fa48("33606"), []),
          actions
        });
      }
    }
    return stryMutAct_9fa48("33607") ? {} : (stryCov_9fa48("33607"), {
      state,
      intents: stryMutAct_9fa48("33608") ? ["Stryker was here"] : (stryCov_9fa48("33608"), []),
      actions: stryMutAct_9fa48("33609") ? ["Stryker was here"] : (stryCov_9fa48("33609"), [])
    });
  }
}