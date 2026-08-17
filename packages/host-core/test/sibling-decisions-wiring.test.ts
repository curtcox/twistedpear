import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
} from "@twistedpear/reticulum-ts";
import { TrustStore } from "@twistedpear/app-registry";
import {
  SIBLING_ROSTER_REMOVAL_NOTICE,
  SiblingDecisionGate,
  createKeyValueLinkedInstallationRoster,
  createKeyValueSiblingGrantStore,
  createKeyValueSiblingProposalStore,
  createLinkedInstallation,
  createSiblingDecisionChrome,
  encodeSiblingDecisionAction,
  type LinkedInstallationKeyValueStore,
  type SiblingKeyValueStore,
  type SiblingProposal,
} from "../src/index.js";
import { FileModerationStore } from "../src/moderation-store.js";

const provider = new NodeCryptoProvider();
const SENDER = "ab".repeat(16);
const PUBLISHER = "cd".repeat(64);

class MemoryKv
  implements SiblingKeyValueStore, LinkedInstallationKeyValueStore
{
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

function proposal(
  installationId: string,
  over: Partial<SiblingProposal> = {},
): SiblingProposal {
  return {
    recordHash: "11".repeat(32),
    installationId,
    decisionClass: "sibling:moderation",
    emittedAt: 1,
    payload: encodeSiblingDecisionAction({
      type: "block",
      sourceHash: SENDER,
      label: "spam",
    }),
    ...over,
  };
}

describe("sibling decision chrome and store wiring", () => {
  it("keeps held proposals across a store reload", async () => {
    const store = new MemoryKv();
    const first = createKeyValueSiblingProposalStore(store);
    const held = proposal("aa".repeat(16));
    await first.put(held);
    const reloaded = createKeyValueSiblingProposalStore(store);
    expect(await reloaded.has(held.recordHash)).toBe(true);
    expect((await reloaded.list())[0]?.payload).toEqual(held.payload);
  });

  it("applies granted moderation and trust decisions to the local stores", async () => {
    const account = new Identity(provider);
    const laptop = createLinkedInstallation(provider, account, {
      label: "Laptop",
      createdAt: 1,
    });
    const phone = createLinkedInstallation(provider, account, {
      label: "Phone",
      createdAt: 2,
    });
    const kv = new MemoryKv();
    const roster = createKeyValueLinkedInstallationRoster({
      store: kv,
      provider,
      accountPublicKey: bytesToHex(account.getPublicKey()),
      selfInstallationId: phone.installationId,
    });
    await roster.merge(laptop.certificate, 10);
    await roster.merge(phone.certificate, 11);

    const moderation = new FileModerationStore(
      join(mkdtempSync(join(tmpdir(), "tp-sibling-")), "moderation.json"),
    );
    const trust = new TrustStore(kv);
    const gate = new SiblingDecisionGate({
      grants: createKeyValueSiblingGrantStore(kv),
      proposals: createKeyValueSiblingProposalStore(kv),
      isKnownInstallation: (id) => roster.has(id),
      selfInstallationId: phone.installationId,
    });
    const chrome = createSiblingDecisionChrome({
      gate,
      roster,
      moderation,
      trust,
    });

    expect(chrome.rosterRemovalNotice).toBe(SIBLING_ROSTER_REMOVAL_NOTICE);
    expect(chrome.rosterRemovalNotice).toMatch(/does not revoke it globally/);

    const blocked = await chrome.ingest(
      proposal(laptop.installationId, { recordHash: "21".repeat(32) }),
    );
    expect(blocked.outcome).toBe("hold");
    expect(moderation.disposition(SENDER)).toBe("allow");

    const held = await chrome.held();
    expect(held).toHaveLength(1);
    expect(held[0]?.prompt).toBe("Laptop blocked this sender — apply here?");

    await chrome.grantAndApply(laptop.installationId, "sibling:moderation", 20);
    expect(moderation.disposition(SENDER)).toBe("block");
    expect(await chrome.held()).toHaveLength(0);

    const trusted = await chrome.ingest(
      proposal(laptop.installationId, {
        recordHash: "22".repeat(32),
        decisionClass: "sibling:trust",
        payload: encodeSiblingDecisionAction({
          type: "trust",
          publisherPublicKey: PUBLISHER,
          label: "Friend",
          source: "manual",
        }),
      }),
    );
    expect(trusted.outcome).toBe("hold");
    await chrome.grantAndApply(laptop.installationId, "sibling:trust", 21);
    expect(await trust.isTrusted(PUBLISHER)).toBe(true);

    await chrome.ingest(
      proposal(laptop.installationId, {
        recordHash: "23".repeat(32),
        payload: encodeSiblingDecisionAction({
          type: "mute",
          sourceHash: "ef".repeat(16),
          label: null,
        }),
      }),
    );
    expect(moderation.disposition("ef".repeat(16))).toBe("mute");
  });

  it("does not apply held proposals after revoke, and does not invent a grant class", async () => {
    const account = new Identity(provider);
    const laptop = createLinkedInstallation(provider, account, {
      label: "Laptop",
      createdAt: 1,
    });
    const kv = new MemoryKv();
    const roster = createKeyValueLinkedInstallationRoster({
      store: kv,
      provider,
      accountPublicKey: bytesToHex(account.getPublicKey()),
      selfInstallationId: "ff".repeat(16),
    });
    await roster.merge(laptop.certificate, 1);
    const moderation = new FileModerationStore(
      join(mkdtempSync(join(tmpdir(), "tp-sibling-rev-")), "moderation.json"),
    );
    const chrome = createSiblingDecisionChrome({
      gate: new SiblingDecisionGate({
        grants: createKeyValueSiblingGrantStore(kv),
        proposals: createKeyValueSiblingProposalStore(kv),
        isKnownInstallation: (id) => roster.has(id),
        selfInstallationId: "ff".repeat(16),
      }),
      roster,
      moderation,
      trust: new TrustStore(kv),
    });

    await chrome.ingest(proposal(laptop.installationId));
    await chrome.revoke(laptop.installationId, "sibling:moderation");
    expect(moderation.disposition(SENDER)).toBe("allow");
    expect(
      (await chrome.held()).some(
        (item) => item.decisionClass === "sibling:moderation",
      ),
    ).toBe(true);
  });
});
