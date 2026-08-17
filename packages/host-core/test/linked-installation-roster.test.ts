import { afterEach, describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  bytesToHex,
  nodeRuntime,
} from "@twistedpear/reticulum-ts";
import {
  IDENTITY_BACKUP_ERROR,
  LINKED_ACCOUNT_BACKUP_WARNING,
  LINKED_INSTALLATION_APP_NAME,
  SiblingDecisionGate,
  createInMemorySiblingProposalStore,
  createKeyValueLinkedInstallationRoster,
  createKeyValueSiblingGrantStore,
  createLinkedInstallation,
  createLinkedInstallationAnnounce,
  exportLinkedAccountBackup,
  signLinkedInstallationCertificate,
  identityBackupHash,
  linkedInstallationAnnounceFilter,
  pairNewLinkedInstallation,
  type LinkedInstallationKeyValueStore,
  type LinkedInstallationRoster,
} from "../src/index.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();
const PASSPHRASE = "correct horse battery staple";

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

function rosterFor(
  account: Identity,
  installationId: string,
  store = new MemoryKv(),
): { store: MemoryKv; roster: LinkedInstallationRoster } {
  return {
    store,
    roster: createKeyValueLinkedInstallationRoster({
      store,
      provider,
      accountPublicKey: bytesToHex(account.getPublicKey()),
      selfInstallationId: installationId,
    }),
  };
}

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 20_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await predicate()) return;
    if (Date.now() > deadline)
      throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("linked installation roster", () => {
  it("persists a verified certificate and rejects a foreign or damaged one", async () => {
    const account = new Identity(provider);
    const other = new Identity(provider);
    const self = createLinkedInstallation(provider, account, {
      label: "Laptop",
      createdAt: 10,
    });
    const sibling = createLinkedInstallation(provider, account, {
      label: "Phone",
      createdAt: 11,
    });
    const foreign = createLinkedInstallation(provider, other, {
      label: "Stranger",
      createdAt: 12,
    });
    const { roster } = rosterFor(account, self.installationId);
    expect(await roster.merge(self.certificate, 100)).toBe(true);
    expect(await roster.merge(sibling.certificate, 101)).toBe(true);
    expect(await roster.merge(foreign.certificate, 102)).toBe(false);
    expect(
      await roster.merge({ ...sibling.certificate, label: "Relabelled" }, 103),
    ).toBe(false);
    expect(await roster.has(sibling.installationId)).toBe(true);
    expect(await roster.has(foreign.installationId)).toBe(false);
    expect(await roster.list()).toHaveLength(2);
  });

  it("refuses to replace an installation id with a different public key", async () => {
    const account = new Identity(provider);
    const first = createLinkedInstallation(provider, account, {
      label: "Phone",
      createdAt: 1,
      installationId: "ab".repeat(16),
    });
    const second = createLinkedInstallation(provider, account, {
      label: "Phone",
      createdAt: 2,
      installationId: "cd".repeat(16),
    });
    const { roster } = rosterFor(account, first.installationId);
    expect(await roster.merge(first.certificate, 10)).toBe(true);
    const lying = signLinkedInstallationCertificate(
      account,
      second.installationIdentity,
      {
        installationId: first.installationId,
        label: "Phone",
        createdAt: 3,
      },
    );
    expect(await roster.merge(lying, 11)).toBe(false);
    expect(
      (await roster.get(first.installationId))?.certificate
        .installationPublicKey,
    ).toBe(first.certificate.installationPublicKey);
  });

  it("feeds SiblingDecisionGate.isKnownInstallation and cannot drop itself", async () => {
    const account = new Identity(provider);
    const self = createLinkedInstallation(provider, account, {
      label: "Laptop",
      createdAt: 1,
    });
    const sibling = createLinkedInstallation(provider, account, {
      label: "Phone",
      createdAt: 2,
    });
    const { roster } = rosterFor(account, self.installationId);
    await roster.merge(self.certificate, 10);
    await roster.merge(sibling.certificate, 11);
    const gate = new SiblingDecisionGate({
      grants: createKeyValueSiblingGrantStore(new MemoryKv()),
      proposals: createInMemorySiblingProposalStore(),
      isKnownInstallation: (id) => roster.has(id),
      selfInstallationId: self.installationId,
    });
    expect(
      (
        await gate.receive({
          recordHash: "aa".repeat(32),
          installationId: sibling.installationId,
          decisionClass: "sibling:moderation",
          emittedAt: 1,
          payload: new Uint8Array([1]),
        })
      ).outcome,
    ).toBe("hold");
    expect(await roster.remove(sibling.installationId)).toBe(true);
    expect(await roster.has(sibling.installationId)).toBe(false);
    await expect(roster.remove(self.installationId)).rejects.toThrow(
      /own roster/,
    );
  });
});

describe("linked installation pairing", () => {
  it("shows the account hash without the passphrase and warns that the backup is the account", () => {
    const account = new Identity(provider);
    const exported = exportLinkedAccountBackup(provider, account, PASSPHRASE);
    expect(exported.accountHash).toBe(bytesToHex(account.hash));
    expect(exported.accountHash).toBe(identityBackupHash(exported.backup));
    expect(exported.warning).toBe(LINKED_ACCOUNT_BACKUP_WARNING);
    expect(() =>
      pairNewLinkedInstallation({
        provider,
        backup: exported.backup,
        passphrase: PASSPHRASE,
        confirmedAccountHash: "00".repeat(16),
        label: "Tablet",
        createdAt: 1,
      }),
    ).toThrow(/confirmation does not match/);
  });

  it("creates a distinct installation after the confirmed hash matches", () => {
    const account = new Identity(provider);
    const exported = exportLinkedAccountBackup(provider, account, PASSPHRASE);
    const paired = pairNewLinkedInstallation({
      provider,
      backup: exported.backup,
      passphrase: PASSPHRASE,
      confirmedAccountHash: exported.accountHash,
      label: "Tablet",
      createdAt: 20,
    });
    expect(bytesToHex(paired.accountIdentity.getPrivateKey())).toEqual(
      bytesToHex(account.getPrivateKey()),
    );
    expect(paired.installationId).not.toBe(bytesToHex(account.hash));
    expect(paired.certificate.accountPublicKey).toBe(
      bytesToHex(account.getPublicKey()),
    );
    expect(() =>
      pairNewLinkedInstallation({
        provider,
        backup: exported.backup,
        passphrase: "wrong passphrase",
        confirmedAccountHash: exported.accountHash,
        label: "Tablet",
        createdAt: 21,
      }),
    ).toThrow(IDENTITY_BACKUP_ERROR);
  });
});

describe("linked installation announce", () => {
  const sessions: Array<{
    stop: () => Promise<void>;
    announce: () => Promise<void>;
  }> = [];
  const cleanups: Array<() => void> = [];

  afterEach(async () => {
    while (sessions.length > 0) await sessions.pop()!.stop();
    for (const cleanup of cleanups.reverse()) cleanup();
    cleanups.length = 0;
  });

  it("announces under the account aspect and merges a sibling certificate", async () => {
    const account = new Identity(provider);
    const laptop = createLinkedInstallation(provider, account, {
      label: "Laptop",
      createdAt: 1,
    });
    const phone = createLinkedInstallation(provider, account, {
      label: "Phone",
      createdAt: 2,
    });
    const { roster: laptopRoster } = rosterFor(account, laptop.installationId);
    const { roster: phoneRoster } = rosterFor(account, phone.installationId);
    await laptopRoster.merge(laptop.certificate, 10);
    await phoneRoster.merge(phone.certificate, 10);

    const left = Reticulum.create({ provider, runtime });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    right.start();
    const [leftPipe, rightPipe] = PipeInterface.pair(
      provider,
      { name: "left" },
      { name: "right" },
    );
    left.registerInterface(leftPipe);
    right.registerInterface(rightPipe);
    cleanups.push(() => {
      left.stop();
      right.stop();
    });

    const filter = linkedInstallationAnnounceFilter(
      provider,
      bytesToHex(account.getPublicKey()),
    );
    expect(
      filter.startsWith(`${LINKED_INSTALLATION_APP_NAME}.linked-device.`),
    ).toBe(true);

    const laptopSession = await createLinkedInstallationAnnounce({
      reticulum: left,
      provider,
      installationIdentity: laptop.installationIdentity,
      certificate: laptop.certificate,
      roster: laptopRoster,
      autoAnnounce: false,
    });
    const phoneSession = await createLinkedInstallationAnnounce({
      reticulum: right,
      provider,
      installationIdentity: phone.installationIdentity,
      certificate: phone.certificate,
      roster: phoneRoster,
      autoAnnounce: false,
    });
    sessions.push(laptopSession, phoneSession);
    await laptopSession.announce();
    await phoneSession.announce();

    await waitFor(() => laptopRoster.has(phone.installationId));
    await waitFor(() => phoneRoster.has(laptop.installationId));
    expect(await laptopRoster.list()).toHaveLength(2);
  });

  it("ignores a certificate announced by a different account", async () => {
    const account = new Identity(provider);
    const other = new Identity(provider);
    const self = createLinkedInstallation(provider, account, {
      label: "Laptop",
      createdAt: 1,
    });
    const stranger = createLinkedInstallation(provider, other, {
      label: "Stranger",
      createdAt: 2,
    });
    const { roster } = rosterFor(account, self.installationId);
    await roster.merge(self.certificate, 10);

    const left = Reticulum.create({ provider, runtime });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    right.start();
    const [leftPipe, rightPipe] = PipeInterface.pair(
      provider,
      { name: "left" },
      { name: "right" },
    );
    left.registerInterface(leftPipe);
    right.registerInterface(rightPipe);
    cleanups.push(() => {
      left.stop();
      right.stop();
    });

    sessions.push(
      await createLinkedInstallationAnnounce({
        reticulum: left,
        provider,
        installationIdentity: self.installationIdentity,
        certificate: self.certificate,
        roster,
        autoAnnounce: false,
      }),
      await createLinkedInstallationAnnounce({
        reticulum: right,
        provider,
        installationIdentity: stranger.installationIdentity,
        certificate: stranger.certificate,
        roster: rosterFor(other, stranger.installationId).roster,
        autoAnnounce: false,
      }),
    );
    await sessions[0]!.announce();
    await sessions[1]!.announce();

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(await roster.has(stranger.installationId)).toBe(false);
    expect(await roster.list()).toHaveLength(1);
  });
});
