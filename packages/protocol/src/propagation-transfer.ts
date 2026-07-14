/**
 * Pure LXMF propagation download transfer phases.
 * Adapters perform link/request IO; this machine owns phase transitions.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

/** Mirrors LXMF/LXMRouter.py propagation transfer states. */
export const PropagationTransferState = {
  IDLE: 0x00,
  PATH_REQUESTED: 0x01,
  LINK_ESTABLISHING: 0x02,
  LINK_ESTABLISHED: 0x03,
  REQUEST_SENT: 0x04,
  RECEIVING: 0x05,
  RESPONSE_RECEIVED: 0x06,
  COMPLETE: 0x07,
  NO_PATH: 0xf0,
  LINK_FAILED: 0xf1,
  TRANSFER_FAILED: 0xf2,
  NO_IDENTITY_RCVD: 0xf3,
  NO_ACCESS: 0xf4,
  FAILED: 0xfe
} as const;

export type PropagationTransferStateValue =
  (typeof PropagationTransferState)[keyof typeof PropagationTransferState];

/** Mirrors LXMF/LXMPeer.py peer error codes used during /get. */
export const PropagationPeerError = {
  NO_IDENTITY: 0xf0,
  NO_ACCESS: 0xf1,
  TIMEOUT: 0xfe
} as const;

export const PROPAGATION_LINK_TIMEOUT_MS = 5000;
export const PROPAGATION_LIST_TIMEOUT_SEC = 10;
export const PROPAGATION_DOWNLOAD_TIMEOUT_SEC = 30;
export const PROPAGATION_HAVES_TIMEOUT_SEC = 10;

export type PropagationTransferAction =
  | { readonly kind: "establish-link"; readonly timeoutMs: number }
  | { readonly kind: "identify" }
  | { readonly kind: "request-list"; readonly timeoutSec: number }
  | { readonly kind: "request-download"; readonly timeoutSec: number }
  | { readonly kind: "request-haves-ack"; readonly timeoutSec: number }
  | { readonly kind: "teardown-link" };

export interface PropagationTransferMachineState {
  readonly phase: PropagationTransferStateValue;
  readonly wantCount: number;
  readonly downloadedCount: number;
}

export type PropagationTransferEvent =
  | Event
  | { readonly kind: "xfer/begin" }
  | { readonly kind: "xfer/link-timeout" }
  | { readonly kind: "xfer/link-ready" }
  | { readonly kind: "xfer/list-null" }
  | { readonly kind: "xfer/list-peer-error"; readonly code: number }
  | { readonly kind: "xfer/list-malformed" }
  | { readonly kind: "xfer/list-empty" }
  | { readonly kind: "xfer/list-ready"; readonly wantCount: number }
  | { readonly kind: "xfer/download-null" }
  | { readonly kind: "xfer/download-malformed" }
  | { readonly kind: "xfer/download-ready"; readonly downloadedCount: number }
  | { readonly kind: "xfer/haves-acked" }
  | { readonly kind: "xfer/cancel" };

export interface PropagationTransferStepResult {
  readonly state: PropagationTransferMachineState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationTransferAction[];
}

export function initialPropagationTransferState(): PropagationTransferMachineState {
  return {
    phase: PropagationTransferState.IDLE,
    wantCount: 0,
    downloadedCount: 0
  };
}

export const stepPropagationTransfer: StepFn<PropagationTransferMachineState> = (state, event) => {
  const result = stepPropagationTransferInner(state, event as PropagationTransferEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPropagationTransferWithActions(
  state: PropagationTransferMachineState,
  event: PropagationTransferEvent
): PropagationTransferStepResult {
  return stepPropagationTransferInner(state, event);
}

function stepPropagationTransferInner(
  state: PropagationTransferMachineState,
  event: PropagationTransferEvent
): PropagationTransferStepResult {
  if (event.kind === "xfer/cancel") {
    return {
      state: initialPropagationTransferState(),
      intents: [],
      actions: [{ kind: "teardown-link" }]
    };
  }

  if (event.kind === "xfer/begin") {
    return {
      state: {
        phase: PropagationTransferState.LINK_ESTABLISHING,
        wantCount: 0,
        downloadedCount: 0
      },
      intents: [
        { kind: "timer/set", timer: { id: "propagation-link", delayMs: PROPAGATION_LINK_TIMEOUT_MS } }
      ],
      actions: [{ kind: "establish-link", timeoutMs: PROPAGATION_LINK_TIMEOUT_MS }]
    };
  }

  if (event.kind === "timer/fired" && event.id === "propagation-link") {
    if (state.phase !== PropagationTransferState.LINK_ESTABLISHING) {
      return { state, intents: [], actions: [] };
    }
    return {
      state: { ...state, phase: PropagationTransferState.LINK_FAILED },
      intents: [],
      actions: [{ kind: "teardown-link" }]
    };
  }

  if (event.kind === "xfer/link-timeout") {
    return {
      state: { ...state, phase: PropagationTransferState.LINK_FAILED },
      intents: [],
      actions: [{ kind: "teardown-link" }]
    };
  }

  if (event.kind === "xfer/link-ready") {
    return {
      state: { ...state, phase: PropagationTransferState.LINK_ESTABLISHED },
      intents: [{ kind: "timer/cancel", timer: { id: "propagation-link" } }],
      actions: [
        { kind: "identify" },
        { kind: "request-list", timeoutSec: PROPAGATION_LIST_TIMEOUT_SEC }
      ]
    };
  }

  if (event.kind === "xfer/list-null" || event.kind === "xfer/list-malformed") {
    return {
      state: { ...state, phase: PropagationTransferState.TRANSFER_FAILED },
      intents: [],
      actions: []
    };
  }

  if (event.kind === "xfer/list-peer-error") {
    const phase =
      event.code === PropagationPeerError.NO_IDENTITY
        ? PropagationTransferState.NO_IDENTITY_RCVD
        : PropagationTransferState.NO_ACCESS;
    return { state: { ...state, phase }, intents: [], actions: [] };
  }

  if (event.kind === "xfer/list-empty") {
    return {
      state: { ...state, phase: PropagationTransferState.COMPLETE, wantCount: 0 },
      intents: [],
      actions: []
    };
  }

  if (event.kind === "xfer/list-ready") {
    return {
      state: {
        ...state,
        phase: PropagationTransferState.REQUEST_SENT,
        wantCount: event.wantCount
      },
      intents: [],
      actions: [{ kind: "request-download", timeoutSec: PROPAGATION_DOWNLOAD_TIMEOUT_SEC }]
    };
  }

  if (event.kind === "xfer/download-null" || event.kind === "xfer/download-malformed") {
    return {
      state: { ...state, phase: PropagationTransferState.TRANSFER_FAILED },
      intents: [],
      actions: []
    };
  }

  if (event.kind === "xfer/download-ready") {
    const next: PropagationTransferMachineState = {
      ...state,
      phase: PropagationTransferState.RESPONSE_RECEIVED,
      downloadedCount: event.downloadedCount
    };
    if (event.downloadedCount <= 0) {
      return {
        state: { ...next, phase: PropagationTransferState.COMPLETE },
        intents: [],
        actions: []
      };
    }
    return {
      state: next,
      intents: [],
      actions: [{ kind: "request-haves-ack", timeoutSec: PROPAGATION_HAVES_TIMEOUT_SEC }]
    };
  }

  if (event.kind === "xfer/haves-acked") {
    return {
      state: { ...state, phase: PropagationTransferState.COMPLETE },
      intents: [],
      actions: []
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether a peer list/download response bytes are present for transfer progression. */
export function shouldAcceptPropagationPeerResponse(responsePresent: boolean): boolean {
  return responsePresent;
}

/** Whether a filtered want-list should complete as empty (xfer/list-empty). */
export function shouldTreatPropagationListAsEmpty(wantCount: number): boolean {
  return wantCount === 0;
}

/** Whether haves-ack request should run after download-ready. */
export function shouldRequestPropagationHavesAck(input: {
  readonly actionIsHavesAck: boolean;
  readonly haveCount: number;
}): boolean {
  return input.actionIsHavesAck && input.haveCount > 0;
}
