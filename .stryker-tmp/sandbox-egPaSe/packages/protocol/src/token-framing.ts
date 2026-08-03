/**
 * Pure RNS Token key split and frame layout (iv || ciphertext || hmac).
 * AES / HMAC stay at the crypto adapter edge.
 * Key-split / pack / split / signed-material / hmac-match conclusions leave via
 * machine actions (no ad-hoc `splitTokenKey` / `packTokenFrame` /
 * `splitTokenFrame` / `tokenSignedMaterial` / `tokenHmacMatches` reads beside
 * the step).
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
export const TOKEN_IV_SIZE = 16;
export const TOKEN_HMAC_SIZE = 32;
export const TOKEN_OVERHEAD = stryMutAct_9fa48("32748") ? TOKEN_IV_SIZE - TOKEN_HMAC_SIZE : (stryCov_9fa48("32748"), TOKEN_IV_SIZE + TOKEN_HMAC_SIZE); // 48

export type TokenMode = "aes128" | "aes256";
export interface TokenKeyParts {
  readonly mode: TokenMode;
  readonly signingKey: Uint8Array;
  readonly encryptionKey: Uint8Array;
}
export interface TokenFrameParts {
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly hmac: Uint8Array;
  readonly signedMaterial: Uint8Array;
}
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("32749")) {
    {}
  } else {
    stryCov_9fa48("32749");
    const length = parts.reduce(stryMutAct_9fa48("32750") ? () => undefined : (stryCov_9fa48("32750"), (total, part) => stryMutAct_9fa48("32751") ? total - part.length : (stryCov_9fa48("32751"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("32752")) {
        {}
      } else {
        stryCov_9fa48("32752");
        output.set(part, offset);
        stryMutAct_9fa48("32753") ? offset -= part.length : (stryCov_9fa48("32753"), offset += part.length);
      }
    }
    return output;
  }
}
export function splitTokenKey(key: Uint8Array): TokenKeyParts {
  if (stryMutAct_9fa48("32754")) {
    {}
  } else {
    stryCov_9fa48("32754");
    if (stryMutAct_9fa48("32757") ? key.length !== 32 : stryMutAct_9fa48("32756") ? false : stryMutAct_9fa48("32755") ? true : (stryCov_9fa48("32755", "32756", "32757"), key.length === 32)) {
      if (stryMutAct_9fa48("32758")) {
        {}
      } else {
        stryCov_9fa48("32758");
        return stryMutAct_9fa48("32759") ? {} : (stryCov_9fa48("32759"), {
          mode: stryMutAct_9fa48("32760") ? "" : (stryCov_9fa48("32760"), "aes128"),
          signingKey: key.subarray(0, 16),
          encryptionKey: key.subarray(16, 32)
        });
      }
    }
    if (stryMutAct_9fa48("32763") ? key.length !== 64 : stryMutAct_9fa48("32762") ? false : stryMutAct_9fa48("32761") ? true : (stryCov_9fa48("32761", "32762", "32763"), key.length === 64)) {
      if (stryMutAct_9fa48("32764")) {
        {}
      } else {
        stryCov_9fa48("32764");
        return stryMutAct_9fa48("32765") ? {} : (stryCov_9fa48("32765"), {
          mode: stryMutAct_9fa48("32766") ? "" : (stryCov_9fa48("32766"), "aes256"),
          signingKey: key.subarray(0, 32),
          encryptionKey: key.subarray(32, 64)
        });
      }
    }
    throw new Error(stryMutAct_9fa48("32767") ? `` : (stryCov_9fa48("32767"), `Token key must be 32 or 64 bytes, not ${key.length}`));
  }
}
export function packTokenFrame(input: {
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly hmac: Uint8Array;
}): Uint8Array {
  if (stryMutAct_9fa48("32768")) {
    {}
  } else {
    stryCov_9fa48("32768");
    if (stryMutAct_9fa48("32771") ? input.iv.length === TOKEN_IV_SIZE : stryMutAct_9fa48("32770") ? false : stryMutAct_9fa48("32769") ? true : (stryCov_9fa48("32769", "32770", "32771"), input.iv.length !== TOKEN_IV_SIZE)) {
      if (stryMutAct_9fa48("32772")) {
        {}
      } else {
        stryCov_9fa48("32772");
        throw new Error(stryMutAct_9fa48("32773") ? `` : (stryCov_9fa48("32773"), `Token IV must be ${TOKEN_IV_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("32776") ? input.hmac.length === TOKEN_HMAC_SIZE : stryMutAct_9fa48("32775") ? false : stryMutAct_9fa48("32774") ? true : (stryCov_9fa48("32774", "32775", "32776"), input.hmac.length !== TOKEN_HMAC_SIZE)) {
      if (stryMutAct_9fa48("32777")) {
        {}
      } else {
        stryCov_9fa48("32777");
        throw new Error(stryMutAct_9fa48("32778") ? `` : (stryCov_9fa48("32778"), `Token HMAC must be ${TOKEN_HMAC_SIZE} bytes`));
      }
    }
    return concatBytes(input.iv, input.ciphertext, input.hmac);
  }
}
export function tokenSignedMaterial(iv: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("32779")) {
    {}
  } else {
    stryCov_9fa48("32779");
    if (stryMutAct_9fa48("32782") ? iv.length === TOKEN_IV_SIZE : stryMutAct_9fa48("32781") ? false : stryMutAct_9fa48("32780") ? true : (stryCov_9fa48("32780", "32781", "32782"), iv.length !== TOKEN_IV_SIZE)) {
      if (stryMutAct_9fa48("32783")) {
        {}
      } else {
        stryCov_9fa48("32783");
        throw new Error(stryMutAct_9fa48("32784") ? `` : (stryCov_9fa48("32784"), `Token IV must be ${TOKEN_IV_SIZE} bytes`));
      }
    }
    return concatBytes(iv, ciphertext);
  }
}

/**
 * Token signed-material assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `tokenSignedMaterial` reads
 * beside the step). Invalid IV sizes become `reject`.
 */
export type TokenSignedMaterialState = Record<string, never>;
export type TokenSignedMaterialEvent = Event | {
  readonly kind: "token-framing/signed-material-gate";
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
};
export type TokenSignedMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface TokenSignedMaterialStepResult {
  readonly state: TokenSignedMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TokenSignedMaterialAction[];
}
export function initialTokenSignedMaterialState(): TokenSignedMaterialState {
  if (stryMutAct_9fa48("32785")) {
    {}
  } else {
    stryCov_9fa48("32785");
    return {};
  }
}
export function stepTokenSignedMaterialWithActions(state: TokenSignedMaterialState, event: TokenSignedMaterialEvent): TokenSignedMaterialStepResult {
  if (stryMutAct_9fa48("32786")) {
    {}
  } else {
    stryCov_9fa48("32786");
    if (stryMutAct_9fa48("32789") ? event.kind !== "token-framing/signed-material-gate" : stryMutAct_9fa48("32788") ? false : stryMutAct_9fa48("32787") ? true : (stryCov_9fa48("32787", "32788", "32789"), event.kind === (stryMutAct_9fa48("32790") ? "" : (stryCov_9fa48("32790"), "token-framing/signed-material-gate")))) {
      if (stryMutAct_9fa48("32791")) {
        {}
      } else {
        stryCov_9fa48("32791");
        try {
          if (stryMutAct_9fa48("32792")) {
            {}
          } else {
            stryCov_9fa48("32792");
            return stryMutAct_9fa48("32793") ? {} : (stryCov_9fa48("32793"), {
              state,
              intents: stryMutAct_9fa48("32794") ? ["Stryker was here"] : (stryCov_9fa48("32794"), []),
              actions: stryMutAct_9fa48("32795") ? [] : (stryCov_9fa48("32795"), [stryMutAct_9fa48("32796") ? {} : (stryCov_9fa48("32796"), {
                kind: stryMutAct_9fa48("32797") ? "" : (stryCov_9fa48("32797"), "use-raw"),
                raw: tokenSignedMaterial(event.iv, event.ciphertext)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("32798")) {
            {}
          } else {
            stryCov_9fa48("32798");
            return stryMutAct_9fa48("32799") ? {} : (stryCov_9fa48("32799"), {
              state,
              intents: stryMutAct_9fa48("32800") ? ["Stryker was here"] : (stryCov_9fa48("32800"), []),
              actions: stryMutAct_9fa48("32801") ? [] : (stryCov_9fa48("32801"), [stryMutAct_9fa48("32802") ? {} : (stryCov_9fa48("32802"), {
                kind: stryMutAct_9fa48("32803") ? "" : (stryCov_9fa48("32803"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("32804") ? {} : (stryCov_9fa48("32804"), {
      state,
      intents: stryMutAct_9fa48("32805") ? ["Stryker was here"] : (stryCov_9fa48("32805"), []),
      actions: stryMutAct_9fa48("32806") ? ["Stryker was here"] : (stryCov_9fa48("32806"), [])
    });
  }
}
export function shouldUseTokenSignedMaterial(actions: ReadonlyArray<TokenSignedMaterialAction>): boolean {
  if (stryMutAct_9fa48("32807")) {
    {}
  } else {
    stryCov_9fa48("32807");
    return stryMutAct_9fa48("32808") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("32808"), actions.some(stryMutAct_9fa48("32809") ? () => undefined : (stryCov_9fa48("32809"), action => stryMutAct_9fa48("32812") ? action.kind !== "use-raw" : stryMutAct_9fa48("32811") ? false : stryMutAct_9fa48("32810") ? true : (stryCov_9fa48("32810", "32811", "32812"), action.kind === (stryMutAct_9fa48("32813") ? "" : (stryCov_9fa48("32813"), "use-raw"))))));
  }
}
export function shouldRejectTokenSignedMaterial(actions: ReadonlyArray<TokenSignedMaterialAction>): boolean {
  if (stryMutAct_9fa48("32814")) {
    {}
  } else {
    stryCov_9fa48("32814");
    return stryMutAct_9fa48("32815") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("32815"), actions.some(stryMutAct_9fa48("32816") ? () => undefined : (stryCov_9fa48("32816"), action => stryMutAct_9fa48("32819") ? action.kind !== "reject" : stryMutAct_9fa48("32818") ? false : stryMutAct_9fa48("32817") ? true : (stryCov_9fa48("32817", "32818", "32819"), action.kind === (stryMutAct_9fa48("32820") ? "" : (stryCov_9fa48("32820"), "reject"))))));
  }
}

/** Extract token signed material from step actions; null when no `use-raw`. */
export function tokenSignedMaterialRawFromActions(actions: ReadonlyArray<TokenSignedMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("32821")) {
    {}
  } else {
    stryCov_9fa48("32821");
    const action = actions.find(stryMutAct_9fa48("32822") ? () => undefined : (stryCov_9fa48("32822"), entry => stryMutAct_9fa48("32825") ? entry.kind !== "use-raw" : stryMutAct_9fa48("32824") ? false : stryMutAct_9fa48("32823") ? true : (stryCov_9fa48("32823", "32824", "32825"), entry.kind === (stryMutAct_9fa48("32826") ? "" : (stryCov_9fa48("32826"), "use-raw")))));
    return (stryMutAct_9fa48("32829") ? action?.kind !== "use-raw" : stryMutAct_9fa48("32828") ? false : stryMutAct_9fa48("32827") ? true : (stryCov_9fa48("32827", "32828", "32829"), (stryMutAct_9fa48("32830") ? action.kind : (stryCov_9fa48("32830"), action?.kind)) === (stryMutAct_9fa48("32831") ? "" : (stryCov_9fa48("32831"), "use-raw")))) ? action.raw : null;
  }
}
export function splitTokenFrame(token: Uint8Array): TokenFrameParts | null {
  if (stryMutAct_9fa48("32832")) {
    {}
  } else {
    stryCov_9fa48("32832");
    if (stryMutAct_9fa48("32836") ? token.length > TOKEN_IV_SIZE + TOKEN_HMAC_SIZE : stryMutAct_9fa48("32835") ? token.length < TOKEN_IV_SIZE + TOKEN_HMAC_SIZE : stryMutAct_9fa48("32834") ? false : stryMutAct_9fa48("32833") ? true : (stryCov_9fa48("32833", "32834", "32835", "32836"), token.length <= (stryMutAct_9fa48("32837") ? TOKEN_IV_SIZE - TOKEN_HMAC_SIZE : (stryCov_9fa48("32837"), TOKEN_IV_SIZE + TOKEN_HMAC_SIZE)))) {
      if (stryMutAct_9fa48("32838")) {
        {}
      } else {
        stryCov_9fa48("32838");
        return null;
      }
    }
    const iv = token.subarray(0, TOKEN_IV_SIZE);
    const hmac = token.subarray(stryMutAct_9fa48("32839") ? token.length + TOKEN_HMAC_SIZE : (stryCov_9fa48("32839"), token.length - TOKEN_HMAC_SIZE));
    const ciphertext = token.subarray(TOKEN_IV_SIZE, stryMutAct_9fa48("32840") ? token.length + TOKEN_HMAC_SIZE : (stryCov_9fa48("32840"), token.length - TOKEN_HMAC_SIZE));
    return stryMutAct_9fa48("32841") ? {} : (stryCov_9fa48("32841"), {
      iv,
      ciphertext,
      hmac,
      signedMaterial: token.subarray(0, stryMutAct_9fa48("32842") ? token.length + TOKEN_HMAC_SIZE : (stryCov_9fa48("32842"), token.length - TOKEN_HMAC_SIZE))
    });
  }
}

/** Constant-time HMAC compare for token verify. */
export function tokenHmacMatches(received: Uint8Array, expected: Uint8Array): boolean {
  if (stryMutAct_9fa48("32843")) {
    {}
  } else {
    stryCov_9fa48("32843");
    if (stryMutAct_9fa48("32846") ? received.length === expected.length : stryMutAct_9fa48("32845") ? false : stryMutAct_9fa48("32844") ? true : (stryCov_9fa48("32844", "32845", "32846"), received.length !== expected.length)) {
      if (stryMutAct_9fa48("32847")) {
        {}
      } else {
        stryCov_9fa48("32847");
        return stryMutAct_9fa48("32848") ? true : (stryCov_9fa48("32848"), false);
      }
    }
    let mismatch = 0;
    for (let index = 0; stryMutAct_9fa48("32851") ? index >= received.length : stryMutAct_9fa48("32850") ? index <= received.length : stryMutAct_9fa48("32849") ? false : (stryCov_9fa48("32849", "32850", "32851"), index < received.length); stryMutAct_9fa48("32852") ? index -= 1 : (stryCov_9fa48("32852"), index += 1)) {
      if (stryMutAct_9fa48("32853")) {
        {}
      } else {
        stryCov_9fa48("32853");
        stryMutAct_9fa48("32854") ? mismatch &= (received[index] ?? 0) ^ (expected[index] ?? 0) : (stryCov_9fa48("32854"), mismatch |= (stryMutAct_9fa48("32855") ? received[index] && 0 : (stryCov_9fa48("32855"), received[index] ?? 0)) ^ (stryMutAct_9fa48("32856") ? expected[index] && 0 : (stryCov_9fa48("32856"), expected[index] ?? 0)));
      }
    }
    return stryMutAct_9fa48("32859") ? mismatch !== 0 : stryMutAct_9fa48("32858") ? false : stryMutAct_9fa48("32857") ? true : (stryCov_9fa48("32857", "32858", "32859"), mismatch === 0);
  }
}

/**
 * Token HMAC match is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `tokenHmacMatches` reads
 * beside the step).
 */
export type TokenHmacMatchState = Record<string, never>;
export type TokenHmacMatchEvent = Event | {
  readonly kind: "token-framing/hmac-match-gate";
  readonly received: Uint8Array;
  readonly expected: Uint8Array;
};
export type TokenHmacMatchAction = {
  readonly kind: "match";
} | {
  readonly kind: "mismatch";
};
export interface TokenHmacMatchStepResult {
  readonly state: TokenHmacMatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TokenHmacMatchAction[];
}
export function initialTokenHmacMatchState(): TokenHmacMatchState {
  if (stryMutAct_9fa48("32860")) {
    {}
  } else {
    stryCov_9fa48("32860");
    return {};
  }
}
export function stepTokenHmacMatchWithActions(state: TokenHmacMatchState, event: TokenHmacMatchEvent): TokenHmacMatchStepResult {
  if (stryMutAct_9fa48("32861")) {
    {}
  } else {
    stryCov_9fa48("32861");
    if (stryMutAct_9fa48("32864") ? event.kind !== "token-framing/hmac-match-gate" : stryMutAct_9fa48("32863") ? false : stryMutAct_9fa48("32862") ? true : (stryCov_9fa48("32862", "32863", "32864"), event.kind === (stryMutAct_9fa48("32865") ? "" : (stryCov_9fa48("32865"), "token-framing/hmac-match-gate")))) {
      if (stryMutAct_9fa48("32866")) {
        {}
      } else {
        stryCov_9fa48("32866");
        return stryMutAct_9fa48("32867") ? {} : (stryCov_9fa48("32867"), {
          state,
          intents: stryMutAct_9fa48("32868") ? ["Stryker was here"] : (stryCov_9fa48("32868"), []),
          actions: stryMutAct_9fa48("32869") ? [] : (stryCov_9fa48("32869"), [stryMutAct_9fa48("32870") ? {} : (stryCov_9fa48("32870"), {
            kind: tokenHmacMatches(event.received, event.expected) ? stryMutAct_9fa48("32871") ? "" : (stryCov_9fa48("32871"), "match") : stryMutAct_9fa48("32872") ? "" : (stryCov_9fa48("32872"), "mismatch")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32873") ? {} : (stryCov_9fa48("32873"), {
      state,
      intents: stryMutAct_9fa48("32874") ? ["Stryker was here"] : (stryCov_9fa48("32874"), []),
      actions: stryMutAct_9fa48("32875") ? ["Stryker was here"] : (stryCov_9fa48("32875"), [])
    });
  }
}
export function shouldMatchTokenHmac(actions: ReadonlyArray<TokenHmacMatchAction>): boolean {
  if (stryMutAct_9fa48("32876")) {
    {}
  } else {
    stryCov_9fa48("32876");
    return stryMutAct_9fa48("32877") ? actions.every(action => action.kind === "match") : (stryCov_9fa48("32877"), actions.some(stryMutAct_9fa48("32878") ? () => undefined : (stryCov_9fa48("32878"), action => stryMutAct_9fa48("32881") ? action.kind !== "match" : stryMutAct_9fa48("32880") ? false : stryMutAct_9fa48("32879") ? true : (stryCov_9fa48("32879", "32880", "32881"), action.kind === (stryMutAct_9fa48("32882") ? "" : (stryCov_9fa48("32882"), "match"))))));
  }
}
export function shouldMismatchTokenHmac(actions: ReadonlyArray<TokenHmacMatchAction>): boolean {
  if (stryMutAct_9fa48("32883")) {
    {}
  } else {
    stryCov_9fa48("32883");
    return stryMutAct_9fa48("32884") ? actions.every(action => action.kind === "mismatch") : (stryCov_9fa48("32884"), actions.some(stryMutAct_9fa48("32885") ? () => undefined : (stryCov_9fa48("32885"), action => stryMutAct_9fa48("32888") ? action.kind !== "mismatch" : stryMutAct_9fa48("32887") ? false : stryMutAct_9fa48("32886") ? true : (stryCov_9fa48("32886", "32887", "32888"), action.kind === (stryMutAct_9fa48("32889") ? "" : (stryCov_9fa48("32889"), "mismatch"))))));
  }
}

/** Whether a Token IV matches the fixed RNS size. */
export function isValidTokenIvLength(length: number): boolean {
  if (stryMutAct_9fa48("32890")) {
    {}
  } else {
    stryCov_9fa48("32890");
    return stryMutAct_9fa48("32893") ? length !== TOKEN_IV_SIZE : stryMutAct_9fa48("32892") ? false : stryMutAct_9fa48("32891") ? true : (stryCov_9fa48("32891", "32892", "32893"), length === TOKEN_IV_SIZE);
  }
}

/**
 * Token IV-length gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isValidTokenIvLength`
 * reads beside the step).
 */
export type TokenIvLengthValidState = Record<string, never>;
export type TokenIvLengthValidEvent = Event | {
  readonly kind: "token-framing/iv-length-valid-gate";
  readonly length: number;
};
export type TokenIvLengthValidAction = {
  readonly kind: "valid";
} | {
  readonly kind: "invalid";
};
export interface TokenIvLengthValidStepResult {
  readonly state: TokenIvLengthValidState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TokenIvLengthValidAction[];
}
export function initialTokenIvLengthValidState(): TokenIvLengthValidState {
  if (stryMutAct_9fa48("32894")) {
    {}
  } else {
    stryCov_9fa48("32894");
    return {};
  }
}
export function stepTokenIvLengthValidWithActions(state: TokenIvLengthValidState, event: TokenIvLengthValidEvent): TokenIvLengthValidStepResult {
  if (stryMutAct_9fa48("32895")) {
    {}
  } else {
    stryCov_9fa48("32895");
    if (stryMutAct_9fa48("32898") ? event.kind !== "token-framing/iv-length-valid-gate" : stryMutAct_9fa48("32897") ? false : stryMutAct_9fa48("32896") ? true : (stryCov_9fa48("32896", "32897", "32898"), event.kind === (stryMutAct_9fa48("32899") ? "" : (stryCov_9fa48("32899"), "token-framing/iv-length-valid-gate")))) {
      if (stryMutAct_9fa48("32900")) {
        {}
      } else {
        stryCov_9fa48("32900");
        return stryMutAct_9fa48("32901") ? {} : (stryCov_9fa48("32901"), {
          state,
          intents: stryMutAct_9fa48("32902") ? ["Stryker was here"] : (stryCov_9fa48("32902"), []),
          actions: stryMutAct_9fa48("32903") ? [] : (stryCov_9fa48("32903"), [stryMutAct_9fa48("32904") ? {} : (stryCov_9fa48("32904"), {
            kind: isValidTokenIvLength(event.length) ? stryMutAct_9fa48("32905") ? "" : (stryCov_9fa48("32905"), "valid") : stryMutAct_9fa48("32906") ? "" : (stryCov_9fa48("32906"), "invalid")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32907") ? {} : (stryCov_9fa48("32907"), {
      state,
      intents: stryMutAct_9fa48("32908") ? ["Stryker was here"] : (stryCov_9fa48("32908"), []),
      actions: stryMutAct_9fa48("32909") ? ["Stryker was here"] : (stryCov_9fa48("32909"), [])
    });
  }
}
export function shouldAcceptTokenIvLength(actions: ReadonlyArray<TokenIvLengthValidAction>): boolean {
  if (stryMutAct_9fa48("32910")) {
    {}
  } else {
    stryCov_9fa48("32910");
    return stryMutAct_9fa48("32911") ? actions.every(action => action.kind === "valid") : (stryCov_9fa48("32911"), actions.some(stryMutAct_9fa48("32912") ? () => undefined : (stryCov_9fa48("32912"), action => stryMutAct_9fa48("32915") ? action.kind !== "valid" : stryMutAct_9fa48("32914") ? false : stryMutAct_9fa48("32913") ? true : (stryCov_9fa48("32913", "32914", "32915"), action.kind === (stryMutAct_9fa48("32916") ? "" : (stryCov_9fa48("32916"), "valid"))))));
  }
}
export function shouldRejectTokenIvLength(actions: ReadonlyArray<TokenIvLengthValidAction>): boolean {
  if (stryMutAct_9fa48("32917")) {
    {}
  } else {
    stryCov_9fa48("32917");
    return stryMutAct_9fa48("32918") ? actions.every(action => action.kind === "invalid") : (stryCov_9fa48("32918"), actions.some(stryMutAct_9fa48("32919") ? () => undefined : (stryCov_9fa48("32919"), action => stryMutAct_9fa48("32922") ? action.kind !== "invalid" : stryMutAct_9fa48("32921") ? false : stryMutAct_9fa48("32920") ? true : (stryCov_9fa48("32920", "32921", "32922"), action.kind === (stryMutAct_9fa48("32923") ? "" : (stryCov_9fa48("32923"), "invalid"))))));
  }
}

/** Whether a Token frame split succeeded (HMAC/AES stay at the edge). */
export function shouldAcceptTokenFrame(framePresent: boolean): boolean {
  if (stryMutAct_9fa48("32924")) {
    {}
  } else {
    stryCov_9fa48("32924");
    return framePresent;
  }
}

/**
 * Token-frame accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptTokenFrame`
 * reads beside the step).
 */
export type AcceptTokenFrameState = Record<string, never>;
export type AcceptTokenFrameEvent = Event | {
  readonly kind: "token-framing/accept-frame-gate";
  readonly framePresent: boolean;
};
export type AcceptTokenFrameAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptTokenFrameStepResult {
  readonly state: AcceptTokenFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptTokenFrameAction[];
}
export function initialAcceptTokenFrameState(): AcceptTokenFrameState {
  if (stryMutAct_9fa48("32925")) {
    {}
  } else {
    stryCov_9fa48("32925");
    return {};
  }
}
export function stepAcceptTokenFrameWithActions(state: AcceptTokenFrameState, event: AcceptTokenFrameEvent): AcceptTokenFrameStepResult {
  if (stryMutAct_9fa48("32926")) {
    {}
  } else {
    stryCov_9fa48("32926");
    if (stryMutAct_9fa48("32929") ? event.kind !== "token-framing/accept-frame-gate" : stryMutAct_9fa48("32928") ? false : stryMutAct_9fa48("32927") ? true : (stryCov_9fa48("32927", "32928", "32929"), event.kind === (stryMutAct_9fa48("32930") ? "" : (stryCov_9fa48("32930"), "token-framing/accept-frame-gate")))) {
      if (stryMutAct_9fa48("32931")) {
        {}
      } else {
        stryCov_9fa48("32931");
        return stryMutAct_9fa48("32932") ? {} : (stryCov_9fa48("32932"), {
          state,
          intents: stryMutAct_9fa48("32933") ? ["Stryker was here"] : (stryCov_9fa48("32933"), []),
          actions: stryMutAct_9fa48("32934") ? [] : (stryCov_9fa48("32934"), [stryMutAct_9fa48("32935") ? {} : (stryCov_9fa48("32935"), {
            kind: shouldAcceptTokenFrame(event.framePresent) ? stryMutAct_9fa48("32936") ? "" : (stryCov_9fa48("32936"), "accept") : stryMutAct_9fa48("32937") ? "" : (stryCov_9fa48("32937"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("32938") ? {} : (stryCov_9fa48("32938"), {
      state,
      intents: stryMutAct_9fa48("32939") ? ["Stryker was here"] : (stryCov_9fa48("32939"), []),
      actions: stryMutAct_9fa48("32940") ? ["Stryker was here"] : (stryCov_9fa48("32940"), [])
    });
  }
}
export function shouldAcceptTokenFrameNow(actions: ReadonlyArray<AcceptTokenFrameAction>): boolean {
  if (stryMutAct_9fa48("32941")) {
    {}
  } else {
    stryCov_9fa48("32941");
    return stryMutAct_9fa48("32942") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("32942"), actions.some(stryMutAct_9fa48("32943") ? () => undefined : (stryCov_9fa48("32943"), action => stryMutAct_9fa48("32946") ? action.kind !== "accept" : stryMutAct_9fa48("32945") ? false : stryMutAct_9fa48("32944") ? true : (stryCov_9fa48("32944", "32945", "32946"), action.kind === (stryMutAct_9fa48("32947") ? "" : (stryCov_9fa48("32947"), "accept"))))));
  }
}
export function shouldSkipAcceptTokenFrame(actions: ReadonlyArray<AcceptTokenFrameAction>): boolean {
  if (stryMutAct_9fa48("32948")) {
    {}
  } else {
    stryCov_9fa48("32948");
    return stryMutAct_9fa48("32949") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("32949"), actions.some(stryMutAct_9fa48("32950") ? () => undefined : (stryCov_9fa48("32950"), action => stryMutAct_9fa48("32953") ? action.kind !== "skip" : stryMutAct_9fa48("32952") ? false : stryMutAct_9fa48("32951") ? true : (stryCov_9fa48("32951", "32952", "32953"), action.kind === (stryMutAct_9fa48("32954") ? "" : (stryCov_9fa48("32954"), "skip"))))));
  }
}

/**
 * Token key-split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitTokenKey` reads
 * beside the step). Invalid key lengths become `reject`.
 */
export type SplitTokenKeyState = Record<string, never>;
export type SplitTokenKeyEvent = Event | {
  readonly kind: "token-framing/split-key-gate";
  readonly key: Uint8Array;
};
export type SplitTokenKeyAction = {
  readonly kind: "use-fields";
  readonly fields: TokenKeyParts;
} | {
  readonly kind: "reject";
};
export interface SplitTokenKeyStepResult {
  readonly state: SplitTokenKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitTokenKeyAction[];
}
export function initialSplitTokenKeyState(): SplitTokenKeyState {
  if (stryMutAct_9fa48("32955")) {
    {}
  } else {
    stryCov_9fa48("32955");
    return {};
  }
}
export function stepSplitTokenKeyWithActions(state: SplitTokenKeyState, event: SplitTokenKeyEvent): SplitTokenKeyStepResult {
  if (stryMutAct_9fa48("32956")) {
    {}
  } else {
    stryCov_9fa48("32956");
    if (stryMutAct_9fa48("32959") ? event.kind !== "token-framing/split-key-gate" : stryMutAct_9fa48("32958") ? false : stryMutAct_9fa48("32957") ? true : (stryCov_9fa48("32957", "32958", "32959"), event.kind === (stryMutAct_9fa48("32960") ? "" : (stryCov_9fa48("32960"), "token-framing/split-key-gate")))) {
      if (stryMutAct_9fa48("32961")) {
        {}
      } else {
        stryCov_9fa48("32961");
        try {
          if (stryMutAct_9fa48("32962")) {
            {}
          } else {
            stryCov_9fa48("32962");
            return stryMutAct_9fa48("32963") ? {} : (stryCov_9fa48("32963"), {
              state,
              intents: stryMutAct_9fa48("32964") ? ["Stryker was here"] : (stryCov_9fa48("32964"), []),
              actions: stryMutAct_9fa48("32965") ? [] : (stryCov_9fa48("32965"), [stryMutAct_9fa48("32966") ? {} : (stryCov_9fa48("32966"), {
                kind: stryMutAct_9fa48("32967") ? "" : (stryCov_9fa48("32967"), "use-fields"),
                fields: splitTokenKey(event.key)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("32968")) {
            {}
          } else {
            stryCov_9fa48("32968");
            return stryMutAct_9fa48("32969") ? {} : (stryCov_9fa48("32969"), {
              state,
              intents: stryMutAct_9fa48("32970") ? ["Stryker was here"] : (stryCov_9fa48("32970"), []),
              actions: stryMutAct_9fa48("32971") ? [] : (stryCov_9fa48("32971"), [stryMutAct_9fa48("32972") ? {} : (stryCov_9fa48("32972"), {
                kind: stryMutAct_9fa48("32973") ? "" : (stryCov_9fa48("32973"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("32974") ? {} : (stryCov_9fa48("32974"), {
      state,
      intents: stryMutAct_9fa48("32975") ? ["Stryker was here"] : (stryCov_9fa48("32975"), []),
      actions: stryMutAct_9fa48("32976") ? ["Stryker was here"] : (stryCov_9fa48("32976"), [])
    });
  }
}
export function shouldUseSplitTokenKey(actions: ReadonlyArray<SplitTokenKeyAction>): boolean {
  if (stryMutAct_9fa48("32977")) {
    {}
  } else {
    stryCov_9fa48("32977");
    return stryMutAct_9fa48("32978") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("32978"), actions.some(stryMutAct_9fa48("32979") ? () => undefined : (stryCov_9fa48("32979"), action => stryMutAct_9fa48("32982") ? action.kind !== "use-fields" : stryMutAct_9fa48("32981") ? false : stryMutAct_9fa48("32980") ? true : (stryCov_9fa48("32980", "32981", "32982"), action.kind === (stryMutAct_9fa48("32983") ? "" : (stryCov_9fa48("32983"), "use-fields"))))));
  }
}
export function shouldRejectSplitTokenKey(actions: ReadonlyArray<SplitTokenKeyAction>): boolean {
  if (stryMutAct_9fa48("32984")) {
    {}
  } else {
    stryCov_9fa48("32984");
    return stryMutAct_9fa48("32985") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("32985"), actions.some(stryMutAct_9fa48("32986") ? () => undefined : (stryCov_9fa48("32986"), action => stryMutAct_9fa48("32989") ? action.kind !== "reject" : stryMutAct_9fa48("32988") ? false : stryMutAct_9fa48("32987") ? true : (stryCov_9fa48("32987", "32988", "32989"), action.kind === (stryMutAct_9fa48("32990") ? "" : (stryCov_9fa48("32990"), "reject"))))));
  }
}

/** Extract split token-key fields from step actions; null when no `use-fields`. */
export function tokenKeyFieldsFromActions(actions: ReadonlyArray<SplitTokenKeyAction>): TokenKeyParts | null {
  if (stryMutAct_9fa48("32991")) {
    {}
  } else {
    stryCov_9fa48("32991");
    const action = actions.find(stryMutAct_9fa48("32992") ? () => undefined : (stryCov_9fa48("32992"), entry => stryMutAct_9fa48("32995") ? entry.kind !== "use-fields" : stryMutAct_9fa48("32994") ? false : stryMutAct_9fa48("32993") ? true : (stryCov_9fa48("32993", "32994", "32995"), entry.kind === (stryMutAct_9fa48("32996") ? "" : (stryCov_9fa48("32996"), "use-fields")))));
    return (stryMutAct_9fa48("32999") ? action?.kind !== "use-fields" : stryMutAct_9fa48("32998") ? false : stryMutAct_9fa48("32997") ? true : (stryCov_9fa48("32997", "32998", "32999"), (stryMutAct_9fa48("33000") ? action.kind : (stryCov_9fa48("33000"), action?.kind)) === (stryMutAct_9fa48("33001") ? "" : (stryCov_9fa48("33001"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Token-frame pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packTokenFrame` reads
 * beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackTokenFrameState = Record<string, never>;
export type PackTokenFrameEvent = Event | {
  readonly kind: "token-framing/pack-gate";
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly hmac: Uint8Array;
};
export type PackTokenFrameAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface PackTokenFrameStepResult {
  readonly state: PackTokenFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackTokenFrameAction[];
}
export function initialPackTokenFrameState(): PackTokenFrameState {
  if (stryMutAct_9fa48("33002")) {
    {}
  } else {
    stryCov_9fa48("33002");
    return {};
  }
}
export function stepPackTokenFrameWithActions(state: PackTokenFrameState, event: PackTokenFrameEvent): PackTokenFrameStepResult {
  if (stryMutAct_9fa48("33003")) {
    {}
  } else {
    stryCov_9fa48("33003");
    if (stryMutAct_9fa48("33006") ? event.kind !== "token-framing/pack-gate" : stryMutAct_9fa48("33005") ? false : stryMutAct_9fa48("33004") ? true : (stryCov_9fa48("33004", "33005", "33006"), event.kind === (stryMutAct_9fa48("33007") ? "" : (stryCov_9fa48("33007"), "token-framing/pack-gate")))) {
      if (stryMutAct_9fa48("33008")) {
        {}
      } else {
        stryCov_9fa48("33008");
        try {
          if (stryMutAct_9fa48("33009")) {
            {}
          } else {
            stryCov_9fa48("33009");
            return stryMutAct_9fa48("33010") ? {} : (stryCov_9fa48("33010"), {
              state,
              intents: stryMutAct_9fa48("33011") ? ["Stryker was here"] : (stryCov_9fa48("33011"), []),
              actions: stryMutAct_9fa48("33012") ? [] : (stryCov_9fa48("33012"), [stryMutAct_9fa48("33013") ? {} : (stryCov_9fa48("33013"), {
                kind: stryMutAct_9fa48("33014") ? "" : (stryCov_9fa48("33014"), "use-raw"),
                raw: packTokenFrame(stryMutAct_9fa48("33015") ? {} : (stryCov_9fa48("33015"), {
                  iv: event.iv,
                  ciphertext: event.ciphertext,
                  hmac: event.hmac
                }))
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("33016")) {
            {}
          } else {
            stryCov_9fa48("33016");
            return stryMutAct_9fa48("33017") ? {} : (stryCov_9fa48("33017"), {
              state,
              intents: stryMutAct_9fa48("33018") ? ["Stryker was here"] : (stryCov_9fa48("33018"), []),
              actions: stryMutAct_9fa48("33019") ? [] : (stryCov_9fa48("33019"), [stryMutAct_9fa48("33020") ? {} : (stryCov_9fa48("33020"), {
                kind: stryMutAct_9fa48("33021") ? "" : (stryCov_9fa48("33021"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("33022") ? {} : (stryCov_9fa48("33022"), {
      state,
      intents: stryMutAct_9fa48("33023") ? ["Stryker was here"] : (stryCov_9fa48("33023"), []),
      actions: stryMutAct_9fa48("33024") ? ["Stryker was here"] : (stryCov_9fa48("33024"), [])
    });
  }
}
export function shouldUsePackTokenFrame(actions: ReadonlyArray<PackTokenFrameAction>): boolean {
  if (stryMutAct_9fa48("33025")) {
    {}
  } else {
    stryCov_9fa48("33025");
    return stryMutAct_9fa48("33026") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("33026"), actions.some(stryMutAct_9fa48("33027") ? () => undefined : (stryCov_9fa48("33027"), action => stryMutAct_9fa48("33030") ? action.kind !== "use-raw" : stryMutAct_9fa48("33029") ? false : stryMutAct_9fa48("33028") ? true : (stryCov_9fa48("33028", "33029", "33030"), action.kind === (stryMutAct_9fa48("33031") ? "" : (stryCov_9fa48("33031"), "use-raw"))))));
  }
}
export function shouldRejectPackTokenFrame(actions: ReadonlyArray<PackTokenFrameAction>): boolean {
  if (stryMutAct_9fa48("33032")) {
    {}
  } else {
    stryCov_9fa48("33032");
    return stryMutAct_9fa48("33033") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("33033"), actions.some(stryMutAct_9fa48("33034") ? () => undefined : (stryCov_9fa48("33034"), action => stryMutAct_9fa48("33037") ? action.kind !== "reject" : stryMutAct_9fa48("33036") ? false : stryMutAct_9fa48("33035") ? true : (stryCov_9fa48("33035", "33036", "33037"), action.kind === (stryMutAct_9fa48("33038") ? "" : (stryCov_9fa48("33038"), "reject"))))));
  }
}

/** Extract token-frame pack bytes from step actions; null when no `use-raw`. */
export function packTokenFrameRawFromActions(actions: ReadonlyArray<PackTokenFrameAction>): Uint8Array | null {
  if (stryMutAct_9fa48("33039")) {
    {}
  } else {
    stryCov_9fa48("33039");
    const action = actions.find(stryMutAct_9fa48("33040") ? () => undefined : (stryCov_9fa48("33040"), entry => stryMutAct_9fa48("33043") ? entry.kind !== "use-raw" : stryMutAct_9fa48("33042") ? false : stryMutAct_9fa48("33041") ? true : (stryCov_9fa48("33041", "33042", "33043"), entry.kind === (stryMutAct_9fa48("33044") ? "" : (stryCov_9fa48("33044"), "use-raw")))));
    return (stryMutAct_9fa48("33047") ? action?.kind !== "use-raw" : stryMutAct_9fa48("33046") ? false : stryMutAct_9fa48("33045") ? true : (stryCov_9fa48("33045", "33046", "33047"), (stryMutAct_9fa48("33048") ? action.kind : (stryCov_9fa48("33048"), action?.kind)) === (stryMutAct_9fa48("33049") ? "" : (stryCov_9fa48("33049"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Token-frame split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitTokenFrame` reads
 * beside the step). Short frames become `reject`.
 */
export type SplitTokenFrameState = Record<string, never>;
export type SplitTokenFrameEvent = Event | {
  readonly kind: "token-framing/split-gate";
  readonly token: Uint8Array;
};
export type SplitTokenFrameAction = {
  readonly kind: "use-fields";
  readonly fields: TokenFrameParts;
} | {
  readonly kind: "reject";
};
export interface SplitTokenFrameStepResult {
  readonly state: SplitTokenFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitTokenFrameAction[];
}
export function initialSplitTokenFrameState(): SplitTokenFrameState {
  if (stryMutAct_9fa48("33050")) {
    {}
  } else {
    stryCov_9fa48("33050");
    return {};
  }
}
export function stepSplitTokenFrameWithActions(state: SplitTokenFrameState, event: SplitTokenFrameEvent): SplitTokenFrameStepResult {
  if (stryMutAct_9fa48("33051")) {
    {}
  } else {
    stryCov_9fa48("33051");
    if (stryMutAct_9fa48("33054") ? event.kind !== "token-framing/split-gate" : stryMutAct_9fa48("33053") ? false : stryMutAct_9fa48("33052") ? true : (stryCov_9fa48("33052", "33053", "33054"), event.kind === (stryMutAct_9fa48("33055") ? "" : (stryCov_9fa48("33055"), "token-framing/split-gate")))) {
      if (stryMutAct_9fa48("33056")) {
        {}
      } else {
        stryCov_9fa48("33056");
        const fields = splitTokenFrame(event.token);
        if (stryMutAct_9fa48("33059") ? fields !== null : stryMutAct_9fa48("33058") ? false : stryMutAct_9fa48("33057") ? true : (stryCov_9fa48("33057", "33058", "33059"), fields === null)) {
          if (stryMutAct_9fa48("33060")) {
            {}
          } else {
            stryCov_9fa48("33060");
            return stryMutAct_9fa48("33061") ? {} : (stryCov_9fa48("33061"), {
              state,
              intents: stryMutAct_9fa48("33062") ? ["Stryker was here"] : (stryCov_9fa48("33062"), []),
              actions: stryMutAct_9fa48("33063") ? [] : (stryCov_9fa48("33063"), [stryMutAct_9fa48("33064") ? {} : (stryCov_9fa48("33064"), {
                kind: stryMutAct_9fa48("33065") ? "" : (stryCov_9fa48("33065"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("33066") ? {} : (stryCov_9fa48("33066"), {
          state,
          intents: stryMutAct_9fa48("33067") ? ["Stryker was here"] : (stryCov_9fa48("33067"), []),
          actions: stryMutAct_9fa48("33068") ? [] : (stryCov_9fa48("33068"), [stryMutAct_9fa48("33069") ? {} : (stryCov_9fa48("33069"), {
            kind: stryMutAct_9fa48("33070") ? "" : (stryCov_9fa48("33070"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("33071") ? {} : (stryCov_9fa48("33071"), {
      state,
      intents: stryMutAct_9fa48("33072") ? ["Stryker was here"] : (stryCov_9fa48("33072"), []),
      actions: stryMutAct_9fa48("33073") ? ["Stryker was here"] : (stryCov_9fa48("33073"), [])
    });
  }
}
export function shouldUseSplitTokenFrame(actions: ReadonlyArray<SplitTokenFrameAction>): boolean {
  if (stryMutAct_9fa48("33074")) {
    {}
  } else {
    stryCov_9fa48("33074");
    return stryMutAct_9fa48("33075") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("33075"), actions.some(stryMutAct_9fa48("33076") ? () => undefined : (stryCov_9fa48("33076"), action => stryMutAct_9fa48("33079") ? action.kind !== "use-fields" : stryMutAct_9fa48("33078") ? false : stryMutAct_9fa48("33077") ? true : (stryCov_9fa48("33077", "33078", "33079"), action.kind === (stryMutAct_9fa48("33080") ? "" : (stryCov_9fa48("33080"), "use-fields"))))));
  }
}
export function shouldRejectSplitTokenFrame(actions: ReadonlyArray<SplitTokenFrameAction>): boolean {
  if (stryMutAct_9fa48("33081")) {
    {}
  } else {
    stryCov_9fa48("33081");
    return stryMutAct_9fa48("33082") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("33082"), actions.some(stryMutAct_9fa48("33083") ? () => undefined : (stryCov_9fa48("33083"), action => stryMutAct_9fa48("33086") ? action.kind !== "reject" : stryMutAct_9fa48("33085") ? false : stryMutAct_9fa48("33084") ? true : (stryCov_9fa48("33084", "33085", "33086"), action.kind === (stryMutAct_9fa48("33087") ? "" : (stryCov_9fa48("33087"), "reject"))))));
  }
}

/** Extract split token-frame fields from step actions; null when no `use-fields`. */
export function tokenFrameFieldsFromActions(actions: ReadonlyArray<SplitTokenFrameAction>): TokenFrameParts | null {
  if (stryMutAct_9fa48("33088")) {
    {}
  } else {
    stryCov_9fa48("33088");
    const action = actions.find(stryMutAct_9fa48("33089") ? () => undefined : (stryCov_9fa48("33089"), entry => stryMutAct_9fa48("33092") ? entry.kind !== "use-fields" : stryMutAct_9fa48("33091") ? false : stryMutAct_9fa48("33090") ? true : (stryCov_9fa48("33090", "33091", "33092"), entry.kind === (stryMutAct_9fa48("33093") ? "" : (stryCov_9fa48("33093"), "use-fields")))));
    return (stryMutAct_9fa48("33096") ? action?.kind !== "use-fields" : stryMutAct_9fa48("33095") ? false : stryMutAct_9fa48("33094") ? true : (stryCov_9fa48("33094", "33095", "33096"), (stryMutAct_9fa48("33097") ? action.kind : (stryCov_9fa48("33097"), action?.kind)) === (stryMutAct_9fa48("33098") ? "" : (stryCov_9fa48("33098"), "use-fields")))) ? action.fields : null;
  }
}