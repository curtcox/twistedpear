/**
 * Pure packet-receipt timeout conclusion.
 * Adapters schedule/cancel clocks from timer intents and invoke
 * delivery/timeout callbacks only via machine actions (no ad-hoc
 * `state.timedOut` reads beside the step).
 * Register / keep / fail-and-drop gates conclude via machine actions (no
 * ad-hoc `shouldRegisterPacketReceipt` / `shouldKeepOutboundReceipt` /
 * `shouldFailAndDropOutboundReceipt` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export const RECEIPT_TIMEOUT_TIMER_ID = "receipt-timeout";

export const PacketReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  CULLED: 0xff
} as const;

export type PacketReceiptStatusValue =
  (typeof PacketReceiptStatus)[keyof typeof PacketReceiptStatus];

export interface PacketReceiptTimeoutState {
  readonly status: PacketReceiptStatusValue;
  readonly timeoutAt: number | null;
  readonly concludedAt: number | null;
  readonly timedOut: boolean;
}

export type PacketReceiptTimeoutEvent =
  | Event
  | { readonly kind: "receipt/arm"; readonly at: number; readonly timeoutSeconds: number }
  | { readonly kind: "receipt/delivered"; readonly at: number }
  | { readonly kind: "receipt/failed"; readonly at: number }
  | { readonly kind: "receipt/check"; readonly at: number };

export type PacketReceiptTimeoutAction =
  | { readonly kind: "timeout" }
  | { readonly kind: "delivered" }
  | { readonly kind: "failed" };

export interface PacketReceiptTimeoutStepResult {
  readonly state: PacketReceiptTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptTimeoutAction[];
}

export function initialPacketReceiptTimeoutState(): PacketReceiptTimeoutState {
  return {
    status: PacketReceiptStatus.SENT,
    timeoutAt: null,
    concludedAt: null,
    timedOut: false
  };
}

export function checkPacketReceiptTimeout(input: {
  readonly status: PacketReceiptStatusValue;
  readonly timeoutAt: number | null;
  readonly nowSeconds: number;
}): { readonly timedOut: boolean; readonly status: PacketReceiptStatusValue; readonly concludedAt: number | null } {
  if (
    input.status === PacketReceiptStatus.DELIVERED ||
    input.status === PacketReceiptStatus.FAILED
  ) {
    return { timedOut: false, status: input.status, concludedAt: null };
  }

  if (input.timeoutAt !== null && input.nowSeconds >= input.timeoutAt) {
    return {
      timedOut: true,
      status: PacketReceiptStatus.FAILED,
      concludedAt: input.nowSeconds
    };
  }

  return { timedOut: false, status: input.status, concludedAt: null };
}

/** Whether a packet-receipt timeout timer should be armed from intents. */
export function shouldArmPacketReceiptTimeoutTimer(timeoutSeconds: number): boolean {
  return timeoutSeconds > 0;
}

export const stepPacketReceiptTimeout: StepFn<PacketReceiptTimeoutState> = (state, event) => {
  const result = stepPacketReceiptTimeoutInner(state, event as PacketReceiptTimeoutEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPacketReceiptTimeoutWithActions(
  state: PacketReceiptTimeoutState,
  event: PacketReceiptTimeoutEvent
): PacketReceiptTimeoutStepResult {
  return stepPacketReceiptTimeoutInner(state, event);
}

function stepPacketReceiptTimeoutInner(
  state: PacketReceiptTimeoutState,
  event: PacketReceiptTimeoutEvent
): PacketReceiptTimeoutStepResult {
  if (event.kind === "receipt/arm") {
    const intents: Intent[] = [
      { kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } }
    ];
    if (shouldArmPacketReceiptTimeoutTimer(event.timeoutSeconds)) {
      intents.push({
        kind: "timer/set",
        timer: {
          id: RECEIPT_TIMEOUT_TIMER_ID,
          delayMs: event.timeoutSeconds * 1000
        }
      });
    }
    return {
      state: {
        status: PacketReceiptStatus.SENT,
        timeoutAt: event.at + event.timeoutSeconds,
        concludedAt: null,
        timedOut: false
      },
      intents,
      actions: []
    };
  }

  if (event.kind === "receipt/delivered") {
    return {
      state: {
        ...state,
        status: PacketReceiptStatus.DELIVERED,
        concludedAt: event.at,
        timedOut: false
      },
      intents: [{ kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } }],
      actions: [{ kind: "delivered" }]
    };
  }

  if (event.kind === "receipt/failed") {
    if (
      state.status === PacketReceiptStatus.DELIVERED ||
      state.status === PacketReceiptStatus.FAILED
    ) {
      return { state, intents: [], actions: [] };
    }
    return {
      state: {
        ...state,
        status: PacketReceiptStatus.FAILED,
        concludedAt: event.at,
        timedOut: false
      },
      intents: [{ kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } }],
      actions: [{ kind: "failed" }]
    };
  }

  if (
    event.kind === "receipt/check" ||
    (event.kind === "timer/fired" && event.id === RECEIPT_TIMEOUT_TIMER_ID)
  ) {
    const at = event.kind === "receipt/check" ? event.at : event.at / 1000;
    const result = checkPacketReceiptTimeout({
      status: state.status,
      timeoutAt: state.timeoutAt,
      nowSeconds: at
    });
    if (!result.timedOut) {
      return { state: { ...state, timedOut: false }, intents: [], actions: [] };
    }
    return {
      state: {
        status: result.status,
        timeoutAt: state.timeoutAt,
        concludedAt: result.concludedAt,
        timedOut: true
      },
      intents:
        event.kind === "receipt/check"
          ? [{ kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } }]
          : [],
      actions: [{ kind: "timeout" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export type OutboundReceiptOutcome = "none" | "keep-receipt" | "fail-and-drop-receipt";

/**
 * After outbound transmit: whether a created receipt is kept, failed+dropped, or unused.
 * Receipt construction / markFailed / splice stay at the adapter edge.
 */
export function planOutboundReceiptOutcome(input: {
  readonly createReceipt: boolean;
  readonly sent: boolean;
}): OutboundReceiptOutcome {
  if (!input.createReceipt) {
    return "none";
  }
  if (input.sent) {
    return "keep-receipt";
  }
  return "fail-and-drop-receipt";
}

/** Whether outbound send should fail+drop a created receipt after transmit failure. */
export function shouldFailAndDropOutboundReceipt(input: {
  readonly failAndDrop: boolean;
  readonly receiptPresent: boolean;
}): boolean {
  return input.failAndDrop && input.receiptPresent;
}

/**
 * Outbound fail-and-drop gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldFailAndDropOutboundReceipt` reads beside the step).
 */
export type FailAndDropOutboundReceiptState = Record<string, never>;

export type FailAndDropOutboundReceiptEvent =
  | Event
  | {
      readonly kind: "receipt/fail-and-drop-gate";
      readonly failAndDrop: boolean;
      readonly receiptPresent: boolean;
    };

export type FailAndDropOutboundReceiptAction =
  | { readonly kind: "fail-and-drop" }
  | { readonly kind: "skip" };

export interface FailAndDropOutboundReceiptStepResult {
  readonly state: FailAndDropOutboundReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly FailAndDropOutboundReceiptAction[];
}

export function initialFailAndDropOutboundReceiptState(): FailAndDropOutboundReceiptState {
  return {};
}

export function stepFailAndDropOutboundReceiptWithActions(
  state: FailAndDropOutboundReceiptState,
  event: FailAndDropOutboundReceiptEvent
): FailAndDropOutboundReceiptStepResult {
  if (event.kind === "receipt/fail-and-drop-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldFailAndDropOutboundReceipt({
            failAndDrop: event.failAndDrop,
            receiptPresent: event.receiptPresent
          })
            ? "fail-and-drop"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldFailAndDropOutboundReceiptNow(
  actions: ReadonlyArray<FailAndDropOutboundReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "fail-and-drop");
}

export function shouldSkipFailAndDropOutboundReceipt(
  actions: ReadonlyArray<FailAndDropOutboundReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether outbound send should return a kept receipt after outbound-outcome
 * actions say keep and the transmit succeeded.
 */
export function shouldKeepOutboundReceipt(input: {
  readonly planKeep: boolean;
  readonly sent: boolean;
}): boolean {
  return input.planKeep && input.sent;
}

/**
 * Outbound keep-receipt gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldKeepOutboundReceipt`
 * reads beside the step).
 */
export type KeepOutboundReceiptState = Record<string, never>;

export type KeepOutboundReceiptEvent =
  | Event
  | {
      readonly kind: "receipt/keep-outbound-gate";
      readonly planKeep: boolean;
      readonly sent: boolean;
    };

export type KeepOutboundReceiptAction =
  | { readonly kind: "keep" }
  | { readonly kind: "skip" };

export interface KeepOutboundReceiptStepResult {
  readonly state: KeepOutboundReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly KeepOutboundReceiptAction[];
}

export function initialKeepOutboundReceiptState(): KeepOutboundReceiptState {
  return {};
}

export function stepKeepOutboundReceiptWithActions(
  state: KeepOutboundReceiptState,
  event: KeepOutboundReceiptEvent
): KeepOutboundReceiptStepResult {
  if (event.kind === "receipt/keep-outbound-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldKeepOutboundReceipt({
            planKeep: event.planKeep,
            sent: event.sent
          })
            ? "keep"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldKeepOutboundReceiptNow(
  actions: ReadonlyArray<KeepOutboundReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "keep");
}

export function shouldSkipKeepOutboundReceipt(
  actions: ReadonlyArray<KeepOutboundReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type PacketReceiptProofIngressPlan = "remove-receipt" | "continue";

/**
 * After `planProofIngressKind === "receipt"`: whether this receipt may be removed.
 * Identity recall + validateProofPacket stay at the adapter edge as booleans.
 */
export function planPacketReceiptProofIngress(input: {
  readonly truncatedHashMatches: boolean;
  readonly identityPresent: boolean;
  readonly proofAccepted: boolean;
}): PacketReceiptProofIngressPlan {
  if (input.truncatedHashMatches && input.identityPresent && input.proofAccepted) {
    return "remove-receipt";
  }
  return "continue";
}

/**
 * Unregister a packet receipt from the transport receipt list.
 * Splice stays at the adapter.
 */
export function planUnregisterPacketReceipt(index: number): number | null {
  return index >= 0 ? index : null;
}

/** Whether unregister may splice after {@link planUnregisterPacketReceipt}. */
export function shouldUnregisterPacketReceipt(indexPresent: boolean): boolean {
  return indexPresent;
}

/**
 * Packet-receipt unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterPacketReceipt` reads beside the step).
 */
export type PacketReceiptUnregisterState = Record<string, never>;

export type PacketReceiptUnregisterEvent =
  | Event
  | {
      readonly kind: "receipt/unregister-gate";
      readonly index: number;
    };

export type PacketReceiptUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};

export interface PacketReceiptUnregisterStepResult {
  readonly state: PacketReceiptUnregisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptUnregisterAction[];
}

export function initialPacketReceiptUnregisterState(): PacketReceiptUnregisterState {
  return {};
}

export function stepPacketReceiptUnregisterWithActions(
  state: PacketReceiptUnregisterState,
  event: PacketReceiptUnregisterEvent
): PacketReceiptUnregisterStepResult {
  if (event.kind === "receipt/unregister-gate") {
    const index = planUnregisterPacketReceipt(event.index);
    return {
      state,
      intents: [],
      actions: index === null ? [] : [{ kind: "remove", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function packetReceiptUnregisterIndex(
  actions: ReadonlyArray<PacketReceiptUnregisterAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "remove");
  return action?.kind === "remove" ? action.index : null;
}

export function shouldRemovePacketReceipt(
  actions: ReadonlyArray<PacketReceiptUnregisterAction>
): boolean {
  return actions.some((action) => action.kind === "remove");
}

/** Whether an outbound send should create and register a packet receipt. */
export function shouldRegisterPacketReceipt(createReceipt: boolean): boolean {
  return createReceipt;
}

/**
 * Packet-receipt register gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterPacketReceipt` reads beside the step).
 */
export type RegisterPacketReceiptState = Record<string, never>;

export type RegisterPacketReceiptEvent =
  | Event
  | {
      readonly kind: "receipt/register-gate";
      readonly createReceipt: boolean;
    };

export type RegisterPacketReceiptAction =
  | { readonly kind: "register" }
  | { readonly kind: "skip" };

export interface RegisterPacketReceiptStepResult {
  readonly state: RegisterPacketReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterPacketReceiptAction[];
}

export function initialRegisterPacketReceiptState(): RegisterPacketReceiptState {
  return {};
}

export function stepRegisterPacketReceiptWithActions(
  state: RegisterPacketReceiptState,
  event: RegisterPacketReceiptEvent
): RegisterPacketReceiptStepResult {
  if (event.kind === "receipt/register-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldRegisterPacketReceipt(event.createReceipt) ? "register" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRegisterPacketReceiptNow(
  actions: ReadonlyArray<RegisterPacketReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "register");
}

export function shouldSkipRegisterPacketReceipt(
  actions: ReadonlyArray<RegisterPacketReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type PacketReceiptCallbackPlan = "clear" | "set";

/** Whether a packet-receipt timeout/delivery callback should be cleared or assigned. */
export function planPacketReceiptCallback(callbackPresent: boolean): PacketReceiptCallbackPlan {
  return callbackPresent ? "set" : "clear";
}

/**
 * Packet-receipt callback assignment is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketReceiptCallback`
 * / `plan === "clear"` reads beside the step).
 */
export type PacketReceiptCallbackState = Record<string, never>;

export type PacketReceiptCallbackEvent =
  | Event
  | {
      readonly kind: "receipt/callback-gate";
      readonly callbackPresent: boolean;
    };

export type PacketReceiptCallbackAction =
  | { readonly kind: "clear" }
  | { readonly kind: "set" };

export interface PacketReceiptCallbackStepResult {
  readonly state: PacketReceiptCallbackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptCallbackAction[];
}

export function initialPacketReceiptCallbackState(): PacketReceiptCallbackState {
  return {};
}

export function stepPacketReceiptCallbackWithActions(
  state: PacketReceiptCallbackState,
  event: PacketReceiptCallbackEvent
): PacketReceiptCallbackStepResult {
  if (event.kind === "receipt/callback-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: planPacketReceiptCallback(event.callbackPresent) }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldClearPacketReceiptCallback(
  actions: ReadonlyArray<PacketReceiptCallbackAction>
): boolean {
  return actions.some((action) => action.kind === "clear");
}

export function shouldSetPacketReceiptCallback(
  actions: ReadonlyArray<PacketReceiptCallbackAction>
): boolean {
  return actions.some((action) => action.kind === "set");
}

/** Whether step actions include a timeout/delivery/failed fanout for the adapter callback. */
export function shouldInvokePacketReceiptAction(
  actions: ReadonlyArray<PacketReceiptTimeoutAction>,
  kind: PacketReceiptTimeoutAction["kind"]
): boolean {
  return actions.some((action) => action.kind === kind);
}

/** Whether the adapter should invoke the timeout callback after a timed-out step. */
export function shouldInvokePacketReceiptTimeoutCallback(
  actions: ReadonlyArray<PacketReceiptTimeoutAction>
): boolean {
  return shouldInvokePacketReceiptAction(actions, "timeout");
}

/**
 * Outbound receipt outcome is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type OutboundReceiptState = Record<string, never>;

export type OutboundReceiptEvent =
  | Event
  | {
      readonly kind: "receipt/outbound-gate";
      readonly createReceipt: boolean;
      readonly sent: boolean;
    };

export type OutboundReceiptAction = {
  readonly kind: OutboundReceiptOutcome;
};

export interface OutboundReceiptStepResult {
  readonly state: OutboundReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly OutboundReceiptAction[];
}

export function initialOutboundReceiptState(): OutboundReceiptState {
  return {};
}

export const stepOutboundReceipt: StepFn<OutboundReceiptState> = (state, event) => {
  const result = stepOutboundReceiptInner(state, event as OutboundReceiptEvent);
  return { state: result.state, intents: result.intents };
};

export function stepOutboundReceiptWithActions(
  state: OutboundReceiptState,
  event: OutboundReceiptEvent
): OutboundReceiptStepResult {
  return stepOutboundReceiptInner(state, event);
}

export function outboundReceiptOutcomeFromActions(
  actions: ReadonlyArray<OutboundReceiptAction>
): OutboundReceiptOutcome | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldOutboundReceiptNone(
  actions: ReadonlyArray<OutboundReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "none");
}

export function shouldOutboundKeepReceipt(
  actions: ReadonlyArray<OutboundReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "keep-receipt");
}

export function shouldOutboundFailAndDropReceipt(
  actions: ReadonlyArray<OutboundReceiptAction>
): boolean {
  return actions.some((action) => action.kind === "fail-and-drop-receipt");
}

function stepOutboundReceiptInner(
  state: OutboundReceiptState,
  event: OutboundReceiptEvent
): OutboundReceiptStepResult {
  if (event.kind === "receipt/outbound-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planOutboundReceiptOutcome({
            createReceipt: event.createReceipt,
            sent: event.sent
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Packet-receipt proof ingress is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type PacketReceiptProofIngressState = Record<string, never>;

export type PacketReceiptProofIngressEvent =
  | Event
  | {
      readonly kind: "receipt/proof-ingress-gate";
      readonly truncatedHashMatches: boolean;
      readonly identityPresent: boolean;
      readonly proofAccepted: boolean;
    };

export type PacketReceiptProofIngressAction = {
  readonly kind: PacketReceiptProofIngressPlan;
};

export interface PacketReceiptProofIngressStepResult {
  readonly state: PacketReceiptProofIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptProofIngressAction[];
}

export function initialPacketReceiptProofIngressState(): PacketReceiptProofIngressState {
  return {};
}

export const stepPacketReceiptProofIngress: StepFn<PacketReceiptProofIngressState> = (
  state,
  event
) => {
  const result = stepPacketReceiptProofIngressInner(
    state,
    event as PacketReceiptProofIngressEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepPacketReceiptProofIngressWithActions(
  state: PacketReceiptProofIngressState,
  event: PacketReceiptProofIngressEvent
): PacketReceiptProofIngressStepResult {
  return stepPacketReceiptProofIngressInner(state, event);
}

export function packetReceiptProofIngressFromActions(
  actions: ReadonlyArray<PacketReceiptProofIngressAction>
): PacketReceiptProofIngressPlan | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export function shouldRemovePacketReceiptProofIngress(
  actions: ReadonlyArray<PacketReceiptProofIngressAction>
): boolean {
  return actions.some((action) => action.kind === "remove-receipt");
}

export function shouldContinuePacketReceiptProofIngress(
  actions: ReadonlyArray<PacketReceiptProofIngressAction>
): boolean {
  return actions.some((action) => action.kind === "continue");
}

function stepPacketReceiptProofIngressInner(
  state: PacketReceiptProofIngressState,
  event: PacketReceiptProofIngressEvent
): PacketReceiptProofIngressStepResult {
  if (event.kind === "receipt/proof-ingress-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planPacketReceiptProofIngress({
            truncatedHashMatches: event.truncatedHashMatches,
            identityPresent: event.identityPresent,
            proofAccepted: event.proofAccepted
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}
