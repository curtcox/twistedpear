import { gcm } from "@noble/ciphers/aes.js";
import { scrypt } from "@noble/hashes/scrypt.js";
import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import {
  APP_DATA_ARCHIVE_MAGIC,
  AppDataArchiveError,
  assertExportableSnapshot,
  concatBytes,
  dataViewOf,
  u16be,
  u32be,
  utf8Bytes,
  type AppDataRecord,
  type AppDataSnapshot,
} from "./app-data-archive.js";
import {
  IDENTITY_SCRYPT_PARAMS,
  validateNewIdentityPassphrase,
} from "./identity-backup.js";

const MAGIC = new TextEncoder().encode(APP_DATA_ARCHIVE_MAGIC);
const CHUNK_PLAINTEXT = 4096;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;

export type AppDataArchiveEntropy = {
  readonly salt?: Uint8Array;
  readonly nonces?: ReadonlyArray<Uint8Array>;
};

function deriveKey(passphrase: string, salt: Uint8Array): Uint8Array {
  return scrypt(
    utf8Bytes(passphrase.normalize("NFKC")),
    salt,
    IDENTITY_SCRYPT_PARAMS,
  );
}

function packRecords(records: readonly AppDataRecord[]): Uint8Array {
  return concatBytes(
    records.map((record) => {
      const key = utf8Bytes(record.key);
      return concatBytes([
        u16be(key.length),
        key,
        u32be(record.seq),
        u32be(record.value.length),
        record.value,
      ]);
    }),
  );
}

function splitChunks(plaintext: Uint8Array): Uint8Array[] {
  if (plaintext.length === 0) return [new Uint8Array()];
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < plaintext.length; offset += CHUNK_PLAINTEXT) {
    chunks.push(plaintext.subarray(offset, offset + CHUNK_PLAINTEXT));
  }
  return chunks;
}

function take(bytes: Uint8Array, offset: number, length: number): Uint8Array {
  if (offset + length > bytes.length) {
    throw new AppDataArchiveError("TRUNCATED", "App data archive is truncated");
  }
  return bytes.subarray(offset, offset + length);
}

export function encodeAppDataArchive(
  provider: CryptoProvider,
  snapshot: AppDataSnapshot,
  passphrase: string,
  confirmation: string,
  entropy: AppDataArchiveEntropy = {},
): Uint8Array {
  assertExportableSnapshot(snapshot);
  validateNewIdentityPassphrase(passphrase, confirmation);
  const salt = entropy.salt ?? provider.randomBytes(SALT_BYTES);
  if (salt.length !== SALT_BYTES) throw new Error("salt must be 16 bytes");
  const meta = utf8Bytes(
    JSON.stringify({
      hostApi: snapshot.hostApi,
      includePending: snapshot.includePending,
      records: snapshot.records.length,
    }),
  );
  const appId = utf8Bytes(snapshot.appId);
  const header = concatBytes([
    MAGIC,
    Uint8Array.of(1, 15),
    u16be(IDENTITY_SCRYPT_PARAMS.r),
    u16be(IDENTITY_SCRYPT_PARAMS.p),
    salt,
    u16be(appId.length),
    appId,
    u32be(meta.length),
    meta,
  ]);
  const key = deriveKey(passphrase, salt);
  const chunks: Uint8Array[] = [];
  try {
    splitChunks(packRecords(snapshot.records)).forEach((plain, index) => {
      const nonce =
        entropy.nonces?.[index] ?? provider.randomBytes(NONCE_BYTES);
      if (nonce.length !== NONCE_BYTES)
        throw new Error("nonce must be 12 bytes");
      const ciphertext = gcm(
        key,
        nonce,
        concatBytes([header, u32be(index)]),
      ).encrypt(plain);
      chunks.push(
        concatBytes([
          u32be(index),
          nonce,
          u32be(ciphertext.length),
          ciphertext,
        ]),
      );
    });
  } finally {
    key.fill(0);
  }
  return concatBytes([header, ...chunks]);
}

function unpackRecords(plaintext: Uint8Array): AppDataRecord[] {
  const records: AppDataRecord[] = [];
  let offset = 0;
  while (offset < plaintext.length) {
    const keyLen = dataViewOf(take(plaintext, offset, 2)).getUint16(0, false);
    offset += 2;
    const keyBytes = take(plaintext, offset, keyLen);
    offset += keyLen;
    const fields = dataViewOf(take(plaintext, offset, 8));
    const seq = fields.getUint32(0, false);
    const valueLen = fields.getUint32(4, false);
    offset += 8;
    const value = take(plaintext, offset, valueLen);
    offset += valueLen;
    records.push({
      key: new TextDecoder().decode(keyBytes),
      seq,
      value,
    });
  }
  return records;
}

type ParsedArchiveHeader = {
  readonly salt: Uint8Array;
  readonly appId: string;
  readonly meta: {
    readonly hostApi: string;
    readonly includePending: boolean;
    readonly records: number;
  };
  readonly header: Uint8Array;
  readonly offset: number;
};

function parseArchiveHeader(container: Uint8Array): ParsedArchiveHeader {
  let offset = MAGIC.length;
  const version = take(container, offset, 1)[0];
  const logN = take(container, offset + 1, 1)[0];
  offset += 2;
  const kdf = dataViewOf(take(container, offset, 4));
  const r = kdf.getUint16(0, false);
  const p = kdf.getUint16(2, false);
  offset += 4;
  if (
    version !== 1 ||
    logN !== 15 ||
    r !== IDENTITY_SCRYPT_PARAMS.r ||
    p !== IDENTITY_SCRYPT_PARAMS.p
  ) {
    throw new AppDataArchiveError("MAGIC", "Not an app data archive");
  }
  const salt = take(container, offset, SALT_BYTES);
  offset += SALT_BYTES;
  const appIdLen = dataViewOf(take(container, offset, 2)).getUint16(0, false);
  offset += 2;
  const appId = new TextDecoder().decode(take(container, offset, appIdLen));
  offset += appIdLen;
  const metaLen = dataViewOf(take(container, offset, 4)).getUint32(0, false);
  offset += 4;
  const meta = JSON.parse(
    new TextDecoder().decode(take(container, offset, metaLen)),
  ) as ParsedArchiveHeader["meta"];
  offset += metaLen;
  return {
    salt,
    appId,
    meta,
    header: container.subarray(0, offset),
    offset,
  };
}

function decryptArchiveChunks(
  container: Uint8Array,
  start: number,
  header: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  const plains: Uint8Array[] = [];
  let offset = start;
  let index = 0;
  while (offset < container.length) {
    const claimed = dataViewOf(take(container, offset, 4)).getUint32(0, false);
    offset += 4;
    if (claimed !== index) {
      throw new AppDataArchiveError(
        "TRUNCATED",
        "App data archive is truncated",
      );
    }
    const nonce = take(container, offset, NONCE_BYTES);
    offset += NONCE_BYTES;
    const ctLen = dataViewOf(take(container, offset, 4)).getUint32(0, false);
    offset += 4;
    const ciphertext = take(container, offset, ctLen);
    offset += ctLen;
    plains.push(
      gcm(key, nonce, concatBytes([header, u32be(index)])).decrypt(ciphertext),
    );
    index += 1;
  }
  return concatBytes(plains);
}

export function decodeAppDataArchive(
  container: Uint8Array,
  passphrase: string,
): AppDataSnapshot {
  if (
    container.length < MAGIC.length ||
    !MAGIC.every((byte, index) => container[index] === byte)
  ) {
    throw new AppDataArchiveError("MAGIC", "Not an app data archive");
  }
  try {
    const parsed = parseArchiveHeader(container);
    const key = deriveKey(passphrase, parsed.salt);
    try {
      const records = unpackRecords(
        decryptArchiveChunks(container, parsed.offset, parsed.header, key),
      );
      if (records.length !== parsed.meta.records) {
        throw new AppDataArchiveError(
          "TRUNCATED",
          "App data archive is truncated",
        );
      }
      const snapshot = {
        appId: parsed.appId,
        hostApi: parsed.meta.hostApi,
        includePending: parsed.meta.includePending,
        records,
      };
      assertExportableSnapshot(snapshot);
      return snapshot;
    } finally {
      key.fill(0);
    }
  } catch (error) {
    if (error instanceof AppDataArchiveError) throw error;
    throw new AppDataArchiveError(
      "AUTH",
      "Wrong passphrase or damaged app data archive",
    );
  }
}
