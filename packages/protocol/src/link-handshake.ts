/**
 * Pure sim-oriented link crypto handshake.
 * Key material arrives only via events (adapters supply entropy or ECDH shared secrets);
 * derivation uses RNS HKDF via {@link stepDeriveRnsLinkKeyWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  LinkKeyMode,
  deriveRnsLinkKeyRawFromActions,
  initialDeriveRnsLinkKeyState,
  initialOrderIndependentSharedSecretState,
  orderIndependentSharedSecretRawFromActions,
  shouldRejectDeriveRnsLinkKey,
  shouldRejectOrderIndependentSharedSecret,
  shouldUseDeriveRnsLinkKey,
  shouldUseOrderIndependentSharedSecret,
  stepDeriveRnsLinkKeyWithActions,
  stepOrderIndependentSharedSecretWithActions,
} from "./link-key-derive.js";

export const LINK_HANDSHAKE_KEY_SIZE = 32;

export const LinkHandshakePhase = {
  IDLE: 0,
  AWAITING_PEER: 1,
  ESTABLISHED: 2,
  FAILED: 3,
} as const;

export type LinkHandshakePhaseValue =
  (typeof LinkHandshakePhase)[keyof typeof LinkHandshakePhase];

export interface LinkHandshakeState {
  readonly role: "initiator" | "responder";
  readonly peerId: string;
  readonly phase: LinkHandshakePhaseValue;
  readonly localMaterial: Uint8Array | null;
  readonly peerMaterial: Uint8Array | null;
  readonly linkId: Uint8Array | null;
  readonly sessionKey: Uint8Array | null;
}

export type LinkHandshakeEvent =
  | Event
  | {
      readonly kind: "handshake/begin";
      readonly at: number;
      /** Injected entropy bytes — must be LINK_HANDSHAKE_KEY_SIZE. */
      readonly entropy: Uint8Array;
      readonly linkId: Uint8Array;
    }
  | {
      readonly kind: "handshake/peer-material";
      readonly material: Uint8Array;
      readonly linkId: Uint8Array;
    }
  | {
      /** Adapter-supplied real ECDH shared secret (wire path). */
      readonly kind: "handshake/shared-secret";
      readonly sharedSecret: Uint8Array;
      readonly linkId: Uint8Array;
      readonly mode?: number;
    }
  | { readonly kind: "handshake/fail" };

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
  return {
    role: options.role,
    peerId: options.peerId,
    phase: LinkHandshakePhase.IDLE,
    localMaterial: null,
    peerMaterial: null,
    linkId: null,
    sessionKey: null,
  };
}

/**
 * Commutative sim key derivation via order-independent shared secret + RNS HKDF.
 * Not wire ECDH — adapters should inject `handshake/shared-secret` for real X25519.
 * Conclusions leave via machine actions (no ad-hoc `orderIndependentSharedSecret` /
 * `deriveRnsLinkKey` reads beside the step).
 */
export function deriveSimSessionKey(
  localMaterial: Uint8Array,
  peerMaterial: Uint8Array,
  linkId: Uint8Array,
  mode: number = LinkKeyMode.MODE_AES256_CBC,
): Uint8Array {
  const sharedStepped = stepOrderIndependentSharedSecretWithActions(
    initialOrderIndependentSharedSecretState(),
    {
      kind: "link-key/order-independent-shared-secret-gate",
      a: localMaterial,
      b: peerMaterial,
    },
  );
  const shared = orderIndependentSharedSecretRawFromActions(
    sharedStepped.actions,
  );
  if (
    shouldRejectOrderIndependentSharedSecret(sharedStepped.actions) ||
    !shouldUseOrderIndependentSharedSecret(sharedStepped.actions) ||
    shared === null
  ) {
    throw new Error("Cannot derive key from empty input material");
  }
  const derived = stepDeriveRnsLinkKeyWithActions(
    initialDeriveRnsLinkKeyState(),
    {
      kind: "link-key/derive-gate",
      sharedSecret: shared,
      linkId,
      mode,
    },
  );
  const key = deriveRnsLinkKeyRawFromActions(derived.actions);
  if (
    shouldRejectDeriveRnsLinkKey(derived.actions) ||
    !shouldUseDeriveRnsLinkKey(derived.actions) ||
    key === null
  ) {
    throw new Error("Cannot derive key from empty input material");
  }
  return key;
}

export const stepLinkHandshake: StepFn<LinkHandshakeState> = (state, event) => {
  const result = stepLinkHandshakeWithActions(
    state,
    event as LinkHandshakeEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepLinkHandshakeWithActions(
  state: LinkHandshakeState,
  event: LinkHandshakeEvent,
): LinkHandshakeStepResult {
  if (event.kind === "handshake/fail") {
    return {
      state: { ...state, phase: LinkHandshakePhase.FAILED, sessionKey: null },
      intents: [],
      actions: [],
    };
  }

  if (event.kind === "handshake/begin") {
    if (event.entropy.length < LINK_HANDSHAKE_KEY_SIZE) {
      return {
        state: { ...state, phase: LinkHandshakePhase.FAILED },
        intents: [],
        actions: [],
      };
    }
    const localMaterial = event.entropy.subarray(0, LINK_HANDSHAKE_KEY_SIZE);
    const next: LinkHandshakeState = {
      ...state,
      phase: LinkHandshakePhase.AWAITING_PEER,
      localMaterial: Uint8Array.from(localMaterial),
      linkId: Uint8Array.from(event.linkId),
      peerMaterial: null,
      sessionKey: null,
    };
    return {
      state: next,
      intents: [],
      actions: [
        {
          kind: "send-material",
          peerId: state.peerId,
          material: next.localMaterial!,
          linkId: next.linkId!,
        },
      ],
    };
  }

  if (event.kind === "handshake/shared-secret") {
    const linkId = Uint8Array.from(event.linkId);
    const derived = stepDeriveRnsLinkKeyWithActions(
      initialDeriveRnsLinkKeyState(),
      {
        kind: "link-key/derive-gate",
        sharedSecret: event.sharedSecret,
        linkId,
        mode: event.mode ?? LinkKeyMode.MODE_AES256_CBC,
      },
    );
    const sessionKey = deriveRnsLinkKeyRawFromActions(derived.actions);
    if (
      shouldRejectDeriveRnsLinkKey(derived.actions) ||
      !shouldUseDeriveRnsLinkKey(derived.actions) ||
      sessionKey === null
    ) {
      return {
        state: { ...state, phase: LinkHandshakePhase.FAILED, sessionKey: null },
        intents: [],
        actions: [],
      };
    }
    return {
      state: {
        ...state,
        phase: LinkHandshakePhase.ESTABLISHED,
        linkId,
        sessionKey,
      },
      intents: [],
      actions: [],
    };
  }

  if (event.kind === "handshake/peer-material") {
    if (state.localMaterial === null) {
      return { state, intents: [], actions: [] };
    }
    const peerMaterial = Uint8Array.from(
      event.material.subarray(0, LINK_HANDSHAKE_KEY_SIZE),
    );
    const linkId = state.linkId ?? Uint8Array.from(event.linkId);
    if (
      state.phase === LinkHandshakePhase.ESTABLISHED &&
      state.peerMaterial !== null &&
      bytesEqual(state.peerMaterial, peerMaterial) &&
      state.linkId !== null &&
      bytesEqual(state.linkId, linkId)
    ) {
      return { state, intents: [], actions: [] };
    }
    const sessionKey = deriveSimSessionKey(
      state.localMaterial,
      peerMaterial,
      linkId,
    );
    return {
      state: {
        ...state,
        phase: LinkHandshakePhase.ESTABLISHED,
        peerMaterial,
        linkId,
        sessionKey,
      },
      intents: [],
      actions: [],
    };
  }

  return { state, intents: [], actions: [] };
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}
