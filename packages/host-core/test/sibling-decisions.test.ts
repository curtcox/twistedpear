import { beforeEach, describe, expect, it } from "vitest";
import {
  SIBLING_DECISION_CLASSES,
  SiblingDecisionGate,
  createInMemorySiblingProposalStore,
  createKeyValueSiblingGrantStore,
  type SiblingKeyValueStore,
  type SiblingProposal,
} from "../src/sibling-decisions.js";

class MemoryKv implements SiblingKeyValueStore {
  readonly values = new Map<string, Uint8Array>();
  async get(key: string): Promise<Uint8Array | null> {
    return this.values.get(key) ?? null;
  }
  async set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

const laptop = "11".repeat(16);
const tablet = "22".repeat(16);
const phone = "33".repeat(16);

function proposal(over: Partial<SiblingProposal> = {}): SiblingProposal {
  return {
    recordHash: "aa".repeat(32),
    installationId: laptop,
    decisionClass: "sibling:moderation",
    emittedAt: 1,
    payload: new TextEncoder().encode("block:someone"),
    ...over,
  };
}

describe("sibling decision gate", () => {
  let gate: SiblingDecisionGate;
  let grants: ReturnType<typeof createKeyValueSiblingGrantStore>;
  let proposals: ReturnType<typeof createInMemorySiblingProposalStore>;

  beforeEach(() => {
    grants = createKeyValueSiblingGrantStore(new MemoryKv());
    proposals = createInMemorySiblingProposalStore();
    gate = new SiblingDecisionGate({
      grants,
      proposals,
      isKnownInstallation: async (id) => id === laptop || id === tablet,
      selfInstallationId: phone,
    });
  });

  it("holds every class by default — silence is not consent", async () => {
    for (const decisionClass of SIBLING_DECISION_CLASSES) {
      const verdict = await gate.receive(
        proposal({ decisionClass, recordHash: decisionClass.padEnd(64, "0") }),
      );
      expect(verdict.outcome).toBe("hold");
    }
    expect(await gate.held()).toHaveLength(SIBLING_DECISION_CLASSES.length);
  });

  it("applies only the granted class, from only the granted sibling", async () => {
    await grants.grant(laptop, "sibling:moderation", 10);

    expect(
      (await gate.receive(proposal({ recordHash: "01".repeat(32) }))).outcome,
    ).toBe("apply");
    // Same sibling, different class.
    expect(
      (
        await gate.receive(
          proposal({
            recordHash: "02".repeat(32),
            decisionClass: "sibling:trust",
          }),
        )
      ).outcome,
    ).toBe("hold");
    // Same class, different sibling.
    expect(
      (
        await gate.receive(
          proposal({ recordHash: "03".repeat(32), installationId: tablet }),
        )
      ).outcome,
    ).toBe("hold");
  });

  it("hands back the payload rather than applying anything itself", async () => {
    await grants.grant(laptop, "sibling:moderation", 10);
    const verdict = await gate.receive(proposal());
    expect(verdict.outcome).toBe("apply");
    if (verdict.outcome !== "apply") throw new Error("unreachable");
    expect(new TextDecoder().decode(verdict.proposal.payload)).toBe(
      "block:someone",
    );
  });

  it("releases the backlog when the user grants after being shown it", async () => {
    await gate.receive(proposal({ recordHash: "01".repeat(32) }));
    await gate.receive(proposal({ recordHash: "02".repeat(32), emittedAt: 2 }));
    await gate.receive(
      proposal({ recordHash: "03".repeat(32), decisionClass: "sibling:trust" }),
    );
    expect(await gate.held()).toHaveLength(3);

    const released = await gate.grantAndRelease(
      laptop,
      "sibling:moderation",
      20,
    );
    expect(released.map((entry) => entry.recordHash)).toEqual([
      "01".repeat(32),
      "02".repeat(32),
    ]);
    // The ungranted class is still waiting; granting one class answers for one class.
    const stillHeld = await gate.held();
    expect(stillHeld).toHaveLength(1);
    expect(stillHeld[0]?.decisionClass).toBe("sibling:trust");
  });

  it("stops applying after revocation", async () => {
    await grants.grant(laptop, "sibling:moderation", 10);
    expect(
      (await gate.receive(proposal({ recordHash: "01".repeat(32) }))).outcome,
    ).toBe("apply");

    await gate.revoke(laptop, "sibling:moderation");
    expect(
      (await gate.receive(proposal({ recordHash: "02".repeat(32) }))).outcome,
    ).toBe("hold");
  });

  it("rejects an unknown class instead of holding it", async () => {
    // A class the gate does not know must not become a pending item a user
    // could be talked into approving.
    const verdict = await gate.receive(
      proposal({ decisionClass: "sibling:capabilities" }),
    );
    expect(verdict).toEqual({ outcome: "reject", reason: "unknown-class" });
    expect(await gate.held()).toHaveLength(0);
  });

  it("rejects installations that are not siblings, and its own echo", async () => {
    expect(
      (await gate.receive(proposal({ installationId: "99".repeat(16) })))
        .outcome,
    ).toBe("reject");
    expect(
      (await gate.receive(proposal({ installationId: phone }))).outcome,
    ).toBe("reject");
    expect(
      (await gate.receive(proposal({ installationId: "not-hex" }))).outcome,
    ).toBe("reject");
  });

  it("deduplicates by record hash", async () => {
    expect((await gate.receive(proposal())).outcome).toBe("hold");
    expect((await gate.receive(proposal())).outcome).toBe("reject");
    expect(await gate.held()).toHaveLength(1);
  });

  it("persists grants across gate instances", async () => {
    const kv = new MemoryKv();
    const persisted = createKeyValueSiblingGrantStore(kv);
    await persisted.grant(laptop, "sibling:apps", 5);

    const reopened = createKeyValueSiblingGrantStore(kv);
    expect(await reopened.isGranted(laptop, "sibling:apps")).toBe(true);
    expect(await reopened.isGranted(laptop, "sibling:trust")).toBe(false);
    expect(await reopened.isGranted(tablet, "sibling:apps")).toBe(false);
  });

  it("offers no class that could carry a capability grant", () => {
    // The whole vocabulary. If a capability class is ever added here, a grant
    // given to an app on one machine could become a grant on another — the
    // thing the installation boundary exists to prevent.
    expect([...SIBLING_DECISION_CLASSES]).toEqual([
      "sibling:moderation",
      "sibling:trust",
      "sibling:apps",
      "sibling:messages",
    ]);
    for (const decisionClass of SIBLING_DECISION_CLASSES) {
      expect(decisionClass).not.toMatch(/grant|capabilit|permission/i);
    }
  });
});
