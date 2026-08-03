/** Extracted from propagation-quota.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure LXMF propagation-server quota and eviction planning.
 * Persistence and hashing stay at the adapter edge.
 * Store / store-plan / restore / restore-plan / catalog-evict / catalog-delete /
 * evict-oldest / message-too-large / select-oldest-key / store-commit /
 * restore-apply / store-apply-commit conclusions leave via machine actions
 * (no ad-hoc `plan.kind` / `planPropagationStore` / `planPropagationRestore` /
 * `plan === "accept"` / `shouldEvict*` / `shouldDelete*` /
 * `isPropagationMessageTooLarge` / `selectOldestPropagationKey` /
 * `shouldCommitPropagationStoreEntry` / `shouldApplyPropagationRestore` /
 * `shouldApplyPropagationStoreCommit` reads beside the step).
 * Restore plan nested via {@link stepPropagationRestorePlanWithActions}.
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
import { equalByteArrays } from "../path-table.js";
export const PROPAGATION_DESTINATION_HASH_SIZE = 16;
export interface PropagationQuotas {
  readonly maxBytes: number;
  readonly maxMessages: number;
  readonly maxMessageBytes: number;
}
export interface PropagationCatalogEntry {
  readonly key: string;
  readonly size: number;
  readonly storedAt: number;
}
export type PropagationStorePlan = {
  readonly kind: "reject-too-large";
} | {
  readonly kind: "duplicate";
} | {
  readonly kind: "reject-capacity";
} | {
  readonly kind: "accept";
  readonly evictKeys: readonly string[];
};
export function propagationDestinationHash(lxmfData: Uint8Array): Uint8Array | null {
  if (stryMutAct_9fa48("27723")) {
    {}
  } else {
    stryCov_9fa48("27723");
    if (stryMutAct_9fa48("27727") ? lxmfData.length >= PROPAGATION_DESTINATION_HASH_SIZE : stryMutAct_9fa48("27726") ? lxmfData.length <= PROPAGATION_DESTINATION_HASH_SIZE : stryMutAct_9fa48("27725") ? false : stryMutAct_9fa48("27724") ? true : (stryCov_9fa48("27724", "27725", "27726", "27727"), lxmfData.length < PROPAGATION_DESTINATION_HASH_SIZE)) {
      if (stryMutAct_9fa48("27728")) {
        {}
      } else {
        stryCov_9fa48("27728");
        return null;
      }
    }
    return lxmfData.subarray(0, PROPAGATION_DESTINATION_HASH_SIZE);
  }
}
export function isPropagationMessageTooLarge(messageBytes: number, quotas: PropagationQuotas): boolean {
  if (stryMutAct_9fa48("27729")) {
    {}
  } else {
    stryCov_9fa48("27729");
    return stryMutAct_9fa48("27733") ? messageBytes <= quotas.maxMessageBytes : stryMutAct_9fa48("27732") ? messageBytes >= quotas.maxMessageBytes : stryMutAct_9fa48("27731") ? false : stryMutAct_9fa48("27730") ? true : (stryCov_9fa48("27730", "27731", "27732", "27733"), messageBytes > quotas.maxMessageBytes);
  }
}

/**
 * Propagation message-too-large gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isPropagationMessageTooLarge`
 * reads beside the step).
 */
export type PropagationMessageTooLargeState = Record<string, never>;
export type PropagationMessageTooLargeEvent = Event | {
  readonly kind: "propagation/message-too-large-gate";
  readonly messageBytes: number;
  readonly quotas: PropagationQuotas;
};
export type PropagationMessageTooLargeAction = {
  readonly kind: "too-large";
} | {
  readonly kind: "fit";
};
export interface PropagationMessageTooLargeStepResult {
  readonly state: PropagationMessageTooLargeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationMessageTooLargeAction[];
}
export function initialPropagationMessageTooLargeState(): PropagationMessageTooLargeState {
  if (stryMutAct_9fa48("27734")) {
    {}
  } else {
    stryCov_9fa48("27734");
    return {};
  }
}
export function stepPropagationMessageTooLargeWithActions(state: PropagationMessageTooLargeState, event: PropagationMessageTooLargeEvent): PropagationMessageTooLargeStepResult {
  if (stryMutAct_9fa48("27735")) {
    {}
  } else {
    stryCov_9fa48("27735");
    if (stryMutAct_9fa48("27738") ? event.kind !== "propagation/message-too-large-gate" : stryMutAct_9fa48("27737") ? false : stryMutAct_9fa48("27736") ? true : (stryCov_9fa48("27736", "27737", "27738"), event.kind === (stryMutAct_9fa48("27739") ? "" : (stryCov_9fa48("27739"), "propagation/message-too-large-gate")))) {
      if (stryMutAct_9fa48("27740")) {
        {}
      } else {
        stryCov_9fa48("27740");
        return stryMutAct_9fa48("27741") ? {} : (stryCov_9fa48("27741"), {
          state,
          intents: stryMutAct_9fa48("27742") ? ["Stryker was here"] : (stryCov_9fa48("27742"), []),
          actions: stryMutAct_9fa48("27743") ? [] : (stryCov_9fa48("27743"), [stryMutAct_9fa48("27744") ? {} : (stryCov_9fa48("27744"), {
            kind: isPropagationMessageTooLarge(event.messageBytes, event.quotas) ? stryMutAct_9fa48("27745") ? "" : (stryCov_9fa48("27745"), "too-large") : stryMutAct_9fa48("27746") ? "" : (stryCov_9fa48("27746"), "fit")
          })])
        });
      }
    }
    return stryMutAct_9fa48("27747") ? {} : (stryCov_9fa48("27747"), {
      state,
      intents: stryMutAct_9fa48("27748") ? ["Stryker was here"] : (stryCov_9fa48("27748"), []),
      actions: stryMutAct_9fa48("27749") ? ["Stryker was here"] : (stryCov_9fa48("27749"), [])
    });
  }
}
export function shouldTreatPropagationMessageTooLarge(actions: ReadonlyArray<PropagationMessageTooLargeAction>): boolean {
  if (stryMutAct_9fa48("27750")) {
    {}
  } else {
    stryCov_9fa48("27750");
    return stryMutAct_9fa48("27751") ? actions.every(action => action.kind === "too-large") : (stryCov_9fa48("27751"), actions.some(stryMutAct_9fa48("27752") ? () => undefined : (stryCov_9fa48("27752"), action => stryMutAct_9fa48("27755") ? action.kind !== "too-large" : stryMutAct_9fa48("27754") ? false : stryMutAct_9fa48("27753") ? true : (stryCov_9fa48("27753", "27754", "27755"), action.kind === (stryMutAct_9fa48("27756") ? "" : (stryCov_9fa48("27756"), "too-large"))))));
  }
}
export function shouldTreatPropagationMessageFit(actions: ReadonlyArray<PropagationMessageTooLargeAction>): boolean {
  if (stryMutAct_9fa48("27757")) {
    {}
  } else {
    stryCov_9fa48("27757");
    return stryMutAct_9fa48("27758") ? actions.every(action => action.kind === "fit") : (stryCov_9fa48("27758"), actions.some(stryMutAct_9fa48("27759") ? () => undefined : (stryCov_9fa48("27759"), action => stryMutAct_9fa48("27762") ? action.kind !== "fit" : stryMutAct_9fa48("27761") ? false : stryMutAct_9fa48("27760") ? true : (stryCov_9fa48("27760", "27761", "27762"), action.kind === (stryMutAct_9fa48("27763") ? "" : (stryCov_9fa48("27763"), "fit"))))));
  }
}
export function selectOldestPropagationKey(entries: ReadonlyArray<PropagationCatalogEntry>): string | null {
  if (stryMutAct_9fa48("27764")) {
    {}
  } else {
    stryCov_9fa48("27764");
    let oldest: PropagationCatalogEntry | null = null;
    for (const entry of entries) {
      if (stryMutAct_9fa48("27765")) {
        {}
      } else {
        stryCov_9fa48("27765");
        if (stryMutAct_9fa48("27768") ? oldest === null && entry.storedAt < oldest.storedAt : stryMutAct_9fa48("27767") ? false : stryMutAct_9fa48("27766") ? true : (stryCov_9fa48("27766", "27767", "27768"), (stryMutAct_9fa48("27770") ? oldest !== null : stryMutAct_9fa48("27769") ? false : (stryCov_9fa48("27769", "27770"), oldest === null)) || (stryMutAct_9fa48("27773") ? entry.storedAt >= oldest.storedAt : stryMutAct_9fa48("27772") ? entry.storedAt <= oldest.storedAt : stryMutAct_9fa48("27771") ? false : (stryCov_9fa48("27771", "27772", "27773"), entry.storedAt < oldest.storedAt)))) {
          if (stryMutAct_9fa48("27774")) {
            {}
          } else {
            stryCov_9fa48("27774");
            oldest = entry;
          }
        }
      }
    }
    return stryMutAct_9fa48("27775") ? oldest?.key && null : (stryCov_9fa48("27775"), (stryMutAct_9fa48("27776") ? oldest.key : (stryCov_9fa48("27776"), oldest?.key)) ?? null);
  }
}

/**
 * Select-oldest propagation key is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `selectOldestPropagationKey`
 * reads beside the step).
 */
export type SelectOldestPropagationKeyState = Record<string, never>;
export type SelectOldestPropagationKeyEvent = Event | {
  readonly kind: "propagation/select-oldest-key-gate";
  readonly entries: ReadonlyArray<PropagationCatalogEntry>;
};
export type SelectOldestPropagationKeyAction = {
  readonly kind: "use-key";
  readonly key: string;
} | {
  readonly kind: "miss";
};
export interface SelectOldestPropagationKeyStepResult {
  readonly state: SelectOldestPropagationKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SelectOldestPropagationKeyAction[];
}
export function initialSelectOldestPropagationKeyState(): SelectOldestPropagationKeyState {
  if (stryMutAct_9fa48("27777")) {
    {}
  } else {
    stryCov_9fa48("27777");
    return {};
  }
}
export function stepSelectOldestPropagationKeyWithActions(state: SelectOldestPropagationKeyState, event: SelectOldestPropagationKeyEvent): SelectOldestPropagationKeyStepResult {
  if (stryMutAct_9fa48("27778")) {
    {}
  } else {
    stryCov_9fa48("27778");
    if (stryMutAct_9fa48("27781") ? event.kind !== "propagation/select-oldest-key-gate" : stryMutAct_9fa48("27780") ? false : stryMutAct_9fa48("27779") ? true : (stryCov_9fa48("27779", "27780", "27781"), event.kind === (stryMutAct_9fa48("27782") ? "" : (stryCov_9fa48("27782"), "propagation/select-oldest-key-gate")))) {
      if (stryMutAct_9fa48("27783")) {
        {}
      } else {
        stryCov_9fa48("27783");
        const key = selectOldestPropagationKey(event.entries);
        return stryMutAct_9fa48("27784") ? {} : (stryCov_9fa48("27784"), {
          state,
          intents: stryMutAct_9fa48("27785") ? ["Stryker was here"] : (stryCov_9fa48("27785"), []),
          actions: (stryMutAct_9fa48("27788") ? key !== null : stryMutAct_9fa48("27787") ? false : stryMutAct_9fa48("27786") ? true : (stryCov_9fa48("27786", "27787", "27788"), key === null)) ? stryMutAct_9fa48("27789") ? [] : (stryCov_9fa48("27789"), [stryMutAct_9fa48("27790") ? {} : (stryCov_9fa48("27790"), {
            kind: stryMutAct_9fa48("27791") ? "" : (stryCov_9fa48("27791"), "miss")
          })]) : stryMutAct_9fa48("27792") ? [] : (stryCov_9fa48("27792"), [stryMutAct_9fa48("27793") ? {} : (stryCov_9fa48("27793"), {
            kind: stryMutAct_9fa48("27794") ? "" : (stryCov_9fa48("27794"), "use-key"),
            key
          })])
        });
      }
    }
    return stryMutAct_9fa48("27795") ? {} : (stryCov_9fa48("27795"), {
      state,
      intents: stryMutAct_9fa48("27796") ? ["Stryker was here"] : (stryCov_9fa48("27796"), []),
      actions: stryMutAct_9fa48("27797") ? ["Stryker was here"] : (stryCov_9fa48("27797"), [])
    });
  }
}
export function shouldUseOldestPropagationKey(actions: ReadonlyArray<SelectOldestPropagationKeyAction>): boolean {
  if (stryMutAct_9fa48("27798")) {
    {}
  } else {
    stryCov_9fa48("27798");
    return stryMutAct_9fa48("27799") ? actions.every(action => action.kind === "use-key") : (stryCov_9fa48("27799"), actions.some(stryMutAct_9fa48("27800") ? () => undefined : (stryCov_9fa48("27800"), action => stryMutAct_9fa48("27803") ? action.kind !== "use-key" : stryMutAct_9fa48("27802") ? false : stryMutAct_9fa48("27801") ? true : (stryCov_9fa48("27801", "27802", "27803"), action.kind === (stryMutAct_9fa48("27804") ? "" : (stryCov_9fa48("27804"), "use-key"))))));
  }
}
export function shouldMissOldestPropagationKey(actions: ReadonlyArray<SelectOldestPropagationKeyAction>): boolean {
  if (stryMutAct_9fa48("27805")) {
    {}
  } else {
    stryCov_9fa48("27805");
    return stryMutAct_9fa48("27806") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("27806"), actions.some(stryMutAct_9fa48("27807") ? () => undefined : (stryCov_9fa48("27807"), action => stryMutAct_9fa48("27810") ? action.kind !== "miss" : stryMutAct_9fa48("27809") ? false : stryMutAct_9fa48("27808") ? true : (stryCov_9fa48("27808", "27809", "27810"), action.kind === (stryMutAct_9fa48("27811") ? "" : (stryCov_9fa48("27811"), "miss"))))));
  }
}

/** Extract oldest propagation key from step actions; null when no `use-key`. */
export function oldestPropagationKeyFromActions(actions: ReadonlyArray<SelectOldestPropagationKeyAction>): string | null {
  if (stryMutAct_9fa48("27812")) {
    {}
  } else {
    stryCov_9fa48("27812");
    const action = actions.find(stryMutAct_9fa48("27813") ? () => undefined : (stryCov_9fa48("27813"), entry => stryMutAct_9fa48("27816") ? entry.kind !== "use-key" : stryMutAct_9fa48("27815") ? false : stryMutAct_9fa48("27814") ? true : (stryCov_9fa48("27814", "27815", "27816"), entry.kind === (stryMutAct_9fa48("27817") ? "" : (stryCov_9fa48("27817"), "use-key")))));
    return (stryMutAct_9fa48("27820") ? action?.kind !== "use-key" : stryMutAct_9fa48("27819") ? false : stryMutAct_9fa48("27818") ? true : (stryCov_9fa48("27818", "27819", "27820"), (stryMutAct_9fa48("27821") ? action.kind : (stryCov_9fa48("27821"), action?.kind)) === (stryMutAct_9fa48("27822") ? "" : (stryCov_9fa48("27822"), "use-key")))) ? action.key : null;
  }
}

/** When remoteDeliveryHash is null, all entries are visible. */
export function propagationEntryVisibleToRecipient(destinationHash: Uint8Array, remoteDeliveryHash: Uint8Array | null): boolean {
  if (stryMutAct_9fa48("27823")) {
    {}
  } else {
    stryCov_9fa48("27823");
    return stryMutAct_9fa48("27826") ? remoteDeliveryHash === null && equalByteArrays(destinationHash, remoteDeliveryHash) : stryMutAct_9fa48("27825") ? false : stryMutAct_9fa48("27824") ? true : (stryCov_9fa48("27824", "27825", "27826"), (stryMutAct_9fa48("27828") ? remoteDeliveryHash !== null : stryMutAct_9fa48("27827") ? false : (stryCov_9fa48("27827", "27828"), remoteDeliveryHash === null)) || equalByteArrays(destinationHash, remoteDeliveryHash));
  }
}

/**
 * Decide whether an inbound propagation message can be stored, and which
 * existing keys must be evicted first (oldest-first) to free quota.
 */
export function planPropagationStore(input: {
  readonly quotas: PropagationQuotas;
  readonly messageBytes: number;
  readonly alreadyStored: boolean;
  readonly usedBytes: number;
  readonly entries: ReadonlyArray<PropagationCatalogEntry>;
}): PropagationStorePlan {
  if (stryMutAct_9fa48("27829")) {
    {}
  } else {
    stryCov_9fa48("27829");
    if (stryMutAct_9fa48("27831") ? false : stryMutAct_9fa48("27830") ? true : (stryCov_9fa48("27830", "27831"), isPropagationMessageTooLarge(input.messageBytes, input.quotas))) {
      if (stryMutAct_9fa48("27832")) {
        {}
      } else {
        stryCov_9fa48("27832");
        return stryMutAct_9fa48("27833") ? {} : (stryCov_9fa48("27833"), {
          kind: stryMutAct_9fa48("27834") ? "" : (stryCov_9fa48("27834"), "reject-too-large")
        });
      }
    }
    if (stryMutAct_9fa48("27836") ? false : stryMutAct_9fa48("27835") ? true : (stryCov_9fa48("27835", "27836"), input.alreadyStored)) {
      if (stryMutAct_9fa48("27837")) {
        {}
      } else {
        stryCov_9fa48("27837");
        return stryMutAct_9fa48("27838") ? {} : (stryCov_9fa48("27838"), {
          kind: stryMutAct_9fa48("27839") ? "" : (stryCov_9fa48("27839"), "duplicate")
        });
      }
    }
    const remaining = stryMutAct_9fa48("27840") ? [] : (stryCov_9fa48("27840"), [...input.entries]);
    const evictKeys: string[] = stryMutAct_9fa48("27841") ? ["Stryker was here"] : (stryCov_9fa48("27841"), []);
    let usedBytes = input.usedBytes;
    let entryCount = remaining.length;
    while (stryMutAct_9fa48("27843") ? entryCount >= input.quotas.maxMessages && usedBytes + input.messageBytes > input.quotas.maxBytes : stryMutAct_9fa48("27842") ? false : (stryCov_9fa48("27842", "27843"), (stryMutAct_9fa48("27846") ? entryCount < input.quotas.maxMessages : stryMutAct_9fa48("27845") ? entryCount > input.quotas.maxMessages : stryMutAct_9fa48("27844") ? false : (stryCov_9fa48("27844", "27845", "27846"), entryCount >= input.quotas.maxMessages)) || (stryMutAct_9fa48("27849") ? usedBytes + input.messageBytes <= input.quotas.maxBytes : stryMutAct_9fa48("27848") ? usedBytes + input.messageBytes >= input.quotas.maxBytes : stryMutAct_9fa48("27847") ? false : (stryCov_9fa48("27847", "27848", "27849"), (stryMutAct_9fa48("27850") ? usedBytes - input.messageBytes : (stryCov_9fa48("27850"), usedBytes + input.messageBytes)) > input.quotas.maxBytes)))) {
      if (stryMutAct_9fa48("27851")) {
        {}
      } else {
        stryCov_9fa48("27851");
        const oldestKey = selectOldestPropagationKey(remaining);
        if (stryMutAct_9fa48("27854") ? oldestKey !== null : stryMutAct_9fa48("27853") ? false : stryMutAct_9fa48("27852") ? true : (stryCov_9fa48("27852", "27853", "27854"), oldestKey === null)) {
          if (stryMutAct_9fa48("27855")) {
            {}
          } else {
            stryCov_9fa48("27855");
            return stryMutAct_9fa48("27856") ? {} : (stryCov_9fa48("27856"), {
              kind: stryMutAct_9fa48("27857") ? "" : (stryCov_9fa48("27857"), "reject-capacity")
            });
          }
        }
        const index = remaining.findIndex(stryMutAct_9fa48("27858") ? () => undefined : (stryCov_9fa48("27858"), entry => stryMutAct_9fa48("27861") ? entry.key !== oldestKey : stryMutAct_9fa48("27860") ? false : stryMutAct_9fa48("27859") ? true : (stryCov_9fa48("27859", "27860", "27861"), entry.key === oldestKey)));
        const oldest = remaining[index]!;
        remaining.splice(index, 1);
        evictKeys.push(oldestKey);
        stryMutAct_9fa48("27862") ? usedBytes += oldest.size : (stryCov_9fa48("27862"), usedBytes -= oldest.size);
        stryMutAct_9fa48("27863") ? entryCount += 1 : (stryCov_9fa48("27863"), entryCount -= 1);
      }
    }
    return stryMutAct_9fa48("27864") ? {} : (stryCov_9fa48("27864"), {
      kind: stryMutAct_9fa48("27865") ? "" : (stryCov_9fa48("27865"), "accept"),
      evictKeys
    });
  }
}
export type PropagationStorePlanEvent = Event | {
  readonly kind: "propagation/store-plan-gate";
  readonly quotas: PropagationQuotas;
  readonly messageBytes: number;
  readonly alreadyStored: boolean;
  readonly usedBytes: number;
  readonly entries: ReadonlyArray<PropagationCatalogEntry>;
};
export type PropagationStorePlanAction = PropagationStorePlan;
export function shouldRejectTooLargePropagationStorePlan(actions: ReadonlyArray<PropagationStorePlanAction>): boolean {
  if (stryMutAct_9fa48("27866")) {
    {}
  } else {
    stryCov_9fa48("27866");
    return stryMutAct_9fa48("27867") ? actions.every(action => action.kind === "reject-too-large") : (stryCov_9fa48("27867"), actions.some(stryMutAct_9fa48("27868") ? () => undefined : (stryCov_9fa48("27868"), action => stryMutAct_9fa48("27871") ? action.kind !== "reject-too-large" : stryMutAct_9fa48("27870") ? false : stryMutAct_9fa48("27869") ? true : (stryCov_9fa48("27869", "27870", "27871"), action.kind === (stryMutAct_9fa48("27872") ? "" : (stryCov_9fa48("27872"), "reject-too-large"))))));
  }
}
export function shouldRejectCapacityPropagationStorePlan(actions: ReadonlyArray<PropagationStorePlanAction>): boolean {
  if (stryMutAct_9fa48("27873")) {
    {}
  } else {
    stryCov_9fa48("27873");
    return stryMutAct_9fa48("27874") ? actions.every(action => action.kind === "reject-capacity") : (stryCov_9fa48("27874"), actions.some(stryMutAct_9fa48("27875") ? () => undefined : (stryCov_9fa48("27875"), action => stryMutAct_9fa48("27878") ? action.kind !== "reject-capacity" : stryMutAct_9fa48("27877") ? false : stryMutAct_9fa48("27876") ? true : (stryCov_9fa48("27876", "27877", "27878"), action.kind === (stryMutAct_9fa48("27879") ? "" : (stryCov_9fa48("27879"), "reject-capacity"))))));
  }
}
export function shouldDuplicatePropagationStorePlan(actions: ReadonlyArray<PropagationStorePlanAction>): boolean {
  if (stryMutAct_9fa48("27880")) {
    {}
  } else {
    stryCov_9fa48("27880");
    return stryMutAct_9fa48("27881") ? actions.every(action => action.kind === "duplicate") : (stryCov_9fa48("27881"), actions.some(stryMutAct_9fa48("27882") ? () => undefined : (stryCov_9fa48("27882"), action => stryMutAct_9fa48("27885") ? action.kind !== "duplicate" : stryMutAct_9fa48("27884") ? false : stryMutAct_9fa48("27883") ? true : (stryCov_9fa48("27883", "27884", "27885"), action.kind === (stryMutAct_9fa48("27886") ? "" : (stryCov_9fa48("27886"), "duplicate"))))));
  }
}
export function shouldAcceptPropagationStorePlan(actions: ReadonlyArray<PropagationStorePlanAction>): boolean {
  if (stryMutAct_9fa48("27887")) {
    {}
  } else {
    stryCov_9fa48("27887");
    return stryMutAct_9fa48("27888") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("27888"), actions.some(stryMutAct_9fa48("27889") ? () => undefined : (stryCov_9fa48("27889"), action => stryMutAct_9fa48("27892") ? action.kind !== "accept" : stryMutAct_9fa48("27891") ? false : stryMutAct_9fa48("27890") ? true : (stryCov_9fa48("27890", "27891", "27892"), action.kind === (stryMutAct_9fa48("27893") ? "" : (stryCov_9fa48("27893"), "accept"))))));
  }
}

/** Whether plan actions include either reject-too-large or reject-capacity. */
export function shouldRejectPropagationStorePlan(actions: ReadonlyArray<PropagationStorePlanAction>): boolean {
  if (stryMutAct_9fa48("27894")) {
    {}
  } else {
    stryCov_9fa48("27894");
    return stryMutAct_9fa48("27897") ? shouldRejectTooLargePropagationStorePlan(actions) && shouldRejectCapacityPropagationStorePlan(actions) : stryMutAct_9fa48("27896") ? false : stryMutAct_9fa48("27895") ? true : (stryCov_9fa48("27895", "27896", "27897"), shouldRejectTooLargePropagationStorePlan(actions) || shouldRejectCapacityPropagationStorePlan(actions));
  }
}

/** Eviction keys from an accept plan action, if present. */
export function propagationStorePlanEvictKeys(actions: ReadonlyArray<PropagationStorePlanAction>): readonly string[] | null {
  if (stryMutAct_9fa48("27898")) {
    {}
  } else {
    stryCov_9fa48("27898");
    for (const action of actions) {
      if (stryMutAct_9fa48("27899")) {
        {}
      } else {
        stryCov_9fa48("27899");
        if (stryMutAct_9fa48("27902") ? action.kind !== "accept" : stryMutAct_9fa48("27901") ? false : stryMutAct_9fa48("27900") ? true : (stryCov_9fa48("27900", "27901", "27902"), action.kind === (stryMutAct_9fa48("27903") ? "" : (stryCov_9fa48("27903"), "accept")))) {
          if (stryMutAct_9fa48("27904")) {
            {}
          } else {
            stryCov_9fa48("27904");
            return action.evictKeys;
          }
        }
      }
    }
    return null;
  }
}

/** Whether store may commit after destination-hash extraction succeeds. */
export function shouldCommitPropagationStoreEntry(destinationHashPresent: boolean): boolean {
  if (stryMutAct_9fa48("27905")) {
    {}
  } else {
    stryCov_9fa48("27905");
    return destinationHashPresent;
  }
}

/**
 * Propagation store destination-hash commit gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldCommitPropagationStoreEntry` reads beside the step).
 */
export type CommitPropagationStoreEntryState = Record<string, never>;
export type CommitPropagationStoreEntryEvent = Event | {
  readonly kind: "propagation/commit-store-entry-gate";
  readonly destinationHashPresent: boolean;
};
export type CommitPropagationStoreEntryAction = {
  readonly kind: "commit";
} | {
  readonly kind: "skip";
};
export interface CommitPropagationStoreEntryStepResult {
  readonly state: CommitPropagationStoreEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitPropagationStoreEntryAction[];
}
export function initialCommitPropagationStoreEntryState(): CommitPropagationStoreEntryState {
  if (stryMutAct_9fa48("27906")) {
    {}
  } else {
    stryCov_9fa48("27906");
    return {};
  }
}
export function stepCommitPropagationStoreEntryWithActions(state: CommitPropagationStoreEntryState, event: CommitPropagationStoreEntryEvent): CommitPropagationStoreEntryStepResult {
  if (stryMutAct_9fa48("27907")) {
    {}
  } else {
    stryCov_9fa48("27907");
    if (stryMutAct_9fa48("27910") ? event.kind !== "propagation/commit-store-entry-gate" : stryMutAct_9fa48("27909") ? false : stryMutAct_9fa48("27908") ? true : (stryCov_9fa48("27908", "27909", "27910"), event.kind === (stryMutAct_9fa48("27911") ? "" : (stryCov_9fa48("27911"), "propagation/commit-store-entry-gate")))) {
      if (stryMutAct_9fa48("27912")) {
        {}
      } else {
        stryCov_9fa48("27912");
        return stryMutAct_9fa48("27913") ? {} : (stryCov_9fa48("27913"), {
          state,
          intents: stryMutAct_9fa48("27914") ? ["Stryker was here"] : (stryCov_9fa48("27914"), []),
          actions: stryMutAct_9fa48("27915") ? [] : (stryCov_9fa48("27915"), [stryMutAct_9fa48("27916") ? {} : (stryCov_9fa48("27916"), {
            kind: shouldCommitPropagationStoreEntry(event.destinationHashPresent) ? stryMutAct_9fa48("27917") ? "" : (stryCov_9fa48("27917"), "commit") : stryMutAct_9fa48("27918") ? "" : (stryCov_9fa48("27918"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("27919") ? {} : (stryCov_9fa48("27919"), {
      state,
      intents: stryMutAct_9fa48("27920") ? ["Stryker was here"] : (stryCov_9fa48("27920"), []),
      actions: stryMutAct_9fa48("27921") ? ["Stryker was here"] : (stryCov_9fa48("27921"), [])
    });
  }
}
export function shouldCommitPropagationStoreEntryNow(actions: ReadonlyArray<CommitPropagationStoreEntryAction>): boolean {
  if (stryMutAct_9fa48("27922")) {
    {}
  } else {
    stryCov_9fa48("27922");
    return stryMutAct_9fa48("27923") ? actions.every(action => action.kind === "commit") : (stryCov_9fa48("27923"), actions.some(stryMutAct_9fa48("27924") ? () => undefined : (stryCov_9fa48("27924"), action => stryMutAct_9fa48("27927") ? action.kind !== "commit" : stryMutAct_9fa48("27926") ? false : stryMutAct_9fa48("27925") ? true : (stryCov_9fa48("27925", "27926", "27927"), action.kind === (stryMutAct_9fa48("27928") ? "" : (stryCov_9fa48("27928"), "commit"))))));
  }
}

/**
 * Store planning is event-driven; no durable session fields.
 */
export type PropagationStoreState = Record<string, never>;
export type PropagationStoreEvent = Event | {
  readonly kind: "store/received";
  readonly quotas: PropagationQuotas;
  readonly messageBytes: number;
  readonly alreadyStored: boolean;
  readonly usedBytes: number;
  readonly entries: ReadonlyArray<PropagationCatalogEntry>;
  readonly destinationHashPresent: boolean;
};