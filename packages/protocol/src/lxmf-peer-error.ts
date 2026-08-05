/**
 * Pure LXMF peer-error msgpack decode.
 * Conclusions leave via machine actions (no ad-hoc `decodeLxmfPeerError`
 * reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { msgpackUnpack } from "./msgpack-core.js";

export const LXMF_PEER_ERROR_NO_IDENTITY = 0xf0;
export const LXMF_PEER_ERROR_NO_ACCESS = 0xf1;
export const LXMF_PEER_ERROR_TIMEOUT = 0xfe;

export const LxmfPeerError = {
  NO_IDENTITY: LXMF_PEER_ERROR_NO_IDENTITY,
  NO_ACCESS: LXMF_PEER_ERROR_NO_ACCESS,
  TIMEOUT: LXMF_PEER_ERROR_TIMEOUT,
} as const;

export type LxmfPeerErrorValue =
  (typeof LxmfPeerError)[keyof typeof LxmfPeerError];

export interface LxmfPeerErrorFields {
  readonly code: number;
}

const KNOWN_PEER_ERRORS = new Set([
  LXMF_PEER_ERROR_NO_IDENTITY,
  LXMF_PEER_ERROR_NO_ACCESS,
]);

export function decodeLxmfPeerError(response: Uint8Array): number | null {
  try {
    const value = msgpackUnpack(response);
    if (value.type === "int" && KNOWN_PEER_ERRORS.has(value.int)) {
      return value.int;
    }
  } catch {
    // Not an error payload.
  }
  return null;
}

/**
 * LXMF peer-error decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodeLxmfPeerError`
 * reads beside the step). Unknown / malformed payloads become `reject`.
 */
export type DecodeLxmfPeerErrorState = Record<string, never>;

export type DecodeLxmfPeerErrorEvent =
  | Event
  | {
      readonly kind: "lxmf/peer-error-decode-gate";
      readonly response: Uint8Array;
    };

export type DecodeLxmfPeerErrorAction =
  | { readonly kind: "use-fields"; readonly fields: LxmfPeerErrorFields }
  | { readonly kind: "reject" };

export interface DecodeLxmfPeerErrorStepResult {
  readonly state: DecodeLxmfPeerErrorState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeLxmfPeerErrorAction[];
}

export function initialDecodeLxmfPeerErrorState(): DecodeLxmfPeerErrorState {
  return {};
}

export function stepDecodeLxmfPeerErrorWithActions(
  state: DecodeLxmfPeerErrorState,
  event: DecodeLxmfPeerErrorEvent,
): DecodeLxmfPeerErrorStepResult {
  if (event.kind === "lxmf/peer-error-decode-gate") {
    const code = decodeLxmfPeerError(event.response);
    if (code === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields: { code } }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseDecodeLxmfPeerError(
  actions: ReadonlyArray<DecodeLxmfPeerErrorAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectDecodeLxmfPeerError(
  actions: ReadonlyArray<DecodeLxmfPeerErrorAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract peer-error code from step actions; null when no `use-fields`. */
export function lxmfPeerErrorFromActions(
  actions: ReadonlyArray<DecodeLxmfPeerErrorAction>,
): number | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields.code : null;
}
