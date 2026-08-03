/**
 * Pure RNS link session-key derivation from an ECDH shared secret.
 * ECDH itself stays at the adapter edge; this owns length selection + HKDF.
 * Derive conclusions leave via machine actions (no ad-hoc `deriveRnsLinkKey`
 * / `orderIndependentSharedSecret` reads beside the step).
 * Mode-enabled / expected-mode gates conclude via machine actions (no ad-hoc
 * `isLinkModeEnabled` / `isExpectedLinkMode` reads beside the step).
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
import { initialRnsHkdfSha256State, rnsHkdfSha256, rnsHkdfSha256RawFromActions, shouldRejectRnsHkdfSha256, shouldUseRnsHkdfSha256, stepRnsHkdfSha256WithActions } from "./rns-hkdf.js";

/** Mirrors RNS/Link.py link mode constants used for key length. */
export const LinkKeyMode = {
  MODE_AES128_CBC: 0x00,
  MODE_AES256_CBC: 0x01,
  MODE_AES256_GCM: 0x02
} as const;
export type LinkKeyModeValue = (typeof LinkKeyMode)[keyof typeof LinkKeyMode];

/** RNS Link.mode naming alias. */
export const LinkMode = LinkKeyMode;
export type LinkModeValue = LinkKeyModeValue;
export const LINK_MODE_DEFAULT: LinkKeyModeValue = LinkKeyMode.MODE_AES256_CBC;
// Accept AES-128 as well: Python RNS defaults to MODE_AES128_CBC when initiating.
export const LINK_ENABLED_MODES: ReadonlyArray<LinkKeyModeValue> = stryMutAct_9fa48("15388") ? [] : (stryCov_9fa48("15388"), [LinkKeyMode.MODE_AES128_CBC, LinkKeyMode.MODE_AES256_CBC]);

/** Whether a link mode is in the currently enabled set. */
export function isLinkModeEnabled(mode: LinkKeyModeValue | number): boolean {
  if (stryMutAct_9fa48("15389")) {
    {}
  } else {
    stryCov_9fa48("15389");
    return (LINK_ENABLED_MODES as ReadonlyArray<number>).includes(mode);
  }
}

/**
 * isLinkModeEnabled gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkModeEnabled` reads beside
 * the step).
 */
export type LinkModeEnabledState = Record<string, never>;
export type LinkModeEnabledEvent = Event | {
  readonly kind: "link/mode-enabled-gate";
  readonly mode: LinkKeyModeValue | number;
};
export type LinkModeEnabledAction = {
  readonly kind: "enabled";
} | {
  readonly kind: "disabled";
};
export interface LinkModeEnabledStepResult {
  readonly state: LinkModeEnabledState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkModeEnabledAction[];
}
export function initialLinkModeEnabledState(): LinkModeEnabledState {
  if (stryMutAct_9fa48("15390")) {
    {}
  } else {
    stryCov_9fa48("15390");
    return {};
  }
}
export function stepLinkModeEnabledWithActions(state: LinkModeEnabledState, event: LinkModeEnabledEvent): LinkModeEnabledStepResult {
  if (stryMutAct_9fa48("15391")) {
    {}
  } else {
    stryCov_9fa48("15391");
    if (stryMutAct_9fa48("15394") ? event.kind !== "link/mode-enabled-gate" : stryMutAct_9fa48("15393") ? false : stryMutAct_9fa48("15392") ? true : (stryCov_9fa48("15392", "15393", "15394"), event.kind === (stryMutAct_9fa48("15395") ? "" : (stryCov_9fa48("15395"), "link/mode-enabled-gate")))) {
      if (stryMutAct_9fa48("15396")) {
        {}
      } else {
        stryCov_9fa48("15396");
        return stryMutAct_9fa48("15397") ? {} : (stryCov_9fa48("15397"), {
          state,
          intents: stryMutAct_9fa48("15398") ? ["Stryker was here"] : (stryCov_9fa48("15398"), []),
          actions: stryMutAct_9fa48("15399") ? [] : (stryCov_9fa48("15399"), [stryMutAct_9fa48("15400") ? {} : (stryCov_9fa48("15400"), {
            kind: isLinkModeEnabled(event.mode) ? stryMutAct_9fa48("15401") ? "" : (stryCov_9fa48("15401"), "enabled") : stryMutAct_9fa48("15402") ? "" : (stryCov_9fa48("15402"), "disabled")
          })])
        });
      }
    }
    return stryMutAct_9fa48("15403") ? {} : (stryCov_9fa48("15403"), {
      state,
      intents: stryMutAct_9fa48("15404") ? ["Stryker was here"] : (stryCov_9fa48("15404"), []),
      actions: stryMutAct_9fa48("15405") ? ["Stryker was here"] : (stryCov_9fa48("15405"), [])
    });
  }
}
export function shouldTreatLinkModeEnabled(actions: ReadonlyArray<LinkModeEnabledAction>): boolean {
  if (stryMutAct_9fa48("15406")) {
    {}
  } else {
    stryCov_9fa48("15406");
    return stryMutAct_9fa48("15407") ? actions.every(action => action.kind === "enabled") : (stryCov_9fa48("15407"), actions.some(stryMutAct_9fa48("15408") ? () => undefined : (stryCov_9fa48("15408"), action => stryMutAct_9fa48("15411") ? action.kind !== "enabled" : stryMutAct_9fa48("15410") ? false : stryMutAct_9fa48("15409") ? true : (stryCov_9fa48("15409", "15410", "15411"), action.kind === (stryMutAct_9fa48("15412") ? "" : (stryCov_9fa48("15412"), "enabled"))))));
  }
}
export function shouldTreatLinkModeDisabled(actions: ReadonlyArray<LinkModeEnabledAction>): boolean {
  if (stryMutAct_9fa48("15413")) {
    {}
  } else {
    stryCov_9fa48("15413");
    return stryMutAct_9fa48("15414") ? actions.every(action => action.kind === "disabled") : (stryCov_9fa48("15414"), actions.some(stryMutAct_9fa48("15415") ? () => undefined : (stryCov_9fa48("15415"), action => stryMutAct_9fa48("15418") ? action.kind !== "disabled" : stryMutAct_9fa48("15417") ? false : stryMutAct_9fa48("15416") ? true : (stryCov_9fa48("15416", "15417", "15418"), action.kind === (stryMutAct_9fa48("15419") ? "" : (stryCov_9fa48("15419"), "disabled"))))));
  }
}

/** Whether a received link-proof mode matches the expected session mode. */
export function isExpectedLinkMode(input: {
  readonly expected: LinkKeyModeValue | number;
  readonly received: LinkKeyModeValue | number;
}): boolean {
  if (stryMutAct_9fa48("15420")) {
    {}
  } else {
    stryCov_9fa48("15420");
    return stryMutAct_9fa48("15423") ? input.expected !== input.received : stryMutAct_9fa48("15422") ? false : stryMutAct_9fa48("15421") ? true : (stryCov_9fa48("15421", "15422", "15423"), input.expected === input.received);
  }
}

/**
 * isExpectedLinkMode gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isExpectedLinkMode` reads beside
 * the step).
 */
export type ExpectedLinkModeState = Record<string, never>;
export type ExpectedLinkModeEvent = Event | {
  readonly kind: "link/expected-mode-gate";
  readonly expected: LinkKeyModeValue | number;
  readonly received: LinkKeyModeValue | number;
};
export type ExpectedLinkModeAction = {
  readonly kind: "match";
} | {
  readonly kind: "mismatch";
};
export interface ExpectedLinkModeStepResult {
  readonly state: ExpectedLinkModeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ExpectedLinkModeAction[];
}
export function initialExpectedLinkModeState(): ExpectedLinkModeState {
  if (stryMutAct_9fa48("15424")) {
    {}
  } else {
    stryCov_9fa48("15424");
    return {};
  }
}
export function stepExpectedLinkModeWithActions(state: ExpectedLinkModeState, event: ExpectedLinkModeEvent): ExpectedLinkModeStepResult {
  if (stryMutAct_9fa48("15425")) {
    {}
  } else {
    stryCov_9fa48("15425");
    if (stryMutAct_9fa48("15428") ? event.kind !== "link/expected-mode-gate" : stryMutAct_9fa48("15427") ? false : stryMutAct_9fa48("15426") ? true : (stryCov_9fa48("15426", "15427", "15428"), event.kind === (stryMutAct_9fa48("15429") ? "" : (stryCov_9fa48("15429"), "link/expected-mode-gate")))) {
      if (stryMutAct_9fa48("15430")) {
        {}
      } else {
        stryCov_9fa48("15430");
        return stryMutAct_9fa48("15431") ? {} : (stryCov_9fa48("15431"), {
          state,
          intents: stryMutAct_9fa48("15432") ? ["Stryker was here"] : (stryCov_9fa48("15432"), []),
          actions: stryMutAct_9fa48("15433") ? [] : (stryCov_9fa48("15433"), [stryMutAct_9fa48("15434") ? {} : (stryCov_9fa48("15434"), {
            kind: isExpectedLinkMode(stryMutAct_9fa48("15435") ? {} : (stryCov_9fa48("15435"), {
              expected: event.expected,
              received: event.received
            })) ? stryMutAct_9fa48("15436") ? "" : (stryCov_9fa48("15436"), "match") : stryMutAct_9fa48("15437") ? "" : (stryCov_9fa48("15437"), "mismatch")
          })])
        });
      }
    }
    return stryMutAct_9fa48("15438") ? {} : (stryCov_9fa48("15438"), {
      state,
      intents: stryMutAct_9fa48("15439") ? ["Stryker was here"] : (stryCov_9fa48("15439"), []),
      actions: stryMutAct_9fa48("15440") ? ["Stryker was here"] : (stryCov_9fa48("15440"), [])
    });
  }
}
export function shouldMatchExpectedLinkMode(actions: ReadonlyArray<ExpectedLinkModeAction>): boolean {
  if (stryMutAct_9fa48("15441")) {
    {}
  } else {
    stryCov_9fa48("15441");
    return stryMutAct_9fa48("15442") ? actions.every(action => action.kind === "match") : (stryCov_9fa48("15442"), actions.some(stryMutAct_9fa48("15443") ? () => undefined : (stryCov_9fa48("15443"), action => stryMutAct_9fa48("15446") ? action.kind !== "match" : stryMutAct_9fa48("15445") ? false : stryMutAct_9fa48("15444") ? true : (stryCov_9fa48("15444", "15445", "15446"), action.kind === (stryMutAct_9fa48("15447") ? "" : (stryCov_9fa48("15447"), "match"))))));
  }
}
export function shouldMismatchExpectedLinkMode(actions: ReadonlyArray<ExpectedLinkModeAction>): boolean {
  if (stryMutAct_9fa48("15448")) {
    {}
  } else {
    stryCov_9fa48("15448");
    return stryMutAct_9fa48("15449") ? actions.every(action => action.kind === "mismatch") : (stryCov_9fa48("15449"), actions.some(stryMutAct_9fa48("15450") ? () => undefined : (stryCov_9fa48("15450"), action => stryMutAct_9fa48("15453") ? action.kind !== "mismatch" : stryMutAct_9fa48("15452") ? false : stryMutAct_9fa48("15451") ? true : (stryCov_9fa48("15451", "15452", "15453"), action.kind === (stryMutAct_9fa48("15454") ? "" : (stryCov_9fa48("15454"), "mismatch"))))));
  }
}
export function linkDerivedKeyLength(mode: LinkKeyModeValue | number): number {
  if (stryMutAct_9fa48("15455")) {
    {}
  } else {
    stryCov_9fa48("15455");
    return (stryMutAct_9fa48("15458") ? mode !== LinkKeyMode.MODE_AES256_CBC : stryMutAct_9fa48("15457") ? false : stryMutAct_9fa48("15456") ? true : (stryCov_9fa48("15456", "15457", "15458"), mode === LinkKeyMode.MODE_AES256_CBC)) ? 64 : 32;
  }
}
export function deriveRnsLinkKey(sharedSecret: Uint8Array, linkId: Uint8Array, mode: LinkKeyModeValue | number = LinkKeyMode.MODE_AES256_CBC): Uint8Array {
  if (stryMutAct_9fa48("15459")) {
    {}
  } else {
    stryCov_9fa48("15459");
    return rnsHkdfSha256(stryMutAct_9fa48("15460") ? {} : (stryCov_9fa48("15460"), {
      length: linkDerivedKeyLength(mode),
      deriveFrom: sharedSecret,
      salt: linkId,
      context: null
    }));
  }
}

/**
 * Build an order-independent shared secret from two peer materials (sim / tests).
 * Not wire ECDH — adapters should supply real X25519 shared secrets on the wire path.
 */
export function orderIndependentSharedSecret(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("15461")) {
    {}
  } else {
    stryCov_9fa48("15461");
    const leftFirst = stryMutAct_9fa48("15465") ? compareBytes(a, b) > 0 : stryMutAct_9fa48("15464") ? compareBytes(a, b) < 0 : stryMutAct_9fa48("15463") ? false : stryMutAct_9fa48("15462") ? true : (stryCov_9fa48("15462", "15463", "15464", "15465"), compareBytes(a, b) <= 0);
    const first = leftFirst ? a : b;
    const second = leftFirst ? b : a;
    const joined = new Uint8Array(stryMutAct_9fa48("15466") ? first.length - second.length : (stryCov_9fa48("15466"), first.length + second.length));
    joined.set(first, 0);
    joined.set(second, first.length);
    return rnsHkdfSha256(stryMutAct_9fa48("15467") ? {} : (stryCov_9fa48("15467"), {
      length: 32,
      deriveFrom: joined,
      salt: new Uint8Array(32),
      context: SIM_ECDH_CONTEXT
    }));
  }
}

/** ASCII "twistedpear-sim-ecdh" — avoids TextEncoder (no DOM in protocol tsconfig). */
const SIM_ECDH_CONTEXT = Uint8Array.from(stryMutAct_9fa48("15468") ? [] : (stryCov_9fa48("15468"), [116, 119, 105, 115, 116, 101, 100, 112, 101, 97, 114, 45, 115, 105, 109, 45, 101, 99, 100, 104]));
function compareBytes(left: Uint8Array, right: Uint8Array): number {
  if (stryMutAct_9fa48("15469")) {
    {}
  } else {
    stryCov_9fa48("15469");
    const n = stryMutAct_9fa48("15470") ? Math.max(left.length, right.length) : (stryCov_9fa48("15470"), Math.min(left.length, right.length));
    for (let i = 0; stryMutAct_9fa48("15473") ? i >= n : stryMutAct_9fa48("15472") ? i <= n : stryMutAct_9fa48("15471") ? false : (stryCov_9fa48("15471", "15472", "15473"), i < n); stryMutAct_9fa48("15474") ? i -= 1 : (stryCov_9fa48("15474"), i += 1)) {
      if (stryMutAct_9fa48("15475")) {
        {}
      } else {
        stryCov_9fa48("15475");
        const d = stryMutAct_9fa48("15476") ? (left[i] ?? 0) + (right[i] ?? 0) : (stryCov_9fa48("15476"), (stryMutAct_9fa48("15477") ? left[i] && 0 : (stryCov_9fa48("15477"), left[i] ?? 0)) - (stryMutAct_9fa48("15478") ? right[i] && 0 : (stryCov_9fa48("15478"), right[i] ?? 0)));
        if (stryMutAct_9fa48("15481") ? d === 0 : stryMutAct_9fa48("15480") ? false : stryMutAct_9fa48("15479") ? true : (stryCov_9fa48("15479", "15480", "15481"), d !== 0)) {
          if (stryMutAct_9fa48("15482")) {
            {}
          } else {
            stryCov_9fa48("15482");
            return d;
          }
        }
      }
    }
    return stryMutAct_9fa48("15483") ? left.length + right.length : (stryCov_9fa48("15483"), left.length - right.length);
  }
}

/**
 * Link session-key derive is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `deriveRnsLinkKey` reads
 * beside the step). Empty shared-secret / invalid length become `reject`.
 */
export type DeriveRnsLinkKeyState = Record<string, never>;
export type DeriveRnsLinkKeyEvent = Event | {
  readonly kind: "link-key/derive-gate";
  readonly sharedSecret: Uint8Array;
  readonly linkId: Uint8Array;
  readonly mode?: LinkKeyModeValue | number;
};
export type DeriveRnsLinkKeyAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface DeriveRnsLinkKeyStepResult {
  readonly state: DeriveRnsLinkKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeriveRnsLinkKeyAction[];
}
export function initialDeriveRnsLinkKeyState(): DeriveRnsLinkKeyState {
  if (stryMutAct_9fa48("15484")) {
    {}
  } else {
    stryCov_9fa48("15484");
    return {};
  }
}
export function stepDeriveRnsLinkKeyWithActions(state: DeriveRnsLinkKeyState, event: DeriveRnsLinkKeyEvent): DeriveRnsLinkKeyStepResult {
  if (stryMutAct_9fa48("15485")) {
    {}
  } else {
    stryCov_9fa48("15485");
    if (stryMutAct_9fa48("15488") ? event.kind !== "link-key/derive-gate" : stryMutAct_9fa48("15487") ? false : stryMutAct_9fa48("15486") ? true : (stryCov_9fa48("15486", "15487", "15488"), event.kind === (stryMutAct_9fa48("15489") ? "" : (stryCov_9fa48("15489"), "link-key/derive-gate")))) {
      if (stryMutAct_9fa48("15490")) {
        {}
      } else {
        stryCov_9fa48("15490");
        const mode = stryMutAct_9fa48("15491") ? event.mode && LinkKeyMode.MODE_AES256_CBC : (stryCov_9fa48("15491"), event.mode ?? LinkKeyMode.MODE_AES256_CBC);
        const hkdf = stepRnsHkdfSha256WithActions(initialRnsHkdfSha256State(), stryMutAct_9fa48("15492") ? {} : (stryCov_9fa48("15492"), {
          kind: stryMutAct_9fa48("15493") ? "" : (stryCov_9fa48("15493"), "rns-hkdf/derive-gate"),
          length: linkDerivedKeyLength(mode),
          deriveFrom: event.sharedSecret,
          salt: event.linkId,
          context: null
        }));
        if (stryMutAct_9fa48("15496") ? shouldRejectRnsHkdfSha256(hkdf.actions) && !shouldUseRnsHkdfSha256(hkdf.actions) : stryMutAct_9fa48("15495") ? false : stryMutAct_9fa48("15494") ? true : (stryCov_9fa48("15494", "15495", "15496"), shouldRejectRnsHkdfSha256(hkdf.actions) || (stryMutAct_9fa48("15497") ? shouldUseRnsHkdfSha256(hkdf.actions) : (stryCov_9fa48("15497"), !shouldUseRnsHkdfSha256(hkdf.actions))))) {
          if (stryMutAct_9fa48("15498")) {
            {}
          } else {
            stryCov_9fa48("15498");
            return stryMutAct_9fa48("15499") ? {} : (stryCov_9fa48("15499"), {
              state,
              intents: stryMutAct_9fa48("15500") ? ["Stryker was here"] : (stryCov_9fa48("15500"), []),
              actions: stryMutAct_9fa48("15501") ? [] : (stryCov_9fa48("15501"), [stryMutAct_9fa48("15502") ? {} : (stryCov_9fa48("15502"), {
                kind: stryMutAct_9fa48("15503") ? "" : (stryCov_9fa48("15503"), "reject")
              })])
            });
          }
        }
        const raw = rnsHkdfSha256RawFromActions(hkdf.actions);
        if (stryMutAct_9fa48("15506") ? raw !== null : stryMutAct_9fa48("15505") ? false : stryMutAct_9fa48("15504") ? true : (stryCov_9fa48("15504", "15505", "15506"), raw === null)) {
          if (stryMutAct_9fa48("15507")) {
            {}
          } else {
            stryCov_9fa48("15507");
            return stryMutAct_9fa48("15508") ? {} : (stryCov_9fa48("15508"), {
              state,
              intents: stryMutAct_9fa48("15509") ? ["Stryker was here"] : (stryCov_9fa48("15509"), []),
              actions: stryMutAct_9fa48("15510") ? [] : (stryCov_9fa48("15510"), [stryMutAct_9fa48("15511") ? {} : (stryCov_9fa48("15511"), {
                kind: stryMutAct_9fa48("15512") ? "" : (stryCov_9fa48("15512"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("15513") ? {} : (stryCov_9fa48("15513"), {
          state,
          intents: stryMutAct_9fa48("15514") ? ["Stryker was here"] : (stryCov_9fa48("15514"), []),
          actions: stryMutAct_9fa48("15515") ? [] : (stryCov_9fa48("15515"), [stryMutAct_9fa48("15516") ? {} : (stryCov_9fa48("15516"), {
            kind: stryMutAct_9fa48("15517") ? "" : (stryCov_9fa48("15517"), "use-raw"),
            raw
          })])
        });
      }
    }
    return stryMutAct_9fa48("15518") ? {} : (stryCov_9fa48("15518"), {
      state,
      intents: stryMutAct_9fa48("15519") ? ["Stryker was here"] : (stryCov_9fa48("15519"), []),
      actions: stryMutAct_9fa48("15520") ? ["Stryker was here"] : (stryCov_9fa48("15520"), [])
    });
  }
}
export function shouldUseDeriveRnsLinkKey(actions: ReadonlyArray<DeriveRnsLinkKeyAction>): boolean {
  if (stryMutAct_9fa48("15521")) {
    {}
  } else {
    stryCov_9fa48("15521");
    return stryMutAct_9fa48("15522") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("15522"), actions.some(stryMutAct_9fa48("15523") ? () => undefined : (stryCov_9fa48("15523"), action => stryMutAct_9fa48("15526") ? action.kind !== "use-raw" : stryMutAct_9fa48("15525") ? false : stryMutAct_9fa48("15524") ? true : (stryCov_9fa48("15524", "15525", "15526"), action.kind === (stryMutAct_9fa48("15527") ? "" : (stryCov_9fa48("15527"), "use-raw"))))));
  }
}
export function shouldRejectDeriveRnsLinkKey(actions: ReadonlyArray<DeriveRnsLinkKeyAction>): boolean {
  if (stryMutAct_9fa48("15528")) {
    {}
  } else {
    stryCov_9fa48("15528");
    return stryMutAct_9fa48("15529") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("15529"), actions.some(stryMutAct_9fa48("15530") ? () => undefined : (stryCov_9fa48("15530"), action => stryMutAct_9fa48("15533") ? action.kind !== "reject" : stryMutAct_9fa48("15532") ? false : stryMutAct_9fa48("15531") ? true : (stryCov_9fa48("15531", "15532", "15533"), action.kind === (stryMutAct_9fa48("15534") ? "" : (stryCov_9fa48("15534"), "reject"))))));
  }
}

/** Extract derived link key from step actions; null when no `use-raw`. */
export function deriveRnsLinkKeyRawFromActions(actions: ReadonlyArray<DeriveRnsLinkKeyAction>): Uint8Array | null {
  if (stryMutAct_9fa48("15535")) {
    {}
  } else {
    stryCov_9fa48("15535");
    const action = actions.find(stryMutAct_9fa48("15536") ? () => undefined : (stryCov_9fa48("15536"), entry => stryMutAct_9fa48("15539") ? entry.kind !== "use-raw" : stryMutAct_9fa48("15538") ? false : stryMutAct_9fa48("15537") ? true : (stryCov_9fa48("15537", "15538", "15539"), entry.kind === (stryMutAct_9fa48("15540") ? "" : (stryCov_9fa48("15540"), "use-raw")))));
    return (stryMutAct_9fa48("15543") ? action?.kind !== "use-raw" : stryMutAct_9fa48("15542") ? false : stryMutAct_9fa48("15541") ? true : (stryCov_9fa48("15541", "15542", "15543"), (stryMutAct_9fa48("15544") ? action.kind : (stryCov_9fa48("15544"), action?.kind)) === (stryMutAct_9fa48("15545") ? "" : (stryCov_9fa48("15545"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Order-independent shared-secret framing is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `orderIndependentSharedSecret` reads beside the step). Empty joined material
 * becomes `reject`.
 */
export type OrderIndependentSharedSecretState = Record<string, never>;
export type OrderIndependentSharedSecretEvent = Event | {
  readonly kind: "link-key/order-independent-shared-secret-gate";
  readonly a: Uint8Array;
  readonly b: Uint8Array;
};
export type OrderIndependentSharedSecretAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface OrderIndependentSharedSecretStepResult {
  readonly state: OrderIndependentSharedSecretState;
  readonly intents: readonly Intent[];
  readonly actions: readonly OrderIndependentSharedSecretAction[];
}
export function initialOrderIndependentSharedSecretState(): OrderIndependentSharedSecretState {
  if (stryMutAct_9fa48("15546")) {
    {}
  } else {
    stryCov_9fa48("15546");
    return {};
  }
}
export function stepOrderIndependentSharedSecretWithActions(state: OrderIndependentSharedSecretState, event: OrderIndependentSharedSecretEvent): OrderIndependentSharedSecretStepResult {
  if (stryMutAct_9fa48("15547")) {
    {}
  } else {
    stryCov_9fa48("15547");
    if (stryMutAct_9fa48("15550") ? event.kind !== "link-key/order-independent-shared-secret-gate" : stryMutAct_9fa48("15549") ? false : stryMutAct_9fa48("15548") ? true : (stryCov_9fa48("15548", "15549", "15550"), event.kind === (stryMutAct_9fa48("15551") ? "" : (stryCov_9fa48("15551"), "link-key/order-independent-shared-secret-gate")))) {
      if (stryMutAct_9fa48("15552")) {
        {}
      } else {
        stryCov_9fa48("15552");
        try {
          if (stryMutAct_9fa48("15553")) {
            {}
          } else {
            stryCov_9fa48("15553");
            return stryMutAct_9fa48("15554") ? {} : (stryCov_9fa48("15554"), {
              state,
              intents: stryMutAct_9fa48("15555") ? ["Stryker was here"] : (stryCov_9fa48("15555"), []),
              actions: stryMutAct_9fa48("15556") ? [] : (stryCov_9fa48("15556"), [stryMutAct_9fa48("15557") ? {} : (stryCov_9fa48("15557"), {
                kind: stryMutAct_9fa48("15558") ? "" : (stryCov_9fa48("15558"), "use-raw"),
                raw: orderIndependentSharedSecret(event.a, event.b)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("15559")) {
            {}
          } else {
            stryCov_9fa48("15559");
            return stryMutAct_9fa48("15560") ? {} : (stryCov_9fa48("15560"), {
              state,
              intents: stryMutAct_9fa48("15561") ? ["Stryker was here"] : (stryCov_9fa48("15561"), []),
              actions: stryMutAct_9fa48("15562") ? [] : (stryCov_9fa48("15562"), [stryMutAct_9fa48("15563") ? {} : (stryCov_9fa48("15563"), {
                kind: stryMutAct_9fa48("15564") ? "" : (stryCov_9fa48("15564"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("15565") ? {} : (stryCov_9fa48("15565"), {
      state,
      intents: stryMutAct_9fa48("15566") ? ["Stryker was here"] : (stryCov_9fa48("15566"), []),
      actions: stryMutAct_9fa48("15567") ? ["Stryker was here"] : (stryCov_9fa48("15567"), [])
    });
  }
}
export function shouldUseOrderIndependentSharedSecret(actions: ReadonlyArray<OrderIndependentSharedSecretAction>): boolean {
  if (stryMutAct_9fa48("15568")) {
    {}
  } else {
    stryCov_9fa48("15568");
    return stryMutAct_9fa48("15569") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("15569"), actions.some(stryMutAct_9fa48("15570") ? () => undefined : (stryCov_9fa48("15570"), action => stryMutAct_9fa48("15573") ? action.kind !== "use-raw" : stryMutAct_9fa48("15572") ? false : stryMutAct_9fa48("15571") ? true : (stryCov_9fa48("15571", "15572", "15573"), action.kind === (stryMutAct_9fa48("15574") ? "" : (stryCov_9fa48("15574"), "use-raw"))))));
  }
}
export function shouldRejectOrderIndependentSharedSecret(actions: ReadonlyArray<OrderIndependentSharedSecretAction>): boolean {
  if (stryMutAct_9fa48("15575")) {
    {}
  } else {
    stryCov_9fa48("15575");
    return stryMutAct_9fa48("15576") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("15576"), actions.some(stryMutAct_9fa48("15577") ? () => undefined : (stryCov_9fa48("15577"), action => stryMutAct_9fa48("15580") ? action.kind !== "reject" : stryMutAct_9fa48("15579") ? false : stryMutAct_9fa48("15578") ? true : (stryCov_9fa48("15578", "15579", "15580"), action.kind === (stryMutAct_9fa48("15581") ? "" : (stryCov_9fa48("15581"), "reject"))))));
  }
}

/** Extract shared secret from step actions; null when no `use-raw`. */
export function orderIndependentSharedSecretRawFromActions(actions: ReadonlyArray<OrderIndependentSharedSecretAction>): Uint8Array | null {
  if (stryMutAct_9fa48("15582")) {
    {}
  } else {
    stryCov_9fa48("15582");
    const action = actions.find(stryMutAct_9fa48("15583") ? () => undefined : (stryCov_9fa48("15583"), entry => stryMutAct_9fa48("15586") ? entry.kind !== "use-raw" : stryMutAct_9fa48("15585") ? false : stryMutAct_9fa48("15584") ? true : (stryCov_9fa48("15584", "15585", "15586"), entry.kind === (stryMutAct_9fa48("15587") ? "" : (stryCov_9fa48("15587"), "use-raw")))));
    return (stryMutAct_9fa48("15590") ? action?.kind !== "use-raw" : stryMutAct_9fa48("15589") ? false : stryMutAct_9fa48("15588") ? true : (stryCov_9fa48("15588", "15589", "15590"), (stryMutAct_9fa48("15591") ? action.kind : (stryCov_9fa48("15591"), action?.kind)) === (stryMutAct_9fa48("15592") ? "" : (stryCov_9fa48("15592"), "use-raw")))) ? action.raw : null;
  }
}