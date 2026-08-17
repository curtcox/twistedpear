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
  ACCOUNT_JOURNAL_HARD_MAX_BYTES,
  ACCOUNT_JOURNAL_MAX_RECORD_BYTES,
  encryptAccountJournalRecord,
  signAccountJournalRecord,
} from "../src/account-journal.js";
import {
  SiblingDecisionGate,
  accountJournalRecordAsProposal,
  createAccountJournalExchange,
  createInMemorySiblingProposalStore,
  createKeyValueAccountJournal,
  createKeyValueLinkedInstallationRoster,
  createKeyValueSiblingGrantStore,
  createLinkedInstallation,
  createLinkedInstallationAnnounce,
  type AccountJournal,
  type AccountJournalKeyValueStore,
  type LinkedInstallationKeyValueStore,
  type LinkedInstallationRoster,
} from "../src/index.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

class MemoryKv
  implements AccountJournalKeyValueStore, LinkedInstallationKeyValueStore
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

function pair(account: Identity) {
  const laptop = createLinkedInstallation(provider, account, {
    label: "Laptop",
    createdAt: 1,
  });
  const phone = createLinkedInstallation(provider, account, {
    label: "Phone",
    createdAt: 2,
  });
  return { laptop, phone };
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

function journalFor(
  account: Identity,
  installation: ReturnType<typeof createLinkedInstallation>,
  roster: LinkedInstallationRoster,
  store = new MemoryKv(),
): AccountJournal {
  return createKeyValueAccountJournal({
    store,
    provider,
    accountIdentity: account,
    installationIdentity: installation.installationIdentity,
    roster,
    selfInstallationId: installation.installationId,
  });
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

describe("account journal", () => {
  it("signs, encrypts, and deduplicates records without applying them", async () => {
    const account = new Identity(provider);
    const { laptop, phone } = pair(account);
    const { roster } = rosterFor(account, laptop.installationId);
    await roster.merge(laptop.certificate, 10);
    await roster.merge(phone.certificate, 11);
    const journal = journalFor(account, laptop, roster);
    const payload = new TextEncoder().encode("block:someone");
    const record = await journal.append("sibling:moderation", payload, 20);
    expect(record.installationId).toBe(laptop.installationId);
    expect(await journal.list()).toHaveLength(1);
    await expect(
      journal.append("sibling:moderation", payload, 20),
    ).rejects.toThrow(/already exists/);

    const grants = createKeyValueSiblingGrantStore(new MemoryKv());
    const gate = new SiblingDecisionGate({
      grants,
      proposals: createInMemorySiblingProposalStore(),
      isKnownInstallation: (id) => roster.has(id),
      selfInstallationId: phone.installationId,
    });
    const verdict = await gate.receive(accountJournalRecordAsProposal(record));
    expect(verdict.outcome).toBe("hold");
    expect(new TextDecoder().decode(record.payload)).toBe("block:someone");
  });

  it("rejects an unknown class, a foreign account, and an oversized payload", () => {
    const account = new Identity(provider);
    const { laptop } = pair(account);
    expect(() =>
      signAccountJournalRecord(provider, laptop.installationIdentity, {
        installationId: laptop.installationId,
        decisionClass: "sibling:grants" as never,
        emittedAt: 1,
        payload: new Uint8Array([1]),
      }),
    ).toThrow(/Unknown sibling decision class/);
    expect(ACCOUNT_JOURNAL_MAX_RECORD_BYTES).toBeLessThanOrEqual(
      ACCOUNT_JOURNAL_HARD_MAX_BYTES,
    );
    expect(() =>
      signAccountJournalRecord(provider, laptop.installationIdentity, {
        installationId: laptop.installationId,
        decisionClass: "sibling:moderation",
        emittedAt: 1,
        payload: new Uint8Array(ACCOUNT_JOURNAL_MAX_RECORD_BYTES),
      }),
    ).toThrow(/multipart budget/);
  });

  it("ingest verifies the roster certificate and ignores a duplicate hash", async () => {
    const account = new Identity(provider);
    const other = new Identity(provider);
    const { laptop, phone } = pair(account);
    const stranger = createLinkedInstallation(provider, other, {
      label: "Stranger",
      createdAt: 3,
    });
    const { roster: laptopRoster } = rosterFor(account, laptop.installationId);
    const { roster: phoneRoster } = rosterFor(account, phone.installationId);
    await laptopRoster.merge(laptop.certificate, 10);
    await laptopRoster.merge(phone.certificate, 11);
    await phoneRoster.merge(phone.certificate, 10);
    await phoneRoster.merge(laptop.certificate, 11);

    const laptopJournal = journalFor(account, laptop, laptopRoster);
    const phoneJournal = journalFor(account, phone, phoneRoster);
    const record = await laptopJournal.append(
      "sibling:trust",
      new Uint8Array([7]),
      30,
    );
    const envelope = await laptopJournal.envelope(record.recordHash);
    expect(envelope).not.toBeNull();
    expect(await phoneJournal.ingest(envelope!)).toMatchObject({
      recordHash: record.recordHash,
    });
    expect(await phoneJournal.ingest(envelope!)).toBeNull();

    const foreign = signAccountJournalRecord(
      provider,
      stranger.installationIdentity,
      {
        installationId: stranger.installationId,
        decisionClass: "sibling:moderation",
        emittedAt: 31,
        payload: new Uint8Array([9]),
      },
    );
    const foreignEnvelope = encryptAccountJournalRecord(
      provider,
      other,
      foreign,
    );
    expect(await phoneJournal.ingest(foreignEnvelope)).toBeNull();
  });
});

describe("account journal exchange", () => {
  const sessions: Array<{ stop: () => void | Promise<void> }> = [];
  const exchanges: Array<{ stop: () => void }> = [];
  const cleanups: Array<() => void> = [];

  afterEach(async () => {
    for (const exchange of exchanges.splice(0)) exchange.stop();
    while (sessions.length > 0) await sessions.pop()!.stop();
    for (const cleanup of cleanups.reverse()) cleanup();
    cleanups.length = 0;
  });

  it("exchanges an encrypted record over certified installation destinations", async () => {
    const account = new Identity(provider);
    const { laptop, phone } = pair(account);
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

    const laptopJournal = journalFor(account, laptop, laptopRoster);
    const phoneJournal = journalFor(account, phone, phoneRoster);
    const laptopExchange = createAccountJournalExchange({
      reticulum: left,
      provider,
      certificate: laptop.certificate,
      destination: laptopSession.destination,
      roster: laptopRoster,
      journal: laptopJournal,
      selfInstallationId: laptop.installationId,
    });
    const phoneExchange = createAccountJournalExchange({
      reticulum: right,
      provider,
      certificate: phone.certificate,
      destination: phoneSession.destination,
      roster: phoneRoster,
      journal: phoneJournal,
      selfInstallationId: phone.installationId,
    });
    exchanges.push(laptopExchange, phoneExchange);

    const record = await laptopJournal.append(
      "sibling:messages",
      new TextEncoder().encode("ciphertext-ref"),
      40,
    );
    await laptopExchange.publish(record);
    await waitFor(async () => (await phoneJournal.list()).length === 1);
    const received = (await phoneJournal.list())[0]!;
    expect(received.recordHash).toBe(record.recordHash);
    expect(new TextDecoder().decode(received.payload)).toBe("ciphertext-ref");
  });
});
