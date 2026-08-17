/**
 * Local roster of verified linked-installation certificates, and the pairing
 * flow that seeds a new installation from an encrypted account backup.
 *
 * Pairing writes nothing until the caller has confirmed the account hash from
 * the backup header. The backup itself is the existing identity container:
 * whoever holds it and the transfer passphrase becomes the account.
 */
import {
  bytesToHex,
  type CryptoProvider,
  type Identity,
} from "@twistedpear/reticulum-ts";
import {
  encryptIdentityBackup,
  identityBackupHash,
  decryptIdentityBackup,
} from "./identity-backup.js";
import {
  asciiHexLower,
  createLinkedInstallation,
  verifyLinkedInstallationCertificate,
  type LinkedInstallationCertificate,
} from "./linked-installation.js";

export const LINKED_ACCOUNT_BACKUP_WARNING =
  "A link backup is equivalent to the account recovery words: whoever holds both becomes the account.";

const ROSTER_KEY = "linked-installations:v1";
const INSTALLATION_ID_PATTERN = /^[0-9a-f]{32}$/;

export interface LinkedInstallationRosterEntry {
  readonly certificate: LinkedInstallationCertificate;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
}

export interface LinkedInstallationKeyValueStore {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface LinkedInstallationRoster {
  list(): Promise<ReadonlyArray<LinkedInstallationRosterEntry>>;
  get(
    installationId: string,
  ): Promise<LinkedInstallationRosterEntry | undefined>;
  has(installationId: string): Promise<boolean>;
  merge(
    certificate: LinkedInstallationCertificate,
    now: number,
  ): Promise<boolean>;
  remove(installationId: string): Promise<boolean>;
}

interface RosterSnapshot {
  readonly version: 1;
  readonly entries: LinkedInstallationRosterEntry[];
}

function normalizeInstallationId(installationId: string): string {
  const normalized = installationId.trim().toLowerCase();
  if (!INSTALLATION_ID_PATTERN.test(normalized))
    throw new Error("Installation id must be 32 hexadecimal characters");
  return normalized;
}

function isCertificateShape(
  value: unknown,
): value is LinkedInstallationCertificate {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<LinkedInstallationCertificate>;
  return (
    candidate.formatVersion === 1 &&
    typeof candidate.accountPublicKey === "string" &&
    typeof candidate.installationId === "string" &&
    typeof candidate.installationPublicKey === "string" &&
    typeof candidate.label === "string" &&
    Number.isSafeInteger(candidate.createdAt) &&
    typeof candidate.signature === "string"
  );
}

function isEntryShape(value: unknown): value is LinkedInstallationRosterEntry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<LinkedInstallationRosterEntry>;
  return (
    isCertificateShape(candidate.certificate) &&
    Number.isSafeInteger(candidate.firstSeenAt) &&
    Number.isSafeInteger(candidate.lastSeenAt)
  );
}

async function loadRosterEntries(options: {
  readonly store: LinkedInstallationKeyValueStore;
  readonly provider: CryptoProvider;
  readonly accountPublicKey: string;
}): Promise<LinkedInstallationRosterEntry[]> {
  const raw = await options.store.get(ROSTER_KEY);
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  } catch {
    throw new Error("invalid linked-installation roster");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("invalid linked-installation roster");
  }
  const snapshot = parsed as { version?: unknown; entries?: unknown };
  if (snapshot.version !== 1 || !Array.isArray(snapshot.entries)) {
    throw new Error("invalid linked-installation roster");
  }
  return snapshot.entries.flatMap((entry) => {
    if (!isEntryShape(entry)) return [];
    if (
      asciiHexLower(entry.certificate.accountPublicKey) !==
      options.accountPublicKey
    ) {
      return [];
    }
    if (
      !verifyLinkedInstallationCertificate(options.provider, entry.certificate)
    ) {
      return [];
    }
    return [entry];
  });
}

async function saveRosterEntries(
  store: LinkedInstallationKeyValueStore,
  entries: ReadonlyArray<LinkedInstallationRosterEntry>,
): Promise<void> {
  const snapshot: RosterSnapshot = { version: 1, entries: [...entries] };
  await store.set(
    ROSTER_KEY,
    new TextEncoder().encode(JSON.stringify(snapshot)),
  );
}

export function createKeyValueLinkedInstallationRoster(options: {
  readonly store: LinkedInstallationKeyValueStore;
  readonly provider: CryptoProvider;
  readonly accountPublicKey: string;
  readonly selfInstallationId: string;
}): LinkedInstallationRoster {
  const accountPublicKey = asciiHexLower(options.accountPublicKey);
  const selfInstallationId = normalizeInstallationId(
    options.selfInstallationId,
  );

  async function load(): Promise<LinkedInstallationRosterEntry[]> {
    return loadRosterEntries({
      store: options.store,
      provider: options.provider,
      accountPublicKey,
    });
  }

  return {
    async list() {
      return (await load()).sort(
        (left, right) => left.firstSeenAt - right.firstSeenAt,
      );
    },
    async get(installationId) {
      const id = normalizeInstallationId(installationId);
      return (await load()).find(
        (entry) => entry.certificate.installationId === id,
      );
    },
    async has(installationId) {
      const id = normalizeInstallationId(installationId);
      return (await load()).some(
        (entry) => entry.certificate.installationId === id,
      );
    },
    async merge(certificate, now) {
      if (!Number.isSafeInteger(now) || now < 0) return false;
      if (asciiHexLower(certificate.accountPublicKey) !== accountPublicKey)
        return false;
      if (!verifyLinkedInstallationCertificate(options.provider, certificate))
        return false;
      let installationId: string;
      try {
        installationId = normalizeInstallationId(certificate.installationId);
      } catch {
        return false;
      }
      const entries = await load();
      const existing = entries.find(
        (entry) => entry.certificate.installationId === installationId,
      );
      if (
        existing !== undefined &&
        asciiHexLower(existing.certificate.installationPublicKey) !==
          asciiHexLower(certificate.installationPublicKey)
      ) {
        return false;
      }
      const next: LinkedInstallationRosterEntry = {
        certificate: { ...certificate, installationId },
        firstSeenAt: existing?.firstSeenAt ?? now,
        lastSeenAt: now,
      };
      await saveRosterEntries(options.store, [
        ...entries.filter(
          (entry) => entry.certificate.installationId !== installationId,
        ),
        next,
      ]);
      return true;
    },
    async remove(installationId) {
      const id = normalizeInstallationId(installationId);
      if (id === selfInstallationId) {
        throw new Error("Cannot remove this installation from its own roster");
      }
      const entries = await load();
      if (!entries.some((entry) => entry.certificate.installationId === id))
        return false;
      await saveRosterEntries(
        options.store,
        entries.filter((entry) => entry.certificate.installationId !== id),
      );
      return true;
    },
  };
}

export interface LinkedAccountBackupExport {
  readonly backup: Uint8Array;
  readonly accountHash: string;
  readonly warning: string;
}

/** Encrypted account backup for a separate-channel passphrase transfer. */
export function exportLinkedAccountBackup(
  provider: CryptoProvider,
  accountIdentity: Identity,
  passphrase: string,
): LinkedAccountBackupExport {
  const backup = encryptIdentityBackup(provider, accountIdentity, passphrase);
  return {
    backup,
    accountHash: identityBackupHash(backup),
    warning: LINKED_ACCOUNT_BACKUP_WARNING,
  };
}

/**
 * Decrypts an account backup only after the caller confirms the header hash.
 * Creates this machine's installation. Persistence is the caller's job, so a
 * mismatched confirmation writes nothing.
 */
export function pairNewLinkedInstallation(options: {
  readonly provider: CryptoProvider;
  readonly backup: Uint8Array;
  readonly passphrase: string;
  readonly confirmedAccountHash: string;
  readonly label: string;
  readonly createdAt: number;
}): {
  readonly accountIdentity: Identity;
  readonly installationId: string;
  readonly installationIdentity: Identity;
  readonly certificate: LinkedInstallationCertificate;
} {
  const advertised = identityBackupHash(options.backup);
  if (advertised !== asciiHexLower(options.confirmedAccountHash.trim())) {
    throw new Error("Account hash confirmation does not match this backup");
  }
  const accountIdentity = decryptIdentityBackup(
    options.provider,
    options.backup,
    options.passphrase,
  );
  if (bytesToHex(accountIdentity.hash) !== advertised) {
    throw new Error("Account hash confirmation does not match this backup");
  }
  const created = createLinkedInstallation(options.provider, accountIdentity, {
    label: options.label,
    createdAt: options.createdAt,
  });
  return { accountIdentity, ...created };
}
