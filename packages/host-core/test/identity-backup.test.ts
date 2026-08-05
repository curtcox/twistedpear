import { chmodSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Identity, NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  IDENTITY_BACKUP_ERROR,
  decryptIdentityBackup,
  encryptIdentityBackup,
  identityFromRecoveryWords,
  identityToRecoveryWords,
  isEncryptedIdentityBackup,
  loadOrCreateIdentity,
  persistEncryptedIdentity,
  validateNewIdentityPassphrase
} from "../src/index.js";

const PASSPHRASE = "correct horse battery staple";
const provider = new NodeCryptoProvider();

function fixedIdentity(): Identity {
  const bytes = Uint8Array.from({ length: 64 }, (_, index) => index + 1);
  const identity = Identity.fromBytes(provider, bytes);
  if (identity === null) throw new Error("test identity rejected");
  return identity;
}

describe("identity backup", () => {
  it("produces the fixed v1 container and restores the exact identity", () => {
    const identity = fixedIdentity();
    const backup = encryptIdentityBackup(provider, identity, PASSPHRASE, {
      salt: Uint8Array.from({ length: 16 }, (_, index) => index),
      nonce: Uint8Array.from({ length: 12 }, (_, index) => 32 + index)
    });

    expect(new TextDecoder().decode(backup.subarray(0, 8))).toBe("TPIDBK01");
    expect(backup).toHaveLength(138);
    expect(Buffer.from(backup).toString("hex")).toMatchInlineSnapshot(`"54504944424b3031000f00080003000102030405060708090a0b0c0d0e0f202122232425262728292a2b0a20f6120d3b7d2a66326f75281995999edc71ba9b2eb377051a118ffe94f646182a497d064c5922e997a4d03812b7e214fe322a520b60ed6541538e0b9e4a2722c2cda4b44c809c77ae8808fd7347d96930ab65a854b7844faf93424768c28b"`);
    expect(decryptIdentityBackup(provider, backup, PASSPHRASE).getPrivateKey()).toEqual(identity.getPrivateKey());
  });

  it("rejects a wrong passphrase and authenticated-header or ciphertext tampering generically", () => {
    const backup = encryptIdentityBackup(provider, fixedIdentity(), PASSPHRASE);
    expect(() => decryptIdentityBackup(provider, backup, "wrong passphrase")).toThrow(IDENTITY_BACKUP_ERROR);
    for (const offset of [42, 80]) {
      const damaged = backup.slice();
      damaged[offset] ^= 1;
      expect(() => decryptIdentityBackup(provider, damaged, PASSPHRASE)).toThrow(IDENTITY_BACKUP_ERROR);
    }
  });

  it("round-trips both labelled 24-word BIP-39 groups", () => {
    const identity = fixedIdentity();
    const recovery = identityToRecoveryWords(identity);
    expect(recovery.first.split(" ")).toHaveLength(24);
    expect(recovery.second.split(" ")).toHaveLength(24);
    expect(identityFromRecoveryWords(provider, recovery).getPrivateKey()).toEqual(identity.getPrivateKey());
    expect(() => identityFromRecoveryWords(provider, { ...recovery, second: `${recovery.second} abandon` })).toThrow(
      "Invalid identity recovery words"
    );
  });

  it("writes mode 0600 and atomically migrates a legacy raw identity", async () => {
    const directory = mkdtempSync(join(tmpdir(), "tp-identity-"));
    const path = join(directory, "identity");
    const identity = fixedIdentity();
    writeFileSync(path, identity.getPrivateKey());
    chmodSync(path, 0o644);

    const migrated = await loadOrCreateIdentity(provider, path, { passphrase: PASSPHRASE, migrateLegacy: true });
    const stored = new Uint8Array(readFileSync(path));
    expect(isEncryptedIdentityBackup(stored)).toBe(true);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(migrated.hash).toEqual(identity.hash);
    expect(decryptIdentityBackup(provider, stored, PASSPHRASE).getPrivateKey()).toEqual(identity.getPrivateKey());
  });

  it("does not replace a valid vault when encryption fails", () => {
    const directory = mkdtempSync(join(tmpdir(), "tp-identity-failure-"));
    const path = join(directory, "identity");
    persistEncryptedIdentity(provider, path, fixedIdentity(), PASSPHRASE);
    const before = readFileSync(path);
    expect(() => persistEncryptedIdentity(provider, path, fixedIdentity(), "")).toThrow();
    expect(readFileSync(path)).toEqual(before);
  });

  it("enforces creation policy separately from permissive unlock", () => {
    expect(() => validateNewIdentityPassphrase("too short", "too short")).toThrow("at least 12");
    expect(() => validateNewIdentityPassphrase("long enough pass", "different passphrase")).toThrow("does not match");
    expect(() => validateNewIdentityPassphrase("long enough pass", "long enough pass")).not.toThrow();
  });

  // This intentionally repeats production-strength password KDF operations and can
  // exceed Vitest's default timeout under V8 coverage instrumentation on CI runners.
  it("round-trips randomly generated identities with fresh container entropy", () => {
    for (const passphrase of ["random passphrase alpha", "random passphrase beta"]) {
      const identity = new Identity(provider);
      const first = encryptIdentityBackup(provider, identity, passphrase);
      const second = encryptIdentityBackup(provider, identity, passphrase);
      expect(first).not.toEqual(second);
      expect(decryptIdentityBackup(provider, first, passphrase).getPrivateKey()).toEqual(identity.getPrivateKey());
      expect(decryptIdentityBackup(provider, second, passphrase).getPrivateKey()).toEqual(identity.getPrivateKey());
    }
  }, 120_000);
});
