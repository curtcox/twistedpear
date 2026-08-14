/**
 * Pure interface reconnect scheduling decisions and timer step machine.
 * Socket connect / timer arming stay at the adapter edge.
 * Interface name / MTU / closed / send / enqueue / deliver / yield gates
 * conclude via machine actions (no ad-hoc `isValidInterfaceName` /
 * `packetFitsInterfaceMtu` / `isInterfaceClosed` / `canInterfaceSend` /
 * `shouldEnqueueRawInterfaceFrame` / `shouldEnqueueDecodedPacket` /
 * `shouldDeliverQueuedPacket` / `shouldYieldBufferedPacket` reads beside
 * the step). Reconnect plan nested via
 * {@link stepInterfaceReconnectPlanWithActions} (`reconnect`|`give-up`).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { hasActionOfKind } from "../action-kind.js";

export const INTERFACE_RECONNECT_WAIT_MS = 5_000;
export const INTERFACE_RECONNECT_TIMER_ID = "interface-reconnect";

/** Whether an interface name is non-empty (RNS interface config). */
export function isValidInterfaceName(name: string): boolean {
  return name.length > 0;
}

/**
 * Interface-name validity gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isValidInterfaceName`
 * reads beside the step).
 */
export type InterfaceNameValidState = Record<string, never>;

export type InterfaceNameValidEvent =
  | Event
  | {
      readonly kind: "iface/name-valid-gate";
      readonly name: string;
    };

export type InterfaceNameValidAction =
  { readonly kind: "valid" } | { readonly kind: "invalid" };

export interface InterfaceNameValidStepResult {
  readonly state: InterfaceNameValidState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceNameValidAction[];
}

export function initialInterfaceNameValidState(): InterfaceNameValidState {
  return {};
}

export function stepInterfaceNameValidWithActions(
  state: InterfaceNameValidState,
  event: InterfaceNameValidEvent,
): InterfaceNameValidStepResult {
  if (event.kind === "iface/name-valid-gate") {
    return {
      state,
      intents: [],
      actions: [
        { kind: isValidInterfaceName(event.name) ? "valid" : "invalid" },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptInterfaceName(
  actions: ReadonlyArray<InterfaceNameValidAction>,
): boolean {
  return hasActionOfKind(actions, "valid");
}

export function shouldRejectInterfaceName(
  actions: ReadonlyArray<InterfaceNameValidAction>,
): boolean {
  return hasActionOfKind(actions, "invalid");
}

/** Whether a packet's raw length fits the interface MTU. */
export function packetFitsInterfaceMtu(
  rawLength: number,
  mtu: number,
): boolean {
  return rawLength <= mtu;
}

/**
 * Interface MTU fitness gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packetFitsInterfaceMtu`
 * reads beside the step).
 */
export type InterfaceMtuFitState = Record<string, never>;

export type InterfaceMtuFitEvent =
  | Event
  | {
      readonly kind: "iface/mtu-fit-gate";
      readonly rawLength: number;
      readonly mtu: number;
    };

export type InterfaceMtuFitAction =
  { readonly kind: "fit" } | { readonly kind: "overflow" };

export interface InterfaceMtuFitStepResult {
  readonly state: InterfaceMtuFitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceMtuFitAction[];
}

export function initialInterfaceMtuFitState(): InterfaceMtuFitState {
  return {};
}

export function stepInterfaceMtuFitWithActions(
  state: InterfaceMtuFitState,
  event: InterfaceMtuFitEvent,
): InterfaceMtuFitStepResult {
  if (event.kind === "iface/mtu-fit-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: packetFitsInterfaceMtu(event.rawLength, event.mtu)
            ? "fit"
            : "overflow",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInterfaceMtuFit(
  actions: ReadonlyArray<InterfaceMtuFitAction>,
): boolean {
  return hasActionOfKind(actions, "fit");
}

export function shouldInterfaceMtuOverflow(
  actions: ReadonlyArray<InterfaceMtuFitAction>,
): boolean {
  return hasActionOfKind(actions, "overflow");
}

/** Whether the interface is closed (no further send / receive / close work). */
export function isInterfaceClosed(closed: boolean): boolean {
  return closed;
}

/**
 * Interface closed gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isInterfaceClosed`
 * reads beside the step).
 */
export type InterfaceClosedState = Record<string, never>;

export type InterfaceClosedEvent =
  | Event
  | {
      readonly kind: "iface/closed-gate";
      readonly closed: boolean;
    };

export type InterfaceClosedAction =
  { readonly kind: "closed" } | { readonly kind: "open" };

export interface InterfaceClosedStepResult {
  readonly state: InterfaceClosedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceClosedAction[];
}

export function initialInterfaceClosedState(): InterfaceClosedState {
  return {};
}

export function stepInterfaceClosedWithActions(
  state: InterfaceClosedState,
  event: InterfaceClosedEvent,
): InterfaceClosedStepResult {
  if (event.kind === "iface/closed-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: isInterfaceClosed(event.closed) ? "closed" : "open" }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInterfaceClosedNow(
  actions: ReadonlyArray<InterfaceClosedAction>,
): boolean {
  return hasActionOfKind(actions, "closed");
}

export function shouldInterfaceOpenNow(
  actions: ReadonlyArray<InterfaceClosedAction>,
): boolean {
  return hasActionOfKind(actions, "open");
}

/** Whether the interface may send (open and configured for outbound traffic). */
export function canInterfaceSend(input: {
  readonly closed: boolean;
  readonly outgoing: boolean;
}): boolean {
  return !isInterfaceClosed(input.closed) && input.outgoing;
}

/**
 * Interface send-allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canInterfaceSend`
 * reads beside the step).
 */
export type InterfaceSendAllowState = Record<string, never>;

export type InterfaceSendAllowEvent =
  | Event
  | {
      readonly kind: "iface/send-allow-gate";
      readonly closed: boolean;
      readonly outgoing: boolean;
    };

export type InterfaceSendAllowAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface InterfaceSendAllowStepResult {
  readonly state: InterfaceSendAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceSendAllowAction[];
}

export function initialInterfaceSendAllowState(): InterfaceSendAllowState {
  return {};
}

export function stepInterfaceSendAllowWithActions(
  state: InterfaceSendAllowState,
  event: InterfaceSendAllowEvent,
): InterfaceSendAllowStepResult {
  if (event.kind === "iface/send-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canInterfaceSend({
            closed: event.closed,
            outgoing: event.outgoing,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowInterfaceSend(
  actions: ReadonlyArray<InterfaceSendAllowAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyInterfaceSend(
  actions: ReadonlyArray<InterfaceSendAllowAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}

/** Whether a raw (non-HDLC) inbound byte chunk should be enqueued as a frame. */
export function shouldEnqueueRawInterfaceFrame(length: number): boolean {
  return length > 0;
}

/**
 * Raw interface-frame enqueue gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldEnqueueRawInterfaceFrame` reads beside the step).
 */
export type EnqueueRawInterfaceFrameState = Record<string, never>;

export type EnqueueRawInterfaceFrameEvent =
  | Event
  | {
      readonly kind: "iface/enqueue-raw-frame-gate";
      readonly length: number;
    };

export type EnqueueRawInterfaceFrameAction =
  { readonly kind: "enqueue" } | { readonly kind: "skip" };

export interface EnqueueRawInterfaceFrameStepResult {
  readonly state: EnqueueRawInterfaceFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EnqueueRawInterfaceFrameAction[];
}

export function initialEnqueueRawInterfaceFrameState(): EnqueueRawInterfaceFrameState {
  return {};
}

export function stepEnqueueRawInterfaceFrameWithActions(
  state: EnqueueRawInterfaceFrameState,
  event: EnqueueRawInterfaceFrameEvent,
): EnqueueRawInterfaceFrameStepResult {
  if (event.kind === "iface/enqueue-raw-frame-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEnqueueRawInterfaceFrame(event.length)
            ? "enqueue"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEnqueueRawInterfaceFrameNow(
  actions: ReadonlyArray<EnqueueRawInterfaceFrameAction>,
): boolean {
  return hasActionOfKind(actions, "enqueue");
}

export function shouldSkipRawInterfaceFrameEnqueue(
  actions: ReadonlyArray<EnqueueRawInterfaceFrameAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether a successfully decoded packet should be pushed onto the inbound queue. */
export function shouldEnqueueDecodedPacket(packetPresent: boolean): boolean {
  return packetPresent;
}

/**
 * Decoded-packet enqueue gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldEnqueueDecodedPacket` reads beside the step).
 */
export type EnqueueDecodedPacketState = Record<string, never>;

export type EnqueueDecodedPacketEvent =
  | Event
  | {
      readonly kind: "iface/enqueue-decoded-packet-gate";
      readonly packetPresent: boolean;
    };

export type EnqueueDecodedPacketAction =
  { readonly kind: "enqueue" } | { readonly kind: "skip" };

export interface EnqueueDecodedPacketStepResult {
  readonly state: EnqueueDecodedPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EnqueueDecodedPacketAction[];
}

export function initialEnqueueDecodedPacketState(): EnqueueDecodedPacketState {
  return {};
}

export function stepEnqueueDecodedPacketWithActions(
  state: EnqueueDecodedPacketState,
  event: EnqueueDecodedPacketEvent,
): EnqueueDecodedPacketStepResult {
  if (event.kind === "iface/enqueue-decoded-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEnqueueDecodedPacket(event.packetPresent)
            ? "enqueue"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEnqueueDecodedPacketNow(
  actions: ReadonlyArray<EnqueueDecodedPacketAction>,
): boolean {
  return hasActionOfKind(actions, "enqueue");
}

export function shouldSkipDecodedPacketEnqueue(
  actions: ReadonlyArray<EnqueueDecodedPacketAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether a pushed packet should be delivered immediately to a waiting iterator. */
export function shouldDeliverQueuedPacket(waiterPresent: boolean): boolean {
  return waiterPresent;
}

/**
 * Queued-packet deliver gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDeliverQueuedPacket` reads beside the step).
 */
export type DeliverQueuedPacketState = Record<string, never>;

export type DeliverQueuedPacketEvent =
  | Event
  | {
      readonly kind: "iface/deliver-queued-packet-gate";
      readonly waiterPresent: boolean;
    };

export type DeliverQueuedPacketAction =
  { readonly kind: "deliver" } | { readonly kind: "buffer" };

export interface DeliverQueuedPacketStepResult {
  readonly state: DeliverQueuedPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeliverQueuedPacketAction[];
}

export function initialDeliverQueuedPacketState(): DeliverQueuedPacketState {
  return {};
}

export function stepDeliverQueuedPacketWithActions(
  state: DeliverQueuedPacketState,
  event: DeliverQueuedPacketEvent,
): DeliverQueuedPacketStepResult {
  if (event.kind === "iface/deliver-queued-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldDeliverQueuedPacket(event.waiterPresent)
            ? "deliver"
            : "buffer",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDeliverQueuedPacketNow(
  actions: ReadonlyArray<DeliverQueuedPacketAction>,
): boolean {
  return hasActionOfKind(actions, "deliver");
}

export function shouldBufferQueuedPacket(
  actions: ReadonlyArray<DeliverQueuedPacketAction>,
): boolean {
  return hasActionOfKind(actions, "buffer");
}

/** Whether a buffered queue value should be yielded from the iterator. */
export function shouldYieldBufferedPacket(valuePresent: boolean): boolean {
  return valuePresent;
}

/**
 * Buffered-packet yield gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldYieldBufferedPacket` reads beside the step).
 */
export type YieldBufferedPacketState = Record<string, never>;

export type YieldBufferedPacketEvent =
  | Event
  | {
      readonly kind: "iface/yield-buffered-packet-gate";
      readonly valuePresent: boolean;
    };

export type YieldBufferedPacketAction =
  { readonly kind: "yield" } | { readonly kind: "skip" };

export interface YieldBufferedPacketStepResult {
  readonly state: YieldBufferedPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly YieldBufferedPacketAction[];
}

export function initialYieldBufferedPacketState(): YieldBufferedPacketState {
  return {};
}

export function stepYieldBufferedPacketWithActions(
  state: YieldBufferedPacketState,
  event: YieldBufferedPacketEvent,
): YieldBufferedPacketStepResult {
  if (event.kind === "iface/yield-buffered-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldYieldBufferedPacket(event.valuePresent)
            ? "yield"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldYieldBufferedPacketNow(
  actions: ReadonlyArray<YieldBufferedPacketAction>,
): boolean {
  return hasActionOfKind(actions, "yield");
}

export function shouldSkipBufferedPacketYield(
  actions: ReadonlyArray<YieldBufferedPacketAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}
