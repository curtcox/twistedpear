import { bytesToHex, hexToBytes } from "@twistedpear/reticulum-ts";
import { decode256t, encode256t } from "@twistedpear/cas-256t";

export type TrustSource = "qr" | "paste" | "manual" | "introduced";
export type TrustDegree = "direct" | "imported" | "introduced";

export interface TrustedPublisher {
  readonly publisherPublicKey: string;
  readonly label: string;
  readonly addedAt: number;
  readonly source: TrustSource;
}

export const TRUST_DEGREE_RANK: Readonly<Record<TrustDegree, number>> = {
  introduced: 1,
  imported: 1,
  direct: 2,
};

export function trustDegreeFromSource(source: TrustSource): TrustDegree {
  if (source === "qr" || source === "manual") return "direct";
  if (source === "introduced") return "introduced";
  return "imported";
}

export interface TrustKeyValueStore {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}

const TRUST_STORE_KEY = "trust:publishers";
const PUBLIC_KEY_BYTES = 64;

export class TrustStoreError extends Error {
  constructor(
    readonly code: "INVALID_KEY" | "INVALID_IDENTITY_STRING",
    message: string,
  ) {
    super(message);
    this.name = "TrustStoreError";
  }
}

/**
 * Host-level list of publishers the user explicitly trusts. This gates
 * acceptance UX only — first-seen key pinning in CatalogStore remains the
 * authoritative anti-swap check per app.
 */
export class TrustStore {
  constructor(private readonly store: TrustKeyValueStore) {}

  async list(): Promise<ReadonlyArray<TrustedPublisher>> {
    const raw = await this.store.get(TRUST_STORE_KEY);
    if (raw === null) {
      return [];
    }

    return JSON.parse(new TextDecoder().decode(raw)) as TrustedPublisher[];
  }

  async add(entry: TrustedPublisher): Promise<ReadonlyArray<TrustedPublisher>> {
    validatePublisherKeyHex(entry.publisherPublicKey);
    const existing = await this.list();
    const next = [
      ...existing.filter(
        (candidate) =>
          candidate.publisherPublicKey !== entry.publisherPublicKey,
      ),
      { ...entry, label: entry.label.slice(0, 64) },
    ];
    await this.save(next);
    return next;
  }

  async remove(
    publisherPublicKey: string,
  ): Promise<ReadonlyArray<TrustedPublisher>> {
    const next = (await this.list()).filter(
      (entry) => entry.publisherPublicKey !== publisherPublicKey,
    );
    await this.save(next);
    return next;
  }

  async isTrusted(
    publisherPublicKey: string,
    minimum?: TrustDegree,
  ): Promise<boolean> {
    const entry = (await this.list()).find(
      (candidate) => candidate.publisherPublicKey === publisherPublicKey,
    );
    if (entry === undefined) return false;
    if (minimum === undefined) return true;
    return (
      TRUST_DEGREE_RANK[trustDegreeFromSource(entry.source)] >=
      TRUST_DEGREE_RANK[minimum]
    );
  }

  async degreeOf(publisherPublicKey: string): Promise<TrustDegree | null> {
    const entry = (await this.list()).find(
      (candidate) => candidate.publisherPublicKey === publisherPublicKey,
    );
    return entry === undefined ? null : trustDegreeFromSource(entry.source);
  }

  private async save(entries: ReadonlyArray<TrustedPublisher>): Promise<void> {
    await this.store.set(
      TRUST_STORE_KEY,
      new TextEncoder().encode(JSON.stringify(entries)),
    );
  }
}

function validatePublisherKeyHex(publisherPublicKey: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(publisherPublicKey)) {
    throw new TrustStoreError("INVALID_KEY", "Publisher key must be hex");
  }

  const bytes = hexToBytes(publisherPublicKey);
  if (bytes.length !== PUBLIC_KEY_BYTES) {
    throw new TrustStoreError(
      "INVALID_KEY",
      `Publisher key must be ${PUBLIC_KEY_BYTES} bytes`,
    );
  }

  return bytes;
}

/**
 * A publisher identity exchanged as a 94-character 256t string (QR-able).
 * The 64-byte Reticulum public key exactly fills the inline capacity.
 */
export function encodePublisherIdentity256t(
  publisherPublicKey: string | Uint8Array,
): string {
  const bytes =
    typeof publisherPublicKey === "string"
      ? validatePublisherKeyHex(publisherPublicKey)
      : publisherPublicKey;
  if (bytes.length !== PUBLIC_KEY_BYTES) {
    throw new TrustStoreError(
      "INVALID_KEY",
      `Publisher key must be ${PUBLIC_KEY_BYTES} bytes`,
    );
  }

  return encode256t(bytes, () => {
    throw new TrustStoreError(
      "INVALID_KEY",
      "Identity strings are always inline",
    );
  });
}

export function decodePublisherIdentity256t(id: string): string {
  let decoded;
  try {
    decoded = decode256t(id.trim());
  } catch (error) {
    throw new TrustStoreError(
      "INVALID_IDENTITY_STRING",
      error instanceof Error ? error.message : "Invalid identity string",
    );
  }

  if (decoded.inline === null || decoded.inline.length !== PUBLIC_KEY_BYTES) {
    throw new TrustStoreError(
      "INVALID_IDENTITY_STRING",
      "Identity strings inline a 64-byte publisher public key",
    );
  }

  return bytesToHex(decoded.inline);
}
