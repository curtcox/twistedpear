/**
 * Pure RNS packet proof framing (explicit hash+sig vs signature-only).
 * Signing / verification stay at the crypto adapter edge.
 * Pack / split / hash-match / packet-type / packet-receipt proof-accept
 * conclusions leave via machine actions (no ad-hoc `packPacketProof` /
 * `splitPacketProof` / `packetProofHashMatches` / `isPacketTypeProof` /
 * `planPacketReceiptProofAccept` reads beside the step). Plan nested via
 * {@link stepPacketReceiptProofAcceptPlanWithActions}.
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
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { PACKET_TYPE_PROOF } from "./packet-header.js";
import { equalByteArrays } from "./path-table.js";
export const PACKET_FULL_HASH_SIZE = 32;
export const PACKET_SIGNATURE_SIZE = 64;
export const PACKET_EXPLICIT_PROOF_SIZE = stryMutAct_9fa48("23516") ? PACKET_FULL_HASH_SIZE - PACKET_SIGNATURE_SIZE : (stryCov_9fa48("23516"), PACKET_FULL_HASH_SIZE + PACKET_SIGNATURE_SIZE);
export type PacketProofFields = {
  readonly kind: "explicit";
  readonly packetHash: Uint8Array;
  readonly signature: Uint8Array;
} | {
  readonly kind: "implicit";
  readonly signature: Uint8Array;
};

/** Whether a packet is a PROOF type eligible for receipt validation. */
export function isPacketTypeProof(packetType: number): boolean {
  if (stryMutAct_9fa48("23517")) {
    {}
  } else {
    stryCov_9fa48("23517");
    return stryMutAct_9fa48("23520") ? packetType !== PACKET_TYPE_PROOF : stryMutAct_9fa48("23519") ? false : stryMutAct_9fa48("23518") ? true : (stryCov_9fa48("23518", "23519", "23520"), packetType === PACKET_TYPE_PROOF);
  }
}

/**
 * Packet-type proof gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isPacketTypeProof` reads
 * beside the step).
 */
export type PacketTypeProofState = Record<string, never>;
export type PacketTypeProofEvent = Event | {
  readonly kind: "packet-proof/packet-type-gate";
  readonly packetType: number;
};
export type PacketTypeProofAction = {
  readonly kind: "proof";
} | {
  readonly kind: "other";
};
export interface PacketTypeProofStepResult {
  readonly state: PacketTypeProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketTypeProofAction[];
}
export function initialPacketTypeProofState(): PacketTypeProofState {
  if (stryMutAct_9fa48("23521")) {
    {}
  } else {
    stryCov_9fa48("23521");
    return {};
  }
}
export function stepPacketTypeProofWithActions(state: PacketTypeProofState, event: PacketTypeProofEvent): PacketTypeProofStepResult {
  if (stryMutAct_9fa48("23522")) {
    {}
  } else {
    stryCov_9fa48("23522");
    if (stryMutAct_9fa48("23525") ? event.kind !== "packet-proof/packet-type-gate" : stryMutAct_9fa48("23524") ? false : stryMutAct_9fa48("23523") ? true : (stryCov_9fa48("23523", "23524", "23525"), event.kind === (stryMutAct_9fa48("23526") ? "" : (stryCov_9fa48("23526"), "packet-proof/packet-type-gate")))) {
      if (stryMutAct_9fa48("23527")) {
        {}
      } else {
        stryCov_9fa48("23527");
        return stryMutAct_9fa48("23528") ? {} : (stryCov_9fa48("23528"), {
          state,
          intents: stryMutAct_9fa48("23529") ? ["Stryker was here"] : (stryCov_9fa48("23529"), []),
          actions: stryMutAct_9fa48("23530") ? [] : (stryCov_9fa48("23530"), [stryMutAct_9fa48("23531") ? {} : (stryCov_9fa48("23531"), {
            kind: isPacketTypeProof(event.packetType) ? stryMutAct_9fa48("23532") ? "" : (stryCov_9fa48("23532"), "proof") : stryMutAct_9fa48("23533") ? "" : (stryCov_9fa48("23533"), "other")
          })])
        });
      }
    }
    return stryMutAct_9fa48("23534") ? {} : (stryCov_9fa48("23534"), {
      state,
      intents: stryMutAct_9fa48("23535") ? ["Stryker was here"] : (stryCov_9fa48("23535"), []),
      actions: stryMutAct_9fa48("23536") ? ["Stryker was here"] : (stryCov_9fa48("23536"), [])
    });
  }
}
export function shouldTreatPacketTypeProof(actions: ReadonlyArray<PacketTypeProofAction>): boolean {
  if (stryMutAct_9fa48("23537")) {
    {}
  } else {
    stryCov_9fa48("23537");
    return stryMutAct_9fa48("23538") ? actions.every(action => action.kind === "proof") : (stryCov_9fa48("23538"), actions.some(stryMutAct_9fa48("23539") ? () => undefined : (stryCov_9fa48("23539"), action => stryMutAct_9fa48("23542") ? action.kind !== "proof" : stryMutAct_9fa48("23541") ? false : stryMutAct_9fa48("23540") ? true : (stryCov_9fa48("23540", "23541", "23542"), action.kind === (stryMutAct_9fa48("23543") ? "" : (stryCov_9fa48("23543"), "proof"))))));
  }
}
export function shouldTreatPacketTypeOther(actions: ReadonlyArray<PacketTypeProofAction>): boolean {
  if (stryMutAct_9fa48("23544")) {
    {}
  } else {
    stryCov_9fa48("23544");
    return stryMutAct_9fa48("23545") ? actions.every(action => action.kind === "other") : (stryCov_9fa48("23545"), actions.some(stryMutAct_9fa48("23546") ? () => undefined : (stryCov_9fa48("23546"), action => stryMutAct_9fa48("23549") ? action.kind !== "other" : stryMutAct_9fa48("23548") ? false : stryMutAct_9fa48("23547") ? true : (stryCov_9fa48("23547", "23548", "23549"), action.kind === (stryMutAct_9fa48("23550") ? "" : (stryCov_9fa48("23550"), "other"))))));
  }
}
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("23551")) {
    {}
  } else {
    stryCov_9fa48("23551");
    const length = parts.reduce(stryMutAct_9fa48("23552") ? () => undefined : (stryCov_9fa48("23552"), (total, part) => stryMutAct_9fa48("23553") ? total - part.length : (stryCov_9fa48("23553"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("23554")) {
        {}
      } else {
        stryCov_9fa48("23554");
        output.set(part, offset);
        stryMutAct_9fa48("23555") ? offset -= part.length : (stryCov_9fa48("23555"), offset += part.length);
      }
    }
    return output;
  }
}
export function packPacketProof(packetHash: Uint8Array, signature: Uint8Array, explicit: boolean = stryMutAct_9fa48("23556") ? false : (stryCov_9fa48("23556"), true)): Uint8Array {
  if (stryMutAct_9fa48("23557")) {
    {}
  } else {
    stryCov_9fa48("23557");
    if (stryMutAct_9fa48("23560") ? packetHash.length === PACKET_FULL_HASH_SIZE : stryMutAct_9fa48("23559") ? false : stryMutAct_9fa48("23558") ? true : (stryCov_9fa48("23558", "23559", "23560"), packetHash.length !== PACKET_FULL_HASH_SIZE)) {
      if (stryMutAct_9fa48("23561")) {
        {}
      } else {
        stryCov_9fa48("23561");
        throw new Error(stryMutAct_9fa48("23562") ? `` : (stryCov_9fa48("23562"), `packet hash must be ${PACKET_FULL_HASH_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("23565") ? signature.length === PACKET_SIGNATURE_SIZE : stryMutAct_9fa48("23564") ? false : stryMutAct_9fa48("23563") ? true : (stryCov_9fa48("23563", "23564", "23565"), signature.length !== PACKET_SIGNATURE_SIZE)) {
      if (stryMutAct_9fa48("23566")) {
        {}
      } else {
        stryCov_9fa48("23566");
        throw new Error(stryMutAct_9fa48("23567") ? `` : (stryCov_9fa48("23567"), `signature must be ${PACKET_SIGNATURE_SIZE} bytes`));
      }
    }
    return explicit ? concatBytes(packetHash, signature) : signature;
  }
}
export function splitPacketProof(proof: Uint8Array): PacketProofFields | null {
  if (stryMutAct_9fa48("23568")) {
    {}
  } else {
    stryCov_9fa48("23568");
    if (stryMutAct_9fa48("23571") ? proof.length !== PACKET_EXPLICIT_PROOF_SIZE : stryMutAct_9fa48("23570") ? false : stryMutAct_9fa48("23569") ? true : (stryCov_9fa48("23569", "23570", "23571"), proof.length === PACKET_EXPLICIT_PROOF_SIZE)) {
      if (stryMutAct_9fa48("23572")) {
        {}
      } else {
        stryCov_9fa48("23572");
        return stryMutAct_9fa48("23573") ? {} : (stryCov_9fa48("23573"), {
          kind: stryMutAct_9fa48("23574") ? "" : (stryCov_9fa48("23574"), "explicit"),
          packetHash: proof.subarray(0, PACKET_FULL_HASH_SIZE),
          signature: proof.subarray(PACKET_FULL_HASH_SIZE)
        });
      }
    }
    if (stryMutAct_9fa48("23577") ? proof.length !== PACKET_SIGNATURE_SIZE : stryMutAct_9fa48("23576") ? false : stryMutAct_9fa48("23575") ? true : (stryCov_9fa48("23575", "23576", "23577"), proof.length === PACKET_SIGNATURE_SIZE)) {
      if (stryMutAct_9fa48("23578")) {
        {}
      } else {
        stryCov_9fa48("23578");
        return stryMutAct_9fa48("23579") ? {} : (stryCov_9fa48("23579"), {
          kind: stryMutAct_9fa48("23580") ? "" : (stryCov_9fa48("23580"), "implicit"),
          signature: proof
        });
      }
    }
    return null;
  }
}

/**
 * Packet-proof pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packPacketProof`
 * reads beside the step).
 */
export type PackPacketProofState = Record<string, never>;
export type PackPacketProofEvent = Event | {
  readonly kind: "packet-proof/pack-gate";
  readonly packetHash: Uint8Array;
  readonly signature: Uint8Array;
  readonly explicit: boolean;
};
export type PackPacketProofAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackPacketProofStepResult {
  readonly state: PackPacketProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackPacketProofAction[];
}
export function initialPackPacketProofState(): PackPacketProofState {
  if (stryMutAct_9fa48("23581")) {
    {}
  } else {
    stryCov_9fa48("23581");
    return {};
  }
}
export function stepPackPacketProofWithActions(state: PackPacketProofState, event: PackPacketProofEvent): PackPacketProofStepResult {
  if (stryMutAct_9fa48("23582")) {
    {}
  } else {
    stryCov_9fa48("23582");
    if (stryMutAct_9fa48("23585") ? event.kind !== "packet-proof/pack-gate" : stryMutAct_9fa48("23584") ? false : stryMutAct_9fa48("23583") ? true : (stryCov_9fa48("23583", "23584", "23585"), event.kind === (stryMutAct_9fa48("23586") ? "" : (stryCov_9fa48("23586"), "packet-proof/pack-gate")))) {
      if (stryMutAct_9fa48("23587")) {
        {}
      } else {
        stryCov_9fa48("23587");
        return stryMutAct_9fa48("23588") ? {} : (stryCov_9fa48("23588"), {
          state,
          intents: stryMutAct_9fa48("23589") ? ["Stryker was here"] : (stryCov_9fa48("23589"), []),
          actions: stryMutAct_9fa48("23590") ? [] : (stryCov_9fa48("23590"), [stryMutAct_9fa48("23591") ? {} : (stryCov_9fa48("23591"), {
            kind: stryMutAct_9fa48("23592") ? "" : (stryCov_9fa48("23592"), "use-raw"),
            raw: packPacketProof(event.packetHash, event.signature, event.explicit)
          })])
        });
      }
    }
    return stryMutAct_9fa48("23593") ? {} : (stryCov_9fa48("23593"), {
      state,
      intents: stryMutAct_9fa48("23594") ? ["Stryker was here"] : (stryCov_9fa48("23594"), []),
      actions: stryMutAct_9fa48("23595") ? ["Stryker was here"] : (stryCov_9fa48("23595"), [])
    });
  }
}
export function shouldUsePackPacketProof(actions: ReadonlyArray<PackPacketProofAction>): boolean {
  if (stryMutAct_9fa48("23596")) {
    {}
  } else {
    stryCov_9fa48("23596");
    return stryMutAct_9fa48("23597") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("23597"), actions.some(stryMutAct_9fa48("23598") ? () => undefined : (stryCov_9fa48("23598"), action => stryMutAct_9fa48("23601") ? action.kind !== "use-raw" : stryMutAct_9fa48("23600") ? false : stryMutAct_9fa48("23599") ? true : (stryCov_9fa48("23599", "23600", "23601"), action.kind === (stryMutAct_9fa48("23602") ? "" : (stryCov_9fa48("23602"), "use-raw"))))));
  }
}

/** Extract packet-proof pack bytes from step actions; null when no `use-raw`. */
export function packPacketProofRawFromActions(actions: ReadonlyArray<PackPacketProofAction>): Uint8Array | null {
  if (stryMutAct_9fa48("23603")) {
    {}
  } else {
    stryCov_9fa48("23603");
    const action = actions.find(stryMutAct_9fa48("23604") ? () => undefined : (stryCov_9fa48("23604"), entry => stryMutAct_9fa48("23607") ? entry.kind !== "use-raw" : stryMutAct_9fa48("23606") ? false : stryMutAct_9fa48("23605") ? true : (stryCov_9fa48("23605", "23606", "23607"), entry.kind === (stryMutAct_9fa48("23608") ? "" : (stryCov_9fa48("23608"), "use-raw")))));
    return (stryMutAct_9fa48("23611") ? action?.kind !== "use-raw" : stryMutAct_9fa48("23610") ? false : stryMutAct_9fa48("23609") ? true : (stryCov_9fa48("23609", "23610", "23611"), (stryMutAct_9fa48("23612") ? action.kind : (stryCov_9fa48("23612"), action?.kind)) === (stryMutAct_9fa48("23613") ? "" : (stryCov_9fa48("23613"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Packet-proof split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitPacketProof`
 * reads beside the step).
 */
export type SplitPacketProofState = Record<string, never>;
export type SplitPacketProofEvent = Event | {
  readonly kind: "packet-proof/split-gate";
  readonly proof: Uint8Array;
};
export type SplitPacketProofAction = {
  readonly kind: "use-fields";
  readonly fields: PacketProofFields;
} | {
  readonly kind: "reject";
};
export interface SplitPacketProofStepResult {
  readonly state: SplitPacketProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitPacketProofAction[];
}
export function initialSplitPacketProofState(): SplitPacketProofState {
  if (stryMutAct_9fa48("23614")) {
    {}
  } else {
    stryCov_9fa48("23614");
    return {};
  }
}
export function stepSplitPacketProofWithActions(state: SplitPacketProofState, event: SplitPacketProofEvent): SplitPacketProofStepResult {
  if (stryMutAct_9fa48("23615")) {
    {}
  } else {
    stryCov_9fa48("23615");
    if (stryMutAct_9fa48("23618") ? event.kind !== "packet-proof/split-gate" : stryMutAct_9fa48("23617") ? false : stryMutAct_9fa48("23616") ? true : (stryCov_9fa48("23616", "23617", "23618"), event.kind === (stryMutAct_9fa48("23619") ? "" : (stryCov_9fa48("23619"), "packet-proof/split-gate")))) {
      if (stryMutAct_9fa48("23620")) {
        {}
      } else {
        stryCov_9fa48("23620");
        const fields = splitPacketProof(event.proof);
        if (stryMutAct_9fa48("23623") ? fields !== null : stryMutAct_9fa48("23622") ? false : stryMutAct_9fa48("23621") ? true : (stryCov_9fa48("23621", "23622", "23623"), fields === null)) {
          if (stryMutAct_9fa48("23624")) {
            {}
          } else {
            stryCov_9fa48("23624");
            return stryMutAct_9fa48("23625") ? {} : (stryCov_9fa48("23625"), {
              state,
              intents: stryMutAct_9fa48("23626") ? ["Stryker was here"] : (stryCov_9fa48("23626"), []),
              actions: stryMutAct_9fa48("23627") ? [] : (stryCov_9fa48("23627"), [stryMutAct_9fa48("23628") ? {} : (stryCov_9fa48("23628"), {
                kind: stryMutAct_9fa48("23629") ? "" : (stryCov_9fa48("23629"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("23630") ? {} : (stryCov_9fa48("23630"), {
          state,
          intents: stryMutAct_9fa48("23631") ? ["Stryker was here"] : (stryCov_9fa48("23631"), []),
          actions: stryMutAct_9fa48("23632") ? [] : (stryCov_9fa48("23632"), [stryMutAct_9fa48("23633") ? {} : (stryCov_9fa48("23633"), {
            kind: stryMutAct_9fa48("23634") ? "" : (stryCov_9fa48("23634"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("23635") ? {} : (stryCov_9fa48("23635"), {
      state,
      intents: stryMutAct_9fa48("23636") ? ["Stryker was here"] : (stryCov_9fa48("23636"), []),
      actions: stryMutAct_9fa48("23637") ? ["Stryker was here"] : (stryCov_9fa48("23637"), [])
    });
  }
}
export function shouldUseSplitPacketProof(actions: ReadonlyArray<SplitPacketProofAction>): boolean {
  if (stryMutAct_9fa48("23638")) {
    {}
  } else {
    stryCov_9fa48("23638");
    return stryMutAct_9fa48("23639") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("23639"), actions.some(stryMutAct_9fa48("23640") ? () => undefined : (stryCov_9fa48("23640"), action => stryMutAct_9fa48("23643") ? action.kind !== "use-fields" : stryMutAct_9fa48("23642") ? false : stryMutAct_9fa48("23641") ? true : (stryCov_9fa48("23641", "23642", "23643"), action.kind === (stryMutAct_9fa48("23644") ? "" : (stryCov_9fa48("23644"), "use-fields"))))));
  }
}
export function shouldRejectSplitPacketProof(actions: ReadonlyArray<SplitPacketProofAction>): boolean {
  if (stryMutAct_9fa48("23645")) {
    {}
  } else {
    stryCov_9fa48("23645");
    return stryMutAct_9fa48("23646") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("23646"), actions.some(stryMutAct_9fa48("23647") ? () => undefined : (stryCov_9fa48("23647"), action => stryMutAct_9fa48("23650") ? action.kind !== "reject" : stryMutAct_9fa48("23649") ? false : stryMutAct_9fa48("23648") ? true : (stryCov_9fa48("23648", "23649", "23650"), action.kind === (stryMutAct_9fa48("23651") ? "" : (stryCov_9fa48("23651"), "reject"))))));
  }
}

/** Extract split packet-proof fields from step actions; null when no `use-fields`. */
export function packetProofFieldsFromActions(actions: ReadonlyArray<SplitPacketProofAction>): PacketProofFields | null {
  if (stryMutAct_9fa48("23652")) {
    {}
  } else {
    stryCov_9fa48("23652");
    const action = actions.find(stryMutAct_9fa48("23653") ? () => undefined : (stryCov_9fa48("23653"), entry => stryMutAct_9fa48("23656") ? entry.kind !== "use-fields" : stryMutAct_9fa48("23655") ? false : stryMutAct_9fa48("23654") ? true : (stryCov_9fa48("23654", "23655", "23656"), entry.kind === (stryMutAct_9fa48("23657") ? "" : (stryCov_9fa48("23657"), "use-fields")))));
    return (stryMutAct_9fa48("23660") ? action?.kind !== "use-fields" : stryMutAct_9fa48("23659") ? false : stryMutAct_9fa48("23658") ? true : (stryCov_9fa48("23658", "23659", "23660"), (stryMutAct_9fa48("23661") ? action.kind : (stryCov_9fa48("23661"), action?.kind)) === (stryMutAct_9fa48("23662") ? "" : (stryCov_9fa48("23662"), "use-fields")))) ? action.fields : null;
  }
}

/** Whether an explicit proof's embedded hash matches the packet hash. */
export function packetProofHashMatches(proof: PacketProofFields, packetHash: Uint8Array): boolean {
  if (stryMutAct_9fa48("23663")) {
    {}
  } else {
    stryCov_9fa48("23663");
    if (stryMutAct_9fa48("23666") ? proof.kind === "explicit" : stryMutAct_9fa48("23665") ? false : stryMutAct_9fa48("23664") ? true : (stryCov_9fa48("23664", "23665", "23666"), proof.kind !== (stryMutAct_9fa48("23667") ? "" : (stryCov_9fa48("23667"), "explicit")))) {
      if (stryMutAct_9fa48("23668")) {
        {}
      } else {
        stryCov_9fa48("23668");
        return stryMutAct_9fa48("23669") ? false : (stryCov_9fa48("23669"), true);
      }
    }
    return equalByteArrays(proof.packetHash, packetHash);
  }
}

/**
 * Packet-proof hash match is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packetProofHashMatches`
 * reads beside the step).
 */
export type PacketProofHashMatchState = Record<string, never>;
export type PacketProofHashMatchEvent = Event | {
  readonly kind: "packet-proof/hash-match-gate";
  readonly proof: PacketProofFields;
  readonly packetHash: Uint8Array;
};
export type PacketProofHashMatchAction = {
  readonly kind: "match";
} | {
  readonly kind: "mismatch";
};
export interface PacketProofHashMatchStepResult {
  readonly state: PacketProofHashMatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketProofHashMatchAction[];
}
export function initialPacketProofHashMatchState(): PacketProofHashMatchState {
  if (stryMutAct_9fa48("23670")) {
    {}
  } else {
    stryCov_9fa48("23670");
    return {};
  }
}
export function stepPacketProofHashMatchWithActions(state: PacketProofHashMatchState, event: PacketProofHashMatchEvent): PacketProofHashMatchStepResult {
  if (stryMutAct_9fa48("23671")) {
    {}
  } else {
    stryCov_9fa48("23671");
    if (stryMutAct_9fa48("23674") ? event.kind !== "packet-proof/hash-match-gate" : stryMutAct_9fa48("23673") ? false : stryMutAct_9fa48("23672") ? true : (stryCov_9fa48("23672", "23673", "23674"), event.kind === (stryMutAct_9fa48("23675") ? "" : (stryCov_9fa48("23675"), "packet-proof/hash-match-gate")))) {
      if (stryMutAct_9fa48("23676")) {
        {}
      } else {
        stryCov_9fa48("23676");
        return stryMutAct_9fa48("23677") ? {} : (stryCov_9fa48("23677"), {
          state,
          intents: stryMutAct_9fa48("23678") ? ["Stryker was here"] : (stryCov_9fa48("23678"), []),
          actions: stryMutAct_9fa48("23679") ? [] : (stryCov_9fa48("23679"), [stryMutAct_9fa48("23680") ? {} : (stryCov_9fa48("23680"), {
            kind: packetProofHashMatches(event.proof, event.packetHash) ? stryMutAct_9fa48("23681") ? "" : (stryCov_9fa48("23681"), "match") : stryMutAct_9fa48("23682") ? "" : (stryCov_9fa48("23682"), "mismatch")
          })])
        });
      }
    }
    return stryMutAct_9fa48("23683") ? {} : (stryCov_9fa48("23683"), {
      state,
      intents: stryMutAct_9fa48("23684") ? ["Stryker was here"] : (stryCov_9fa48("23684"), []),
      actions: stryMutAct_9fa48("23685") ? ["Stryker was here"] : (stryCov_9fa48("23685"), [])
    });
  }
}
export function shouldMatchPacketProofHash(actions: ReadonlyArray<PacketProofHashMatchAction>): boolean {
  if (stryMutAct_9fa48("23686")) {
    {}
  } else {
    stryCov_9fa48("23686");
    return stryMutAct_9fa48("23687") ? actions.every(action => action.kind === "match") : (stryCov_9fa48("23687"), actions.some(stryMutAct_9fa48("23688") ? () => undefined : (stryCov_9fa48("23688"), action => stryMutAct_9fa48("23691") ? action.kind !== "match" : stryMutAct_9fa48("23690") ? false : stryMutAct_9fa48("23689") ? true : (stryCov_9fa48("23689", "23690", "23691"), action.kind === (stryMutAct_9fa48("23692") ? "" : (stryCov_9fa48("23692"), "match"))))));
  }
}
export function shouldMismatchPacketProofHash(actions: ReadonlyArray<PacketProofHashMatchAction>): boolean {
  if (stryMutAct_9fa48("23693")) {
    {}
  } else {
    stryCov_9fa48("23693");
    return stryMutAct_9fa48("23694") ? actions.every(action => action.kind === "mismatch") : (stryCov_9fa48("23694"), actions.some(stryMutAct_9fa48("23695") ? () => undefined : (stryCov_9fa48("23695"), action => stryMutAct_9fa48("23698") ? action.kind !== "mismatch" : stryMutAct_9fa48("23697") ? false : stryMutAct_9fa48("23696") ? true : (stryCov_9fa48("23696", "23697", "23698"), action.kind === (stryMutAct_9fa48("23699") ? "" : (stryCov_9fa48("23699"), "mismatch"))))));
  }
}
export type PacketReceiptProofAcceptPlan = "reject" | "accept";

/**
 * PacketReceipt.validateProof outcome from split / hash / signature gates.
 * Signature verify stays at the adapter edge as `signatureValid`.
 */
export function planPacketReceiptProofAccept(input: {
  readonly splitOk: boolean;
  readonly hashMatches: boolean;
  readonly signatureValid: boolean;
}): PacketReceiptProofAcceptPlan {
  if (stryMutAct_9fa48("23700")) {
    {}
  } else {
    stryCov_9fa48("23700");
    if (stryMutAct_9fa48("23703") ? (!input.splitOk || !input.hashMatches) && !input.signatureValid : stryMutAct_9fa48("23702") ? false : stryMutAct_9fa48("23701") ? true : (stryCov_9fa48("23701", "23702", "23703"), (stryMutAct_9fa48("23705") ? !input.splitOk && !input.hashMatches : stryMutAct_9fa48("23704") ? false : (stryCov_9fa48("23704", "23705"), (stryMutAct_9fa48("23706") ? input.splitOk : (stryCov_9fa48("23706"), !input.splitOk)) || (stryMutAct_9fa48("23707") ? input.hashMatches : (stryCov_9fa48("23707"), !input.hashMatches)))) || (stryMutAct_9fa48("23708") ? input.signatureValid : (stryCov_9fa48("23708"), !input.signatureValid)))) {
      if (stryMutAct_9fa48("23709")) {
        {}
      } else {
        stryCov_9fa48("23709");
        return stryMutAct_9fa48("23710") ? "" : (stryCov_9fa48("23710"), "reject");
      }
    }
    return stryMutAct_9fa48("23711") ? "" : (stryCov_9fa48("23711"), "accept");
  }
}

/**
 * Whether PacketReceipt may mark delivered after {@link planPacketReceiptProofAccept}
 * and the split proof remains present for narrowing.
 */
export function shouldAcceptPacketReceiptProof(input: {
  readonly planAccept: boolean;
  readonly splitPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("23712")) {
    {}
  } else {
    stryCov_9fa48("23712");
    return stryMutAct_9fa48("23715") ? input.planAccept || input.splitPresent : stryMutAct_9fa48("23714") ? false : stryMutAct_9fa48("23713") ? true : (stryCov_9fa48("23713", "23714", "23715"), input.planAccept && input.splitPresent);
  }
}

/**
 * Packet-receipt proof accept-after-plan gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptPacketReceiptProof` reads beside the step).
 */
export type AcceptPacketReceiptProofState = Record<string, never>;
export type AcceptPacketReceiptProofEvent = Event | {
  readonly kind: "receipt/accept-proof-gate";
  readonly planAccept: boolean;
  readonly splitPresent: boolean;
};
export type AcceptPacketReceiptProofAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptPacketReceiptProofStepResult {
  readonly state: AcceptPacketReceiptProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptPacketReceiptProofAction[];
}
export function initialAcceptPacketReceiptProofState(): AcceptPacketReceiptProofState {
  if (stryMutAct_9fa48("23716")) {
    {}
  } else {
    stryCov_9fa48("23716");
    return {};
  }
}
export function stepAcceptPacketReceiptProofWithActions(state: AcceptPacketReceiptProofState, event: AcceptPacketReceiptProofEvent): AcceptPacketReceiptProofStepResult {
  if (stryMutAct_9fa48("23717")) {
    {}
  } else {
    stryCov_9fa48("23717");
    if (stryMutAct_9fa48("23720") ? event.kind !== "receipt/accept-proof-gate" : stryMutAct_9fa48("23719") ? false : stryMutAct_9fa48("23718") ? true : (stryCov_9fa48("23718", "23719", "23720"), event.kind === (stryMutAct_9fa48("23721") ? "" : (stryCov_9fa48("23721"), "receipt/accept-proof-gate")))) {
      if (stryMutAct_9fa48("23722")) {
        {}
      } else {
        stryCov_9fa48("23722");
        return stryMutAct_9fa48("23723") ? {} : (stryCov_9fa48("23723"), {
          state,
          intents: stryMutAct_9fa48("23724") ? ["Stryker was here"] : (stryCov_9fa48("23724"), []),
          actions: stryMutAct_9fa48("23725") ? [] : (stryCov_9fa48("23725"), [stryMutAct_9fa48("23726") ? {} : (stryCov_9fa48("23726"), {
            kind: shouldAcceptPacketReceiptProof(stryMutAct_9fa48("23727") ? {} : (stryCov_9fa48("23727"), {
              planAccept: event.planAccept,
              splitPresent: event.splitPresent
            })) ? stryMutAct_9fa48("23728") ? "" : (stryCov_9fa48("23728"), "accept") : stryMutAct_9fa48("23729") ? "" : (stryCov_9fa48("23729"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("23730") ? {} : (stryCov_9fa48("23730"), {
      state,
      intents: stryMutAct_9fa48("23731") ? ["Stryker was here"] : (stryCov_9fa48("23731"), []),
      actions: stryMutAct_9fa48("23732") ? ["Stryker was here"] : (stryCov_9fa48("23732"), [])
    });
  }
}
export function shouldAcceptPacketReceiptProofNow(actions: ReadonlyArray<AcceptPacketReceiptProofAction>): boolean {
  if (stryMutAct_9fa48("23733")) {
    {}
  } else {
    stryCov_9fa48("23733");
    return stryMutAct_9fa48("23734") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("23734"), actions.some(stryMutAct_9fa48("23735") ? () => undefined : (stryCov_9fa48("23735"), action => stryMutAct_9fa48("23738") ? action.kind !== "accept" : stryMutAct_9fa48("23737") ? false : stryMutAct_9fa48("23736") ? true : (stryCov_9fa48("23736", "23737", "23738"), action.kind === (stryMutAct_9fa48("23739") ? "" : (stryCov_9fa48("23739"), "accept"))))));
  }
}
export function shouldSkipAcceptPacketReceiptProof(actions: ReadonlyArray<AcceptPacketReceiptProofAction>): boolean {
  if (stryMutAct_9fa48("23740")) {
    {}
  } else {
    stryCov_9fa48("23740");
    return stryMutAct_9fa48("23741") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("23741"), actions.some(stryMutAct_9fa48("23742") ? () => undefined : (stryCov_9fa48("23742"), action => stryMutAct_9fa48("23745") ? action.kind !== "skip" : stryMutAct_9fa48("23744") ? false : stryMutAct_9fa48("23743") ? true : (stryCov_9fa48("23743", "23744", "23745"), action.kind === (stryMutAct_9fa48("23746") ? "" : (stryCov_9fa48("23746"), "skip"))))));
  }
}

/**
 * Packet-receipt proof-accept plan gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planPacketReceiptProofAccept` / `plan ===` reads beside the step). Nested
 * under {@link stepPacketReceiptProofAcceptWithActions}.
 */
export type PacketReceiptProofAcceptPlanState = Record<string, never>;
export type PacketReceiptProofAcceptPlanEvent = Event | {
  readonly kind: "receipt/proof-accept-plan-gate";
  readonly splitOk: boolean;
  readonly hashMatches: boolean;
  readonly signatureValid: boolean;
};
export type PacketReceiptProofAcceptPlanAction = {
  readonly kind: PacketReceiptProofAcceptPlan;
};
export interface PacketReceiptProofAcceptPlanStepResult {
  readonly state: PacketReceiptProofAcceptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptProofAcceptPlanAction[];
}
export function initialPacketReceiptProofAcceptPlanState(): PacketReceiptProofAcceptPlanState {
  if (stryMutAct_9fa48("23747")) {
    {}
  } else {
    stryCov_9fa48("23747");
    return {};
  }
}
export function stepPacketReceiptProofAcceptPlanWithActions(state: PacketReceiptProofAcceptPlanState, event: PacketReceiptProofAcceptPlanEvent): PacketReceiptProofAcceptPlanStepResult {
  if (stryMutAct_9fa48("23748")) {
    {}
  } else {
    stryCov_9fa48("23748");
    if (stryMutAct_9fa48("23751") ? event.kind !== "receipt/proof-accept-plan-gate" : stryMutAct_9fa48("23750") ? false : stryMutAct_9fa48("23749") ? true : (stryCov_9fa48("23749", "23750", "23751"), event.kind === (stryMutAct_9fa48("23752") ? "" : (stryCov_9fa48("23752"), "receipt/proof-accept-plan-gate")))) {
      if (stryMutAct_9fa48("23753")) {
        {}
      } else {
        stryCov_9fa48("23753");
        return stryMutAct_9fa48("23754") ? {} : (stryCov_9fa48("23754"), {
          state,
          intents: stryMutAct_9fa48("23755") ? ["Stryker was here"] : (stryCov_9fa48("23755"), []),
          actions: stryMutAct_9fa48("23756") ? [] : (stryCov_9fa48("23756"), [stryMutAct_9fa48("23757") ? {} : (stryCov_9fa48("23757"), {
            kind: planPacketReceiptProofAccept(stryMutAct_9fa48("23758") ? {} : (stryCov_9fa48("23758"), {
              splitOk: event.splitOk,
              hashMatches: event.hashMatches,
              signatureValid: event.signatureValid
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("23759") ? {} : (stryCov_9fa48("23759"), {
      state,
      intents: stryMutAct_9fa48("23760") ? ["Stryker was here"] : (stryCov_9fa48("23760"), []),
      actions: stryMutAct_9fa48("23761") ? ["Stryker was here"] : (stryCov_9fa48("23761"), [])
    });
  }
}
export function packetReceiptProofAcceptPlanFromActions(actions: ReadonlyArray<PacketReceiptProofAcceptPlanAction>): PacketReceiptProofAcceptPlan | null {
  if (stryMutAct_9fa48("23762")) {
    {}
  } else {
    stryCov_9fa48("23762");
    const action = actions.find(stryMutAct_9fa48("23763") ? () => undefined : (stryCov_9fa48("23763"), entry => stryMutAct_9fa48("23766") ? entry.kind === "accept" && entry.kind === "reject" : stryMutAct_9fa48("23765") ? false : stryMutAct_9fa48("23764") ? true : (stryCov_9fa48("23764", "23765", "23766"), (stryMutAct_9fa48("23768") ? entry.kind !== "accept" : stryMutAct_9fa48("23767") ? false : (stryCov_9fa48("23767", "23768"), entry.kind === (stryMutAct_9fa48("23769") ? "" : (stryCov_9fa48("23769"), "accept")))) || (stryMutAct_9fa48("23771") ? entry.kind !== "reject" : stryMutAct_9fa48("23770") ? false : (stryCov_9fa48("23770", "23771"), entry.kind === (stryMutAct_9fa48("23772") ? "" : (stryCov_9fa48("23772"), "reject")))))));
    return stryMutAct_9fa48("23773") ? action?.kind && null : (stryCov_9fa48("23773"), (stryMutAct_9fa48("23774") ? action.kind : (stryCov_9fa48("23774"), action?.kind)) ?? null);
  }
}
export function shouldAcceptPacketReceiptProofAcceptPlan(actions: ReadonlyArray<PacketReceiptProofAcceptPlanAction>): boolean {
  if (stryMutAct_9fa48("23775")) {
    {}
  } else {
    stryCov_9fa48("23775");
    return stryMutAct_9fa48("23776") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("23776"), actions.some(stryMutAct_9fa48("23777") ? () => undefined : (stryCov_9fa48("23777"), action => stryMutAct_9fa48("23780") ? action.kind !== "accept" : stryMutAct_9fa48("23779") ? false : stryMutAct_9fa48("23778") ? true : (stryCov_9fa48("23778", "23779", "23780"), action.kind === (stryMutAct_9fa48("23781") ? "" : (stryCov_9fa48("23781"), "accept"))))));
  }
}
export function shouldRejectPacketReceiptProofAcceptPlan(actions: ReadonlyArray<PacketReceiptProofAcceptPlanAction>): boolean {
  if (stryMutAct_9fa48("23782")) {
    {}
  } else {
    stryCov_9fa48("23782");
    return stryMutAct_9fa48("23783") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("23783"), actions.some(stryMutAct_9fa48("23784") ? () => undefined : (stryCov_9fa48("23784"), action => stryMutAct_9fa48("23787") ? action.kind !== "reject" : stryMutAct_9fa48("23786") ? false : stryMutAct_9fa48("23785") ? true : (stryCov_9fa48("23785", "23786", "23787"), action.kind === (stryMutAct_9fa48("23788") ? "" : (stryCov_9fa48("23788"), "reject"))))));
  }
}

/**
 * Packet-receipt proof accept is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPacketReceiptProofAcceptPlanWithActions}
 * (`accept`|`reject`).
 */
export type PacketReceiptProofAcceptState = Record<string, never>;
export type PacketReceiptProofAcceptEvent = Event | {
  readonly kind: "receipt/proof-accept-gate";
  readonly splitOk: boolean;
  readonly hashMatches: boolean;
  readonly signatureValid: boolean;
};

/**
 * Plan nested via {@link stepPacketReceiptProofAcceptPlanWithActions}
 * (`accept`|`reject`).
 */
export type PacketReceiptProofAcceptAction = {
  readonly kind: PacketReceiptProofAcceptPlan;
};
export interface PacketReceiptProofAcceptStepResult {
  readonly state: PacketReceiptProofAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptProofAcceptAction[];
}
export function initialPacketReceiptProofAcceptState(): PacketReceiptProofAcceptState {
  if (stryMutAct_9fa48("23789")) {
    {}
  } else {
    stryCov_9fa48("23789");
    return {};
  }
}
export const stepPacketReceiptProofAccept: StepFn<PacketReceiptProofAcceptState> = (state, event) => {
  if (stryMutAct_9fa48("23790")) {
    {}
  } else {
    stryCov_9fa48("23790");
    const result = stepPacketReceiptProofAcceptInner(state, event as PacketReceiptProofAcceptEvent);
    return stryMutAct_9fa48("23791") ? {} : (stryCov_9fa48("23791"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPacketReceiptProofAcceptWithActions(state: PacketReceiptProofAcceptState, event: PacketReceiptProofAcceptEvent): PacketReceiptProofAcceptStepResult {
  if (stryMutAct_9fa48("23792")) {
    {}
  } else {
    stryCov_9fa48("23792");
    return stepPacketReceiptProofAcceptInner(state, event);
  }
}
export function packetReceiptProofAcceptFromActions(actions: ReadonlyArray<PacketReceiptProofAcceptAction>): PacketReceiptProofAcceptPlan | null {
  if (stryMutAct_9fa48("23793")) {
    {}
  } else {
    stryCov_9fa48("23793");
    const action = actions[0];
    return stryMutAct_9fa48("23794") ? action?.kind && null : (stryCov_9fa48("23794"), (stryMutAct_9fa48("23795") ? action.kind : (stryCov_9fa48("23795"), action?.kind)) ?? null);
  }
}
export function shouldAcceptPacketReceiptProofActions(actions: ReadonlyArray<PacketReceiptProofAcceptAction>): boolean {
  if (stryMutAct_9fa48("23796")) {
    {}
  } else {
    stryCov_9fa48("23796");
    return stryMutAct_9fa48("23797") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("23797"), actions.some(stryMutAct_9fa48("23798") ? () => undefined : (stryCov_9fa48("23798"), action => stryMutAct_9fa48("23801") ? action.kind !== "accept" : stryMutAct_9fa48("23800") ? false : stryMutAct_9fa48("23799") ? true : (stryCov_9fa48("23799", "23800", "23801"), action.kind === (stryMutAct_9fa48("23802") ? "" : (stryCov_9fa48("23802"), "accept"))))));
  }
}
export function shouldRejectPacketReceiptProofActions(actions: ReadonlyArray<PacketReceiptProofAcceptAction>): boolean {
  if (stryMutAct_9fa48("23803")) {
    {}
  } else {
    stryCov_9fa48("23803");
    return stryMutAct_9fa48("23804") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("23804"), actions.some(stryMutAct_9fa48("23805") ? () => undefined : (stryCov_9fa48("23805"), action => stryMutAct_9fa48("23808") ? action.kind !== "reject" : stryMutAct_9fa48("23807") ? false : stryMutAct_9fa48("23806") ? true : (stryCov_9fa48("23806", "23807", "23808"), action.kind === (stryMutAct_9fa48("23809") ? "" : (stryCov_9fa48("23809"), "reject"))))));
  }
}
function stepPacketReceiptProofAcceptInner(state: PacketReceiptProofAcceptState, event: PacketReceiptProofAcceptEvent): PacketReceiptProofAcceptStepResult {
  if (stryMutAct_9fa48("23810")) {
    {}
  } else {
    stryCov_9fa48("23810");
    if (stryMutAct_9fa48("23813") ? event.kind !== "receipt/proof-accept-gate" : stryMutAct_9fa48("23812") ? false : stryMutAct_9fa48("23811") ? true : (stryCov_9fa48("23811", "23812", "23813"), event.kind === (stryMutAct_9fa48("23814") ? "" : (stryCov_9fa48("23814"), "receipt/proof-accept-gate")))) {
      if (stryMutAct_9fa48("23815")) {
        {}
      } else {
        stryCov_9fa48("23815");
        const planActions = stepPacketReceiptProofAcceptPlanWithActions(initialPacketReceiptProofAcceptPlanState(), stryMutAct_9fa48("23816") ? {} : (stryCov_9fa48("23816"), {
          kind: stryMutAct_9fa48("23817") ? "" : (stryCov_9fa48("23817"), "receipt/proof-accept-plan-gate"),
          splitOk: event.splitOk,
          hashMatches: event.hashMatches,
          signatureValid: event.signatureValid
        })).actions;
        const plan = packetReceiptProofAcceptPlanFromActions(planActions);
        if (stryMutAct_9fa48("23820") ? plan !== null : stryMutAct_9fa48("23819") ? false : stryMutAct_9fa48("23818") ? true : (stryCov_9fa48("23818", "23819", "23820"), plan === null)) {
          if (stryMutAct_9fa48("23821")) {
            {}
          } else {
            stryCov_9fa48("23821");
            return stryMutAct_9fa48("23822") ? {} : (stryCov_9fa48("23822"), {
              state,
              intents: stryMutAct_9fa48("23823") ? ["Stryker was here"] : (stryCov_9fa48("23823"), []),
              actions: stryMutAct_9fa48("23824") ? ["Stryker was here"] : (stryCov_9fa48("23824"), [])
            });
          }
        }
        return stryMutAct_9fa48("23825") ? {} : (stryCov_9fa48("23825"), {
          state,
          intents: stryMutAct_9fa48("23826") ? ["Stryker was here"] : (stryCov_9fa48("23826"), []),
          actions: stryMutAct_9fa48("23827") ? [] : (stryCov_9fa48("23827"), [stryMutAct_9fa48("23828") ? {} : (stryCov_9fa48("23828"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("23829") ? {} : (stryCov_9fa48("23829"), {
      state,
      intents: stryMutAct_9fa48("23830") ? ["Stryker was here"] : (stryCov_9fa48("23830"), []),
      actions: stryMutAct_9fa48("23831") ? ["Stryker was here"] : (stryCov_9fa48("23831"), [])
    });
  }
}