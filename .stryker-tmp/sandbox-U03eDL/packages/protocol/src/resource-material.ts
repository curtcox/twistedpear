/**
 * Pure RNS resource hash-input / encrypt-payload material helpers.
 * SHA / encrypt stay at the crypto adapter edge.
 * Material conclusions leave via machine actions (no ad-hoc
 * `resourceEncryptMaterial` / `resourceHashMaterial` /
 * `resourceExpectedProofMaterial` / `resourcePartMapHashMaterial` /
 * `computeResourceTotalParts` reads beside the step).
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
import { RESOURCE_RANDOM_HASH_SIZE } from "./resource-proof.js";
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("30611")) {
    {}
  } else {
    stryCov_9fa48("30611");
    const length = parts.reduce(stryMutAct_9fa48("30612") ? () => undefined : (stryCov_9fa48("30612"), (total, part) => stryMutAct_9fa48("30613") ? total - part.length : (stryCov_9fa48("30613"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("30614")) {
        {}
      } else {
        stryCov_9fa48("30614");
        output.set(part, offset);
        stryMutAct_9fa48("30615") ? offset -= part.length : (stryCov_9fa48("30615"), offset += part.length);
      }
    }
    return output;
  }
}

/** Plaintext encrypted on the wire: randomHash || data. */
export function resourceEncryptMaterial(randomHash: Uint8Array, data: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("30616")) {
    {}
  } else {
    stryCov_9fa48("30616");
    if (stryMutAct_9fa48("30619") ? randomHash.length === RESOURCE_RANDOM_HASH_SIZE : stryMutAct_9fa48("30618") ? false : stryMutAct_9fa48("30617") ? true : (stryCov_9fa48("30617", "30618", "30619"), randomHash.length !== RESOURCE_RANDOM_HASH_SIZE)) {
      if (stryMutAct_9fa48("30620")) {
        {}
      } else {
        stryCov_9fa48("30620");
        throw new Error(stryMutAct_9fa48("30621") ? `` : (stryCov_9fa48("30621"), `resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`));
      }
    }
    return concatBytes(randomHash, data);
  }
}

/** Material hashed for the resource identity hash: data || randomHash. */
export function resourceHashMaterial(data: Uint8Array, randomHash: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("30622")) {
    {}
  } else {
    stryCov_9fa48("30622");
    if (stryMutAct_9fa48("30625") ? randomHash.length === RESOURCE_RANDOM_HASH_SIZE : stryMutAct_9fa48("30624") ? false : stryMutAct_9fa48("30623") ? true : (stryCov_9fa48("30623", "30624", "30625"), randomHash.length !== RESOURCE_RANDOM_HASH_SIZE)) {
      if (stryMutAct_9fa48("30626")) {
        {}
      } else {
        stryCov_9fa48("30626");
        throw new Error(stryMutAct_9fa48("30627") ? `` : (stryCov_9fa48("30627"), `resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`));
      }
    }
    return concatBytes(data, randomHash);
  }
}

/** Material hashed for the expected proof: data || resourceHash. */
export function resourceExpectedProofMaterial(data: Uint8Array, resourceHash: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("30628")) {
    {}
  } else {
    stryCov_9fa48("30628");
    return concatBytes(data, resourceHash);
  }
}

/** Material hashed (then truncated) for a part map-hash: partData || randomHash. */
export function resourcePartMapHashMaterial(partData: Uint8Array, randomHash: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("30629")) {
    {}
  } else {
    stryCov_9fa48("30629");
    if (stryMutAct_9fa48("30632") ? randomHash.length === RESOURCE_RANDOM_HASH_SIZE : stryMutAct_9fa48("30631") ? false : stryMutAct_9fa48("30630") ? true : (stryCov_9fa48("30630", "30631", "30632"), randomHash.length !== RESOURCE_RANDOM_HASH_SIZE)) {
      if (stryMutAct_9fa48("30633")) {
        {}
      } else {
        stryCov_9fa48("30633");
        throw new Error(stryMutAct_9fa48("30634") ? `` : (stryCov_9fa48("30634"), `resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`));
      }
    }
    return concatBytes(partData, randomHash);
  }
}

/** Number of SDU-sized parts needed for an encrypted resource payload. */
export function computeResourceTotalParts(length: number, sdu: number): number {
  if (stryMutAct_9fa48("30635")) {
    {}
  } else {
    stryCov_9fa48("30635");
    return Math.ceil(stryMutAct_9fa48("30636") ? length * sdu : (stryCov_9fa48("30636"), length / sdu));
  }
}

/**
 * Resource encrypt material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `resourceEncryptMaterial`
 * reads beside the step). Bad random-hash length becomes `reject`.
 */
export type ResourceEncryptMaterialState = Record<string, never>;
export type ResourceEncryptMaterialEvent = Event | {
  readonly kind: "resource-material/encrypt-gate";
  readonly randomHash: Uint8Array;
  readonly data: Uint8Array;
};
export type ResourceEncryptMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface ResourceEncryptMaterialStepResult {
  readonly state: ResourceEncryptMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceEncryptMaterialAction[];
}
export function initialResourceEncryptMaterialState(): ResourceEncryptMaterialState {
  if (stryMutAct_9fa48("30637")) {
    {}
  } else {
    stryCov_9fa48("30637");
    return {};
  }
}
export function stepResourceEncryptMaterialWithActions(state: ResourceEncryptMaterialState, event: ResourceEncryptMaterialEvent): ResourceEncryptMaterialStepResult {
  if (stryMutAct_9fa48("30638")) {
    {}
  } else {
    stryCov_9fa48("30638");
    if (stryMutAct_9fa48("30641") ? event.kind !== "resource-material/encrypt-gate" : stryMutAct_9fa48("30640") ? false : stryMutAct_9fa48("30639") ? true : (stryCov_9fa48("30639", "30640", "30641"), event.kind === (stryMutAct_9fa48("30642") ? "" : (stryCov_9fa48("30642"), "resource-material/encrypt-gate")))) {
      if (stryMutAct_9fa48("30643")) {
        {}
      } else {
        stryCov_9fa48("30643");
        try {
          if (stryMutAct_9fa48("30644")) {
            {}
          } else {
            stryCov_9fa48("30644");
            return stryMutAct_9fa48("30645") ? {} : (stryCov_9fa48("30645"), {
              state,
              intents: stryMutAct_9fa48("30646") ? ["Stryker was here"] : (stryCov_9fa48("30646"), []),
              actions: stryMutAct_9fa48("30647") ? [] : (stryCov_9fa48("30647"), [stryMutAct_9fa48("30648") ? {} : (stryCov_9fa48("30648"), {
                kind: stryMutAct_9fa48("30649") ? "" : (stryCov_9fa48("30649"), "use-raw"),
                raw: resourceEncryptMaterial(event.randomHash, event.data)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("30650")) {
            {}
          } else {
            stryCov_9fa48("30650");
            return stryMutAct_9fa48("30651") ? {} : (stryCov_9fa48("30651"), {
              state,
              intents: stryMutAct_9fa48("30652") ? ["Stryker was here"] : (stryCov_9fa48("30652"), []),
              actions: stryMutAct_9fa48("30653") ? [] : (stryCov_9fa48("30653"), [stryMutAct_9fa48("30654") ? {} : (stryCov_9fa48("30654"), {
                kind: stryMutAct_9fa48("30655") ? "" : (stryCov_9fa48("30655"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("30656") ? {} : (stryCov_9fa48("30656"), {
      state,
      intents: stryMutAct_9fa48("30657") ? ["Stryker was here"] : (stryCov_9fa48("30657"), []),
      actions: stryMutAct_9fa48("30658") ? ["Stryker was here"] : (stryCov_9fa48("30658"), [])
    });
  }
}
export function shouldUseResourceEncryptMaterial(actions: ReadonlyArray<ResourceEncryptMaterialAction>): boolean {
  if (stryMutAct_9fa48("30659")) {
    {}
  } else {
    stryCov_9fa48("30659");
    return stryMutAct_9fa48("30660") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("30660"), actions.some(stryMutAct_9fa48("30661") ? () => undefined : (stryCov_9fa48("30661"), action => stryMutAct_9fa48("30664") ? action.kind !== "use-raw" : stryMutAct_9fa48("30663") ? false : stryMutAct_9fa48("30662") ? true : (stryCov_9fa48("30662", "30663", "30664"), action.kind === (stryMutAct_9fa48("30665") ? "" : (stryCov_9fa48("30665"), "use-raw"))))));
  }
}
export function shouldRejectResourceEncryptMaterial(actions: ReadonlyArray<ResourceEncryptMaterialAction>): boolean {
  if (stryMutAct_9fa48("30666")) {
    {}
  } else {
    stryCov_9fa48("30666");
    return stryMutAct_9fa48("30667") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("30667"), actions.some(stryMutAct_9fa48("30668") ? () => undefined : (stryCov_9fa48("30668"), action => stryMutAct_9fa48("30671") ? action.kind !== "reject" : stryMutAct_9fa48("30670") ? false : stryMutAct_9fa48("30669") ? true : (stryCov_9fa48("30669", "30670", "30671"), action.kind === (stryMutAct_9fa48("30672") ? "" : (stryCov_9fa48("30672"), "reject"))))));
  }
}

/** Extract encrypt material bytes from step actions; null when no `use-raw`. */
export function resourceEncryptMaterialRawFromActions(actions: ReadonlyArray<ResourceEncryptMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("30673")) {
    {}
  } else {
    stryCov_9fa48("30673");
    const action = actions.find(stryMutAct_9fa48("30674") ? () => undefined : (stryCov_9fa48("30674"), entry => stryMutAct_9fa48("30677") ? entry.kind !== "use-raw" : stryMutAct_9fa48("30676") ? false : stryMutAct_9fa48("30675") ? true : (stryCov_9fa48("30675", "30676", "30677"), entry.kind === (stryMutAct_9fa48("30678") ? "" : (stryCov_9fa48("30678"), "use-raw")))));
    return (stryMutAct_9fa48("30681") ? action?.kind !== "use-raw" : stryMutAct_9fa48("30680") ? false : stryMutAct_9fa48("30679") ? true : (stryCov_9fa48("30679", "30680", "30681"), (stryMutAct_9fa48("30682") ? action.kind : (stryCov_9fa48("30682"), action?.kind)) === (stryMutAct_9fa48("30683") ? "" : (stryCov_9fa48("30683"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Resource hash material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `resourceHashMaterial`
 * reads beside the step). Bad random-hash length becomes `reject`.
 */
export type ResourceHashMaterialState = Record<string, never>;
export type ResourceHashMaterialEvent = Event | {
  readonly kind: "resource-material/hash-gate";
  readonly data: Uint8Array;
  readonly randomHash: Uint8Array;
};
export type ResourceHashMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface ResourceHashMaterialStepResult {
  readonly state: ResourceHashMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceHashMaterialAction[];
}
export function initialResourceHashMaterialState(): ResourceHashMaterialState {
  if (stryMutAct_9fa48("30684")) {
    {}
  } else {
    stryCov_9fa48("30684");
    return {};
  }
}
export function stepResourceHashMaterialWithActions(state: ResourceHashMaterialState, event: ResourceHashMaterialEvent): ResourceHashMaterialStepResult {
  if (stryMutAct_9fa48("30685")) {
    {}
  } else {
    stryCov_9fa48("30685");
    if (stryMutAct_9fa48("30688") ? event.kind !== "resource-material/hash-gate" : stryMutAct_9fa48("30687") ? false : stryMutAct_9fa48("30686") ? true : (stryCov_9fa48("30686", "30687", "30688"), event.kind === (stryMutAct_9fa48("30689") ? "" : (stryCov_9fa48("30689"), "resource-material/hash-gate")))) {
      if (stryMutAct_9fa48("30690")) {
        {}
      } else {
        stryCov_9fa48("30690");
        try {
          if (stryMutAct_9fa48("30691")) {
            {}
          } else {
            stryCov_9fa48("30691");
            return stryMutAct_9fa48("30692") ? {} : (stryCov_9fa48("30692"), {
              state,
              intents: stryMutAct_9fa48("30693") ? ["Stryker was here"] : (stryCov_9fa48("30693"), []),
              actions: stryMutAct_9fa48("30694") ? [] : (stryCov_9fa48("30694"), [stryMutAct_9fa48("30695") ? {} : (stryCov_9fa48("30695"), {
                kind: stryMutAct_9fa48("30696") ? "" : (stryCov_9fa48("30696"), "use-raw"),
                raw: resourceHashMaterial(event.data, event.randomHash)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("30697")) {
            {}
          } else {
            stryCov_9fa48("30697");
            return stryMutAct_9fa48("30698") ? {} : (stryCov_9fa48("30698"), {
              state,
              intents: stryMutAct_9fa48("30699") ? ["Stryker was here"] : (stryCov_9fa48("30699"), []),
              actions: stryMutAct_9fa48("30700") ? [] : (stryCov_9fa48("30700"), [stryMutAct_9fa48("30701") ? {} : (stryCov_9fa48("30701"), {
                kind: stryMutAct_9fa48("30702") ? "" : (stryCov_9fa48("30702"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("30703") ? {} : (stryCov_9fa48("30703"), {
      state,
      intents: stryMutAct_9fa48("30704") ? ["Stryker was here"] : (stryCov_9fa48("30704"), []),
      actions: stryMutAct_9fa48("30705") ? ["Stryker was here"] : (stryCov_9fa48("30705"), [])
    });
  }
}
export function shouldUseResourceHashMaterial(actions: ReadonlyArray<ResourceHashMaterialAction>): boolean {
  if (stryMutAct_9fa48("30706")) {
    {}
  } else {
    stryCov_9fa48("30706");
    return stryMutAct_9fa48("30707") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("30707"), actions.some(stryMutAct_9fa48("30708") ? () => undefined : (stryCov_9fa48("30708"), action => stryMutAct_9fa48("30711") ? action.kind !== "use-raw" : stryMutAct_9fa48("30710") ? false : stryMutAct_9fa48("30709") ? true : (stryCov_9fa48("30709", "30710", "30711"), action.kind === (stryMutAct_9fa48("30712") ? "" : (stryCov_9fa48("30712"), "use-raw"))))));
  }
}
export function shouldRejectResourceHashMaterial(actions: ReadonlyArray<ResourceHashMaterialAction>): boolean {
  if (stryMutAct_9fa48("30713")) {
    {}
  } else {
    stryCov_9fa48("30713");
    return stryMutAct_9fa48("30714") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("30714"), actions.some(stryMutAct_9fa48("30715") ? () => undefined : (stryCov_9fa48("30715"), action => stryMutAct_9fa48("30718") ? action.kind !== "reject" : stryMutAct_9fa48("30717") ? false : stryMutAct_9fa48("30716") ? true : (stryCov_9fa48("30716", "30717", "30718"), action.kind === (stryMutAct_9fa48("30719") ? "" : (stryCov_9fa48("30719"), "reject"))))));
  }
}

/** Extract hash material bytes from step actions; null when no `use-raw`. */
export function resourceHashMaterialRawFromActions(actions: ReadonlyArray<ResourceHashMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("30720")) {
    {}
  } else {
    stryCov_9fa48("30720");
    const action = actions.find(stryMutAct_9fa48("30721") ? () => undefined : (stryCov_9fa48("30721"), entry => stryMutAct_9fa48("30724") ? entry.kind !== "use-raw" : stryMutAct_9fa48("30723") ? false : stryMutAct_9fa48("30722") ? true : (stryCov_9fa48("30722", "30723", "30724"), entry.kind === (stryMutAct_9fa48("30725") ? "" : (stryCov_9fa48("30725"), "use-raw")))));
    return (stryMutAct_9fa48("30728") ? action?.kind !== "use-raw" : stryMutAct_9fa48("30727") ? false : stryMutAct_9fa48("30726") ? true : (stryCov_9fa48("30726", "30727", "30728"), (stryMutAct_9fa48("30729") ? action.kind : (stryCov_9fa48("30729"), action?.kind)) === (stryMutAct_9fa48("30730") ? "" : (stryCov_9fa48("30730"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Resource expected-proof material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `resourceExpectedProofMaterial` reads beside the step).
 */
export type ResourceExpectedProofMaterialState = Record<string, never>;
export type ResourceExpectedProofMaterialEvent = Event | {
  readonly kind: "resource-material/expected-proof-gate";
  readonly data: Uint8Array;
  readonly resourceHash: Uint8Array;
};
export type ResourceExpectedProofMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface ResourceExpectedProofMaterialStepResult {
  readonly state: ResourceExpectedProofMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceExpectedProofMaterialAction[];
}
export function initialResourceExpectedProofMaterialState(): ResourceExpectedProofMaterialState {
  if (stryMutAct_9fa48("30731")) {
    {}
  } else {
    stryCov_9fa48("30731");
    return {};
  }
}
export function stepResourceExpectedProofMaterialWithActions(state: ResourceExpectedProofMaterialState, event: ResourceExpectedProofMaterialEvent): ResourceExpectedProofMaterialStepResult {
  if (stryMutAct_9fa48("30732")) {
    {}
  } else {
    stryCov_9fa48("30732");
    if (stryMutAct_9fa48("30735") ? event.kind !== "resource-material/expected-proof-gate" : stryMutAct_9fa48("30734") ? false : stryMutAct_9fa48("30733") ? true : (stryCov_9fa48("30733", "30734", "30735"), event.kind === (stryMutAct_9fa48("30736") ? "" : (stryCov_9fa48("30736"), "resource-material/expected-proof-gate")))) {
      if (stryMutAct_9fa48("30737")) {
        {}
      } else {
        stryCov_9fa48("30737");
        return stryMutAct_9fa48("30738") ? {} : (stryCov_9fa48("30738"), {
          state,
          intents: stryMutAct_9fa48("30739") ? ["Stryker was here"] : (stryCov_9fa48("30739"), []),
          actions: stryMutAct_9fa48("30740") ? [] : (stryCov_9fa48("30740"), [stryMutAct_9fa48("30741") ? {} : (stryCov_9fa48("30741"), {
            kind: stryMutAct_9fa48("30742") ? "" : (stryCov_9fa48("30742"), "use-raw"),
            raw: resourceExpectedProofMaterial(event.data, event.resourceHash)
          })])
        });
      }
    }
    return stryMutAct_9fa48("30743") ? {} : (stryCov_9fa48("30743"), {
      state,
      intents: stryMutAct_9fa48("30744") ? ["Stryker was here"] : (stryCov_9fa48("30744"), []),
      actions: stryMutAct_9fa48("30745") ? ["Stryker was here"] : (stryCov_9fa48("30745"), [])
    });
  }
}
export function shouldUseResourceExpectedProofMaterial(actions: ReadonlyArray<ResourceExpectedProofMaterialAction>): boolean {
  if (stryMutAct_9fa48("30746")) {
    {}
  } else {
    stryCov_9fa48("30746");
    return stryMutAct_9fa48("30747") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("30747"), actions.some(stryMutAct_9fa48("30748") ? () => undefined : (stryCov_9fa48("30748"), action => stryMutAct_9fa48("30751") ? action.kind !== "use-raw" : stryMutAct_9fa48("30750") ? false : stryMutAct_9fa48("30749") ? true : (stryCov_9fa48("30749", "30750", "30751"), action.kind === (stryMutAct_9fa48("30752") ? "" : (stryCov_9fa48("30752"), "use-raw"))))));
  }
}

/** Extract expected-proof material bytes from step actions; null when no `use-raw`. */
export function resourceExpectedProofMaterialRawFromActions(actions: ReadonlyArray<ResourceExpectedProofMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("30753")) {
    {}
  } else {
    stryCov_9fa48("30753");
    const action = actions.find(stryMutAct_9fa48("30754") ? () => undefined : (stryCov_9fa48("30754"), entry => stryMutAct_9fa48("30757") ? entry.kind !== "use-raw" : stryMutAct_9fa48("30756") ? false : stryMutAct_9fa48("30755") ? true : (stryCov_9fa48("30755", "30756", "30757"), entry.kind === (stryMutAct_9fa48("30758") ? "" : (stryCov_9fa48("30758"), "use-raw")))));
    return (stryMutAct_9fa48("30761") ? action?.kind !== "use-raw" : stryMutAct_9fa48("30760") ? false : stryMutAct_9fa48("30759") ? true : (stryCov_9fa48("30759", "30760", "30761"), (stryMutAct_9fa48("30762") ? action.kind : (stryCov_9fa48("30762"), action?.kind)) === (stryMutAct_9fa48("30763") ? "" : (stryCov_9fa48("30763"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Resource part map-hash material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `resourcePartMapHashMaterial` reads beside the step). Bad random-hash length
 * becomes `reject`.
 */
export type ResourcePartMapHashMaterialState = Record<string, never>;
export type ResourcePartMapHashMaterialEvent = Event | {
  readonly kind: "resource-material/part-map-hash-gate";
  readonly partData: Uint8Array;
  readonly randomHash: Uint8Array;
};
export type ResourcePartMapHashMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface ResourcePartMapHashMaterialStepResult {
  readonly state: ResourcePartMapHashMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourcePartMapHashMaterialAction[];
}
export function initialResourcePartMapHashMaterialState(): ResourcePartMapHashMaterialState {
  if (stryMutAct_9fa48("30764")) {
    {}
  } else {
    stryCov_9fa48("30764");
    return {};
  }
}
export function stepResourcePartMapHashMaterialWithActions(state: ResourcePartMapHashMaterialState, event: ResourcePartMapHashMaterialEvent): ResourcePartMapHashMaterialStepResult {
  if (stryMutAct_9fa48("30765")) {
    {}
  } else {
    stryCov_9fa48("30765");
    if (stryMutAct_9fa48("30768") ? event.kind !== "resource-material/part-map-hash-gate" : stryMutAct_9fa48("30767") ? false : stryMutAct_9fa48("30766") ? true : (stryCov_9fa48("30766", "30767", "30768"), event.kind === (stryMutAct_9fa48("30769") ? "" : (stryCov_9fa48("30769"), "resource-material/part-map-hash-gate")))) {
      if (stryMutAct_9fa48("30770")) {
        {}
      } else {
        stryCov_9fa48("30770");
        try {
          if (stryMutAct_9fa48("30771")) {
            {}
          } else {
            stryCov_9fa48("30771");
            return stryMutAct_9fa48("30772") ? {} : (stryCov_9fa48("30772"), {
              state,
              intents: stryMutAct_9fa48("30773") ? ["Stryker was here"] : (stryCov_9fa48("30773"), []),
              actions: stryMutAct_9fa48("30774") ? [] : (stryCov_9fa48("30774"), [stryMutAct_9fa48("30775") ? {} : (stryCov_9fa48("30775"), {
                kind: stryMutAct_9fa48("30776") ? "" : (stryCov_9fa48("30776"), "use-raw"),
                raw: resourcePartMapHashMaterial(event.partData, event.randomHash)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("30777")) {
            {}
          } else {
            stryCov_9fa48("30777");
            return stryMutAct_9fa48("30778") ? {} : (stryCov_9fa48("30778"), {
              state,
              intents: stryMutAct_9fa48("30779") ? ["Stryker was here"] : (stryCov_9fa48("30779"), []),
              actions: stryMutAct_9fa48("30780") ? [] : (stryCov_9fa48("30780"), [stryMutAct_9fa48("30781") ? {} : (stryCov_9fa48("30781"), {
                kind: stryMutAct_9fa48("30782") ? "" : (stryCov_9fa48("30782"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("30783") ? {} : (stryCov_9fa48("30783"), {
      state,
      intents: stryMutAct_9fa48("30784") ? ["Stryker was here"] : (stryCov_9fa48("30784"), []),
      actions: stryMutAct_9fa48("30785") ? ["Stryker was here"] : (stryCov_9fa48("30785"), [])
    });
  }
}
export function shouldUseResourcePartMapHashMaterial(actions: ReadonlyArray<ResourcePartMapHashMaterialAction>): boolean {
  if (stryMutAct_9fa48("30786")) {
    {}
  } else {
    stryCov_9fa48("30786");
    return stryMutAct_9fa48("30787") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("30787"), actions.some(stryMutAct_9fa48("30788") ? () => undefined : (stryCov_9fa48("30788"), action => stryMutAct_9fa48("30791") ? action.kind !== "use-raw" : stryMutAct_9fa48("30790") ? false : stryMutAct_9fa48("30789") ? true : (stryCov_9fa48("30789", "30790", "30791"), action.kind === (stryMutAct_9fa48("30792") ? "" : (stryCov_9fa48("30792"), "use-raw"))))));
  }
}
export function shouldRejectResourcePartMapHashMaterial(actions: ReadonlyArray<ResourcePartMapHashMaterialAction>): boolean {
  if (stryMutAct_9fa48("30793")) {
    {}
  } else {
    stryCov_9fa48("30793");
    return stryMutAct_9fa48("30794") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("30794"), actions.some(stryMutAct_9fa48("30795") ? () => undefined : (stryCov_9fa48("30795"), action => stryMutAct_9fa48("30798") ? action.kind !== "reject" : stryMutAct_9fa48("30797") ? false : stryMutAct_9fa48("30796") ? true : (stryCov_9fa48("30796", "30797", "30798"), action.kind === (stryMutAct_9fa48("30799") ? "" : (stryCov_9fa48("30799"), "reject"))))));
  }
}

/** Extract part map-hash material bytes from step actions; null when no `use-raw`. */
export function resourcePartMapHashMaterialRawFromActions(actions: ReadonlyArray<ResourcePartMapHashMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("30800")) {
    {}
  } else {
    stryCov_9fa48("30800");
    const action = actions.find(stryMutAct_9fa48("30801") ? () => undefined : (stryCov_9fa48("30801"), entry => stryMutAct_9fa48("30804") ? entry.kind !== "use-raw" : stryMutAct_9fa48("30803") ? false : stryMutAct_9fa48("30802") ? true : (stryCov_9fa48("30802", "30803", "30804"), entry.kind === (stryMutAct_9fa48("30805") ? "" : (stryCov_9fa48("30805"), "use-raw")))));
    return (stryMutAct_9fa48("30808") ? action?.kind !== "use-raw" : stryMutAct_9fa48("30807") ? false : stryMutAct_9fa48("30806") ? true : (stryCov_9fa48("30806", "30807", "30808"), (stryMutAct_9fa48("30809") ? action.kind : (stryCov_9fa48("30809"), action?.kind)) === (stryMutAct_9fa48("30810") ? "" : (stryCov_9fa48("30810"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Resource total-parts computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeResourceTotalParts`
 * reads beside the step).
 */
export type ComputeResourceTotalPartsState = Record<string, never>;
export type ComputeResourceTotalPartsEvent = Event | {
  readonly kind: "resource-material/total-parts-gate";
  readonly length: number;
  readonly sdu: number;
};
export type ComputeResourceTotalPartsAction = {
  readonly kind: "use-parts";
  readonly parts: number;
};
export interface ComputeResourceTotalPartsStepResult {
  readonly state: ComputeResourceTotalPartsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeResourceTotalPartsAction[];
}
export function initialComputeResourceTotalPartsState(): ComputeResourceTotalPartsState {
  if (stryMutAct_9fa48("30811")) {
    {}
  } else {
    stryCov_9fa48("30811");
    return {};
  }
}
export function stepComputeResourceTotalPartsWithActions(state: ComputeResourceTotalPartsState, event: ComputeResourceTotalPartsEvent): ComputeResourceTotalPartsStepResult {
  if (stryMutAct_9fa48("30812")) {
    {}
  } else {
    stryCov_9fa48("30812");
    if (stryMutAct_9fa48("30815") ? event.kind !== "resource-material/total-parts-gate" : stryMutAct_9fa48("30814") ? false : stryMutAct_9fa48("30813") ? true : (stryCov_9fa48("30813", "30814", "30815"), event.kind === (stryMutAct_9fa48("30816") ? "" : (stryCov_9fa48("30816"), "resource-material/total-parts-gate")))) {
      if (stryMutAct_9fa48("30817")) {
        {}
      } else {
        stryCov_9fa48("30817");
        return stryMutAct_9fa48("30818") ? {} : (stryCov_9fa48("30818"), {
          state,
          intents: stryMutAct_9fa48("30819") ? ["Stryker was here"] : (stryCov_9fa48("30819"), []),
          actions: stryMutAct_9fa48("30820") ? [] : (stryCov_9fa48("30820"), [stryMutAct_9fa48("30821") ? {} : (stryCov_9fa48("30821"), {
            kind: stryMutAct_9fa48("30822") ? "" : (stryCov_9fa48("30822"), "use-parts"),
            parts: computeResourceTotalParts(event.length, event.sdu)
          })])
        });
      }
    }
    return stryMutAct_9fa48("30823") ? {} : (stryCov_9fa48("30823"), {
      state,
      intents: stryMutAct_9fa48("30824") ? ["Stryker was here"] : (stryCov_9fa48("30824"), []),
      actions: stryMutAct_9fa48("30825") ? ["Stryker was here"] : (stryCov_9fa48("30825"), [])
    });
  }
}
export function shouldUseComputeResourceTotalParts(actions: ReadonlyArray<ComputeResourceTotalPartsAction>): boolean {
  if (stryMutAct_9fa48("30826")) {
    {}
  } else {
    stryCov_9fa48("30826");
    return stryMutAct_9fa48("30827") ? actions.every(action => action.kind === "use-parts") : (stryCov_9fa48("30827"), actions.some(stryMutAct_9fa48("30828") ? () => undefined : (stryCov_9fa48("30828"), action => stryMutAct_9fa48("30831") ? action.kind !== "use-parts" : stryMutAct_9fa48("30830") ? false : stryMutAct_9fa48("30829") ? true : (stryCov_9fa48("30829", "30830", "30831"), action.kind === (stryMutAct_9fa48("30832") ? "" : (stryCov_9fa48("30832"), "use-parts"))))));
  }
}

/** Extract total parts from step actions; null when no `use-parts`. */
export function resourceTotalPartsFromActions(actions: ReadonlyArray<ComputeResourceTotalPartsAction>): number | null {
  if (stryMutAct_9fa48("30833")) {
    {}
  } else {
    stryCov_9fa48("30833");
    const action = actions.find(stryMutAct_9fa48("30834") ? () => undefined : (stryCov_9fa48("30834"), entry => stryMutAct_9fa48("30837") ? entry.kind !== "use-parts" : stryMutAct_9fa48("30836") ? false : stryMutAct_9fa48("30835") ? true : (stryCov_9fa48("30835", "30836", "30837"), entry.kind === (stryMutAct_9fa48("30838") ? "" : (stryCov_9fa48("30838"), "use-parts")))));
    return (stryMutAct_9fa48("30841") ? action?.kind !== "use-parts" : stryMutAct_9fa48("30840") ? false : stryMutAct_9fa48("30839") ? true : (stryCov_9fa48("30839", "30840", "30841"), (stryMutAct_9fa48("30842") ? action.kind : (stryCov_9fa48("30842"), action?.kind)) === (stryMutAct_9fa48("30843") ? "" : (stryCov_9fa48("30843"), "use-parts")))) ? action.parts : null;
  }
}