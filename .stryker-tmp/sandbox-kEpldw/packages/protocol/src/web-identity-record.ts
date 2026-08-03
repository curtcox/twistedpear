/**
 * Pure web-identity storage framing: salt || iv || ciphertext.
 * PBKDF2 / AES-GCM stay at the WebCrypto adapter edge.
 * Pack / split conclusions leave via machine actions (no ad-hoc
 * `packWebIdentityRecord` / `splitWebIdentityRecord` reads beside the step).
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
export const WEB_IDENTITY_SALT_BYTES = 16;
export const WEB_IDENTITY_IV_BYTES = 12;
/** Minimum AES-GCM auth tag length. */
export const WEB_IDENTITY_MIN_CIPHERTEXT_BYTES = 16;
export interface WebIdentityPackedFields {
  readonly salt: Uint8Array;
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
}
export function packWebIdentityRecord(salt: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("34813")) {
    {}
  } else {
    stryCov_9fa48("34813");
    if (stryMutAct_9fa48("34816") ? salt.length === WEB_IDENTITY_SALT_BYTES : stryMutAct_9fa48("34815") ? false : stryMutAct_9fa48("34814") ? true : (stryCov_9fa48("34814", "34815", "34816"), salt.length !== WEB_IDENTITY_SALT_BYTES)) {
      if (stryMutAct_9fa48("34817")) {
        {}
      } else {
        stryCov_9fa48("34817");
        throw new Error(stryMutAct_9fa48("34818") ? `` : (stryCov_9fa48("34818"), `web identity salt must be ${WEB_IDENTITY_SALT_BYTES} bytes`));
      }
    }
    if (stryMutAct_9fa48("34821") ? iv.length === WEB_IDENTITY_IV_BYTES : stryMutAct_9fa48("34820") ? false : stryMutAct_9fa48("34819") ? true : (stryCov_9fa48("34819", "34820", "34821"), iv.length !== WEB_IDENTITY_IV_BYTES)) {
      if (stryMutAct_9fa48("34822")) {
        {}
      } else {
        stryCov_9fa48("34822");
        throw new Error(stryMutAct_9fa48("34823") ? `` : (stryCov_9fa48("34823"), `web identity iv must be ${WEB_IDENTITY_IV_BYTES} bytes`));
      }
    }
    const packed = new Uint8Array(stryMutAct_9fa48("34824") ? WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES - ciphertext.length : (stryCov_9fa48("34824"), (stryMutAct_9fa48("34825") ? WEB_IDENTITY_SALT_BYTES - WEB_IDENTITY_IV_BYTES : (stryCov_9fa48("34825"), WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES)) + ciphertext.length));
    packed.set(salt, 0);
    packed.set(iv, WEB_IDENTITY_SALT_BYTES);
    packed.set(ciphertext, stryMutAct_9fa48("34826") ? WEB_IDENTITY_SALT_BYTES - WEB_IDENTITY_IV_BYTES : (stryCov_9fa48("34826"), WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES));
    return packed;
  }
}
export function splitWebIdentityRecord(packed: Uint8Array): WebIdentityPackedFields {
  if (stryMutAct_9fa48("34827")) {
    {}
  } else {
    stryCov_9fa48("34827");
    if (stryMutAct_9fa48("34831") ? packed.length >= WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES + WEB_IDENTITY_MIN_CIPHERTEXT_BYTES : stryMutAct_9fa48("34830") ? packed.length <= WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES + WEB_IDENTITY_MIN_CIPHERTEXT_BYTES : stryMutAct_9fa48("34829") ? false : stryMutAct_9fa48("34828") ? true : (stryCov_9fa48("34828", "34829", "34830", "34831"), packed.length < (stryMutAct_9fa48("34832") ? WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES - WEB_IDENTITY_MIN_CIPHERTEXT_BYTES : (stryCov_9fa48("34832"), (stryMutAct_9fa48("34833") ? WEB_IDENTITY_SALT_BYTES - WEB_IDENTITY_IV_BYTES : (stryCov_9fa48("34833"), WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES)) + WEB_IDENTITY_MIN_CIPHERTEXT_BYTES)))) {
      if (stryMutAct_9fa48("34834")) {
        {}
      } else {
        stryCov_9fa48("34834");
        throw new Error(stryMutAct_9fa48("34835") ? "" : (stryCov_9fa48("34835"), "Stored web identity record is truncated"));
      }
    }
    return stryMutAct_9fa48("34836") ? {} : (stryCov_9fa48("34836"), {
      salt: packed.subarray(0, WEB_IDENTITY_SALT_BYTES),
      iv: packed.subarray(WEB_IDENTITY_SALT_BYTES, stryMutAct_9fa48("34837") ? WEB_IDENTITY_SALT_BYTES - WEB_IDENTITY_IV_BYTES : (stryCov_9fa48("34837"), WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES)),
      ciphertext: packed.subarray(stryMutAct_9fa48("34838") ? WEB_IDENTITY_SALT_BYTES - WEB_IDENTITY_IV_BYTES : (stryCov_9fa48("34838"), WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES))
    });
  }
}

/**
 * Web-identity pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packWebIdentityRecord`
 * reads beside the step). Invalid salt/iv sizes become `reject`.
 */
export type PackWebIdentityRecordState = Record<string, never>;
export type PackWebIdentityRecordEvent = Event | {
  readonly kind: "web-identity/pack-gate";
  readonly salt: Uint8Array;
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
};
export type PackWebIdentityRecordAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface PackWebIdentityRecordStepResult {
  readonly state: PackWebIdentityRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackWebIdentityRecordAction[];
}
export function initialPackWebIdentityRecordState(): PackWebIdentityRecordState {
  if (stryMutAct_9fa48("34839")) {
    {}
  } else {
    stryCov_9fa48("34839");
    return {};
  }
}
export function stepPackWebIdentityRecordWithActions(state: PackWebIdentityRecordState, event: PackWebIdentityRecordEvent): PackWebIdentityRecordStepResult {
  if (stryMutAct_9fa48("34840")) {
    {}
  } else {
    stryCov_9fa48("34840");
    if (stryMutAct_9fa48("34843") ? event.kind !== "web-identity/pack-gate" : stryMutAct_9fa48("34842") ? false : stryMutAct_9fa48("34841") ? true : (stryCov_9fa48("34841", "34842", "34843"), event.kind === (stryMutAct_9fa48("34844") ? "" : (stryCov_9fa48("34844"), "web-identity/pack-gate")))) {
      if (stryMutAct_9fa48("34845")) {
        {}
      } else {
        stryCov_9fa48("34845");
        try {
          if (stryMutAct_9fa48("34846")) {
            {}
          } else {
            stryCov_9fa48("34846");
            return stryMutAct_9fa48("34847") ? {} : (stryCov_9fa48("34847"), {
              state,
              intents: stryMutAct_9fa48("34848") ? ["Stryker was here"] : (stryCov_9fa48("34848"), []),
              actions: stryMutAct_9fa48("34849") ? [] : (stryCov_9fa48("34849"), [stryMutAct_9fa48("34850") ? {} : (stryCov_9fa48("34850"), {
                kind: stryMutAct_9fa48("34851") ? "" : (stryCov_9fa48("34851"), "use-raw"),
                raw: packWebIdentityRecord(event.salt, event.iv, event.ciphertext)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("34852")) {
            {}
          } else {
            stryCov_9fa48("34852");
            return stryMutAct_9fa48("34853") ? {} : (stryCov_9fa48("34853"), {
              state,
              intents: stryMutAct_9fa48("34854") ? ["Stryker was here"] : (stryCov_9fa48("34854"), []),
              actions: stryMutAct_9fa48("34855") ? [] : (stryCov_9fa48("34855"), [stryMutAct_9fa48("34856") ? {} : (stryCov_9fa48("34856"), {
                kind: stryMutAct_9fa48("34857") ? "" : (stryCov_9fa48("34857"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("34858") ? {} : (stryCov_9fa48("34858"), {
      state,
      intents: stryMutAct_9fa48("34859") ? ["Stryker was here"] : (stryCov_9fa48("34859"), []),
      actions: stryMutAct_9fa48("34860") ? ["Stryker was here"] : (stryCov_9fa48("34860"), [])
    });
  }
}
export function shouldUsePackWebIdentityRecord(actions: ReadonlyArray<PackWebIdentityRecordAction>): boolean {
  if (stryMutAct_9fa48("34861")) {
    {}
  } else {
    stryCov_9fa48("34861");
    return stryMutAct_9fa48("34862") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("34862"), actions.some(stryMutAct_9fa48("34863") ? () => undefined : (stryCov_9fa48("34863"), action => stryMutAct_9fa48("34866") ? action.kind !== "use-raw" : stryMutAct_9fa48("34865") ? false : stryMutAct_9fa48("34864") ? true : (stryCov_9fa48("34864", "34865", "34866"), action.kind === (stryMutAct_9fa48("34867") ? "" : (stryCov_9fa48("34867"), "use-raw"))))));
  }
}
export function shouldRejectPackWebIdentityRecord(actions: ReadonlyArray<PackWebIdentityRecordAction>): boolean {
  if (stryMutAct_9fa48("34868")) {
    {}
  } else {
    stryCov_9fa48("34868");
    return stryMutAct_9fa48("34869") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("34869"), actions.some(stryMutAct_9fa48("34870") ? () => undefined : (stryCov_9fa48("34870"), action => stryMutAct_9fa48("34873") ? action.kind !== "reject" : stryMutAct_9fa48("34872") ? false : stryMutAct_9fa48("34871") ? true : (stryCov_9fa48("34871", "34872", "34873"), action.kind === (stryMutAct_9fa48("34874") ? "" : (stryCov_9fa48("34874"), "reject"))))));
  }
}

/** Extract packed web-identity record from step actions; null when no `use-raw`. */
export function packWebIdentityRecordRawFromActions(actions: ReadonlyArray<PackWebIdentityRecordAction>): Uint8Array | null {
  if (stryMutAct_9fa48("34875")) {
    {}
  } else {
    stryCov_9fa48("34875");
    const action = actions.find(stryMutAct_9fa48("34876") ? () => undefined : (stryCov_9fa48("34876"), entry => stryMutAct_9fa48("34879") ? entry.kind !== "use-raw" : stryMutAct_9fa48("34878") ? false : stryMutAct_9fa48("34877") ? true : (stryCov_9fa48("34877", "34878", "34879"), entry.kind === (stryMutAct_9fa48("34880") ? "" : (stryCov_9fa48("34880"), "use-raw")))));
    return (stryMutAct_9fa48("34883") ? action?.kind !== "use-raw" : stryMutAct_9fa48("34882") ? false : stryMutAct_9fa48("34881") ? true : (stryCov_9fa48("34881", "34882", "34883"), (stryMutAct_9fa48("34884") ? action.kind : (stryCov_9fa48("34884"), action?.kind)) === (stryMutAct_9fa48("34885") ? "" : (stryCov_9fa48("34885"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Web-identity split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitWebIdentityRecord`
 * reads beside the step). Truncated records become `reject`.
 */
export type SplitWebIdentityRecordState = Record<string, never>;
export type SplitWebIdentityRecordEvent = Event | {
  readonly kind: "web-identity/split-gate";
  readonly packed: Uint8Array;
};
export type SplitWebIdentityRecordAction = {
  readonly kind: "use-fields";
  readonly fields: WebIdentityPackedFields;
} | {
  readonly kind: "reject";
};
export interface SplitWebIdentityRecordStepResult {
  readonly state: SplitWebIdentityRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitWebIdentityRecordAction[];
}
export function initialSplitWebIdentityRecordState(): SplitWebIdentityRecordState {
  if (stryMutAct_9fa48("34886")) {
    {}
  } else {
    stryCov_9fa48("34886");
    return {};
  }
}
export function stepSplitWebIdentityRecordWithActions(state: SplitWebIdentityRecordState, event: SplitWebIdentityRecordEvent): SplitWebIdentityRecordStepResult {
  if (stryMutAct_9fa48("34887")) {
    {}
  } else {
    stryCov_9fa48("34887");
    if (stryMutAct_9fa48("34890") ? event.kind !== "web-identity/split-gate" : stryMutAct_9fa48("34889") ? false : stryMutAct_9fa48("34888") ? true : (stryCov_9fa48("34888", "34889", "34890"), event.kind === (stryMutAct_9fa48("34891") ? "" : (stryCov_9fa48("34891"), "web-identity/split-gate")))) {
      if (stryMutAct_9fa48("34892")) {
        {}
      } else {
        stryCov_9fa48("34892");
        try {
          if (stryMutAct_9fa48("34893")) {
            {}
          } else {
            stryCov_9fa48("34893");
            return stryMutAct_9fa48("34894") ? {} : (stryCov_9fa48("34894"), {
              state,
              intents: stryMutAct_9fa48("34895") ? ["Stryker was here"] : (stryCov_9fa48("34895"), []),
              actions: stryMutAct_9fa48("34896") ? [] : (stryCov_9fa48("34896"), [stryMutAct_9fa48("34897") ? {} : (stryCov_9fa48("34897"), {
                kind: stryMutAct_9fa48("34898") ? "" : (stryCov_9fa48("34898"), "use-fields"),
                fields: splitWebIdentityRecord(event.packed)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("34899")) {
            {}
          } else {
            stryCov_9fa48("34899");
            return stryMutAct_9fa48("34900") ? {} : (stryCov_9fa48("34900"), {
              state,
              intents: stryMutAct_9fa48("34901") ? ["Stryker was here"] : (stryCov_9fa48("34901"), []),
              actions: stryMutAct_9fa48("34902") ? [] : (stryCov_9fa48("34902"), [stryMutAct_9fa48("34903") ? {} : (stryCov_9fa48("34903"), {
                kind: stryMutAct_9fa48("34904") ? "" : (stryCov_9fa48("34904"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("34905") ? {} : (stryCov_9fa48("34905"), {
      state,
      intents: stryMutAct_9fa48("34906") ? ["Stryker was here"] : (stryCov_9fa48("34906"), []),
      actions: stryMutAct_9fa48("34907") ? ["Stryker was here"] : (stryCov_9fa48("34907"), [])
    });
  }
}
export function shouldUseSplitWebIdentityRecord(actions: ReadonlyArray<SplitWebIdentityRecordAction>): boolean {
  if (stryMutAct_9fa48("34908")) {
    {}
  } else {
    stryCov_9fa48("34908");
    return stryMutAct_9fa48("34909") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("34909"), actions.some(stryMutAct_9fa48("34910") ? () => undefined : (stryCov_9fa48("34910"), action => stryMutAct_9fa48("34913") ? action.kind !== "use-fields" : stryMutAct_9fa48("34912") ? false : stryMutAct_9fa48("34911") ? true : (stryCov_9fa48("34911", "34912", "34913"), action.kind === (stryMutAct_9fa48("34914") ? "" : (stryCov_9fa48("34914"), "use-fields"))))));
  }
}
export function shouldRejectSplitWebIdentityRecord(actions: ReadonlyArray<SplitWebIdentityRecordAction>): boolean {
  if (stryMutAct_9fa48("34915")) {
    {}
  } else {
    stryCov_9fa48("34915");
    return stryMutAct_9fa48("34916") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("34916"), actions.some(stryMutAct_9fa48("34917") ? () => undefined : (stryCov_9fa48("34917"), action => stryMutAct_9fa48("34920") ? action.kind !== "reject" : stryMutAct_9fa48("34919") ? false : stryMutAct_9fa48("34918") ? true : (stryCov_9fa48("34918", "34919", "34920"), action.kind === (stryMutAct_9fa48("34921") ? "" : (stryCov_9fa48("34921"), "reject"))))));
  }
}

/** Extract split web-identity fields from step actions; null when no `use-fields`. */
export function webIdentityRecordFieldsFromActions(actions: ReadonlyArray<SplitWebIdentityRecordAction>): WebIdentityPackedFields | null {
  if (stryMutAct_9fa48("34922")) {
    {}
  } else {
    stryCov_9fa48("34922");
    const action = actions.find(stryMutAct_9fa48("34923") ? () => undefined : (stryCov_9fa48("34923"), entry => stryMutAct_9fa48("34926") ? entry.kind !== "use-fields" : stryMutAct_9fa48("34925") ? false : stryMutAct_9fa48("34924") ? true : (stryCov_9fa48("34924", "34925", "34926"), entry.kind === (stryMutAct_9fa48("34927") ? "" : (stryCov_9fa48("34927"), "use-fields")))));
    return (stryMutAct_9fa48("34930") ? action?.kind !== "use-fields" : stryMutAct_9fa48("34929") ? false : stryMutAct_9fa48("34928") ? true : (stryCov_9fa48("34928", "34929", "34930"), (stryMutAct_9fa48("34931") ? action.kind : (stryCov_9fa48("34931"), action?.kind)) === (stryMutAct_9fa48("34932") ? "" : (stryCov_9fa48("34932"), "use-fields")))) ? action.fields : null;
  }
}