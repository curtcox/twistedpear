/**
 * Pure RNS transport header wrap / strip / relay framing.
 * Packet construction and iface send stay at the adapter edge.
 * Wrap / strip / relay / hop-rewrite conclusions leave via machine actions
 * (no ad-hoc `wrapTransportPacketBytes` / `stripTransportHeadersBytes` /
 * `relayTransportPacketBytes` / `rewritePacketHopsBytes` reads beside the step).
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
export const PACKET_HEADER_1 = 0x00;
export const PACKET_HEADER_2 = 0x01;
export const TRANSPORT_BROADCAST = 0x00;
export const TRANSPORT_TRANSPORT = 0x01;
export const TRANSPORT_ID_BYTES = 16;

/** Low nibble of packed packet flags (destination type + packet type). */
export function packetFlagsLowNibble(packedFlags: number): number {
  if (stryMutAct_9fa48("33610")) {
    {}
  } else {
    stryCov_9fa48("33610");
    return packedFlags & 0x0f;
  }
}
export function wrapTransportPacketBytes(input: {
  readonly packedFlags: number;
  readonly hops: number;
  readonly raw: Uint8Array;
  readonly nextHop: Uint8Array;
}): Uint8Array {
  if (stryMutAct_9fa48("33611")) {
    {}
  } else {
    stryCov_9fa48("33611");
    if (stryMutAct_9fa48("33614") ? input.nextHop.length === TRANSPORT_ID_BYTES : stryMutAct_9fa48("33613") ? false : stryMutAct_9fa48("33612") ? true : (stryCov_9fa48("33612", "33613", "33614"), input.nextHop.length !== TRANSPORT_ID_BYTES)) {
      if (stryMutAct_9fa48("33615")) {
        {}
      } else {
        stryCov_9fa48("33615");
        throw new Error(stryMutAct_9fa48("33616") ? `` : (stryCov_9fa48("33616"), `nextHop must be ${TRANSPORT_ID_BYTES} bytes`));
      }
    }
    if (stryMutAct_9fa48("33620") ? input.raw.length >= 2 : stryMutAct_9fa48("33619") ? input.raw.length <= 2 : stryMutAct_9fa48("33618") ? false : stryMutAct_9fa48("33617") ? true : (stryCov_9fa48("33617", "33618", "33619", "33620"), input.raw.length < 2)) {
      if (stryMutAct_9fa48("33621")) {
        {}
      } else {
        stryCov_9fa48("33621");
        throw new Error(stryMutAct_9fa48("33622") ? "" : (stryCov_9fa48("33622"), "packet raw too short"));
      }
    }
    const flags = PACKET_HEADER_2 << 6 | TRANSPORT_TRANSPORT << 4 | packetFlagsLowNibble(input.packedFlags);
    const header = new Uint8Array(stryMutAct_9fa48("33623") ? [] : (stryCov_9fa48("33623"), [flags, input.hops & 0xff]));
    const rest = input.raw.subarray(2);
    const wrapped = new Uint8Array(stryMutAct_9fa48("33624") ? header.length + input.nextHop.length - rest.length : (stryCov_9fa48("33624"), (stryMutAct_9fa48("33625") ? header.length - input.nextHop.length : (stryCov_9fa48("33625"), header.length + input.nextHop.length)) + rest.length));
    wrapped.set(header, 0);
    wrapped.set(input.nextHop, header.length);
    wrapped.set(rest, stryMutAct_9fa48("33626") ? header.length - input.nextHop.length : (stryCov_9fa48("33626"), header.length + input.nextHop.length));
    return wrapped;
  }
}
export function stripTransportHeadersBytes(raw: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("33627")) {
    {}
  } else {
    stryCov_9fa48("33627");
    if (stryMutAct_9fa48("33631") ? raw.length >= 2 + TRANSPORT_ID_BYTES : stryMutAct_9fa48("33630") ? raw.length <= 2 + TRANSPORT_ID_BYTES : stryMutAct_9fa48("33629") ? false : stryMutAct_9fa48("33628") ? true : (stryCov_9fa48("33628", "33629", "33630", "33631"), raw.length < (stryMutAct_9fa48("33632") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("33632"), 2 + TRANSPORT_ID_BYTES)))) {
      if (stryMutAct_9fa48("33633")) {
        {}
      } else {
        stryCov_9fa48("33633");
        throw new Error(stryMutAct_9fa48("33634") ? "" : (stryCov_9fa48("33634"), "transport packet too short to strip"));
      }
    }
    const flags = (raw[0]! & 0b00001111 | PACKET_HEADER_1 << 6 | TRANSPORT_BROADCAST << 4) & 0xff;
    const output = new Uint8Array(stryMutAct_9fa48("33635") ? raw.length + TRANSPORT_ID_BYTES : (stryCov_9fa48("33635"), raw.length - TRANSPORT_ID_BYTES));
    output[0] = flags;
    output[1] = raw[1]!;
    output.set(raw.subarray(stryMutAct_9fa48("33636") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("33636"), 2 + TRANSPORT_ID_BYTES)), 2);
    return output;
  }
}
export function relayTransportPacketBytes(input: {
  readonly raw: Uint8Array;
  readonly hops: number;
  readonly remainingHops: number;
  readonly nextHop: Uint8Array;
}): Uint8Array {
  if (stryMutAct_9fa48("33637")) {
    {}
  } else {
    stryCov_9fa48("33637");
    if (stryMutAct_9fa48("33641") ? input.remainingHops <= 1 : stryMutAct_9fa48("33640") ? input.remainingHops >= 1 : stryMutAct_9fa48("33639") ? false : stryMutAct_9fa48("33638") ? true : (stryCov_9fa48("33638", "33639", "33640", "33641"), input.remainingHops > 1)) {
      if (stryMutAct_9fa48("33642")) {
        {}
      } else {
        stryCov_9fa48("33642");
        if (stryMutAct_9fa48("33645") ? input.nextHop.length === TRANSPORT_ID_BYTES : stryMutAct_9fa48("33644") ? false : stryMutAct_9fa48("33643") ? true : (stryCov_9fa48("33643", "33644", "33645"), input.nextHop.length !== TRANSPORT_ID_BYTES)) {
          if (stryMutAct_9fa48("33646")) {
            {}
          } else {
            stryCov_9fa48("33646");
            throw new Error(stryMutAct_9fa48("33647") ? `` : (stryCov_9fa48("33647"), `nextHop must be ${TRANSPORT_ID_BYTES} bytes`));
          }
        }
        if (stryMutAct_9fa48("33651") ? input.raw.length >= 2 + TRANSPORT_ID_BYTES : stryMutAct_9fa48("33650") ? input.raw.length <= 2 + TRANSPORT_ID_BYTES : stryMutAct_9fa48("33649") ? false : stryMutAct_9fa48("33648") ? true : (stryCov_9fa48("33648", "33649", "33650", "33651"), input.raw.length < (stryMutAct_9fa48("33652") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("33652"), 2 + TRANSPORT_ID_BYTES)))) {
          if (stryMutAct_9fa48("33653")) {
            {}
          } else {
            stryCov_9fa48("33653");
            throw new Error(stryMutAct_9fa48("33654") ? "" : (stryCov_9fa48("33654"), "transport packet too short to relay"));
          }
        }
        const raw = new Uint8Array(input.raw.length);
        raw[0] = input.raw[0]!;
        raw[1] = input.hops & 0xff;
        raw.set(input.nextHop, 2);
        raw.set(input.raw.subarray(stryMutAct_9fa48("33655") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("33655"), 2 + TRANSPORT_ID_BYTES)), stryMutAct_9fa48("33656") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("33656"), 2 + TRANSPORT_ID_BYTES));
        return raw;
      }
    }
    if (stryMutAct_9fa48("33659") ? input.remainingHops !== 1 : stryMutAct_9fa48("33658") ? false : stryMutAct_9fa48("33657") ? true : (stryCov_9fa48("33657", "33658", "33659"), input.remainingHops === 1)) {
      if (stryMutAct_9fa48("33660")) {
        {}
      } else {
        stryCov_9fa48("33660");
        return stripTransportHeadersBytes(input.raw);
      }
    }
    if (stryMutAct_9fa48("33664") ? input.raw.length >= 2 + TRANSPORT_ID_BYTES : stryMutAct_9fa48("33663") ? input.raw.length <= 2 + TRANSPORT_ID_BYTES : stryMutAct_9fa48("33662") ? false : stryMutAct_9fa48("33661") ? true : (stryCov_9fa48("33661", "33662", "33663", "33664"), input.raw.length < (stryMutAct_9fa48("33665") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("33665"), 2 + TRANSPORT_ID_BYTES)))) {
      if (stryMutAct_9fa48("33666")) {
        {}
      } else {
        stryCov_9fa48("33666");
        throw new Error(stryMutAct_9fa48("33667") ? "" : (stryCov_9fa48("33667"), "transport packet too short to deliver"));
      }
    }
    const raw = new Uint8Array(stryMutAct_9fa48("33668") ? input.raw.length + TRANSPORT_ID_BYTES : (stryCov_9fa48("33668"), input.raw.length - TRANSPORT_ID_BYTES));
    raw[0] = input.raw[0]!;
    raw[1] = input.hops & 0xff;
    raw.set(input.raw.subarray(stryMutAct_9fa48("33669") ? 2 - TRANSPORT_ID_BYTES : (stryCov_9fa48("33669"), 2 + TRANSPORT_ID_BYTES)), 2);
    return raw;
  }
}

/** Rewrite only the hops byte of an already-framed packet (forward / reverse relay). */
export function rewritePacketHopsBytes(raw: Uint8Array, hops: number): Uint8Array {
  if (stryMutAct_9fa48("33670")) {
    {}
  } else {
    stryCov_9fa48("33670");
    if (stryMutAct_9fa48("33674") ? raw.length >= 2 : stryMutAct_9fa48("33673") ? raw.length <= 2 : stryMutAct_9fa48("33672") ? false : stryMutAct_9fa48("33671") ? true : (stryCov_9fa48("33671", "33672", "33673", "33674"), raw.length < 2)) {
      if (stryMutAct_9fa48("33675")) {
        {}
      } else {
        stryCov_9fa48("33675");
        throw new Error(stryMutAct_9fa48("33676") ? "" : (stryCov_9fa48("33676"), "packet raw too short"));
      }
    }
    const output = new Uint8Array(raw.length);
    output[0] = raw[0]!;
    output[1] = hops & 0xff;
    output.set(raw.subarray(2), 2);
    return output;
  }
}

/**
 * Transport wrap framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `wrapTransportPacketBytes`
 * reads beside the step).
 */
export type WrapTransportPacketState = Record<string, never>;
export type WrapTransportPacketEvent = Event | {
  readonly kind: "transport/wrap-packet-gate";
  readonly packedFlags: number;
  readonly hops: number;
  readonly raw: Uint8Array;
  readonly nextHop: Uint8Array;
};
export type WrapTransportPacketAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface WrapTransportPacketStepResult {
  readonly state: WrapTransportPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly WrapTransportPacketAction[];
}
export function initialWrapTransportPacketState(): WrapTransportPacketState {
  if (stryMutAct_9fa48("33677")) {
    {}
  } else {
    stryCov_9fa48("33677");
    return {};
  }
}
export function stepWrapTransportPacketWithActions(state: WrapTransportPacketState, event: WrapTransportPacketEvent): WrapTransportPacketStepResult {
  if (stryMutAct_9fa48("33678")) {
    {}
  } else {
    stryCov_9fa48("33678");
    if (stryMutAct_9fa48("33681") ? event.kind !== "transport/wrap-packet-gate" : stryMutAct_9fa48("33680") ? false : stryMutAct_9fa48("33679") ? true : (stryCov_9fa48("33679", "33680", "33681"), event.kind === (stryMutAct_9fa48("33682") ? "" : (stryCov_9fa48("33682"), "transport/wrap-packet-gate")))) {
      if (stryMutAct_9fa48("33683")) {
        {}
      } else {
        stryCov_9fa48("33683");
        return stryMutAct_9fa48("33684") ? {} : (stryCov_9fa48("33684"), {
          state,
          intents: stryMutAct_9fa48("33685") ? ["Stryker was here"] : (stryCov_9fa48("33685"), []),
          actions: stryMutAct_9fa48("33686") ? [] : (stryCov_9fa48("33686"), [stryMutAct_9fa48("33687") ? {} : (stryCov_9fa48("33687"), {
            kind: stryMutAct_9fa48("33688") ? "" : (stryCov_9fa48("33688"), "use-raw"),
            raw: wrapTransportPacketBytes(stryMutAct_9fa48("33689") ? {} : (stryCov_9fa48("33689"), {
              packedFlags: event.packedFlags,
              hops: event.hops,
              raw: event.raw,
              nextHop: event.nextHop
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("33690") ? {} : (stryCov_9fa48("33690"), {
      state,
      intents: stryMutAct_9fa48("33691") ? ["Stryker was here"] : (stryCov_9fa48("33691"), []),
      actions: stryMutAct_9fa48("33692") ? ["Stryker was here"] : (stryCov_9fa48("33692"), [])
    });
  }
}
export function shouldUseWrapTransportPacket(actions: ReadonlyArray<WrapTransportPacketAction>): boolean {
  if (stryMutAct_9fa48("33693")) {
    {}
  } else {
    stryCov_9fa48("33693");
    return stryMutAct_9fa48("33694") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("33694"), actions.some(stryMutAct_9fa48("33695") ? () => undefined : (stryCov_9fa48("33695"), action => stryMutAct_9fa48("33698") ? action.kind !== "use-raw" : stryMutAct_9fa48("33697") ? false : stryMutAct_9fa48("33696") ? true : (stryCov_9fa48("33696", "33697", "33698"), action.kind === (stryMutAct_9fa48("33699") ? "" : (stryCov_9fa48("33699"), "use-raw"))))));
  }
}

/** Extract wrap framing bytes from step actions; null when no `use-raw` action. */
export function wrapTransportPacketRawFromActions(actions: ReadonlyArray<WrapTransportPacketAction>): Uint8Array | null {
  if (stryMutAct_9fa48("33700")) {
    {}
  } else {
    stryCov_9fa48("33700");
    const action = actions.find(stryMutAct_9fa48("33701") ? () => undefined : (stryCov_9fa48("33701"), entry => stryMutAct_9fa48("33704") ? entry.kind !== "use-raw" : stryMutAct_9fa48("33703") ? false : stryMutAct_9fa48("33702") ? true : (stryCov_9fa48("33702", "33703", "33704"), entry.kind === (stryMutAct_9fa48("33705") ? "" : (stryCov_9fa48("33705"), "use-raw")))));
    return (stryMutAct_9fa48("33708") ? action?.kind !== "use-raw" : stryMutAct_9fa48("33707") ? false : stryMutAct_9fa48("33706") ? true : (stryCov_9fa48("33706", "33707", "33708"), (stryMutAct_9fa48("33709") ? action.kind : (stryCov_9fa48("33709"), action?.kind)) === (stryMutAct_9fa48("33710") ? "" : (stryCov_9fa48("33710"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Transport header strip framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `stripTransportHeadersBytes`
 * reads beside the step).
 */
export type StripTransportHeadersState = Record<string, never>;
export type StripTransportHeadersEvent = Event | {
  readonly kind: "transport/strip-headers-gate";
  readonly raw: Uint8Array;
};
export type StripTransportHeadersAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface StripTransportHeadersStepResult {
  readonly state: StripTransportHeadersState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StripTransportHeadersAction[];
}
export function initialStripTransportHeadersState(): StripTransportHeadersState {
  if (stryMutAct_9fa48("33711")) {
    {}
  } else {
    stryCov_9fa48("33711");
    return {};
  }
}
export function stepStripTransportHeadersWithActions(state: StripTransportHeadersState, event: StripTransportHeadersEvent): StripTransportHeadersStepResult {
  if (stryMutAct_9fa48("33712")) {
    {}
  } else {
    stryCov_9fa48("33712");
    if (stryMutAct_9fa48("33715") ? event.kind !== "transport/strip-headers-gate" : stryMutAct_9fa48("33714") ? false : stryMutAct_9fa48("33713") ? true : (stryCov_9fa48("33713", "33714", "33715"), event.kind === (stryMutAct_9fa48("33716") ? "" : (stryCov_9fa48("33716"), "transport/strip-headers-gate")))) {
      if (stryMutAct_9fa48("33717")) {
        {}
      } else {
        stryCov_9fa48("33717");
        return stryMutAct_9fa48("33718") ? {} : (stryCov_9fa48("33718"), {
          state,
          intents: stryMutAct_9fa48("33719") ? ["Stryker was here"] : (stryCov_9fa48("33719"), []),
          actions: stryMutAct_9fa48("33720") ? [] : (stryCov_9fa48("33720"), [stryMutAct_9fa48("33721") ? {} : (stryCov_9fa48("33721"), {
            kind: stryMutAct_9fa48("33722") ? "" : (stryCov_9fa48("33722"), "use-raw"),
            raw: stripTransportHeadersBytes(event.raw)
          })])
        });
      }
    }
    return stryMutAct_9fa48("33723") ? {} : (stryCov_9fa48("33723"), {
      state,
      intents: stryMutAct_9fa48("33724") ? ["Stryker was here"] : (stryCov_9fa48("33724"), []),
      actions: stryMutAct_9fa48("33725") ? ["Stryker was here"] : (stryCov_9fa48("33725"), [])
    });
  }
}
export function shouldUseStripTransportHeaders(actions: ReadonlyArray<StripTransportHeadersAction>): boolean {
  if (stryMutAct_9fa48("33726")) {
    {}
  } else {
    stryCov_9fa48("33726");
    return stryMutAct_9fa48("33727") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("33727"), actions.some(stryMutAct_9fa48("33728") ? () => undefined : (stryCov_9fa48("33728"), action => stryMutAct_9fa48("33731") ? action.kind !== "use-raw" : stryMutAct_9fa48("33730") ? false : stryMutAct_9fa48("33729") ? true : (stryCov_9fa48("33729", "33730", "33731"), action.kind === (stryMutAct_9fa48("33732") ? "" : (stryCov_9fa48("33732"), "use-raw"))))));
  }
}

/** Extract strip framing bytes from step actions; null when no `use-raw` action. */
export function stripTransportHeadersRawFromActions(actions: ReadonlyArray<StripTransportHeadersAction>): Uint8Array | null {
  if (stryMutAct_9fa48("33733")) {
    {}
  } else {
    stryCov_9fa48("33733");
    const action = actions.find(stryMutAct_9fa48("33734") ? () => undefined : (stryCov_9fa48("33734"), entry => stryMutAct_9fa48("33737") ? entry.kind !== "use-raw" : stryMutAct_9fa48("33736") ? false : stryMutAct_9fa48("33735") ? true : (stryCov_9fa48("33735", "33736", "33737"), entry.kind === (stryMutAct_9fa48("33738") ? "" : (stryCov_9fa48("33738"), "use-raw")))));
    return (stryMutAct_9fa48("33741") ? action?.kind !== "use-raw" : stryMutAct_9fa48("33740") ? false : stryMutAct_9fa48("33739") ? true : (stryCov_9fa48("33739", "33740", "33741"), (stryMutAct_9fa48("33742") ? action.kind : (stryCov_9fa48("33742"), action?.kind)) === (stryMutAct_9fa48("33743") ? "" : (stryCov_9fa48("33743"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Transport relay byte framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `relayTransportPacketBytes`
 * reads beside the step).
 */
export type RelayTransportPacketState = Record<string, never>;
export type RelayTransportPacketEvent = Event | {
  readonly kind: "transport/relay-packet-bytes-gate";
  readonly raw: Uint8Array;
  readonly hops: number;
  readonly remainingHops: number;
  readonly nextHop: Uint8Array;
};
export type RelayTransportPacketAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface RelayTransportPacketStepResult {
  readonly state: RelayTransportPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RelayTransportPacketAction[];
}
export function initialRelayTransportPacketState(): RelayTransportPacketState {
  if (stryMutAct_9fa48("33744")) {
    {}
  } else {
    stryCov_9fa48("33744");
    return {};
  }
}
export function stepRelayTransportPacketWithActions(state: RelayTransportPacketState, event: RelayTransportPacketEvent): RelayTransportPacketStepResult {
  if (stryMutAct_9fa48("33745")) {
    {}
  } else {
    stryCov_9fa48("33745");
    if (stryMutAct_9fa48("33748") ? event.kind !== "transport/relay-packet-bytes-gate" : stryMutAct_9fa48("33747") ? false : stryMutAct_9fa48("33746") ? true : (stryCov_9fa48("33746", "33747", "33748"), event.kind === (stryMutAct_9fa48("33749") ? "" : (stryCov_9fa48("33749"), "transport/relay-packet-bytes-gate")))) {
      if (stryMutAct_9fa48("33750")) {
        {}
      } else {
        stryCov_9fa48("33750");
        return stryMutAct_9fa48("33751") ? {} : (stryCov_9fa48("33751"), {
          state,
          intents: stryMutAct_9fa48("33752") ? ["Stryker was here"] : (stryCov_9fa48("33752"), []),
          actions: stryMutAct_9fa48("33753") ? [] : (stryCov_9fa48("33753"), [stryMutAct_9fa48("33754") ? {} : (stryCov_9fa48("33754"), {
            kind: stryMutAct_9fa48("33755") ? "" : (stryCov_9fa48("33755"), "use-raw"),
            raw: relayTransportPacketBytes(stryMutAct_9fa48("33756") ? {} : (stryCov_9fa48("33756"), {
              raw: event.raw,
              hops: event.hops,
              remainingHops: event.remainingHops,
              nextHop: event.nextHop
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("33757") ? {} : (stryCov_9fa48("33757"), {
      state,
      intents: stryMutAct_9fa48("33758") ? ["Stryker was here"] : (stryCov_9fa48("33758"), []),
      actions: stryMutAct_9fa48("33759") ? ["Stryker was here"] : (stryCov_9fa48("33759"), [])
    });
  }
}
export function shouldUseRelayTransportPacket(actions: ReadonlyArray<RelayTransportPacketAction>): boolean {
  if (stryMutAct_9fa48("33760")) {
    {}
  } else {
    stryCov_9fa48("33760");
    return stryMutAct_9fa48("33761") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("33761"), actions.some(stryMutAct_9fa48("33762") ? () => undefined : (stryCov_9fa48("33762"), action => stryMutAct_9fa48("33765") ? action.kind !== "use-raw" : stryMutAct_9fa48("33764") ? false : stryMutAct_9fa48("33763") ? true : (stryCov_9fa48("33763", "33764", "33765"), action.kind === (stryMutAct_9fa48("33766") ? "" : (stryCov_9fa48("33766"), "use-raw"))))));
  }
}

/** Extract relay framing bytes from step actions; null when no `use-raw` action. */
export function relayTransportPacketRawFromActions(actions: ReadonlyArray<RelayTransportPacketAction>): Uint8Array | null {
  if (stryMutAct_9fa48("33767")) {
    {}
  } else {
    stryCov_9fa48("33767");
    const action = actions.find(stryMutAct_9fa48("33768") ? () => undefined : (stryCov_9fa48("33768"), entry => stryMutAct_9fa48("33771") ? entry.kind !== "use-raw" : stryMutAct_9fa48("33770") ? false : stryMutAct_9fa48("33769") ? true : (stryCov_9fa48("33769", "33770", "33771"), entry.kind === (stryMutAct_9fa48("33772") ? "" : (stryCov_9fa48("33772"), "use-raw")))));
    return (stryMutAct_9fa48("33775") ? action?.kind !== "use-raw" : stryMutAct_9fa48("33774") ? false : stryMutAct_9fa48("33773") ? true : (stryCov_9fa48("33773", "33774", "33775"), (stryMutAct_9fa48("33776") ? action.kind : (stryCov_9fa48("33776"), action?.kind)) === (stryMutAct_9fa48("33777") ? "" : (stryCov_9fa48("33777"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Packet hop-byte rewrite is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `rewritePacketHopsBytes`
 * reads beside the step).
 */
export type RewritePacketHopsState = Record<string, never>;
export type RewritePacketHopsEvent = Event | {
  readonly kind: "transport/rewrite-packet-hops-gate";
  readonly raw: Uint8Array;
  readonly hops: number;
};
export type RewritePacketHopsAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface RewritePacketHopsStepResult {
  readonly state: RewritePacketHopsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RewritePacketHopsAction[];
}
export function initialRewritePacketHopsState(): RewritePacketHopsState {
  if (stryMutAct_9fa48("33778")) {
    {}
  } else {
    stryCov_9fa48("33778");
    return {};
  }
}
export function stepRewritePacketHopsWithActions(state: RewritePacketHopsState, event: RewritePacketHopsEvent): RewritePacketHopsStepResult {
  if (stryMutAct_9fa48("33779")) {
    {}
  } else {
    stryCov_9fa48("33779");
    if (stryMutAct_9fa48("33782") ? event.kind !== "transport/rewrite-packet-hops-gate" : stryMutAct_9fa48("33781") ? false : stryMutAct_9fa48("33780") ? true : (stryCov_9fa48("33780", "33781", "33782"), event.kind === (stryMutAct_9fa48("33783") ? "" : (stryCov_9fa48("33783"), "transport/rewrite-packet-hops-gate")))) {
      if (stryMutAct_9fa48("33784")) {
        {}
      } else {
        stryCov_9fa48("33784");
        return stryMutAct_9fa48("33785") ? {} : (stryCov_9fa48("33785"), {
          state,
          intents: stryMutAct_9fa48("33786") ? ["Stryker was here"] : (stryCov_9fa48("33786"), []),
          actions: stryMutAct_9fa48("33787") ? [] : (stryCov_9fa48("33787"), [stryMutAct_9fa48("33788") ? {} : (stryCov_9fa48("33788"), {
            kind: stryMutAct_9fa48("33789") ? "" : (stryCov_9fa48("33789"), "use-raw"),
            raw: rewritePacketHopsBytes(event.raw, event.hops)
          })])
        });
      }
    }
    return stryMutAct_9fa48("33790") ? {} : (stryCov_9fa48("33790"), {
      state,
      intents: stryMutAct_9fa48("33791") ? ["Stryker was here"] : (stryCov_9fa48("33791"), []),
      actions: stryMutAct_9fa48("33792") ? ["Stryker was here"] : (stryCov_9fa48("33792"), [])
    });
  }
}
export function shouldUseRewritePacketHops(actions: ReadonlyArray<RewritePacketHopsAction>): boolean {
  if (stryMutAct_9fa48("33793")) {
    {}
  } else {
    stryCov_9fa48("33793");
    return stryMutAct_9fa48("33794") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("33794"), actions.some(stryMutAct_9fa48("33795") ? () => undefined : (stryCov_9fa48("33795"), action => stryMutAct_9fa48("33798") ? action.kind !== "use-raw" : stryMutAct_9fa48("33797") ? false : stryMutAct_9fa48("33796") ? true : (stryCov_9fa48("33796", "33797", "33798"), action.kind === (stryMutAct_9fa48("33799") ? "" : (stryCov_9fa48("33799"), "use-raw"))))));
  }
}

/** Extract hop-rewrite framing bytes from step actions; null when no `use-raw` action. */
export function rewritePacketHopsRawFromActions(actions: ReadonlyArray<RewritePacketHopsAction>): Uint8Array | null {
  if (stryMutAct_9fa48("33800")) {
    {}
  } else {
    stryCov_9fa48("33800");
    const action = actions.find(stryMutAct_9fa48("33801") ? () => undefined : (stryCov_9fa48("33801"), entry => stryMutAct_9fa48("33804") ? entry.kind !== "use-raw" : stryMutAct_9fa48("33803") ? false : stryMutAct_9fa48("33802") ? true : (stryCov_9fa48("33802", "33803", "33804"), entry.kind === (stryMutAct_9fa48("33805") ? "" : (stryCov_9fa48("33805"), "use-raw")))));
    return (stryMutAct_9fa48("33808") ? action?.kind !== "use-raw" : stryMutAct_9fa48("33807") ? false : stryMutAct_9fa48("33806") ? true : (stryCov_9fa48("33806", "33807", "33808"), (stryMutAct_9fa48("33809") ? action.kind : (stryCov_9fa48("33809"), action?.kind)) === (stryMutAct_9fa48("33810") ? "" : (stryCov_9fa48("33810"), "use-raw")))) ? action.raw : null;
  }
}