/**
 * Encrypted, append-only account journal.
 *
 * Records are proposals, never effects: this module signs, encrypts, stores,
 * and deduplicates. The sibling-decision gate decides what a record may do.
 * See docs/linked-devices-plan.md, remaining work "Account journal".
 */
import { gcm } from "@noble/ciphers/aes.js";
import {
  Identity,
  bytesToHex,
  equalBytes,
  type CryptoProvider,
} from "@twistedpear/reticulum-ts";
import {
  DEFAULT_MULTIPART_BUDGET_BYTES,
  MAX_MULTIPART_BYTES,
} from "@twistedpear/lxmf-ts";
import {
  isSiblingDecisionClass,
  type SiblingDecisionClass,
  type SiblingProposal,
} from "./sibling-decisions.js";
import {
  LINKED_INSTALLATION_ID_BYTES,
  asciiHexLower,
  concatBytes,
  decodeUint64,
  encodeUint64,
  hexBytes,
  type LinkedInstallationCertificate,
} from "./linked-installation.js";
import type { LinkedInstallationRoster } from "./linked-installation-roster.js";

const ACCOUNT_JOURNAL_MAGIC = new Uint8Array([0x54, 0x50, 0x4a, 0x52, 0x01]); // TPJR\x01
const ACCOUNT_JOURNAL_ENVELOPE_MAGIC = new Uint8Array([
  0x54, 0x50, 0x4a, 0x45, 0x01,
]); // TPJE\x01
const ACCOUNT_JOURNAL_SALT = "TwistedPear account journal v1";
export const ACCOUNT_JOURNAL_MAX_RECORD_BYTES = DEFAULT_MULTIPART_BUDGET_BYTES;
export const ACCOUNT_JOURNAL_HARD_MAX_BYTES = MAX_MULTIPART_BYTES;

const INDEX_KEY = "account-journal:v1:index";
const RECORD_PREFIX = "account-journal:v1:record:";
const NONCE_BYTES = 12;
const KEY_BYTES = 32;
const SIGNATURE_BYTES = 64;

export interface AccountJournalRecord {
  readonly recordHash: string;
  readonly installationId: string;
  readonly decisionClass: SiblingDecisionClass;
  readonly emittedAt: number;
  readonly payload: Uint8Array;
  readonly signature: string;
}

export interface AccountJournalKeyValueStore {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AccountJournal {
  append(
    decisionClass: SiblingDecisionClass,
    payload: Uint8Array,
    now: number,
  ): Promise<AccountJournalRecord>;
  ingest(envelope: Uint8Array): Promise<AccountJournalRecord | null>;
  get(recordHash: string): Promise<AccountJournalRecord | undefined>;
  list(): Promise<ReadonlyArray<AccountJournalRecord>>;
  envelope(recordHash: string): Promise<Uint8Array | null>;
}

function encodeUint32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

function journalKey(provider: CryptoProvider, accountIdentity: Identity) {
  const privateKey = accountIdentity.getPrivateKey();
  try {
    return provider.hkdf({
      hash: "sha256",
      keyMaterial: privateKey,
      salt: new TextEncoder().encode(ACCOUNT_JOURNAL_SALT),
      info: new Uint8Array(),
      length: KEY_BYTES,
    });
  } finally {
    privateKey.fill(0);
  }
}

function signedPayload(record: {
  readonly installationId: string;
  readonly decisionClass: string;
  readonly emittedAt: number;
  readonly payload: Uint8Array;
}): Uint8Array {
  const classBytes = new TextEncoder().encode(record.decisionClass);
  if (classBytes.length === 0 || classBytes.length > 255)
    throw new Error("decision class length is invalid");
  return concatBytes(
    ACCOUNT_JOURNAL_MAGIC,
    hexBytes(record.installationId, LINKED_INSTALLATION_ID_BYTES, "id"),
    new Uint8Array([classBytes.length]),
    classBytes,
    encodeUint64(record.emittedAt),
    encodeUint32(record.payload.length),
    record.payload,
  );
}

function encodeAccountJournalRecord(record: AccountJournalRecord): Uint8Array {
  const bytes = concatBytes(
    signedPayload(record),
    hexBytes(record.signature, SIGNATURE_BYTES, "signature"),
  );
  if (bytes.length > ACCOUNT_JOURNAL_HARD_MAX_BYTES)
    throw new Error("Journal record exceeds the hard payload ceiling");
  if (bytes.length > ACCOUNT_JOURNAL_MAX_RECORD_BYTES)
    throw new Error("Journal record exceeds the multipart budget");
  return bytes;
}

function decodeAccountJournalRecord(
  provider: CryptoProvider,
  bytes: Uint8Array,
): AccountJournalRecord {
  const min =
    ACCOUNT_JOURNAL_MAGIC.length +
    LINKED_INSTALLATION_ID_BYTES +
    1 +
    8 +
    4 +
    SIGNATURE_BYTES;
  if (bytes.length < min) throw new Error("Journal record is too short");
  if (
    !equalBytes(
      bytes.subarray(0, ACCOUNT_JOURNAL_MAGIC.length),
      ACCOUNT_JOURNAL_MAGIC,
    )
  ) {
    throw new Error("Journal record magic mismatch");
  }
  let offset = ACCOUNT_JOURNAL_MAGIC.length;
  const installationId = bytesToHex(
    bytes.subarray(offset, offset + LINKED_INSTALLATION_ID_BYTES),
  );
  offset += LINKED_INSTALLATION_ID_BYTES;
  const classLength = bytes[offset++]!;
  const classBytes = bytes.subarray(offset, offset + classLength);
  offset += classLength;
  const decisionClass = new TextDecoder("utf-8", { fatal: true }).decode(
    classBytes,
  );
  if (!isSiblingDecisionClass(decisionClass))
    throw new Error("Unknown sibling decision class");
  const emittedAt = decodeUint64(bytes.subarray(offset, offset + 8));
  offset += 8;
  const payloadLengthBytes = bytes.subarray(offset, offset + 4);
  const payloadLength = new DataView(
    payloadLengthBytes.buffer,
    payloadLengthBytes.byteOffset,
    4,
  ).getUint32(0, false);
  offset += 4;
  if (offset + payloadLength + SIGNATURE_BYTES !== bytes.length)
    throw new Error("Journal record length is invalid");
  const payload = bytes.slice(offset, offset + payloadLength);
  offset += payloadLength;
  const signature = bytesToHex(bytes.subarray(offset));
  return {
    recordHash: bytesToHex(provider.sha256(bytes)),
    installationId,
    decisionClass,
    emittedAt,
    payload,
    signature,
  };
}

export function signAccountJournalRecord(
  provider: CryptoProvider,
  installationIdentity: Identity,
  fields: {
    readonly installationId: string;
    readonly decisionClass: SiblingDecisionClass;
    readonly emittedAt: number;
    readonly payload: Uint8Array;
  },
): AccountJournalRecord {
  if (!isSiblingDecisionClass(fields.decisionClass))
    throw new Error(`Unknown sibling decision class: ${fields.decisionClass}`);
  const installationId = asciiHexLower(fields.installationId);
  const payload = signedPayload({ ...fields, installationId });
  const signature = bytesToHex(installationIdentity.sign(payload));
  const encoded = concatBytes(
    payload,
    hexBytes(signature, SIGNATURE_BYTES, "signature"),
  );
  if (encoded.length > ACCOUNT_JOURNAL_MAX_RECORD_BYTES)
    throw new Error("Journal record exceeds the multipart budget");
  return {
    recordHash: bytesToHex(provider.sha256(encoded)),
    installationId,
    decisionClass: fields.decisionClass,
    emittedAt: fields.emittedAt,
    payload: fields.payload.slice(),
    signature,
  };
}

function verifyAccountJournalRecord(
  provider: CryptoProvider,
  certificate: LinkedInstallationCertificate,
  record: AccountJournalRecord,
): boolean {
  try {
    if (asciiHexLower(record.installationId) !== certificate.installationId)
      return false;
    const signer = Identity.fromPublicKey(
      provider,
      hexBytes(
        certificate.installationPublicKey,
        64,
        "installation public key",
      ),
    );
    if (signer === null) return false;
    return signer.validate(
      hexBytes(record.signature, SIGNATURE_BYTES, "signature"),
      signedPayload(record),
    );
  } catch {
    return false;
  }
}

export function encryptAccountJournalRecord(
  provider: CryptoProvider,
  accountIdentity: Identity,
  record: AccountJournalRecord,
  nonce?: Uint8Array,
): Uint8Array {
  const encoded = encodeAccountJournalRecord(record);
  const resolvedNonce = nonce ?? provider.randomBytes(NONCE_BYTES);
  if (resolvedNonce.length !== NONCE_BYTES)
    throw new Error("Journal envelope nonce must be 12 bytes");
  const key = journalKey(provider, accountIdentity);
  try {
    const header = concatBytes(ACCOUNT_JOURNAL_ENVELOPE_MAGIC, resolvedNonce);
    const ciphertext = gcm(key, resolvedNonce, header).encrypt(encoded);
    return concatBytes(header, ciphertext);
  } finally {
    key.fill(0);
  }
}

function decryptAccountJournalRecord(
  provider: CryptoProvider,
  accountIdentity: Identity,
  envelope: Uint8Array,
): AccountJournalRecord {
  const headerBytes = ACCOUNT_JOURNAL_ENVELOPE_MAGIC.length + NONCE_BYTES;
  if (envelope.length <= headerBytes)
    throw new Error("Journal envelope is too short");
  if (
    !equalBytes(
      envelope.subarray(0, ACCOUNT_JOURNAL_ENVELOPE_MAGIC.length),
      ACCOUNT_JOURNAL_ENVELOPE_MAGIC,
    )
  ) {
    throw new Error("Journal envelope magic mismatch");
  }
  const nonce = envelope.subarray(
    ACCOUNT_JOURNAL_ENVELOPE_MAGIC.length,
    headerBytes,
  );
  const key = journalKey(provider, accountIdentity);
  try {
    const header = envelope.subarray(0, headerBytes);
    const plaintext = gcm(key, nonce, header).decrypt(
      envelope.subarray(headerBytes),
    );
    return decodeAccountJournalRecord(provider, plaintext);
  } finally {
    key.fill(0);
  }
}

export function accountJournalRecordAsProposal(
  record: AccountJournalRecord,
): SiblingProposal {
  return {
    recordHash: record.recordHash,
    installationId: record.installationId,
    decisionClass: record.decisionClass,
    emittedAt: record.emittedAt,
    payload: record.payload,
  };
}

function recordKey(recordHash: string): string {
  return `${RECORD_PREFIX}${asciiHexLower(recordHash)}`;
}

export function createKeyValueAccountJournal(options: {
  readonly store: AccountJournalKeyValueStore;
  readonly provider: CryptoProvider;
  readonly accountIdentity: Identity;
  readonly installationIdentity: Identity;
  readonly roster: LinkedInstallationRoster;
  readonly selfInstallationId: string;
}): AccountJournal {
  const selfInstallationId = asciiHexLower(options.selfInstallationId);

  async function loadIndex(): Promise<string[]> {
    const raw = await options.store.get(INDEX_KEY);
    if (raw === null) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(raw),
      );
    } catch {
      throw new Error("invalid account journal index");
    }
    if (!Array.isArray(parsed))
      throw new Error("invalid account journal index");
    return parsed.filter(
      (entry): entry is string =>
        typeof entry === "string" && /^[0-9a-f]{64}$/.test(entry),
    );
  }

  async function saveIndex(hashes: ReadonlyArray<string>): Promise<void> {
    await options.store.set(
      INDEX_KEY,
      new TextEncoder().encode(JSON.stringify(hashes)),
    );
  }

  async function persist(
    record: AccountJournalRecord,
    envelope: Uint8Array,
  ): Promise<boolean> {
    const hashes = await loadIndex();
    if (hashes.includes(record.recordHash)) return false;
    await options.store.set(recordKey(record.recordHash), envelope);
    await saveIndex([...hashes, record.recordHash]);
    return true;
  }

  async function loadRecord(
    recordHash: string,
  ): Promise<AccountJournalRecord | undefined> {
    const envelope = await options.store.get(recordKey(recordHash));
    if (envelope === null) return undefined;
    return decryptAccountJournalRecord(
      options.provider,
      options.accountIdentity,
      envelope,
    );
  }

  return {
    async append(decisionClass, payload, now) {
      const record = signAccountJournalRecord(
        options.provider,
        options.installationIdentity,
        {
          installationId: selfInstallationId,
          decisionClass,
          emittedAt: now,
          payload,
        },
      );
      const envelope = encryptAccountJournalRecord(
        options.provider,
        options.accountIdentity,
        record,
      );
      const stored = await persist(record, envelope);
      if (!stored) throw new Error("Journal record already exists");
      return record;
    },
    async ingest(envelope) {
      let record: AccountJournalRecord;
      try {
        record = decryptAccountJournalRecord(
          options.provider,
          options.accountIdentity,
          envelope,
        );
      } catch {
        return null;
      }
      if (record.installationId === selfInstallationId) return null;
      const entry = await options.roster.get(record.installationId);
      if (entry === undefined) return null;
      if (
        !verifyAccountJournalRecord(options.provider, entry.certificate, record)
      ) {
        return null;
      }
      const stored = await persist(record, envelope.slice());
      return stored ? record : null;
    },
    async get(recordHash) {
      return await loadRecord(asciiHexLower(recordHash));
    },
    async list() {
      const records: AccountJournalRecord[] = [];
      for (const hash of await loadIndex()) {
        const record = await loadRecord(hash);
        if (record !== undefined) records.push(record);
      }
      return records;
    },
    async envelope(recordHash) {
      return await options.store.get(recordKey(recordHash));
    },
  };
}
