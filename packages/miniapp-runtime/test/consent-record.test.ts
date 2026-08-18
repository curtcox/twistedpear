import { describe, expect, it } from "vitest";
import {
  ConsentTranscript,
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  consentAuthorities,
  consentDiscloses,
  consentRecordFromConfirmation,
  describeCapability,
  installReviewConsentRecord,
  requestHostConfirmation,
} from "../src/index.js";

const unusedBackend = {
  name: "unused",
  async spawn() {
    throw new Error("not used");
  },
};

describe("ConsentTranscript", () => {
  it("appends records in order", () => {
    const transcript = new ConsentTranscript();
    const first = installReviewConsentRecord({
      at: 1,
      token: "a",
      appId: "notes",
      publisherPublicKey: "pub",
      capabilities: ["storage:kv"],
    });
    const second = consentRecordFromConfirmation(
      {
        token: "b",
        kind: "install",
        appId: "studio",
        publisherPublicKey: "pub",
        summary: { t256: "T".repeat(94) },
      },
      2,
    );
    transcript.append(first);
    transcript.append(second);
    expect(transcript.list()).toEqual([first, second]);
  });

  it("records an override action with the unmet set", () => {
    const record = installReviewConsentRecord({
      at: 3,
      token: "c",
      appId: "forwarder",
      publisherPublicKey: "pub",
      capabilities: ["relay:configure"],
      unmet: ["provenance", "review"],
      action: "override",
    });
    expect(record.action).toBe("override");
    expect(record.unmet).toEqual(["provenance", "review"]);
  });
});

describe("consentAuthorities", () => {
  it("uses the registry wording byte-identical to describeCapability", () => {
    const [send] = consentAuthorities(["lxmf:send"], {
      added: new Set(["lxmf:send"]),
    });
    expect(send?.canonicalDescription).toBe(describeCapability("lxmf:send"));
    expect(send?.isNewSinceLastApproval).toBe(true);
    expect(
      consentDiscloses(
        installReviewConsentRecord({
          at: 0,
          token: "t",
          appId: "notes",
          publisherPublicKey: "pub",
          capabilities: ["lxmf:send"],
        }),
        "lxmf:send",
      ),
    ).toBe(true);
  });
});

describe("MiniappHost consent transcript", () => {
  it("records an approved apps.install confirmation", async () => {
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      now: () => 1_000,
      confirmationChannel: {
        confirm: async () => ({ approved: true }),
      },
      appsBackend: {
        package: async () => ({
          packageHash: "ab".repeat(32),
          size: 1,
          t256: "A".repeat(94),
        }),
        publish: async () => ({
          t256: "A".repeat(94),
          driveKey: "cd".repeat(32),
          version: "1.0.0",
        }),
        install: async () => ({
          appId: "hello",
          version: "1.0.0",
          trusted: true,
        }),
        preview: async () => ({ launched: true }),
        stopPreview: async () => {},
      },
    });
    const capabilities = ["apps:install"];
    const manifest = {
      name: "studio",
      version: "1",
      entry: "bundle.js",
      publisherPublicKey: "publisher",
      capabilities,
    };
    await host.setGrants("studio", "publisher", capabilities, capabilities);
    const response = await host.dispatchRaw(
      {
        id: "1",
        namespace: "apps",
        method: "install",
        capability: "apps:install",
        payload: { t256: "A".repeat(94) },
      },
      manifest,
      capabilities,
    );
    expect(response.ok).toBe(true);
    const [record] = host.consentTranscript.list();
    expect(record?.kind).toBe("install");
    expect(consentDiscloses(record!, "apps:install")).toBe(true);
    expect(record?.subject.packageId).toBe("A".repeat(94));
  });
});

describe("requestHostConfirmation", () => {
  it("does not record on its own — chrome or the host wrap must append", async () => {
    const transcript = new ConsentTranscript();
    await requestHostConfirmation(
      { confirm: async () => ({ approved: true }) },
      {
        kind: "trust-import",
        appId: "host",
        publisherPublicKey: "ab".repeat(32),
        summary: { source: "paste" },
      },
      {
        randomBytes: (length) => new Uint8Array(length),
        delay: async () => {},
      },
    );
    expect(transcript.list()).toHaveLength(0);
  });
});
