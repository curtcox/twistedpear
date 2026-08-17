/**
 * One-way linked-mode switch.
 *
 * Enabling splits this host's roles: the vault identity stays the account and
 * publisher, while host and app serving destinations move to a derived
 * installation identity. Disabling is not offered — putting the account key
 * back on a live destination would recreate the multi-host collision the
 * split exists to prevent. Importing a backup or recovery words does not
 * write this store, so disaster recovery stays unlinked until the user
 * enables explicitly.
 */
import {
  bytesToHex,
  type CryptoProvider,
  type Identity,
} from "@twistedpear/reticulum-ts";
import {
  asciiHexLower,
  createLinkedInstallation,
  verifyLinkedInstallationCertificate,
  type LinkedInstallationCertificate,
} from "./linked-installation.js";
import type {
  LinkedInstallationKeyValueStore,
  LinkedInstallationRoster,
} from "./linked-installation-roster.js";

const STORE_KEY = "linked-mode:v1";

export interface LinkedModePreview {
  readonly accountHash: string;
  readonly installationHash: string;
  readonly installationId: string;
  readonly publisherPublicKey: string;
  readonly servingPublicKey: string;
  readonly label: string;
  readonly certificate: LinkedInstallationCertificate;
}

export type LinkedModeStatus =
  | { readonly enabled: false }
  | {
      readonly enabled: true;
      readonly enabledAt: number;
      readonly preview: LinkedModePreview;
    };

export interface LinkedModeIdentities {
  readonly account: Identity;
  readonly publisher: Identity;
  readonly serving: Identity;
}

export interface LinkedModeSwitch {
  status(): Promise<LinkedModeStatus>;
  preview(options: {
    readonly label: string;
    readonly createdAt: number;
    readonly installationId?: string;
  }): Promise<LinkedModePreview>;
  enable(options: {
    readonly preview: LinkedModePreview;
    readonly confirmedAccountHash: string;
    readonly confirmedInstallationHash: string;
    readonly now: number;
    readonly roster?: LinkedInstallationRoster;
  }): Promise<Extract<LinkedModeStatus, { enabled: true }>>;
  identities(): Promise<LinkedModeIdentities>;
}

interface LinkedModeSnapshot {
  readonly version: 1;
  readonly enabledAt: number;
  readonly certificate: LinkedInstallationCertificate;
}

function hashesOf(
  accountIdentity: Identity,
  installation: ReturnType<typeof createLinkedInstallation>,
): LinkedModePreview {
  return {
    accountHash: bytesToHex(accountIdentity.hash),
    installationHash: bytesToHex(installation.installationIdentity.hash),
    installationId: installation.installationId,
    publisherPublicKey: bytesToHex(accountIdentity.getPublicKey()),
    servingPublicKey: bytesToHex(
      installation.installationIdentity.getPublicKey(),
    ),
    label: installation.certificate.label,
    certificate: installation.certificate,
  };
}

function sameHash(left: string, right: string): boolean {
  return asciiHexLower(left.trim()) === asciiHexLower(right.trim());
}

function previewFromCertificate(
  accountIdentity: Identity,
  provider: CryptoProvider,
  certificate: LinkedInstallationCertificate,
): LinkedModePreview {
  const installation = createLinkedInstallation(provider, accountIdentity, {
    label: certificate.label,
    createdAt: certificate.createdAt,
    installationId: certificate.installationId,
  });
  return hashesOf(accountIdentity, installation);
}

/** Candidate split shown before confirmation. Does not persist. */
export function previewLinkedModeSwitch(
  provider: CryptoProvider,
  accountIdentity: Identity,
  options: {
    readonly label: string;
    readonly createdAt: number;
    readonly installationId?: string;
  },
): LinkedModePreview {
  return hashesOf(
    accountIdentity,
    createLinkedInstallation(provider, accountIdentity, options),
  );
}

function invalidStore(): never {
  throw new Error("invalid linked-mode store");
}

function decodeSnapshotObject(raw: Uint8Array): {
  version?: unknown;
  enabledAt?: unknown;
  certificate?: unknown;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  } catch {
    invalidStore();
  }
  if (typeof parsed !== "object" || parsed === null) invalidStore();
  return parsed as {
    version?: unknown;
    enabledAt?: unknown;
    certificate?: unknown;
  };
}

function parseCertificate(
  value: unknown,
  provider: CryptoProvider,
  accountPublicKey: string,
): LinkedInstallationCertificate {
  if (typeof value !== "object" || value === null) invalidStore();
  const certificate = value as LinkedInstallationCertificate;
  if (
    asciiHexLower(certificate.accountPublicKey) !== accountPublicKey ||
    !verifyLinkedInstallationCertificate(provider, certificate)
  ) {
    invalidStore();
  }
  return certificate;
}

function parseSnapshot(
  raw: Uint8Array,
  provider: CryptoProvider,
  accountPublicKey: string,
): LinkedModeSnapshot {
  const snapshot = decodeSnapshotObject(raw);
  if (snapshot.version !== 1) invalidStore();
  const enabledAt = snapshot.enabledAt;
  if (
    typeof enabledAt !== "number" ||
    !Number.isSafeInteger(enabledAt) ||
    enabledAt < 0
  ) {
    invalidStore();
  }
  return {
    version: 1,
    enabledAt,
    certificate: parseCertificate(
      snapshot.certificate,
      provider,
      accountPublicKey,
    ),
  };
}

function hashesMatchPreview(
  recomputed: LinkedModePreview,
  preview: LinkedModePreview,
  confirmedAccountHash: string,
  confirmedInstallationHash: string,
): boolean {
  return (
    sameHash(recomputed.accountHash, confirmedAccountHash) &&
    sameHash(recomputed.installationHash, confirmedInstallationHash) &&
    sameHash(recomputed.accountHash, preview.accountHash) &&
    sameHash(recomputed.installationHash, preview.installationHash)
  );
}

async function persistEnabled(
  store: LinkedInstallationKeyValueStore,
  snapshot: LinkedModeSnapshot,
  roster: LinkedInstallationRoster | undefined,
): Promise<void> {
  await store.set(
    STORE_KEY,
    new TextEncoder().encode(JSON.stringify(snapshot)),
  );
  if (roster !== undefined) {
    await roster.merge(snapshot.certificate, snapshot.enabledAt);
  }
}

function servingIdentities(
  provider: CryptoProvider,
  accountIdentity: Identity,
  preview: LinkedModePreview | null,
): LinkedModeIdentities {
  if (preview === null) {
    return {
      account: accountIdentity,
      publisher: accountIdentity,
      serving: accountIdentity,
    };
  }
  const installation = createLinkedInstallation(provider, accountIdentity, {
    label: preview.label,
    createdAt: preview.certificate.createdAt,
    installationId: preview.installationId,
  });
  return {
    account: accountIdentity,
    publisher: accountIdentity,
    serving: installation.installationIdentity,
  };
}

export function createKeyValueLinkedModeSwitch(options: {
  readonly store: LinkedInstallationKeyValueStore;
  readonly provider: CryptoProvider;
  readonly accountIdentity: Identity;
}): LinkedModeSwitch {
  const accountPublicKey = asciiHexLower(
    bytesToHex(options.accountIdentity.getPublicKey()),
  );

  async function loadSnapshot(): Promise<LinkedModeSnapshot | null> {
    const raw = await options.store.get(STORE_KEY);
    if (raw === null) return null;
    return parseSnapshot(raw, options.provider, accountPublicKey);
  }

  async function enabledPreview(): Promise<LinkedModePreview | null> {
    const snapshot = await loadSnapshot();
    if (snapshot === null) return null;
    return previewFromCertificate(
      options.accountIdentity,
      options.provider,
      snapshot.certificate,
    );
  }

  return {
    async status() {
      const snapshot = await loadSnapshot();
      if (snapshot === null) return { enabled: false };
      return {
        enabled: true,
        enabledAt: snapshot.enabledAt,
        preview: previewFromCertificate(
          options.accountIdentity,
          options.provider,
          snapshot.certificate,
        ),
      };
    },

    async preview(previewOptions) {
      const existing = await enabledPreview();
      if (existing !== null) return existing;
      return previewLinkedModeSwitch(
        options.provider,
        options.accountIdentity,
        previewOptions,
      );
    },

    async enable(enableOptions) {
      if (!Number.isSafeInteger(enableOptions.now) || enableOptions.now < 0) {
        throw new Error(
          "Linked-mode enable time must be a non-negative integer",
        );
      }
      if ((await loadSnapshot()) !== null) {
        throw new Error("Linked mode is already enabled");
      }
      const recomputed = previewLinkedModeSwitch(
        options.provider,
        options.accountIdentity,
        {
          label: enableOptions.preview.label,
          createdAt: enableOptions.preview.certificate.createdAt,
          installationId: enableOptions.preview.installationId,
        },
      );
      if (
        !hashesMatchPreview(
          recomputed,
          enableOptions.preview,
          enableOptions.confirmedAccountHash,
          enableOptions.confirmedInstallationHash,
        )
      ) {
        throw new Error(
          "Account and installation hashes must both be confirmed before enabling linked mode",
        );
      }
      await persistEnabled(
        options.store,
        {
          version: 1,
          enabledAt: enableOptions.now,
          certificate: recomputed.certificate,
        },
        enableOptions.roster,
      );
      return {
        enabled: true as const,
        enabledAt: enableOptions.now,
        preview: recomputed,
      };
    },

    async identities() {
      return servingIdentities(
        options.provider,
        options.accountIdentity,
        await enabledPreview(),
      );
    },
  };
}
