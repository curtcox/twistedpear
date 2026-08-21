import { describe, expect, it } from "vitest";
import { ContainmentTracker } from "../../sim-campaign/src/metrics.js";
import {
  EgressBudgetLedger,
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  type BrokerAuditEntry,
} from "../src/index.js";
import {
  initialEgressOfferStore,
  stepEgressOfferStore,
} from "@twistedpear/protocol";

const unusedBackend = {
  name: "unused",
  async spawn() {
    throw new Error("not used");
  },
};

describe("per-offer egress budgets", () => {
  it("resets the rolling 24-hour window", () => {
    const ledger = new EgressBudgetLedger();
    const offers = stepEgressOfferStore(initialEgressOfferStore(), {
      kind: "egress/grant",
      offer: {
        id: "egress-1",
        appId: "line-check",
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: "peer-a",
        displayLabel: "peer-a",
        constraints: { maxBytesPerDay: 10 },
        grantedAt: 0,
      },
      ttlMs: 3 * 86_400_000,
    });
    const offer = offers.get("egress-1")!;
    ledger.consume(offer, 10, 0);
    expect(() => ledger.consume(offer, 1, 1)).toThrow(/budget/);
    expect(() => ledger.consume(offer, 10, 86_400_000)).not.toThrow();
  });

  it("enforces maxBytesPerDay, audits the target, and attributes containment", async () => {
    const audit: BrokerAuditEntry[] = [];
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      now: () => 1_000,
      brokerAudit: (entry) => audit.push(entry),
    });
    const capabilities = ["lxmf:send"];
    const manifest = {
      name: "line-check",
      version: "1",
      entry: "bundle.js",
      publisherPublicKey: "publisher",
      capabilities,
    };
    await host.setGrants("line-check", "publisher", capabilities, capabilities);
    const offer = host.grantEgressOffer({
      appId: "line-check",
      capability: "lxmf:send",
      targetKind: "peer",
      targetId: "peer-a",
      ttlMs: 60_000,
      constraints: { maxBytesPerDay: 80 },
    });
    const first = await host.dispatchRaw(
      {
        id: "1",
        namespace: "lxmf",
        method: "send",
        capability: "lxmf:send",
        payload: { to: "peer-a", subject: "hi", body: "hi" },
      },
      manifest,
      capabilities,
    );
    expect(first.ok).toBe(true);
    expect(audit.some((entry) => entry.target === "peer-a")).toBe(true);

    const over = await host.dispatchRaw(
      {
        id: "2",
        namespace: "lxmf",
        method: "send",
        capability: "lxmf:send",
        payload: {
          to: "peer-a",
          subject: "x".repeat(80),
          body: "x".repeat(80),
        },
      },
      manifest,
      capabilities,
    );
    expect(over.ok).toBe(false);
    expect(over.error).toMatchObject({ code: "EGRESS_DENIED" });
    expect(over.error?.message).toMatch(/budget/);

    const tracker = new ContainmentTracker("lan");
    tracker.exfiltration({
      appId: "line-check",
      grantId: offer.id,
      peerId: "peer-a",
    });
    expect(tracker.snapshot().egressAttributability).toBe(1);
  });
});
