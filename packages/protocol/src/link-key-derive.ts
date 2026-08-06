/**
 * Pure RNS link session-key derivation from an ECDH shared secret.
 * ECDH itself stays at the adapter edge; this owns length selection + HKDF.
 * Derive conclusions leave via machine actions (no ad-hoc `deriveRnsLinkKey`
 * / `orderIndependentSharedSecret` reads beside the step).
 * Mode-enabled / expected-mode gates conclude via machine actions (no ad-hoc
 * `isLinkModeEnabled` / `isExpectedLinkMode` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import {
  initialRnsHkdfSha256State,
  rnsHkdfSha256,
  rnsHkdfSha256RawFromActions,
  shouldRejectRnsHkdfSha256,
  shouldUseRnsHkdfSha256,
  stepRnsHkdfSha256WithActions,
} from "./rns-hkdf.js";

/** Mirrors RNS/Link.py link mode constants used for key length. */
export const LinkKeyMode = {
  MODE_AES128_CBC: 0x00,
  MODE_AES256_CBC: 0x01,
  MODE_AES256_GCM: 0x02,
} as const;

export type LinkKeyModeValue = (typeof LinkKeyMode)[keyof typeof LinkKeyMode];

/** RNS Link.mode naming alias. */
export const LinkMode = LinkKeyMode;
export type LinkModeValue = LinkKeyModeValue;

export const LINK_MODE_DEFAULT: LinkKeyModeValue = LinkKeyMode.MODE_AES256_CBC;
// Accept AES-128 as well: Python RNS defaults to MODE_AES128_CBC when initiating.
export const LINK_ENABLED_MODES: ReadonlyArray<LinkKeyModeValue> = [
  LinkKeyMode.MODE_AES128_CBC,
  LinkKeyMode.MODE_AES256_CBC,
];

/** Whether a link mode is in the currently enabled set. */
export function isLinkModeEnabled(mode: LinkKeyModeValue | number): boolean {
  return (LINK_ENABLED_MODES as ReadonlyArray<number>).includes(mode);
}

/**
 * isLinkModeEnabled gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkModeEnabled` reads beside
 * the step).
 */
export type LinkModeEnabledState = Record<string, never>;

export type LinkModeEnabledEvent =
  | Event
  | {
      readonly kind: "link/mode-enabled-gate";
      readonly mode: LinkKeyModeValue | number;
    };

export type LinkModeEnabledAction =
  { readonly kind: "enabled" } | { readonly kind: "disabled" };

export interface LinkModeEnabledStepResult {
  readonly state: LinkModeEnabledState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkModeEnabledAction[];
}

export function initialLinkModeEnabledState(): LinkModeEnabledState {
  return {};
}

export function stepLinkModeEnabledWithActions(
  state: LinkModeEnabledState,
  event: LinkModeEnabledEvent,
): LinkModeEnabledStepResult {
  if (event.kind === "link/mode-enabled-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isLinkModeEnabled(event.mode) ? "enabled" : "disabled",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatLinkModeEnabled(
  actions: ReadonlyArray<LinkModeEnabledAction>,
): boolean {
  return actions.some((action) => action.kind === "enabled");
}

export function shouldTreatLinkModeDisabled(
  actions: ReadonlyArray<LinkModeEnabledAction>,
): boolean {
  return actions.some((action) => action.kind === "disabled");
}

/** Whether a received link-proof mode matches the expected session mode. */
export function isExpectedLinkMode(input: {
  readonly expected: LinkKeyModeValue | number;
  readonly received: LinkKeyModeValue | number;
}): boolean {
  return input.expected === input.received;
}

/**
 * isExpectedLinkMode gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isExpectedLinkMode` reads beside
 * the step).
 */
export type ExpectedLinkModeState = Record<string, never>;

export type ExpectedLinkModeEvent =
  | Event
  | {
      readonly kind: "link/expected-mode-gate";
      readonly expected: LinkKeyModeValue | number;
      readonly received: LinkKeyModeValue | number;
    };

export type ExpectedLinkModeAction =
  { readonly kind: "match" } | { readonly kind: "mismatch" };

export interface ExpectedLinkModeStepResult {
  readonly state: ExpectedLinkModeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ExpectedLinkModeAction[];
}

export function initialExpectedLinkModeState(): ExpectedLinkModeState {
  return {};
}

export function stepExpectedLinkModeWithActions(
  state: ExpectedLinkModeState,
  event: ExpectedLinkModeEvent,
): ExpectedLinkModeStepResult {
  if (event.kind === "link/expected-mode-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isExpectedLinkMode({
            expected: event.expected,
            received: event.received,
          })
            ? "match"
            : "mismatch",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchExpectedLinkMode(
  actions: ReadonlyArray<ExpectedLinkModeAction>,
): boolean {
  return actions.some((action) => action.kind === "match");
}

export function shouldMismatchExpectedLinkMode(
  actions: ReadonlyArray<ExpectedLinkModeAction>,
): boolean {
  return actions.some((action) => action.kind === "mismatch");
}

export function linkDerivedKeyLength(mode: LinkKeyModeValue | number): number {
  return mode === LinkKeyMode.MODE_AES256_CBC ? 64 : 32;
}

export function deriveRnsLinkKey(
  sharedSecret: Uint8Array,
  linkId: Uint8Array,
  mode: LinkKeyModeValue | number = LinkKeyMode.MODE_AES256_CBC,
): Uint8Array {
  return rnsHkdfSha256({
    length: linkDerivedKeyLength(mode),
    deriveFrom: sharedSecret,
    salt: linkId,
    context: null,
  });
}

/**
 * Build an order-independent shared secret from two peer materials (sim / tests).
 * Not wire ECDH — adapters should supply real X25519 shared secrets on the wire path.
 */
export function orderIndependentSharedSecret(
  a: Uint8Array,
  b: Uint8Array,
): Uint8Array {
  const leftFirst = compareBytes(a, b) <= 0;
  const first = leftFirst ? a : b;
  const second = leftFirst ? b : a;
  const joined = new Uint8Array(first.length + second.length);
  joined.set(first, 0);
  joined.set(second, first.length);
  return rnsHkdfSha256({
    length: 32,
    deriveFrom: joined,
    salt: new Uint8Array(32),
    context: SIM_ECDH_CONTEXT,
  });
}

/** ASCII "twistedpear-sim-ecdh" — avoids TextEncoder (no DOM in protocol tsconfig). */
const SIM_ECDH_CONTEXT = Uint8Array.from([
  116, 119, 105, 115, 116, 101, 100, 112, 101, 97, 114, 45, 115, 105, 109, 45,
  101, 99, 100, 104,
]);

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const n = Math.min(left.length, right.length);
  for (let i = 0; i < n; i += 1) {
    const d = (left[i] ?? 0) - (right[i] ?? 0);
    if (d !== 0) {
      return d;
    }
  }
  return left.length - right.length;
}

/**
 * Link session-key derive is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `deriveRnsLinkKey` reads
 * beside the step). Empty shared-secret / invalid length become `reject`.
 */
export type DeriveRnsLinkKeyState = Record<string, never>;

export type DeriveRnsLinkKeyEvent =
  | Event
  | {
      readonly kind: "link-key/derive-gate";
      readonly sharedSecret: Uint8Array;
      readonly linkId: Uint8Array;
      readonly mode?: LinkKeyModeValue | number;
    };

export type DeriveRnsLinkKeyAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface DeriveRnsLinkKeyStepResult {
  readonly state: DeriveRnsLinkKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeriveRnsLinkKeyAction[];
}

export function initialDeriveRnsLinkKeyState(): DeriveRnsLinkKeyState {
  return {};
}

export function stepDeriveRnsLinkKeyWithActions(
  state: DeriveRnsLinkKeyState,
  event: DeriveRnsLinkKeyEvent,
): DeriveRnsLinkKeyStepResult {
  if (event.kind === "link-key/derive-gate") {
    const mode = event.mode ?? LinkKeyMode.MODE_AES256_CBC;
    const hkdf = stepRnsHkdfSha256WithActions(initialRnsHkdfSha256State(), {
      kind: "rns-hkdf/derive-gate",
      length: linkDerivedKeyLength(mode),
      deriveFrom: event.sharedSecret,
      salt: event.linkId,
      context: null,
    });
    if (
      shouldRejectRnsHkdfSha256(hkdf.actions) ||
      !shouldUseRnsHkdfSha256(hkdf.actions)
    ) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    const raw = rnsHkdfSha256RawFromActions(hkdf.actions);
    if (raw === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return { state, intents: [], actions: [{ kind: "use-raw", raw }] };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDeriveRnsLinkKey(
  actions: ReadonlyArray<DeriveRnsLinkKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectDeriveRnsLinkKey(
  actions: ReadonlyArray<DeriveRnsLinkKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract derived link key from step actions; null when no `use-raw`. */
export function deriveRnsLinkKeyRawFromActions(
  actions: ReadonlyArray<DeriveRnsLinkKeyAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Order-independent shared-secret framing is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `orderIndependentSharedSecret` reads beside the step). Empty joined material
 * becomes `reject`.
 */
export type OrderIndependentSharedSecretState = Record<string, never>;

export type OrderIndependentSharedSecretEvent =
  | Event
  | {
      readonly kind: "link-key/order-independent-shared-secret-gate";
      readonly a: Uint8Array;
      readonly b: Uint8Array;
    };

export type OrderIndependentSharedSecretAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface OrderIndependentSharedSecretStepResult {
  readonly state: OrderIndependentSharedSecretState;
  readonly intents: readonly Intent[];
  readonly actions: readonly OrderIndependentSharedSecretAction[];
}

export function initialOrderIndependentSharedSecretState(): OrderIndependentSharedSecretState {
  return {};
}

export function stepOrderIndependentSharedSecretWithActions(
  state: OrderIndependentSharedSecretState,
  event: OrderIndependentSharedSecretEvent,
): OrderIndependentSharedSecretStepResult {
  if (event.kind === "link-key/order-independent-shared-secret-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: orderIndependentSharedSecret(event.a, event.b),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseOrderIndependentSharedSecret(
  actions: ReadonlyArray<OrderIndependentSharedSecretAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectOrderIndependentSharedSecret(
  actions: ReadonlyArray<OrderIndependentSharedSecretAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract shared secret from step actions; null when no `use-raw`. */
export function orderIndependentSharedSecretRawFromActions(
  actions: ReadonlyArray<OrderIndependentSharedSecretAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}
