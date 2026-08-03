// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  LinkStatus,
  LinkTeardownReason,
  LinkResourceStrategy,
  LINK_KEEPALIVE_MIN,
  LINK_RESPONSE_MAX_GRACE_TIME,
  LINK_TRAFFIC_TIMEOUT_FACTOR,
  computeKeepalive,
  computeLinkEstablishmentTimeout,
  computeLinkRequestTimeout,
  initialComputeKeepaliveState,
  initialComputeLinkEstablishmentTimeoutState,
  initialComputeLinkRequestTimeoutState,
  initialLinkWatchdogState,
  linkEstablishmentTimeoutFromActions,
  linkKeepaliveFromActions,
  linkRequestTimeoutFromActions,
  shouldUseLinkEstablishmentTimeout,
  shouldUseLinkKeepalive,
  shouldUseLinkRequestTimeout,
  stepComputeKeepaliveWithActions,
  stepComputeLinkEstablishmentTimeoutWithActions,
  stepComputeLinkRequestTimeoutWithActions,
  stepLinkWatchdogWithActions
} from "../src/link-watchdog.js";

describe("protocol link watchdog", () => {
  it("computes keepalive from rtt", () => {
    expect(computeKeepalive(0.01)).toBe(LINK_KEEPALIVE_MIN);
    expect(computeKeepalive(1.75)).toBe(360);
  });

  it("emits keepalive only from use-keepalive actions", () => {
    const stepped = stepComputeKeepaliveWithActions(initialComputeKeepaliveState(), {
      kind: "link/keepalive-gate",
      rtt: 1.0
    });
    expect(shouldUseLinkKeepalive(stepped.actions)).toBe(true);
    expect(linkKeepaliveFromActions(stepped.actions)).toBe(computeKeepalive(1.0));

    const empty = stepComputeKeepaliveWithActions(initialComputeKeepaliveState(), {
      kind: "noop"
    } as never);
    expect(shouldUseLinkKeepalive(empty.actions)).toBe(false);
    expect(linkKeepaliveFromActions(empty.actions)).toBeNull();
  });

  it("computes establishment timeout from hops", () => {
    expect(computeLinkEstablishmentTimeout(1)).toBe(366);
    expect(computeLinkEstablishmentTimeout(3)).toBe(378);
    expect(computeLinkEstablishmentTimeout(0)).toBe(366);
  });

  it("emits establishment timeout only from use-timeout actions", () => {
    const stepped = stepComputeLinkEstablishmentTimeoutWithActions(
      initialComputeLinkEstablishmentTimeoutState(),
      {
        kind: "link/establishment-timeout-gate",
        hops: 3
      }
    );
    expect(shouldUseLinkEstablishmentTimeout(stepped.actions)).toBe(true);
    expect(linkEstablishmentTimeoutFromActions(stepped.actions)).toBe(
      computeLinkEstablishmentTimeout(3)
    );

    const empty = stepComputeLinkEstablishmentTimeoutWithActions(
      initialComputeLinkEstablishmentTimeoutState(),
      { kind: "noop" } as never
    );
    expect(shouldUseLinkEstablishmentTimeout(empty.actions)).toBe(false);
    expect(linkEstablishmentTimeoutFromActions(empty.actions)).toBeNull();
  });

  it("computes link request timeout from rtt", () => {
    expect(computeLinkRequestTimeout(1)).toBe(
      LINK_TRAFFIC_TIMEOUT_FACTOR + LINK_RESPONSE_MAX_GRACE_TIME * 1.125
    );
  });

  it("emits request timeout only from use-timeout actions", () => {
    const stepped = stepComputeLinkRequestTimeoutWithActions(
      initialComputeLinkRequestTimeoutState(),
      {
        kind: "link/request-timeout-gate",
        rtt: 1
      }
    );
    expect(shouldUseLinkRequestTimeout(stepped.actions)).toBe(true);
    expect(linkRequestTimeoutFromActions(stepped.actions)).toBe(computeLinkRequestTimeout(1));

    const empty = stepComputeLinkRequestTimeoutWithActions(
      initialComputeLinkRequestTimeoutState(),
      { kind: "noop" } as never
    );
    expect(shouldUseLinkRequestTimeout(empty.actions)).toBe(false);
    expect(linkRequestTimeoutFromActions(empty.actions)).toBeNull();
  });

  it("exposes traffic timeout and resource strategy constants", () => {
    expect(LINK_TRAFFIC_TIMEOUT_FACTOR).toBe(6);
    expect(LINK_RESPONSE_MAX_GRACE_TIME).toBe(5);
    expect(LinkResourceStrategy.ACCEPT_ALL).toBe(0x01);
    expect(LinkStatus.ACTIVE).toBe(0x02);
  });

  it("closes pending links after establishment timeout", () => {
    let state = initialLinkWatchdogState({ initiator: true, requestTime: 100, establishmentTimeout: 10 });
    const tick = stepLinkWatchdogWithActions(state, {
      kind: "timer/fired",
      id: "link-watchdog",
      at: 110_000
    });
    expect(tick.actions).toEqual([{ kind: "close", reason: LinkTeardownReason.TIMEOUT }]);
    expect(tick.state.status).toBe(LinkStatus.CLOSED);
  });

  it("reschedules before establishment timeout elapses", () => {
    const state = initialLinkWatchdogState({ initiator: true, requestTime: 100, establishmentTimeout: 10 });
    const tick = stepLinkWatchdogWithActions(state, {
      kind: "timer/fired",
      id: "link-watchdog",
      at: 105_000
    });
    expect(tick.actions).toEqual([]);
    expect(tick.intents[0]?.kind).toBe("timer/set");
    expect(tick.intents[0]?.kind === "timer/set" ? tick.intents[0].timer.delayMs : 0).toBe(5000);
  });

  it("marks active links stale and eventually tears down", () => {
    let state = initialLinkWatchdogState({ initiator: true, requestTime: 0, establishmentTimeout: 5 });
    state = stepLinkWatchdogWithActions(state, {
      kind: "link/status",
      status: LinkStatus.ACTIVE,
      activatedAt: 0
    }).state;
    state = stepLinkWatchdogWithActions(state, { kind: "link/rtt-measured", rtt: 1.0 }).state;
    state = stepLinkWatchdogWithActions(state, { kind: "link/inbound", at: 0 }).state;

    const staleAt = state.keepalive + state.staleTime + 1;
    const stale = stepLinkWatchdogWithActions(state, {
      kind: "timer/fired",
      id: "link-watchdog",
      at: staleAt * 1000
    });
    expect(stale.actions.some((action) => action.kind === "mark-stale")).toBe(true);
    expect(stale.state.status).toBe(LinkStatus.STALE);

    const closed = stepLinkWatchdogWithActions(stale.state, {
      kind: "timer/fired",
      id: "link-watchdog",
      at: (staleAt + 10) * 1000
    });
    expect(closed.actions).toEqual([
      { kind: "send-teardown" },
      { kind: "close", reason: LinkTeardownReason.TIMEOUT }
    ]);
  });

  it("requests keepalive when inbound is overdue on initiator", () => {
    let state = initialLinkWatchdogState({ initiator: true, requestTime: 0, establishmentTimeout: 5 });
    state = stepLinkWatchdogWithActions(state, {
      kind: "link/status",
      status: LinkStatus.ACTIVE,
      activatedAt: 0
    }).state;
    state = stepLinkWatchdogWithActions(state, { kind: "link/rtt-measured", rtt: 1.0 }).state;

    const overdue = state.keepalive + 1;
    const tick = stepLinkWatchdogWithActions(state, {
      kind: "timer/fired",
      id: "link-watchdog",
      at: overdue * 1000
    });
    expect(tick.actions.some((action) => action.kind === "send-keepalive")).toBe(true);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialLinkWatchdogState({ initiator: false, requestTime: 50, establishmentTimeout: 12 });
      const steps = [
        stepLinkWatchdogWithActions(state, { kind: "start", at: 0 }),
        stepLinkWatchdogWithActions(state, { kind: "timer/fired", id: "link-watchdog", at: 62_000 })
      ];
      return steps.map((step) => ({
        status: step.state.status,
        actions: step.actions,
        delay:
          step.intents[0]?.kind === "timer/set" ? step.intents[0].timer.delayMs : null
      }));
    };
    expect(run()).toEqual(run());
  });

  it("revives STALE to ACTIVE on inbound", () => {
    const stale = {
      ...initialLinkWatchdogState({ initiator: true, requestTime: 1, establishmentTimeout: 10 }),
      status: LinkStatus.STALE,
      lastInbound: 1
    };
    const revived = stepLinkWatchdogWithActions(stale, { kind: "link/inbound", at: 42 });
    expect(revived.state.status).toBe(LinkStatus.ACTIVE);
    expect(revived.state.lastInbound).toBe(42);
  });

  it("records lastKeepalive on keepalive-sent", () => {
    const state = initialLinkWatchdogState({ initiator: true, requestTime: 0, establishmentTimeout: 5 });
    const stepped = stepLinkWatchdogWithActions(state, { kind: "link/keepalive-sent", at: 77 });
    expect(stepped.state.lastKeepalive).toBe(77);
  });
});
