/** Extracted from announce-framing.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS announce payload framing and signed-material assembly.
 * Signing / hashing stay at the crypto adapter edge.
 * Pack / parse / validate / build / signed-material / destination-hash
 * material and match / packet-type conclusions leave via machine actions (no
 * ad-hoc `packAnnouncePayload` / `parseAnnouncePayload` /
 * `announceSignedMaterial` / `announceDestinationHashMaterial` /
 * `announceDestinationHashMatches` / `isAnnouncePacketType` / `plan` string
 * reads beside the step).
 * Payload / parsed-announce accept gates conclude via machine actions (no
 * ad-hoc `shouldAcceptAnnouncePayload` / `shouldAcceptParsedAnnounce` reads
 * beside the step).
 * Signature-attempt / destination-hash-check gates conclude via machine
 * actions (no ad-hoc `shouldAttemptAnnounceSignatureValidate` /
 * `shouldCheckAnnounceDestinationHash` reads beside the step).
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
import { PACKET_TYPE_ANNOUNCE } from "../packet-header.js";
import { equalByteArrays } from "../path-table.js";
export const ANNOUNCE_RANDOM_HASH_SIZE = 10;
export const ANNOUNCE_SIGNATURE_SIZE = 64;
export const ANNOUNCE_PUBLIC_KEY_SIZE = 64;
export const ANNOUNCE_NAME_HASH_SIZE = 10;
export const ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE = 32;
export interface AnnouncePayloadFields {
  readonly publicKey: Uint8Array;
  readonly nameHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly ratchetPublicKey: Uint8Array | null;
  readonly signature: Uint8Array;
  readonly appData: Uint8Array | null;
}
export function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("2304")) {
    {}
  } else {
    stryCov_9fa48("2304");
    const length = parts.reduce(stryMutAct_9fa48("2305") ? () => undefined : (stryCov_9fa48("2305"), (total, part) => stryMutAct_9fa48("2306") ? total - part.length : (stryCov_9fa48("2306"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("2307")) {
        {}
      } else {
        stryCov_9fa48("2307");
        output.set(part, offset);
        stryMutAct_9fa48("2308") ? offset -= part.length : (stryCov_9fa48("2308"), offset += part.length);
      }
    }
    return output;
  }
}
export function announceSignedMaterial(input: {
  readonly destinationHash: Uint8Array;
  readonly publicKey: Uint8Array;
  readonly nameHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly ratchetPublicKey: Uint8Array | null;
  readonly appData: Uint8Array | null;
}): Uint8Array {
  if (stryMutAct_9fa48("2309")) {
    {}
  } else {
    stryCov_9fa48("2309");
    return concatBytes(input.destinationHash, input.publicKey, input.nameHash, input.randomHash, stryMutAct_9fa48("2310") ? input.ratchetPublicKey && new Uint8Array() : (stryCov_9fa48("2310"), input.ratchetPublicKey ?? new Uint8Array()), stryMutAct_9fa48("2311") ? input.appData && new Uint8Array() : (stryCov_9fa48("2311"), input.appData ?? new Uint8Array()));
  }
}

/**
 * Announce signed-material assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `announceSignedMaterial`
 * reads beside the step).
 */
export type AnnounceSignedMaterialState = Record<string, never>;
export type AnnounceSignedMaterialEvent = Event | {
  readonly kind: "announce/signed-material-gate";
  readonly destinationHash: Uint8Array;
  readonly publicKey: Uint8Array;
  readonly nameHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly ratchetPublicKey: Uint8Array | null;
  readonly appData: Uint8Array | null;
};
export type AnnounceSignedMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface AnnounceSignedMaterialStepResult {
  readonly state: AnnounceSignedMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceSignedMaterialAction[];
}
export function initialAnnounceSignedMaterialState(): AnnounceSignedMaterialState {
  if (stryMutAct_9fa48("2312")) {
    {}
  } else {
    stryCov_9fa48("2312");
    return {};
  }
}
export function stepAnnounceSignedMaterialWithActions(state: AnnounceSignedMaterialState, event: AnnounceSignedMaterialEvent): AnnounceSignedMaterialStepResult {
  if (stryMutAct_9fa48("2313")) {
    {}
  } else {
    stryCov_9fa48("2313");
    if (stryMutAct_9fa48("2316") ? event.kind !== "announce/signed-material-gate" : stryMutAct_9fa48("2315") ? false : stryMutAct_9fa48("2314") ? true : (stryCov_9fa48("2314", "2315", "2316"), event.kind === (stryMutAct_9fa48("2317") ? "" : (stryCov_9fa48("2317"), "announce/signed-material-gate")))) {
      if (stryMutAct_9fa48("2318")) {
        {}
      } else {
        stryCov_9fa48("2318");
        return stryMutAct_9fa48("2319") ? {} : (stryCov_9fa48("2319"), {
          state,
          intents: stryMutAct_9fa48("2320") ? ["Stryker was here"] : (stryCov_9fa48("2320"), []),
          actions: stryMutAct_9fa48("2321") ? [] : (stryCov_9fa48("2321"), [stryMutAct_9fa48("2322") ? {} : (stryCov_9fa48("2322"), {
            kind: stryMutAct_9fa48("2323") ? "" : (stryCov_9fa48("2323"), "use-raw"),
            raw: announceSignedMaterial(stryMutAct_9fa48("2324") ? {} : (stryCov_9fa48("2324"), {
              destinationHash: event.destinationHash,
              publicKey: event.publicKey,
              nameHash: event.nameHash,
              randomHash: event.randomHash,
              ratchetPublicKey: event.ratchetPublicKey,
              appData: event.appData
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("2325") ? {} : (stryCov_9fa48("2325"), {
      state,
      intents: stryMutAct_9fa48("2326") ? ["Stryker was here"] : (stryCov_9fa48("2326"), []),
      actions: stryMutAct_9fa48("2327") ? ["Stryker was here"] : (stryCov_9fa48("2327"), [])
    });
  }
}
export function shouldUseAnnounceSignedMaterial(actions: ReadonlyArray<AnnounceSignedMaterialAction>): boolean {
  if (stryMutAct_9fa48("2328")) {
    {}
  } else {
    stryCov_9fa48("2328");
    return stryMutAct_9fa48("2329") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("2329"), actions.some(stryMutAct_9fa48("2330") ? () => undefined : (stryCov_9fa48("2330"), action => stryMutAct_9fa48("2333") ? action.kind !== "use-raw" : stryMutAct_9fa48("2332") ? false : stryMutAct_9fa48("2331") ? true : (stryCov_9fa48("2331", "2332", "2333"), action.kind === (stryMutAct_9fa48("2334") ? "" : (stryCov_9fa48("2334"), "use-raw"))))));
  }
}

/** Extract announce signed material from step actions; null when no `use-raw`. */
export function announceSignedMaterialRawFromActions(actions: ReadonlyArray<AnnounceSignedMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("2335")) {
    {}
  } else {
    stryCov_9fa48("2335");
    const action = actions.find(stryMutAct_9fa48("2336") ? () => undefined : (stryCov_9fa48("2336"), entry => stryMutAct_9fa48("2339") ? entry.kind !== "use-raw" : stryMutAct_9fa48("2338") ? false : stryMutAct_9fa48("2337") ? true : (stryCov_9fa48("2337", "2338", "2339"), entry.kind === (stryMutAct_9fa48("2340") ? "" : (stryCov_9fa48("2340"), "use-raw")))));
    return (stryMutAct_9fa48("2343") ? action?.kind !== "use-raw" : stryMutAct_9fa48("2342") ? false : stryMutAct_9fa48("2341") ? true : (stryCov_9fa48("2341", "2342", "2343"), (stryMutAct_9fa48("2344") ? action.kind : (stryCov_9fa48("2344"), action?.kind)) === (stryMutAct_9fa48("2345") ? "" : (stryCov_9fa48("2345"), "use-raw")))) ? action.raw : null;
  }
}
export function packAnnouncePayload(input: {
  readonly publicKey: Uint8Array;
  readonly nameHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly ratchetPublicKey: Uint8Array | null;
  readonly signature: Uint8Array;
  readonly appData: Uint8Array | null;
}): Uint8Array {
  if (stryMutAct_9fa48("2346")) {
    {}
  } else {
    stryCov_9fa48("2346");
    if (stryMutAct_9fa48("2349") ? input.publicKey.length === ANNOUNCE_PUBLIC_KEY_SIZE : stryMutAct_9fa48("2348") ? false : stryMutAct_9fa48("2347") ? true : (stryCov_9fa48("2347", "2348", "2349"), input.publicKey.length !== ANNOUNCE_PUBLIC_KEY_SIZE)) {
      if (stryMutAct_9fa48("2350")) {
        {}
      } else {
        stryCov_9fa48("2350");
        throw new Error(stryMutAct_9fa48("2351") ? `` : (stryCov_9fa48("2351"), `Announce public key must be ${ANNOUNCE_PUBLIC_KEY_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("2354") ? input.nameHash.length === ANNOUNCE_NAME_HASH_SIZE : stryMutAct_9fa48("2353") ? false : stryMutAct_9fa48("2352") ? true : (stryCov_9fa48("2352", "2353", "2354"), input.nameHash.length !== ANNOUNCE_NAME_HASH_SIZE)) {
      if (stryMutAct_9fa48("2355")) {
        {}
      } else {
        stryCov_9fa48("2355");
        throw new Error(stryMutAct_9fa48("2356") ? `` : (stryCov_9fa48("2356"), `Announce name hash must be ${ANNOUNCE_NAME_HASH_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("2359") ? input.randomHash.length === ANNOUNCE_RANDOM_HASH_SIZE : stryMutAct_9fa48("2358") ? false : stryMutAct_9fa48("2357") ? true : (stryCov_9fa48("2357", "2358", "2359"), input.randomHash.length !== ANNOUNCE_RANDOM_HASH_SIZE)) {
      if (stryMutAct_9fa48("2360")) {
        {}
      } else {
        stryCov_9fa48("2360");
        throw new Error(stryMutAct_9fa48("2361") ? `` : (stryCov_9fa48("2361"), `Announce random hash must be ${ANNOUNCE_RANDOM_HASH_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("2364") ? input.ratchetPublicKey !== null || input.ratchetPublicKey.length !== ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE : stryMutAct_9fa48("2363") ? false : stryMutAct_9fa48("2362") ? true : (stryCov_9fa48("2362", "2363", "2364"), (stryMutAct_9fa48("2366") ? input.ratchetPublicKey === null : stryMutAct_9fa48("2365") ? true : (stryCov_9fa48("2365", "2366"), input.ratchetPublicKey !== null)) && (stryMutAct_9fa48("2368") ? input.ratchetPublicKey.length === ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE : stryMutAct_9fa48("2367") ? true : (stryCov_9fa48("2367", "2368"), input.ratchetPublicKey.length !== ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE)))) {
      if (stryMutAct_9fa48("2369")) {
        {}
      } else {
        stryCov_9fa48("2369");
        throw new Error(stryMutAct_9fa48("2370") ? `` : (stryCov_9fa48("2370"), `Announce ratchet public key must be ${ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("2373") ? input.signature.length === ANNOUNCE_SIGNATURE_SIZE : stryMutAct_9fa48("2372") ? false : stryMutAct_9fa48("2371") ? true : (stryCov_9fa48("2371", "2372", "2373"), input.signature.length !== ANNOUNCE_SIGNATURE_SIZE)) {
      if (stryMutAct_9fa48("2374")) {
        {}
      } else {
        stryCov_9fa48("2374");
        throw new Error(stryMutAct_9fa48("2375") ? `` : (stryCov_9fa48("2375"), `Announce signature must be ${ANNOUNCE_SIGNATURE_SIZE} bytes`));
      }
    }
    return concatBytes(input.publicKey, input.nameHash, input.randomHash, stryMutAct_9fa48("2376") ? input.ratchetPublicKey && new Uint8Array() : (stryCov_9fa48("2376"), input.ratchetPublicKey ?? new Uint8Array()), input.signature, stryMutAct_9fa48("2377") ? input.appData && new Uint8Array() : (stryCov_9fa48("2377"), input.appData ?? new Uint8Array()));
  }
}
export function parseAnnouncePayload(data: Uint8Array, hasRatchet: boolean): AnnouncePayloadFields | null {
  if (stryMutAct_9fa48("2378")) {
    {}
  } else {
    stryCov_9fa48("2378");
    const ratchetLength = hasRatchet ? ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE : 0;
    const minimumLength = stryMutAct_9fa48("2379") ? ANNOUNCE_PUBLIC_KEY_SIZE + ANNOUNCE_NAME_HASH_SIZE + ANNOUNCE_RANDOM_HASH_SIZE + ANNOUNCE_SIGNATURE_SIZE - ratchetLength : (stryCov_9fa48("2379"), (stryMutAct_9fa48("2380") ? ANNOUNCE_PUBLIC_KEY_SIZE + ANNOUNCE_NAME_HASH_SIZE + ANNOUNCE_RANDOM_HASH_SIZE - ANNOUNCE_SIGNATURE_SIZE : (stryCov_9fa48("2380"), (stryMutAct_9fa48("2381") ? ANNOUNCE_PUBLIC_KEY_SIZE + ANNOUNCE_NAME_HASH_SIZE - ANNOUNCE_RANDOM_HASH_SIZE : (stryCov_9fa48("2381"), (stryMutAct_9fa48("2382") ? ANNOUNCE_PUBLIC_KEY_SIZE - ANNOUNCE_NAME_HASH_SIZE : (stryCov_9fa48("2382"), ANNOUNCE_PUBLIC_KEY_SIZE + ANNOUNCE_NAME_HASH_SIZE)) + ANNOUNCE_RANDOM_HASH_SIZE)) + ANNOUNCE_SIGNATURE_SIZE)) + ratchetLength);
    if (stryMutAct_9fa48("2386") ? data.length >= minimumLength : stryMutAct_9fa48("2385") ? data.length <= minimumLength : stryMutAct_9fa48("2384") ? false : stryMutAct_9fa48("2383") ? true : (stryCov_9fa48("2383", "2384", "2385", "2386"), data.length < minimumLength)) {
      if (stryMutAct_9fa48("2387")) {
        {}
      } else {
        stryCov_9fa48("2387");
        return null;
      }
    }
    let offset = 0;
    const publicKey = data.subarray(offset, stryMutAct_9fa48("2388") ? offset - ANNOUNCE_PUBLIC_KEY_SIZE : (stryCov_9fa48("2388"), offset + ANNOUNCE_PUBLIC_KEY_SIZE));
    stryMutAct_9fa48("2389") ? offset -= ANNOUNCE_PUBLIC_KEY_SIZE : (stryCov_9fa48("2389"), offset += ANNOUNCE_PUBLIC_KEY_SIZE);
    const nameHash = data.subarray(offset, stryMutAct_9fa48("2390") ? offset - ANNOUNCE_NAME_HASH_SIZE : (stryCov_9fa48("2390"), offset + ANNOUNCE_NAME_HASH_SIZE));
    stryMutAct_9fa48("2391") ? offset -= ANNOUNCE_NAME_HASH_SIZE : (stryCov_9fa48("2391"), offset += ANNOUNCE_NAME_HASH_SIZE);
    const randomHash = data.subarray(offset, stryMutAct_9fa48("2392") ? offset - ANNOUNCE_RANDOM_HASH_SIZE : (stryCov_9fa48("2392"), offset + ANNOUNCE_RANDOM_HASH_SIZE));
    stryMutAct_9fa48("2393") ? offset -= ANNOUNCE_RANDOM_HASH_SIZE : (stryCov_9fa48("2393"), offset += ANNOUNCE_RANDOM_HASH_SIZE);
    const ratchetPublicKey = hasRatchet ? data.subarray(offset, stryMutAct_9fa48("2394") ? offset - ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE : (stryCov_9fa48("2394"), offset + ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE)) : null;
    stryMutAct_9fa48("2395") ? offset -= ratchetLength : (stryCov_9fa48("2395"), offset += ratchetLength);
    const signature = data.subarray(offset, stryMutAct_9fa48("2396") ? offset - ANNOUNCE_SIGNATURE_SIZE : (stryCov_9fa48("2396"), offset + ANNOUNCE_SIGNATURE_SIZE));
    stryMutAct_9fa48("2397") ? offset -= ANNOUNCE_SIGNATURE_SIZE : (stryCov_9fa48("2397"), offset += ANNOUNCE_SIGNATURE_SIZE);
    const appData = (stryMutAct_9fa48("2401") ? data.length <= offset : stryMutAct_9fa48("2400") ? data.length >= offset : stryMutAct_9fa48("2399") ? false : stryMutAct_9fa48("2398") ? true : (stryCov_9fa48("2398", "2399", "2400", "2401"), data.length > offset)) ? data.subarray(offset) : null;
    return stryMutAct_9fa48("2402") ? {} : (stryCov_9fa48("2402"), {
      publicKey,
      nameHash,
      randomHash,
      ratchetPublicKey,
      signature,
      appData
    });
  }
}

/**
 * Announce payload pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packAnnouncePayload`
 * reads beside the step).
 */
export type PackAnnouncePayloadState = Record<string, never>;
export type PackAnnouncePayloadEvent = Event | {
  readonly kind: "announce/pack-payload-gate";
  readonly publicKey: Uint8Array;
  readonly nameHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly ratchetPublicKey: Uint8Array | null;
  readonly signature: Uint8Array;
  readonly appData: Uint8Array | null;
};
export type PackAnnouncePayloadAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackAnnouncePayloadStepResult {
  readonly state: PackAnnouncePayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackAnnouncePayloadAction[];
}
export function initialPackAnnouncePayloadState(): PackAnnouncePayloadState {
  if (stryMutAct_9fa48("2403")) {
    {}
  } else {
    stryCov_9fa48("2403");
    return {};
  }
}
export function stepPackAnnouncePayloadWithActions(state: PackAnnouncePayloadState, event: PackAnnouncePayloadEvent): PackAnnouncePayloadStepResult {
  if (stryMutAct_9fa48("2404")) {
    {}
  } else {
    stryCov_9fa48("2404");
    if (stryMutAct_9fa48("2407") ? event.kind !== "announce/pack-payload-gate" : stryMutAct_9fa48("2406") ? false : stryMutAct_9fa48("2405") ? true : (stryCov_9fa48("2405", "2406", "2407"), event.kind === (stryMutAct_9fa48("2408") ? "" : (stryCov_9fa48("2408"), "announce/pack-payload-gate")))) {
      if (stryMutAct_9fa48("2409")) {
        {}
      } else {
        stryCov_9fa48("2409");
        return stryMutAct_9fa48("2410") ? {} : (stryCov_9fa48("2410"), {
          state,
          intents: stryMutAct_9fa48("2411") ? ["Stryker was here"] : (stryCov_9fa48("2411"), []),
          actions: stryMutAct_9fa48("2412") ? [] : (stryCov_9fa48("2412"), [stryMutAct_9fa48("2413") ? {} : (stryCov_9fa48("2413"), {
            kind: stryMutAct_9fa48("2414") ? "" : (stryCov_9fa48("2414"), "use-raw"),
            raw: packAnnouncePayload(stryMutAct_9fa48("2415") ? {} : (stryCov_9fa48("2415"), {
              publicKey: event.publicKey,
              nameHash: event.nameHash,
              randomHash: event.randomHash,
              ratchetPublicKey: event.ratchetPublicKey,
              signature: event.signature,
              appData: event.appData
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("2416") ? {} : (stryCov_9fa48("2416"), {
      state,
      intents: stryMutAct_9fa48("2417") ? ["Stryker was here"] : (stryCov_9fa48("2417"), []),
      actions: stryMutAct_9fa48("2418") ? ["Stryker was here"] : (stryCov_9fa48("2418"), [])
    });
  }
}
export function shouldUsePackAnnouncePayload(actions: ReadonlyArray<PackAnnouncePayloadAction>): boolean {
  if (stryMutAct_9fa48("2419")) {
    {}
  } else {
    stryCov_9fa48("2419");
    return stryMutAct_9fa48("2420") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("2420"), actions.some(stryMutAct_9fa48("2421") ? () => undefined : (stryCov_9fa48("2421"), action => stryMutAct_9fa48("2424") ? action.kind !== "use-raw" : stryMutAct_9fa48("2423") ? false : stryMutAct_9fa48("2422") ? true : (stryCov_9fa48("2422", "2423", "2424"), action.kind === (stryMutAct_9fa48("2425") ? "" : (stryCov_9fa48("2425"), "use-raw"))))));
  }
}

/** Extract announce pack bytes from step actions; null when no `use-raw`. */
export function packAnnouncePayloadRawFromActions(actions: ReadonlyArray<PackAnnouncePayloadAction>): Uint8Array | null {
  if (stryMutAct_9fa48("2426")) {
    {}
  } else {
    stryCov_9fa48("2426");
    const action = actions.find(stryMutAct_9fa48("2427") ? () => undefined : (stryCov_9fa48("2427"), entry => stryMutAct_9fa48("2430") ? entry.kind !== "use-raw" : stryMutAct_9fa48("2429") ? false : stryMutAct_9fa48("2428") ? true : (stryCov_9fa48("2428", "2429", "2430"), entry.kind === (stryMutAct_9fa48("2431") ? "" : (stryCov_9fa48("2431"), "use-raw")))));
    return (stryMutAct_9fa48("2434") ? action?.kind !== "use-raw" : stryMutAct_9fa48("2433") ? false : stryMutAct_9fa48("2432") ? true : (stryCov_9fa48("2432", "2433", "2434"), (stryMutAct_9fa48("2435") ? action.kind : (stryCov_9fa48("2435"), action?.kind)) === (stryMutAct_9fa48("2436") ? "" : (stryCov_9fa48("2436"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Announce payload parse framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `parseAnnouncePayload`
 * reads beside the step).
 */
export type ParseAnnouncePayloadState = Record<string, never>;
export type ParseAnnouncePayloadEvent = Event | {
  readonly kind: "announce/parse-payload-gate";
  readonly data: Uint8Array;
  readonly hasRatchet: boolean;
};
export type ParseAnnouncePayloadAction = {
  readonly kind: "use-fields";
  readonly fields: AnnouncePayloadFields;
} | {
  readonly kind: "reject";
};
export interface ParseAnnouncePayloadStepResult {
  readonly state: ParseAnnouncePayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ParseAnnouncePayloadAction[];
}
export function initialParseAnnouncePayloadState(): ParseAnnouncePayloadState {
  if (stryMutAct_9fa48("2437")) {
    {}
  } else {
    stryCov_9fa48("2437");
    return {};
  }
}
export function stepParseAnnouncePayloadWithActions(state: ParseAnnouncePayloadState, event: ParseAnnouncePayloadEvent): ParseAnnouncePayloadStepResult {
  if (stryMutAct_9fa48("2438")) {
    {}
  } else {
    stryCov_9fa48("2438");
    if (stryMutAct_9fa48("2441") ? event.kind !== "announce/parse-payload-gate" : stryMutAct_9fa48("2440") ? false : stryMutAct_9fa48("2439") ? true : (stryCov_9fa48("2439", "2440", "2441"), event.kind === (stryMutAct_9fa48("2442") ? "" : (stryCov_9fa48("2442"), "announce/parse-payload-gate")))) {
      if (stryMutAct_9fa48("2443")) {
        {}
      } else {
        stryCov_9fa48("2443");
        const fields = parseAnnouncePayload(event.data, event.hasRatchet);
        if (stryMutAct_9fa48("2446") ? fields !== null : stryMutAct_9fa48("2445") ? false : stryMutAct_9fa48("2444") ? true : (stryCov_9fa48("2444", "2445", "2446"), fields === null)) {
          if (stryMutAct_9fa48("2447")) {
            {}
          } else {
            stryCov_9fa48("2447");
            return stryMutAct_9fa48("2448") ? {} : (stryCov_9fa48("2448"), {
              state,
              intents: stryMutAct_9fa48("2449") ? ["Stryker was here"] : (stryCov_9fa48("2449"), []),
              actions: stryMutAct_9fa48("2450") ? [] : (stryCov_9fa48("2450"), [stryMutAct_9fa48("2451") ? {} : (stryCov_9fa48("2451"), {
                kind: stryMutAct_9fa48("2452") ? "" : (stryCov_9fa48("2452"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("2453") ? {} : (stryCov_9fa48("2453"), {
          state,
          intents: stryMutAct_9fa48("2454") ? ["Stryker was here"] : (stryCov_9fa48("2454"), []),
          actions: stryMutAct_9fa48("2455") ? [] : (stryCov_9fa48("2455"), [stryMutAct_9fa48("2456") ? {} : (stryCov_9fa48("2456"), {
            kind: stryMutAct_9fa48("2457") ? "" : (stryCov_9fa48("2457"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("2458") ? {} : (stryCov_9fa48("2458"), {
      state,
      intents: stryMutAct_9fa48("2459") ? ["Stryker was here"] : (stryCov_9fa48("2459"), []),
      actions: stryMutAct_9fa48("2460") ? ["Stryker was here"] : (stryCov_9fa48("2460"), [])
    });
  }
}
export function shouldUseParseAnnouncePayload(actions: ReadonlyArray<ParseAnnouncePayloadAction>): boolean {
  if (stryMutAct_9fa48("2461")) {
    {}
  } else {
    stryCov_9fa48("2461");
    return stryMutAct_9fa48("2462") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("2462"), actions.some(stryMutAct_9fa48("2463") ? () => undefined : (stryCov_9fa48("2463"), action => stryMutAct_9fa48("2466") ? action.kind !== "use-fields" : stryMutAct_9fa48("2465") ? false : stryMutAct_9fa48("2464") ? true : (stryCov_9fa48("2464", "2465", "2466"), action.kind === (stryMutAct_9fa48("2467") ? "" : (stryCov_9fa48("2467"), "use-fields"))))));
  }
}
export function shouldRejectParseAnnouncePayload(actions: ReadonlyArray<ParseAnnouncePayloadAction>): boolean {
  if (stryMutAct_9fa48("2468")) {
    {}
  } else {
    stryCov_9fa48("2468");
    return stryMutAct_9fa48("2469") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("2469"), actions.some(stryMutAct_9fa48("2470") ? () => undefined : (stryCov_9fa48("2470"), action => stryMutAct_9fa48("2473") ? action.kind !== "reject" : stryMutAct_9fa48("2472") ? false : stryMutAct_9fa48("2471") ? true : (stryCov_9fa48("2471", "2472", "2473"), action.kind === (stryMutAct_9fa48("2474") ? "" : (stryCov_9fa48("2474"), "reject"))))));
  }
}

/** Extract parsed announce payload fields from step actions; null when no `use-fields`. */
export function announcePayloadFieldsFromActions(actions: ReadonlyArray<ParseAnnouncePayloadAction>): AnnouncePayloadFields | null {
  if (stryMutAct_9fa48("2475")) {
    {}
  } else {
    stryCov_9fa48("2475");
    const action = actions.find(stryMutAct_9fa48("2476") ? () => undefined : (stryCov_9fa48("2476"), entry => stryMutAct_9fa48("2479") ? entry.kind !== "use-fields" : stryMutAct_9fa48("2478") ? false : stryMutAct_9fa48("2477") ? true : (stryCov_9fa48("2477", "2478", "2479"), entry.kind === (stryMutAct_9fa48("2480") ? "" : (stryCov_9fa48("2480"), "use-fields")))));
    return (stryMutAct_9fa48("2483") ? action?.kind !== "use-fields" : stryMutAct_9fa48("2482") ? false : stryMutAct_9fa48("2481") ? true : (stryCov_9fa48("2481", "2482", "2483"), (stryMutAct_9fa48("2484") ? action.kind : (stryCov_9fa48("2484"), action?.kind)) === (stryMutAct_9fa48("2485") ? "" : (stryCov_9fa48("2485"), "use-fields")))) ? action.fields : null;
  }
}

/** Whether announce payload fields parsed successfully and may be retained. */
export function shouldAcceptAnnouncePayload(fieldsPresent: boolean): boolean {
  if (stryMutAct_9fa48("2486")) {
    {}
  } else {
    stryCov_9fa48("2486");
    return fieldsPresent;
  }
}

/**
 * Announce payload accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptAnnouncePayload` reads beside the step).
 */
export type AcceptAnnouncePayloadState = Record<string, never>;
export type AcceptAnnouncePayloadEvent = Event | {
  readonly kind: "announce/accept-payload-gate";
  readonly fieldsPresent: boolean;
};
export type AcceptAnnouncePayloadAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptAnnouncePayloadStepResult {
  readonly state: AcceptAnnouncePayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptAnnouncePayloadAction[];
}
export function initialAcceptAnnouncePayloadState(): AcceptAnnouncePayloadState {
  if (stryMutAct_9fa48("2487")) {
    {}
  } else {
    stryCov_9fa48("2487");
    return {};
  }
}
export function stepAcceptAnnouncePayloadWithActions(state: AcceptAnnouncePayloadState, event: AcceptAnnouncePayloadEvent): AcceptAnnouncePayloadStepResult {
  if (stryMutAct_9fa48("2488")) {
    {}
  } else {
    stryCov_9fa48("2488");
    if (stryMutAct_9fa48("2491") ? event.kind !== "announce/accept-payload-gate" : stryMutAct_9fa48("2490") ? false : stryMutAct_9fa48("2489") ? true : (stryCov_9fa48("2489", "2490", "2491"), event.kind === (stryMutAct_9fa48("2492") ? "" : (stryCov_9fa48("2492"), "announce/accept-payload-gate")))) {
      if (stryMutAct_9fa48("2493")) {
        {}
      } else {
        stryCov_9fa48("2493");
        return stryMutAct_9fa48("2494") ? {} : (stryCov_9fa48("2494"), {
          state,
          intents: stryMutAct_9fa48("2495") ? ["Stryker was here"] : (stryCov_9fa48("2495"), []),
          actions: stryMutAct_9fa48("2496") ? [] : (stryCov_9fa48("2496"), [stryMutAct_9fa48("2497") ? {} : (stryCov_9fa48("2497"), {
            kind: shouldAcceptAnnouncePayload(event.fieldsPresent) ? stryMutAct_9fa48("2498") ? "" : (stryCov_9fa48("2498"), "accept") : stryMutAct_9fa48("2499") ? "" : (stryCov_9fa48("2499"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("2500") ? {} : (stryCov_9fa48("2500"), {
      state,
      intents: stryMutAct_9fa48("2501") ? ["Stryker was here"] : (stryCov_9fa48("2501"), []),
      actions: stryMutAct_9fa48("2502") ? ["Stryker was here"] : (stryCov_9fa48("2502"), [])
    });
  }
}
export function shouldAcceptAnnouncePayloadNow(actions: ReadonlyArray<AcceptAnnouncePayloadAction>): boolean {
  if (stryMutAct_9fa48("2503")) {
    {}
  } else {
    stryCov_9fa48("2503");
    return stryMutAct_9fa48("2504") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("2504"), actions.some(stryMutAct_9fa48("2505") ? () => undefined : (stryCov_9fa48("2505"), action => stryMutAct_9fa48("2508") ? action.kind !== "accept" : stryMutAct_9fa48("2507") ? false : stryMutAct_9fa48("2506") ? true : (stryCov_9fa48("2506", "2507", "2508"), action.kind === (stryMutAct_9fa48("2509") ? "" : (stryCov_9fa48("2509"), "accept"))))));
  }
}
export function shouldSkipAnnouncePayloadAccept(actions: ReadonlyArray<AcceptAnnouncePayloadAction>): boolean {
  if (stryMutAct_9fa48("2510")) {
    {}
  } else {
    stryCov_9fa48("2510");
    return stryMutAct_9fa48("2511") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("2511"), actions.some(stryMutAct_9fa48("2512") ? () => undefined : (stryCov_9fa48("2512"), action => stryMutAct_9fa48("2515") ? action.kind !== "skip" : stryMutAct_9fa48("2514") ? false : stryMutAct_9fa48("2513") ? true : (stryCov_9fa48("2513", "2514", "2515"), action.kind === (stryMutAct_9fa48("2516") ? "" : (stryCov_9fa48("2516"), "skip"))))));
  }
}

/** Whether a validated announce parse result may enter handleAnnounce. */
export function shouldAcceptParsedAnnounce(parsedPresent: boolean): boolean {
  if (stryMutAct_9fa48("2517")) {
    {}
  } else {
    stryCov_9fa48("2517");
    return parsedPresent;
  }
}

/**
 * Parsed-announce accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptParsedAnnounce` reads beside the step).
 */
export type AcceptParsedAnnounceState = Record<string, never>;
export type AcceptParsedAnnounceEvent = Event | {
  readonly kind: "announce/accept-parsed-gate";
  readonly parsedPresent: boolean;
};
export type AcceptParsedAnnounceAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptParsedAnnounceStepResult {
  readonly state: AcceptParsedAnnounceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptParsedAnnounceAction[];
}
export function initialAcceptParsedAnnounceState(): AcceptParsedAnnounceState {
  if (stryMutAct_9fa48("2518")) {
    {}
  } else {
    stryCov_9fa48("2518");
    return {};
  }
}