/**
 * Pure LXMF propagation download transfer phases.
 * Adapters perform link/request IO; this machine owns phase transitions.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { LINK_AWAIT_DEFAULT_TIMEOUT_MS } from "./link-await.js";

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
  FAILED: 0xfe,
} as const;

export type PropagationTransferStateValue =
  (typeof PropagationTransferState)[keyof typeof PropagationTransferState];

/** Mirrors LXMF/LXMPeer.py peer error codes used during /get. */
export const PropagationPeerError = {
  NO_IDENTITY: 0xf0,
  NO_ACCESS: 0xf1,
  TIMEOUT: 0xfe,
} as const;

export const PROPAGATION_LINK_TIMEOUT_MS = LINK_AWAIT_DEFAULT_TIMEOUT_MS;
export const PROPAGATION_LINK_TIMER_ID = "propagation-link";
export const PROPAGATION_LIST_TIMEOUT_SEC = 10;
export const PROPAGATION_DOWNLOAD_TIMEOUT_SEC = 30;
export const PROPAGATION_HAVES_TIMEOUT_SEC = 10;

export type PropagationTransferAction =
  | { readonly kind: "establish-link"; readonly timeoutMs: number }
  | { readonly kind: "resolve-link-wait" }
  | { readonly kind: "reject-link-wait"; readonly reason: "timeout" }
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
  | { readonly kind: "xfer/link-arrived" }
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
    downloadedCount: 0,
  };
}

export const stepPropagationTransfer: StepFn<
  PropagationTransferMachineState
> = (state, event) => {
  const result = stepPropagationTransferInner(
    state,
    event as PropagationTransferEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepPropagationTransferWithActions(
  state: PropagationTransferMachineState,
  event: PropagationTransferEvent,
): PropagationTransferStepResult {
  return stepPropagationTransferInner(state, event);
}

function stepPropagationTransferInner(
  state: PropagationTransferMachineState,
  event: PropagationTransferEvent,
): PropagationTransferStepResult {
  if (event.kind === "xfer/cancel") {
    return {
      state: initialPropagationTransferState(),
      intents: [
        { kind: "timer/cancel", timer: { id: PROPAGATION_LINK_TIMER_ID } },
      ],
      actions: [{ kind: "teardown-link" }],
    };
  }
  if (event.kind === "xfer/begin") {
    return {
      state: {
        phase: PropagationTransferState.LINK_ESTABLISHING,
        wantCount: 0,
        downloadedCount: 0,
      },
      intents: [
        {
          kind: "timer/set",
          timer: {
            id: PROPAGATION_LINK_TIMER_ID,
            delayMs: PROPAGATION_LINK_TIMEOUT_MS,
          },
        },
      ],
      actions: [
        { kind: "establish-link", timeoutMs: PROPAGATION_LINK_TIMEOUT_MS },
      ],
    };
  }
  const linkStep = stepPropagationLinkEvents(state, event);
  if (linkStep !== null) return linkStep;
  const listStep = stepPropagationListEvents(state, event);
  if (listStep !== null) return listStep;
  const downloadStep = stepPropagationDownloadEvents(state, event);
  if (downloadStep !== null) return downloadStep;
  return { state, intents: [], actions: [] };
}

function stepPropagationLinkEvents(
  state: PropagationTransferMachineState,
  event: PropagationTransferEvent,
): PropagationTransferStepResult | null {
  if (event.kind === "timer/fired" && event.id === PROPAGATION_LINK_TIMER_ID) {
    if (state.phase !== PropagationTransferState.LINK_ESTABLISHING) {
      return { state, intents: [], actions: [] };
    }
    return {
      state: { ...state, phase: PropagationTransferState.LINK_FAILED },
      intents: [],
      actions: [
        { kind: "teardown-link" },
        { kind: "reject-link-wait", reason: "timeout" },
      ],
    };
  }
  if (event.kind === "xfer/link-timeout") {
    return {
      state: { ...state, phase: PropagationTransferState.LINK_FAILED },
      intents: [
        { kind: "timer/cancel", timer: { id: PROPAGATION_LINK_TIMER_ID } },
      ],
      actions: [{ kind: "teardown-link" }],
    };
  }
  if (event.kind === "xfer/link-arrived") {
    if (state.phase !== PropagationTransferState.LINK_ESTABLISHING) {
      return { state, intents: [], actions: [] };
    }
    return {
      state,
      intents: [
        { kind: "timer/cancel", timer: { id: PROPAGATION_LINK_TIMER_ID } },
      ],
      actions: [{ kind: "resolve-link-wait" }],
    };
  }
  if (event.kind === "xfer/link-ready") {
    return {
      state: { ...state, phase: PropagationTransferState.LINK_ESTABLISHED },
      intents: [
        { kind: "timer/cancel", timer: { id: PROPAGATION_LINK_TIMER_ID } },
      ],
      actions: [
        { kind: "identify" },
        { kind: "request-list", timeoutSec: PROPAGATION_LIST_TIMEOUT_SEC },
      ],
    };
  }
  return null;
}

function stepPropagationListEvents(
  state: PropagationTransferMachineState,
  event: PropagationTransferEvent,
): PropagationTransferStepResult | null {
  if (event.kind === "xfer/list-null" || event.kind === "xfer/list-malformed") {
    return {
      state: { ...state, phase: PropagationTransferState.TRANSFER_FAILED },
      intents: [],
      actions: [],
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
      state: {
        ...state,
        phase: PropagationTransferState.COMPLETE,
        wantCount: 0,
      },
      intents: [],
      actions: [],
    };
  }
  if (event.kind === "xfer/list-ready") {
    return {
      state: {
        ...state,
        phase: PropagationTransferState.REQUEST_SENT,
        wantCount: event.wantCount,
      },
      intents: [],
      actions: [
        {
          kind: "request-download",
          timeoutSec: PROPAGATION_DOWNLOAD_TIMEOUT_SEC,
        },
      ],
    };
  }
  return null;
}

function stepPropagationDownloadEvents(
  state: PropagationTransferMachineState,
  event: PropagationTransferEvent,
): PropagationTransferStepResult | null {
  if (
    event.kind === "xfer/download-null" ||
    event.kind === "xfer/download-malformed"
  ) {
    return {
      state: { ...state, phase: PropagationTransferState.TRANSFER_FAILED },
      intents: [],
      actions: [],
    };
  }
  if (event.kind === "xfer/download-ready") {
    const next: PropagationTransferMachineState = {
      ...state,
      phase: PropagationTransferState.RESPONSE_RECEIVED,
      downloadedCount: event.downloadedCount,
    };
    if (event.downloadedCount <= 0) {
      return {
        state: { ...next, phase: PropagationTransferState.COMPLETE },
        intents: [],
        actions: [],
      };
    }
    return {
      state: next,
      intents: [],
      actions: [
        {
          kind: "request-haves-ack",
          timeoutSec: PROPAGATION_HAVES_TIMEOUT_SEC,
        },
      ],
    };
  }
  if (event.kind === "xfer/haves-acked") {
    return {
      state: { ...state, phase: PropagationTransferState.COMPLETE },
      intents: [],
      actions: [],
    };
  }
  return null;
}

/** Whether a peer list/download response bytes are present for transfer progression. */
export function shouldAcceptPropagationPeerResponse(
  responsePresent: boolean,
): boolean {
  return responsePresent;
}

/**
 * Propagation peer-response accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptPropagationPeerResponse` reads beside the step).
 */
export type AcceptPropagationPeerResponseState = Record<string, never>;

export type AcceptPropagationPeerResponseEvent =
  | Event
  | {
      readonly kind: "propagation-transfer/accept-peer-response-gate";
      readonly responsePresent: boolean;
    };

export type AcceptPropagationPeerResponseAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptPropagationPeerResponseStepResult {
  readonly state: AcceptPropagationPeerResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptPropagationPeerResponseAction[];
}

export function initialAcceptPropagationPeerResponseState(): AcceptPropagationPeerResponseState {
  return {};
}

export function stepAcceptPropagationPeerResponseWithActions(
  state: AcceptPropagationPeerResponseState,
  event: AcceptPropagationPeerResponseEvent,
): AcceptPropagationPeerResponseStepResult {
  if (event.kind === "propagation-transfer/accept-peer-response-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptPropagationPeerResponse(event.responsePresent)
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptPropagationPeerResponseNow(
  actions: ReadonlyArray<AcceptPropagationPeerResponseAction>,
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAcceptPropagationPeerResponse(
  actions: ReadonlyArray<AcceptPropagationPeerResponseAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a decoded peer-error code should drive xfer/list-peer-error. */
export function shouldHandlePropagationPeerError(
  errorPresent: boolean,
): boolean {
  return errorPresent;
}

/**
 * Propagation peer-error handle gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldHandlePropagationPeerError`
 * reads beside the step).
 */
export type HandlePropagationPeerErrorState = Record<string, never>;

export type HandlePropagationPeerErrorEvent =
  | Event
  | {
      readonly kind: "propagation-transfer/handle-peer-error-gate";
      readonly errorPresent: boolean;
    };

export type HandlePropagationPeerErrorAction =
  { readonly kind: "handle" } | { readonly kind: "skip" };

export interface HandlePropagationPeerErrorStepResult {
  readonly state: HandlePropagationPeerErrorState;
  readonly intents: readonly Intent[];
  readonly actions: readonly HandlePropagationPeerErrorAction[];
}

export function initialHandlePropagationPeerErrorState(): HandlePropagationPeerErrorState {
  return {};
}

export function stepHandlePropagationPeerErrorWithActions(
  state: HandlePropagationPeerErrorState,
  event: HandlePropagationPeerErrorEvent,
): HandlePropagationPeerErrorStepResult {
  if (event.kind === "propagation-transfer/handle-peer-error-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldHandlePropagationPeerError(event.errorPresent)
            ? "handle"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldHandlePropagationPeerErrorNow(
  actions: ReadonlyArray<HandlePropagationPeerErrorAction>,
): boolean {
  return actions.some((action) => action.kind === "handle");
}

export function shouldSkipHandlePropagationPeerError(
  actions: ReadonlyArray<HandlePropagationPeerErrorAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a locally delivered propagation message should be collected. */
export function shouldAcceptPropagationDeliveredMessage(
  messagePresent: boolean,
): boolean {
  return messagePresent;
}

/**
 * Propagation delivered-message accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptPropagationDeliveredMessage` reads beside the step).
 */
export type AcceptPropagationDeliveredMessageState = Record<string, never>;

export type AcceptPropagationDeliveredMessageEvent =
  | Event
  | {
      readonly kind: "propagation-transfer/accept-delivered-message-gate";
      readonly messagePresent: boolean;
    };

export type AcceptPropagationDeliveredMessageAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptPropagationDeliveredMessageStepResult {
  readonly state: AcceptPropagationDeliveredMessageState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptPropagationDeliveredMessageAction[];
}

export function initialAcceptPropagationDeliveredMessageState(): AcceptPropagationDeliveredMessageState {
  return {};
}

export function stepAcceptPropagationDeliveredMessageWithActions(
  state: AcceptPropagationDeliveredMessageState,
  event: AcceptPropagationDeliveredMessageEvent,
): AcceptPropagationDeliveredMessageStepResult {
  if (event.kind === "propagation-transfer/accept-delivered-message-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptPropagationDeliveredMessage(event.messagePresent)
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptPropagationDeliveredMessageNow(
  actions: ReadonlyArray<AcceptPropagationDeliveredMessageAction>,
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAcceptPropagationDeliveredMessage(
  actions: ReadonlyArray<AcceptPropagationDeliveredMessageAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a filtered want-list should complete as empty (xfer/list-empty). */
export function shouldTreatPropagationListAsEmpty(wantCount: number): boolean {
  return wantCount === 0;
}

/**
 * Propagation list-empty gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTreatPropagationListAsEmpty`
 * reads beside the step).
 */
export type TreatPropagationListAsEmptyState = Record<string, never>;

export type TreatPropagationListAsEmptyEvent =
  | Event
  | {
      readonly kind: "propagation-transfer/list-as-empty-gate";
      readonly wantCount: number;
    };

export type TreatPropagationListAsEmptyAction =
  { readonly kind: "empty" } | { readonly kind: "nonempty" };

export interface TreatPropagationListAsEmptyStepResult {
  readonly state: TreatPropagationListAsEmptyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TreatPropagationListAsEmptyAction[];
}

export function initialTreatPropagationListAsEmptyState(): TreatPropagationListAsEmptyState {
  return {};
}

export function stepTreatPropagationListAsEmptyWithActions(
  state: TreatPropagationListAsEmptyState,
  event: TreatPropagationListAsEmptyEvent,
): TreatPropagationListAsEmptyStepResult {
  if (event.kind === "propagation-transfer/list-as-empty-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldTreatPropagationListAsEmpty(event.wantCount)
            ? "empty"
            : "nonempty",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatPropagationListAsEmptyNow(
  actions: ReadonlyArray<TreatPropagationListAsEmptyAction>,
): boolean {
  return actions.some((action) => action.kind === "empty");
}

export function shouldTreatPropagationListAsNonempty(
  actions: ReadonlyArray<TreatPropagationListAsEmptyAction>,
): boolean {
  return actions.some((action) => action.kind === "nonempty");
}

/** Whether haves-ack request should run after download-ready. */
export function shouldRequestPropagationHavesAck(input: {
  readonly actionIsHavesAck: boolean;
  readonly haveCount: number;
}): boolean {
  return input.actionIsHavesAck && input.haveCount > 0;
}

/**
 * Propagation haves-ack request gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRequestPropagationHavesAck`
 * reads beside the step).
 */
export type RequestPropagationHavesAckState = Record<string, never>;

export type RequestPropagationHavesAckEvent =
  | Event
  | {
      readonly kind: "propagation-transfer/request-haves-ack-gate";
      readonly actionIsHavesAck: boolean;
      readonly haveCount: number;
    };

export type RequestPropagationHavesAckAction =
  { readonly kind: "request" } | { readonly kind: "skip" };

export interface RequestPropagationHavesAckStepResult {
  readonly state: RequestPropagationHavesAckState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RequestPropagationHavesAckAction[];
}

export function initialRequestPropagationHavesAckState(): RequestPropagationHavesAckState {
  return {};
}

export function stepRequestPropagationHavesAckWithActions(
  state: RequestPropagationHavesAckState,
  event: RequestPropagationHavesAckEvent,
): RequestPropagationHavesAckStepResult {
  if (event.kind === "propagation-transfer/request-haves-ack-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRequestPropagationHavesAck({
            actionIsHavesAck: event.actionIsHavesAck,
            haveCount: event.haveCount,
          })
            ? "request"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRequestPropagationHavesAckNow(
  actions: ReadonlyArray<RequestPropagationHavesAckAction>,
): boolean {
  return actions.some((action) => action.kind === "request");
}

export function shouldSkipRequestPropagationHavesAck(
  actions: ReadonlyArray<RequestPropagationHavesAckAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}
