import { describe, expect, it } from "vitest";
import {
  INTERFACE_RECONNECT_TIMER_ID,
  INTERFACE_RECONNECT_WAIT_MS,
  canInterfaceSend,
  initialDeliverQueuedPacketState,
  initialEnqueueDecodedPacketState,
  initialEnqueueRawInterfaceFrameState,
  initialInterfaceClosedState,
  initialInterfaceMtuFitState,
  initialInterfaceNameValidState,
  initialInterfaceReconnectPlanState,
  initialInterfaceReconnectState,
  initialInterfaceSendAllowState,
  initialYieldBufferedPacketState,
  isInterfaceClosed,
  isValidInterfaceName,
  packetFitsInterfaceMtu,
  planInterfaceReconnect,
  interfaceReconnectGiveUpFromActions,
  interfaceReconnectPlanFromActions,
  interfaceReconnectRetryFromActions,
  shouldAcceptInterfaceName,
  shouldAllowInterfaceSend,
  shouldBufferQueuedPacket,
  shouldDeliverQueuedPacket,
  shouldDeliverQueuedPacketNow,
  shouldDenyInterfaceSend,
  shouldEnqueueDecodedPacket,
  shouldEnqueueDecodedPacketNow,
  shouldEnqueueRawInterfaceFrame,
  shouldEnqueueRawInterfaceFrameNow,
  shouldInterfaceClosedNow,
  shouldInterfaceMtuFit,
  shouldInterfaceMtuOverflow,
  shouldInterfaceOpenNow,
  shouldRejectInterfaceName,
  shouldGiveUpInterfaceReconnectPlan,
  shouldReconnectInterfacePlan,
  shouldSkipBufferedPacketYield,
  shouldSkipDecodedPacketEnqueue,
  shouldSkipRawInterfaceFrameEnqueue,
  shouldYieldBufferedPacket,
  shouldYieldBufferedPacketNow,
  stepDeliverQueuedPacketWithActions,
  stepEnqueueDecodedPacketWithActions,
  stepEnqueueRawInterfaceFrameWithActions,
  stepInterfaceClosedWithActions,
  stepInterfaceMtuFitWithActions,
  stepInterfaceNameValidWithActions,
  stepInterfaceReconnectPlanWithActions,
  stepInterfaceReconnectWithActions,
  stepInterfaceSendAllowWithActions,
  stepYieldBufferedPacketWithActions
} from "../src/interface-reconnect.js";

describe("protocol interface reconnect", () => {
  it("rejects empty interface names", () => {
    expect(isValidInterfaceName("")).toBe(false);
    expect(isValidInterfaceName("wlan0")).toBe(true);

    const valid = stepInterfaceNameValidWithActions(initialInterfaceNameValidState(), {
      kind: "iface/name-valid-gate",
      name: "wlan0"
    });
    expect(shouldAcceptInterfaceName(valid.actions)).toBe(true);
    expect(shouldRejectInterfaceName(valid.actions)).toBe(false);

    const invalid = stepInterfaceNameValidWithActions(initialInterfaceNameValidState(), {
      kind: "iface/name-valid-gate",
      name: ""
    });
    expect(shouldAcceptInterfaceName(invalid.actions)).toBe(false);
    expect(shouldRejectInterfaceName(invalid.actions)).toBe(true);
  });

  it("gates packets by interface MTU", () => {
    expect(packetFitsInterfaceMtu(500, 500)).toBe(true);
    expect(packetFitsInterfaceMtu(501, 500)).toBe(false);
    expect(packetFitsInterfaceMtu(0, 500)).toBe(true);

    const fit = stepInterfaceMtuFitWithActions(initialInterfaceMtuFitState(), {
      kind: "iface/mtu-fit-gate",
      rawLength: 500,
      mtu: 500
    });
    expect(shouldInterfaceMtuFit(fit.actions)).toBe(true);
    expect(shouldInterfaceMtuOverflow(fit.actions)).toBe(false);

    const overflow = stepInterfaceMtuFitWithActions(initialInterfaceMtuFitState(), {
      kind: "iface/mtu-fit-gate",
      rawLength: 501,
      mtu: 500
    });
    expect(shouldInterfaceMtuFit(overflow.actions)).toBe(false);
    expect(shouldInterfaceMtuOverflow(overflow.actions)).toBe(true);
  });

  it("detects closed interface state", () => {
    expect(isInterfaceClosed(true)).toBe(true);
    expect(isInterfaceClosed(false)).toBe(false);

    const closed = stepInterfaceClosedWithActions(initialInterfaceClosedState(), {
      kind: "iface/closed-gate",
      closed: true
    });
    expect(shouldInterfaceClosedNow(closed.actions)).toBe(true);
    expect(shouldInterfaceOpenNow(closed.actions)).toBe(false);

    const open = stepInterfaceClosedWithActions(initialInterfaceClosedState(), {
      kind: "iface/closed-gate",
      closed: false
    });
    expect(shouldInterfaceClosedNow(open.actions)).toBe(false);
    expect(shouldInterfaceOpenNow(open.actions)).toBe(true);
  });

  it("gates sends when closed or not outgoing", () => {
    expect(canInterfaceSend({ closed: false, outgoing: true })).toBe(true);
    expect(canInterfaceSend({ closed: true, outgoing: true })).toBe(false);
    expect(canInterfaceSend({ closed: false, outgoing: false })).toBe(false);

    const allow = stepInterfaceSendAllowWithActions(initialInterfaceSendAllowState(), {
      kind: "iface/send-allow-gate",
      closed: false,
      outgoing: true
    });
    expect(shouldAllowInterfaceSend(allow.actions)).toBe(true);
    expect(shouldDenyInterfaceSend(allow.actions)).toBe(false);

    const deny = stepInterfaceSendAllowWithActions(initialInterfaceSendAllowState(), {
      kind: "iface/send-allow-gate",
      closed: true,
      outgoing: true
    });
    expect(shouldAllowInterfaceSend(deny.actions)).toBe(false);
    expect(shouldDenyInterfaceSend(deny.actions)).toBe(true);
  });

  it("skips empty raw inbound frames", () => {
    expect(shouldEnqueueRawInterfaceFrame(0)).toBe(false);
    expect(shouldEnqueueRawInterfaceFrame(1)).toBe(true);

    const enqueue = stepEnqueueRawInterfaceFrameWithActions(
      initialEnqueueRawInterfaceFrameState(),
      { kind: "iface/enqueue-raw-frame-gate", length: 1 }
    );
    expect(shouldEnqueueRawInterfaceFrameNow(enqueue.actions)).toBe(true);
    expect(shouldSkipRawInterfaceFrameEnqueue(enqueue.actions)).toBe(false);

    const skip = stepEnqueueRawInterfaceFrameWithActions(initialEnqueueRawInterfaceFrameState(), {
      kind: "iface/enqueue-raw-frame-gate",
      length: 0
    });
    expect(shouldEnqueueRawInterfaceFrameNow(skip.actions)).toBe(false);
    expect(shouldSkipRawInterfaceFrameEnqueue(skip.actions)).toBe(true);
  });

  it("skips null decoded packets", () => {
    expect(shouldEnqueueDecodedPacket(false)).toBe(false);
    expect(shouldEnqueueDecodedPacket(true)).toBe(true);

    const enqueue = stepEnqueueDecodedPacketWithActions(initialEnqueueDecodedPacketState(), {
      kind: "iface/enqueue-decoded-packet-gate",
      packetPresent: true
    });
    expect(shouldEnqueueDecodedPacketNow(enqueue.actions)).toBe(true);
    expect(shouldSkipDecodedPacketEnqueue(enqueue.actions)).toBe(false);

    const skip = stepEnqueueDecodedPacketWithActions(initialEnqueueDecodedPacketState(), {
      kind: "iface/enqueue-decoded-packet-gate",
      packetPresent: false
    });
    expect(shouldEnqueueDecodedPacketNow(skip.actions)).toBe(false);
    expect(shouldSkipDecodedPacketEnqueue(skip.actions)).toBe(true);
  });

  it("delivers queued packets to waiting iterators", () => {
    expect(shouldDeliverQueuedPacket(true)).toBe(true);
    expect(shouldDeliverQueuedPacket(false)).toBe(false);

    const deliver = stepDeliverQueuedPacketWithActions(initialDeliverQueuedPacketState(), {
      kind: "iface/deliver-queued-packet-gate",
      waiterPresent: true
    });
    expect(shouldDeliverQueuedPacketNow(deliver.actions)).toBe(true);
    expect(shouldBufferQueuedPacket(deliver.actions)).toBe(false);

    const buffer = stepDeliverQueuedPacketWithActions(initialDeliverQueuedPacketState(), {
      kind: "iface/deliver-queued-packet-gate",
      waiterPresent: false
    });
    expect(shouldDeliverQueuedPacketNow(buffer.actions)).toBe(false);
    expect(shouldBufferQueuedPacket(buffer.actions)).toBe(true);
  });

  it("yields buffered queue values from the iterator", () => {
    expect(shouldYieldBufferedPacket(true)).toBe(true);
    expect(shouldYieldBufferedPacket(false)).toBe(false);

    const yieldNow = stepYieldBufferedPacketWithActions(initialYieldBufferedPacketState(), {
      kind: "iface/yield-buffered-packet-gate",
      valuePresent: true
    });
    expect(shouldYieldBufferedPacketNow(yieldNow.actions)).toBe(true);
    expect(shouldSkipBufferedPacketYield(yieldNow.actions)).toBe(false);

    const skip = stepYieldBufferedPacketWithActions(initialYieldBufferedPacketState(), {
      kind: "iface/yield-buffered-packet-gate",
      valuePresent: false
    });
    expect(shouldYieldBufferedPacketNow(skip.actions)).toBe(false);
    expect(shouldSkipBufferedPacketYield(skip.actions)).toBe(true);
  });

  it("schedules reconnects with default wait", () => {
    expect(planInterfaceReconnect({ attempts: 0 })).toEqual({
      kind: "reconnect",
      delayMs: INTERFACE_RECONNECT_WAIT_MS,
      attempt: 1
    });

    const plan = stepInterfaceReconnectPlanWithActions(initialInterfaceReconnectPlanState(), {
      kind: "iface/reconnect-plan-gate",
      attempts: 0
    });
    expect(shouldReconnectInterfacePlan(plan.actions)).toBe(true);
    expect(interfaceReconnectRetryFromActions(plan.actions)).toEqual({
      kind: "reconnect",
      delayMs: INTERFACE_RECONNECT_WAIT_MS,
      attempt: 1
    });
    expect(interfaceReconnectPlanFromActions(plan.actions)).toEqual({
      kind: "reconnect",
      delayMs: INTERFACE_RECONNECT_WAIT_MS,
      attempt: 1
    });
  });

  it("gives up after max tries", () => {
    expect(planInterfaceReconnect({ attempts: 2, maxTries: 2 })).toEqual({
      kind: "give-up",
      attempt: 3
    });
    expect(
      planInterfaceReconnect({ attempts: 1, maxTries: 3, waitMs: 1000 })
    ).toEqual({ kind: "reconnect", delayMs: 1000, attempt: 2 });

    const giveUpPlan = stepInterfaceReconnectPlanWithActions(
      initialInterfaceReconnectPlanState(),
      {
        kind: "iface/reconnect-plan-gate",
        attempts: 2,
        maxTries: 2
      }
    );
    expect(shouldGiveUpInterfaceReconnectPlan(giveUpPlan.actions)).toBe(true);
    expect(interfaceReconnectGiveUpFromActions(giveUpPlan.actions)).toEqual({
      kind: "give-up",
      attempt: 3
    });
  });

  it("arms a reconnect timer on disconnect and connects on fire", () => {
    let state = initialInterfaceReconnectState({ maxTries: 2, waitMs: 1000 });
    const scheduled = stepInterfaceReconnectWithActions(state, { kind: "iface/disconnected" });
    expect(scheduled.state.waiting).toBe(true);
    expect(scheduled.intents).toEqual([
      { kind: "timer/cancel", timer: { id: INTERFACE_RECONNECT_TIMER_ID } },
      { kind: "timer/set", timer: { id: INTERFACE_RECONNECT_TIMER_ID, delayMs: 1000 } }
    ]);

    state = scheduled.state;
    const fired = stepInterfaceReconnectWithActions(state, {
      kind: "timer/fired",
      id: INTERFACE_RECONNECT_TIMER_ID,
      at: 0
    });
    expect(fired.actions).toEqual([{ kind: "connect", attempt: 1 }]);
    expect(fired.state.attempts).toBe(1);
  });

  it("gives up when max tries is exceeded", () => {
    let state = initialInterfaceReconnectState({ maxTries: 1, waitMs: 500 });
    state = stepInterfaceReconnectWithActions(state, { kind: "iface/disconnected" }).state;
    state = stepInterfaceReconnectWithActions(state, {
      kind: "timer/fired",
      id: INTERFACE_RECONNECT_TIMER_ID,
      at: 0
    }).state;
    state = stepInterfaceReconnectWithActions(state, { kind: "iface/connect-failed" }).state;
    const giveUp = stepInterfaceReconnectWithActions(state, {
      kind: "timer/fired",
      id: INTERFACE_RECONNECT_TIMER_ID,
      at: 500
    });
    expect(giveUp.actions).toEqual([{ kind: "give-up", attempt: 2 }]);
  });
});
