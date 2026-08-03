/**
 * Pure RNS destination name expansion and hash-input material.
 * SHA truncation stays at the crypto adapter edge.
 * Expansion / material / aspect-filter / name-part validation conclusions leave
 * via machine actions (no ad-hoc `expandDestinationName` /
 * `destinationNameHashMaterial` / `destinationHashMaterial` /
 * `parseAspectFilter` / `validateDestinationNamePart` reads beside the step).
 * Identity-hash resolution conclusions leave via machine actions (no ad-hoc
 * `planDestinationIdentityHash` / `plan === "..."` reads beside the step).
 * Identity-hash plan nested via
 * {@link stepDestinationIdentityHashPlanWithActions}
 * (`missing`|`use-object`|`reject-length`|`use-bytes`).
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
import { NAME_HASH_BYTES, TRUNCATED_HASH_BYTES } from "./hash-truncate.js";
import { utf8Encode } from "./utf8.js";

/** NAME_HASH_LENGTH (80 bits) / 8 */
export const DESTINATION_NAME_HASH_BYTES = NAME_HASH_BYTES;
/** TRUNCATED_HASH_LENGTH (128 bits) / 8 */
export const DESTINATION_IDENTITY_HASH_BYTES = TRUNCATED_HASH_BYTES;
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("6239")) {
    {}
  } else {
    stryCov_9fa48("6239");
    const length = parts.reduce(stryMutAct_9fa48("6240") ? () => undefined : (stryCov_9fa48("6240"), (total, part) => stryMutAct_9fa48("6241") ? total - part.length : (stryCov_9fa48("6241"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("6242")) {
        {}
      } else {
        stryCov_9fa48("6242");
        output.set(part, offset);
        stryMutAct_9fa48("6243") ? offset -= part.length : (stryCov_9fa48("6243"), offset += part.length);
      }
    }
    return output;
  }
}
export function bytesToHexLower(bytes: Uint8Array): string {
  if (stryMutAct_9fa48("6244")) {
    {}
  } else {
    stryCov_9fa48("6244");
    let out = stryMutAct_9fa48("6245") ? "Stryker was here!" : (stryCov_9fa48("6245"), "");
    for (const byte of bytes) {
      if (stryMutAct_9fa48("6246")) {
        {}
      } else {
        stryCov_9fa48("6246");
        stryMutAct_9fa48("6247") ? out -= byte.toString(16).padStart(2, "0") : (stryCov_9fa48("6247"), out += byte.toString(16).padStart(2, stryMutAct_9fa48("6248") ? "" : (stryCov_9fa48("6248"), "0")));
      }
    }
    return out;
  }
}
export function hexToBytesLower(hex: string): Uint8Array {
  if (stryMutAct_9fa48("6249")) {
    {}
  } else {
    stryCov_9fa48("6249");
    if (stryMutAct_9fa48("6252") ? hex.length % 2 === 0 : stryMutAct_9fa48("6251") ? false : stryMutAct_9fa48("6250") ? true : (stryCov_9fa48("6250", "6251", "6252"), (stryMutAct_9fa48("6253") ? hex.length * 2 : (stryCov_9fa48("6253"), hex.length % 2)) !== 0)) {
      if (stryMutAct_9fa48("6254")) {
        {}
      } else {
        stryCov_9fa48("6254");
        throw new Error(stryMutAct_9fa48("6255") ? "" : (stryCov_9fa48("6255"), "Hex strings must contain an even number of characters"));
      }
    }
    const output = new Uint8Array(stryMutAct_9fa48("6256") ? hex.length * 2 : (stryCov_9fa48("6256"), hex.length / 2));
    for (let index = 0; stryMutAct_9fa48("6259") ? index >= output.length : stryMutAct_9fa48("6258") ? index <= output.length : stryMutAct_9fa48("6257") ? false : (stryCov_9fa48("6257", "6258", "6259"), index < output.length); stryMutAct_9fa48("6260") ? index -= 1 : (stryCov_9fa48("6260"), index += 1)) {
      if (stryMutAct_9fa48("6261")) {
        {}
      } else {
        stryCov_9fa48("6261");
        output[index] = Number.parseInt(stryMutAct_9fa48("6262") ? hex : (stryCov_9fa48("6262"), hex.slice(stryMutAct_9fa48("6263") ? index / 2 : (stryCov_9fa48("6263"), index * 2), stryMutAct_9fa48("6264") ? index * 2 - 2 : (stryCov_9fa48("6264"), (stryMutAct_9fa48("6265") ? index / 2 : (stryCov_9fa48("6265"), index * 2)) + 2))), 16);
      }
    }
    return output;
  }
}
export function validateDestinationNamePart(value: string, label: string): void {
  if (stryMutAct_9fa48("6266")) {
    {}
  } else {
    stryCov_9fa48("6266");
    if (stryMutAct_9fa48("6269") ? value.length !== 0 : stryMutAct_9fa48("6268") ? false : stryMutAct_9fa48("6267") ? true : (stryCov_9fa48("6267", "6268", "6269"), value.length === 0)) {
      if (stryMutAct_9fa48("6270")) {
        {}
      } else {
        stryCov_9fa48("6270");
        throw new Error(stryMutAct_9fa48("6271") ? `` : (stryCov_9fa48("6271"), `Destination ${label} cannot be empty`));
      }
    }
    if (stryMutAct_9fa48("6273") ? false : stryMutAct_9fa48("6272") ? true : (stryCov_9fa48("6272", "6273"), value.includes(stryMutAct_9fa48("6274") ? "" : (stryCov_9fa48("6274"), ".")))) {
      if (stryMutAct_9fa48("6275")) {
        {}
      } else {
        stryCov_9fa48("6275");
        throw new Error(stryMutAct_9fa48("6276") ? `` : (stryCov_9fa48("6276"), `Dots cannot be used in destination ${label}s`));
      }
    }
  }
}

/**
 * Expand an RNS destination name: `app.aspect...[.identityHex]`.
 */
export function expandDestinationName(identityHash: Uint8Array | null, appName: string, aspects: ReadonlyArray<string> = stryMutAct_9fa48("6277") ? ["Stryker was here"] : (stryCov_9fa48("6277"), [])): string {
  if (stryMutAct_9fa48("6278")) {
    {}
  } else {
    stryCov_9fa48("6278");
    validateDestinationNamePart(appName, stryMutAct_9fa48("6279") ? "" : (stryCov_9fa48("6279"), "app name"));
    for (const aspect of aspects) {
      if (stryMutAct_9fa48("6280")) {
        {}
      } else {
        stryCov_9fa48("6280");
        validateDestinationNamePart(aspect, stryMutAct_9fa48("6281") ? "" : (stryCov_9fa48("6281"), "aspect"));
      }
    }
    let name = appName;
    for (const aspect of aspects) {
      if (stryMutAct_9fa48("6282")) {
        {}
      } else {
        stryCov_9fa48("6282");
        name += stryMutAct_9fa48("6283") ? `` : (stryCov_9fa48("6283"), `.${aspect}`);
      }
    }
    if (stryMutAct_9fa48("6286") ? identityHash === null : stryMutAct_9fa48("6285") ? false : stryMutAct_9fa48("6284") ? true : (stryCov_9fa48("6284", "6285", "6286"), identityHash !== null)) {
      if (stryMutAct_9fa48("6287")) {
        {}
      } else {
        stryCov_9fa48("6287");
        if (stryMutAct_9fa48("6290") ? identityHash.length === DESTINATION_IDENTITY_HASH_BYTES : stryMutAct_9fa48("6289") ? false : stryMutAct_9fa48("6288") ? true : (stryCov_9fa48("6288", "6289", "6290"), identityHash.length !== DESTINATION_IDENTITY_HASH_BYTES)) {
          if (stryMutAct_9fa48("6291")) {
            {}
          } else {
            stryCov_9fa48("6291");
            throw new Error(stryMutAct_9fa48("6292") ? `` : (stryCov_9fa48("6292"), `Identity hash must be ${DESTINATION_IDENTITY_HASH_BYTES} bytes`));
          }
        }
        name += stryMutAct_9fa48("6293") ? `` : (stryCov_9fa48("6293"), `.${bytesToHexLower(identityHash)}`);
      }
    }
    return name;
  }
}

/** UTF-8 bytes hashed (then truncated) for the destination name hash. */
export function destinationNameHashMaterial(appName: string, aspects: ReadonlyArray<string> = stryMutAct_9fa48("6294") ? ["Stryker was here"] : (stryCov_9fa48("6294"), [])): Uint8Array {
  if (stryMutAct_9fa48("6295")) {
    {}
  } else {
    stryCov_9fa48("6295");
    return utf8Encode(expandDestinationName(null, appName, aspects));
  }
}

/** Bytes hashed (then truncated) for the full destination hash. */
export function destinationHashMaterial(nameHash: Uint8Array, identityHash: Uint8Array | null): Uint8Array {
  if (stryMutAct_9fa48("6296")) {
    {}
  } else {
    stryCov_9fa48("6296");
    if (stryMutAct_9fa48("6299") ? identityHash !== null : stryMutAct_9fa48("6298") ? false : stryMutAct_9fa48("6297") ? true : (stryCov_9fa48("6297", "6298", "6299"), identityHash === null)) {
      if (stryMutAct_9fa48("6300")) {
        {}
      } else {
        stryCov_9fa48("6300");
        return nameHash;
      }
    }
    return concatBytes(nameHash, identityHash);
  }
}
export interface ParsedAspectFilter {
  readonly appName: string;
  readonly aspects: readonly string[];
}

/**
 * Parse an announce-handler aspect filter (`app.aspect...`).
 * Empty / all-empty parts → null (adapter skips the handler).
 */
export function parseAspectFilter(filter: string): ParsedAspectFilter | null {
  if (stryMutAct_9fa48("6301")) {
    {}
  } else {
    stryCov_9fa48("6301");
    const parts = stryMutAct_9fa48("6302") ? filter.split(".") : (stryCov_9fa48("6302"), filter.split(stryMutAct_9fa48("6303") ? "" : (stryCov_9fa48("6303"), ".")).filter(stryMutAct_9fa48("6304") ? () => undefined : (stryCov_9fa48("6304"), part => stryMutAct_9fa48("6308") ? part.length <= 0 : stryMutAct_9fa48("6307") ? part.length >= 0 : stryMutAct_9fa48("6306") ? false : stryMutAct_9fa48("6305") ? true : (stryCov_9fa48("6305", "6306", "6307", "6308"), part.length > 0))));
    const appName = parts[0];
    if (stryMutAct_9fa48("6311") ? appName !== undefined : stryMutAct_9fa48("6310") ? false : stryMutAct_9fa48("6309") ? true : (stryCov_9fa48("6309", "6310", "6311"), appName === undefined)) {
      if (stryMutAct_9fa48("6312")) {
        {}
      } else {
        stryCov_9fa48("6312");
        return null;
      }
    }
    return stryMutAct_9fa48("6313") ? {} : (stryCov_9fa48("6313"), {
      appName,
      aspects: stryMutAct_9fa48("6314") ? parts : (stryCov_9fa48("6314"), parts.slice(1))
    });
  }
}
export type DestinationIdentityHashPlan = "missing" | "use-object" | "reject-length" | "use-bytes";

/**
 * Destination construction identity-hash resolution.
 * Identity instanceof / .hash stay at the adapter.
 */
export function planDestinationIdentityHash(input: {
  readonly kind: "missing" | "object" | "bytes";
  readonly bytesLength?: number;
  readonly expectedLength?: number;
}): DestinationIdentityHashPlan {
  if (stryMutAct_9fa48("6315")) {
    {}
  } else {
    stryCov_9fa48("6315");
    if (stryMutAct_9fa48("6318") ? input.kind !== "missing" : stryMutAct_9fa48("6317") ? false : stryMutAct_9fa48("6316") ? true : (stryCov_9fa48("6316", "6317", "6318"), input.kind === (stryMutAct_9fa48("6319") ? "" : (stryCov_9fa48("6319"), "missing")))) {
      if (stryMutAct_9fa48("6320")) {
        {}
      } else {
        stryCov_9fa48("6320");
        return stryMutAct_9fa48("6321") ? "" : (stryCov_9fa48("6321"), "missing");
      }
    }
    if (stryMutAct_9fa48("6324") ? input.kind !== "object" : stryMutAct_9fa48("6323") ? false : stryMutAct_9fa48("6322") ? true : (stryCov_9fa48("6322", "6323", "6324"), input.kind === (stryMutAct_9fa48("6325") ? "" : (stryCov_9fa48("6325"), "object")))) {
      if (stryMutAct_9fa48("6326")) {
        {}
      } else {
        stryCov_9fa48("6326");
        return stryMutAct_9fa48("6327") ? "" : (stryCov_9fa48("6327"), "use-object");
      }
    }
    const expected = stryMutAct_9fa48("6328") ? input.expectedLength && DESTINATION_IDENTITY_HASH_BYTES : (stryCov_9fa48("6328"), input.expectedLength ?? DESTINATION_IDENTITY_HASH_BYTES);
    if (stryMutAct_9fa48("6331") ? (input.bytesLength ?? 0) === expected : stryMutAct_9fa48("6330") ? false : stryMutAct_9fa48("6329") ? true : (stryCov_9fa48("6329", "6330", "6331"), (stryMutAct_9fa48("6332") ? input.bytesLength && 0 : (stryCov_9fa48("6332"), input.bytesLength ?? 0)) !== expected)) {
      if (stryMutAct_9fa48("6333")) {
        {}
      } else {
        stryCov_9fa48("6333");
        return stryMutAct_9fa48("6334") ? "" : (stryCov_9fa48("6334"), "reject-length");
      }
    }
    return stryMutAct_9fa48("6335") ? "" : (stryCov_9fa48("6335"), "use-bytes");
  }
}

/**
 * Destination identity-hash plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationIdentityHash`
 * / `plan === "..."` reads beside the step). Nested under
 * {@link stepDestinationIdentityHashWithActions}.
 */
export type DestinationIdentityHashPlanState = Record<string, never>;
export type DestinationIdentityHashPlanEvent = Event | {
  readonly kind: "destination/identity-hash-plan-gate";
  readonly identityKind: "missing" | "object" | "bytes";
  readonly bytesLength?: number;
  readonly expectedLength?: number;
};
export type DestinationIdentityHashPlanAction = {
  readonly kind: "missing";
} | {
  readonly kind: "use-object";
} | {
  readonly kind: "reject-length";
} | {
  readonly kind: "use-bytes";
};
export interface DestinationIdentityHashPlanStepResult {
  readonly state: DestinationIdentityHashPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationIdentityHashPlanAction[];
}
export function initialDestinationIdentityHashPlanState(): DestinationIdentityHashPlanState {
  if (stryMutAct_9fa48("6336")) {
    {}
  } else {
    stryCov_9fa48("6336");
    return {};
  }
}
export function stepDestinationIdentityHashPlanWithActions(state: DestinationIdentityHashPlanState, event: DestinationIdentityHashPlanEvent): DestinationIdentityHashPlanStepResult {
  if (stryMutAct_9fa48("6337")) {
    {}
  } else {
    stryCov_9fa48("6337");
    if (stryMutAct_9fa48("6340") ? event.kind !== "destination/identity-hash-plan-gate" : stryMutAct_9fa48("6339") ? false : stryMutAct_9fa48("6338") ? true : (stryCov_9fa48("6338", "6339", "6340"), event.kind === (stryMutAct_9fa48("6341") ? "" : (stryCov_9fa48("6341"), "destination/identity-hash-plan-gate")))) {
      if (stryMutAct_9fa48("6342")) {
        {}
      } else {
        stryCov_9fa48("6342");
        return stryMutAct_9fa48("6343") ? {} : (stryCov_9fa48("6343"), {
          state,
          intents: stryMutAct_9fa48("6344") ? ["Stryker was here"] : (stryCov_9fa48("6344"), []),
          actions: stryMutAct_9fa48("6345") ? [] : (stryCov_9fa48("6345"), [stryMutAct_9fa48("6346") ? {} : (stryCov_9fa48("6346"), {
            kind: planDestinationIdentityHash(stryMutAct_9fa48("6347") ? {} : (stryCov_9fa48("6347"), {
              kind: event.identityKind,
              ...((stryMutAct_9fa48("6350") ? event.bytesLength === undefined : stryMutAct_9fa48("6349") ? false : stryMutAct_9fa48("6348") ? true : (stryCov_9fa48("6348", "6349", "6350"), event.bytesLength !== undefined)) ? stryMutAct_9fa48("6351") ? {} : (stryCov_9fa48("6351"), {
                bytesLength: event.bytesLength
              }) : {}),
              ...((stryMutAct_9fa48("6354") ? event.expectedLength === undefined : stryMutAct_9fa48("6353") ? false : stryMutAct_9fa48("6352") ? true : (stryCov_9fa48("6352", "6353", "6354"), event.expectedLength !== undefined)) ? stryMutAct_9fa48("6355") ? {} : (stryCov_9fa48("6355"), {
                expectedLength: event.expectedLength
              }) : {})
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("6356") ? {} : (stryCov_9fa48("6356"), {
      state,
      intents: stryMutAct_9fa48("6357") ? ["Stryker was here"] : (stryCov_9fa48("6357"), []),
      actions: stryMutAct_9fa48("6358") ? ["Stryker was here"] : (stryCov_9fa48("6358"), [])
    });
  }
}

/** Extract the identity-hash plan from actions; null when empty. */
export function destinationIdentityHashPlanFromActions(actions: ReadonlyArray<DestinationIdentityHashPlanAction>): DestinationIdentityHashPlan | null {
  if (stryMutAct_9fa48("6359")) {
    {}
  } else {
    stryCov_9fa48("6359");
    const action = actions.find(stryMutAct_9fa48("6360") ? () => undefined : (stryCov_9fa48("6360"), entry => stryMutAct_9fa48("6363") ? (entry.kind === "missing" || entry.kind === "use-object" || entry.kind === "reject-length") && entry.kind === "use-bytes" : stryMutAct_9fa48("6362") ? false : stryMutAct_9fa48("6361") ? true : (stryCov_9fa48("6361", "6362", "6363"), (stryMutAct_9fa48("6365") ? (entry.kind === "missing" || entry.kind === "use-object") && entry.kind === "reject-length" : stryMutAct_9fa48("6364") ? false : (stryCov_9fa48("6364", "6365"), (stryMutAct_9fa48("6367") ? entry.kind === "missing" && entry.kind === "use-object" : stryMutAct_9fa48("6366") ? false : (stryCov_9fa48("6366", "6367"), (stryMutAct_9fa48("6369") ? entry.kind !== "missing" : stryMutAct_9fa48("6368") ? false : (stryCov_9fa48("6368", "6369"), entry.kind === (stryMutAct_9fa48("6370") ? "" : (stryCov_9fa48("6370"), "missing")))) || (stryMutAct_9fa48("6372") ? entry.kind !== "use-object" : stryMutAct_9fa48("6371") ? false : (stryCov_9fa48("6371", "6372"), entry.kind === (stryMutAct_9fa48("6373") ? "" : (stryCov_9fa48("6373"), "use-object")))))) || (stryMutAct_9fa48("6375") ? entry.kind !== "reject-length" : stryMutAct_9fa48("6374") ? false : (stryCov_9fa48("6374", "6375"), entry.kind === (stryMutAct_9fa48("6376") ? "" : (stryCov_9fa48("6376"), "reject-length")))))) || (stryMutAct_9fa48("6378") ? entry.kind !== "use-bytes" : stryMutAct_9fa48("6377") ? false : (stryCov_9fa48("6377", "6378"), entry.kind === (stryMutAct_9fa48("6379") ? "" : (stryCov_9fa48("6379"), "use-bytes")))))));
    return stryMutAct_9fa48("6380") ? action?.kind && null : (stryCov_9fa48("6380"), (stryMutAct_9fa48("6381") ? action.kind : (stryCov_9fa48("6381"), action?.kind)) ?? null);
  }
}
export function shouldMissDestinationIdentityHashPlan(actions: ReadonlyArray<DestinationIdentityHashPlanAction>): boolean {
  if (stryMutAct_9fa48("6382")) {
    {}
  } else {
    stryCov_9fa48("6382");
    return stryMutAct_9fa48("6383") ? actions.every(action => action.kind === "missing") : (stryCov_9fa48("6383"), actions.some(stryMutAct_9fa48("6384") ? () => undefined : (stryCov_9fa48("6384"), action => stryMutAct_9fa48("6387") ? action.kind !== "missing" : stryMutAct_9fa48("6386") ? false : stryMutAct_9fa48("6385") ? true : (stryCov_9fa48("6385", "6386", "6387"), action.kind === (stryMutAct_9fa48("6388") ? "" : (stryCov_9fa48("6388"), "missing"))))));
  }
}
export function shouldUseObjectDestinationIdentityHashPlan(actions: ReadonlyArray<DestinationIdentityHashPlanAction>): boolean {
  if (stryMutAct_9fa48("6389")) {
    {}
  } else {
    stryCov_9fa48("6389");
    return stryMutAct_9fa48("6390") ? actions.every(action => action.kind === "use-object") : (stryCov_9fa48("6390"), actions.some(stryMutAct_9fa48("6391") ? () => undefined : (stryCov_9fa48("6391"), action => stryMutAct_9fa48("6394") ? action.kind !== "use-object" : stryMutAct_9fa48("6393") ? false : stryMutAct_9fa48("6392") ? true : (stryCov_9fa48("6392", "6393", "6394"), action.kind === (stryMutAct_9fa48("6395") ? "" : (stryCov_9fa48("6395"), "use-object"))))));
  }
}
export function shouldUseBytesDestinationIdentityHashPlan(actions: ReadonlyArray<DestinationIdentityHashPlanAction>): boolean {
  if (stryMutAct_9fa48("6396")) {
    {}
  } else {
    stryCov_9fa48("6396");
    return stryMutAct_9fa48("6397") ? actions.every(action => action.kind === "use-bytes") : (stryCov_9fa48("6397"), actions.some(stryMutAct_9fa48("6398") ? () => undefined : (stryCov_9fa48("6398"), action => stryMutAct_9fa48("6401") ? action.kind !== "use-bytes" : stryMutAct_9fa48("6400") ? false : stryMutAct_9fa48("6399") ? true : (stryCov_9fa48("6399", "6400", "6401"), action.kind === (stryMutAct_9fa48("6402") ? "" : (stryCov_9fa48("6402"), "use-bytes"))))));
  }
}
export function shouldRejectLengthDestinationIdentityHashPlan(actions: ReadonlyArray<DestinationIdentityHashPlanAction>): boolean {
  if (stryMutAct_9fa48("6403")) {
    {}
  } else {
    stryCov_9fa48("6403");
    return stryMutAct_9fa48("6404") ? actions.every(action => action.kind === "reject-length") : (stryCov_9fa48("6404"), actions.some(stryMutAct_9fa48("6405") ? () => undefined : (stryCov_9fa48("6405"), action => stryMutAct_9fa48("6408") ? action.kind !== "reject-length" : stryMutAct_9fa48("6407") ? false : stryMutAct_9fa48("6406") ? true : (stryCov_9fa48("6406", "6407", "6408"), action.kind === (stryMutAct_9fa48("6409") ? "" : (stryCov_9fa48("6409"), "reject-length"))))));
  }
}

/**
 * Destination identity-hash resolution is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationIdentityHash`
 * / `plan === "..."` reads beside the step).
 * Plan nested via {@link stepDestinationIdentityHashPlanWithActions}
 * (`missing`|`use-object`|`reject-length`|`use-bytes`).
 */
export type DestinationIdentityHashState = Record<string, never>;
export type DestinationIdentityHashEvent = Event | {
  readonly kind: "destination/identity-hash-gate";
  readonly identityKind: "missing" | "object" | "bytes";
  readonly bytesLength?: number;
  readonly expectedLength?: number;
};
export type DestinationIdentityHashAction = {
  readonly kind: "missing";
} | {
  readonly kind: "use-object";
} | {
  readonly kind: "reject-length";
} | {
  readonly kind: "use-bytes";
};
export interface DestinationIdentityHashStepResult {
  readonly state: DestinationIdentityHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationIdentityHashAction[];
}
export function initialDestinationIdentityHashState(): DestinationIdentityHashState {
  if (stryMutAct_9fa48("6410")) {
    {}
  } else {
    stryCov_9fa48("6410");
    return {};
  }
}
export function stepDestinationIdentityHashWithActions(state: DestinationIdentityHashState, event: DestinationIdentityHashEvent): DestinationIdentityHashStepResult {
  if (stryMutAct_9fa48("6411")) {
    {}
  } else {
    stryCov_9fa48("6411");
    if (stryMutAct_9fa48("6414") ? event.kind !== "destination/identity-hash-gate" : stryMutAct_9fa48("6413") ? false : stryMutAct_9fa48("6412") ? true : (stryCov_9fa48("6412", "6413", "6414"), event.kind === (stryMutAct_9fa48("6415") ? "" : (stryCov_9fa48("6415"), "destination/identity-hash-gate")))) {
      if (stryMutAct_9fa48("6416")) {
        {}
      } else {
        stryCov_9fa48("6416");
        const planActions = stepDestinationIdentityHashPlanWithActions(initialDestinationIdentityHashPlanState(), stryMutAct_9fa48("6417") ? {} : (stryCov_9fa48("6417"), {
          kind: stryMutAct_9fa48("6418") ? "" : (stryCov_9fa48("6418"), "destination/identity-hash-plan-gate"),
          identityKind: event.identityKind,
          ...((stryMutAct_9fa48("6421") ? event.bytesLength === undefined : stryMutAct_9fa48("6420") ? false : stryMutAct_9fa48("6419") ? true : (stryCov_9fa48("6419", "6420", "6421"), event.bytesLength !== undefined)) ? stryMutAct_9fa48("6422") ? {} : (stryCov_9fa48("6422"), {
            bytesLength: event.bytesLength
          }) : {}),
          ...((stryMutAct_9fa48("6425") ? event.expectedLength === undefined : stryMutAct_9fa48("6424") ? false : stryMutAct_9fa48("6423") ? true : (stryCov_9fa48("6423", "6424", "6425"), event.expectedLength !== undefined)) ? stryMutAct_9fa48("6426") ? {} : (stryCov_9fa48("6426"), {
            expectedLength: event.expectedLength
          }) : {})
        })).actions;
        const plan = destinationIdentityHashPlanFromActions(planActions);
        if (stryMutAct_9fa48("6429") ? plan !== null : stryMutAct_9fa48("6428") ? false : stryMutAct_9fa48("6427") ? true : (stryCov_9fa48("6427", "6428", "6429"), plan === null)) {
          if (stryMutAct_9fa48("6430")) {
            {}
          } else {
            stryCov_9fa48("6430");
            return stryMutAct_9fa48("6431") ? {} : (stryCov_9fa48("6431"), {
              state,
              intents: stryMutAct_9fa48("6432") ? ["Stryker was here"] : (stryCov_9fa48("6432"), []),
              actions: stryMutAct_9fa48("6433") ? ["Stryker was here"] : (stryCov_9fa48("6433"), [])
            });
          }
        }
        return stryMutAct_9fa48("6434") ? {} : (stryCov_9fa48("6434"), {
          state,
          intents: stryMutAct_9fa48("6435") ? ["Stryker was here"] : (stryCov_9fa48("6435"), []),
          actions: stryMutAct_9fa48("6436") ? [] : (stryCov_9fa48("6436"), [stryMutAct_9fa48("6437") ? {} : (stryCov_9fa48("6437"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("6438") ? {} : (stryCov_9fa48("6438"), {
      state,
      intents: stryMutAct_9fa48("6439") ? ["Stryker was here"] : (stryCov_9fa48("6439"), []),
      actions: stryMutAct_9fa48("6440") ? ["Stryker was here"] : (stryCov_9fa48("6440"), [])
    });
  }
}
export function destinationIdentityHashFromActions(actions: ReadonlyArray<DestinationIdentityHashAction>): DestinationIdentityHashPlan | null {
  if (stryMutAct_9fa48("6441")) {
    {}
  } else {
    stryCov_9fa48("6441");
    return stryMutAct_9fa48("6442") ? actions[0]?.kind && null : (stryCov_9fa48("6442"), (stryMutAct_9fa48("6443") ? actions[0].kind : (stryCov_9fa48("6443"), actions[0]?.kind)) ?? null);
  }
}
export function shouldUseObjectDestinationIdentityHash(actions: ReadonlyArray<DestinationIdentityHashAction>): boolean {
  if (stryMutAct_9fa48("6444")) {
    {}
  } else {
    stryCov_9fa48("6444");
    return stryMutAct_9fa48("6445") ? actions.every(action => action.kind === "use-object") : (stryCov_9fa48("6445"), actions.some(stryMutAct_9fa48("6446") ? () => undefined : (stryCov_9fa48("6446"), action => stryMutAct_9fa48("6449") ? action.kind !== "use-object" : stryMutAct_9fa48("6448") ? false : stryMutAct_9fa48("6447") ? true : (stryCov_9fa48("6447", "6448", "6449"), action.kind === (stryMutAct_9fa48("6450") ? "" : (stryCov_9fa48("6450"), "use-object"))))));
  }
}
export function shouldUseBytesDestinationIdentityHash(actions: ReadonlyArray<DestinationIdentityHashAction>): boolean {
  if (stryMutAct_9fa48("6451")) {
    {}
  } else {
    stryCov_9fa48("6451");
    return stryMutAct_9fa48("6452") ? actions.every(action => action.kind === "use-bytes") : (stryCov_9fa48("6452"), actions.some(stryMutAct_9fa48("6453") ? () => undefined : (stryCov_9fa48("6453"), action => stryMutAct_9fa48("6456") ? action.kind !== "use-bytes" : stryMutAct_9fa48("6455") ? false : stryMutAct_9fa48("6454") ? true : (stryCov_9fa48("6454", "6455", "6456"), action.kind === (stryMutAct_9fa48("6457") ? "" : (stryCov_9fa48("6457"), "use-bytes"))))));
  }
}
export function shouldRejectLengthDestinationIdentityHash(actions: ReadonlyArray<DestinationIdentityHashAction>): boolean {
  if (stryMutAct_9fa48("6458")) {
    {}
  } else {
    stryCov_9fa48("6458");
    return stryMutAct_9fa48("6459") ? actions.every(action => action.kind === "reject-length") : (stryCov_9fa48("6459"), actions.some(stryMutAct_9fa48("6460") ? () => undefined : (stryCov_9fa48("6460"), action => stryMutAct_9fa48("6463") ? action.kind !== "reject-length" : stryMutAct_9fa48("6462") ? false : stryMutAct_9fa48("6461") ? true : (stryCov_9fa48("6461", "6462", "6463"), action.kind === (stryMutAct_9fa48("6464") ? "" : (stryCov_9fa48("6464"), "reject-length"))))));
  }
}
export function shouldMissDestinationIdentityHash(actions: ReadonlyArray<DestinationIdentityHashAction>): boolean {
  if (stryMutAct_9fa48("6465")) {
    {}
  } else {
    stryCov_9fa48("6465");
    return stryMutAct_9fa48("6466") ? actions.every(action => action.kind === "missing") : (stryCov_9fa48("6466"), actions.some(stryMutAct_9fa48("6467") ? () => undefined : (stryCov_9fa48("6467"), action => stryMutAct_9fa48("6470") ? action.kind !== "missing" : stryMutAct_9fa48("6469") ? false : stryMutAct_9fa48("6468") ? true : (stryCov_9fa48("6468", "6469", "6470"), action.kind === (stryMutAct_9fa48("6471") ? "" : (stryCov_9fa48("6471"), "missing"))))));
  }
}

/**
 * Destination name-part validation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `validateDestinationNamePart` reads beside the step). Empty / dotted parts
 * become `reject`.
 */
export type ValidateDestinationNamePartState = Record<string, never>;
export type ValidateDestinationNamePartEvent = Event | {
  readonly kind: "destination/name-part-gate";
  readonly value: string;
  readonly label: string;
};
export type ValidateDestinationNamePartAction = {
  readonly kind: "proceed";
} | {
  readonly kind: "reject";
};
export interface ValidateDestinationNamePartStepResult {
  readonly state: ValidateDestinationNamePartState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ValidateDestinationNamePartAction[];
}
export function initialValidateDestinationNamePartState(): ValidateDestinationNamePartState {
  if (stryMutAct_9fa48("6472")) {
    {}
  } else {
    stryCov_9fa48("6472");
    return {};
  }
}
export function stepValidateDestinationNamePartWithActions(state: ValidateDestinationNamePartState, event: ValidateDestinationNamePartEvent): ValidateDestinationNamePartStepResult {
  if (stryMutAct_9fa48("6473")) {
    {}
  } else {
    stryCov_9fa48("6473");
    if (stryMutAct_9fa48("6476") ? event.kind !== "destination/name-part-gate" : stryMutAct_9fa48("6475") ? false : stryMutAct_9fa48("6474") ? true : (stryCov_9fa48("6474", "6475", "6476"), event.kind === (stryMutAct_9fa48("6477") ? "" : (stryCov_9fa48("6477"), "destination/name-part-gate")))) {
      if (stryMutAct_9fa48("6478")) {
        {}
      } else {
        stryCov_9fa48("6478");
        try {
          if (stryMutAct_9fa48("6479")) {
            {}
          } else {
            stryCov_9fa48("6479");
            validateDestinationNamePart(event.value, event.label);
            return stryMutAct_9fa48("6480") ? {} : (stryCov_9fa48("6480"), {
              state,
              intents: stryMutAct_9fa48("6481") ? ["Stryker was here"] : (stryCov_9fa48("6481"), []),
              actions: stryMutAct_9fa48("6482") ? [] : (stryCov_9fa48("6482"), [stryMutAct_9fa48("6483") ? {} : (stryCov_9fa48("6483"), {
                kind: stryMutAct_9fa48("6484") ? "" : (stryCov_9fa48("6484"), "proceed")
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("6485")) {
            {}
          } else {
            stryCov_9fa48("6485");
            return stryMutAct_9fa48("6486") ? {} : (stryCov_9fa48("6486"), {
              state,
              intents: stryMutAct_9fa48("6487") ? ["Stryker was here"] : (stryCov_9fa48("6487"), []),
              actions: stryMutAct_9fa48("6488") ? [] : (stryCov_9fa48("6488"), [stryMutAct_9fa48("6489") ? {} : (stryCov_9fa48("6489"), {
                kind: stryMutAct_9fa48("6490") ? "" : (stryCov_9fa48("6490"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("6491") ? {} : (stryCov_9fa48("6491"), {
      state,
      intents: stryMutAct_9fa48("6492") ? ["Stryker was here"] : (stryCov_9fa48("6492"), []),
      actions: stryMutAct_9fa48("6493") ? ["Stryker was here"] : (stryCov_9fa48("6493"), [])
    });
  }
}
export function shouldProceedValidateDestinationNamePart(actions: ReadonlyArray<ValidateDestinationNamePartAction>): boolean {
  if (stryMutAct_9fa48("6494")) {
    {}
  } else {
    stryCov_9fa48("6494");
    return stryMutAct_9fa48("6495") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("6495"), actions.some(stryMutAct_9fa48("6496") ? () => undefined : (stryCov_9fa48("6496"), action => stryMutAct_9fa48("6499") ? action.kind !== "proceed" : stryMutAct_9fa48("6498") ? false : stryMutAct_9fa48("6497") ? true : (stryCov_9fa48("6497", "6498", "6499"), action.kind === (stryMutAct_9fa48("6500") ? "" : (stryCov_9fa48("6500"), "proceed"))))));
  }
}
export function shouldRejectValidateDestinationNamePart(actions: ReadonlyArray<ValidateDestinationNamePartAction>): boolean {
  if (stryMutAct_9fa48("6501")) {
    {}
  } else {
    stryCov_9fa48("6501");
    return stryMutAct_9fa48("6502") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("6502"), actions.some(stryMutAct_9fa48("6503") ? () => undefined : (stryCov_9fa48("6503"), action => stryMutAct_9fa48("6506") ? action.kind !== "reject" : stryMutAct_9fa48("6505") ? false : stryMutAct_9fa48("6504") ? true : (stryCov_9fa48("6504", "6505", "6506"), action.kind === (stryMutAct_9fa48("6507") ? "" : (stryCov_9fa48("6507"), "reject"))))));
  }
}
export interface ExpandDestinationNameFields {
  readonly name: string;
}

/**
 * Destination name expansion is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `expandDestinationName`
 * reads beside the step). Invalid parts / identity-hash length become `reject`.
 */
export type ExpandDestinationNameState = Record<string, never>;
export type ExpandDestinationNameEvent = Event | {
  readonly kind: "destination/expand-name-gate";
  readonly identityHash: Uint8Array | null;
  readonly appName: string;
  readonly aspects?: ReadonlyArray<string>;
};
export type ExpandDestinationNameAction = {
  readonly kind: "use-fields";
  readonly fields: ExpandDestinationNameFields;
} | {
  readonly kind: "reject";
};
export interface ExpandDestinationNameStepResult {
  readonly state: ExpandDestinationNameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ExpandDestinationNameAction[];
}
export function initialExpandDestinationNameState(): ExpandDestinationNameState {
  if (stryMutAct_9fa48("6508")) {
    {}
  } else {
    stryCov_9fa48("6508");
    return {};
  }
}
export function stepExpandDestinationNameWithActions(state: ExpandDestinationNameState, event: ExpandDestinationNameEvent): ExpandDestinationNameStepResult {
  if (stryMutAct_9fa48("6509")) {
    {}
  } else {
    stryCov_9fa48("6509");
    if (stryMutAct_9fa48("6512") ? event.kind !== "destination/expand-name-gate" : stryMutAct_9fa48("6511") ? false : stryMutAct_9fa48("6510") ? true : (stryCov_9fa48("6510", "6511", "6512"), event.kind === (stryMutAct_9fa48("6513") ? "" : (stryCov_9fa48("6513"), "destination/expand-name-gate")))) {
      if (stryMutAct_9fa48("6514")) {
        {}
      } else {
        stryCov_9fa48("6514");
        try {
          if (stryMutAct_9fa48("6515")) {
            {}
          } else {
            stryCov_9fa48("6515");
            return stryMutAct_9fa48("6516") ? {} : (stryCov_9fa48("6516"), {
              state,
              intents: stryMutAct_9fa48("6517") ? ["Stryker was here"] : (stryCov_9fa48("6517"), []),
              actions: stryMutAct_9fa48("6518") ? [] : (stryCov_9fa48("6518"), [stryMutAct_9fa48("6519") ? {} : (stryCov_9fa48("6519"), {
                kind: stryMutAct_9fa48("6520") ? "" : (stryCov_9fa48("6520"), "use-fields"),
                fields: stryMutAct_9fa48("6521") ? {} : (stryCov_9fa48("6521"), {
                  name: expandDestinationName(event.identityHash, event.appName, stryMutAct_9fa48("6522") ? event.aspects && [] : (stryCov_9fa48("6522"), event.aspects ?? (stryMutAct_9fa48("6523") ? ["Stryker was here"] : (stryCov_9fa48("6523"), []))))
                })
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("6524")) {
            {}
          } else {
            stryCov_9fa48("6524");
            return stryMutAct_9fa48("6525") ? {} : (stryCov_9fa48("6525"), {
              state,
              intents: stryMutAct_9fa48("6526") ? ["Stryker was here"] : (stryCov_9fa48("6526"), []),
              actions: stryMutAct_9fa48("6527") ? [] : (stryCov_9fa48("6527"), [stryMutAct_9fa48("6528") ? {} : (stryCov_9fa48("6528"), {
                kind: stryMutAct_9fa48("6529") ? "" : (stryCov_9fa48("6529"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("6530") ? {} : (stryCov_9fa48("6530"), {
      state,
      intents: stryMutAct_9fa48("6531") ? ["Stryker was here"] : (stryCov_9fa48("6531"), []),
      actions: stryMutAct_9fa48("6532") ? ["Stryker was here"] : (stryCov_9fa48("6532"), [])
    });
  }
}
export function shouldUseExpandDestinationName(actions: ReadonlyArray<ExpandDestinationNameAction>): boolean {
  if (stryMutAct_9fa48("6533")) {
    {}
  } else {
    stryCov_9fa48("6533");
    return stryMutAct_9fa48("6534") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("6534"), actions.some(stryMutAct_9fa48("6535") ? () => undefined : (stryCov_9fa48("6535"), action => stryMutAct_9fa48("6538") ? action.kind !== "use-fields" : stryMutAct_9fa48("6537") ? false : stryMutAct_9fa48("6536") ? true : (stryCov_9fa48("6536", "6537", "6538"), action.kind === (stryMutAct_9fa48("6539") ? "" : (stryCov_9fa48("6539"), "use-fields"))))));
  }
}
export function shouldRejectExpandDestinationName(actions: ReadonlyArray<ExpandDestinationNameAction>): boolean {
  if (stryMutAct_9fa48("6540")) {
    {}
  } else {
    stryCov_9fa48("6540");
    return stryMutAct_9fa48("6541") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("6541"), actions.some(stryMutAct_9fa48("6542") ? () => undefined : (stryCov_9fa48("6542"), action => stryMutAct_9fa48("6545") ? action.kind !== "reject" : stryMutAct_9fa48("6544") ? false : stryMutAct_9fa48("6543") ? true : (stryCov_9fa48("6543", "6544", "6545"), action.kind === (stryMutAct_9fa48("6546") ? "" : (stryCov_9fa48("6546"), "reject"))))));
  }
}

/** Extract expanded destination name from step actions; null when no `use-fields`. */
export function expandedDestinationNameFromActions(actions: ReadonlyArray<ExpandDestinationNameAction>): string | null {
  if (stryMutAct_9fa48("6547")) {
    {}
  } else {
    stryCov_9fa48("6547");
    const action = actions.find(stryMutAct_9fa48("6548") ? () => undefined : (stryCov_9fa48("6548"), entry => stryMutAct_9fa48("6551") ? entry.kind !== "use-fields" : stryMutAct_9fa48("6550") ? false : stryMutAct_9fa48("6549") ? true : (stryCov_9fa48("6549", "6550", "6551"), entry.kind === (stryMutAct_9fa48("6552") ? "" : (stryCov_9fa48("6552"), "use-fields")))));
    return (stryMutAct_9fa48("6555") ? action?.kind !== "use-fields" : stryMutAct_9fa48("6554") ? false : stryMutAct_9fa48("6553") ? true : (stryCov_9fa48("6553", "6554", "6555"), (stryMutAct_9fa48("6556") ? action.kind : (stryCov_9fa48("6556"), action?.kind)) === (stryMutAct_9fa48("6557") ? "" : (stryCov_9fa48("6557"), "use-fields")))) ? action.fields.name : null;
  }
}

/**
 * Destination name-hash material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `destinationNameHashMaterial` reads beside the step). Invalid name parts
 * become `reject`.
 */
export type DestinationNameHashMaterialState = Record<string, never>;
export type DestinationNameHashMaterialEvent = Event | {
  readonly kind: "destination/name-hash-material-gate";
  readonly appName: string;
  readonly aspects?: ReadonlyArray<string>;
};
export type DestinationNameHashMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface DestinationNameHashMaterialStepResult {
  readonly state: DestinationNameHashMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationNameHashMaterialAction[];
}
export function initialDestinationNameHashMaterialState(): DestinationNameHashMaterialState {
  if (stryMutAct_9fa48("6558")) {
    {}
  } else {
    stryCov_9fa48("6558");
    return {};
  }
}
export function stepDestinationNameHashMaterialWithActions(state: DestinationNameHashMaterialState, event: DestinationNameHashMaterialEvent): DestinationNameHashMaterialStepResult {
  if (stryMutAct_9fa48("6559")) {
    {}
  } else {
    stryCov_9fa48("6559");
    if (stryMutAct_9fa48("6562") ? event.kind !== "destination/name-hash-material-gate" : stryMutAct_9fa48("6561") ? false : stryMutAct_9fa48("6560") ? true : (stryCov_9fa48("6560", "6561", "6562"), event.kind === (stryMutAct_9fa48("6563") ? "" : (stryCov_9fa48("6563"), "destination/name-hash-material-gate")))) {
      if (stryMutAct_9fa48("6564")) {
        {}
      } else {
        stryCov_9fa48("6564");
        try {
          if (stryMutAct_9fa48("6565")) {
            {}
          } else {
            stryCov_9fa48("6565");
            return stryMutAct_9fa48("6566") ? {} : (stryCov_9fa48("6566"), {
              state,
              intents: stryMutAct_9fa48("6567") ? ["Stryker was here"] : (stryCov_9fa48("6567"), []),
              actions: stryMutAct_9fa48("6568") ? [] : (stryCov_9fa48("6568"), [stryMutAct_9fa48("6569") ? {} : (stryCov_9fa48("6569"), {
                kind: stryMutAct_9fa48("6570") ? "" : (stryCov_9fa48("6570"), "use-raw"),
                raw: destinationNameHashMaterial(event.appName, stryMutAct_9fa48("6571") ? event.aspects && [] : (stryCov_9fa48("6571"), event.aspects ?? (stryMutAct_9fa48("6572") ? ["Stryker was here"] : (stryCov_9fa48("6572"), []))))
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("6573")) {
            {}
          } else {
            stryCov_9fa48("6573");
            return stryMutAct_9fa48("6574") ? {} : (stryCov_9fa48("6574"), {
              state,
              intents: stryMutAct_9fa48("6575") ? ["Stryker was here"] : (stryCov_9fa48("6575"), []),
              actions: stryMutAct_9fa48("6576") ? [] : (stryCov_9fa48("6576"), [stryMutAct_9fa48("6577") ? {} : (stryCov_9fa48("6577"), {
                kind: stryMutAct_9fa48("6578") ? "" : (stryCov_9fa48("6578"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("6579") ? {} : (stryCov_9fa48("6579"), {
      state,
      intents: stryMutAct_9fa48("6580") ? ["Stryker was here"] : (stryCov_9fa48("6580"), []),
      actions: stryMutAct_9fa48("6581") ? ["Stryker was here"] : (stryCov_9fa48("6581"), [])
    });
  }
}
export function shouldUseDestinationNameHashMaterial(actions: ReadonlyArray<DestinationNameHashMaterialAction>): boolean {
  if (stryMutAct_9fa48("6582")) {
    {}
  } else {
    stryCov_9fa48("6582");
    return stryMutAct_9fa48("6583") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("6583"), actions.some(stryMutAct_9fa48("6584") ? () => undefined : (stryCov_9fa48("6584"), action => stryMutAct_9fa48("6587") ? action.kind !== "use-raw" : stryMutAct_9fa48("6586") ? false : stryMutAct_9fa48("6585") ? true : (stryCov_9fa48("6585", "6586", "6587"), action.kind === (stryMutAct_9fa48("6588") ? "" : (stryCov_9fa48("6588"), "use-raw"))))));
  }
}
export function shouldRejectDestinationNameHashMaterial(actions: ReadonlyArray<DestinationNameHashMaterialAction>): boolean {
  if (stryMutAct_9fa48("6589")) {
    {}
  } else {
    stryCov_9fa48("6589");
    return stryMutAct_9fa48("6590") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("6590"), actions.some(stryMutAct_9fa48("6591") ? () => undefined : (stryCov_9fa48("6591"), action => stryMutAct_9fa48("6594") ? action.kind !== "reject" : stryMutAct_9fa48("6593") ? false : stryMutAct_9fa48("6592") ? true : (stryCov_9fa48("6592", "6593", "6594"), action.kind === (stryMutAct_9fa48("6595") ? "" : (stryCov_9fa48("6595"), "reject"))))));
  }
}

/** Extract name-hash material bytes from step actions; null when no `use-raw`. */
export function destinationNameHashMaterialRawFromActions(actions: ReadonlyArray<DestinationNameHashMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("6596")) {
    {}
  } else {
    stryCov_9fa48("6596");
    const action = actions.find(stryMutAct_9fa48("6597") ? () => undefined : (stryCov_9fa48("6597"), entry => stryMutAct_9fa48("6600") ? entry.kind !== "use-raw" : stryMutAct_9fa48("6599") ? false : stryMutAct_9fa48("6598") ? true : (stryCov_9fa48("6598", "6599", "6600"), entry.kind === (stryMutAct_9fa48("6601") ? "" : (stryCov_9fa48("6601"), "use-raw")))));
    return (stryMutAct_9fa48("6604") ? action?.kind !== "use-raw" : stryMutAct_9fa48("6603") ? false : stryMutAct_9fa48("6602") ? true : (stryCov_9fa48("6602", "6603", "6604"), (stryMutAct_9fa48("6605") ? action.kind : (stryCov_9fa48("6605"), action?.kind)) === (stryMutAct_9fa48("6606") ? "" : (stryCov_9fa48("6606"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Destination hash material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `destinationHashMaterial`
 * reads beside the step).
 */
export type DestinationHashMaterialState = Record<string, never>;
export type DestinationHashMaterialEvent = Event | {
  readonly kind: "destination/hash-material-gate";
  readonly nameHash: Uint8Array;
  readonly identityHash: Uint8Array | null;
};
export type DestinationHashMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface DestinationHashMaterialStepResult {
  readonly state: DestinationHashMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationHashMaterialAction[];
}
export function initialDestinationHashMaterialState(): DestinationHashMaterialState {
  if (stryMutAct_9fa48("6607")) {
    {}
  } else {
    stryCov_9fa48("6607");
    return {};
  }
}
export function stepDestinationHashMaterialWithActions(state: DestinationHashMaterialState, event: DestinationHashMaterialEvent): DestinationHashMaterialStepResult {
  if (stryMutAct_9fa48("6608")) {
    {}
  } else {
    stryCov_9fa48("6608");
    if (stryMutAct_9fa48("6611") ? event.kind !== "destination/hash-material-gate" : stryMutAct_9fa48("6610") ? false : stryMutAct_9fa48("6609") ? true : (stryCov_9fa48("6609", "6610", "6611"), event.kind === (stryMutAct_9fa48("6612") ? "" : (stryCov_9fa48("6612"), "destination/hash-material-gate")))) {
      if (stryMutAct_9fa48("6613")) {
        {}
      } else {
        stryCov_9fa48("6613");
        return stryMutAct_9fa48("6614") ? {} : (stryCov_9fa48("6614"), {
          state,
          intents: stryMutAct_9fa48("6615") ? ["Stryker was here"] : (stryCov_9fa48("6615"), []),
          actions: stryMutAct_9fa48("6616") ? [] : (stryCov_9fa48("6616"), [stryMutAct_9fa48("6617") ? {} : (stryCov_9fa48("6617"), {
            kind: stryMutAct_9fa48("6618") ? "" : (stryCov_9fa48("6618"), "use-raw"),
            raw: destinationHashMaterial(event.nameHash, event.identityHash)
          })])
        });
      }
    }
    return stryMutAct_9fa48("6619") ? {} : (stryCov_9fa48("6619"), {
      state,
      intents: stryMutAct_9fa48("6620") ? ["Stryker was here"] : (stryCov_9fa48("6620"), []),
      actions: stryMutAct_9fa48("6621") ? ["Stryker was here"] : (stryCov_9fa48("6621"), [])
    });
  }
}
export function shouldUseDestinationHashMaterial(actions: ReadonlyArray<DestinationHashMaterialAction>): boolean {
  if (stryMutAct_9fa48("6622")) {
    {}
  } else {
    stryCov_9fa48("6622");
    return stryMutAct_9fa48("6623") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("6623"), actions.some(stryMutAct_9fa48("6624") ? () => undefined : (stryCov_9fa48("6624"), action => stryMutAct_9fa48("6627") ? action.kind !== "use-raw" : stryMutAct_9fa48("6626") ? false : stryMutAct_9fa48("6625") ? true : (stryCov_9fa48("6625", "6626", "6627"), action.kind === (stryMutAct_9fa48("6628") ? "" : (stryCov_9fa48("6628"), "use-raw"))))));
  }
}

/** Extract destination hash material bytes from step actions; null when no `use-raw`. */
export function destinationHashMaterialRawFromActions(actions: ReadonlyArray<DestinationHashMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("6629")) {
    {}
  } else {
    stryCov_9fa48("6629");
    const action = actions.find(stryMutAct_9fa48("6630") ? () => undefined : (stryCov_9fa48("6630"), entry => stryMutAct_9fa48("6633") ? entry.kind !== "use-raw" : stryMutAct_9fa48("6632") ? false : stryMutAct_9fa48("6631") ? true : (stryCov_9fa48("6631", "6632", "6633"), entry.kind === (stryMutAct_9fa48("6634") ? "" : (stryCov_9fa48("6634"), "use-raw")))));
    return (stryMutAct_9fa48("6637") ? action?.kind !== "use-raw" : stryMutAct_9fa48("6636") ? false : stryMutAct_9fa48("6635") ? true : (stryCov_9fa48("6635", "6636", "6637"), (stryMutAct_9fa48("6638") ? action.kind : (stryCov_9fa48("6638"), action?.kind)) === (stryMutAct_9fa48("6639") ? "" : (stryCov_9fa48("6639"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Aspect-filter parse is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `parseAspectFilter` reads
 * beside the step). Empty / all-empty filters become `reject`.
 */
export type ParseAspectFilterState = Record<string, never>;
export type ParseAspectFilterEvent = Event | {
  readonly kind: "destination/aspect-filter-gate";
  readonly filter: string;
};
export type ParseAspectFilterAction = {
  readonly kind: "use-fields";
  readonly fields: ParsedAspectFilter;
} | {
  readonly kind: "reject";
};
export interface ParseAspectFilterStepResult {
  readonly state: ParseAspectFilterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ParseAspectFilterAction[];
}
export function initialParseAspectFilterState(): ParseAspectFilterState {
  if (stryMutAct_9fa48("6640")) {
    {}
  } else {
    stryCov_9fa48("6640");
    return {};
  }
}
export function stepParseAspectFilterWithActions(state: ParseAspectFilterState, event: ParseAspectFilterEvent): ParseAspectFilterStepResult {
  if (stryMutAct_9fa48("6641")) {
    {}
  } else {
    stryCov_9fa48("6641");
    if (stryMutAct_9fa48("6644") ? event.kind !== "destination/aspect-filter-gate" : stryMutAct_9fa48("6643") ? false : stryMutAct_9fa48("6642") ? true : (stryCov_9fa48("6642", "6643", "6644"), event.kind === (stryMutAct_9fa48("6645") ? "" : (stryCov_9fa48("6645"), "destination/aspect-filter-gate")))) {
      if (stryMutAct_9fa48("6646")) {
        {}
      } else {
        stryCov_9fa48("6646");
        const fields = parseAspectFilter(event.filter);
        if (stryMutAct_9fa48("6649") ? fields !== null : stryMutAct_9fa48("6648") ? false : stryMutAct_9fa48("6647") ? true : (stryCov_9fa48("6647", "6648", "6649"), fields === null)) {
          if (stryMutAct_9fa48("6650")) {
            {}
          } else {
            stryCov_9fa48("6650");
            return stryMutAct_9fa48("6651") ? {} : (stryCov_9fa48("6651"), {
              state,
              intents: stryMutAct_9fa48("6652") ? ["Stryker was here"] : (stryCov_9fa48("6652"), []),
              actions: stryMutAct_9fa48("6653") ? [] : (stryCov_9fa48("6653"), [stryMutAct_9fa48("6654") ? {} : (stryCov_9fa48("6654"), {
                kind: stryMutAct_9fa48("6655") ? "" : (stryCov_9fa48("6655"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("6656") ? {} : (stryCov_9fa48("6656"), {
          state,
          intents: stryMutAct_9fa48("6657") ? ["Stryker was here"] : (stryCov_9fa48("6657"), []),
          actions: stryMutAct_9fa48("6658") ? [] : (stryCov_9fa48("6658"), [stryMutAct_9fa48("6659") ? {} : (stryCov_9fa48("6659"), {
            kind: stryMutAct_9fa48("6660") ? "" : (stryCov_9fa48("6660"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("6661") ? {} : (stryCov_9fa48("6661"), {
      state,
      intents: stryMutAct_9fa48("6662") ? ["Stryker was here"] : (stryCov_9fa48("6662"), []),
      actions: stryMutAct_9fa48("6663") ? ["Stryker was here"] : (stryCov_9fa48("6663"), [])
    });
  }
}
export function shouldUseParseAspectFilter(actions: ReadonlyArray<ParseAspectFilterAction>): boolean {
  if (stryMutAct_9fa48("6664")) {
    {}
  } else {
    stryCov_9fa48("6664");
    return stryMutAct_9fa48("6665") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("6665"), actions.some(stryMutAct_9fa48("6666") ? () => undefined : (stryCov_9fa48("6666"), action => stryMutAct_9fa48("6669") ? action.kind !== "use-fields" : stryMutAct_9fa48("6668") ? false : stryMutAct_9fa48("6667") ? true : (stryCov_9fa48("6667", "6668", "6669"), action.kind === (stryMutAct_9fa48("6670") ? "" : (stryCov_9fa48("6670"), "use-fields"))))));
  }
}
export function shouldRejectParseAspectFilter(actions: ReadonlyArray<ParseAspectFilterAction>): boolean {
  if (stryMutAct_9fa48("6671")) {
    {}
  } else {
    stryCov_9fa48("6671");
    return stryMutAct_9fa48("6672") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("6672"), actions.some(stryMutAct_9fa48("6673") ? () => undefined : (stryCov_9fa48("6673"), action => stryMutAct_9fa48("6676") ? action.kind !== "reject" : stryMutAct_9fa48("6675") ? false : stryMutAct_9fa48("6674") ? true : (stryCov_9fa48("6674", "6675", "6676"), action.kind === (stryMutAct_9fa48("6677") ? "" : (stryCov_9fa48("6677"), "reject"))))));
  }
}

/** Extract parsed aspect filter from step actions; null when no `use-fields`. */
export function aspectFilterFromActions(actions: ReadonlyArray<ParseAspectFilterAction>): ParsedAspectFilter | null {
  if (stryMutAct_9fa48("6678")) {
    {}
  } else {
    stryCov_9fa48("6678");
    const action = actions.find(stryMutAct_9fa48("6679") ? () => undefined : (stryCov_9fa48("6679"), entry => stryMutAct_9fa48("6682") ? entry.kind !== "use-fields" : stryMutAct_9fa48("6681") ? false : stryMutAct_9fa48("6680") ? true : (stryCov_9fa48("6680", "6681", "6682"), entry.kind === (stryMutAct_9fa48("6683") ? "" : (stryCov_9fa48("6683"), "use-fields")))));
    return (stryMutAct_9fa48("6686") ? action?.kind !== "use-fields" : stryMutAct_9fa48("6685") ? false : stryMutAct_9fa48("6684") ? true : (stryCov_9fa48("6684", "6685", "6686"), (stryMutAct_9fa48("6687") ? action.kind : (stryCov_9fa48("6687"), action?.kind)) === (stryMutAct_9fa48("6688") ? "" : (stryCov_9fa48("6688"), "use-fields")))) ? action.fields : null;
  }
}