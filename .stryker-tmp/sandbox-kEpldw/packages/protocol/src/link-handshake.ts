/**
 * Pure sim-oriented link crypto handshake.
 * Key material arrives only via events (adapters supply entropy or ECDH shared secrets);
 * derivation uses RNS HKDF via {@link stepDeriveRnsLinkKeyWithActions}.
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
import { LinkKeyMode, deriveRnsLinkKeyRawFromActions, initialDeriveRnsLinkKeyState, initialOrderIndependentSharedSecretState, orderIndependentSharedSecretRawFromActions, shouldRejectDeriveRnsLinkKey, shouldRejectOrderIndependentSharedSecret, shouldUseDeriveRnsLinkKey, shouldUseOrderIndependentSharedSecret, stepDeriveRnsLinkKeyWithActions, stepOrderIndependentSharedSecretWithActions } from "./link-key-derive.js";
export const LINK_HANDSHAKE_KEY_SIZE = 32;
export const LinkHandshakePhase = {
  IDLE: 0,
  AWAITING_PEER: 1,
  ESTABLISHED: 2,
  FAILED: 3
} as const;
export type LinkHandshakePhaseValue = (typeof LinkHandshakePhase)[keyof typeof LinkHandshakePhase];
export interface LinkHandshakeState {
  readonly role: "initiator" | "responder";
  readonly peerId: string;
  readonly phase: LinkHandshakePhaseValue;
  readonly localMaterial: Uint8Array | null;
  readonly peerMaterial: Uint8Array | null;
  readonly linkId: Uint8Array | null;
  readonly sessionKey: Uint8Array | null;
}
export type LinkHandshakeEvent = Event | {
  readonly kind: "handshake/begin";
  readonly at: number;
  /** Injected entropy bytes — must be LINK_HANDSHAKE_KEY_SIZE. */
  readonly entropy: Uint8Array;
  readonly linkId: Uint8Array;
} | {
  readonly kind: "handshake/peer-material";
  readonly material: Uint8Array;
  readonly linkId: Uint8Array;
} | {
  /** Adapter-supplied real ECDH shared secret (wire path). */
  readonly kind: "handshake/shared-secret";
  readonly sharedSecret: Uint8Array;
  readonly linkId: Uint8Array;
  readonly mode?: number;
} | {
  readonly kind: "handshake/fail";
};
export type LinkHandshakeAction = {
  readonly kind: "send-material";
  readonly peerId: string;
  readonly material: Uint8Array;
  readonly linkId: Uint8Array;
};
export interface LinkHandshakeStepResult {
  readonly state: LinkHandshakeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkHandshakeAction[];
}
export function initialLinkHandshakeState(options: {
  readonly role: "initiator" | "responder";
  readonly peerId: string;
}): LinkHandshakeState {
  if (stryMutAct_9fa48("14722")) {
    {}
  } else {
    stryCov_9fa48("14722");
    return stryMutAct_9fa48("14723") ? {} : (stryCov_9fa48("14723"), {
      role: options.role,
      peerId: options.peerId,
      phase: LinkHandshakePhase.IDLE,
      localMaterial: null,
      peerMaterial: null,
      linkId: null,
      sessionKey: null
    });
  }
}

/**
 * Commutative sim key derivation via order-independent shared secret + RNS HKDF.
 * Not wire ECDH — adapters should inject `handshake/shared-secret` for real X25519.
 * Conclusions leave via machine actions (no ad-hoc `orderIndependentSharedSecret` /
 * `deriveRnsLinkKey` reads beside the step).
 */
export function deriveSimSessionKey(localMaterial: Uint8Array, peerMaterial: Uint8Array, linkId: Uint8Array, mode: number = LinkKeyMode.MODE_AES256_CBC): Uint8Array {
  if (stryMutAct_9fa48("14724")) {
    {}
  } else {
    stryCov_9fa48("14724");
    const sharedStepped = stepOrderIndependentSharedSecretWithActions(initialOrderIndependentSharedSecretState(), stryMutAct_9fa48("14725") ? {} : (stryCov_9fa48("14725"), {
      kind: stryMutAct_9fa48("14726") ? "" : (stryCov_9fa48("14726"), "link-key/order-independent-shared-secret-gate"),
      a: localMaterial,
      b: peerMaterial
    }));
    const shared = orderIndependentSharedSecretRawFromActions(sharedStepped.actions);
    if (stryMutAct_9fa48("14729") ? (shouldRejectOrderIndependentSharedSecret(sharedStepped.actions) || !shouldUseOrderIndependentSharedSecret(sharedStepped.actions)) && shared === null : stryMutAct_9fa48("14728") ? false : stryMutAct_9fa48("14727") ? true : (stryCov_9fa48("14727", "14728", "14729"), (stryMutAct_9fa48("14731") ? shouldRejectOrderIndependentSharedSecret(sharedStepped.actions) && !shouldUseOrderIndependentSharedSecret(sharedStepped.actions) : stryMutAct_9fa48("14730") ? false : (stryCov_9fa48("14730", "14731"), shouldRejectOrderIndependentSharedSecret(sharedStepped.actions) || (stryMutAct_9fa48("14732") ? shouldUseOrderIndependentSharedSecret(sharedStepped.actions) : (stryCov_9fa48("14732"), !shouldUseOrderIndependentSharedSecret(sharedStepped.actions))))) || (stryMutAct_9fa48("14734") ? shared !== null : stryMutAct_9fa48("14733") ? false : (stryCov_9fa48("14733", "14734"), shared === null)))) {
      if (stryMutAct_9fa48("14735")) {
        {}
      } else {
        stryCov_9fa48("14735");
        throw new Error(stryMutAct_9fa48("14736") ? "" : (stryCov_9fa48("14736"), "Cannot derive key from empty input material"));
      }
    }
    const derived = stepDeriveRnsLinkKeyWithActions(initialDeriveRnsLinkKeyState(), stryMutAct_9fa48("14737") ? {} : (stryCov_9fa48("14737"), {
      kind: stryMutAct_9fa48("14738") ? "" : (stryCov_9fa48("14738"), "link-key/derive-gate"),
      sharedSecret: shared,
      linkId,
      mode
    }));
    const key = deriveRnsLinkKeyRawFromActions(derived.actions);
    if (stryMutAct_9fa48("14741") ? (shouldRejectDeriveRnsLinkKey(derived.actions) || !shouldUseDeriveRnsLinkKey(derived.actions)) && key === null : stryMutAct_9fa48("14740") ? false : stryMutAct_9fa48("14739") ? true : (stryCov_9fa48("14739", "14740", "14741"), (stryMutAct_9fa48("14743") ? shouldRejectDeriveRnsLinkKey(derived.actions) && !shouldUseDeriveRnsLinkKey(derived.actions) : stryMutAct_9fa48("14742") ? false : (stryCov_9fa48("14742", "14743"), shouldRejectDeriveRnsLinkKey(derived.actions) || (stryMutAct_9fa48("14744") ? shouldUseDeriveRnsLinkKey(derived.actions) : (stryCov_9fa48("14744"), !shouldUseDeriveRnsLinkKey(derived.actions))))) || (stryMutAct_9fa48("14746") ? key !== null : stryMutAct_9fa48("14745") ? false : (stryCov_9fa48("14745", "14746"), key === null)))) {
      if (stryMutAct_9fa48("14747")) {
        {}
      } else {
        stryCov_9fa48("14747");
        throw new Error(stryMutAct_9fa48("14748") ? "" : (stryCov_9fa48("14748"), "Cannot derive key from empty input material"));
      }
    }
    return key;
  }
}
export const stepLinkHandshake: StepFn<LinkHandshakeState> = (state, event) => {
  if (stryMutAct_9fa48("14749")) {
    {}
  } else {
    stryCov_9fa48("14749");
    const result = stepLinkHandshakeWithActions(state, event as LinkHandshakeEvent);
    return stryMutAct_9fa48("14750") ? {} : (stryCov_9fa48("14750"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkHandshakeWithActions(state: LinkHandshakeState, event: LinkHandshakeEvent): LinkHandshakeStepResult {
  if (stryMutAct_9fa48("14751")) {
    {}
  } else {
    stryCov_9fa48("14751");
    if (stryMutAct_9fa48("14754") ? event.kind !== "handshake/fail" : stryMutAct_9fa48("14753") ? false : stryMutAct_9fa48("14752") ? true : (stryCov_9fa48("14752", "14753", "14754"), event.kind === (stryMutAct_9fa48("14755") ? "" : (stryCov_9fa48("14755"), "handshake/fail")))) {
      if (stryMutAct_9fa48("14756")) {
        {}
      } else {
        stryCov_9fa48("14756");
        return stryMutAct_9fa48("14757") ? {} : (stryCov_9fa48("14757"), {
          state: stryMutAct_9fa48("14758") ? {} : (stryCov_9fa48("14758"), {
            ...state,
            phase: LinkHandshakePhase.FAILED,
            sessionKey: null
          }),
          intents: stryMutAct_9fa48("14759") ? ["Stryker was here"] : (stryCov_9fa48("14759"), []),
          actions: stryMutAct_9fa48("14760") ? ["Stryker was here"] : (stryCov_9fa48("14760"), [])
        });
      }
    }
    if (stryMutAct_9fa48("14763") ? event.kind !== "handshake/begin" : stryMutAct_9fa48("14762") ? false : stryMutAct_9fa48("14761") ? true : (stryCov_9fa48("14761", "14762", "14763"), event.kind === (stryMutAct_9fa48("14764") ? "" : (stryCov_9fa48("14764"), "handshake/begin")))) {
      if (stryMutAct_9fa48("14765")) {
        {}
      } else {
        stryCov_9fa48("14765");
        if (stryMutAct_9fa48("14769") ? event.entropy.length >= LINK_HANDSHAKE_KEY_SIZE : stryMutAct_9fa48("14768") ? event.entropy.length <= LINK_HANDSHAKE_KEY_SIZE : stryMutAct_9fa48("14767") ? false : stryMutAct_9fa48("14766") ? true : (stryCov_9fa48("14766", "14767", "14768", "14769"), event.entropy.length < LINK_HANDSHAKE_KEY_SIZE)) {
          if (stryMutAct_9fa48("14770")) {
            {}
          } else {
            stryCov_9fa48("14770");
            return stryMutAct_9fa48("14771") ? {} : (stryCov_9fa48("14771"), {
              state: stryMutAct_9fa48("14772") ? {} : (stryCov_9fa48("14772"), {
                ...state,
                phase: LinkHandshakePhase.FAILED
              }),
              intents: stryMutAct_9fa48("14773") ? ["Stryker was here"] : (stryCov_9fa48("14773"), []),
              actions: stryMutAct_9fa48("14774") ? ["Stryker was here"] : (stryCov_9fa48("14774"), [])
            });
          }
        }
        const localMaterial = event.entropy.subarray(0, LINK_HANDSHAKE_KEY_SIZE);
        const next: LinkHandshakeState = stryMutAct_9fa48("14775") ? {} : (stryCov_9fa48("14775"), {
          ...state,
          phase: LinkHandshakePhase.AWAITING_PEER,
          localMaterial: Uint8Array.from(localMaterial),
          linkId: Uint8Array.from(event.linkId),
          peerMaterial: null,
          sessionKey: null
        });
        return stryMutAct_9fa48("14776") ? {} : (stryCov_9fa48("14776"), {
          state: next,
          intents: stryMutAct_9fa48("14777") ? ["Stryker was here"] : (stryCov_9fa48("14777"), []),
          actions: stryMutAct_9fa48("14778") ? [] : (stryCov_9fa48("14778"), [stryMutAct_9fa48("14779") ? {} : (stryCov_9fa48("14779"), {
            kind: stryMutAct_9fa48("14780") ? "" : (stryCov_9fa48("14780"), "send-material"),
            peerId: state.peerId,
            material: next.localMaterial!,
            linkId: next.linkId!
          })])
        });
      }
    }
    if (stryMutAct_9fa48("14783") ? event.kind !== "handshake/shared-secret" : stryMutAct_9fa48("14782") ? false : stryMutAct_9fa48("14781") ? true : (stryCov_9fa48("14781", "14782", "14783"), event.kind === (stryMutAct_9fa48("14784") ? "" : (stryCov_9fa48("14784"), "handshake/shared-secret")))) {
      if (stryMutAct_9fa48("14785")) {
        {}
      } else {
        stryCov_9fa48("14785");
        const linkId = Uint8Array.from(event.linkId);
        const derived = stepDeriveRnsLinkKeyWithActions(initialDeriveRnsLinkKeyState(), stryMutAct_9fa48("14786") ? {} : (stryCov_9fa48("14786"), {
          kind: stryMutAct_9fa48("14787") ? "" : (stryCov_9fa48("14787"), "link-key/derive-gate"),
          sharedSecret: event.sharedSecret,
          linkId,
          mode: stryMutAct_9fa48("14788") ? event.mode && LinkKeyMode.MODE_AES256_CBC : (stryCov_9fa48("14788"), event.mode ?? LinkKeyMode.MODE_AES256_CBC)
        }));
        const sessionKey = deriveRnsLinkKeyRawFromActions(derived.actions);
        if (stryMutAct_9fa48("14791") ? (shouldRejectDeriveRnsLinkKey(derived.actions) || !shouldUseDeriveRnsLinkKey(derived.actions)) && sessionKey === null : stryMutAct_9fa48("14790") ? false : stryMutAct_9fa48("14789") ? true : (stryCov_9fa48("14789", "14790", "14791"), (stryMutAct_9fa48("14793") ? shouldRejectDeriveRnsLinkKey(derived.actions) && !shouldUseDeriveRnsLinkKey(derived.actions) : stryMutAct_9fa48("14792") ? false : (stryCov_9fa48("14792", "14793"), shouldRejectDeriveRnsLinkKey(derived.actions) || (stryMutAct_9fa48("14794") ? shouldUseDeriveRnsLinkKey(derived.actions) : (stryCov_9fa48("14794"), !shouldUseDeriveRnsLinkKey(derived.actions))))) || (stryMutAct_9fa48("14796") ? sessionKey !== null : stryMutAct_9fa48("14795") ? false : (stryCov_9fa48("14795", "14796"), sessionKey === null)))) {
          if (stryMutAct_9fa48("14797")) {
            {}
          } else {
            stryCov_9fa48("14797");
            return stryMutAct_9fa48("14798") ? {} : (stryCov_9fa48("14798"), {
              state: stryMutAct_9fa48("14799") ? {} : (stryCov_9fa48("14799"), {
                ...state,
                phase: LinkHandshakePhase.FAILED,
                sessionKey: null
              }),
              intents: stryMutAct_9fa48("14800") ? ["Stryker was here"] : (stryCov_9fa48("14800"), []),
              actions: stryMutAct_9fa48("14801") ? ["Stryker was here"] : (stryCov_9fa48("14801"), [])
            });
          }
        }
        return stryMutAct_9fa48("14802") ? {} : (stryCov_9fa48("14802"), {
          state: stryMutAct_9fa48("14803") ? {} : (stryCov_9fa48("14803"), {
            ...state,
            phase: LinkHandshakePhase.ESTABLISHED,
            linkId,
            sessionKey
          }),
          intents: stryMutAct_9fa48("14804") ? ["Stryker was here"] : (stryCov_9fa48("14804"), []),
          actions: stryMutAct_9fa48("14805") ? ["Stryker was here"] : (stryCov_9fa48("14805"), [])
        });
      }
    }
    if (stryMutAct_9fa48("14808") ? event.kind !== "handshake/peer-material" : stryMutAct_9fa48("14807") ? false : stryMutAct_9fa48("14806") ? true : (stryCov_9fa48("14806", "14807", "14808"), event.kind === (stryMutAct_9fa48("14809") ? "" : (stryCov_9fa48("14809"), "handshake/peer-material")))) {
      if (stryMutAct_9fa48("14810")) {
        {}
      } else {
        stryCov_9fa48("14810");
        if (stryMutAct_9fa48("14813") ? state.localMaterial !== null : stryMutAct_9fa48("14812") ? false : stryMutAct_9fa48("14811") ? true : (stryCov_9fa48("14811", "14812", "14813"), state.localMaterial === null)) {
          if (stryMutAct_9fa48("14814")) {
            {}
          } else {
            stryCov_9fa48("14814");
            return stryMutAct_9fa48("14815") ? {} : (stryCov_9fa48("14815"), {
              state,
              intents: stryMutAct_9fa48("14816") ? ["Stryker was here"] : (stryCov_9fa48("14816"), []),
              actions: stryMutAct_9fa48("14817") ? ["Stryker was here"] : (stryCov_9fa48("14817"), [])
            });
          }
        }
        const peerMaterial = Uint8Array.from(event.material.subarray(0, LINK_HANDSHAKE_KEY_SIZE));
        const linkId = stryMutAct_9fa48("14818") ? state.linkId && Uint8Array.from(event.linkId) : (stryCov_9fa48("14818"), state.linkId ?? Uint8Array.from(event.linkId));
        if (stryMutAct_9fa48("14821") ? state.phase === LinkHandshakePhase.ESTABLISHED && state.peerMaterial !== null && bytesEqual(state.peerMaterial, peerMaterial) && state.linkId !== null || bytesEqual(state.linkId, linkId) : stryMutAct_9fa48("14820") ? false : stryMutAct_9fa48("14819") ? true : (stryCov_9fa48("14819", "14820", "14821"), (stryMutAct_9fa48("14823") ? state.phase === LinkHandshakePhase.ESTABLISHED && state.peerMaterial !== null && bytesEqual(state.peerMaterial, peerMaterial) || state.linkId !== null : stryMutAct_9fa48("14822") ? true : (stryCov_9fa48("14822", "14823"), (stryMutAct_9fa48("14825") ? state.phase === LinkHandshakePhase.ESTABLISHED && state.peerMaterial !== null || bytesEqual(state.peerMaterial, peerMaterial) : stryMutAct_9fa48("14824") ? true : (stryCov_9fa48("14824", "14825"), (stryMutAct_9fa48("14827") ? state.phase === LinkHandshakePhase.ESTABLISHED || state.peerMaterial !== null : stryMutAct_9fa48("14826") ? true : (stryCov_9fa48("14826", "14827"), (stryMutAct_9fa48("14829") ? state.phase !== LinkHandshakePhase.ESTABLISHED : stryMutAct_9fa48("14828") ? true : (stryCov_9fa48("14828", "14829"), state.phase === LinkHandshakePhase.ESTABLISHED)) && (stryMutAct_9fa48("14831") ? state.peerMaterial === null : stryMutAct_9fa48("14830") ? true : (stryCov_9fa48("14830", "14831"), state.peerMaterial !== null)))) && bytesEqual(state.peerMaterial, peerMaterial))) && (stryMutAct_9fa48("14833") ? state.linkId === null : stryMutAct_9fa48("14832") ? true : (stryCov_9fa48("14832", "14833"), state.linkId !== null)))) && bytesEqual(state.linkId, linkId))) {
          if (stryMutAct_9fa48("14834")) {
            {}
          } else {
            stryCov_9fa48("14834");
            return stryMutAct_9fa48("14835") ? {} : (stryCov_9fa48("14835"), {
              state,
              intents: stryMutAct_9fa48("14836") ? ["Stryker was here"] : (stryCov_9fa48("14836"), []),
              actions: stryMutAct_9fa48("14837") ? ["Stryker was here"] : (stryCov_9fa48("14837"), [])
            });
          }
        }
        const sessionKey = deriveSimSessionKey(state.localMaterial, peerMaterial, linkId);
        return stryMutAct_9fa48("14838") ? {} : (stryCov_9fa48("14838"), {
          state: stryMutAct_9fa48("14839") ? {} : (stryCov_9fa48("14839"), {
            ...state,
            phase: LinkHandshakePhase.ESTABLISHED,
            peerMaterial,
            linkId,
            sessionKey
          }),
          intents: stryMutAct_9fa48("14840") ? ["Stryker was here"] : (stryCov_9fa48("14840"), []),
          actions: stryMutAct_9fa48("14841") ? ["Stryker was here"] : (stryCov_9fa48("14841"), [])
        });
      }
    }
    return stryMutAct_9fa48("14842") ? {} : (stryCov_9fa48("14842"), {
      state,
      intents: stryMutAct_9fa48("14843") ? ["Stryker was here"] : (stryCov_9fa48("14843"), []),
      actions: stryMutAct_9fa48("14844") ? ["Stryker was here"] : (stryCov_9fa48("14844"), [])
    });
  }
}
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (stryMutAct_9fa48("14845")) {
    {}
  } else {
    stryCov_9fa48("14845");
    return stryMutAct_9fa48("14848") ? a.length === b.length || a.every((byte, index) => byte === b[index]) : stryMutAct_9fa48("14847") ? false : stryMutAct_9fa48("14846") ? true : (stryCov_9fa48("14846", "14847", "14848"), (stryMutAct_9fa48("14850") ? a.length !== b.length : stryMutAct_9fa48("14849") ? true : (stryCov_9fa48("14849", "14850"), a.length === b.length)) && (stryMutAct_9fa48("14851") ? a.some((byte, index) => byte === b[index]) : (stryCov_9fa48("14851"), a.every(stryMutAct_9fa48("14852") ? () => undefined : (stryCov_9fa48("14852"), (byte, index) => stryMutAct_9fa48("14855") ? byte !== b[index] : stryMutAct_9fa48("14854") ? false : stryMutAct_9fa48("14853") ? true : (stryCov_9fa48("14853", "14854", "14855"), byte === b[index]))))));
  }
}