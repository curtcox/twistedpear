/**
 * Pure PKCS#7 padding (RNS Token / AES-CBC).
 * Pad / unpad conclusions leave via machine actions (no ad-hoc
 * `pkcs7Pad` / `pkcs7Unpad` reads beside the step).
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
export const PKCS7_BLOCK_SIZE = 16;
export function pkcs7Pad(data: Uint8Array, blockSize: number = PKCS7_BLOCK_SIZE): Uint8Array {
  if (stryMutAct_9fa48("27416")) {
    {}
  } else {
    stryCov_9fa48("27416");
    const remainder = stryMutAct_9fa48("27417") ? data.length * blockSize : (stryCov_9fa48("27417"), data.length % blockSize);
    const paddingLength = stryMutAct_9fa48("27418") ? blockSize + remainder : (stryCov_9fa48("27418"), blockSize - remainder);
    const padded = new Uint8Array(stryMutAct_9fa48("27419") ? data.length - paddingLength : (stryCov_9fa48("27419"), data.length + paddingLength));
    padded.set(data);
    padded.fill(paddingLength, data.length);
    return padded;
  }
}
export function pkcs7Unpad(data: Uint8Array, blockSize: number = PKCS7_BLOCK_SIZE): Uint8Array {
  if (stryMutAct_9fa48("27420")) {
    {}
  } else {
    stryCov_9fa48("27420");
    if (stryMutAct_9fa48("27423") ? data.length !== 0 : stryMutAct_9fa48("27422") ? false : stryMutAct_9fa48("27421") ? true : (stryCov_9fa48("27421", "27422", "27423"), data.length === 0)) {
      if (stryMutAct_9fa48("27424")) {
        {}
      } else {
        stryCov_9fa48("27424");
        throw new Error(stryMutAct_9fa48("27425") ? "" : (stryCov_9fa48("27425"), "Cannot unpad empty data"));
      }
    }
    const paddingLength = data[stryMutAct_9fa48("27426") ? data.length + 1 : (stryCov_9fa48("27426"), data.length - 1)]!;
    if (stryMutAct_9fa48("27429") ? paddingLength > blockSize && paddingLength === 0 : stryMutAct_9fa48("27428") ? false : stryMutAct_9fa48("27427") ? true : (stryCov_9fa48("27427", "27428", "27429"), (stryMutAct_9fa48("27432") ? paddingLength <= blockSize : stryMutAct_9fa48("27431") ? paddingLength >= blockSize : stryMutAct_9fa48("27430") ? false : (stryCov_9fa48("27430", "27431", "27432"), paddingLength > blockSize)) || (stryMutAct_9fa48("27434") ? paddingLength !== 0 : stryMutAct_9fa48("27433") ? false : (stryCov_9fa48("27433", "27434"), paddingLength === 0)))) {
      if (stryMutAct_9fa48("27435")) {
        {}
      } else {
        stryCov_9fa48("27435");
        throw new Error(stryMutAct_9fa48("27436") ? `` : (stryCov_9fa48("27436"), `Cannot unpad, invalid padding length of ${paddingLength} bytes`));
      }
    }
    return data.subarray(0, stryMutAct_9fa48("27437") ? data.length + paddingLength : (stryCov_9fa48("27437"), data.length - paddingLength));
  }
}

/**
 * PKCS#7 pad framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `pkcs7Pad` reads
 * beside the step).
 */
export type PackPkcs7State = Record<string, never>;
export type PackPkcs7Event = Event | {
  readonly kind: "pkcs7/pad-gate";
  readonly data: Uint8Array;
  readonly blockSize?: number;
};
export type PackPkcs7Action = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackPkcs7StepResult {
  readonly state: PackPkcs7State;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackPkcs7Action[];
}
export function initialPackPkcs7State(): PackPkcs7State {
  if (stryMutAct_9fa48("27438")) {
    {}
  } else {
    stryCov_9fa48("27438");
    return {};
  }
}
export function stepPkcs7PadWithActions(state: PackPkcs7State, event: PackPkcs7Event): PackPkcs7StepResult {
  if (stryMutAct_9fa48("27439")) {
    {}
  } else {
    stryCov_9fa48("27439");
    if (stryMutAct_9fa48("27442") ? event.kind !== "pkcs7/pad-gate" : stryMutAct_9fa48("27441") ? false : stryMutAct_9fa48("27440") ? true : (stryCov_9fa48("27440", "27441", "27442"), event.kind === (stryMutAct_9fa48("27443") ? "" : (stryCov_9fa48("27443"), "pkcs7/pad-gate")))) {
      if (stryMutAct_9fa48("27444")) {
        {}
      } else {
        stryCov_9fa48("27444");
        return stryMutAct_9fa48("27445") ? {} : (stryCov_9fa48("27445"), {
          state,
          intents: stryMutAct_9fa48("27446") ? ["Stryker was here"] : (stryCov_9fa48("27446"), []),
          actions: stryMutAct_9fa48("27447") ? [] : (stryCov_9fa48("27447"), [stryMutAct_9fa48("27448") ? {} : (stryCov_9fa48("27448"), {
            kind: stryMutAct_9fa48("27449") ? "" : (stryCov_9fa48("27449"), "use-raw"),
            raw: pkcs7Pad(event.data, stryMutAct_9fa48("27450") ? event.blockSize && PKCS7_BLOCK_SIZE : (stryCov_9fa48("27450"), event.blockSize ?? PKCS7_BLOCK_SIZE))
          })])
        });
      }
    }
    return stryMutAct_9fa48("27451") ? {} : (stryCov_9fa48("27451"), {
      state,
      intents: stryMutAct_9fa48("27452") ? ["Stryker was here"] : (stryCov_9fa48("27452"), []),
      actions: stryMutAct_9fa48("27453") ? ["Stryker was here"] : (stryCov_9fa48("27453"), [])
    });
  }
}
export function shouldUsePkcs7Pad(actions: ReadonlyArray<PackPkcs7Action>): boolean {
  if (stryMutAct_9fa48("27454")) {
    {}
  } else {
    stryCov_9fa48("27454");
    return stryMutAct_9fa48("27455") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("27455"), actions.some(stryMutAct_9fa48("27456") ? () => undefined : (stryCov_9fa48("27456"), action => stryMutAct_9fa48("27459") ? action.kind !== "use-raw" : stryMutAct_9fa48("27458") ? false : stryMutAct_9fa48("27457") ? true : (stryCov_9fa48("27457", "27458", "27459"), action.kind === (stryMutAct_9fa48("27460") ? "" : (stryCov_9fa48("27460"), "use-raw"))))));
  }
}

/** Extract padded bytes from step actions; null when no `use-raw`. */
export function pkcs7PadRawFromActions(actions: ReadonlyArray<PackPkcs7Action>): Uint8Array | null {
  if (stryMutAct_9fa48("27461")) {
    {}
  } else {
    stryCov_9fa48("27461");
    const action = actions.find(stryMutAct_9fa48("27462") ? () => undefined : (stryCov_9fa48("27462"), entry => stryMutAct_9fa48("27465") ? entry.kind !== "use-raw" : stryMutAct_9fa48("27464") ? false : stryMutAct_9fa48("27463") ? true : (stryCov_9fa48("27463", "27464", "27465"), entry.kind === (stryMutAct_9fa48("27466") ? "" : (stryCov_9fa48("27466"), "use-raw")))));
    return (stryMutAct_9fa48("27469") ? action?.kind !== "use-raw" : stryMutAct_9fa48("27468") ? false : stryMutAct_9fa48("27467") ? true : (stryCov_9fa48("27467", "27468", "27469"), (stryMutAct_9fa48("27470") ? action.kind : (stryCov_9fa48("27470"), action?.kind)) === (stryMutAct_9fa48("27471") ? "" : (stryCov_9fa48("27471"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * PKCS#7 unpad framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `pkcs7Unpad` reads
 * beside the step). Empty / invalid padding become `reject`.
 */
export type UnpackPkcs7State = Record<string, never>;
export type UnpackPkcs7Event = Event | {
  readonly kind: "pkcs7/unpad-gate";
  readonly data: Uint8Array;
  readonly blockSize?: number;
};
export type UnpackPkcs7Action = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface UnpackPkcs7StepResult {
  readonly state: UnpackPkcs7State;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackPkcs7Action[];
}
export function initialUnpackPkcs7State(): UnpackPkcs7State {
  if (stryMutAct_9fa48("27472")) {
    {}
  } else {
    stryCov_9fa48("27472");
    return {};
  }
}
export function stepPkcs7UnpadWithActions(state: UnpackPkcs7State, event: UnpackPkcs7Event): UnpackPkcs7StepResult {
  if (stryMutAct_9fa48("27473")) {
    {}
  } else {
    stryCov_9fa48("27473");
    if (stryMutAct_9fa48("27476") ? event.kind !== "pkcs7/unpad-gate" : stryMutAct_9fa48("27475") ? false : stryMutAct_9fa48("27474") ? true : (stryCov_9fa48("27474", "27475", "27476"), event.kind === (stryMutAct_9fa48("27477") ? "" : (stryCov_9fa48("27477"), "pkcs7/unpad-gate")))) {
      if (stryMutAct_9fa48("27478")) {
        {}
      } else {
        stryCov_9fa48("27478");
        try {
          if (stryMutAct_9fa48("27479")) {
            {}
          } else {
            stryCov_9fa48("27479");
            return stryMutAct_9fa48("27480") ? {} : (stryCov_9fa48("27480"), {
              state,
              intents: stryMutAct_9fa48("27481") ? ["Stryker was here"] : (stryCov_9fa48("27481"), []),
              actions: stryMutAct_9fa48("27482") ? [] : (stryCov_9fa48("27482"), [stryMutAct_9fa48("27483") ? {} : (stryCov_9fa48("27483"), {
                kind: stryMutAct_9fa48("27484") ? "" : (stryCov_9fa48("27484"), "use-raw"),
                raw: pkcs7Unpad(event.data, stryMutAct_9fa48("27485") ? event.blockSize && PKCS7_BLOCK_SIZE : (stryCov_9fa48("27485"), event.blockSize ?? PKCS7_BLOCK_SIZE))
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("27486")) {
            {}
          } else {
            stryCov_9fa48("27486");
            return stryMutAct_9fa48("27487") ? {} : (stryCov_9fa48("27487"), {
              state,
              intents: stryMutAct_9fa48("27488") ? ["Stryker was here"] : (stryCov_9fa48("27488"), []),
              actions: stryMutAct_9fa48("27489") ? [] : (stryCov_9fa48("27489"), [stryMutAct_9fa48("27490") ? {} : (stryCov_9fa48("27490"), {
                kind: stryMutAct_9fa48("27491") ? "" : (stryCov_9fa48("27491"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("27492") ? {} : (stryCov_9fa48("27492"), {
      state,
      intents: stryMutAct_9fa48("27493") ? ["Stryker was here"] : (stryCov_9fa48("27493"), []),
      actions: stryMutAct_9fa48("27494") ? ["Stryker was here"] : (stryCov_9fa48("27494"), [])
    });
  }
}
export function shouldUsePkcs7Unpad(actions: ReadonlyArray<UnpackPkcs7Action>): boolean {
  if (stryMutAct_9fa48("27495")) {
    {}
  } else {
    stryCov_9fa48("27495");
    return stryMutAct_9fa48("27496") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("27496"), actions.some(stryMutAct_9fa48("27497") ? () => undefined : (stryCov_9fa48("27497"), action => stryMutAct_9fa48("27500") ? action.kind !== "use-raw" : stryMutAct_9fa48("27499") ? false : stryMutAct_9fa48("27498") ? true : (stryCov_9fa48("27498", "27499", "27500"), action.kind === (stryMutAct_9fa48("27501") ? "" : (stryCov_9fa48("27501"), "use-raw"))))));
  }
}
export function shouldRejectPkcs7Unpad(actions: ReadonlyArray<UnpackPkcs7Action>): boolean {
  if (stryMutAct_9fa48("27502")) {
    {}
  } else {
    stryCov_9fa48("27502");
    return stryMutAct_9fa48("27503") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("27503"), actions.some(stryMutAct_9fa48("27504") ? () => undefined : (stryCov_9fa48("27504"), action => stryMutAct_9fa48("27507") ? action.kind !== "reject" : stryMutAct_9fa48("27506") ? false : stryMutAct_9fa48("27505") ? true : (stryCov_9fa48("27505", "27506", "27507"), action.kind === (stryMutAct_9fa48("27508") ? "" : (stryCov_9fa48("27508"), "reject"))))));
  }
}

/** Extract unpadded bytes from step actions; null when no `use-raw`. */
export function pkcs7UnpadRawFromActions(actions: ReadonlyArray<UnpackPkcs7Action>): Uint8Array | null {
  if (stryMutAct_9fa48("27509")) {
    {}
  } else {
    stryCov_9fa48("27509");
    const action = actions.find(stryMutAct_9fa48("27510") ? () => undefined : (stryCov_9fa48("27510"), entry => stryMutAct_9fa48("27513") ? entry.kind !== "use-raw" : stryMutAct_9fa48("27512") ? false : stryMutAct_9fa48("27511") ? true : (stryCov_9fa48("27511", "27512", "27513"), entry.kind === (stryMutAct_9fa48("27514") ? "" : (stryCov_9fa48("27514"), "use-raw")))));
    return (stryMutAct_9fa48("27517") ? action?.kind !== "use-raw" : stryMutAct_9fa48("27516") ? false : stryMutAct_9fa48("27515") ? true : (stryCov_9fa48("27515", "27516", "27517"), (stryMutAct_9fa48("27518") ? action.kind : (stryCov_9fa48("27518"), action?.kind)) === (stryMutAct_9fa48("27519") ? "" : (stryCov_9fa48("27519"), "use-raw")))) ? action.raw : null;
  }
}