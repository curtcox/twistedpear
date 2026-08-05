import { describe, expect, it } from "vitest";
import { createDropCensus, dropCensusKey } from "../src/drop-census.js";
import type { ObserveDropIntent } from "@twistedpear/protocol";

function drop(
  partial: Pick<ObserveDropIntent, "stage" | "reason"> &
    Partial<Pick<ObserveDropIntent, "destinationKey" | "ifaceId">>
): ObserveDropIntent {
  return { kind: "observe/drop", ...partial };
}

describe("drop census", () => {
  it("counts by reason and by peer", () => {
    const census = createDropCensus();
    census.record(
      drop({
        stage: "announce-rate-limit",
        reason: "rate_limited",
        destinationKey: "peer-a"
      })
    );
    census.record(
      drop({
        stage: "announce-rate-limit",
        reason: "rate_limited",
        destinationKey: "peer-a"
      })
    );
    census.record(
      drop({
        stage: "announce-local-echo",
        reason: "local_echo",
        destinationKey: "peer-b"
      })
    );
    census.record(
      drop({
        stage: "ingress-dispatch",
        reason: "ignored"
      })
    );

    const snap = census.snapshot();
    const rateKey = dropCensusKey("announce-rate-limit", "rate_limited");
    expect(snap.byReason[rateKey]).toBe(2);
    expect(snap.byReason[dropCensusKey("announce-local-echo", "local_echo")]).toBe(1);
    expect(snap.byReason[dropCensusKey("ingress-dispatch", "ignored")]).toBe(1);
    expect(snap.byPeer["peer-a"]?.[rateKey]).toBe(2);
    expect(snap.byPeer["peer-b"]?.[dropCensusKey("announce-local-echo", "local_echo")]).toBe(1);
    expect(snap.byPeer["absent"]).toBeUndefined();
  });

  it("distinguishes a rate-limited peer from an absent peer", () => {
    const census = createDropCensus();
    census.record(
      drop({
        stage: "announce-rate-limit",
        reason: "rate_limited",
        destinationKey: "late-joiner"
      })
    );
    const snap = census.snapshot();
    const rateKey = dropCensusKey("announce-rate-limit", "rate_limited");
    expect(snap.byPeer["late-joiner"]?.[rateKey]).toBeGreaterThan(0);
    expect(snap.byPeer["never-transmitted"]).toBeUndefined();
    expect(snap.byReason[rateKey]).toBeGreaterThan(0);
  });
});
