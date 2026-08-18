import { describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
} from "@twistedpear/reticulum-ts";
import {
  PACKAGE_FORMAT_VERSION,
  CapabilityDeclarationError,
  buildUnsignedManifest,
  capabilityDeclarationIds,
  capabilityScopeLabel,
  packPackage,
  parseCapabilityDeclarations,
  refuseUnscopedFormatV1Grant,
  signManifest,
  unpackPackage,
  validateManifestStructure,
  verifyPackage,
} from "../src/index.js";

const provider = new NodeCryptoProvider();

function sampleFiles() {
  return [
    {
      path: "bundle.js",
      content: new TextEncoder().encode("export default 1;"),
    },
  ];
}

function pack(
  capabilities: Parameters<typeof buildUnsignedManifest>[0]["capabilities"],
  formatVersion?: number,
) {
  const identity = new Identity(provider);
  const unsigned = buildUnsignedManifest(
    {
      name: "com.example.scoped",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities,
      formatVersion,
      minHostApi: "0.13.0",
      driveKey: "a".repeat(64),
      publisherPublicKey: bytesToHex(identity.getPublicKey()),
      files: sampleFiles(),
    },
    provider,
  );
  const manifest = signManifest(provider, identity, unsigned);
  return packPackage(provider, {
    ...manifest,
    signature: manifest.signature,
    files: sampleFiles(),
  });
}

describe("manifest format v2", () => {
  it("emits formatVersion 2 for new packs and still reads v1", () => {
    expect(PACKAGE_FORMAT_VERSION).toBe(2);
    const v2 = pack(["storage:kv"]);
    expect(v2.manifest.formatVersion).toBe(2);
    const v1 = pack(["storage:kv"], 1);
    expect(v1.manifest.formatVersion).toBe(1);
    expect(
      verifyPackage(provider, v1.archiveBytes).manifest.capabilities,
    ).toEqual(["storage:kv"]);
  });

  it("accepts mixed string and object capabilities and round-trips the signature", () => {
    const packed = pack([
      {
        id: "lxmf:send",
        scope: { kind: "offer", targetKind: "peer" },
      },
      { id: "announce:publish", scope: { kind: "own-namespace" } },
      "storage:kv",
    ]);
    expect(packed.manifest.formatVersion).toBe(2);
    const verified = verifyPackage(provider, packed.archiveBytes);
    expect(verified.manifest.capabilities).toEqual([
      {
        id: "lxmf:send",
        scope: { kind: "offer", targetKind: "peer" },
      },
      { id: "announce:publish", scope: { kind: "own-namespace" } },
      "storage:kv",
    ]);
    const unpacked = unpackPackage(provider, packed.archiveBytes);
    expect(unpacked.manifest.signature).toBe(packed.manifest.signature);
  });

  it("treats a bare string as unscoped and essential", () => {
    expect(parseCapabilityDeclarations(["lxmf:send"], 2)).toEqual([
      { id: "lxmf:send", scope: null, optional: false },
    ]);
    expect(capabilityScopeLabel(null)).toBe("any destination the app names");
  });

  it("returns declarations rather than ids", () => {
    const declarations = parseCapabilityDeclarations(
      [
        {
          id: "lxmf:send",
          scope: { kind: "offer", targetKind: "peer" },
          optional: true,
        },
        "storage:kv",
      ],
      2,
    );
    expect(declarations).toEqual([
      {
        id: "lxmf:send",
        scope: { kind: "offer", targetKind: "peer" },
        optional: true,
      },
      { id: "storage:kv", scope: null, optional: false },
    ]);
    expect(capabilityDeclarationIds(declarations)).toEqual([
      "lxmf:send",
      "storage:kv",
    ]);
    expect(capabilityScopeLabel(declarations[0]!.scope)).toBe(
      "contacts you choose (peer)",
    );
  });

  it("rejects unknown scope, invalid targetKind, duplicate ids, and objects on v1", () => {
    expect(() =>
      parseCapabilityDeclarations(
        [{ id: "lxmf:send", scope: { kind: "mystery" } }],
        2,
      ),
    ).toThrow(CapabilityDeclarationError);
    expect(() =>
      parseCapabilityDeclarations(
        [{ id: "lxmf:send", scope: { kind: "offer", targetKind: "planet" } }],
        2,
      ),
    ).toThrow(/targetKind/);
    expect(() =>
      parseCapabilityDeclarations(["storage:kv", { id: "storage:kv" }], 2),
    ).toThrow(/Duplicate/);
    expect(() =>
      parseCapabilityDeclarations([{ id: "storage:kv" }], 1),
    ).toThrow(/formatVersion 2/);
    expect(() =>
      validateManifestStructure({
        formatVersion: 1,
        name: "app",
        version: "1.0.0",
        entry: "bundle.js",
        capabilities: [{ id: "storage:kv" }],
        icon: null,
        minHostApi: "0.1.0",
        files: [{ path: "bundle.js", sha256: "a".repeat(64), size: 1 }],
        driveKey: "a".repeat(64),
        publisherPublicKey: "b".repeat(128),
      }),
    ).toThrow(/formatVersion 2/);
  });

  it("keeps the refuse-unscoped-v1 host policy off by default", () => {
    expect(
      refuseUnscopedFormatV1Grant({
        formatVersion: 1,
        capabilityId: "lxmf:send",
      }),
    ).toBe(false);
    expect(
      refuseUnscopedFormatV1Grant({
        formatVersion: 1,
        capabilityId: "lxmf:send",
        refuseUnscopedFormatV1: false,
      }),
    ).toBe(false);
    expect(
      refuseUnscopedFormatV1Grant({
        formatVersion: 1,
        capabilityId: "storage:kv",
        refuseUnscopedFormatV1: true,
      }),
    ).toBe(false);
    expect(
      refuseUnscopedFormatV1Grant({
        formatVersion: 1,
        capabilityId: "lxmf:send",
        refuseUnscopedFormatV1: true,
      }),
    ).toBe(true);
    expect(
      refuseUnscopedFormatV1Grant({
        formatVersion: 2,
        capabilityId: "lxmf:send",
        refuseUnscopedFormatV1: true,
      }),
    ).toBe(false);
  });

  it("changes the signature when scope changes", () => {
    const identity = new Identity(provider);
    const files = sampleFiles();
    const base = {
      name: "com.example.sig",
      version: "1.0.0",
      entry: "bundle.js",
      minHostApi: "0.13.0",
      driveKey: "a".repeat(64),
      publisherPublicKey: bytesToHex(identity.getPublicKey()),
      files,
    };
    const unscoped = signManifest(
      provider,
      identity,
      buildUnsignedManifest({ ...base, capabilities: ["lxmf:send"] }, provider),
    );
    const scoped = signManifest(
      provider,
      identity,
      buildUnsignedManifest(
        {
          ...base,
          capabilities: [
            { id: "lxmf:send", scope: { kind: "offer", targetKind: "peer" } },
          ],
        },
        provider,
      ),
    );
    expect(unscoped.signature).not.toBe(scoped.signature);
  });
});
