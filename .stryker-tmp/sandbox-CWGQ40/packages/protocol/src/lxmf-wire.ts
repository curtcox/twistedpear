/**
 * Pure LXMF outer wire framing (destination || source || signature || payload).
 * Signing / hashing stay at the crypto adapter edge.
 * Pack / split / hashable / signed / opportunistic conclusions leave via
 * machine actions (no ad-hoc `packLxmfWire` / `splitLxmfWire` /
 * `packLxmfDestinationPrefixed` / `splitLxmfDestinationPrefixed` /
 * `lxmfInboundDeliveryBytes` / `lxmfHashableMaterial` / `lxmfSignedMaterial` /
 * `lxmfOpportunisticPayload` reads beside the step).
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
import { LXMF_DESTINATION_LENGTH, LXMF_SIGNATURE_LENGTH, LxmfDeliveryMethod, type LxmfDeliveryMethodValue } from "./lxmf-delivery.js";
export const LXMF_WIRE_HEADER_SIZE = stryMutAct_9fa48("21686") ? 2 * LXMF_DESTINATION_LENGTH - LXMF_SIGNATURE_LENGTH : (stryCov_9fa48("21686"), (stryMutAct_9fa48("21687") ? 2 / LXMF_DESTINATION_LENGTH : (stryCov_9fa48("21687"), 2 * LXMF_DESTINATION_LENGTH)) + LXMF_SIGNATURE_LENGTH);
export interface LxmfWireFields {
  readonly destinationHash: Uint8Array;
  readonly sourceHash: Uint8Array;
  readonly signature: Uint8Array;
  readonly payload: Uint8Array;
}
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("21688")) {
    {}
  } else {
    stryCov_9fa48("21688");
    const length = parts.reduce(stryMutAct_9fa48("21689") ? () => undefined : (stryCov_9fa48("21689"), (total, part) => stryMutAct_9fa48("21690") ? total - part.length : (stryCov_9fa48("21690"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("21691")) {
        {}
      } else {
        stryCov_9fa48("21691");
        output.set(part, offset);
        stryMutAct_9fa48("21692") ? offset -= part.length : (stryCov_9fa48("21692"), offset += part.length);
      }
    }
    return output;
  }
}
export function packLxmfWire(input: {
  readonly destinationHash: Uint8Array;
  readonly sourceHash: Uint8Array;
  readonly signature: Uint8Array;
  readonly payload: Uint8Array;
}): Uint8Array {
  if (stryMutAct_9fa48("21693")) {
    {}
  } else {
    stryCov_9fa48("21693");
    if (stryMutAct_9fa48("21696") ? input.destinationHash.length === LXMF_DESTINATION_LENGTH : stryMutAct_9fa48("21695") ? false : stryMutAct_9fa48("21694") ? true : (stryCov_9fa48("21694", "21695", "21696"), input.destinationHash.length !== LXMF_DESTINATION_LENGTH)) {
      if (stryMutAct_9fa48("21697")) {
        {}
      } else {
        stryCov_9fa48("21697");
        throw new Error(stryMutAct_9fa48("21698") ? `` : (stryCov_9fa48("21698"), `destination hash must be ${LXMF_DESTINATION_LENGTH} bytes`));
      }
    }
    if (stryMutAct_9fa48("21701") ? input.sourceHash.length === LXMF_DESTINATION_LENGTH : stryMutAct_9fa48("21700") ? false : stryMutAct_9fa48("21699") ? true : (stryCov_9fa48("21699", "21700", "21701"), input.sourceHash.length !== LXMF_DESTINATION_LENGTH)) {
      if (stryMutAct_9fa48("21702")) {
        {}
      } else {
        stryCov_9fa48("21702");
        throw new Error(stryMutAct_9fa48("21703") ? `` : (stryCov_9fa48("21703"), `source hash must be ${LXMF_DESTINATION_LENGTH} bytes`));
      }
    }
    if (stryMutAct_9fa48("21706") ? input.signature.length === LXMF_SIGNATURE_LENGTH : stryMutAct_9fa48("21705") ? false : stryMutAct_9fa48("21704") ? true : (stryCov_9fa48("21704", "21705", "21706"), input.signature.length !== LXMF_SIGNATURE_LENGTH)) {
      if (stryMutAct_9fa48("21707")) {
        {}
      } else {
        stryCov_9fa48("21707");
        throw new Error(stryMutAct_9fa48("21708") ? `` : (stryCov_9fa48("21708"), `signature must be ${LXMF_SIGNATURE_LENGTH} bytes`));
      }
    }
    return concatBytes(input.destinationHash, input.sourceHash, input.signature, input.payload);
  }
}
export function splitLxmfWire(bytes: Uint8Array): LxmfWireFields | null {
  if (stryMutAct_9fa48("21709")) {
    {}
  } else {
    stryCov_9fa48("21709");
    if (stryMutAct_9fa48("21713") ? bytes.length >= LXMF_WIRE_HEADER_SIZE + 1 : stryMutAct_9fa48("21712") ? bytes.length <= LXMF_WIRE_HEADER_SIZE + 1 : stryMutAct_9fa48("21711") ? false : stryMutAct_9fa48("21710") ? true : (stryCov_9fa48("21710", "21711", "21712", "21713"), bytes.length < (stryMutAct_9fa48("21714") ? LXMF_WIRE_HEADER_SIZE - 1 : (stryCov_9fa48("21714"), LXMF_WIRE_HEADER_SIZE + 1)))) {
      if (stryMutAct_9fa48("21715")) {
        {}
      } else {
        stryCov_9fa48("21715");
        return null;
      }
    }
    return stryMutAct_9fa48("21716") ? {} : (stryCov_9fa48("21716"), {
      destinationHash: bytes.subarray(0, LXMF_DESTINATION_LENGTH),
      sourceHash: bytes.subarray(LXMF_DESTINATION_LENGTH, stryMutAct_9fa48("21717") ? 2 / LXMF_DESTINATION_LENGTH : (stryCov_9fa48("21717"), 2 * LXMF_DESTINATION_LENGTH)),
      signature: bytes.subarray(stryMutAct_9fa48("21718") ? 2 / LXMF_DESTINATION_LENGTH : (stryCov_9fa48("21718"), 2 * LXMF_DESTINATION_LENGTH), LXMF_WIRE_HEADER_SIZE),
      payload: bytes.subarray(LXMF_WIRE_HEADER_SIZE)
    });
  }
}

/** Material hashed for the message hash: destination || source || payloadWithoutStamp. */
export function lxmfHashableMaterial(destinationHash: Uint8Array, sourceHash: Uint8Array, payloadWithoutStamp: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("21719")) {
    {}
  } else {
    stryCov_9fa48("21719");
    return concatBytes(destinationHash, sourceHash, payloadWithoutStamp);
  }
}

/** Material signed: hashableMaterial || messageHash. */
export function lxmfSignedMaterial(hashableMaterial: Uint8Array, messageHash: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("21720")) {
    {}
  } else {
    stryCov_9fa48("21720");
    return concatBytes(hashableMaterial, messageHash);
  }
}
export function lxmfOpportunisticPayload(packed: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("21721")) {
    {}
  } else {
    stryCov_9fa48("21721");
    if (stryMutAct_9fa48("21725") ? packed.length >= LXMF_DESTINATION_LENGTH : stryMutAct_9fa48("21724") ? packed.length <= LXMF_DESTINATION_LENGTH : stryMutAct_9fa48("21723") ? false : stryMutAct_9fa48("21722") ? true : (stryCov_9fa48("21722", "21723", "21724", "21725"), packed.length < LXMF_DESTINATION_LENGTH)) {
      if (stryMutAct_9fa48("21726")) {
        {}
      } else {
        stryCov_9fa48("21726");
        throw new Error(stryMutAct_9fa48("21727") ? "" : (stryCov_9fa48("21727"), "LXMF packed bytes too short for opportunistic payload"));
      }
    }
    return packed.subarray(LXMF_DESTINATION_LENGTH);
  }
}

/**
 * LXMF hashable material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `lxmfHashableMaterial`
 * reads beside the step).
 */
export type LxmfHashableMaterialState = Record<string, never>;
export type LxmfHashableMaterialEvent = Event | {
  readonly kind: "lxmf-wire/hashable-material-gate";
  readonly destinationHash: Uint8Array;
  readonly sourceHash: Uint8Array;
  readonly payloadWithoutStamp: Uint8Array;
};
export type LxmfHashableMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface LxmfHashableMaterialStepResult {
  readonly state: LxmfHashableMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfHashableMaterialAction[];
}
export function initialLxmfHashableMaterialState(): LxmfHashableMaterialState {
  if (stryMutAct_9fa48("21728")) {
    {}
  } else {
    stryCov_9fa48("21728");
    return {};
  }
}
export function stepLxmfHashableMaterialWithActions(state: LxmfHashableMaterialState, event: LxmfHashableMaterialEvent): LxmfHashableMaterialStepResult {
  if (stryMutAct_9fa48("21729")) {
    {}
  } else {
    stryCov_9fa48("21729");
    if (stryMutAct_9fa48("21732") ? event.kind !== "lxmf-wire/hashable-material-gate" : stryMutAct_9fa48("21731") ? false : stryMutAct_9fa48("21730") ? true : (stryCov_9fa48("21730", "21731", "21732"), event.kind === (stryMutAct_9fa48("21733") ? "" : (stryCov_9fa48("21733"), "lxmf-wire/hashable-material-gate")))) {
      if (stryMutAct_9fa48("21734")) {
        {}
      } else {
        stryCov_9fa48("21734");
        return stryMutAct_9fa48("21735") ? {} : (stryCov_9fa48("21735"), {
          state,
          intents: stryMutAct_9fa48("21736") ? ["Stryker was here"] : (stryCov_9fa48("21736"), []),
          actions: stryMutAct_9fa48("21737") ? [] : (stryCov_9fa48("21737"), [stryMutAct_9fa48("21738") ? {} : (stryCov_9fa48("21738"), {
            kind: stryMutAct_9fa48("21739") ? "" : (stryCov_9fa48("21739"), "use-raw"),
            raw: lxmfHashableMaterial(event.destinationHash, event.sourceHash, event.payloadWithoutStamp)
          })])
        });
      }
    }
    return stryMutAct_9fa48("21740") ? {} : (stryCov_9fa48("21740"), {
      state,
      intents: stryMutAct_9fa48("21741") ? ["Stryker was here"] : (stryCov_9fa48("21741"), []),
      actions: stryMutAct_9fa48("21742") ? ["Stryker was here"] : (stryCov_9fa48("21742"), [])
    });
  }
}
export function shouldUseLxmfHashableMaterial(actions: ReadonlyArray<LxmfHashableMaterialAction>): boolean {
  if (stryMutAct_9fa48("21743")) {
    {}
  } else {
    stryCov_9fa48("21743");
    return stryMutAct_9fa48("21744") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("21744"), actions.some(stryMutAct_9fa48("21745") ? () => undefined : (stryCov_9fa48("21745"), action => stryMutAct_9fa48("21748") ? action.kind !== "use-raw" : stryMutAct_9fa48("21747") ? false : stryMutAct_9fa48("21746") ? true : (stryCov_9fa48("21746", "21747", "21748"), action.kind === (stryMutAct_9fa48("21749") ? "" : (stryCov_9fa48("21749"), "use-raw"))))));
  }
}

/** Extract LXMF hashable material from step actions; null when no `use-raw`. */
export function lxmfHashableMaterialRawFromActions(actions: ReadonlyArray<LxmfHashableMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("21750")) {
    {}
  } else {
    stryCov_9fa48("21750");
    const action = actions.find(stryMutAct_9fa48("21751") ? () => undefined : (stryCov_9fa48("21751"), entry => stryMutAct_9fa48("21754") ? entry.kind !== "use-raw" : stryMutAct_9fa48("21753") ? false : stryMutAct_9fa48("21752") ? true : (stryCov_9fa48("21752", "21753", "21754"), entry.kind === (stryMutAct_9fa48("21755") ? "" : (stryCov_9fa48("21755"), "use-raw")))));
    return (stryMutAct_9fa48("21758") ? action?.kind !== "use-raw" : stryMutAct_9fa48("21757") ? false : stryMutAct_9fa48("21756") ? true : (stryCov_9fa48("21756", "21757", "21758"), (stryMutAct_9fa48("21759") ? action.kind : (stryCov_9fa48("21759"), action?.kind)) === (stryMutAct_9fa48("21760") ? "" : (stryCov_9fa48("21760"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * LXMF signed material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `lxmfSignedMaterial` reads
 * beside the step).
 */
export type LxmfSignedMaterialState = Record<string, never>;
export type LxmfSignedMaterialEvent = Event | {
  readonly kind: "lxmf-wire/signed-material-gate";
  readonly hashableMaterial: Uint8Array;
  readonly messageHash: Uint8Array;
};
export type LxmfSignedMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface LxmfSignedMaterialStepResult {
  readonly state: LxmfSignedMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSignedMaterialAction[];
}
export function initialLxmfSignedMaterialState(): LxmfSignedMaterialState {
  if (stryMutAct_9fa48("21761")) {
    {}
  } else {
    stryCov_9fa48("21761");
    return {};
  }
}
export function stepLxmfSignedMaterialWithActions(state: LxmfSignedMaterialState, event: LxmfSignedMaterialEvent): LxmfSignedMaterialStepResult {
  if (stryMutAct_9fa48("21762")) {
    {}
  } else {
    stryCov_9fa48("21762");
    if (stryMutAct_9fa48("21765") ? event.kind !== "lxmf-wire/signed-material-gate" : stryMutAct_9fa48("21764") ? false : stryMutAct_9fa48("21763") ? true : (stryCov_9fa48("21763", "21764", "21765"), event.kind === (stryMutAct_9fa48("21766") ? "" : (stryCov_9fa48("21766"), "lxmf-wire/signed-material-gate")))) {
      if (stryMutAct_9fa48("21767")) {
        {}
      } else {
        stryCov_9fa48("21767");
        return stryMutAct_9fa48("21768") ? {} : (stryCov_9fa48("21768"), {
          state,
          intents: stryMutAct_9fa48("21769") ? ["Stryker was here"] : (stryCov_9fa48("21769"), []),
          actions: stryMutAct_9fa48("21770") ? [] : (stryCov_9fa48("21770"), [stryMutAct_9fa48("21771") ? {} : (stryCov_9fa48("21771"), {
            kind: stryMutAct_9fa48("21772") ? "" : (stryCov_9fa48("21772"), "use-raw"),
            raw: lxmfSignedMaterial(event.hashableMaterial, event.messageHash)
          })])
        });
      }
    }
    return stryMutAct_9fa48("21773") ? {} : (stryCov_9fa48("21773"), {
      state,
      intents: stryMutAct_9fa48("21774") ? ["Stryker was here"] : (stryCov_9fa48("21774"), []),
      actions: stryMutAct_9fa48("21775") ? ["Stryker was here"] : (stryCov_9fa48("21775"), [])
    });
  }
}
export function shouldUseLxmfSignedMaterial(actions: ReadonlyArray<LxmfSignedMaterialAction>): boolean {
  if (stryMutAct_9fa48("21776")) {
    {}
  } else {
    stryCov_9fa48("21776");
    return stryMutAct_9fa48("21777") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("21777"), actions.some(stryMutAct_9fa48("21778") ? () => undefined : (stryCov_9fa48("21778"), action => stryMutAct_9fa48("21781") ? action.kind !== "use-raw" : stryMutAct_9fa48("21780") ? false : stryMutAct_9fa48("21779") ? true : (stryCov_9fa48("21779", "21780", "21781"), action.kind === (stryMutAct_9fa48("21782") ? "" : (stryCov_9fa48("21782"), "use-raw"))))));
  }
}

/** Extract LXMF signed material from step actions; null when no `use-raw`. */
export function lxmfSignedMaterialRawFromActions(actions: ReadonlyArray<LxmfSignedMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("21783")) {
    {}
  } else {
    stryCov_9fa48("21783");
    const action = actions.find(stryMutAct_9fa48("21784") ? () => undefined : (stryCov_9fa48("21784"), entry => stryMutAct_9fa48("21787") ? entry.kind !== "use-raw" : stryMutAct_9fa48("21786") ? false : stryMutAct_9fa48("21785") ? true : (stryCov_9fa48("21785", "21786", "21787"), entry.kind === (stryMutAct_9fa48("21788") ? "" : (stryCov_9fa48("21788"), "use-raw")))));
    return (stryMutAct_9fa48("21791") ? action?.kind !== "use-raw" : stryMutAct_9fa48("21790") ? false : stryMutAct_9fa48("21789") ? true : (stryCov_9fa48("21789", "21790", "21791"), (stryMutAct_9fa48("21792") ? action.kind : (stryCov_9fa48("21792"), action?.kind)) === (stryMutAct_9fa48("21793") ? "" : (stryCov_9fa48("21793"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * LXMF opportunistic payload strip is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `lxmfOpportunisticPayload`
 * reads beside the step). Short packed frames become `reject`.
 */
export type LxmfOpportunisticPayloadState = Record<string, never>;
export type LxmfOpportunisticPayloadEvent = Event | {
  readonly kind: "lxmf-wire/opportunistic-payload-gate";
  readonly packed: Uint8Array;
};
export type LxmfOpportunisticPayloadAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface LxmfOpportunisticPayloadStepResult {
  readonly state: LxmfOpportunisticPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfOpportunisticPayloadAction[];
}
export function initialLxmfOpportunisticPayloadState(): LxmfOpportunisticPayloadState {
  if (stryMutAct_9fa48("21794")) {
    {}
  } else {
    stryCov_9fa48("21794");
    return {};
  }
}
export function stepLxmfOpportunisticPayloadWithActions(state: LxmfOpportunisticPayloadState, event: LxmfOpportunisticPayloadEvent): LxmfOpportunisticPayloadStepResult {
  if (stryMutAct_9fa48("21795")) {
    {}
  } else {
    stryCov_9fa48("21795");
    if (stryMutAct_9fa48("21798") ? event.kind !== "lxmf-wire/opportunistic-payload-gate" : stryMutAct_9fa48("21797") ? false : stryMutAct_9fa48("21796") ? true : (stryCov_9fa48("21796", "21797", "21798"), event.kind === (stryMutAct_9fa48("21799") ? "" : (stryCov_9fa48("21799"), "lxmf-wire/opportunistic-payload-gate")))) {
      if (stryMutAct_9fa48("21800")) {
        {}
      } else {
        stryCov_9fa48("21800");
        try {
          if (stryMutAct_9fa48("21801")) {
            {}
          } else {
            stryCov_9fa48("21801");
            return stryMutAct_9fa48("21802") ? {} : (stryCov_9fa48("21802"), {
              state,
              intents: stryMutAct_9fa48("21803") ? ["Stryker was here"] : (stryCov_9fa48("21803"), []),
              actions: stryMutAct_9fa48("21804") ? [] : (stryCov_9fa48("21804"), [stryMutAct_9fa48("21805") ? {} : (stryCov_9fa48("21805"), {
                kind: stryMutAct_9fa48("21806") ? "" : (stryCov_9fa48("21806"), "use-raw"),
                raw: lxmfOpportunisticPayload(event.packed)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("21807")) {
            {}
          } else {
            stryCov_9fa48("21807");
            return stryMutAct_9fa48("21808") ? {} : (stryCov_9fa48("21808"), {
              state,
              intents: stryMutAct_9fa48("21809") ? ["Stryker was here"] : (stryCov_9fa48("21809"), []),
              actions: stryMutAct_9fa48("21810") ? [] : (stryCov_9fa48("21810"), [stryMutAct_9fa48("21811") ? {} : (stryCov_9fa48("21811"), {
                kind: stryMutAct_9fa48("21812") ? "" : (stryCov_9fa48("21812"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("21813") ? {} : (stryCov_9fa48("21813"), {
      state,
      intents: stryMutAct_9fa48("21814") ? ["Stryker was here"] : (stryCov_9fa48("21814"), []),
      actions: stryMutAct_9fa48("21815") ? ["Stryker was here"] : (stryCov_9fa48("21815"), [])
    });
  }
}
export function shouldUseLxmfOpportunisticPayload(actions: ReadonlyArray<LxmfOpportunisticPayloadAction>): boolean {
  if (stryMutAct_9fa48("21816")) {
    {}
  } else {
    stryCov_9fa48("21816");
    return stryMutAct_9fa48("21817") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("21817"), actions.some(stryMutAct_9fa48("21818") ? () => undefined : (stryCov_9fa48("21818"), action => stryMutAct_9fa48("21821") ? action.kind !== "use-raw" : stryMutAct_9fa48("21820") ? false : stryMutAct_9fa48("21819") ? true : (stryCov_9fa48("21819", "21820", "21821"), action.kind === (stryMutAct_9fa48("21822") ? "" : (stryCov_9fa48("21822"), "use-raw"))))));
  }
}
export function shouldRejectLxmfOpportunisticPayload(actions: ReadonlyArray<LxmfOpportunisticPayloadAction>): boolean {
  if (stryMutAct_9fa48("21823")) {
    {}
  } else {
    stryCov_9fa48("21823");
    return stryMutAct_9fa48("21824") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("21824"), actions.some(stryMutAct_9fa48("21825") ? () => undefined : (stryCov_9fa48("21825"), action => stryMutAct_9fa48("21828") ? action.kind !== "reject" : stryMutAct_9fa48("21827") ? false : stryMutAct_9fa48("21826") ? true : (stryCov_9fa48("21826", "21827", "21828"), action.kind === (stryMutAct_9fa48("21829") ? "" : (stryCov_9fa48("21829"), "reject"))))));
  }
}

/** Extract opportunistic payload from step actions; null when no `use-raw`. */
export function lxmfOpportunisticPayloadRawFromActions(actions: ReadonlyArray<LxmfOpportunisticPayloadAction>): Uint8Array | null {
  if (stryMutAct_9fa48("21830")) {
    {}
  } else {
    stryCov_9fa48("21830");
    const action = actions.find(stryMutAct_9fa48("21831") ? () => undefined : (stryCov_9fa48("21831"), entry => stryMutAct_9fa48("21834") ? entry.kind !== "use-raw" : stryMutAct_9fa48("21833") ? false : stryMutAct_9fa48("21832") ? true : (stryCov_9fa48("21832", "21833", "21834"), entry.kind === (stryMutAct_9fa48("21835") ? "" : (stryCov_9fa48("21835"), "use-raw")))));
    return (stryMutAct_9fa48("21838") ? action?.kind !== "use-raw" : stryMutAct_9fa48("21837") ? false : stryMutAct_9fa48("21836") ? true : (stryCov_9fa48("21836", "21837", "21838"), (stryMutAct_9fa48("21839") ? action.kind : (stryCov_9fa48("21839"), action?.kind)) === (stryMutAct_9fa48("21840") ? "" : (stryCov_9fa48("21840"), "use-raw")))) ? action.raw : null;
  }
}

/** Rebuild full LXMF bytes when an opportunistic packet carries only the trailing segment. */
export function lxmfInboundDeliveryBytes(method: LxmfDeliveryMethodValue, destinationHash: Uint8Array, packetData: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("21841")) {
    {}
  } else {
    stryCov_9fa48("21841");
    if (stryMutAct_9fa48("21844") ? method !== LxmfDeliveryMethod.OPPORTUNISTIC : stryMutAct_9fa48("21843") ? false : stryMutAct_9fa48("21842") ? true : (stryCov_9fa48("21842", "21843", "21844"), method === LxmfDeliveryMethod.OPPORTUNISTIC)) {
      if (stryMutAct_9fa48("21845")) {
        {}
      } else {
        stryCov_9fa48("21845");
        return concatBytes(destinationHash, packetData);
      }
    }
    return packetData;
  }
}
export interface LxmfDestinationPrefixed {
  readonly destinationHash: Uint8Array;
  readonly remainder: Uint8Array;
}

/** Split destination-hash-prefixed LXMF / propagation envelopes. */
export function splitLxmfDestinationPrefixed(bytes: Uint8Array): LxmfDestinationPrefixed | null {
  if (stryMutAct_9fa48("21846")) {
    {}
  } else {
    stryCov_9fa48("21846");
    if (stryMutAct_9fa48("21850") ? bytes.length >= LXMF_DESTINATION_LENGTH : stryMutAct_9fa48("21849") ? bytes.length <= LXMF_DESTINATION_LENGTH : stryMutAct_9fa48("21848") ? false : stryMutAct_9fa48("21847") ? true : (stryCov_9fa48("21847", "21848", "21849", "21850"), bytes.length < LXMF_DESTINATION_LENGTH)) {
      if (stryMutAct_9fa48("21851")) {
        {}
      } else {
        stryCov_9fa48("21851");
        return null;
      }
    }
    return stryMutAct_9fa48("21852") ? {} : (stryCov_9fa48("21852"), {
      destinationHash: bytes.subarray(0, LXMF_DESTINATION_LENGTH),
      remainder: bytes.subarray(LXMF_DESTINATION_LENGTH)
    });
  }
}
export function packLxmfDestinationPrefixed(destinationHash: Uint8Array, remainder: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("21853")) {
    {}
  } else {
    stryCov_9fa48("21853");
    if (stryMutAct_9fa48("21856") ? destinationHash.length === LXMF_DESTINATION_LENGTH : stryMutAct_9fa48("21855") ? false : stryMutAct_9fa48("21854") ? true : (stryCov_9fa48("21854", "21855", "21856"), destinationHash.length !== LXMF_DESTINATION_LENGTH)) {
      if (stryMutAct_9fa48("21857")) {
        {}
      } else {
        stryCov_9fa48("21857");
        throw new Error(stryMutAct_9fa48("21858") ? `` : (stryCov_9fa48("21858"), `destination hash must be ${LXMF_DESTINATION_LENGTH} bytes`));
      }
    }
    return concatBytes(destinationHash, remainder);
  }
}

/**
 * LXMF outer-wire pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLxmfWire` reads beside
 * the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackLxmfWireState = Record<string, never>;
export type PackLxmfWireEvent = Event | {
  readonly kind: "lxmf-wire/pack-gate";
  readonly destinationHash: Uint8Array;
  readonly sourceHash: Uint8Array;
  readonly signature: Uint8Array;
  readonly payload: Uint8Array;
};
export type PackLxmfWireAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface PackLxmfWireStepResult {
  readonly state: PackLxmfWireState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLxmfWireAction[];
}
export function initialPackLxmfWireState(): PackLxmfWireState {
  if (stryMutAct_9fa48("21859")) {
    {}
  } else {
    stryCov_9fa48("21859");
    return {};
  }
}
export function stepPackLxmfWireWithActions(state: PackLxmfWireState, event: PackLxmfWireEvent): PackLxmfWireStepResult {
  if (stryMutAct_9fa48("21860")) {
    {}
  } else {
    stryCov_9fa48("21860");
    if (stryMutAct_9fa48("21863") ? event.kind !== "lxmf-wire/pack-gate" : stryMutAct_9fa48("21862") ? false : stryMutAct_9fa48("21861") ? true : (stryCov_9fa48("21861", "21862", "21863"), event.kind === (stryMutAct_9fa48("21864") ? "" : (stryCov_9fa48("21864"), "lxmf-wire/pack-gate")))) {
      if (stryMutAct_9fa48("21865")) {
        {}
      } else {
        stryCov_9fa48("21865");
        try {
          if (stryMutAct_9fa48("21866")) {
            {}
          } else {
            stryCov_9fa48("21866");
            return stryMutAct_9fa48("21867") ? {} : (stryCov_9fa48("21867"), {
              state,
              intents: stryMutAct_9fa48("21868") ? ["Stryker was here"] : (stryCov_9fa48("21868"), []),
              actions: stryMutAct_9fa48("21869") ? [] : (stryCov_9fa48("21869"), [stryMutAct_9fa48("21870") ? {} : (stryCov_9fa48("21870"), {
                kind: stryMutAct_9fa48("21871") ? "" : (stryCov_9fa48("21871"), "use-raw"),
                raw: packLxmfWire(stryMutAct_9fa48("21872") ? {} : (stryCov_9fa48("21872"), {
                  destinationHash: event.destinationHash,
                  sourceHash: event.sourceHash,
                  signature: event.signature,
                  payload: event.payload
                }))
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("21873")) {
            {}
          } else {
            stryCov_9fa48("21873");
            return stryMutAct_9fa48("21874") ? {} : (stryCov_9fa48("21874"), {
              state,
              intents: stryMutAct_9fa48("21875") ? ["Stryker was here"] : (stryCov_9fa48("21875"), []),
              actions: stryMutAct_9fa48("21876") ? [] : (stryCov_9fa48("21876"), [stryMutAct_9fa48("21877") ? {} : (stryCov_9fa48("21877"), {
                kind: stryMutAct_9fa48("21878") ? "" : (stryCov_9fa48("21878"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("21879") ? {} : (stryCov_9fa48("21879"), {
      state,
      intents: stryMutAct_9fa48("21880") ? ["Stryker was here"] : (stryCov_9fa48("21880"), []),
      actions: stryMutAct_9fa48("21881") ? ["Stryker was here"] : (stryCov_9fa48("21881"), [])
    });
  }
}
export function shouldUsePackLxmfWire(actions: ReadonlyArray<PackLxmfWireAction>): boolean {
  if (stryMutAct_9fa48("21882")) {
    {}
  } else {
    stryCov_9fa48("21882");
    return stryMutAct_9fa48("21883") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("21883"), actions.some(stryMutAct_9fa48("21884") ? () => undefined : (stryCov_9fa48("21884"), action => stryMutAct_9fa48("21887") ? action.kind !== "use-raw" : stryMutAct_9fa48("21886") ? false : stryMutAct_9fa48("21885") ? true : (stryCov_9fa48("21885", "21886", "21887"), action.kind === (stryMutAct_9fa48("21888") ? "" : (stryCov_9fa48("21888"), "use-raw"))))));
  }
}
export function shouldRejectPackLxmfWire(actions: ReadonlyArray<PackLxmfWireAction>): boolean {
  if (stryMutAct_9fa48("21889")) {
    {}
  } else {
    stryCov_9fa48("21889");
    return stryMutAct_9fa48("21890") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("21890"), actions.some(stryMutAct_9fa48("21891") ? () => undefined : (stryCov_9fa48("21891"), action => stryMutAct_9fa48("21894") ? action.kind !== "reject" : stryMutAct_9fa48("21893") ? false : stryMutAct_9fa48("21892") ? true : (stryCov_9fa48("21892", "21893", "21894"), action.kind === (stryMutAct_9fa48("21895") ? "" : (stryCov_9fa48("21895"), "reject"))))));
  }
}

/** Extract packed LXMF wire bytes from step actions; null when no `use-raw`. */
export function packLxmfWireRawFromActions(actions: ReadonlyArray<PackLxmfWireAction>): Uint8Array | null {
  if (stryMutAct_9fa48("21896")) {
    {}
  } else {
    stryCov_9fa48("21896");
    const action = actions.find(stryMutAct_9fa48("21897") ? () => undefined : (stryCov_9fa48("21897"), entry => stryMutAct_9fa48("21900") ? entry.kind !== "use-raw" : stryMutAct_9fa48("21899") ? false : stryMutAct_9fa48("21898") ? true : (stryCov_9fa48("21898", "21899", "21900"), entry.kind === (stryMutAct_9fa48("21901") ? "" : (stryCov_9fa48("21901"), "use-raw")))));
    return (stryMutAct_9fa48("21904") ? action?.kind !== "use-raw" : stryMutAct_9fa48("21903") ? false : stryMutAct_9fa48("21902") ? true : (stryCov_9fa48("21902", "21903", "21904"), (stryMutAct_9fa48("21905") ? action.kind : (stryCov_9fa48("21905"), action?.kind)) === (stryMutAct_9fa48("21906") ? "" : (stryCov_9fa48("21906"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * LXMF outer-wire split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitLxmfWire` reads beside
 * the step). Short frames become `reject`.
 */
export type SplitLxmfWireState = Record<string, never>;
export type SplitLxmfWireEvent = Event | {
  readonly kind: "lxmf-wire/split-gate";
  readonly bytes: Uint8Array;
};
export type SplitLxmfWireAction = {
  readonly kind: "use-fields";
  readonly fields: LxmfWireFields;
} | {
  readonly kind: "reject";
};
export interface SplitLxmfWireStepResult {
  readonly state: SplitLxmfWireState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitLxmfWireAction[];
}
export function initialSplitLxmfWireState(): SplitLxmfWireState {
  if (stryMutAct_9fa48("21907")) {
    {}
  } else {
    stryCov_9fa48("21907");
    return {};
  }
}
export function stepSplitLxmfWireWithActions(state: SplitLxmfWireState, event: SplitLxmfWireEvent): SplitLxmfWireStepResult {
  if (stryMutAct_9fa48("21908")) {
    {}
  } else {
    stryCov_9fa48("21908");
    if (stryMutAct_9fa48("21911") ? event.kind !== "lxmf-wire/split-gate" : stryMutAct_9fa48("21910") ? false : stryMutAct_9fa48("21909") ? true : (stryCov_9fa48("21909", "21910", "21911"), event.kind === (stryMutAct_9fa48("21912") ? "" : (stryCov_9fa48("21912"), "lxmf-wire/split-gate")))) {
      if (stryMutAct_9fa48("21913")) {
        {}
      } else {
        stryCov_9fa48("21913");
        const fields = splitLxmfWire(event.bytes);
        if (stryMutAct_9fa48("21916") ? fields !== null : stryMutAct_9fa48("21915") ? false : stryMutAct_9fa48("21914") ? true : (stryCov_9fa48("21914", "21915", "21916"), fields === null)) {
          if (stryMutAct_9fa48("21917")) {
            {}
          } else {
            stryCov_9fa48("21917");
            return stryMutAct_9fa48("21918") ? {} : (stryCov_9fa48("21918"), {
              state,
              intents: stryMutAct_9fa48("21919") ? ["Stryker was here"] : (stryCov_9fa48("21919"), []),
              actions: stryMutAct_9fa48("21920") ? [] : (stryCov_9fa48("21920"), [stryMutAct_9fa48("21921") ? {} : (stryCov_9fa48("21921"), {
                kind: stryMutAct_9fa48("21922") ? "" : (stryCov_9fa48("21922"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("21923") ? {} : (stryCov_9fa48("21923"), {
          state,
          intents: stryMutAct_9fa48("21924") ? ["Stryker was here"] : (stryCov_9fa48("21924"), []),
          actions: stryMutAct_9fa48("21925") ? [] : (stryCov_9fa48("21925"), [stryMutAct_9fa48("21926") ? {} : (stryCov_9fa48("21926"), {
            kind: stryMutAct_9fa48("21927") ? "" : (stryCov_9fa48("21927"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("21928") ? {} : (stryCov_9fa48("21928"), {
      state,
      intents: stryMutAct_9fa48("21929") ? ["Stryker was here"] : (stryCov_9fa48("21929"), []),
      actions: stryMutAct_9fa48("21930") ? ["Stryker was here"] : (stryCov_9fa48("21930"), [])
    });
  }
}
export function shouldUseSplitLxmfWire(actions: ReadonlyArray<SplitLxmfWireAction>): boolean {
  if (stryMutAct_9fa48("21931")) {
    {}
  } else {
    stryCov_9fa48("21931");
    return stryMutAct_9fa48("21932") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("21932"), actions.some(stryMutAct_9fa48("21933") ? () => undefined : (stryCov_9fa48("21933"), action => stryMutAct_9fa48("21936") ? action.kind !== "use-fields" : stryMutAct_9fa48("21935") ? false : stryMutAct_9fa48("21934") ? true : (stryCov_9fa48("21934", "21935", "21936"), action.kind === (stryMutAct_9fa48("21937") ? "" : (stryCov_9fa48("21937"), "use-fields"))))));
  }
}
export function shouldRejectSplitLxmfWire(actions: ReadonlyArray<SplitLxmfWireAction>): boolean {
  if (stryMutAct_9fa48("21938")) {
    {}
  } else {
    stryCov_9fa48("21938");
    return stryMutAct_9fa48("21939") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("21939"), actions.some(stryMutAct_9fa48("21940") ? () => undefined : (stryCov_9fa48("21940"), action => stryMutAct_9fa48("21943") ? action.kind !== "reject" : stryMutAct_9fa48("21942") ? false : stryMutAct_9fa48("21941") ? true : (stryCov_9fa48("21941", "21942", "21943"), action.kind === (stryMutAct_9fa48("21944") ? "" : (stryCov_9fa48("21944"), "reject"))))));
  }
}

/** Extract split LXMF wire fields from step actions; null when no `use-fields`. */
export function lxmfWireFieldsFromActions(actions: ReadonlyArray<SplitLxmfWireAction>): LxmfWireFields | null {
  if (stryMutAct_9fa48("21945")) {
    {}
  } else {
    stryCov_9fa48("21945");
    const action = actions.find(stryMutAct_9fa48("21946") ? () => undefined : (stryCov_9fa48("21946"), entry => stryMutAct_9fa48("21949") ? entry.kind !== "use-fields" : stryMutAct_9fa48("21948") ? false : stryMutAct_9fa48("21947") ? true : (stryCov_9fa48("21947", "21948", "21949"), entry.kind === (stryMutAct_9fa48("21950") ? "" : (stryCov_9fa48("21950"), "use-fields")))));
    return (stryMutAct_9fa48("21953") ? action?.kind !== "use-fields" : stryMutAct_9fa48("21952") ? false : stryMutAct_9fa48("21951") ? true : (stryCov_9fa48("21951", "21952", "21953"), (stryMutAct_9fa48("21954") ? action.kind : (stryCov_9fa48("21954"), action?.kind)) === (stryMutAct_9fa48("21955") ? "" : (stryCov_9fa48("21955"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Destination-prefixed pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLxmfDestinationPrefixed`
 * reads beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackLxmfDestinationPrefixedState = Record<string, never>;
export type PackLxmfDestinationPrefixedEvent = Event | {
  readonly kind: "lxmf-destination-prefixed/pack-gate";
  readonly destinationHash: Uint8Array;
  readonly remainder: Uint8Array;
};
export type PackLxmfDestinationPrefixedAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface PackLxmfDestinationPrefixedStepResult {
  readonly state: PackLxmfDestinationPrefixedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLxmfDestinationPrefixedAction[];
}
export function initialPackLxmfDestinationPrefixedState(): PackLxmfDestinationPrefixedState {
  if (stryMutAct_9fa48("21956")) {
    {}
  } else {
    stryCov_9fa48("21956");
    return {};
  }
}
export function stepPackLxmfDestinationPrefixedWithActions(state: PackLxmfDestinationPrefixedState, event: PackLxmfDestinationPrefixedEvent): PackLxmfDestinationPrefixedStepResult {
  if (stryMutAct_9fa48("21957")) {
    {}
  } else {
    stryCov_9fa48("21957");
    if (stryMutAct_9fa48("21960") ? event.kind !== "lxmf-destination-prefixed/pack-gate" : stryMutAct_9fa48("21959") ? false : stryMutAct_9fa48("21958") ? true : (stryCov_9fa48("21958", "21959", "21960"), event.kind === (stryMutAct_9fa48("21961") ? "" : (stryCov_9fa48("21961"), "lxmf-destination-prefixed/pack-gate")))) {
      if (stryMutAct_9fa48("21962")) {
        {}
      } else {
        stryCov_9fa48("21962");
        try {
          if (stryMutAct_9fa48("21963")) {
            {}
          } else {
            stryCov_9fa48("21963");
            return stryMutAct_9fa48("21964") ? {} : (stryCov_9fa48("21964"), {
              state,
              intents: stryMutAct_9fa48("21965") ? ["Stryker was here"] : (stryCov_9fa48("21965"), []),
              actions: stryMutAct_9fa48("21966") ? [] : (stryCov_9fa48("21966"), [stryMutAct_9fa48("21967") ? {} : (stryCov_9fa48("21967"), {
                kind: stryMutAct_9fa48("21968") ? "" : (stryCov_9fa48("21968"), "use-raw"),
                raw: packLxmfDestinationPrefixed(event.destinationHash, event.remainder)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("21969")) {
            {}
          } else {
            stryCov_9fa48("21969");
            return stryMutAct_9fa48("21970") ? {} : (stryCov_9fa48("21970"), {
              state,
              intents: stryMutAct_9fa48("21971") ? ["Stryker was here"] : (stryCov_9fa48("21971"), []),
              actions: stryMutAct_9fa48("21972") ? [] : (stryCov_9fa48("21972"), [stryMutAct_9fa48("21973") ? {} : (stryCov_9fa48("21973"), {
                kind: stryMutAct_9fa48("21974") ? "" : (stryCov_9fa48("21974"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("21975") ? {} : (stryCov_9fa48("21975"), {
      state,
      intents: stryMutAct_9fa48("21976") ? ["Stryker was here"] : (stryCov_9fa48("21976"), []),
      actions: stryMutAct_9fa48("21977") ? ["Stryker was here"] : (stryCov_9fa48("21977"), [])
    });
  }
}
export function shouldUsePackLxmfDestinationPrefixed(actions: ReadonlyArray<PackLxmfDestinationPrefixedAction>): boolean {
  if (stryMutAct_9fa48("21978")) {
    {}
  } else {
    stryCov_9fa48("21978");
    return stryMutAct_9fa48("21979") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("21979"), actions.some(stryMutAct_9fa48("21980") ? () => undefined : (stryCov_9fa48("21980"), action => stryMutAct_9fa48("21983") ? action.kind !== "use-raw" : stryMutAct_9fa48("21982") ? false : stryMutAct_9fa48("21981") ? true : (stryCov_9fa48("21981", "21982", "21983"), action.kind === (stryMutAct_9fa48("21984") ? "" : (stryCov_9fa48("21984"), "use-raw"))))));
  }
}
export function shouldRejectPackLxmfDestinationPrefixed(actions: ReadonlyArray<PackLxmfDestinationPrefixedAction>): boolean {
  if (stryMutAct_9fa48("21985")) {
    {}
  } else {
    stryCov_9fa48("21985");
    return stryMutAct_9fa48("21986") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("21986"), actions.some(stryMutAct_9fa48("21987") ? () => undefined : (stryCov_9fa48("21987"), action => stryMutAct_9fa48("21990") ? action.kind !== "reject" : stryMutAct_9fa48("21989") ? false : stryMutAct_9fa48("21988") ? true : (stryCov_9fa48("21988", "21989", "21990"), action.kind === (stryMutAct_9fa48("21991") ? "" : (stryCov_9fa48("21991"), "reject"))))));
  }
}

/** Extract packed destination-prefixed bytes from step actions; null when no `use-raw`. */
export function packLxmfDestinationPrefixedRawFromActions(actions: ReadonlyArray<PackLxmfDestinationPrefixedAction>): Uint8Array | null {
  if (stryMutAct_9fa48("21992")) {
    {}
  } else {
    stryCov_9fa48("21992");
    const action = actions.find(stryMutAct_9fa48("21993") ? () => undefined : (stryCov_9fa48("21993"), entry => stryMutAct_9fa48("21996") ? entry.kind !== "use-raw" : stryMutAct_9fa48("21995") ? false : stryMutAct_9fa48("21994") ? true : (stryCov_9fa48("21994", "21995", "21996"), entry.kind === (stryMutAct_9fa48("21997") ? "" : (stryCov_9fa48("21997"), "use-raw")))));
    return (stryMutAct_9fa48("22000") ? action?.kind !== "use-raw" : stryMutAct_9fa48("21999") ? false : stryMutAct_9fa48("21998") ? true : (stryCov_9fa48("21998", "21999", "22000"), (stryMutAct_9fa48("22001") ? action.kind : (stryCov_9fa48("22001"), action?.kind)) === (stryMutAct_9fa48("22002") ? "" : (stryCov_9fa48("22002"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Destination-prefixed split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitLxmfDestinationPrefixed`
 * reads beside the step). Short frames become `reject`.
 */
export type SplitLxmfDestinationPrefixedState = Record<string, never>;
export type SplitLxmfDestinationPrefixedEvent = Event | {
  readonly kind: "lxmf-destination-prefixed/split-gate";
  readonly bytes: Uint8Array;
};
export type SplitLxmfDestinationPrefixedAction = {
  readonly kind: "use-fields";
  readonly fields: LxmfDestinationPrefixed;
} | {
  readonly kind: "reject";
};
export interface SplitLxmfDestinationPrefixedStepResult {
  readonly state: SplitLxmfDestinationPrefixedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitLxmfDestinationPrefixedAction[];
}
export function initialSplitLxmfDestinationPrefixedState(): SplitLxmfDestinationPrefixedState {
  if (stryMutAct_9fa48("22003")) {
    {}
  } else {
    stryCov_9fa48("22003");
    return {};
  }
}
export function stepSplitLxmfDestinationPrefixedWithActions(state: SplitLxmfDestinationPrefixedState, event: SplitLxmfDestinationPrefixedEvent): SplitLxmfDestinationPrefixedStepResult {
  if (stryMutAct_9fa48("22004")) {
    {}
  } else {
    stryCov_9fa48("22004");
    if (stryMutAct_9fa48("22007") ? event.kind !== "lxmf-destination-prefixed/split-gate" : stryMutAct_9fa48("22006") ? false : stryMutAct_9fa48("22005") ? true : (stryCov_9fa48("22005", "22006", "22007"), event.kind === (stryMutAct_9fa48("22008") ? "" : (stryCov_9fa48("22008"), "lxmf-destination-prefixed/split-gate")))) {
      if (stryMutAct_9fa48("22009")) {
        {}
      } else {
        stryCov_9fa48("22009");
        const fields = splitLxmfDestinationPrefixed(event.bytes);
        if (stryMutAct_9fa48("22012") ? fields !== null : stryMutAct_9fa48("22011") ? false : stryMutAct_9fa48("22010") ? true : (stryCov_9fa48("22010", "22011", "22012"), fields === null)) {
          if (stryMutAct_9fa48("22013")) {
            {}
          } else {
            stryCov_9fa48("22013");
            return stryMutAct_9fa48("22014") ? {} : (stryCov_9fa48("22014"), {
              state,
              intents: stryMutAct_9fa48("22015") ? ["Stryker was here"] : (stryCov_9fa48("22015"), []),
              actions: stryMutAct_9fa48("22016") ? [] : (stryCov_9fa48("22016"), [stryMutAct_9fa48("22017") ? {} : (stryCov_9fa48("22017"), {
                kind: stryMutAct_9fa48("22018") ? "" : (stryCov_9fa48("22018"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("22019") ? {} : (stryCov_9fa48("22019"), {
          state,
          intents: stryMutAct_9fa48("22020") ? ["Stryker was here"] : (stryCov_9fa48("22020"), []),
          actions: stryMutAct_9fa48("22021") ? [] : (stryCov_9fa48("22021"), [stryMutAct_9fa48("22022") ? {} : (stryCov_9fa48("22022"), {
            kind: stryMutAct_9fa48("22023") ? "" : (stryCov_9fa48("22023"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("22024") ? {} : (stryCov_9fa48("22024"), {
      state,
      intents: stryMutAct_9fa48("22025") ? ["Stryker was here"] : (stryCov_9fa48("22025"), []),
      actions: stryMutAct_9fa48("22026") ? ["Stryker was here"] : (stryCov_9fa48("22026"), [])
    });
  }
}
export function shouldUseSplitLxmfDestinationPrefixed(actions: ReadonlyArray<SplitLxmfDestinationPrefixedAction>): boolean {
  if (stryMutAct_9fa48("22027")) {
    {}
  } else {
    stryCov_9fa48("22027");
    return stryMutAct_9fa48("22028") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("22028"), actions.some(stryMutAct_9fa48("22029") ? () => undefined : (stryCov_9fa48("22029"), action => stryMutAct_9fa48("22032") ? action.kind !== "use-fields" : stryMutAct_9fa48("22031") ? false : stryMutAct_9fa48("22030") ? true : (stryCov_9fa48("22030", "22031", "22032"), action.kind === (stryMutAct_9fa48("22033") ? "" : (stryCov_9fa48("22033"), "use-fields"))))));
  }
}
export function shouldRejectSplitLxmfDestinationPrefixed(actions: ReadonlyArray<SplitLxmfDestinationPrefixedAction>): boolean {
  if (stryMutAct_9fa48("22034")) {
    {}
  } else {
    stryCov_9fa48("22034");
    return stryMutAct_9fa48("22035") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("22035"), actions.some(stryMutAct_9fa48("22036") ? () => undefined : (stryCov_9fa48("22036"), action => stryMutAct_9fa48("22039") ? action.kind !== "reject" : stryMutAct_9fa48("22038") ? false : stryMutAct_9fa48("22037") ? true : (stryCov_9fa48("22037", "22038", "22039"), action.kind === (stryMutAct_9fa48("22040") ? "" : (stryCov_9fa48("22040"), "reject"))))));
  }
}

/** Extract split destination-prefixed fields from step actions; null when no `use-fields`. */
export function lxmfDestinationPrefixedFieldsFromActions(actions: ReadonlyArray<SplitLxmfDestinationPrefixedAction>): LxmfDestinationPrefixed | null {
  if (stryMutAct_9fa48("22041")) {
    {}
  } else {
    stryCov_9fa48("22041");
    const action = actions.find(stryMutAct_9fa48("22042") ? () => undefined : (stryCov_9fa48("22042"), entry => stryMutAct_9fa48("22045") ? entry.kind !== "use-fields" : stryMutAct_9fa48("22044") ? false : stryMutAct_9fa48("22043") ? true : (stryCov_9fa48("22043", "22044", "22045"), entry.kind === (stryMutAct_9fa48("22046") ? "" : (stryCov_9fa48("22046"), "use-fields")))));
    return (stryMutAct_9fa48("22049") ? action?.kind !== "use-fields" : stryMutAct_9fa48("22048") ? false : stryMutAct_9fa48("22047") ? true : (stryCov_9fa48("22047", "22048", "22049"), (stryMutAct_9fa48("22050") ? action.kind : (stryCov_9fa48("22050"), action?.kind)) === (stryMutAct_9fa48("22051") ? "" : (stryCov_9fa48("22051"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Inbound delivery rebuild is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `lxmfInboundDeliveryBytes`
 * reads beside the step).
 */
export type LxmfInboundDeliveryState = Record<string, never>;
export type LxmfInboundDeliveryEvent = Event | {
  readonly kind: "lxmf-inbound-delivery/rebuild-gate";
  readonly method: LxmfDeliveryMethodValue;
  readonly destinationHash: Uint8Array;
  readonly packetData: Uint8Array;
};
export type LxmfInboundDeliveryAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface LxmfInboundDeliveryStepResult {
  readonly state: LxmfInboundDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfInboundDeliveryAction[];
}
export function initialLxmfInboundDeliveryState(): LxmfInboundDeliveryState {
  if (stryMutAct_9fa48("22052")) {
    {}
  } else {
    stryCov_9fa48("22052");
    return {};
  }
}
export function stepLxmfInboundDeliveryWithActions(state: LxmfInboundDeliveryState, event: LxmfInboundDeliveryEvent): LxmfInboundDeliveryStepResult {
  if (stryMutAct_9fa48("22053")) {
    {}
  } else {
    stryCov_9fa48("22053");
    if (stryMutAct_9fa48("22056") ? event.kind !== "lxmf-inbound-delivery/rebuild-gate" : stryMutAct_9fa48("22055") ? false : stryMutAct_9fa48("22054") ? true : (stryCov_9fa48("22054", "22055", "22056"), event.kind === (stryMutAct_9fa48("22057") ? "" : (stryCov_9fa48("22057"), "lxmf-inbound-delivery/rebuild-gate")))) {
      if (stryMutAct_9fa48("22058")) {
        {}
      } else {
        stryCov_9fa48("22058");
        return stryMutAct_9fa48("22059") ? {} : (stryCov_9fa48("22059"), {
          state,
          intents: stryMutAct_9fa48("22060") ? ["Stryker was here"] : (stryCov_9fa48("22060"), []),
          actions: stryMutAct_9fa48("22061") ? [] : (stryCov_9fa48("22061"), [stryMutAct_9fa48("22062") ? {} : (stryCov_9fa48("22062"), {
            kind: stryMutAct_9fa48("22063") ? "" : (stryCov_9fa48("22063"), "use-raw"),
            raw: lxmfInboundDeliveryBytes(event.method, event.destinationHash, event.packetData)
          })])
        });
      }
    }
    return stryMutAct_9fa48("22064") ? {} : (stryCov_9fa48("22064"), {
      state,
      intents: stryMutAct_9fa48("22065") ? ["Stryker was here"] : (stryCov_9fa48("22065"), []),
      actions: stryMutAct_9fa48("22066") ? ["Stryker was here"] : (stryCov_9fa48("22066"), [])
    });
  }
}
export function shouldUseLxmfInboundDelivery(actions: ReadonlyArray<LxmfInboundDeliveryAction>): boolean {
  if (stryMutAct_9fa48("22067")) {
    {}
  } else {
    stryCov_9fa48("22067");
    return stryMutAct_9fa48("22068") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("22068"), actions.some(stryMutAct_9fa48("22069") ? () => undefined : (stryCov_9fa48("22069"), action => stryMutAct_9fa48("22072") ? action.kind !== "use-raw" : stryMutAct_9fa48("22071") ? false : stryMutAct_9fa48("22070") ? true : (stryCov_9fa48("22070", "22071", "22072"), action.kind === (stryMutAct_9fa48("22073") ? "" : (stryCov_9fa48("22073"), "use-raw"))))));
  }
}

/** Extract inbound-delivery rebuild bytes from step actions; null when no `use-raw`. */
export function lxmfInboundDeliveryRawFromActions(actions: ReadonlyArray<LxmfInboundDeliveryAction>): Uint8Array | null {
  if (stryMutAct_9fa48("22074")) {
    {}
  } else {
    stryCov_9fa48("22074");
    const action = actions.find(stryMutAct_9fa48("22075") ? () => undefined : (stryCov_9fa48("22075"), entry => stryMutAct_9fa48("22078") ? entry.kind !== "use-raw" : stryMutAct_9fa48("22077") ? false : stryMutAct_9fa48("22076") ? true : (stryCov_9fa48("22076", "22077", "22078"), entry.kind === (stryMutAct_9fa48("22079") ? "" : (stryCov_9fa48("22079"), "use-raw")))));
    return (stryMutAct_9fa48("22082") ? action?.kind !== "use-raw" : stryMutAct_9fa48("22081") ? false : stryMutAct_9fa48("22080") ? true : (stryCov_9fa48("22080", "22081", "22082"), (stryMutAct_9fa48("22083") ? action.kind : (stryCov_9fa48("22083"), action?.kind)) === (stryMutAct_9fa48("22084") ? "" : (stryCov_9fa48("22084"), "use-raw")))) ? action.raw : null;
  }
}