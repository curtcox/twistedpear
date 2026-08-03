/** Extracted from resource-hashmap.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS resource hashmap-update framing and request parsing.
 * Link send/receive stays at the adapter edge.
 * Pack / unpack / split / parse / collision-guard / membership / assemble /
 * request-hash conclusions leave via machine actions (no ad-hoc
 * `packResourceHashmapUpdate` / `unpackResourceHashmapUpdate` /
 * `packResourceHashmapUpdatePacket` / `splitResourceHashmapUpdatePacket` /
 * `parseResourcePartRequest` / `appendResourceMapHashCollisionGuard` /
 * `containsResourceHash` / `indexOfResourceHash` /
 * `assembleResourceHashmapBytes` / `readResourceRequestHash` reads beside
 * the step). Slot-write plan nested via
 * {@link stepResourceHashmapSlotWritesPlanWithActions}.
 * Part-request / receive-part / request-fulfill / HMU-accept plans nest via
 * {@link stepResourcePartRequestPlanWithActions} /
 * {@link stepResourceReceivePartPlanWithActions} /
 * {@link stepResourceRequestFulfillPlanWithActions} /
 * {@link stepResourceHashmapUpdateAcceptPlanWithActions}.
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
import { assembleByteArrays, concatByteArrays } from "../bytes.js";
import { msgpackPackArray, msgpackPackBin, msgpackPackUInt, msgpackUnpack, type MsgpackValue } from "../msgpack-core.js";
import { equalByteArrays } from "../path-table.js";
import { RESOURCE_HASHMAP_IS_EXHAUSTED, RESOURCE_HASHMAP_IS_NOT_EXHAUSTED, concatBytes } from "./part-1.js";
import type { ResourcePartRequest, ResourcePartRequestPlan } from "./part-1.js";
/**
 * Plan the next RESOURCE_REQ body from receiver window / hashmap state.
 * Send stays at the adapter edge.
 */
export function planResourcePartRequest(input: {
  readonly receivedParts: ReadonlyArray<Uint8Array | null>;
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly consecutiveCompletedHeight: number;
  readonly window: number;
  readonly hashmapHeight: number;
  readonly resourceHash: Uint8Array;
}): ResourcePartRequestPlan {
  if (stryMutAct_9fa48("29526")) {
    {}
  } else {
    stryCov_9fa48("29526");
    let outstandingParts = 0;
    let hashmapExhausted = RESOURCE_HASHMAP_IS_NOT_EXHAUSTED;
    const requestedHashes: Uint8Array[] = stryMutAct_9fa48("29527") ? ["Stryker was here"] : (stryCov_9fa48("29527"), []);
    let index = 0;
    let partNumber = stryMutAct_9fa48("29528") ? input.consecutiveCompletedHeight - 1 : (stryCov_9fa48("29528"), input.consecutiveCompletedHeight + 1);
    const searchStart = partNumber;
    const searchEnd = stryMutAct_9fa48("29529") ? Math.max(searchStart + input.window, input.receivedParts.length) : (stryCov_9fa48("29529"), Math.min(stryMutAct_9fa48("29530") ? searchStart - input.window : (stryCov_9fa48("29530"), searchStart + input.window), input.receivedParts.length));
    for (let cursor = searchStart; stryMutAct_9fa48("29533") ? cursor >= searchEnd : stryMutAct_9fa48("29532") ? cursor <= searchEnd : stryMutAct_9fa48("29531") ? false : (stryCov_9fa48("29531", "29532", "29533"), cursor < searchEnd); stryMutAct_9fa48("29534") ? cursor -= 1 : (stryCov_9fa48("29534"), cursor += 1)) {
      if (stryMutAct_9fa48("29535")) {
        {}
      } else {
        stryCov_9fa48("29535");
        const part = input.receivedParts[cursor];
        if (stryMutAct_9fa48("29538") ? part !== null : stryMutAct_9fa48("29537") ? false : stryMutAct_9fa48("29536") ? true : (stryCov_9fa48("29536", "29537", "29538"), part === null)) {
          if (stryMutAct_9fa48("29539")) {
            {}
          } else {
            stryCov_9fa48("29539");
            const mapHash = input.hashmap[partNumber];
            if (stryMutAct_9fa48("29542") ? mapHash !== null || mapHash !== undefined : stryMutAct_9fa48("29541") ? false : stryMutAct_9fa48("29540") ? true : (stryCov_9fa48("29540", "29541", "29542"), (stryMutAct_9fa48("29544") ? mapHash === null : stryMutAct_9fa48("29543") ? true : (stryCov_9fa48("29543", "29544"), mapHash !== null)) && (stryMutAct_9fa48("29546") ? mapHash === undefined : stryMutAct_9fa48("29545") ? true : (stryCov_9fa48("29545", "29546"), mapHash !== undefined)))) {
              if (stryMutAct_9fa48("29547")) {
                {}
              } else {
                stryCov_9fa48("29547");
                requestedHashes.push(mapHash);
                stryMutAct_9fa48("29548") ? outstandingParts -= 1 : (stryCov_9fa48("29548"), outstandingParts += 1);
                stryMutAct_9fa48("29549") ? index -= 1 : (stryCov_9fa48("29549"), index += 1);
              }
            } else {
              if (stryMutAct_9fa48("29550")) {
                {}
              } else {
                stryCov_9fa48("29550");
                hashmapExhausted = RESOURCE_HASHMAP_IS_EXHAUSTED;
                break;
              }
            }
          }
        }
        stryMutAct_9fa48("29551") ? partNumber -= 1 : (stryCov_9fa48("29551"), partNumber += 1);
        if (stryMutAct_9fa48("29554") ? index >= input.window && hashmapExhausted === RESOURCE_HASHMAP_IS_EXHAUSTED : stryMutAct_9fa48("29553") ? false : stryMutAct_9fa48("29552") ? true : (stryCov_9fa48("29552", "29553", "29554"), (stryMutAct_9fa48("29557") ? index < input.window : stryMutAct_9fa48("29556") ? index > input.window : stryMutAct_9fa48("29555") ? false : (stryCov_9fa48("29555", "29556", "29557"), index >= input.window)) || (stryMutAct_9fa48("29559") ? hashmapExhausted !== RESOURCE_HASHMAP_IS_EXHAUSTED : stryMutAct_9fa48("29558") ? false : (stryCov_9fa48("29558", "29559"), hashmapExhausted === RESOURCE_HASHMAP_IS_EXHAUSTED)))) {
          if (stryMutAct_9fa48("29560")) {
            {}
          } else {
            stryCov_9fa48("29560");
            break;
          }
        }
      }
    }
    let requestPrefix = new Uint8Array(stryMutAct_9fa48("29561") ? [] : (stryCov_9fa48("29561"), [hashmapExhausted]));
    let waitingForHashmap = stryMutAct_9fa48("29562") ? true : (stryCov_9fa48("29562"), false);
    if (stryMutAct_9fa48("29565") ? hashmapExhausted !== RESOURCE_HASHMAP_IS_EXHAUSTED : stryMutAct_9fa48("29564") ? false : stryMutAct_9fa48("29563") ? true : (stryCov_9fa48("29563", "29564", "29565"), hashmapExhausted === RESOURCE_HASHMAP_IS_EXHAUSTED)) {
      if (stryMutAct_9fa48("29566")) {
        {}
      } else {
        stryCov_9fa48("29566");
        const lastMapHash = input.hashmap[stryMutAct_9fa48("29567") ? input.hashmapHeight + 1 : (stryCov_9fa48("29567"), input.hashmapHeight - 1)];
        if (stryMutAct_9fa48("29570") ? lastMapHash !== null || lastMapHash !== undefined : stryMutAct_9fa48("29569") ? false : stryMutAct_9fa48("29568") ? true : (stryCov_9fa48("29568", "29569", "29570"), (stryMutAct_9fa48("29572") ? lastMapHash === null : stryMutAct_9fa48("29571") ? true : (stryCov_9fa48("29571", "29572"), lastMapHash !== null)) && (stryMutAct_9fa48("29574") ? lastMapHash === undefined : stryMutAct_9fa48("29573") ? true : (stryCov_9fa48("29573", "29574"), lastMapHash !== undefined)))) {
          if (stryMutAct_9fa48("29575")) {
            {}
          } else {
            stryCov_9fa48("29575");
            requestPrefix = concatBytes(requestPrefix, lastMapHash);
            waitingForHashmap = stryMutAct_9fa48("29576") ? false : (stryCov_9fa48("29576"), true);
          }
        }
      }
    }
    return stryMutAct_9fa48("29577") ? {} : (stryCov_9fa48("29577"), {
      outstandingParts,
      waitingForHashmap,
      requestData: concatBytes(requestPrefix, input.resourceHash, ...requestedHashes)
    });
  }
}
export interface ResourceReceivePartPlan {
  readonly matched: boolean;
  readonly slot: number | null;
  readonly consecutiveCompletedHeight: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly progress: number;
  readonly shouldAssemble: boolean;
  readonly shouldRequestNext: boolean;
}

/**
 * Plan accepting a received part into the windowed hashmap.
 * Hashing of part data stays at the adapter edge.
 */
export function planResourceReceivePart(input: {
  readonly partHash: Uint8Array;
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly receivedParts: ReadonlyArray<Uint8Array | null>;
  readonly consecutiveCompletedHeight: number;
  readonly window: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly totalParts: number;
  readonly assemblyStarted: boolean;
}): ResourceReceivePartPlan {
  if (stryMutAct_9fa48("29578")) {
    {}
  } else {
    stryCov_9fa48("29578");
    let consecutiveCompletedHeight = input.consecutiveCompletedHeight;
    let receivedCount = input.receivedCount;
    let outstandingParts = input.outstandingParts;
    let matched = stryMutAct_9fa48("29579") ? true : (stryCov_9fa48("29579"), false);
    let slot: number | null = null;
    let index = stryMutAct_9fa48("29580") ? Math.min(consecutiveCompletedHeight + 1, 0) : (stryCov_9fa48("29580"), Math.max(stryMutAct_9fa48("29581") ? consecutiveCompletedHeight - 1 : (stryCov_9fa48("29581"), consecutiveCompletedHeight + 1), 0));
    const searchEnd = stryMutAct_9fa48("29582") ? Math.max(index + input.window, input.hashmap.length) : (stryCov_9fa48("29582"), Math.min(stryMutAct_9fa48("29583") ? index - input.window : (stryCov_9fa48("29583"), index + input.window), input.hashmap.length));
    for (; stryMutAct_9fa48("29586") ? index >= searchEnd : stryMutAct_9fa48("29585") ? index <= searchEnd : stryMutAct_9fa48("29584") ? false : (stryCov_9fa48("29584", "29585", "29586"), index < searchEnd); stryMutAct_9fa48("29587") ? index -= 1 : (stryCov_9fa48("29587"), index += 1)) {
      if (stryMutAct_9fa48("29588")) {
        {}
      } else {
        stryCov_9fa48("29588");
        const mapHash = input.hashmap[index];
        if (stryMutAct_9fa48("29591") ? mapHash !== null && mapHash !== undefined && equalByteArrays(mapHash, input.partHash) || input.receivedParts[index] === null : stryMutAct_9fa48("29590") ? false : stryMutAct_9fa48("29589") ? true : (stryCov_9fa48("29589", "29590", "29591"), (stryMutAct_9fa48("29593") ? mapHash !== null && mapHash !== undefined || equalByteArrays(mapHash, input.partHash) : stryMutAct_9fa48("29592") ? true : (stryCov_9fa48("29592", "29593"), (stryMutAct_9fa48("29595") ? mapHash !== null || mapHash !== undefined : stryMutAct_9fa48("29594") ? true : (stryCov_9fa48("29594", "29595"), (stryMutAct_9fa48("29597") ? mapHash === null : stryMutAct_9fa48("29596") ? true : (stryCov_9fa48("29596", "29597"), mapHash !== null)) && (stryMutAct_9fa48("29599") ? mapHash === undefined : stryMutAct_9fa48("29598") ? true : (stryCov_9fa48("29598", "29599"), mapHash !== undefined)))) && equalByteArrays(mapHash, input.partHash))) && (stryMutAct_9fa48("29601") ? input.receivedParts[index] !== null : stryMutAct_9fa48("29600") ? true : (stryCov_9fa48("29600", "29601"), input.receivedParts[index] === null)))) {
          if (stryMutAct_9fa48("29602")) {
            {}
          } else {
            stryCov_9fa48("29602");
            matched = stryMutAct_9fa48("29603") ? false : (stryCov_9fa48("29603"), true);
            slot = index;
            stryMutAct_9fa48("29604") ? receivedCount -= 1 : (stryCov_9fa48("29604"), receivedCount += 1);
            stryMutAct_9fa48("29605") ? outstandingParts += 1 : (stryCov_9fa48("29605"), outstandingParts -= 1);
            if (stryMutAct_9fa48("29608") ? index !== consecutiveCompletedHeight + 1 : stryMutAct_9fa48("29607") ? false : stryMutAct_9fa48("29606") ? true : (stryCov_9fa48("29606", "29607", "29608"), index === (stryMutAct_9fa48("29609") ? consecutiveCompletedHeight - 1 : (stryCov_9fa48("29609"), consecutiveCompletedHeight + 1)))) {
              if (stryMutAct_9fa48("29610")) {
                {}
              } else {
                stryCov_9fa48("29610");
                consecutiveCompletedHeight = index;
              }
            }
            let cursor = stryMutAct_9fa48("29611") ? consecutiveCompletedHeight - 1 : (stryCov_9fa48("29611"), consecutiveCompletedHeight + 1);
            while (stryMutAct_9fa48("29614") ? cursor >= input.receivedParts.length : stryMutAct_9fa48("29613") ? cursor <= input.receivedParts.length : stryMutAct_9fa48("29612") ? false : (stryCov_9fa48("29612", "29613", "29614"), cursor < input.receivedParts.length)) {
              if (stryMutAct_9fa48("29615")) {
                {}
              } else {
                stryCov_9fa48("29615");
                // After placing the current part, treat this slot as filled for contiguous scan.
                const filled = stryMutAct_9fa48("29618") ? cursor === index && input.receivedParts[cursor] !== null && input.receivedParts[cursor] !== undefined : stryMutAct_9fa48("29617") ? false : stryMutAct_9fa48("29616") ? true : (stryCov_9fa48("29616", "29617", "29618"), (stryMutAct_9fa48("29620") ? cursor !== index : stryMutAct_9fa48("29619") ? false : (stryCov_9fa48("29619", "29620"), cursor === index)) || (stryMutAct_9fa48("29622") ? input.receivedParts[cursor] !== null || input.receivedParts[cursor] !== undefined : stryMutAct_9fa48("29621") ? false : (stryCov_9fa48("29621", "29622"), (stryMutAct_9fa48("29624") ? input.receivedParts[cursor] === null : stryMutAct_9fa48("29623") ? true : (stryCov_9fa48("29623", "29624"), input.receivedParts[cursor] !== null)) && (stryMutAct_9fa48("29626") ? input.receivedParts[cursor] === undefined : stryMutAct_9fa48("29625") ? true : (stryCov_9fa48("29625", "29626"), input.receivedParts[cursor] !== undefined)))));
                if (stryMutAct_9fa48("29629") ? false : stryMutAct_9fa48("29628") ? true : stryMutAct_9fa48("29627") ? filled : (stryCov_9fa48("29627", "29628", "29629"), !filled)) {
                  if (stryMutAct_9fa48("29630")) {
                    {}
                  } else {
                    stryCov_9fa48("29630");
                    break;
                  }
                }
                consecutiveCompletedHeight = cursor;
                stryMutAct_9fa48("29631") ? cursor -= 1 : (stryCov_9fa48("29631"), cursor += 1);
              }
            }
            break;
          }
        }
      }
    }
    const progress = (stryMutAct_9fa48("29634") ? input.totalParts !== 0 : stryMutAct_9fa48("29633") ? false : stryMutAct_9fa48("29632") ? true : (stryCov_9fa48("29632", "29633", "29634"), input.totalParts === 0)) ? 0 : stryMutAct_9fa48("29635") ? receivedCount * input.totalParts : (stryCov_9fa48("29635"), receivedCount / input.totalParts);
    const shouldAssemble = stryMutAct_9fa48("29638") ? receivedCount === input.totalParts || !input.assemblyStarted : stryMutAct_9fa48("29637") ? false : stryMutAct_9fa48("29636") ? true : (stryCov_9fa48("29636", "29637", "29638"), (stryMutAct_9fa48("29640") ? receivedCount !== input.totalParts : stryMutAct_9fa48("29639") ? true : (stryCov_9fa48("29639", "29640"), receivedCount === input.totalParts)) && (stryMutAct_9fa48("29641") ? input.assemblyStarted : (stryCov_9fa48("29641"), !input.assemblyStarted)));
    const shouldRequestNext = stryMutAct_9fa48("29644") ? !shouldAssemble || outstandingParts === 0 : stryMutAct_9fa48("29643") ? false : stryMutAct_9fa48("29642") ? true : (stryCov_9fa48("29642", "29643", "29644"), (stryMutAct_9fa48("29645") ? shouldAssemble : (stryCov_9fa48("29645"), !shouldAssemble)) && (stryMutAct_9fa48("29647") ? outstandingParts !== 0 : stryMutAct_9fa48("29646") ? true : (stryCov_9fa48("29646", "29647"), outstandingParts === 0)));
    return stryMutAct_9fa48("29648") ? {} : (stryCov_9fa48("29648"), {
      matched,
      slot,
      consecutiveCompletedHeight,
      receivedCount,
      outstandingParts,
      progress,
      shouldAssemble,
      shouldRequestNext
    });
  }
}
export interface ResourceRequestFulfillPartAction {
  readonly index: number;
  readonly kind: "send" | "resend";
}
export interface ResourceRequestFulfillHashmapUpdate {
  readonly segment: number;
  readonly mapHashes: readonly Uint8Array[];
  readonly nextReceiverMinConsecutiveHeight: number;
}
export interface ResourceRequestFulfillPlan {
  readonly partActions: readonly ResourceRequestFulfillPartAction[];
  readonly hashmapUpdate: ResourceRequestFulfillHashmapUpdate | null;
  readonly nextSentParts: number;
  readonly nextReceiverMinConsecutiveHeight: number;
  readonly status: "transferring" | "awaiting-proof";
}

/**
 * Plan sender-side fulfillment of a RESOURCE_REQ (matched parts + optional HMU).
 * Send / resend / HMU emit stay at the adapter edge.
 */
export function planResourceRequestFulfill(input: {
  readonly request: ResourcePartRequest;
  readonly partMapHashes: ReadonlyArray<Uint8Array>;
  readonly partSent: ReadonlyArray<boolean>;
  readonly receiverMinConsecutiveHeight: number;
  readonly hashmapMaxLen: number;
  readonly windowMax: number;
  readonly totalParts: number;
  readonly sentParts: number;
}): ResourceRequestFulfillPlan {
  if (stryMutAct_9fa48("29649")) {
    {}
  } else {
    stryCov_9fa48("29649");
    const partActions: ResourceRequestFulfillPartAction[] = stryMutAct_9fa48("29650") ? ["Stryker was here"] : (stryCov_9fa48("29650"), []);
    let nextSentParts = input.sentParts;
    const searchStart = input.receiverMinConsecutiveHeight;
    const searchEnd = stryMutAct_9fa48("29651") ? Math.max(searchStart + input.hashmapMaxLen * 2 + input.windowMax, input.partMapHashes.length) : (stryCov_9fa48("29651"), Math.min(stryMutAct_9fa48("29652") ? searchStart + input.hashmapMaxLen * 2 - input.windowMax : (stryCov_9fa48("29652"), (stryMutAct_9fa48("29653") ? searchStart - input.hashmapMaxLen * 2 : (stryCov_9fa48("29653"), searchStart + (stryMutAct_9fa48("29654") ? input.hashmapMaxLen / 2 : (stryCov_9fa48("29654"), input.hashmapMaxLen * 2)))) + input.windowMax), input.partMapHashes.length));
    for (let index = searchStart; stryMutAct_9fa48("29657") ? index >= searchEnd : stryMutAct_9fa48("29656") ? index <= searchEnd : stryMutAct_9fa48("29655") ? false : (stryCov_9fa48("29655", "29656", "29657"), index < searchEnd); stryMutAct_9fa48("29658") ? index -= 1 : (stryCov_9fa48("29658"), index += 1)) {
      if (stryMutAct_9fa48("29659")) {
        {}
      } else {
        stryCov_9fa48("29659");
        const mapHash = input.partMapHashes[index];
        if (stryMutAct_9fa48("29662") ? mapHash !== undefined : stryMutAct_9fa48("29661") ? false : stryMutAct_9fa48("29660") ? true : (stryCov_9fa48("29660", "29661", "29662"), mapHash === undefined)) {
          if (stryMutAct_9fa48("29663")) {
            {}
          } else {
            stryCov_9fa48("29663");
            continue;
          }
        }
        if (stryMutAct_9fa48("29666") ? false : stryMutAct_9fa48("29665") ? true : stryMutAct_9fa48("29664") ? input.request.requestedMapHashes.some(requested => equalByteArrays(requested, mapHash)) : (stryCov_9fa48("29664", "29665", "29666"), !(stryMutAct_9fa48("29667") ? input.request.requestedMapHashes.every(requested => equalByteArrays(requested, mapHash)) : (stryCov_9fa48("29667"), input.request.requestedMapHashes.some(stryMutAct_9fa48("29668") ? () => undefined : (stryCov_9fa48("29668"), requested => equalByteArrays(requested, mapHash))))))) {
          if (stryMutAct_9fa48("29669")) {
            {}
          } else {
            stryCov_9fa48("29669");
            continue;
          }
        }
        if (stryMutAct_9fa48("29672") ? false : stryMutAct_9fa48("29671") ? true : stryMutAct_9fa48("29670") ? input.partSent[index] : (stryCov_9fa48("29670", "29671", "29672"), !input.partSent[index])) {
          if (stryMutAct_9fa48("29673")) {
            {}
          } else {
            stryCov_9fa48("29673");
            partActions.push(stryMutAct_9fa48("29674") ? {} : (stryCov_9fa48("29674"), {
              index,
              kind: stryMutAct_9fa48("29675") ? "" : (stryCov_9fa48("29675"), "send")
            }));
            stryMutAct_9fa48("29676") ? nextSentParts -= 1 : (stryCov_9fa48("29676"), nextSentParts += 1);
          }
        } else {
          if (stryMutAct_9fa48("29677")) {
            {}
          } else {
            stryCov_9fa48("29677");
            partActions.push(stryMutAct_9fa48("29678") ? {} : (stryCov_9fa48("29678"), {
              index,
              kind: stryMutAct_9fa48("29679") ? "" : (stryCov_9fa48("29679"), "resend")
            }));
          }
        }
      }
    }
    let nextReceiverMinConsecutiveHeight = input.receiverMinConsecutiveHeight;
    let hashmapUpdate: ResourceRequestFulfillHashmapUpdate | null = null;
    if (stryMutAct_9fa48("29682") ? input.request.wantsMoreHashmap || input.request.lastMapHash !== null : stryMutAct_9fa48("29681") ? false : stryMutAct_9fa48("29680") ? true : (stryCov_9fa48("29680", "29681", "29682"), input.request.wantsMoreHashmap && (stryMutAct_9fa48("29684") ? input.request.lastMapHash === null : stryMutAct_9fa48("29683") ? true : (stryCov_9fa48("29683", "29684"), input.request.lastMapHash !== null)))) {
      if (stryMutAct_9fa48("29685")) {
        {}
      } else {
        stryCov_9fa48("29685");
        const lastMapHash = input.request.lastMapHash;
        let partIndex = input.receiverMinConsecutiveHeight;
        const walkEnd = stryMutAct_9fa48("29686") ? Math.max(partIndex + input.hashmapMaxLen * 2, input.partMapHashes.length) : (stryCov_9fa48("29686"), Math.min(stryMutAct_9fa48("29687") ? partIndex - input.hashmapMaxLen * 2 : (stryCov_9fa48("29687"), partIndex + (stryMutAct_9fa48("29688") ? input.hashmapMaxLen / 2 : (stryCov_9fa48("29688"), input.hashmapMaxLen * 2))), input.partMapHashes.length));
        for (let index = partIndex; stryMutAct_9fa48("29691") ? index >= walkEnd : stryMutAct_9fa48("29690") ? index <= walkEnd : stryMutAct_9fa48("29689") ? false : (stryCov_9fa48("29689", "29690", "29691"), index < walkEnd); stryMutAct_9fa48("29692") ? index -= 1 : (stryCov_9fa48("29692"), index += 1)) {
          if (stryMutAct_9fa48("29693")) {
            {}
          } else {
            stryCov_9fa48("29693");
            stryMutAct_9fa48("29694") ? partIndex -= 1 : (stryCov_9fa48("29694"), partIndex += 1);
            const mapHash = input.partMapHashes[index];
            if (stryMutAct_9fa48("29697") ? mapHash !== undefined || equalByteArrays(mapHash, lastMapHash) : stryMutAct_9fa48("29696") ? false : stryMutAct_9fa48("29695") ? true : (stryCov_9fa48("29695", "29696", "29697"), (stryMutAct_9fa48("29699") ? mapHash === undefined : stryMutAct_9fa48("29698") ? true : (stryCov_9fa48("29698", "29699"), mapHash !== undefined)) && equalByteArrays(mapHash, lastMapHash))) {
              if (stryMutAct_9fa48("29700")) {
                {}
              } else {
                stryCov_9fa48("29700");
                break;
              }
            }
          }
        }
        nextReceiverMinConsecutiveHeight = stryMutAct_9fa48("29701") ? Math.min(partIndex - 1 - input.windowMax, 0) : (stryCov_9fa48("29701"), Math.max(stryMutAct_9fa48("29702") ? partIndex - 1 + input.windowMax : (stryCov_9fa48("29702"), (stryMutAct_9fa48("29703") ? partIndex + 1 : (stryCov_9fa48("29703"), partIndex - 1)) - input.windowMax), 0));
        const segment = Math.floor(stryMutAct_9fa48("29704") ? partIndex * input.hashmapMaxLen : (stryCov_9fa48("29704"), partIndex / input.hashmapMaxLen));
        const hashmapStart = stryMutAct_9fa48("29705") ? segment / input.hashmapMaxLen : (stryCov_9fa48("29705"), segment * input.hashmapMaxLen);
        const hashmapEnd = stryMutAct_9fa48("29706") ? Math.max((segment + 1) * input.hashmapMaxLen, input.partMapHashes.length) : (stryCov_9fa48("29706"), Math.min(stryMutAct_9fa48("29707") ? (segment + 1) / input.hashmapMaxLen : (stryCov_9fa48("29707"), (stryMutAct_9fa48("29708") ? segment - 1 : (stryCov_9fa48("29708"), segment + 1)) * input.hashmapMaxLen), input.partMapHashes.length));
        const mapHashes: Uint8Array[] = stryMutAct_9fa48("29709") ? ["Stryker was here"] : (stryCov_9fa48("29709"), []);
        for (let index = hashmapStart; stryMutAct_9fa48("29712") ? index >= hashmapEnd : stryMutAct_9fa48("29711") ? index <= hashmapEnd : stryMutAct_9fa48("29710") ? false : (stryCov_9fa48("29710", "29711", "29712"), index < hashmapEnd); stryMutAct_9fa48("29713") ? index -= 1 : (stryCov_9fa48("29713"), index += 1)) {
          if (stryMutAct_9fa48("29714")) {
            {}
          } else {
            stryCov_9fa48("29714");
            const mapHash = input.partMapHashes[index];
            if (stryMutAct_9fa48("29717") ? mapHash === undefined : stryMutAct_9fa48("29716") ? false : stryMutAct_9fa48("29715") ? true : (stryCov_9fa48("29715", "29716", "29717"), mapHash !== undefined)) {
              if (stryMutAct_9fa48("29718")) {
                {}
              } else {
                stryCov_9fa48("29718");
                mapHashes.push(mapHash);
              }
            }
          }
        }
        hashmapUpdate = stryMutAct_9fa48("29719") ? {} : (stryCov_9fa48("29719"), {
          segment,
          mapHashes,
          nextReceiverMinConsecutiveHeight
        });
      }
    }
    return stryMutAct_9fa48("29720") ? {} : (stryCov_9fa48("29720"), {
      partActions,
      hashmapUpdate,
      nextSentParts,
      nextReceiverMinConsecutiveHeight,
      status: (stryMutAct_9fa48("29723") ? nextSentParts !== input.totalParts : stryMutAct_9fa48("29722") ? false : stryMutAct_9fa48("29721") ? true : (stryCov_9fa48("29721", "29722", "29723"), nextSentParts === input.totalParts)) ? stryMutAct_9fa48("29724") ? "" : (stryCov_9fa48("29724"), "awaiting-proof") : stryMutAct_9fa48("29725") ? "" : (stryCov_9fa48("29725"), "transferring")
    });
  }
}
export type ResourceHashmapUpdateAcceptPlan = "apply" | "ignore";

/**
 * Incoming RESOURCE_HMU accept: continue × split × unpack before slot writes.
 */
export function planResourceHashmapUpdateAccept(input: {
  readonly canContinue: boolean;
  readonly splitOk: boolean;
  readonly unpackOk: boolean;
}): ResourceHashmapUpdateAcceptPlan {
  if (stryMutAct_9fa48("29726")) {
    {}
  } else {
    stryCov_9fa48("29726");
    if (stryMutAct_9fa48("29729") ? (!input.canContinue || !input.splitOk) && !input.unpackOk : stryMutAct_9fa48("29728") ? false : stryMutAct_9fa48("29727") ? true : (stryCov_9fa48("29727", "29728", "29729"), (stryMutAct_9fa48("29731") ? !input.canContinue && !input.splitOk : stryMutAct_9fa48("29730") ? false : (stryCov_9fa48("29730", "29731"), (stryMutAct_9fa48("29732") ? input.canContinue : (stryCov_9fa48("29732"), !input.canContinue)) || (stryMutAct_9fa48("29733") ? input.splitOk : (stryCov_9fa48("29733"), !input.splitOk)))) || (stryMutAct_9fa48("29734") ? input.unpackOk : (stryCov_9fa48("29734"), !input.unpackOk)))) {
      if (stryMutAct_9fa48("29735")) {
        {}
      } else {
        stryCov_9fa48("29735");
        return stryMutAct_9fa48("29736") ? "" : (stryCov_9fa48("29736"), "ignore");
      }
    }
    return stryMutAct_9fa48("29737") ? "" : (stryCov_9fa48("29737"), "apply");
  }
}

/**
 * Whether a decrypted RESOURCE_HMU / cancel frame has a valid hash prefix.
 * Part/slot application stays at the adapter edge.
 */
export function shouldAcceptResourceHashmapUpdateFrame(splitOk: boolean): boolean {
  if (stryMutAct_9fa48("29738")) {
    {}
  } else {
    stryCov_9fa48("29738");
    return splitOk;
  }
}

/**
 * Resource hashmap-update frame accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptResourceHashmapUpdateFrame` reads beside the step).
 */
export type AcceptResourceHashmapUpdateFrameState = Record<string, never>;
export type AcceptResourceHashmapUpdateFrameEvent = Event | {
  readonly kind: "resource-hashmap/accept-update-frame-gate";
  readonly splitOk: boolean;
};
export type AcceptResourceHashmapUpdateFrameAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptResourceHashmapUpdateFrameStepResult {
  readonly state: AcceptResourceHashmapUpdateFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptResourceHashmapUpdateFrameAction[];
}
export function initialAcceptResourceHashmapUpdateFrameState(): AcceptResourceHashmapUpdateFrameState {
  if (stryMutAct_9fa48("29739")) {
    {}
  } else {
    stryCov_9fa48("29739");
    return {};
  }
}
export function stepAcceptResourceHashmapUpdateFrameWithActions(state: AcceptResourceHashmapUpdateFrameState, event: AcceptResourceHashmapUpdateFrameEvent): AcceptResourceHashmapUpdateFrameStepResult {
  if (stryMutAct_9fa48("29740")) {
    {}
  } else {
    stryCov_9fa48("29740");
    if (stryMutAct_9fa48("29743") ? event.kind !== "resource-hashmap/accept-update-frame-gate" : stryMutAct_9fa48("29742") ? false : stryMutAct_9fa48("29741") ? true : (stryCov_9fa48("29741", "29742", "29743"), event.kind === (stryMutAct_9fa48("29744") ? "" : (stryCov_9fa48("29744"), "resource-hashmap/accept-update-frame-gate")))) {
      if (stryMutAct_9fa48("29745")) {
        {}
      } else {
        stryCov_9fa48("29745");
        return stryMutAct_9fa48("29746") ? {} : (stryCov_9fa48("29746"), {
          state,
          intents: stryMutAct_9fa48("29747") ? ["Stryker was here"] : (stryCov_9fa48("29747"), []),
          actions: stryMutAct_9fa48("29748") ? [] : (stryCov_9fa48("29748"), [stryMutAct_9fa48("29749") ? {} : (stryCov_9fa48("29749"), {
            kind: shouldAcceptResourceHashmapUpdateFrame(event.splitOk) ? stryMutAct_9fa48("29750") ? "" : (stryCov_9fa48("29750"), "accept") : stryMutAct_9fa48("29751") ? "" : (stryCov_9fa48("29751"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("29752") ? {} : (stryCov_9fa48("29752"), {
      state,
      intents: stryMutAct_9fa48("29753") ? ["Stryker was here"] : (stryCov_9fa48("29753"), []),
      actions: stryMutAct_9fa48("29754") ? ["Stryker was here"] : (stryCov_9fa48("29754"), [])
    });
  }
}
export function shouldAcceptResourceHashmapUpdateFrameNow(actions: ReadonlyArray<AcceptResourceHashmapUpdateFrameAction>): boolean {
  if (stryMutAct_9fa48("29755")) {
    {}
  } else {
    stryCov_9fa48("29755");
    return stryMutAct_9fa48("29756") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("29756"), actions.some(stryMutAct_9fa48("29757") ? () => undefined : (stryCov_9fa48("29757"), action => stryMutAct_9fa48("29760") ? action.kind !== "accept" : stryMutAct_9fa48("29759") ? false : stryMutAct_9fa48("29758") ? true : (stryCov_9fa48("29758", "29759", "29760"), action.kind === (stryMutAct_9fa48("29761") ? "" : (stryCov_9fa48("29761"), "accept"))))));
  }
}
export function shouldSkipAcceptResourceHashmapUpdateFrame(actions: ReadonlyArray<AcceptResourceHashmapUpdateFrameAction>): boolean {
  if (stryMutAct_9fa48("29762")) {
    {}
  } else {
    stryCov_9fa48("29762");
    return stryMutAct_9fa48("29763") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("29763"), actions.some(stryMutAct_9fa48("29764") ? () => undefined : (stryCov_9fa48("29764"), action => stryMutAct_9fa48("29767") ? action.kind !== "skip" : stryMutAct_9fa48("29766") ? false : stryMutAct_9fa48("29765") ? true : (stryCov_9fa48("29765", "29766", "29767"), action.kind === (stryMutAct_9fa48("29768") ? "" : (stryCov_9fa48("29768"), "skip"))))));
  }
}

/** Whether a parsed RESOURCE_REQ may be fulfilled. */
export function shouldFulfillResourcePartRequest(requestPresent: boolean): boolean {
  if (stryMutAct_9fa48("29769")) {
    {}
  } else {
    stryCov_9fa48("29769");
    return requestPresent;
  }
}

/**
 * Resource part-request fulfill gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldFulfillResourcePartRequest` reads beside the step).
 */
export type FulfillResourcePartRequestState = Record<string, never>;
export type FulfillResourcePartRequestEvent = Event | {
  readonly kind: "resource-hashmap/fulfill-part-request-gate";
  readonly requestPresent: boolean;
};
export type FulfillResourcePartRequestAction = {
  readonly kind: "fulfill";
} | {
  readonly kind: "skip";
};
export interface FulfillResourcePartRequestStepResult {
  readonly state: FulfillResourcePartRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly FulfillResourcePartRequestAction[];
}
export function initialFulfillResourcePartRequestState(): FulfillResourcePartRequestState {
  if (stryMutAct_9fa48("29770")) {
    {}
  } else {
    stryCov_9fa48("29770");
    return {};
  }
}
export function stepFulfillResourcePartRequestWithActions(state: FulfillResourcePartRequestState, event: FulfillResourcePartRequestEvent): FulfillResourcePartRequestStepResult {
  if (stryMutAct_9fa48("29771")) {
    {}
  } else {
    stryCov_9fa48("29771");
    if (stryMutAct_9fa48("29774") ? event.kind !== "resource-hashmap/fulfill-part-request-gate" : stryMutAct_9fa48("29773") ? false : stryMutAct_9fa48("29772") ? true : (stryCov_9fa48("29772", "29773", "29774"), event.kind === (stryMutAct_9fa48("29775") ? "" : (stryCov_9fa48("29775"), "resource-hashmap/fulfill-part-request-gate")))) {
      if (stryMutAct_9fa48("29776")) {
        {}
      } else {
        stryCov_9fa48("29776");
        return stryMutAct_9fa48("29777") ? {} : (stryCov_9fa48("29777"), {
          state,
          intents: stryMutAct_9fa48("29778") ? ["Stryker was here"] : (stryCov_9fa48("29778"), []),
          actions: stryMutAct_9fa48("29779") ? [] : (stryCov_9fa48("29779"), [stryMutAct_9fa48("29780") ? {} : (stryCov_9fa48("29780"), {
            kind: shouldFulfillResourcePartRequest(event.requestPresent) ? stryMutAct_9fa48("29781") ? "" : (stryCov_9fa48("29781"), "fulfill") : stryMutAct_9fa48("29782") ? "" : (stryCov_9fa48("29782"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("29783") ? {} : (stryCov_9fa48("29783"), {
      state,
      intents: stryMutAct_9fa48("29784") ? ["Stryker was here"] : (stryCov_9fa48("29784"), []),
      actions: stryMutAct_9fa48("29785") ? ["Stryker was here"] : (stryCov_9fa48("29785"), [])
    });
  }
}
export function shouldFulfillResourcePartRequestNow(actions: ReadonlyArray<FulfillResourcePartRequestAction>): boolean {
  if (stryMutAct_9fa48("29786")) {
    {}
  } else {
    stryCov_9fa48("29786");
    return stryMutAct_9fa48("29787") ? actions.every(action => action.kind === "fulfill") : (stryCov_9fa48("29787"), actions.some(stryMutAct_9fa48("29788") ? () => undefined : (stryCov_9fa48("29788"), action => stryMutAct_9fa48("29791") ? action.kind !== "fulfill" : stryMutAct_9fa48("29790") ? false : stryMutAct_9fa48("29789") ? true : (stryCov_9fa48("29789", "29790", "29791"), action.kind === (stryMutAct_9fa48("29792") ? "" : (stryCov_9fa48("29792"), "fulfill"))))));
  }
}
export function shouldSkipFulfillResourcePartRequest(actions: ReadonlyArray<FulfillResourcePartRequestAction>): boolean {
  if (stryMutAct_9fa48("29793")) {
    {}
  } else {
    stryCov_9fa48("29793");
    return stryMutAct_9fa48("29794") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("29794"), actions.some(stryMutAct_9fa48("29795") ? () => undefined : (stryCov_9fa48("29795"), action => stryMutAct_9fa48("29798") ? action.kind !== "skip" : stryMutAct_9fa48("29797") ? false : stryMutAct_9fa48("29796") ? true : (stryCov_9fa48("29796", "29797", "29798"), action.kind === (stryMutAct_9fa48("29799") ? "" : (stryCov_9fa48("29799"), "skip"))))));
  }
}

/** Whether a planned fulfill part action has a matching local part slot. */
export function shouldApplyResourceFulfillPart(partPresent: boolean): boolean {
  if (stryMutAct_9fa48("29800")) {
    {}
  } else {
    stryCov_9fa48("29800");
    return partPresent;
  }
}

/**
 * Resource fulfill-part apply gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldApplyResourceFulfillPart`
 * reads beside the step).
 */
export type ApplyResourceFulfillPartState = Record<string, never>;
export type ApplyResourceFulfillPartEvent = Event | {
  readonly kind: "resource-hashmap/apply-fulfill-part-gate";
  readonly partPresent: boolean;
};
export type ApplyResourceFulfillPartAction = {
  readonly kind: "apply";
} | {
  readonly kind: "skip";
};
export interface ApplyResourceFulfillPartStepResult {
  readonly state: ApplyResourceFulfillPartState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyResourceFulfillPartAction[];
}
export function initialApplyResourceFulfillPartState(): ApplyResourceFulfillPartState {
  if (stryMutAct_9fa48("29801")) {
    {}
  } else {
    stryCov_9fa48("29801");
    return {};
  }
}
export function stepApplyResourceFulfillPartWithActions(state: ApplyResourceFulfillPartState, event: ApplyResourceFulfillPartEvent): ApplyResourceFulfillPartStepResult {
  if (stryMutAct_9fa48("29802")) {
    {}
  } else {
    stryCov_9fa48("29802");
    if (stryMutAct_9fa48("29805") ? event.kind !== "resource-hashmap/apply-fulfill-part-gate" : stryMutAct_9fa48("29804") ? false : stryMutAct_9fa48("29803") ? true : (stryCov_9fa48("29803", "29804", "29805"), event.kind === (stryMutAct_9fa48("29806") ? "" : (stryCov_9fa48("29806"), "resource-hashmap/apply-fulfill-part-gate")))) {
      if (stryMutAct_9fa48("29807")) {
        {}
      } else {
        stryCov_9fa48("29807");
        return stryMutAct_9fa48("29808") ? {} : (stryCov_9fa48("29808"), {
          state,
          intents: stryMutAct_9fa48("29809") ? ["Stryker was here"] : (stryCov_9fa48("29809"), []),
          actions: stryMutAct_9fa48("29810") ? [] : (stryCov_9fa48("29810"), [stryMutAct_9fa48("29811") ? {} : (stryCov_9fa48("29811"), {
            kind: shouldApplyResourceFulfillPart(event.partPresent) ? stryMutAct_9fa48("29812") ? "" : (stryCov_9fa48("29812"), "apply") : stryMutAct_9fa48("29813") ? "" : (stryCov_9fa48("29813"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("29814") ? {} : (stryCov_9fa48("29814"), {
      state,
      intents: stryMutAct_9fa48("29815") ? ["Stryker was here"] : (stryCov_9fa48("29815"), []),
      actions: stryMutAct_9fa48("29816") ? ["Stryker was here"] : (stryCov_9fa48("29816"), [])
    });
  }
}
export function shouldApplyResourceFulfillPartNow(actions: ReadonlyArray<ApplyResourceFulfillPartAction>): boolean {
  if (stryMutAct_9fa48("29817")) {
    {}
  } else {
    stryCov_9fa48("29817");
    return stryMutAct_9fa48("29818") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("29818"), actions.some(stryMutAct_9fa48("29819") ? () => undefined : (stryCov_9fa48("29819"), action => stryMutAct_9fa48("29822") ? action.kind !== "apply" : stryMutAct_9fa48("29821") ? false : stryMutAct_9fa48("29820") ? true : (stryCov_9fa48("29820", "29821", "29822"), action.kind === (stryMutAct_9fa48("29823") ? "" : (stryCov_9fa48("29823"), "apply"))))));
  }
}
export function shouldSkipApplyResourceFulfillPart(actions: ReadonlyArray<ApplyResourceFulfillPartAction>): boolean {
  if (stryMutAct_9fa48("29824")) {
    {}
  } else {
    stryCov_9fa48("29824");
    return stryMutAct_9fa48("29825") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("29825"), actions.some(stryMutAct_9fa48("29826") ? () => undefined : (stryCov_9fa48("29826"), action => stryMutAct_9fa48("29829") ? action.kind !== "skip" : stryMutAct_9fa48("29828") ? false : stryMutAct_9fa48("29827") ? true : (stryCov_9fa48("29827", "29828", "29829"), action.kind === (stryMutAct_9fa48("29830") ? "" : (stryCov_9fa48("29830"), "skip"))))));
  }
}

/** Whether a receive-part plan should write the matched slot. */
export function shouldApplyResourceReceivePartSlot(input: {
  readonly matched: boolean;
  readonly slotPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("29831")) {
    {}
  } else {
    stryCov_9fa48("29831");
    return stryMutAct_9fa48("29834") ? input.matched || input.slotPresent : stryMutAct_9fa48("29833") ? false : stryMutAct_9fa48("29832") ? true : (stryCov_9fa48("29832", "29833", "29834"), input.matched && input.slotPresent);
  }
}