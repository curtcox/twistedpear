import { afterEach, describe, expect, it } from "vitest";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  Reticulum,
  bytesToHex,
  nodeRuntime,
} from "@twistedpear/reticulum-ts";
import { encode256t, signCasLocator } from "@twistedpear/cas-256t";
import {
  createAppScopedIdentityBackend,
  createKeyValueLinkedInstallationRoster,
  createKeyValueLinkedModeSwitch,
  decryptIdentityBackup,
  encryptIdentityBackup,
  identityBackupHash,
  identityFromRecoveryWords,
  identityToRecoveryWords,
  pairNewLinkedInstallation,
  previewLinkedModeSwitch,
  type LinkedInstallationKeyValueStore,
  type LinkedModeSwitch,
} from "../src/index.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();
const PASSPHRASE = "correct horse battery staple";
const nodes: Reticulum[] = [];

afterEach(() => {
  while (nodes.length > 0) nodes.pop()?.stop();
});

class MemoryKv implements LinkedInstallationKeyValueStore {
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

function switchFor(
  account: Identity,
  store = new MemoryKv(),
): { store: MemoryKv; linked: LinkedModeSwitch } {
  return {
    store,
    linked: createKeyValueLinkedModeSwitch({
      store,
      provider,
      accountIdentity: account,
    }),
  };
}

function registerServing(identity: Identity): {
  node: Reticulum;
  hash: string;
} {
  const node = Reticulum.create({ provider, runtime });
  node.start();
  nodes.push(node);
  const destination = node.registerDestination({
    provider,
    identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "twistedpear",
    aspects: ["host"],
  });
  return { node, hash: bytesToHex(destination.hash) };
}

describe("linked-mode switch", () => {
  it("previews both hashes and enables only after both are confirmed", async () => {
    const account = new Identity(provider);
    const { store, linked } = switchFor(account);
    expect((await linked.status()).enabled).toBe(false);
    expect(Object.hasOwn(linked, "disable")).toBe(false);

    const preview = previewLinkedModeSwitch(provider, account, {
      label: "Laptop",
      createdAt: 10,
    });
    expect(preview.accountHash).toBe(bytesToHex(account.hash));
    expect(preview.installationHash).not.toBe(preview.accountHash);
    expect(preview.publisherPublicKey).toBe(bytesToHex(account.getPublicKey()));
    expect(preview.servingPublicKey).not.toBe(preview.publisherPublicKey);

    await expect(
      linked.enable({
        preview,
        confirmedAccountHash: preview.accountHash,
        confirmedInstallationHash: "00".repeat(16),
        now: 20,
      }),
    ).rejects.toThrow(/both be confirmed/);
    expect((await linked.status()).enabled).toBe(false);
    expect(store.values.size).toBe(0);

    const enabled = await linked.enable({
      preview,
      confirmedAccountHash: preview.accountHash,
      confirmedInstallationHash: preview.installationHash,
      now: 20,
    });
    expect(enabled.preview.installationHash).toBe(preview.installationHash);
    await expect(
      linked.enable({
        preview,
        confirmedAccountHash: preview.accountHash,
        confirmedInstallationHash: preview.installationHash,
        now: 21,
      }),
    ).rejects.toThrow(/already enabled/);
  });

  it("moves serving destinations to the installation identity and keeps the publisher hash", async () => {
    const account = new Identity(provider);
    const { store, linked } = switchFor(account);
    const before = await linked.identities();
    expect(before.serving.hash).toEqual(account.hash);
    expect(before.publisher.hash).toEqual(account.hash);
    const unlinkedHost = registerServing(before.serving);

    const preview = await linked.preview({ label: "Phone", createdAt: 1 });
    const { roster } = {
      roster: createKeyValueLinkedInstallationRoster({
        store,
        provider,
        accountPublicKey: bytesToHex(account.getPublicKey()),
        selfInstallationId: preview.installationId,
      }),
    };
    await linked.enable({
      preview,
      confirmedAccountHash: preview.accountHash,
      confirmedInstallationHash: preview.installationHash,
      now: 2,
      roster,
    });

    const reloaded = createKeyValueLinkedModeSwitch({
      store,
      provider,
      accountIdentity: account,
    });
    const after = await reloaded.identities();
    expect(bytesToHex(after.publisher.hash)).toBe(preview.accountHash);
    expect(bytesToHex(after.serving.hash)).toBe(preview.installationHash);
    expect(bytesToHex(after.account.hash)).toBe(preview.accountHash);
    const linkedHost = registerServing(after.serving);
    expect(linkedHost.hash).not.toBe(unlinkedHost.hash);

    const publisher = bytesToHex(account.getPublicKey());
    const apps = createAppScopedIdentityBackend({
      provider,
      getInstallationIdentity: async () =>
        (await reloaded.identities()).serving,
    });
    const unlinkedApp = createAppScopedIdentityBackend({
      provider,
      getInstallationIdentity: async () => account,
    });
    expect(await apps.deriveDestinationHash("chat", publisher)).not.toBe(
      await unlinkedApp.deriveDestinationHash("chat", publisher),
    );

    const archive = new Uint8Array(128).fill(7);
    const locator = signCasLocator(after.publisher, {
      t256: encode256t(archive, (data) => provider.sha512(data)),
      appId: "chat",
      version: "1.0.0",
      driveKey: "ab".repeat(32),
      packageHash: "cd".repeat(32),
      packageSize: archive.length,
      servingPublicKey: preview.servingPublicKey,
    });
    expect(locator.formatVersion).toBe(2);
    expect(locator.publisherPublicKey).toBe(preview.publisherPublicKey);
    expect(locator.servingPublicKey).toBe(preview.servingPublicKey);
    expect(await roster.has(preview.installationId)).toBe(true);
  });

  it("does not enable linked mode when restoring a backup or recovery words", async () => {
    const account = new Identity(provider);
    const backup = encryptIdentityBackup(provider, account, PASSPHRASE);
    const words = identityToRecoveryWords(account);

    const fromBackup = decryptIdentityBackup(provider, backup, PASSPHRASE);
    expect((await switchFor(fromBackup).linked.status()).enabled).toBe(false);
    expect(bytesToHex(fromBackup.hash)).toBe(bytesToHex(account.hash));

    const fromWords = identityFromRecoveryWords(provider, words);
    expect((await switchFor(fromWords).linked.status()).enabled).toBe(false);
    expect(bytesToHex(fromWords.hash)).toBe(bytesToHex(account.hash));
  });

  it("treats pairing as joining, not as silently enabling linked mode", async () => {
    const account = new Identity(provider);
    const backup = encryptIdentityBackup(provider, account, PASSPHRASE);
    const paired = pairNewLinkedInstallation({
      provider,
      backup,
      passphrase: PASSPHRASE,
      confirmedAccountHash: identityBackupHash(backup),
      label: "Tablet",
      createdAt: 5,
    });
    const { linked } = switchFor(paired.accountIdentity);
    expect((await linked.status()).enabled).toBe(false);

    const preview = await linked.preview({
      label: "Tablet",
      createdAt: 5,
      installationId: paired.installationId,
    });
    expect(preview.installationHash).toBe(
      bytesToHex(paired.installationIdentity.hash),
    );
    await linked.enable({
      preview,
      confirmedAccountHash: preview.accountHash,
      confirmedInstallationHash: preview.installationHash,
      now: 6,
    });
    const identities = await linked.identities();
    expect(identities.serving.hash).toEqual(paired.installationIdentity.hash);
    expect(identities.publisher.hash).toEqual(account.hash);
  });
});
