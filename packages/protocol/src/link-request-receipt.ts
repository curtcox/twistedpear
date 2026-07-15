/**
 * Pure link request-receipt status codes and transitions (RNS Link.RequestReceipt).
 * Pending-request index / unregister / RESPONSE-deliver conclusions leave via
 * machine actions (no ad-hoc `indexOfPendingLinkAppRequest` /
 * `planUnregisterPendingLinkRequest` /
 * `shouldDeliverPendingLinkAppResponse` reads beside the step).
 * Unregister plan nested via {@link stepPendingLinkRequestUnregisterPlanWithActions}.
 */
import type { Event, Intent } from "@twistedpear/effects";
import { equalByteArrays } from "./path-table.js";

export const LinkRequestReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  RECEIVING: 0x03,
  READY: 0x04
} as const;

export type LinkRequestReceiptStatusValue =
  (typeof LinkRequestReceiptStatus)[keyof typeof LinkRequestReceiptStatus];

export interface LinkRequestReceiptState {
  readonly status: LinkRequestReceiptStatusValue;
  readonly response: Uint8Array | null;
  readonly progress: number;
  readonly concludedAt: number | null;
}

export type LinkRequestReceiptEvent =
  | { readonly kind: "request/timeout"; readonly at: number }
  | { readonly kind: "request/response"; readonly at: number; readonly response: Uint8Array | null };

export type LinkRequestReceiptAction =
  | { readonly kind: "failed" }
  | { readonly kind: "response" };

export interface LinkRequestReceiptStepResult {
  readonly state: LinkRequestReceiptState;
  readonly actions: readonly LinkRequestReceiptAction[];
}

export function initialLinkRequestReceiptState(): LinkRequestReceiptState {
  return {
    status: LinkRequestReceiptStatus.SENT,
    response: null,
    progress: 0,
    concludedAt: null
  };
}

export function stepLinkRequestReceipt(
  state: LinkRequestReceiptState,
  event: LinkRequestReceiptEvent
): LinkRequestReceiptStepResult {
  if (event.kind === "request/timeout") {
    if (
      state.status === LinkRequestReceiptStatus.SENT ||
      state.status === LinkRequestReceiptStatus.DELIVERED
    ) {
      return {
        state: {
          ...state,
          status: LinkRequestReceiptStatus.FAILED,
          concludedAt: event.at
        },
        actions: [{ kind: "failed" }]
      };
    }
    return { state, actions: [] };
  }

  return {
    state: {
      status: LinkRequestReceiptStatus.READY,
      response: event.response,
      progress: 1,
      concludedAt: event.at
    },
    actions: [{ kind: "response" }]
  };
}

/** Index of a pending link app-request by request-id (RESPONSE dispatch). */
export function indexOfPendingLinkAppRequest(input: {
  readonly requestIds: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
}): number | null {
  for (let index = 0; index < input.requestIds.length; index += 1) {
    const requestId = input.requestIds[index];
    if (requestId != null && equalByteArrays(requestId, input.target)) {
      return index;
    }
  }
  return null;
}

/**
 * Pending link app-request index lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `indexOfPendingLinkAppRequest`
 * reads beside the step).
 */
export type IndexOfPendingLinkAppRequestState = Record<string, never>;

export type IndexOfPendingLinkAppRequestEvent =
  | Event
  | {
      readonly kind: "link/pending-app-request-index-gate";
      readonly requestIds: ReadonlyArray<Uint8Array>;
      readonly target: Uint8Array;
    };

export type IndexOfPendingLinkAppRequestAction =
  | { readonly kind: "use-index"; readonly index: number }
  | { readonly kind: "miss" };

export interface IndexOfPendingLinkAppRequestStepResult {
  readonly state: IndexOfPendingLinkAppRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IndexOfPendingLinkAppRequestAction[];
}

export function initialIndexOfPendingLinkAppRequestState(): IndexOfPendingLinkAppRequestState {
  return {};
}

export function stepIndexOfPendingLinkAppRequestWithActions(
  state: IndexOfPendingLinkAppRequestState,
  event: IndexOfPendingLinkAppRequestEvent
): IndexOfPendingLinkAppRequestStepResult {
  if (event.kind === "link/pending-app-request-index-gate") {
    const index = indexOfPendingLinkAppRequest({
      requestIds: event.requestIds,
      target: event.target
    });
    return {
      state,
      intents: [],
      actions:
        index === null
          ? [{ kind: "miss" }]
          : [{ kind: "use-index", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePendingLinkAppRequestIndex(
  actions: ReadonlyArray<IndexOfPendingLinkAppRequestAction>
): boolean {
  return actions.some((action) => action.kind === "use-index");
}

export function shouldMissPendingLinkAppRequestIndex(
  actions: ReadonlyArray<IndexOfPendingLinkAppRequestAction>
): boolean {
  return actions.some((action) => action.kind === "miss");
}

/** Extract pending app-request index from step actions; null when no `use-index`. */
export function pendingLinkAppRequestIndexFromActions(
  actions: ReadonlyArray<IndexOfPendingLinkAppRequestAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-index");
  return action?.kind === "use-index" ? action.index : null;
}

/** Whether RESPONSE dispatch may deliver after {@link indexOfPendingLinkAppRequest}. */
export function shouldDeliverPendingLinkAppResponse(indexPresent: boolean): boolean {
  return indexPresent;
}

/**
 * Pending link-app RESPONSE deliver gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldDeliverPendingLinkAppResponse` reads beside the step).
 */
export type DeliverPendingLinkAppResponseState = Record<string, never>;

export type DeliverPendingLinkAppResponseEvent =
  | Event
  | {
      readonly kind: "link/pending-app-response-deliver-gate";
      readonly indexPresent: boolean;
    };

export type DeliverPendingLinkAppResponseAction =
  | { readonly kind: "deliver" }
  | { readonly kind: "skip" };

export interface DeliverPendingLinkAppResponseStepResult {
  readonly state: DeliverPendingLinkAppResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeliverPendingLinkAppResponseAction[];
}

export function initialDeliverPendingLinkAppResponseState(): DeliverPendingLinkAppResponseState {
  return {};
}

export function stepDeliverPendingLinkAppResponseWithActions(
  state: DeliverPendingLinkAppResponseState,
  event: DeliverPendingLinkAppResponseEvent
): DeliverPendingLinkAppResponseStepResult {
  if (event.kind === "link/pending-app-response-deliver-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldDeliverPendingLinkAppResponse(event.indexPresent) ? "deliver" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDeliverPendingLinkAppResponseNow(
  actions: ReadonlyArray<DeliverPendingLinkAppResponseAction>
): boolean {
  return actions.some((action) => action.kind === "deliver");
}

export function shouldSkipPendingLinkAppResponseDeliver(
  actions: ReadonlyArray<DeliverPendingLinkAppResponseAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a pending link-request receipt list should receive a new member. */
export function shouldRegisterPendingLinkRequest(alreadyPresent: boolean): boolean {
  return !alreadyPresent;
}

/**
 * Pending link-request register gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterPendingLinkRequest` reads beside the step).
 */
export type PendingLinkRequestRegisterState = Record<string, never>;

export type PendingLinkRequestRegisterEvent =
  | Event
  | {
      readonly kind: "link/pending-request-register-gate";
      readonly alreadyPresent: boolean;
    };

export type PendingLinkRequestRegisterAction =
  | { readonly kind: "register" }
  | { readonly kind: "skip" };

export interface PendingLinkRequestRegisterStepResult {
  readonly state: PendingLinkRequestRegisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PendingLinkRequestRegisterAction[];
}

export function initialPendingLinkRequestRegisterState(): PendingLinkRequestRegisterState {
  return {};
}

export function stepPendingLinkRequestRegisterWithActions(
  state: PendingLinkRequestRegisterState,
  event: PendingLinkRequestRegisterEvent
): PendingLinkRequestRegisterStepResult {
  if (event.kind === "link/pending-request-register-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterPendingLinkRequest(event.alreadyPresent)
            ? "register"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterPendingLinkRequestNow(
  actions: ReadonlyArray<PendingLinkRequestRegisterAction>
): boolean {
  return actions.some((action) => action.kind === "register");
}

export function shouldSkipPendingLinkRequestRegister(
  actions: ReadonlyArray<PendingLinkRequestRegisterAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether construction should attach an outbound packet receipt to the request receipt. */
export function shouldAttachLinkRequestPacketReceipt(packetReceiptPresent: boolean): boolean {
  return packetReceiptPresent;
}

/**
 * Link-request packet-receipt attach gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAttachLinkRequestPacketReceipt` reads beside the step).
 */
export type AttachLinkRequestPacketReceiptState = Record<string, never>;

export type AttachLinkRequestPacketReceiptEvent =
  | Event
  | {
      readonly kind: "link/attach-request-packet-receipt-gate";
      readonly packetReceiptPresent: boolean;
    };

export type AttachLinkRequestPacketReceiptAction =
  | { readonly kind: "attach" }
  | { readonly kind: "skip" };

export interface AttachLinkRequestPacketReceiptStepResult {
  readonly state: AttachLinkRequestPacketReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AttachLinkRequestPacketReceiptAction[];
}

export function initialAttachLinkRequestPacketReceiptState(): AttachLinkRequestPacketReceiptState {
  return {};
}

export function stepAttachLinkRequestPacketReceiptWithActions(
  state: AttachLinkRequestPacketReceiptState,
  event: AttachLinkRequestPacketReceiptEvent
): AttachLinkRequestPacketReceiptStepResult {
  if (event.kind === "link/attach-request-packet-receipt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAttachLinkRequestPacketReceipt(event.packetReceiptPresent)
            ? "attach"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAttachLinkRequestPacketReceiptNow(
  actions: ReadonlyArray<AttachLinkRequestPacketReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "attach");
}

export function shouldSkipLinkRequestPacketReceiptAttach(
  actions: ReadonlyArray<AttachLinkRequestPacketReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Unregister a pending link-request receipt: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterPendingLinkRequest(index: number): number | null {
  return index >= 0 ? index : null;
}

/** Whether unregister may splice after {@link planUnregisterPendingLinkRequest}. */
export function shouldUnregisterPendingLinkRequest(indexPresent: boolean): boolean {
  return indexPresent;
}

/**
 * Pending link-request unregister plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterPendingLinkRequest` reads beside the step). Nested under
 * {@link stepPendingLinkRequestUnregisterWithActions}.
 */
export type PendingLinkRequestUnregisterPlanState = Record<string, never>;

export type PendingLinkRequestUnregisterPlanEvent =
  | Event
  | {
      readonly kind: "link/pending-request-unregister-plan-gate";
      readonly index: number;
    };

export type PendingLinkRequestUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};

export interface PendingLinkRequestUnregisterPlanStepResult {
  readonly state: PendingLinkRequestUnregisterPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PendingLinkRequestUnregisterPlanAction[];
}

export function initialPendingLinkRequestUnregisterPlanState(): PendingLinkRequestUnregisterPlanState {
  return {};
}

export function stepPendingLinkRequestUnregisterPlanWithActions(
  state: PendingLinkRequestUnregisterPlanState,
  event: PendingLinkRequestUnregisterPlanEvent
): PendingLinkRequestUnregisterPlanStepResult {
  if (event.kind === "link/pending-request-unregister-plan-gate") {
    const index = planUnregisterPendingLinkRequest(event.index);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function pendingLinkRequestUnregisterPlanIndex(
  actions: ReadonlyArray<PendingLinkRequestUnregisterPlanAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove");
  return action?.kind === "remove" ? action.index : null;
}

export function shouldRemovePendingLinkRequestUnregisterPlan(
  actions: ReadonlyArray<PendingLinkRequestUnregisterPlanAction>
): boolean {
  return actions.some((action) => action.kind === "remove");
}

/**
 * Pending link-request unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterPendingLinkRequest` reads beside the step).
 * Plan nested via {@link stepPendingLinkRequestUnregisterPlanWithActions}
 * (`remove`).
 */
export type PendingLinkRequestUnregisterState = Record<string, never>;

export type PendingLinkRequestUnregisterEvent =
  | Event
  | {
      readonly kind: "link/pending-request-unregister-gate";
      readonly index: number;
    };

export type PendingLinkRequestUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};

export interface PendingLinkRequestUnregisterStepResult {
  readonly state: PendingLinkRequestUnregisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PendingLinkRequestUnregisterAction[];
}

export function initialPendingLinkRequestUnregisterState(): PendingLinkRequestUnregisterState {
  return {};
}

export function stepPendingLinkRequestUnregisterWithActions(
  state: PendingLinkRequestUnregisterState,
  event: PendingLinkRequestUnregisterEvent
): PendingLinkRequestUnregisterStepResult {
  if (event.kind === "link/pending-request-unregister-gate") {
    const planActions = stepPendingLinkRequestUnregisterPlanWithActions(
      initialPendingLinkRequestUnregisterPlanState(),
      {
        kind: "link/pending-request-unregister-plan-gate",
        index: event.index
      }
    ).actions;
    const index = pendingLinkRequestUnregisterPlanIndex(planActions);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function pendingLinkRequestUnregisterIndex(
  actions: ReadonlyArray<PendingLinkRequestUnregisterAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove");
  return action?.kind === "remove" ? action.index : null;
}

export function shouldRemovePendingLinkRequest(
  actions: ReadonlyArray<PendingLinkRequestUnregisterAction>
): boolean {
  return actions.some((action) => action.kind === "remove");
}

/** Whether step actions include a failed/response fanout for the adapter callback. */
export function shouldInvokeLinkRequestReceiptAction(
  actions: ReadonlyArray<LinkRequestReceiptAction>,
  kind: LinkRequestReceiptAction["kind"]
): boolean {
  return actions.some((action) => action.kind === kind);
}
