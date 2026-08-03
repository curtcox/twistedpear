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
export { PACKET_CONTEXT_NONE, PACKET_CONTEXT_PATH_RESPONSE };
export interface TransportAnnounceSource {
  readonly contextFlag: number;
  readonly destinationType: number;
  readonly destinationHash: Uint8Array;
  readonly context: number;
  readonly data: Uint8Array;
}

/** Clone packet header fields with a new hop count. */
export function planClonePacketWithHops(source: PacketHeaderFields, hops: number): PacketHeaderFields {
  if (stryMutAct_9fa48("33099")) {
    {}
  } else {
    stryCov_9fa48("33099");
    return stryMutAct_9fa48("33100") ? {} : (stryCov_9fa48("33100"), {
      headerType: source.headerType,
      contextFlag: source.contextFlag,
      transportType: source.transportType,
      destinationType: source.destinationType,
      packetType: source.packetType,
      hops,
      transportId: source.transportId,
      destinationHash: source.destinationHash,
      context: source.context,
      data: source.data
    });
  }
}

/**
 * Packet hop-clone field plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planClonePacketWithHops`
 * reads beside the step). Nested under {@link stepClonePacketWithHopsWithActions}.
 */
export type ClonePacketWithHopsPlanState = Record<string, never>;
export type ClonePacketWithHopsPlanEvent = Event | {
  readonly kind: "transport/clone-packet-with-hops-plan-gate";
  readonly source: PacketHeaderFields;
  readonly hops: number;
};
export type ClonePacketWithHopsPlanAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};
export interface ClonePacketWithHopsPlanStepResult {
  readonly state: ClonePacketWithHopsPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClonePacketWithHopsPlanAction[];
}
export function initialClonePacketWithHopsPlanState(): ClonePacketWithHopsPlanState {
  if (stryMutAct_9fa48("33101")) {
    {}
  } else {
    stryCov_9fa48("33101");
    return {};
  }
}
export function stepClonePacketWithHopsPlanWithActions(state: ClonePacketWithHopsPlanState, event: ClonePacketWithHopsPlanEvent): ClonePacketWithHopsPlanStepResult {
  if (stryMutAct_9fa48("33102")) {
    {}
  } else {
    stryCov_9fa48("33102");
    if (stryMutAct_9fa48("33105") ? event.kind !== "transport/clone-packet-with-hops-plan-gate" : stryMutAct_9fa48("33104") ? false : stryMutAct_9fa48("33103") ? true : (stryCov_9fa48("33103", "33104", "33105"), event.kind === (stryMutAct_9fa48("33106") ? "" : (stryCov_9fa48("33106"), "transport/clone-packet-with-hops-plan-gate")))) {
      if (stryMutAct_9fa48("33107")) {
        {}
      } else {
        stryCov_9fa48("33107");
        return stryMutAct_9fa48("33108") ? {} : (stryCov_9fa48("33108"), {
          state,
          intents: stryMutAct_9fa48("33109") ? ["Stryker was here"] : (stryCov_9fa48("33109"), []),
          actions: stryMutAct_9fa48("33110") ? [] : (stryCov_9fa48("33110"), [stryMutAct_9fa48("33111") ? {} : (stryCov_9fa48("33111"), {
            kind: stryMutAct_9fa48("33112") ? "" : (stryCov_9fa48("33112"), "use-fields"),
            fields: planClonePacketWithHops(event.source, event.hops)
          })])
        });
      }
    }
    return stryMutAct_9fa48("33113") ? {} : (stryCov_9fa48("33113"), {
      state,
      intents: stryMutAct_9fa48("33114") ? ["Stryker was here"] : (stryCov_9fa48("33114"), []),
      actions: stryMutAct_9fa48("33115") ? ["Stryker was here"] : (stryCov_9fa48("33115"), [])
    });
  }
}
export function shouldUseClonePacketWithHopsPlan(actions: ReadonlyArray<ClonePacketWithHopsPlanAction>): boolean {
  if (stryMutAct_9fa48("33116")) {
    {}
  } else {
    stryCov_9fa48("33116");
    return stryMutAct_9fa48("33117") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("33117"), actions.some(stryMutAct_9fa48("33118") ? () => undefined : (stryCov_9fa48("33118"), action => stryMutAct_9fa48("33121") ? action.kind !== "use-fields" : stryMutAct_9fa48("33120") ? false : stryMutAct_9fa48("33119") ? true : (stryCov_9fa48("33119", "33120", "33121"), action.kind === (stryMutAct_9fa48("33122") ? "" : (stryCov_9fa48("33122"), "use-fields"))))));
  }
}

/** Extract hop-clone fields from plan actions; null when no `use-fields` action. */
export function clonePacketWithHopsPlanFieldsFromActions(actions: ReadonlyArray<ClonePacketWithHopsPlanAction>): PacketHeaderFields | null {
  if (stryMutAct_9fa48("33123")) {
    {}
  } else {
    stryCov_9fa48("33123");
    const action = actions.find(stryMutAct_9fa48("33124") ? () => undefined : (stryCov_9fa48("33124"), entry => stryMutAct_9fa48("33127") ? entry.kind !== "use-fields" : stryMutAct_9fa48("33126") ? false : stryMutAct_9fa48("33125") ? true : (stryCov_9fa48("33125", "33126", "33127"), entry.kind === (stryMutAct_9fa48("33128") ? "" : (stryCov_9fa48("33128"), "use-fields")))));
    return (stryMutAct_9fa48("33131") ? action?.kind !== "use-fields" : stryMutAct_9fa48("33130") ? false : stryMutAct_9fa48("33129") ? true : (stryCov_9fa48("33129", "33130", "33131"), (stryMutAct_9fa48("33132") ? action.kind : (stryCov_9fa48("33132"), action?.kind)) === (stryMutAct_9fa48("33133") ? "" : (stryCov_9fa48("33133"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Packet hop-clone field planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planClonePacketWithHops`
 * reads beside the step).
 * Plan nested via {@link stepClonePacketWithHopsPlanWithActions} (`use-fields`).
 */
export type ClonePacketWithHopsState = Record<string, never>;
export type ClonePacketWithHopsEvent = Event | {
  readonly kind: "transport/clone-packet-with-hops-gate";
  readonly source: PacketHeaderFields;
  readonly hops: number;
};
export type ClonePacketWithHopsAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};
export interface ClonePacketWithHopsStepResult {
  readonly state: ClonePacketWithHopsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClonePacketWithHopsAction[];
}
export function initialClonePacketWithHopsState(): ClonePacketWithHopsState {
  if (stryMutAct_9fa48("33134")) {
    {}
  } else {
    stryCov_9fa48("33134");
    return {};
  }
}
export function stepClonePacketWithHopsWithActions(state: ClonePacketWithHopsState, event: ClonePacketWithHopsEvent): ClonePacketWithHopsStepResult {
  if (stryMutAct_9fa48("33135")) {
    {}
  } else {
    stryCov_9fa48("33135");
    if (stryMutAct_9fa48("33138") ? event.kind !== "transport/clone-packet-with-hops-gate" : stryMutAct_9fa48("33137") ? false : stryMutAct_9fa48("33136") ? true : (stryCov_9fa48("33136", "33137", "33138"), event.kind === (stryMutAct_9fa48("33139") ? "" : (stryCov_9fa48("33139"), "transport/clone-packet-with-hops-gate")))) {
      if (stryMutAct_9fa48("33140")) {
        {}
      } else {
        stryCov_9fa48("33140");
        const planActions = stepClonePacketWithHopsPlanWithActions(initialClonePacketWithHopsPlanState(), stryMutAct_9fa48("33141") ? {} : (stryCov_9fa48("33141"), {
          kind: stryMutAct_9fa48("33142") ? "" : (stryCov_9fa48("33142"), "transport/clone-packet-with-hops-plan-gate"),
          source: event.source,
          hops: event.hops
        })).actions;
        const fields = clonePacketWithHopsPlanFieldsFromActions(planActions);
        if (stryMutAct_9fa48("33145") ? fields !== null : stryMutAct_9fa48("33144") ? false : stryMutAct_9fa48("33143") ? true : (stryCov_9fa48("33143", "33144", "33145"), fields === null)) {
          if (stryMutAct_9fa48("33146")) {
            {}
          } else {
            stryCov_9fa48("33146");
            return stryMutAct_9fa48("33147") ? {} : (stryCov_9fa48("33147"), {
              state,
              intents: stryMutAct_9fa48("33148") ? ["Stryker was here"] : (stryCov_9fa48("33148"), []),
              actions: stryMutAct_9fa48("33149") ? ["Stryker was here"] : (stryCov_9fa48("33149"), [])
            });
          }
        }
        return stryMutAct_9fa48("33150") ? {} : (stryCov_9fa48("33150"), {
          state,
          intents: stryMutAct_9fa48("33151") ? ["Stryker was here"] : (stryCov_9fa48("33151"), []),
          actions: stryMutAct_9fa48("33152") ? [] : (stryCov_9fa48("33152"), [stryMutAct_9fa48("33153") ? {} : (stryCov_9fa48("33153"), {
            kind: stryMutAct_9fa48("33154") ? "" : (stryCov_9fa48("33154"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("33155") ? {} : (stryCov_9fa48("33155"), {
      state,
      intents: stryMutAct_9fa48("33156") ? ["Stryker was here"] : (stryCov_9fa48("33156"), []),
      actions: stryMutAct_9fa48("33157") ? ["Stryker was here"] : (stryCov_9fa48("33157"), [])
    });
  }
}
export function shouldUseClonePacketWithHops(actions: ReadonlyArray<ClonePacketWithHopsAction>): boolean {
  if (stryMutAct_9fa48("33158")) {
    {}
  } else {
    stryCov_9fa48("33158");
    return stryMutAct_9fa48("33159") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("33159"), actions.some(stryMutAct_9fa48("33160") ? () => undefined : (stryCov_9fa48("33160"), action => stryMutAct_9fa48("33163") ? action.kind !== "use-fields" : stryMutAct_9fa48("33162") ? false : stryMutAct_9fa48("33161") ? true : (stryCov_9fa48("33161", "33162", "33163"), action.kind === (stryMutAct_9fa48("33164") ? "" : (stryCov_9fa48("33164"), "use-fields"))))));
  }
}

/** Extract hop-clone fields from step actions; null when no `use-fields` action. */
export function clonePacketWithHopsFieldsFromActions(actions: ReadonlyArray<ClonePacketWithHopsAction>): PacketHeaderFields | null {
  if (stryMutAct_9fa48("33165")) {
    {}
  } else {
    stryCov_9fa48("33165");
    const action = actions.find(stryMutAct_9fa48("33166") ? () => undefined : (stryCov_9fa48("33166"), entry => stryMutAct_9fa48("33169") ? entry.kind !== "use-fields" : stryMutAct_9fa48("33168") ? false : stryMutAct_9fa48("33167") ? true : (stryCov_9fa48("33167", "33168", "33169"), entry.kind === (stryMutAct_9fa48("33170") ? "" : (stryCov_9fa48("33170"), "use-fields")))));
    return (stryMutAct_9fa48("33173") ? action?.kind !== "use-fields" : stryMutAct_9fa48("33172") ? false : stryMutAct_9fa48("33171") ? true : (stryCov_9fa48("33171", "33172", "33173"), (stryMutAct_9fa48("33174") ? action.kind : (stryCov_9fa48("33174"), action?.kind)) === (stryMutAct_9fa48("33175") ? "" : (stryCov_9fa48("33175"), "use-fields")))) ? action.fields : null;
  }
}

/** HEADER_2 transport-wrapped announce rebroadcast fields. */
export function planTransportAnnounceFields(input: {
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
}): PacketHeaderFields {
  if (stryMutAct_9fa48("33176")) {
    {}
  } else {
    stryCov_9fa48("33176");
    return stryMutAct_9fa48("33177") ? {} : (stryCov_9fa48("33177"), {
      headerType: PACKET_HEADER_2,
      contextFlag: input.source.contextFlag,
      transportType: TRANSPORT_TRANSPORT,
      destinationType: input.source.destinationType,
      packetType: PACKET_TYPE_ANNOUNCE,
      hops: input.hops,
      transportId: input.transportId,
      destinationHash: input.source.destinationHash,
      context: input.source.context,
      data: input.source.data
    });
  }
}

/**
 * Transport announce field plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planTransportAnnounceFields`
 * reads beside the step). Nested under
 * {@link stepTransportAnnounceFieldsWithActions}.
 */
export type TransportAnnounceFieldsPlanState = Record<string, never>;
export type TransportAnnounceFieldsPlanEvent = Event | {
  readonly kind: "transport/announce-fields-plan-gate";
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
};
export type TransportAnnounceFieldsPlanAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};
export interface TransportAnnounceFieldsPlanStepResult {
  readonly state: TransportAnnounceFieldsPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TransportAnnounceFieldsPlanAction[];
}
export function initialTransportAnnounceFieldsPlanState(): TransportAnnounceFieldsPlanState {
  if (stryMutAct_9fa48("33178")) {
    {}
  } else {
    stryCov_9fa48("33178");
    return {};
  }
}
export function stepTransportAnnounceFieldsPlanWithActions(state: TransportAnnounceFieldsPlanState, event: TransportAnnounceFieldsPlanEvent): TransportAnnounceFieldsPlanStepResult {
  if (stryMutAct_9fa48("33179")) {
    {}
  } else {
    stryCov_9fa48("33179");
    if (stryMutAct_9fa48("33182") ? event.kind !== "transport/announce-fields-plan-gate" : stryMutAct_9fa48("33181") ? false : stryMutAct_9fa48("33180") ? true : (stryCov_9fa48("33180", "33181", "33182"), event.kind === (stryMutAct_9fa48("33183") ? "" : (stryCov_9fa48("33183"), "transport/announce-fields-plan-gate")))) {
      if (stryMutAct_9fa48("33184")) {
        {}
      } else {
        stryCov_9fa48("33184");
        return stryMutAct_9fa48("33185") ? {} : (stryCov_9fa48("33185"), {
          state,
          intents: stryMutAct_9fa48("33186") ? ["Stryker was here"] : (stryCov_9fa48("33186"), []),
          actions: stryMutAct_9fa48("33187") ? [] : (stryCov_9fa48("33187"), [stryMutAct_9fa48("33188") ? {} : (stryCov_9fa48("33188"), {
            kind: stryMutAct_9fa48("33189") ? "" : (stryCov_9fa48("33189"), "use-fields"),
            fields: planTransportAnnounceFields(stryMutAct_9fa48("33190") ? {} : (stryCov_9fa48("33190"), {
              source: event.source,
              transportId: event.transportId,
              hops: event.hops
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("33191") ? {} : (stryCov_9fa48("33191"), {
      state,
      intents: stryMutAct_9fa48("33192") ? ["Stryker was here"] : (stryCov_9fa48("33192"), []),
      actions: stryMutAct_9fa48("33193") ? ["Stryker was here"] : (stryCov_9fa48("33193"), [])
    });
  }
}
export function shouldUseTransportAnnounceFieldsPlan(actions: ReadonlyArray<TransportAnnounceFieldsPlanAction>): boolean {
  if (stryMutAct_9fa48("33194")) {
    {}
  } else {
    stryCov_9fa48("33194");
    return stryMutAct_9fa48("33195") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("33195"), actions.some(stryMutAct_9fa48("33196") ? () => undefined : (stryCov_9fa48("33196"), action => stryMutAct_9fa48("33199") ? action.kind !== "use-fields" : stryMutAct_9fa48("33198") ? false : stryMutAct_9fa48("33197") ? true : (stryCov_9fa48("33197", "33198", "33199"), action.kind === (stryMutAct_9fa48("33200") ? "" : (stryCov_9fa48("33200"), "use-fields"))))));
  }
}

/** Extract transport announce fields from plan actions; null when no `use-fields`. */
export function transportAnnounceFieldsPlanFromActions(actions: ReadonlyArray<TransportAnnounceFieldsPlanAction>): PacketHeaderFields | null {
  if (stryMutAct_9fa48("33201")) {
    {}
  } else {
    stryCov_9fa48("33201");
    const action = actions.find(stryMutAct_9fa48("33202") ? () => undefined : (stryCov_9fa48("33202"), entry => stryMutAct_9fa48("33205") ? entry.kind !== "use-fields" : stryMutAct_9fa48("33204") ? false : stryMutAct_9fa48("33203") ? true : (stryCov_9fa48("33203", "33204", "33205"), entry.kind === (stryMutAct_9fa48("33206") ? "" : (stryCov_9fa48("33206"), "use-fields")))));
    return (stryMutAct_9fa48("33209") ? action?.kind !== "use-fields" : stryMutAct_9fa48("33208") ? false : stryMutAct_9fa48("33207") ? true : (stryCov_9fa48("33207", "33208", "33209"), (stryMutAct_9fa48("33210") ? action.kind : (stryCov_9fa48("33210"), action?.kind)) === (stryMutAct_9fa48("33211") ? "" : (stryCov_9fa48("33211"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Transport announce field planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planTransportAnnounceFields`
 * reads beside the step).
 * Plan nested via {@link stepTransportAnnounceFieldsPlanWithActions} (`use-fields`).
 */
export type TransportAnnounceFieldsState = Record<string, never>;
export type TransportAnnounceFieldsEvent = Event | {
  readonly kind: "transport/announce-fields-gate";
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
};
export type TransportAnnounceFieldsAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};
export interface TransportAnnounceFieldsStepResult {
  readonly state: TransportAnnounceFieldsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TransportAnnounceFieldsAction[];
}
export function initialTransportAnnounceFieldsState(): TransportAnnounceFieldsState {
  if (stryMutAct_9fa48("33212")) {
    {}
  } else {
    stryCov_9fa48("33212");
    return {};
  }
}
export function stepTransportAnnounceFieldsWithActions(state: TransportAnnounceFieldsState, event: TransportAnnounceFieldsEvent): TransportAnnounceFieldsStepResult {
  if (stryMutAct_9fa48("33213")) {
    {}
  } else {
    stryCov_9fa48("33213");
    if (stryMutAct_9fa48("33216") ? event.kind !== "transport/announce-fields-gate" : stryMutAct_9fa48("33215") ? false : stryMutAct_9fa48("33214") ? true : (stryCov_9fa48("33214", "33215", "33216"), event.kind === (stryMutAct_9fa48("33217") ? "" : (stryCov_9fa48("33217"), "transport/announce-fields-gate")))) {
      if (stryMutAct_9fa48("33218")) {
        {}
      } else {
        stryCov_9fa48("33218");
        const planActions = stepTransportAnnounceFieldsPlanWithActions(initialTransportAnnounceFieldsPlanState(), stryMutAct_9fa48("33219") ? {} : (stryCov_9fa48("33219"), {
          kind: stryMutAct_9fa48("33220") ? "" : (stryCov_9fa48("33220"), "transport/announce-fields-plan-gate"),
          source: event.source,
          transportId: event.transportId,
          hops: event.hops
        })).actions;
        const fields = transportAnnounceFieldsPlanFromActions(planActions);
        if (stryMutAct_9fa48("33223") ? fields !== null : stryMutAct_9fa48("33222") ? false : stryMutAct_9fa48("33221") ? true : (stryCov_9fa48("33221", "33222", "33223"), fields === null)) {
          if (stryMutAct_9fa48("33224")) {
            {}
          } else {
            stryCov_9fa48("33224");
            return stryMutAct_9fa48("33225") ? {} : (stryCov_9fa48("33225"), {
              state,
              intents: stryMutAct_9fa48("33226") ? ["Stryker was here"] : (stryCov_9fa48("33226"), []),
              actions: stryMutAct_9fa48("33227") ? ["Stryker was here"] : (stryCov_9fa48("33227"), [])
            });
          }
        }
        return stryMutAct_9fa48("33228") ? {} : (stryCov_9fa48("33228"), {
          state,
          intents: stryMutAct_9fa48("33229") ? ["Stryker was here"] : (stryCov_9fa48("33229"), []),
          actions: stryMutAct_9fa48("33230") ? [] : (stryCov_9fa48("33230"), [stryMutAct_9fa48("33231") ? {} : (stryCov_9fa48("33231"), {
            kind: stryMutAct_9fa48("33232") ? "" : (stryCov_9fa48("33232"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("33233") ? {} : (stryCov_9fa48("33233"), {
      state,
      intents: stryMutAct_9fa48("33234") ? ["Stryker was here"] : (stryCov_9fa48("33234"), []),
      actions: stryMutAct_9fa48("33235") ? ["Stryker was here"] : (stryCov_9fa48("33235"), [])
    });
  }
}
export function shouldUseTransportAnnounceFields(actions: ReadonlyArray<TransportAnnounceFieldsAction>): boolean {
  if (stryMutAct_9fa48("33236")) {
    {}
  } else {
    stryCov_9fa48("33236");
    return stryMutAct_9fa48("33237") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("33237"), actions.some(stryMutAct_9fa48("33238") ? () => undefined : (stryCov_9fa48("33238"), action => stryMutAct_9fa48("33241") ? action.kind !== "use-fields" : stryMutAct_9fa48("33240") ? false : stryMutAct_9fa48("33239") ? true : (stryCov_9fa48("33239", "33240", "33241"), action.kind === (stryMutAct_9fa48("33242") ? "" : (stryCov_9fa48("33242"), "use-fields"))))));
  }
}

/** Extract transport announce fields from step actions; null when no `use-fields`. */
export function transportAnnounceFieldsFromActions(actions: ReadonlyArray<TransportAnnounceFieldsAction>): PacketHeaderFields | null {
  if (stryMutAct_9fa48("33243")) {
    {}
  } else {
    stryCov_9fa48("33243");
    const action = actions.find(stryMutAct_9fa48("33244") ? () => undefined : (stryCov_9fa48("33244"), entry => stryMutAct_9fa48("33247") ? entry.kind !== "use-fields" : stryMutAct_9fa48("33246") ? false : stryMutAct_9fa48("33245") ? true : (stryCov_9fa48("33245", "33246", "33247"), entry.kind === (stryMutAct_9fa48("33248") ? "" : (stryCov_9fa48("33248"), "use-fields")))));
    return (stryMutAct_9fa48("33251") ? action?.kind !== "use-fields" : stryMutAct_9fa48("33250") ? false : stryMutAct_9fa48("33249") ? true : (stryCov_9fa48("33249", "33250", "33251"), (stryMutAct_9fa48("33252") ? action.kind : (stryCov_9fa48("33252"), action?.kind)) === (stryMutAct_9fa48("33253") ? "" : (stryCov_9fa48("33253"), "use-fields")))) ? action.fields : null;
  }
}

/** HEADER_2 transport path-response announce fields. */
export function planPathResponseAnnounceFields(input: {
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
}): PacketHeaderFields {
  if (stryMutAct_9fa48("33254")) {
    {}
  } else {
    stryCov_9fa48("33254");
    return stryMutAct_9fa48("33255") ? {} : (stryCov_9fa48("33255"), {
      ...planTransportAnnounceFields(input),
      context: PACKET_CONTEXT_PATH_RESPONSE
    });
  }
}
export type PathResponseAnnounceFieldsPlanEvent = Event | {
  readonly kind: "transport/path-response-announce-fields-plan-gate";
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
};
export type PathResponseAnnounceFieldsPlanAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};

/** Extract path-response announce fields from plan actions; null when no `use-fields`. */
export function pathResponseAnnounceFieldsPlanFromActions(actions: ReadonlyArray<PathResponseAnnounceFieldsPlanAction>): PacketHeaderFields | null {
  if (stryMutAct_9fa48("33256")) {
    {}
  } else {
    stryCov_9fa48("33256");
    const action = actions.find(stryMutAct_9fa48("33257") ? () => undefined : (stryCov_9fa48("33257"), entry => stryMutAct_9fa48("33260") ? entry.kind !== "use-fields" : stryMutAct_9fa48("33259") ? false : stryMutAct_9fa48("33258") ? true : (stryCov_9fa48("33258", "33259", "33260"), entry.kind === (stryMutAct_9fa48("33261") ? "" : (stryCov_9fa48("33261"), "use-fields")))));
    return (stryMutAct_9fa48("33264") ? action?.kind !== "use-fields" : stryMutAct_9fa48("33263") ? false : stryMutAct_9fa48("33262") ? true : (stryCov_9fa48("33262", "33263", "33264"), (stryMutAct_9fa48("33265") ? action.kind : (stryCov_9fa48("33265"), action?.kind)) === (stryMutAct_9fa48("33266") ? "" : (stryCov_9fa48("33266"), "use-fields")))) ? action.fields : null;
  }
}
export type PathResponseAnnounceFieldsEvent = Event | {
  readonly kind: "transport/path-response-announce-fields-gate";
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
};
export type PathResponseAnnounceFieldsAction = {
  readonly kind: "use-fields";
  readonly fields: PacketHeaderFields;
};