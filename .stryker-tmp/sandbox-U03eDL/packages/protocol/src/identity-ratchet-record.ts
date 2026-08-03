/**
 * Pure Identity ratchet persistence record (JSON over UTF-8).
 * Store IO and expiry clock stay at the adapter edge.
 * Encode / decode conclusions leave via machine actions (no ad-hoc
 * `encodeIdentityRatchetRecord` / `decodeIdentityRatchetRecord` reads beside the step).
 * Lookup conclusions leave via machine actions (no ad-hoc
 * `planIdentityRatchetLookup` / `plan ===` reads beside the step).
 * Persist-to-store gate conclusions leave via machine actions (no ad-hoc
 * `shouldPersistIdentityRatchet` reads beside the step).
 * Usability gate conclusions leave via machine actions (no ad-hoc
 * `isIdentityRatchetRecordUsable` reads beside the step).
 * Commit-restored-ratchet apply gate conclusions leave via machine actions
 * (no ad-hoc `shouldRestoreIdentityRatchetRecord` reads beside the step).
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
import { bytesToHexLower, hexToBytesLower } from "./destination-name.js";
import { utf8Decode, utf8Encode } from "./utf8.js";

/** RATCHET_SIZE (256 bits) / 8 */
export const IDENTITY_RATCHET_BYTES = 32;
/** Mirrors RNS Identity.RATCHET_EXPIRY */
export const IDENTITY_RATCHET_EXPIRY_SECONDS = stryMutAct_9fa48("10862") ? 60 * 60 * 24 / 30 : (stryCov_9fa48("10862"), (stryMutAct_9fa48("10863") ? 60 * 60 / 24 : (stryCov_9fa48("10863"), (stryMutAct_9fa48("10864") ? 60 / 60 : (stryCov_9fa48("10864"), 60 * 60)) * 24)) * 30);
export interface IdentityRatchetRecord {
  readonly ratchet: Uint8Array;
  readonly received: number;
}
export function identityRatchetStoreKey(destinationHashHex: string): string {
  if (stryMutAct_9fa48("10865")) {
    {}
  } else {
    stryCov_9fa48("10865");
    return stryMutAct_9fa48("10866") ? `` : (stryCov_9fa48("10866"), `ratchets/${destinationHashHex}`);
  }
}
export function encodeIdentityRatchetRecord(record: IdentityRatchetRecord): Uint8Array {
  if (stryMutAct_9fa48("10867")) {
    {}
  } else {
    stryCov_9fa48("10867");
    const json = JSON.stringify(stryMutAct_9fa48("10868") ? {} : (stryCov_9fa48("10868"), {
      ratchet: bytesToHexLower(record.ratchet),
      received: record.received
    }));
    return utf8Encode(json);
  }
}
export function decodeIdentityRatchetRecord(bytes: Uint8Array): IdentityRatchetRecord {
  if (stryMutAct_9fa48("10869")) {
    {}
  } else {
    stryCov_9fa48("10869");
    const parsed = JSON.parse(utf8Decode(bytes)) as {
      ratchet: string;
      received: number;
    };
    return stryMutAct_9fa48("10870") ? {} : (stryCov_9fa48("10870"), {
      ratchet: hexToBytesLower(parsed.ratchet),
      received: parsed.received
    });
  }
}

/**
 * Identity-ratchet encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeIdentityRatchetRecord`
 * reads beside the step). Encode failures become `reject`.
 */
export type EncodeIdentityRatchetRecordState = Record<string, never>;
export type EncodeIdentityRatchetRecordEvent = Event | {
  readonly kind: "identity-ratchet/encode-gate";
  readonly record: IdentityRatchetRecord;
};
export type EncodeIdentityRatchetRecordAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface EncodeIdentityRatchetRecordStepResult {
  readonly state: EncodeIdentityRatchetRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeIdentityRatchetRecordAction[];
}
export function initialEncodeIdentityRatchetRecordState(): EncodeIdentityRatchetRecordState {
  if (stryMutAct_9fa48("10871")) {
    {}
  } else {
    stryCov_9fa48("10871");
    return {};
  }
}
export function stepEncodeIdentityRatchetRecordWithActions(state: EncodeIdentityRatchetRecordState, event: EncodeIdentityRatchetRecordEvent): EncodeIdentityRatchetRecordStepResult {
  if (stryMutAct_9fa48("10872")) {
    {}
  } else {
    stryCov_9fa48("10872");
    if (stryMutAct_9fa48("10875") ? event.kind !== "identity-ratchet/encode-gate" : stryMutAct_9fa48("10874") ? false : stryMutAct_9fa48("10873") ? true : (stryCov_9fa48("10873", "10874", "10875"), event.kind === (stryMutAct_9fa48("10876") ? "" : (stryCov_9fa48("10876"), "identity-ratchet/encode-gate")))) {
      if (stryMutAct_9fa48("10877")) {
        {}
      } else {
        stryCov_9fa48("10877");
        try {
          if (stryMutAct_9fa48("10878")) {
            {}
          } else {
            stryCov_9fa48("10878");
            return stryMutAct_9fa48("10879") ? {} : (stryCov_9fa48("10879"), {
              state,
              intents: stryMutAct_9fa48("10880") ? ["Stryker was here"] : (stryCov_9fa48("10880"), []),
              actions: stryMutAct_9fa48("10881") ? [] : (stryCov_9fa48("10881"), [stryMutAct_9fa48("10882") ? {} : (stryCov_9fa48("10882"), {
                kind: stryMutAct_9fa48("10883") ? "" : (stryCov_9fa48("10883"), "use-raw"),
                raw: encodeIdentityRatchetRecord(event.record)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("10884")) {
            {}
          } else {
            stryCov_9fa48("10884");
            return stryMutAct_9fa48("10885") ? {} : (stryCov_9fa48("10885"), {
              state,
              intents: stryMutAct_9fa48("10886") ? ["Stryker was here"] : (stryCov_9fa48("10886"), []),
              actions: stryMutAct_9fa48("10887") ? [] : (stryCov_9fa48("10887"), [stryMutAct_9fa48("10888") ? {} : (stryCov_9fa48("10888"), {
                kind: stryMutAct_9fa48("10889") ? "" : (stryCov_9fa48("10889"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("10890") ? {} : (stryCov_9fa48("10890"), {
      state,
      intents: stryMutAct_9fa48("10891") ? ["Stryker was here"] : (stryCov_9fa48("10891"), []),
      actions: stryMutAct_9fa48("10892") ? ["Stryker was here"] : (stryCov_9fa48("10892"), [])
    });
  }
}
export function shouldUseEncodeIdentityRatchetRecord(actions: ReadonlyArray<EncodeIdentityRatchetRecordAction>): boolean {
  if (stryMutAct_9fa48("10893")) {
    {}
  } else {
    stryCov_9fa48("10893");
    return stryMutAct_9fa48("10894") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("10894"), actions.some(stryMutAct_9fa48("10895") ? () => undefined : (stryCov_9fa48("10895"), action => stryMutAct_9fa48("10898") ? action.kind !== "use-raw" : stryMutAct_9fa48("10897") ? false : stryMutAct_9fa48("10896") ? true : (stryCov_9fa48("10896", "10897", "10898"), action.kind === (stryMutAct_9fa48("10899") ? "" : (stryCov_9fa48("10899"), "use-raw"))))));
  }
}
export function shouldRejectEncodeIdentityRatchetRecord(actions: ReadonlyArray<EncodeIdentityRatchetRecordAction>): boolean {
  if (stryMutAct_9fa48("10900")) {
    {}
  } else {
    stryCov_9fa48("10900");
    return stryMutAct_9fa48("10901") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("10901"), actions.some(stryMutAct_9fa48("10902") ? () => undefined : (stryCov_9fa48("10902"), action => stryMutAct_9fa48("10905") ? action.kind !== "reject" : stryMutAct_9fa48("10904") ? false : stryMutAct_9fa48("10903") ? true : (stryCov_9fa48("10903", "10904", "10905"), action.kind === (stryMutAct_9fa48("10906") ? "" : (stryCov_9fa48("10906"), "reject"))))));
  }
}

/** Extract encoded identity ratchet record from step actions; null when no `use-raw`. */
export function encodeIdentityRatchetRecordRawFromActions(actions: ReadonlyArray<EncodeIdentityRatchetRecordAction>): Uint8Array | null {
  if (stryMutAct_9fa48("10907")) {
    {}
  } else {
    stryCov_9fa48("10907");
    const action = actions.find(stryMutAct_9fa48("10908") ? () => undefined : (stryCov_9fa48("10908"), entry => stryMutAct_9fa48("10911") ? entry.kind !== "use-raw" : stryMutAct_9fa48("10910") ? false : stryMutAct_9fa48("10909") ? true : (stryCov_9fa48("10909", "10910", "10911"), entry.kind === (stryMutAct_9fa48("10912") ? "" : (stryCov_9fa48("10912"), "use-raw")))));
    return (stryMutAct_9fa48("10915") ? action?.kind !== "use-raw" : stryMutAct_9fa48("10914") ? false : stryMutAct_9fa48("10913") ? true : (stryCov_9fa48("10913", "10914", "10915"), (stryMutAct_9fa48("10916") ? action.kind : (stryCov_9fa48("10916"), action?.kind)) === (stryMutAct_9fa48("10917") ? "" : (stryCov_9fa48("10917"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Identity-ratchet decode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodeIdentityRatchetRecord`
 * reads beside the step). Invalid JSON / hex become `reject`.
 */
export type DecodeIdentityRatchetRecordState = Record<string, never>;
export type DecodeIdentityRatchetRecordEvent = Event | {
  readonly kind: "identity-ratchet/decode-gate";
  readonly bytes: Uint8Array;
};
export type DecodeIdentityRatchetRecordAction = {
  readonly kind: "use-fields";
  readonly fields: IdentityRatchetRecord;
} | {
  readonly kind: "reject";
};
export interface DecodeIdentityRatchetRecordStepResult {
  readonly state: DecodeIdentityRatchetRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeIdentityRatchetRecordAction[];
}
export function initialDecodeIdentityRatchetRecordState(): DecodeIdentityRatchetRecordState {
  if (stryMutAct_9fa48("10918")) {
    {}
  } else {
    stryCov_9fa48("10918");
    return {};
  }
}
export function stepDecodeIdentityRatchetRecordWithActions(state: DecodeIdentityRatchetRecordState, event: DecodeIdentityRatchetRecordEvent): DecodeIdentityRatchetRecordStepResult {
  if (stryMutAct_9fa48("10919")) {
    {}
  } else {
    stryCov_9fa48("10919");
    if (stryMutAct_9fa48("10922") ? event.kind !== "identity-ratchet/decode-gate" : stryMutAct_9fa48("10921") ? false : stryMutAct_9fa48("10920") ? true : (stryCov_9fa48("10920", "10921", "10922"), event.kind === (stryMutAct_9fa48("10923") ? "" : (stryCov_9fa48("10923"), "identity-ratchet/decode-gate")))) {
      if (stryMutAct_9fa48("10924")) {
        {}
      } else {
        stryCov_9fa48("10924");
        try {
          if (stryMutAct_9fa48("10925")) {
            {}
          } else {
            stryCov_9fa48("10925");
            return stryMutAct_9fa48("10926") ? {} : (stryCov_9fa48("10926"), {
              state,
              intents: stryMutAct_9fa48("10927") ? ["Stryker was here"] : (stryCov_9fa48("10927"), []),
              actions: stryMutAct_9fa48("10928") ? [] : (stryCov_9fa48("10928"), [stryMutAct_9fa48("10929") ? {} : (stryCov_9fa48("10929"), {
                kind: stryMutAct_9fa48("10930") ? "" : (stryCov_9fa48("10930"), "use-fields"),
                fields: decodeIdentityRatchetRecord(event.bytes)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("10931")) {
            {}
          } else {
            stryCov_9fa48("10931");
            return stryMutAct_9fa48("10932") ? {} : (stryCov_9fa48("10932"), {
              state,
              intents: stryMutAct_9fa48("10933") ? ["Stryker was here"] : (stryCov_9fa48("10933"), []),
              actions: stryMutAct_9fa48("10934") ? [] : (stryCov_9fa48("10934"), [stryMutAct_9fa48("10935") ? {} : (stryCov_9fa48("10935"), {
                kind: stryMutAct_9fa48("10936") ? "" : (stryCov_9fa48("10936"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("10937") ? {} : (stryCov_9fa48("10937"), {
      state,
      intents: stryMutAct_9fa48("10938") ? ["Stryker was here"] : (stryCov_9fa48("10938"), []),
      actions: stryMutAct_9fa48("10939") ? ["Stryker was here"] : (stryCov_9fa48("10939"), [])
    });
  }
}
export function shouldUseDecodeIdentityRatchetRecord(actions: ReadonlyArray<DecodeIdentityRatchetRecordAction>): boolean {
  if (stryMutAct_9fa48("10940")) {
    {}
  } else {
    stryCov_9fa48("10940");
    return stryMutAct_9fa48("10941") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("10941"), actions.some(stryMutAct_9fa48("10942") ? () => undefined : (stryCov_9fa48("10942"), action => stryMutAct_9fa48("10945") ? action.kind !== "use-fields" : stryMutAct_9fa48("10944") ? false : stryMutAct_9fa48("10943") ? true : (stryCov_9fa48("10943", "10944", "10945"), action.kind === (stryMutAct_9fa48("10946") ? "" : (stryCov_9fa48("10946"), "use-fields"))))));
  }
}
export function shouldRejectDecodeIdentityRatchetRecord(actions: ReadonlyArray<DecodeIdentityRatchetRecordAction>): boolean {
  if (stryMutAct_9fa48("10947")) {
    {}
  } else {
    stryCov_9fa48("10947");
    return stryMutAct_9fa48("10948") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("10948"), actions.some(stryMutAct_9fa48("10949") ? () => undefined : (stryCov_9fa48("10949"), action => stryMutAct_9fa48("10952") ? action.kind !== "reject" : stryMutAct_9fa48("10951") ? false : stryMutAct_9fa48("10950") ? true : (stryCov_9fa48("10950", "10951", "10952"), action.kind === (stryMutAct_9fa48("10953") ? "" : (stryCov_9fa48("10953"), "reject"))))));
  }
}

/** Extract decoded identity ratchet record from step actions; null when no `use-fields`. */
export function identityRatchetRecordFromActions(actions: ReadonlyArray<DecodeIdentityRatchetRecordAction>): IdentityRatchetRecord | null {
  if (stryMutAct_9fa48("10954")) {
    {}
  } else {
    stryCov_9fa48("10954");
    const action = actions.find(stryMutAct_9fa48("10955") ? () => undefined : (stryCov_9fa48("10955"), entry => stryMutAct_9fa48("10958") ? entry.kind !== "use-fields" : stryMutAct_9fa48("10957") ? false : stryMutAct_9fa48("10956") ? true : (stryCov_9fa48("10956", "10957", "10958"), entry.kind === (stryMutAct_9fa48("10959") ? "" : (stryCov_9fa48("10959"), "use-fields")))));
    return (stryMutAct_9fa48("10962") ? action?.kind !== "use-fields" : stryMutAct_9fa48("10961") ? false : stryMutAct_9fa48("10960") ? true : (stryCov_9fa48("10960", "10961", "10962"), (stryMutAct_9fa48("10963") ? action.kind : (stryCov_9fa48("10963"), action?.kind)) === (stryMutAct_9fa48("10964") ? "" : (stryCov_9fa48("10964"), "use-fields")))) ? action.fields : null;
  }
}
export function isIdentityRatchetRecordUsable(record: IdentityRatchetRecord, nowSeconds: number, options: {
  readonly expirySeconds?: number;
  readonly ratchetBytes?: number;
} = {}): boolean {
  if (stryMutAct_9fa48("10965")) {
    {}
  } else {
    stryCov_9fa48("10965");
    const expirySeconds = stryMutAct_9fa48("10966") ? options.expirySeconds && IDENTITY_RATCHET_EXPIRY_SECONDS : (stryCov_9fa48("10966"), options.expirySeconds ?? IDENTITY_RATCHET_EXPIRY_SECONDS);
    const ratchetBytes = stryMutAct_9fa48("10967") ? options.ratchetBytes && IDENTITY_RATCHET_BYTES : (stryCov_9fa48("10967"), options.ratchetBytes ?? IDENTITY_RATCHET_BYTES);
    if (stryMutAct_9fa48("10970") ? record.ratchet.length === ratchetBytes : stryMutAct_9fa48("10969") ? false : stryMutAct_9fa48("10968") ? true : (stryCov_9fa48("10968", "10969", "10970"), record.ratchet.length !== ratchetBytes)) {
      if (stryMutAct_9fa48("10971")) {
        {}
      } else {
        stryCov_9fa48("10971");
        return stryMutAct_9fa48("10972") ? true : (stryCov_9fa48("10972"), false);
      }
    }
    return stryMutAct_9fa48("10976") ? nowSeconds >= record.received + expirySeconds : stryMutAct_9fa48("10975") ? nowSeconds <= record.received + expirySeconds : stryMutAct_9fa48("10974") ? false : stryMutAct_9fa48("10973") ? true : (stryCov_9fa48("10973", "10974", "10975", "10976"), nowSeconds < (stryMutAct_9fa48("10977") ? record.received - expirySeconds : (stryCov_9fa48("10977"), record.received + expirySeconds)));
  }
}

/**
 * Identity-ratchet usability gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isIdentityRatchetRecordUsable`
 * reads beside the step).
 */
export type IdentityRatchetRecordUsableState = Record<string, never>;
export type IdentityRatchetRecordUsableEvent = Event | {
  readonly kind: "identity-ratchet/usable-gate";
  readonly record: IdentityRatchetRecord;
  readonly nowSeconds: number;
  readonly expirySeconds?: number;
  readonly ratchetBytes?: number;
};
export type IdentityRatchetRecordUsableAction = {
  readonly kind: "usable";
} | {
  readonly kind: "unusable";
};
export interface IdentityRatchetRecordUsableStepResult {
  readonly state: IdentityRatchetRecordUsableState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRatchetRecordUsableAction[];
}
export function initialIdentityRatchetRecordUsableState(): IdentityRatchetRecordUsableState {
  if (stryMutAct_9fa48("10978")) {
    {}
  } else {
    stryCov_9fa48("10978");
    return {};
  }
}
export function stepIdentityRatchetRecordUsableWithActions(state: IdentityRatchetRecordUsableState, event: IdentityRatchetRecordUsableEvent): IdentityRatchetRecordUsableStepResult {
  if (stryMutAct_9fa48("10979")) {
    {}
  } else {
    stryCov_9fa48("10979");
    if (stryMutAct_9fa48("10982") ? event.kind !== "identity-ratchet/usable-gate" : stryMutAct_9fa48("10981") ? false : stryMutAct_9fa48("10980") ? true : (stryCov_9fa48("10980", "10981", "10982"), event.kind === (stryMutAct_9fa48("10983") ? "" : (stryCov_9fa48("10983"), "identity-ratchet/usable-gate")))) {
      if (stryMutAct_9fa48("10984")) {
        {}
      } else {
        stryCov_9fa48("10984");
        const options = (stryMutAct_9fa48("10987") ? event.expirySeconds === undefined || event.ratchetBytes === undefined : stryMutAct_9fa48("10986") ? false : stryMutAct_9fa48("10985") ? true : (stryCov_9fa48("10985", "10986", "10987"), (stryMutAct_9fa48("10989") ? event.expirySeconds !== undefined : stryMutAct_9fa48("10988") ? true : (stryCov_9fa48("10988", "10989"), event.expirySeconds === undefined)) && (stryMutAct_9fa48("10991") ? event.ratchetBytes !== undefined : stryMutAct_9fa48("10990") ? true : (stryCov_9fa48("10990", "10991"), event.ratchetBytes === undefined)))) ? undefined : stryMutAct_9fa48("10992") ? {} : (stryCov_9fa48("10992"), {
          ...((stryMutAct_9fa48("10995") ? event.expirySeconds === undefined : stryMutAct_9fa48("10994") ? false : stryMutAct_9fa48("10993") ? true : (stryCov_9fa48("10993", "10994", "10995"), event.expirySeconds !== undefined)) ? stryMutAct_9fa48("10996") ? {} : (stryCov_9fa48("10996"), {
            expirySeconds: event.expirySeconds
          }) : {}),
          ...((stryMutAct_9fa48("10999") ? event.ratchetBytes === undefined : stryMutAct_9fa48("10998") ? false : stryMutAct_9fa48("10997") ? true : (stryCov_9fa48("10997", "10998", "10999"), event.ratchetBytes !== undefined)) ? stryMutAct_9fa48("11000") ? {} : (stryCov_9fa48("11000"), {
            ratchetBytes: event.ratchetBytes
          }) : {})
        });
        return stryMutAct_9fa48("11001") ? {} : (stryCov_9fa48("11001"), {
          state,
          intents: stryMutAct_9fa48("11002") ? ["Stryker was here"] : (stryCov_9fa48("11002"), []),
          actions: stryMutAct_9fa48("11003") ? [] : (stryCov_9fa48("11003"), [stryMutAct_9fa48("11004") ? {} : (stryCov_9fa48("11004"), {
            kind: isIdentityRatchetRecordUsable(event.record, event.nowSeconds, stryMutAct_9fa48("11005") ? options && {} : (stryCov_9fa48("11005"), options ?? {})) ? stryMutAct_9fa48("11006") ? "" : (stryCov_9fa48("11006"), "usable") : stryMutAct_9fa48("11007") ? "" : (stryCov_9fa48("11007"), "unusable")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11008") ? {} : (stryCov_9fa48("11008"), {
      state,
      intents: stryMutAct_9fa48("11009") ? ["Stryker was here"] : (stryCov_9fa48("11009"), []),
      actions: stryMutAct_9fa48("11010") ? ["Stryker was here"] : (stryCov_9fa48("11010"), [])
    });
  }
}
export function shouldTreatIdentityRatchetRecordUsable(actions: ReadonlyArray<IdentityRatchetRecordUsableAction>): boolean {
  if (stryMutAct_9fa48("11011")) {
    {}
  } else {
    stryCov_9fa48("11011");
    return stryMutAct_9fa48("11012") ? actions.every(action => action.kind === "usable") : (stryCov_9fa48("11012"), actions.some(stryMutAct_9fa48("11013") ? () => undefined : (stryCov_9fa48("11013"), action => stryMutAct_9fa48("11016") ? action.kind !== "usable" : stryMutAct_9fa48("11015") ? false : stryMutAct_9fa48("11014") ? true : (stryCov_9fa48("11014", "11015", "11016"), action.kind === (stryMutAct_9fa48("11017") ? "" : (stryCov_9fa48("11017"), "usable"))))));
  }
}
export function shouldTreatIdentityRatchetRecordUnusable(actions: ReadonlyArray<IdentityRatchetRecordUsableAction>): boolean {
  if (stryMutAct_9fa48("11018")) {
    {}
  } else {
    stryCov_9fa48("11018");
    return stryMutAct_9fa48("11019") ? actions.every(action => action.kind === "unusable") : (stryCov_9fa48("11019"), actions.some(stryMutAct_9fa48("11020") ? () => undefined : (stryCov_9fa48("11020"), action => stryMutAct_9fa48("11023") ? action.kind !== "unusable" : stryMutAct_9fa48("11022") ? false : stryMutAct_9fa48("11021") ? true : (stryCov_9fa48("11021", "11022", "11023"), action.kind === (stryMutAct_9fa48("11024") ? "" : (stryCov_9fa48("11024"), "unusable"))))));
  }
}
export type IdentityRatchetLookupPlan = "use-cache" | "miss-no-store" | "miss-store" | "reject-unusable" | "restore";

/**
 * Ratchet lookup: cache hit, store absence/miss, unusable record, or restore.
 * Store get / Map set stay at the adapter (call again after store read).
 */
export function planIdentityRatchetLookup(input: {
  readonly cachedPresent: boolean;
  readonly storePresent: boolean;
  readonly storedPresent: boolean;
  readonly usable: boolean;
}): IdentityRatchetLookupPlan {
  if (stryMutAct_9fa48("11025")) {
    {}
  } else {
    stryCov_9fa48("11025");
    if (stryMutAct_9fa48("11027") ? false : stryMutAct_9fa48("11026") ? true : (stryCov_9fa48("11026", "11027"), input.cachedPresent)) {
      if (stryMutAct_9fa48("11028")) {
        {}
      } else {
        stryCov_9fa48("11028");
        return stryMutAct_9fa48("11029") ? "" : (stryCov_9fa48("11029"), "use-cache");
      }
    }
    if (stryMutAct_9fa48("11032") ? false : stryMutAct_9fa48("11031") ? true : stryMutAct_9fa48("11030") ? input.storePresent : (stryCov_9fa48("11030", "11031", "11032"), !input.storePresent)) {
      if (stryMutAct_9fa48("11033")) {
        {}
      } else {
        stryCov_9fa48("11033");
        return stryMutAct_9fa48("11034") ? "" : (stryCov_9fa48("11034"), "miss-no-store");
      }
    }
    if (stryMutAct_9fa48("11037") ? false : stryMutAct_9fa48("11036") ? true : stryMutAct_9fa48("11035") ? input.storedPresent : (stryCov_9fa48("11035", "11036", "11037"), !input.storedPresent)) {
      if (stryMutAct_9fa48("11038")) {
        {}
      } else {
        stryCov_9fa48("11038");
        return stryMutAct_9fa48("11039") ? "" : (stryCov_9fa48("11039"), "miss-store");
      }
    }
    if (stryMutAct_9fa48("11042") ? false : stryMutAct_9fa48("11041") ? true : stryMutAct_9fa48("11040") ? input.usable : (stryCov_9fa48("11040", "11041", "11042"), !input.usable)) {
      if (stryMutAct_9fa48("11043")) {
        {}
      } else {
        stryCov_9fa48("11043");
        return stryMutAct_9fa48("11044") ? "" : (stryCov_9fa48("11044"), "reject-unusable");
      }
    }
    return stryMutAct_9fa48("11045") ? "" : (stryCov_9fa48("11045"), "restore");
  }
}

/**
 * Identity-ratchet-lookup-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planIdentityRatchetLookup`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepIdentityRatchetLookupWithActions}.
 */
export type IdentityRatchetLookupPlanState = Record<string, never>;
export type IdentityRatchetLookupPlanEvent = Event | {
  readonly kind: "identity/ratchet-lookup-plan-gate";
  readonly cachedPresent: boolean;
  readonly storePresent: boolean;
  readonly storedPresent: boolean;
  readonly usable: boolean;
};
export type IdentityRatchetLookupPlanAction = {
  readonly kind: IdentityRatchetLookupPlan;
};
export interface IdentityRatchetLookupPlanStepResult {
  readonly state: IdentityRatchetLookupPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRatchetLookupPlanAction[];
}
export function initialIdentityRatchetLookupPlanState(): IdentityRatchetLookupPlanState {
  if (stryMutAct_9fa48("11046")) {
    {}
  } else {
    stryCov_9fa48("11046");
    return {};
  }
}
export function stepIdentityRatchetLookupPlanWithActions(state: IdentityRatchetLookupPlanState, event: IdentityRatchetLookupPlanEvent): IdentityRatchetLookupPlanStepResult {
  if (stryMutAct_9fa48("11047")) {
    {}
  } else {
    stryCov_9fa48("11047");
    if (stryMutAct_9fa48("11050") ? event.kind !== "identity/ratchet-lookup-plan-gate" : stryMutAct_9fa48("11049") ? false : stryMutAct_9fa48("11048") ? true : (stryCov_9fa48("11048", "11049", "11050"), event.kind === (stryMutAct_9fa48("11051") ? "" : (stryCov_9fa48("11051"), "identity/ratchet-lookup-plan-gate")))) {
      if (stryMutAct_9fa48("11052")) {
        {}
      } else {
        stryCov_9fa48("11052");
        return stryMutAct_9fa48("11053") ? {} : (stryCov_9fa48("11053"), {
          state,
          intents: stryMutAct_9fa48("11054") ? ["Stryker was here"] : (stryCov_9fa48("11054"), []),
          actions: stryMutAct_9fa48("11055") ? [] : (stryCov_9fa48("11055"), [stryMutAct_9fa48("11056") ? {} : (stryCov_9fa48("11056"), {
            kind: planIdentityRatchetLookup(stryMutAct_9fa48("11057") ? {} : (stryCov_9fa48("11057"), {
              cachedPresent: event.cachedPresent,
              storePresent: event.storePresent,
              storedPresent: event.storedPresent,
              usable: event.usable
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("11058") ? {} : (stryCov_9fa48("11058"), {
      state,
      intents: stryMutAct_9fa48("11059") ? ["Stryker was here"] : (stryCov_9fa48("11059"), []),
      actions: stryMutAct_9fa48("11060") ? ["Stryker was here"] : (stryCov_9fa48("11060"), [])
    });
  }
}

/** Extract the ratchet-lookup plan from actions; null when empty. */
export function identityRatchetLookupPlanFromActions(actions: ReadonlyArray<IdentityRatchetLookupPlanAction>): IdentityRatchetLookupPlan | null {
  if (stryMutAct_9fa48("11061")) {
    {}
  } else {
    stryCov_9fa48("11061");
    const action = actions.find(stryMutAct_9fa48("11062") ? () => undefined : (stryCov_9fa48("11062"), entry => stryMutAct_9fa48("11065") ? (entry.kind === "use-cache" || entry.kind === "miss-no-store" || entry.kind === "miss-store" || entry.kind === "reject-unusable") && entry.kind === "restore" : stryMutAct_9fa48("11064") ? false : stryMutAct_9fa48("11063") ? true : (stryCov_9fa48("11063", "11064", "11065"), (stryMutAct_9fa48("11067") ? (entry.kind === "use-cache" || entry.kind === "miss-no-store" || entry.kind === "miss-store") && entry.kind === "reject-unusable" : stryMutAct_9fa48("11066") ? false : (stryCov_9fa48("11066", "11067"), (stryMutAct_9fa48("11069") ? (entry.kind === "use-cache" || entry.kind === "miss-no-store") && entry.kind === "miss-store" : stryMutAct_9fa48("11068") ? false : (stryCov_9fa48("11068", "11069"), (stryMutAct_9fa48("11071") ? entry.kind === "use-cache" && entry.kind === "miss-no-store" : stryMutAct_9fa48("11070") ? false : (stryCov_9fa48("11070", "11071"), (stryMutAct_9fa48("11073") ? entry.kind !== "use-cache" : stryMutAct_9fa48("11072") ? false : (stryCov_9fa48("11072", "11073"), entry.kind === (stryMutAct_9fa48("11074") ? "" : (stryCov_9fa48("11074"), "use-cache")))) || (stryMutAct_9fa48("11076") ? entry.kind !== "miss-no-store" : stryMutAct_9fa48("11075") ? false : (stryCov_9fa48("11075", "11076"), entry.kind === (stryMutAct_9fa48("11077") ? "" : (stryCov_9fa48("11077"), "miss-no-store")))))) || (stryMutAct_9fa48("11079") ? entry.kind !== "miss-store" : stryMutAct_9fa48("11078") ? false : (stryCov_9fa48("11078", "11079"), entry.kind === (stryMutAct_9fa48("11080") ? "" : (stryCov_9fa48("11080"), "miss-store")))))) || (stryMutAct_9fa48("11082") ? entry.kind !== "reject-unusable" : stryMutAct_9fa48("11081") ? false : (stryCov_9fa48("11081", "11082"), entry.kind === (stryMutAct_9fa48("11083") ? "" : (stryCov_9fa48("11083"), "reject-unusable")))))) || (stryMutAct_9fa48("11085") ? entry.kind !== "restore" : stryMutAct_9fa48("11084") ? false : (stryCov_9fa48("11084", "11085"), entry.kind === (stryMutAct_9fa48("11086") ? "" : (stryCov_9fa48("11086"), "restore")))))));
    return stryMutAct_9fa48("11087") ? action?.kind && null : (stryCov_9fa48("11087"), (stryMutAct_9fa48("11088") ? action.kind : (stryCov_9fa48("11088"), action?.kind)) ?? null);
  }
}
export function shouldUseCachedIdentityRatchetLookupPlan(actions: ReadonlyArray<IdentityRatchetLookupPlanAction>): boolean {
  if (stryMutAct_9fa48("11089")) {
    {}
  } else {
    stryCov_9fa48("11089");
    return stryMutAct_9fa48("11090") ? actions.every(action => action.kind === "use-cache") : (stryCov_9fa48("11090"), actions.some(stryMutAct_9fa48("11091") ? () => undefined : (stryCov_9fa48("11091"), action => stryMutAct_9fa48("11094") ? action.kind !== "use-cache" : stryMutAct_9fa48("11093") ? false : stryMutAct_9fa48("11092") ? true : (stryCov_9fa48("11092", "11093", "11094"), action.kind === (stryMutAct_9fa48("11095") ? "" : (stryCov_9fa48("11095"), "use-cache"))))));
  }
}
export function shouldMissIdentityRatchetLookupPlanNoStore(actions: ReadonlyArray<IdentityRatchetLookupPlanAction>): boolean {
  if (stryMutAct_9fa48("11096")) {
    {}
  } else {
    stryCov_9fa48("11096");
    return stryMutAct_9fa48("11097") ? actions.every(action => action.kind === "miss-no-store") : (stryCov_9fa48("11097"), actions.some(stryMutAct_9fa48("11098") ? () => undefined : (stryCov_9fa48("11098"), action => stryMutAct_9fa48("11101") ? action.kind !== "miss-no-store" : stryMutAct_9fa48("11100") ? false : stryMutAct_9fa48("11099") ? true : (stryCov_9fa48("11099", "11100", "11101"), action.kind === (stryMutAct_9fa48("11102") ? "" : (stryCov_9fa48("11102"), "miss-no-store"))))));
  }
}
export function shouldMissIdentityRatchetLookupPlanStore(actions: ReadonlyArray<IdentityRatchetLookupPlanAction>): boolean {
  if (stryMutAct_9fa48("11103")) {
    {}
  } else {
    stryCov_9fa48("11103");
    return stryMutAct_9fa48("11104") ? actions.every(action => action.kind === "miss-store") : (stryCov_9fa48("11104"), actions.some(stryMutAct_9fa48("11105") ? () => undefined : (stryCov_9fa48("11105"), action => stryMutAct_9fa48("11108") ? action.kind !== "miss-store" : stryMutAct_9fa48("11107") ? false : stryMutAct_9fa48("11106") ? true : (stryCov_9fa48("11106", "11107", "11108"), action.kind === (stryMutAct_9fa48("11109") ? "" : (stryCov_9fa48("11109"), "miss-store"))))));
  }
}
export function shouldRejectIdentityRatchetLookupPlanUnusable(actions: ReadonlyArray<IdentityRatchetLookupPlanAction>): boolean {
  if (stryMutAct_9fa48("11110")) {
    {}
  } else {
    stryCov_9fa48("11110");
    return stryMutAct_9fa48("11111") ? actions.every(action => action.kind === "reject-unusable") : (stryCov_9fa48("11111"), actions.some(stryMutAct_9fa48("11112") ? () => undefined : (stryCov_9fa48("11112"), action => stryMutAct_9fa48("11115") ? action.kind !== "reject-unusable" : stryMutAct_9fa48("11114") ? false : stryMutAct_9fa48("11113") ? true : (stryCov_9fa48("11113", "11114", "11115"), action.kind === (stryMutAct_9fa48("11116") ? "" : (stryCov_9fa48("11116"), "reject-unusable"))))));
  }
}
export function shouldRestoreIdentityRatchetLookupPlan(actions: ReadonlyArray<IdentityRatchetLookupPlanAction>): boolean {
  if (stryMutAct_9fa48("11117")) {
    {}
  } else {
    stryCov_9fa48("11117");
    return stryMutAct_9fa48("11118") ? actions.every(action => action.kind === "restore") : (stryCov_9fa48("11118"), actions.some(stryMutAct_9fa48("11119") ? () => undefined : (stryCov_9fa48("11119"), action => stryMutAct_9fa48("11122") ? action.kind !== "restore" : stryMutAct_9fa48("11121") ? false : stryMutAct_9fa48("11120") ? true : (stryCov_9fa48("11120", "11121", "11122"), action.kind === (stryMutAct_9fa48("11123") ? "" : (stryCov_9fa48("11123"), "restore"))))));
  }
}

/**
 * Identity ratchet lookup gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepIdentityRatchetLookupPlanWithActions}
 * (`use-cache`|`miss-no-store`|`miss-store`|`reject-unusable`|`restore`).
 */
export type IdentityRatchetLookupState = Record<string, never>;
export type IdentityRatchetLookupEvent = Event | {
  readonly kind: "identity/ratchet-lookup-gate";
  readonly cachedPresent: boolean;
  readonly storePresent: boolean;
  readonly storedPresent: boolean;
  readonly usable: boolean;
};

/**
 * Adapter applies cache/store outcomes only from these actions.
 * Plan nested via {@link stepIdentityRatchetLookupPlanWithActions}
 * (`use-cache`|`miss-no-store`|`miss-store`|`reject-unusable`|`restore`).
 */
export type IdentityRatchetLookupAction = {
  readonly kind: IdentityRatchetLookupPlan;
};
export interface IdentityRatchetLookupStepResult {
  readonly state: IdentityRatchetLookupState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRatchetLookupAction[];
}
export function initialIdentityRatchetLookupState(): IdentityRatchetLookupState {
  if (stryMutAct_9fa48("11124")) {
    {}
  } else {
    stryCov_9fa48("11124");
    return {};
  }
}
export const stepIdentityRatchetLookup: StepFn<IdentityRatchetLookupState> = (state, event) => {
  if (stryMutAct_9fa48("11125")) {
    {}
  } else {
    stryCov_9fa48("11125");
    const result = stepIdentityRatchetLookupInner(state, event as IdentityRatchetLookupEvent);
    return stryMutAct_9fa48("11126") ? {} : (stryCov_9fa48("11126"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepIdentityRatchetLookupWithActions(state: IdentityRatchetLookupState, event: IdentityRatchetLookupEvent): IdentityRatchetLookupStepResult {
  if (stryMutAct_9fa48("11127")) {
    {}
  } else {
    stryCov_9fa48("11127");
    return stepIdentityRatchetLookupInner(state, event);
  }
}
export function shouldUseCachedIdentityRatchet(actions: ReadonlyArray<IdentityRatchetLookupAction>): boolean {
  if (stryMutAct_9fa48("11128")) {
    {}
  } else {
    stryCov_9fa48("11128");
    return stryMutAct_9fa48("11129") ? actions.every(action => action.kind === "use-cache") : (stryCov_9fa48("11129"), actions.some(stryMutAct_9fa48("11130") ? () => undefined : (stryCov_9fa48("11130"), action => stryMutAct_9fa48("11133") ? action.kind !== "use-cache" : stryMutAct_9fa48("11132") ? false : stryMutAct_9fa48("11131") ? true : (stryCov_9fa48("11131", "11132", "11133"), action.kind === (stryMutAct_9fa48("11134") ? "" : (stryCov_9fa48("11134"), "use-cache"))))));
  }
}
export function shouldMissIdentityRatchetNoStore(actions: ReadonlyArray<IdentityRatchetLookupAction>): boolean {
  if (stryMutAct_9fa48("11135")) {
    {}
  } else {
    stryCov_9fa48("11135");
    return stryMutAct_9fa48("11136") ? actions.every(action => action.kind === "miss-no-store") : (stryCov_9fa48("11136"), actions.some(stryMutAct_9fa48("11137") ? () => undefined : (stryCov_9fa48("11137"), action => stryMutAct_9fa48("11140") ? action.kind !== "miss-no-store" : stryMutAct_9fa48("11139") ? false : stryMutAct_9fa48("11138") ? true : (stryCov_9fa48("11138", "11139", "11140"), action.kind === (stryMutAct_9fa48("11141") ? "" : (stryCov_9fa48("11141"), "miss-no-store"))))));
  }
}
export function shouldMissIdentityRatchetStore(actions: ReadonlyArray<IdentityRatchetLookupAction>): boolean {
  if (stryMutAct_9fa48("11142")) {
    {}
  } else {
    stryCov_9fa48("11142");
    return stryMutAct_9fa48("11143") ? actions.every(action => action.kind === "miss-store") : (stryCov_9fa48("11143"), actions.some(stryMutAct_9fa48("11144") ? () => undefined : (stryCov_9fa48("11144"), action => stryMutAct_9fa48("11147") ? action.kind !== "miss-store" : stryMutAct_9fa48("11146") ? false : stryMutAct_9fa48("11145") ? true : (stryCov_9fa48("11145", "11146", "11147"), action.kind === (stryMutAct_9fa48("11148") ? "" : (stryCov_9fa48("11148"), "miss-store"))))));
  }
}
export function shouldRejectIdentityRatchetUnusable(actions: ReadonlyArray<IdentityRatchetLookupAction>): boolean {
  if (stryMutAct_9fa48("11149")) {
    {}
  } else {
    stryCov_9fa48("11149");
    return stryMutAct_9fa48("11150") ? actions.every(action => action.kind === "reject-unusable") : (stryCov_9fa48("11150"), actions.some(stryMutAct_9fa48("11151") ? () => undefined : (stryCov_9fa48("11151"), action => stryMutAct_9fa48("11154") ? action.kind !== "reject-unusable" : stryMutAct_9fa48("11153") ? false : stryMutAct_9fa48("11152") ? true : (stryCov_9fa48("11152", "11153", "11154"), action.kind === (stryMutAct_9fa48("11155") ? "" : (stryCov_9fa48("11155"), "reject-unusable"))))));
  }
}
export function shouldRestoreIdentityRatchetLookup(actions: ReadonlyArray<IdentityRatchetLookupAction>): boolean {
  if (stryMutAct_9fa48("11156")) {
    {}
  } else {
    stryCov_9fa48("11156");
    return stryMutAct_9fa48("11157") ? actions.every(action => action.kind === "restore") : (stryCov_9fa48("11157"), actions.some(stryMutAct_9fa48("11158") ? () => undefined : (stryCov_9fa48("11158"), action => stryMutAct_9fa48("11161") ? action.kind !== "restore" : stryMutAct_9fa48("11160") ? false : stryMutAct_9fa48("11159") ? true : (stryCov_9fa48("11159", "11160", "11161"), action.kind === (stryMutAct_9fa48("11162") ? "" : (stryCov_9fa48("11162"), "restore"))))));
  }
}
function stepIdentityRatchetLookupInner(state: IdentityRatchetLookupState, event: IdentityRatchetLookupEvent): IdentityRatchetLookupStepResult {
  if (stryMutAct_9fa48("11163")) {
    {}
  } else {
    stryCov_9fa48("11163");
    if (stryMutAct_9fa48("11166") ? event.kind !== "identity/ratchet-lookup-gate" : stryMutAct_9fa48("11165") ? false : stryMutAct_9fa48("11164") ? true : (stryCov_9fa48("11164", "11165", "11166"), event.kind === (stryMutAct_9fa48("11167") ? "" : (stryCov_9fa48("11167"), "identity/ratchet-lookup-gate")))) {
      if (stryMutAct_9fa48("11168")) {
        {}
      } else {
        stryCov_9fa48("11168");
        const planActions = stepIdentityRatchetLookupPlanWithActions(initialIdentityRatchetLookupPlanState(), stryMutAct_9fa48("11169") ? {} : (stryCov_9fa48("11169"), {
          kind: stryMutAct_9fa48("11170") ? "" : (stryCov_9fa48("11170"), "identity/ratchet-lookup-plan-gate"),
          cachedPresent: event.cachedPresent,
          storePresent: event.storePresent,
          storedPresent: event.storedPresent,
          usable: event.usable
        })).actions;
        const plan = identityRatchetLookupPlanFromActions(planActions);
        if (stryMutAct_9fa48("11173") ? plan !== null : stryMutAct_9fa48("11172") ? false : stryMutAct_9fa48("11171") ? true : (stryCov_9fa48("11171", "11172", "11173"), plan === null)) {
          if (stryMutAct_9fa48("11174")) {
            {}
          } else {
            stryCov_9fa48("11174");
            return stryMutAct_9fa48("11175") ? {} : (stryCov_9fa48("11175"), {
              state,
              intents: stryMutAct_9fa48("11176") ? ["Stryker was here"] : (stryCov_9fa48("11176"), []),
              actions: stryMutAct_9fa48("11177") ? ["Stryker was here"] : (stryCov_9fa48("11177"), [])
            });
          }
        }
        return stryMutAct_9fa48("11178") ? {} : (stryCov_9fa48("11178"), {
          state,
          intents: stryMutAct_9fa48("11179") ? ["Stryker was here"] : (stryCov_9fa48("11179"), []),
          actions: stryMutAct_9fa48("11180") ? [] : (stryCov_9fa48("11180"), [stryMutAct_9fa48("11181") ? {} : (stryCov_9fa48("11181"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("11182") ? {} : (stryCov_9fa48("11182"), {
      state,
      intents: stryMutAct_9fa48("11183") ? ["Stryker was here"] : (stryCov_9fa48("11183"), []),
      actions: stryMutAct_9fa48("11184") ? ["Stryker was here"] : (stryCov_9fa48("11184"), [])
    });
  }
}

/** Whether rememberRatchet should persist the record to an injected store. */
export function shouldPersistIdentityRatchet(storePresent: boolean): boolean {
  if (stryMutAct_9fa48("11185")) {
    {}
  } else {
    stryCov_9fa48("11185");
    return storePresent;
  }
}

/**
 * Identity ratchet persist-to-store gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldPersistIdentityRatchet` reads beside the step).
 */
export type PersistIdentityRatchetState = Record<string, never>;
export type PersistIdentityRatchetEvent = Event | {
  readonly kind: "identity/persist-ratchet-gate";
  readonly storePresent: boolean;
};
export type PersistIdentityRatchetAction = {
  readonly kind: "persist";
} | {
  readonly kind: "skip";
};
export interface PersistIdentityRatchetStepResult {
  readonly state: PersistIdentityRatchetState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PersistIdentityRatchetAction[];
}
export function initialPersistIdentityRatchetState(): PersistIdentityRatchetState {
  if (stryMutAct_9fa48("11186")) {
    {}
  } else {
    stryCov_9fa48("11186");
    return {};
  }
}
export function stepPersistIdentityRatchetWithActions(state: PersistIdentityRatchetState, event: PersistIdentityRatchetEvent): PersistIdentityRatchetStepResult {
  if (stryMutAct_9fa48("11187")) {
    {}
  } else {
    stryCov_9fa48("11187");
    if (stryMutAct_9fa48("11190") ? event.kind !== "identity/persist-ratchet-gate" : stryMutAct_9fa48("11189") ? false : stryMutAct_9fa48("11188") ? true : (stryCov_9fa48("11188", "11189", "11190"), event.kind === (stryMutAct_9fa48("11191") ? "" : (stryCov_9fa48("11191"), "identity/persist-ratchet-gate")))) {
      if (stryMutAct_9fa48("11192")) {
        {}
      } else {
        stryCov_9fa48("11192");
        return stryMutAct_9fa48("11193") ? {} : (stryCov_9fa48("11193"), {
          state,
          intents: stryMutAct_9fa48("11194") ? ["Stryker was here"] : (stryCov_9fa48("11194"), []),
          actions: stryMutAct_9fa48("11195") ? [] : (stryCov_9fa48("11195"), [stryMutAct_9fa48("11196") ? {} : (stryCov_9fa48("11196"), {
            kind: shouldPersistIdentityRatchet(event.storePresent) ? stryMutAct_9fa48("11197") ? "" : (stryCov_9fa48("11197"), "persist") : stryMutAct_9fa48("11198") ? "" : (stryCov_9fa48("11198"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11199") ? {} : (stryCov_9fa48("11199"), {
      state,
      intents: stryMutAct_9fa48("11200") ? ["Stryker was here"] : (stryCov_9fa48("11200"), []),
      actions: stryMutAct_9fa48("11201") ? ["Stryker was here"] : (stryCov_9fa48("11201"), [])
    });
  }
}
export function shouldPersistIdentityRatchetNow(actions: ReadonlyArray<PersistIdentityRatchetAction>): boolean {
  if (stryMutAct_9fa48("11202")) {
    {}
  } else {
    stryCov_9fa48("11202");
    return stryMutAct_9fa48("11203") ? actions.every(action => action.kind === "persist") : (stryCov_9fa48("11203"), actions.some(stryMutAct_9fa48("11204") ? () => undefined : (stryCov_9fa48("11204"), action => stryMutAct_9fa48("11207") ? action.kind !== "persist" : stryMutAct_9fa48("11206") ? false : stryMutAct_9fa48("11205") ? true : (stryCov_9fa48("11205", "11206", "11207"), action.kind === (stryMutAct_9fa48("11208") ? "" : (stryCov_9fa48("11208"), "persist"))))));
  }
}
export function shouldSkipPersistIdentityRatchet(actions: ReadonlyArray<PersistIdentityRatchetAction>): boolean {
  if (stryMutAct_9fa48("11209")) {
    {}
  } else {
    stryCov_9fa48("11209");
    return stryMutAct_9fa48("11210") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("11210"), actions.some(stryMutAct_9fa48("11211") ? () => undefined : (stryCov_9fa48("11211"), action => stryMutAct_9fa48("11214") ? action.kind !== "skip" : stryMutAct_9fa48("11213") ? false : stryMutAct_9fa48("11212") ? true : (stryCov_9fa48("11212", "11213", "11214"), action.kind === (stryMutAct_9fa48("11215") ? "" : (stryCov_9fa48("11215"), "skip"))))));
  }
}

/**
 * Whether ratchet lookup may restore after restore actions and decoded
 * record bytes remain present.
 */
export function shouldRestoreIdentityRatchetRecord(input: {
  readonly planRestore: boolean;
  readonly recordPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("11216")) {
    {}
  } else {
    stryCov_9fa48("11216");
    return stryMutAct_9fa48("11219") ? input.planRestore || input.recordPresent : stryMutAct_9fa48("11218") ? false : stryMutAct_9fa48("11217") ? true : (stryCov_9fa48("11217", "11218", "11219"), input.planRestore && input.recordPresent);
  }
}

/**
 * Commit-restored identity-ratchet apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldRestoreIdentityRatchetRecord` reads beside the step).
 */
export type CommitRestoredIdentityRatchetState = Record<string, never>;
export type CommitRestoredIdentityRatchetEvent = Event | {
  readonly kind: "identity/commit-restored-ratchet-gate";
  readonly planRestore: boolean;
  readonly recordPresent: boolean;
};
export type CommitRestoredIdentityRatchetAction = {
  readonly kind: "commit";
} | {
  readonly kind: "skip";
};
export interface CommitRestoredIdentityRatchetStepResult {
  readonly state: CommitRestoredIdentityRatchetState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitRestoredIdentityRatchetAction[];
}
export function initialCommitRestoredIdentityRatchetState(): CommitRestoredIdentityRatchetState {
  if (stryMutAct_9fa48("11220")) {
    {}
  } else {
    stryCov_9fa48("11220");
    return {};
  }
}
export function stepCommitRestoredIdentityRatchetWithActions(state: CommitRestoredIdentityRatchetState, event: CommitRestoredIdentityRatchetEvent): CommitRestoredIdentityRatchetStepResult {
  if (stryMutAct_9fa48("11221")) {
    {}
  } else {
    stryCov_9fa48("11221");
    if (stryMutAct_9fa48("11224") ? event.kind !== "identity/commit-restored-ratchet-gate" : stryMutAct_9fa48("11223") ? false : stryMutAct_9fa48("11222") ? true : (stryCov_9fa48("11222", "11223", "11224"), event.kind === (stryMutAct_9fa48("11225") ? "" : (stryCov_9fa48("11225"), "identity/commit-restored-ratchet-gate")))) {
      if (stryMutAct_9fa48("11226")) {
        {}
      } else {
        stryCov_9fa48("11226");
        return stryMutAct_9fa48("11227") ? {} : (stryCov_9fa48("11227"), {
          state,
          intents: stryMutAct_9fa48("11228") ? ["Stryker was here"] : (stryCov_9fa48("11228"), []),
          actions: stryMutAct_9fa48("11229") ? [] : (stryCov_9fa48("11229"), [stryMutAct_9fa48("11230") ? {} : (stryCov_9fa48("11230"), {
            kind: shouldRestoreIdentityRatchetRecord(stryMutAct_9fa48("11231") ? {} : (stryCov_9fa48("11231"), {
              planRestore: event.planRestore,
              recordPresent: event.recordPresent
            })) ? stryMutAct_9fa48("11232") ? "" : (stryCov_9fa48("11232"), "commit") : stryMutAct_9fa48("11233") ? "" : (stryCov_9fa48("11233"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11234") ? {} : (stryCov_9fa48("11234"), {
      state,
      intents: stryMutAct_9fa48("11235") ? ["Stryker was here"] : (stryCov_9fa48("11235"), []),
      actions: stryMutAct_9fa48("11236") ? ["Stryker was here"] : (stryCov_9fa48("11236"), [])
    });
  }
}
export function shouldCommitRestoredIdentityRatchetNow(actions: ReadonlyArray<CommitRestoredIdentityRatchetAction>): boolean {
  if (stryMutAct_9fa48("11237")) {
    {}
  } else {
    stryCov_9fa48("11237");
    return stryMutAct_9fa48("11238") ? actions.every(action => action.kind === "commit") : (stryCov_9fa48("11238"), actions.some(stryMutAct_9fa48("11239") ? () => undefined : (stryCov_9fa48("11239"), action => stryMutAct_9fa48("11242") ? action.kind !== "commit" : stryMutAct_9fa48("11241") ? false : stryMutAct_9fa48("11240") ? true : (stryCov_9fa48("11240", "11241", "11242"), action.kind === (stryMutAct_9fa48("11243") ? "" : (stryCov_9fa48("11243"), "commit"))))));
  }
}
export function shouldSkipCommitRestoredIdentityRatchet(actions: ReadonlyArray<CommitRestoredIdentityRatchetAction>): boolean {
  if (stryMutAct_9fa48("11244")) {
    {}
  } else {
    stryCov_9fa48("11244");
    return stryMutAct_9fa48("11245") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("11245"), actions.some(stryMutAct_9fa48("11246") ? () => undefined : (stryCov_9fa48("11246"), action => stryMutAct_9fa48("11249") ? action.kind !== "skip" : stryMutAct_9fa48("11248") ? false : stryMutAct_9fa48("11247") ? true : (stryCov_9fa48("11247", "11248", "11249"), action.kind === (stryMutAct_9fa48("11250") ? "" : (stryCov_9fa48("11250"), "skip"))))));
  }
}