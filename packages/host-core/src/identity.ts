import { closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { CryptoProvider, Identity } from "@twistedpear/reticulum-ts";
import { Identity as RnsIdentity, bytesToHex } from "@twistedpear/reticulum-ts";
import { ensureDir } from "./config.js";
import { decryptIdentityBackup, encryptIdentityBackup, isEncryptedIdentityBackup } from "./identity-backup.js";

export interface IdentityVaultOptions {
  readonly passphrase: string;
  readonly migrateLegacy?: boolean;
}

export async function loadOrCreateIdentity(
  provider: CryptoProvider,
  identityPath: string,
  options?: IdentityVaultOptions
): Promise<Identity> {
  if (existsSync(identityPath)) {
    const bytes = new Uint8Array(readFileSync(identityPath));
    const loaded = isEncryptedIdentityBackup(bytes)
      ? options === undefined ? null : decryptIdentityBackup(provider, bytes, options.passphrase)
      : RnsIdentity.fromBytes(provider, bytes);
    if (loaded === null) {
      throw new Error(options === undefined && isEncryptedIdentityBackup(bytes)
        ? "Identity vault passphrase is required"
        : `Invalid identity at ${identityPath}`);
    }
    if (!isEncryptedIdentityBackup(bytes) && options?.migrateLegacy === true) {
      persistEncryptedIdentity(provider, identityPath, loaded, options.passphrase);
    }
    return loaded;
  }

  if (options === undefined) throw new Error("Identity vault passphrase is required to create an identity");
  const identity = new RnsIdentity(provider);
  persistEncryptedIdentity(provider, identityPath, identity, options.passphrase);
  return identity;
}

/** @deprecated Use persistEncryptedIdentity for all newly persisted identities. */
export async function persistIdentity(identityPath: string, identity: Identity): Promise<void> {
  ensureDir(dirname(identityPath));
  const bytes = identity.getPrivateKey();
  atomicWritePrivateFile(identityPath, bytes);
  bytes.fill(0);
}

export function persistEncryptedIdentity(
  provider: CryptoProvider,
  identityPath: string,
  identity: Identity,
  passphrase: string
): void {
  ensureDir(dirname(identityPath));
  const bytes = encryptIdentityBackup(provider, identity, passphrase);
  try {
    atomicWritePrivateFile(identityPath, bytes);
  } finally {
    bytes.fill(0);
  }
}

export function atomicWritePrivateFile(path: string, bytes: Uint8Array): void {
  const temporaryPath = join(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporaryPath, "wx", 0o600);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, path);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    throw error;
  }
}

export function identityHashHex(identity: Identity): string {
  return bytesToHex(identity.hash);
}
