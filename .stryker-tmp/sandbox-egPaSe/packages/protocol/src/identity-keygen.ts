/**
 * Pure Identity private-key material extraction from injected entropy.
 * Public-key derivation stays at the crypto adapter edge.
 * Entropy-split and pack / split conclusions leave via machine actions (no
 * ad-hoc `splitIdentityEntropy` / `packIdentityPrivateKey` /
 * `packIdentityPublicKey` / `splitIdentityPrivateKey` /
 * `splitIdentityPublicKey` reads beside the step).
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
export const IDENTITY_HALF_KEY_SIZE = 32;
export const IDENTITY_KEY_SIZE = stryMutAct_9fa48("10575") ? IDENTITY_HALF_KEY_SIZE / 2 : (stryCov_9fa48("10575"), IDENTITY_HALF_KEY_SIZE * 2);
export const IDENTITY_KEY_ENTROPY_SIZE = IDENTITY_KEY_SIZE;
export interface IdentityKeyMaterial {
  readonly privateKey: Uint8Array;
  readonly signaturePrivateKey: Uint8Array;
}
export interface IdentityPublicKeyMaterial {
  readonly publicKey: Uint8Array;
  readonly signaturePublicKey: Uint8Array;
}
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("10576")) {
    {}
  } else {
    stryCov_9fa48("10576");
    const length = parts.reduce(stryMutAct_9fa48("10577") ? () => undefined : (stryCov_9fa48("10577"), (total, part) => stryMutAct_9fa48("10578") ? total - part.length : (stryCov_9fa48("10578"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("10579")) {
        {}
      } else {
        stryCov_9fa48("10579");
        output.set(part, offset);
        stryMutAct_9fa48("10580") ? offset -= part.length : (stryCov_9fa48("10580"), offset += part.length);
      }
    }
    return output;
  }
}
export function splitIdentityEntropy(entropy: Uint8Array): IdentityKeyMaterial {
  if (stryMutAct_9fa48("10581")) {
    {}
  } else {
    stryCov_9fa48("10581");
    if (stryMutAct_9fa48("10585") ? entropy.length >= IDENTITY_KEY_ENTROPY_SIZE : stryMutAct_9fa48("10584") ? entropy.length <= IDENTITY_KEY_ENTROPY_SIZE : stryMutAct_9fa48("10583") ? false : stryMutAct_9fa48("10582") ? true : (stryCov_9fa48("10582", "10583", "10584", "10585"), entropy.length < IDENTITY_KEY_ENTROPY_SIZE)) {
      if (stryMutAct_9fa48("10586")) {
        {}
      } else {
        stryCov_9fa48("10586");
        throw new Error(stryMutAct_9fa48("10587") ? `` : (stryCov_9fa48("10587"), `Identity key entropy must be at least ${IDENTITY_KEY_ENTROPY_SIZE} bytes`));
      }
    }
    return stryMutAct_9fa48("10588") ? {} : (stryCov_9fa48("10588"), {
      privateKey: Uint8Array.from(entropy.subarray(0, IDENTITY_HALF_KEY_SIZE)),
      signaturePrivateKey: Uint8Array.from(entropy.subarray(IDENTITY_HALF_KEY_SIZE, IDENTITY_KEY_ENTROPY_SIZE))
    });
  }
}

/**
 * Identity keygen entropy split is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitIdentityEntropy`
 * reads beside the step). Undersized entropy becomes `reject`.
 */
export type SplitIdentityEntropyState = Record<string, never>;
export type SplitIdentityEntropyEvent = Event | {
  readonly kind: "identity-key/split-entropy-gate";
  readonly entropy: Uint8Array;
};
export type SplitIdentityEntropyAction = {
  readonly kind: "use-fields";
  readonly fields: IdentityKeyMaterial;
} | {
  readonly kind: "reject";
};
export interface SplitIdentityEntropyStepResult {
  readonly state: SplitIdentityEntropyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitIdentityEntropyAction[];
}
export function initialSplitIdentityEntropyState(): SplitIdentityEntropyState {
  if (stryMutAct_9fa48("10589")) {
    {}
  } else {
    stryCov_9fa48("10589");
    return {};
  }
}
export function stepSplitIdentityEntropyWithActions(state: SplitIdentityEntropyState, event: SplitIdentityEntropyEvent): SplitIdentityEntropyStepResult {
  if (stryMutAct_9fa48("10590")) {
    {}
  } else {
    stryCov_9fa48("10590");
    if (stryMutAct_9fa48("10593") ? event.kind !== "identity-key/split-entropy-gate" : stryMutAct_9fa48("10592") ? false : stryMutAct_9fa48("10591") ? true : (stryCov_9fa48("10591", "10592", "10593"), event.kind === (stryMutAct_9fa48("10594") ? "" : (stryCov_9fa48("10594"), "identity-key/split-entropy-gate")))) {
      if (stryMutAct_9fa48("10595")) {
        {}
      } else {
        stryCov_9fa48("10595");
        try {
          if (stryMutAct_9fa48("10596")) {
            {}
          } else {
            stryCov_9fa48("10596");
            return stryMutAct_9fa48("10597") ? {} : (stryCov_9fa48("10597"), {
              state,
              intents: stryMutAct_9fa48("10598") ? ["Stryker was here"] : (stryCov_9fa48("10598"), []),
              actions: stryMutAct_9fa48("10599") ? [] : (stryCov_9fa48("10599"), [stryMutAct_9fa48("10600") ? {} : (stryCov_9fa48("10600"), {
                kind: stryMutAct_9fa48("10601") ? "" : (stryCov_9fa48("10601"), "use-fields"),
                fields: splitIdentityEntropy(event.entropy)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("10602")) {
            {}
          } else {
            stryCov_9fa48("10602");
            return stryMutAct_9fa48("10603") ? {} : (stryCov_9fa48("10603"), {
              state,
              intents: stryMutAct_9fa48("10604") ? ["Stryker was here"] : (stryCov_9fa48("10604"), []),
              actions: stryMutAct_9fa48("10605") ? [] : (stryCov_9fa48("10605"), [stryMutAct_9fa48("10606") ? {} : (stryCov_9fa48("10606"), {
                kind: stryMutAct_9fa48("10607") ? "" : (stryCov_9fa48("10607"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("10608") ? {} : (stryCov_9fa48("10608"), {
      state,
      intents: stryMutAct_9fa48("10609") ? ["Stryker was here"] : (stryCov_9fa48("10609"), []),
      actions: stryMutAct_9fa48("10610") ? ["Stryker was here"] : (stryCov_9fa48("10610"), [])
    });
  }
}
export function shouldUseSplitIdentityEntropy(actions: ReadonlyArray<SplitIdentityEntropyAction>): boolean {
  if (stryMutAct_9fa48("10611")) {
    {}
  } else {
    stryCov_9fa48("10611");
    return stryMutAct_9fa48("10612") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("10612"), actions.some(stryMutAct_9fa48("10613") ? () => undefined : (stryCov_9fa48("10613"), action => stryMutAct_9fa48("10616") ? action.kind !== "use-fields" : stryMutAct_9fa48("10615") ? false : stryMutAct_9fa48("10614") ? true : (stryCov_9fa48("10614", "10615", "10616"), action.kind === (stryMutAct_9fa48("10617") ? "" : (stryCov_9fa48("10617"), "use-fields"))))));
  }
}
export function shouldRejectSplitIdentityEntropy(actions: ReadonlyArray<SplitIdentityEntropyAction>): boolean {
  if (stryMutAct_9fa48("10618")) {
    {}
  } else {
    stryCov_9fa48("10618");
    return stryMutAct_9fa48("10619") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("10619"), actions.some(stryMutAct_9fa48("10620") ? () => undefined : (stryCov_9fa48("10620"), action => stryMutAct_9fa48("10623") ? action.kind !== "reject" : stryMutAct_9fa48("10622") ? false : stryMutAct_9fa48("10621") ? true : (stryCov_9fa48("10621", "10622", "10623"), action.kind === (stryMutAct_9fa48("10624") ? "" : (stryCov_9fa48("10624"), "reject"))))));
  }
}

/** Extract identity key material from step actions; null when no `use-fields`. */
export function identityEntropyFieldsFromActions(actions: ReadonlyArray<SplitIdentityEntropyAction>): IdentityKeyMaterial | null {
  if (stryMutAct_9fa48("10625")) {
    {}
  } else {
    stryCov_9fa48("10625");
    const action = actions.find(stryMutAct_9fa48("10626") ? () => undefined : (stryCov_9fa48("10626"), entry => stryMutAct_9fa48("10629") ? entry.kind !== "use-fields" : stryMutAct_9fa48("10628") ? false : stryMutAct_9fa48("10627") ? true : (stryCov_9fa48("10627", "10628", "10629"), entry.kind === (stryMutAct_9fa48("10630") ? "" : (stryCov_9fa48("10630"), "use-fields")))));
    return (stryMutAct_9fa48("10633") ? action?.kind !== "use-fields" : stryMutAct_9fa48("10632") ? false : stryMutAct_9fa48("10631") ? true : (stryCov_9fa48("10631", "10632", "10633"), (stryMutAct_9fa48("10634") ? action.kind : (stryCov_9fa48("10634"), action?.kind)) === (stryMutAct_9fa48("10635") ? "" : (stryCov_9fa48("10635"), "use-fields")))) ? action.fields : null;
  }
}
export function packIdentityPrivateKey(privateKey: Uint8Array, signaturePrivateKey: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("10636")) {
    {}
  } else {
    stryCov_9fa48("10636");
    if (stryMutAct_9fa48("10639") ? privateKey.length === IDENTITY_HALF_KEY_SIZE : stryMutAct_9fa48("10638") ? false : stryMutAct_9fa48("10637") ? true : (stryCov_9fa48("10637", "10638", "10639"), privateKey.length !== IDENTITY_HALF_KEY_SIZE)) {
      if (stryMutAct_9fa48("10640")) {
        {}
      } else {
        stryCov_9fa48("10640");
        throw new Error(stryMutAct_9fa48("10641") ? `` : (stryCov_9fa48("10641"), `identity private key must be ${IDENTITY_HALF_KEY_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("10644") ? signaturePrivateKey.length === IDENTITY_HALF_KEY_SIZE : stryMutAct_9fa48("10643") ? false : stryMutAct_9fa48("10642") ? true : (stryCov_9fa48("10642", "10643", "10644"), signaturePrivateKey.length !== IDENTITY_HALF_KEY_SIZE)) {
      if (stryMutAct_9fa48("10645")) {
        {}
      } else {
        stryCov_9fa48("10645");
        throw new Error(stryMutAct_9fa48("10646") ? `` : (stryCov_9fa48("10646"), `identity signature private key must be ${IDENTITY_HALF_KEY_SIZE} bytes`));
      }
    }
    return concatBytes(privateKey, signaturePrivateKey);
  }
}
export function splitIdentityPrivateKey(privateKeyBytes: Uint8Array): IdentityKeyMaterial | null {
  if (stryMutAct_9fa48("10647")) {
    {}
  } else {
    stryCov_9fa48("10647");
    if (stryMutAct_9fa48("10650") ? privateKeyBytes.length === IDENTITY_KEY_SIZE : stryMutAct_9fa48("10649") ? false : stryMutAct_9fa48("10648") ? true : (stryCov_9fa48("10648", "10649", "10650"), privateKeyBytes.length !== IDENTITY_KEY_SIZE)) {
      if (stryMutAct_9fa48("10651")) {
        {}
      } else {
        stryCov_9fa48("10651");
        return null;
      }
    }
    return stryMutAct_9fa48("10652") ? {} : (stryCov_9fa48("10652"), {
      privateKey: privateKeyBytes.subarray(0, IDENTITY_HALF_KEY_SIZE),
      signaturePrivateKey: privateKeyBytes.subarray(IDENTITY_HALF_KEY_SIZE)
    });
  }
}
export function packIdentityPublicKey(publicKey: Uint8Array, signaturePublicKey: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("10653")) {
    {}
  } else {
    stryCov_9fa48("10653");
    if (stryMutAct_9fa48("10656") ? publicKey.length === IDENTITY_HALF_KEY_SIZE : stryMutAct_9fa48("10655") ? false : stryMutAct_9fa48("10654") ? true : (stryCov_9fa48("10654", "10655", "10656"), publicKey.length !== IDENTITY_HALF_KEY_SIZE)) {
      if (stryMutAct_9fa48("10657")) {
        {}
      } else {
        stryCov_9fa48("10657");
        throw new Error(stryMutAct_9fa48("10658") ? `` : (stryCov_9fa48("10658"), `identity public key must be ${IDENTITY_HALF_KEY_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("10661") ? signaturePublicKey.length === IDENTITY_HALF_KEY_SIZE : stryMutAct_9fa48("10660") ? false : stryMutAct_9fa48("10659") ? true : (stryCov_9fa48("10659", "10660", "10661"), signaturePublicKey.length !== IDENTITY_HALF_KEY_SIZE)) {
      if (stryMutAct_9fa48("10662")) {
        {}
      } else {
        stryCov_9fa48("10662");
        throw new Error(stryMutAct_9fa48("10663") ? `` : (stryCov_9fa48("10663"), `identity signature public key must be ${IDENTITY_HALF_KEY_SIZE} bytes`));
      }
    }
    return concatBytes(publicKey, signaturePublicKey);
  }
}
export function splitIdentityPublicKey(publicKeyBytes: Uint8Array): IdentityPublicKeyMaterial | null {
  if (stryMutAct_9fa48("10664")) {
    {}
  } else {
    stryCov_9fa48("10664");
    if (stryMutAct_9fa48("10667") ? publicKeyBytes.length === IDENTITY_KEY_SIZE : stryMutAct_9fa48("10666") ? false : stryMutAct_9fa48("10665") ? true : (stryCov_9fa48("10665", "10666", "10667"), publicKeyBytes.length !== IDENTITY_KEY_SIZE)) {
      if (stryMutAct_9fa48("10668")) {
        {}
      } else {
        stryCov_9fa48("10668");
        return null;
      }
    }
    return stryMutAct_9fa48("10669") ? {} : (stryCov_9fa48("10669"), {
      publicKey: publicKeyBytes.subarray(0, IDENTITY_HALF_KEY_SIZE),
      signaturePublicKey: publicKeyBytes.subarray(IDENTITY_HALF_KEY_SIZE)
    });
  }
}

/**
 * Identity private-key pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packIdentityPrivateKey` reads
 * beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackIdentityPrivateKeyState = Record<string, never>;
export type PackIdentityPrivateKeyEvent = Event | {
  readonly kind: "identity-key/pack-private-gate";
  readonly privateKey: Uint8Array;
  readonly signaturePrivateKey: Uint8Array;
};
export type PackIdentityPrivateKeyAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface PackIdentityPrivateKeyStepResult {
  readonly state: PackIdentityPrivateKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackIdentityPrivateKeyAction[];
}
export function initialPackIdentityPrivateKeyState(): PackIdentityPrivateKeyState {
  if (stryMutAct_9fa48("10670")) {
    {}
  } else {
    stryCov_9fa48("10670");
    return {};
  }
}
export function stepPackIdentityPrivateKeyWithActions(state: PackIdentityPrivateKeyState, event: PackIdentityPrivateKeyEvent): PackIdentityPrivateKeyStepResult {
  if (stryMutAct_9fa48("10671")) {
    {}
  } else {
    stryCov_9fa48("10671");
    if (stryMutAct_9fa48("10674") ? event.kind !== "identity-key/pack-private-gate" : stryMutAct_9fa48("10673") ? false : stryMutAct_9fa48("10672") ? true : (stryCov_9fa48("10672", "10673", "10674"), event.kind === (stryMutAct_9fa48("10675") ? "" : (stryCov_9fa48("10675"), "identity-key/pack-private-gate")))) {
      if (stryMutAct_9fa48("10676")) {
        {}
      } else {
        stryCov_9fa48("10676");
        try {
          if (stryMutAct_9fa48("10677")) {
            {}
          } else {
            stryCov_9fa48("10677");
            return stryMutAct_9fa48("10678") ? {} : (stryCov_9fa48("10678"), {
              state,
              intents: stryMutAct_9fa48("10679") ? ["Stryker was here"] : (stryCov_9fa48("10679"), []),
              actions: stryMutAct_9fa48("10680") ? [] : (stryCov_9fa48("10680"), [stryMutAct_9fa48("10681") ? {} : (stryCov_9fa48("10681"), {
                kind: stryMutAct_9fa48("10682") ? "" : (stryCov_9fa48("10682"), "use-raw"),
                raw: packIdentityPrivateKey(event.privateKey, event.signaturePrivateKey)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("10683")) {
            {}
          } else {
            stryCov_9fa48("10683");
            return stryMutAct_9fa48("10684") ? {} : (stryCov_9fa48("10684"), {
              state,
              intents: stryMutAct_9fa48("10685") ? ["Stryker was here"] : (stryCov_9fa48("10685"), []),
              actions: stryMutAct_9fa48("10686") ? [] : (stryCov_9fa48("10686"), [stryMutAct_9fa48("10687") ? {} : (stryCov_9fa48("10687"), {
                kind: stryMutAct_9fa48("10688") ? "" : (stryCov_9fa48("10688"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("10689") ? {} : (stryCov_9fa48("10689"), {
      state,
      intents: stryMutAct_9fa48("10690") ? ["Stryker was here"] : (stryCov_9fa48("10690"), []),
      actions: stryMutAct_9fa48("10691") ? ["Stryker was here"] : (stryCov_9fa48("10691"), [])
    });
  }
}
export function shouldUsePackIdentityPrivateKey(actions: ReadonlyArray<PackIdentityPrivateKeyAction>): boolean {
  if (stryMutAct_9fa48("10692")) {
    {}
  } else {
    stryCov_9fa48("10692");
    return stryMutAct_9fa48("10693") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("10693"), actions.some(stryMutAct_9fa48("10694") ? () => undefined : (stryCov_9fa48("10694"), action => stryMutAct_9fa48("10697") ? action.kind !== "use-raw" : stryMutAct_9fa48("10696") ? false : stryMutAct_9fa48("10695") ? true : (stryCov_9fa48("10695", "10696", "10697"), action.kind === (stryMutAct_9fa48("10698") ? "" : (stryCov_9fa48("10698"), "use-raw"))))));
  }
}
export function shouldRejectPackIdentityPrivateKey(actions: ReadonlyArray<PackIdentityPrivateKeyAction>): boolean {
  if (stryMutAct_9fa48("10699")) {
    {}
  } else {
    stryCov_9fa48("10699");
    return stryMutAct_9fa48("10700") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("10700"), actions.some(stryMutAct_9fa48("10701") ? () => undefined : (stryCov_9fa48("10701"), action => stryMutAct_9fa48("10704") ? action.kind !== "reject" : stryMutAct_9fa48("10703") ? false : stryMutAct_9fa48("10702") ? true : (stryCov_9fa48("10702", "10703", "10704"), action.kind === (stryMutAct_9fa48("10705") ? "" : (stryCov_9fa48("10705"), "reject"))))));
  }
}

/** Extract packed identity private key from step actions; null when no `use-raw`. */
export function packIdentityPrivateKeyRawFromActions(actions: ReadonlyArray<PackIdentityPrivateKeyAction>): Uint8Array | null {
  if (stryMutAct_9fa48("10706")) {
    {}
  } else {
    stryCov_9fa48("10706");
    const action = actions.find(stryMutAct_9fa48("10707") ? () => undefined : (stryCov_9fa48("10707"), entry => stryMutAct_9fa48("10710") ? entry.kind !== "use-raw" : stryMutAct_9fa48("10709") ? false : stryMutAct_9fa48("10708") ? true : (stryCov_9fa48("10708", "10709", "10710"), entry.kind === (stryMutAct_9fa48("10711") ? "" : (stryCov_9fa48("10711"), "use-raw")))));
    return (stryMutAct_9fa48("10714") ? action?.kind !== "use-raw" : stryMutAct_9fa48("10713") ? false : stryMutAct_9fa48("10712") ? true : (stryCov_9fa48("10712", "10713", "10714"), (stryMutAct_9fa48("10715") ? action.kind : (stryCov_9fa48("10715"), action?.kind)) === (stryMutAct_9fa48("10716") ? "" : (stryCov_9fa48("10716"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Identity private-key split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitIdentityPrivateKey` reads
 * beside the step). Wrong lengths become `reject`.
 */
export type SplitIdentityPrivateKeyState = Record<string, never>;
export type SplitIdentityPrivateKeyEvent = Event | {
  readonly kind: "identity-key/split-private-gate";
  readonly privateKeyBytes: Uint8Array;
};
export type SplitIdentityPrivateKeyAction = {
  readonly kind: "use-fields";
  readonly fields: IdentityKeyMaterial;
} | {
  readonly kind: "reject";
};
export interface SplitIdentityPrivateKeyStepResult {
  readonly state: SplitIdentityPrivateKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitIdentityPrivateKeyAction[];
}
export function initialSplitIdentityPrivateKeyState(): SplitIdentityPrivateKeyState {
  if (stryMutAct_9fa48("10717")) {
    {}
  } else {
    stryCov_9fa48("10717");
    return {};
  }
}
export function stepSplitIdentityPrivateKeyWithActions(state: SplitIdentityPrivateKeyState, event: SplitIdentityPrivateKeyEvent): SplitIdentityPrivateKeyStepResult {
  if (stryMutAct_9fa48("10718")) {
    {}
  } else {
    stryCov_9fa48("10718");
    if (stryMutAct_9fa48("10721") ? event.kind !== "identity-key/split-private-gate" : stryMutAct_9fa48("10720") ? false : stryMutAct_9fa48("10719") ? true : (stryCov_9fa48("10719", "10720", "10721"), event.kind === (stryMutAct_9fa48("10722") ? "" : (stryCov_9fa48("10722"), "identity-key/split-private-gate")))) {
      if (stryMutAct_9fa48("10723")) {
        {}
      } else {
        stryCov_9fa48("10723");
        const fields = splitIdentityPrivateKey(event.privateKeyBytes);
        if (stryMutAct_9fa48("10726") ? fields !== null : stryMutAct_9fa48("10725") ? false : stryMutAct_9fa48("10724") ? true : (stryCov_9fa48("10724", "10725", "10726"), fields === null)) {
          if (stryMutAct_9fa48("10727")) {
            {}
          } else {
            stryCov_9fa48("10727");
            return stryMutAct_9fa48("10728") ? {} : (stryCov_9fa48("10728"), {
              state,
              intents: stryMutAct_9fa48("10729") ? ["Stryker was here"] : (stryCov_9fa48("10729"), []),
              actions: stryMutAct_9fa48("10730") ? [] : (stryCov_9fa48("10730"), [stryMutAct_9fa48("10731") ? {} : (stryCov_9fa48("10731"), {
                kind: stryMutAct_9fa48("10732") ? "" : (stryCov_9fa48("10732"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("10733") ? {} : (stryCov_9fa48("10733"), {
          state,
          intents: stryMutAct_9fa48("10734") ? ["Stryker was here"] : (stryCov_9fa48("10734"), []),
          actions: stryMutAct_9fa48("10735") ? [] : (stryCov_9fa48("10735"), [stryMutAct_9fa48("10736") ? {} : (stryCov_9fa48("10736"), {
            kind: stryMutAct_9fa48("10737") ? "" : (stryCov_9fa48("10737"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("10738") ? {} : (stryCov_9fa48("10738"), {
      state,
      intents: stryMutAct_9fa48("10739") ? ["Stryker was here"] : (stryCov_9fa48("10739"), []),
      actions: stryMutAct_9fa48("10740") ? ["Stryker was here"] : (stryCov_9fa48("10740"), [])
    });
  }
}
export function shouldUseSplitIdentityPrivateKey(actions: ReadonlyArray<SplitIdentityPrivateKeyAction>): boolean {
  if (stryMutAct_9fa48("10741")) {
    {}
  } else {
    stryCov_9fa48("10741");
    return stryMutAct_9fa48("10742") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("10742"), actions.some(stryMutAct_9fa48("10743") ? () => undefined : (stryCov_9fa48("10743"), action => stryMutAct_9fa48("10746") ? action.kind !== "use-fields" : stryMutAct_9fa48("10745") ? false : stryMutAct_9fa48("10744") ? true : (stryCov_9fa48("10744", "10745", "10746"), action.kind === (stryMutAct_9fa48("10747") ? "" : (stryCov_9fa48("10747"), "use-fields"))))));
  }
}
export function shouldRejectSplitIdentityPrivateKey(actions: ReadonlyArray<SplitIdentityPrivateKeyAction>): boolean {
  if (stryMutAct_9fa48("10748")) {
    {}
  } else {
    stryCov_9fa48("10748");
    return stryMutAct_9fa48("10749") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("10749"), actions.some(stryMutAct_9fa48("10750") ? () => undefined : (stryCov_9fa48("10750"), action => stryMutAct_9fa48("10753") ? action.kind !== "reject" : stryMutAct_9fa48("10752") ? false : stryMutAct_9fa48("10751") ? true : (stryCov_9fa48("10751", "10752", "10753"), action.kind === (stryMutAct_9fa48("10754") ? "" : (stryCov_9fa48("10754"), "reject"))))));
  }
}

/** Extract split identity private-key fields from step actions; null when no `use-fields`. */
export function identityPrivateKeyFieldsFromActions(actions: ReadonlyArray<SplitIdentityPrivateKeyAction>): IdentityKeyMaterial | null {
  if (stryMutAct_9fa48("10755")) {
    {}
  } else {
    stryCov_9fa48("10755");
    const action = actions.find(stryMutAct_9fa48("10756") ? () => undefined : (stryCov_9fa48("10756"), entry => stryMutAct_9fa48("10759") ? entry.kind !== "use-fields" : stryMutAct_9fa48("10758") ? false : stryMutAct_9fa48("10757") ? true : (stryCov_9fa48("10757", "10758", "10759"), entry.kind === (stryMutAct_9fa48("10760") ? "" : (stryCov_9fa48("10760"), "use-fields")))));
    return (stryMutAct_9fa48("10763") ? action?.kind !== "use-fields" : stryMutAct_9fa48("10762") ? false : stryMutAct_9fa48("10761") ? true : (stryCov_9fa48("10761", "10762", "10763"), (stryMutAct_9fa48("10764") ? action.kind : (stryCov_9fa48("10764"), action?.kind)) === (stryMutAct_9fa48("10765") ? "" : (stryCov_9fa48("10765"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Identity public-key pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packIdentityPublicKey` reads
 * beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackIdentityPublicKeyState = Record<string, never>;
export type PackIdentityPublicKeyEvent = Event | {
  readonly kind: "identity-key/pack-public-gate";
  readonly publicKey: Uint8Array;
  readonly signaturePublicKey: Uint8Array;
};
export type PackIdentityPublicKeyAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface PackIdentityPublicKeyStepResult {
  readonly state: PackIdentityPublicKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackIdentityPublicKeyAction[];
}
export function initialPackIdentityPublicKeyState(): PackIdentityPublicKeyState {
  if (stryMutAct_9fa48("10766")) {
    {}
  } else {
    stryCov_9fa48("10766");
    return {};
  }
}
export function stepPackIdentityPublicKeyWithActions(state: PackIdentityPublicKeyState, event: PackIdentityPublicKeyEvent): PackIdentityPublicKeyStepResult {
  if (stryMutAct_9fa48("10767")) {
    {}
  } else {
    stryCov_9fa48("10767");
    if (stryMutAct_9fa48("10770") ? event.kind !== "identity-key/pack-public-gate" : stryMutAct_9fa48("10769") ? false : stryMutAct_9fa48("10768") ? true : (stryCov_9fa48("10768", "10769", "10770"), event.kind === (stryMutAct_9fa48("10771") ? "" : (stryCov_9fa48("10771"), "identity-key/pack-public-gate")))) {
      if (stryMutAct_9fa48("10772")) {
        {}
      } else {
        stryCov_9fa48("10772");
        try {
          if (stryMutAct_9fa48("10773")) {
            {}
          } else {
            stryCov_9fa48("10773");
            return stryMutAct_9fa48("10774") ? {} : (stryCov_9fa48("10774"), {
              state,
              intents: stryMutAct_9fa48("10775") ? ["Stryker was here"] : (stryCov_9fa48("10775"), []),
              actions: stryMutAct_9fa48("10776") ? [] : (stryCov_9fa48("10776"), [stryMutAct_9fa48("10777") ? {} : (stryCov_9fa48("10777"), {
                kind: stryMutAct_9fa48("10778") ? "" : (stryCov_9fa48("10778"), "use-raw"),
                raw: packIdentityPublicKey(event.publicKey, event.signaturePublicKey)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("10779")) {
            {}
          } else {
            stryCov_9fa48("10779");
            return stryMutAct_9fa48("10780") ? {} : (stryCov_9fa48("10780"), {
              state,
              intents: stryMutAct_9fa48("10781") ? ["Stryker was here"] : (stryCov_9fa48("10781"), []),
              actions: stryMutAct_9fa48("10782") ? [] : (stryCov_9fa48("10782"), [stryMutAct_9fa48("10783") ? {} : (stryCov_9fa48("10783"), {
                kind: stryMutAct_9fa48("10784") ? "" : (stryCov_9fa48("10784"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("10785") ? {} : (stryCov_9fa48("10785"), {
      state,
      intents: stryMutAct_9fa48("10786") ? ["Stryker was here"] : (stryCov_9fa48("10786"), []),
      actions: stryMutAct_9fa48("10787") ? ["Stryker was here"] : (stryCov_9fa48("10787"), [])
    });
  }
}
export function shouldUsePackIdentityPublicKey(actions: ReadonlyArray<PackIdentityPublicKeyAction>): boolean {
  if (stryMutAct_9fa48("10788")) {
    {}
  } else {
    stryCov_9fa48("10788");
    return stryMutAct_9fa48("10789") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("10789"), actions.some(stryMutAct_9fa48("10790") ? () => undefined : (stryCov_9fa48("10790"), action => stryMutAct_9fa48("10793") ? action.kind !== "use-raw" : stryMutAct_9fa48("10792") ? false : stryMutAct_9fa48("10791") ? true : (stryCov_9fa48("10791", "10792", "10793"), action.kind === (stryMutAct_9fa48("10794") ? "" : (stryCov_9fa48("10794"), "use-raw"))))));
  }
}
export function shouldRejectPackIdentityPublicKey(actions: ReadonlyArray<PackIdentityPublicKeyAction>): boolean {
  if (stryMutAct_9fa48("10795")) {
    {}
  } else {
    stryCov_9fa48("10795");
    return stryMutAct_9fa48("10796") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("10796"), actions.some(stryMutAct_9fa48("10797") ? () => undefined : (stryCov_9fa48("10797"), action => stryMutAct_9fa48("10800") ? action.kind !== "reject" : stryMutAct_9fa48("10799") ? false : stryMutAct_9fa48("10798") ? true : (stryCov_9fa48("10798", "10799", "10800"), action.kind === (stryMutAct_9fa48("10801") ? "" : (stryCov_9fa48("10801"), "reject"))))));
  }
}

/** Extract packed identity public key from step actions; null when no `use-raw`. */
export function packIdentityPublicKeyRawFromActions(actions: ReadonlyArray<PackIdentityPublicKeyAction>): Uint8Array | null {
  if (stryMutAct_9fa48("10802")) {
    {}
  } else {
    stryCov_9fa48("10802");
    const action = actions.find(stryMutAct_9fa48("10803") ? () => undefined : (stryCov_9fa48("10803"), entry => stryMutAct_9fa48("10806") ? entry.kind !== "use-raw" : stryMutAct_9fa48("10805") ? false : stryMutAct_9fa48("10804") ? true : (stryCov_9fa48("10804", "10805", "10806"), entry.kind === (stryMutAct_9fa48("10807") ? "" : (stryCov_9fa48("10807"), "use-raw")))));
    return (stryMutAct_9fa48("10810") ? action?.kind !== "use-raw" : stryMutAct_9fa48("10809") ? false : stryMutAct_9fa48("10808") ? true : (stryCov_9fa48("10808", "10809", "10810"), (stryMutAct_9fa48("10811") ? action.kind : (stryCov_9fa48("10811"), action?.kind)) === (stryMutAct_9fa48("10812") ? "" : (stryCov_9fa48("10812"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Identity public-key split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitIdentityPublicKey` reads
 * beside the step). Wrong lengths become `reject`.
 */
export type SplitIdentityPublicKeyState = Record<string, never>;
export type SplitIdentityPublicKeyEvent = Event | {
  readonly kind: "identity-key/split-public-gate";
  readonly publicKeyBytes: Uint8Array;
};
export type SplitIdentityPublicKeyAction = {
  readonly kind: "use-fields";
  readonly fields: IdentityPublicKeyMaterial;
} | {
  readonly kind: "reject";
};
export interface SplitIdentityPublicKeyStepResult {
  readonly state: SplitIdentityPublicKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitIdentityPublicKeyAction[];
}
export function initialSplitIdentityPublicKeyState(): SplitIdentityPublicKeyState {
  if (stryMutAct_9fa48("10813")) {
    {}
  } else {
    stryCov_9fa48("10813");
    return {};
  }
}
export function stepSplitIdentityPublicKeyWithActions(state: SplitIdentityPublicKeyState, event: SplitIdentityPublicKeyEvent): SplitIdentityPublicKeyStepResult {
  if (stryMutAct_9fa48("10814")) {
    {}
  } else {
    stryCov_9fa48("10814");
    if (stryMutAct_9fa48("10817") ? event.kind !== "identity-key/split-public-gate" : stryMutAct_9fa48("10816") ? false : stryMutAct_9fa48("10815") ? true : (stryCov_9fa48("10815", "10816", "10817"), event.kind === (stryMutAct_9fa48("10818") ? "" : (stryCov_9fa48("10818"), "identity-key/split-public-gate")))) {
      if (stryMutAct_9fa48("10819")) {
        {}
      } else {
        stryCov_9fa48("10819");
        const fields = splitIdentityPublicKey(event.publicKeyBytes);
        if (stryMutAct_9fa48("10822") ? fields !== null : stryMutAct_9fa48("10821") ? false : stryMutAct_9fa48("10820") ? true : (stryCov_9fa48("10820", "10821", "10822"), fields === null)) {
          if (stryMutAct_9fa48("10823")) {
            {}
          } else {
            stryCov_9fa48("10823");
            return stryMutAct_9fa48("10824") ? {} : (stryCov_9fa48("10824"), {
              state,
              intents: stryMutAct_9fa48("10825") ? ["Stryker was here"] : (stryCov_9fa48("10825"), []),
              actions: stryMutAct_9fa48("10826") ? [] : (stryCov_9fa48("10826"), [stryMutAct_9fa48("10827") ? {} : (stryCov_9fa48("10827"), {
                kind: stryMutAct_9fa48("10828") ? "" : (stryCov_9fa48("10828"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("10829") ? {} : (stryCov_9fa48("10829"), {
          state,
          intents: stryMutAct_9fa48("10830") ? ["Stryker was here"] : (stryCov_9fa48("10830"), []),
          actions: stryMutAct_9fa48("10831") ? [] : (stryCov_9fa48("10831"), [stryMutAct_9fa48("10832") ? {} : (stryCov_9fa48("10832"), {
            kind: stryMutAct_9fa48("10833") ? "" : (stryCov_9fa48("10833"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("10834") ? {} : (stryCov_9fa48("10834"), {
      state,
      intents: stryMutAct_9fa48("10835") ? ["Stryker was here"] : (stryCov_9fa48("10835"), []),
      actions: stryMutAct_9fa48("10836") ? ["Stryker was here"] : (stryCov_9fa48("10836"), [])
    });
  }
}
export function shouldUseSplitIdentityPublicKey(actions: ReadonlyArray<SplitIdentityPublicKeyAction>): boolean {
  if (stryMutAct_9fa48("10837")) {
    {}
  } else {
    stryCov_9fa48("10837");
    return stryMutAct_9fa48("10838") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("10838"), actions.some(stryMutAct_9fa48("10839") ? () => undefined : (stryCov_9fa48("10839"), action => stryMutAct_9fa48("10842") ? action.kind !== "use-fields" : stryMutAct_9fa48("10841") ? false : stryMutAct_9fa48("10840") ? true : (stryCov_9fa48("10840", "10841", "10842"), action.kind === (stryMutAct_9fa48("10843") ? "" : (stryCov_9fa48("10843"), "use-fields"))))));
  }
}
export function shouldRejectSplitIdentityPublicKey(actions: ReadonlyArray<SplitIdentityPublicKeyAction>): boolean {
  if (stryMutAct_9fa48("10844")) {
    {}
  } else {
    stryCov_9fa48("10844");
    return stryMutAct_9fa48("10845") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("10845"), actions.some(stryMutAct_9fa48("10846") ? () => undefined : (stryCov_9fa48("10846"), action => stryMutAct_9fa48("10849") ? action.kind !== "reject" : stryMutAct_9fa48("10848") ? false : stryMutAct_9fa48("10847") ? true : (stryCov_9fa48("10847", "10848", "10849"), action.kind === (stryMutAct_9fa48("10850") ? "" : (stryCov_9fa48("10850"), "reject"))))));
  }
}

/** Extract split identity public-key fields from step actions; null when no `use-fields`. */
export function identityPublicKeyFieldsFromActions(actions: ReadonlyArray<SplitIdentityPublicKeyAction>): IdentityPublicKeyMaterial | null {
  if (stryMutAct_9fa48("10851")) {
    {}
  } else {
    stryCov_9fa48("10851");
    const action = actions.find(stryMutAct_9fa48("10852") ? () => undefined : (stryCov_9fa48("10852"), entry => stryMutAct_9fa48("10855") ? entry.kind !== "use-fields" : stryMutAct_9fa48("10854") ? false : stryMutAct_9fa48("10853") ? true : (stryCov_9fa48("10853", "10854", "10855"), entry.kind === (stryMutAct_9fa48("10856") ? "" : (stryCov_9fa48("10856"), "use-fields")))));
    return (stryMutAct_9fa48("10859") ? action?.kind !== "use-fields" : stryMutAct_9fa48("10858") ? false : stryMutAct_9fa48("10857") ? true : (stryCov_9fa48("10857", "10858", "10859"), (stryMutAct_9fa48("10860") ? action.kind : (stryCov_9fa48("10860"), action?.kind)) === (stryMutAct_9fa48("10861") ? "" : (stryCov_9fa48("10861"), "use-fields")))) ? action.fields : null;
  }
}