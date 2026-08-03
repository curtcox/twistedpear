// @ts-nocheck
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { Identity, NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  decryptIdentityBackup,
  encryptIdentityBackup,
  identityHashHex,
  identityToRecoveryWords,
  isEncryptedIdentityBackup
} from "@twistedpear/host-core";
import { runIdentity, runInit } from "../src/commands/index.js";

describe("tp identity", () => {
  it("creates an encrypted vault, exports it, and imports without changing the identity", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-cli-identity-"));
    const vaultPassphrase = "local vault passphrase";
    const backupPassphrase = "portable backup passphrase";
    const readSecret = vi.fn(async () => backupPassphrase);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      expect(await runInit({ cwd, args: [], identityPassphrase: vaultPassphrase })).toBe(0);
      const vaultPath = join(cwd, ".tp", "identity");
      const original = decryptIdentityBackup(
        new NodeCryptoProvider(),
        new Uint8Array(readFileSync(vaultPath)),
        vaultPassphrase
      );
      expect(isEncryptedIdentityBackup(new Uint8Array(readFileSync(vaultPath)))).toBe(true);

      expect(await runIdentity({ cwd, args: ["export"], identityPassphrase: vaultPassphrase, readSecret })).toBe(0);
      const backupPath = join(cwd, "identity.tpidentity");
      expect(existsSync(backupPath)).toBe(true);
      rmSync(vaultPath);
      readSecret.mockClear();
      expect(await runIdentity({
        cwd,
        args: ["import", "identity.tpidentity"],
        identityPassphrase: vaultPassphrase,
        readSecret
      })).toBe(0);
      const imported = decryptIdentityBackup(
        new NodeCryptoProvider(),
        new Uint8Array(readFileSync(vaultPath)),
        vaultPassphrase
      );
      expect(imported.getPrivateKey()).toEqual(original.getPrivateKey());
      expect(readSecret).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("migrates a legacy raw identity during init without changing it", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-cli-legacy-"));
    const passphrase = "migrated vault passphrase";
    const provider = new NodeCryptoProvider();
    const identity = new Identity(provider);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const vaultPath = join(cwd, ".tp", "identity");
      mkdirSync(join(cwd, ".tp"), { recursive: true });
      writeFileSync(vaultPath, identity.getPrivateKey(), { mode: 0o644 });
      expect(await runInit({ cwd, args: [], identityPassphrase: passphrase })).toBe(0);
      const stored = new Uint8Array(readFileSync(vaultPath));
      expect(isEncryptedIdentityBackup(stored)).toBe(true);
      expect(statSync(vaultPath).mode & 0o777).toBe(0o600);
      expect(decryptIdentityBackup(provider, stored, passphrase).getPrivateKey()).toEqual(identity.getPrivateKey());
    } finally {
      log.mockRestore();
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("recovers from both word groups and changes the vault passphrase", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-cli-recovery-"));
    const provider = new NodeCryptoProvider();
    const identity = new Identity(provider);
    const words = identityToRecoveryWords(identity);
    const firstPassphrase = "first recovered passphrase";
    const nextPassphrase = "replacement vault passphrase";
    const recoverySecrets = vi.fn()
      .mockResolvedValueOnce(words.first)
      .mockResolvedValueOnce(words.second);
    const changeSecrets = vi.fn()
      .mockResolvedValueOnce(nextPassphrase)
      .mockResolvedValueOnce(nextPassphrase);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      expect(await runIdentity({
        cwd,
        args: ["recovery", "import"],
        identityPassphrase: firstPassphrase,
        readSecret: recoverySecrets
      })).toBe(0);
      const vaultPath = join(cwd, ".tp", "identity");
      expect(decryptIdentityBackup(provider, new Uint8Array(readFileSync(vaultPath)), firstPassphrase).getPrivateKey())
        .toEqual(identity.getPrivateKey());

      expect(await runIdentity({
        cwd,
        args: ["change-passphrase"],
        identityPassphrase: firstPassphrase,
        readSecret: changeSecrets
      })).toBe(0);
      expect(() => decryptIdentityBackup(provider, new Uint8Array(readFileSync(vaultPath)), firstPassphrase)).toThrow();
      expect(decryptIdentityBackup(provider, new Uint8Array(readFileSync(vaultPath)), nextPassphrase).getPrivateKey())
        .toEqual(identity.getPrivateKey());
    } finally {
      log.mockRestore();
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("requires force and an interactive candidate-hash confirmation before replacement", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-cli-replace-"));
    const provider = new NodeCryptoProvider();
    const vaultPassphrase = "existing vault passphrase";
    const backupPassphrase = "candidate backup passphrase";
    const candidate = new Identity(provider);
    const candidateHash = identityHashHex(candidate).slice(0, 12);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      expect(await runInit({ cwd, args: [], identityPassphrase: vaultPassphrase })).toBe(0);
      const vaultPath = join(cwd, ".tp", "identity");
      const before = readFileSync(vaultPath);
      writeFileSync(join(cwd, "candidate.tpidentity"), encryptIdentityBackup(provider, candidate, backupPassphrase));

      await expect(runIdentity({
        cwd,
        args: ["import", "candidate.tpidentity"],
        identityPassphrase: vaultPassphrase,
        readSecret: vi.fn(async () => backupPassphrase)
      })).rejects.toThrow("repeat with --force");
      expect(readFileSync(vaultPath)).toEqual(before);

      const cancelledSecrets = vi.fn()
        .mockResolvedValueOnce(backupPassphrase)
        .mockResolvedValueOnce("not-the-candidate");
      await expect(runIdentity({
        cwd,
        args: ["import", "candidate.tpidentity", "--force"],
        identityPassphrase: vaultPassphrase,
        interactive: true,
        readSecret: cancelledSecrets
      })).rejects.toThrow("replacement cancelled");
      expect(readFileSync(vaultPath)).toEqual(before);

      const acceptedSecrets = vi.fn()
        .mockResolvedValueOnce(backupPassphrase)
        .mockResolvedValueOnce(candidateHash);
      expect(await runIdentity({
        cwd,
        args: ["import", "candidate.tpidentity", "--force"],
        identityPassphrase: vaultPassphrase,
        interactive: true,
        readSecret: acceptedSecrets
      })).toBe(0);
      expect(decryptIdentityBackup(provider, new Uint8Array(readFileSync(vaultPath)), vaultPassphrase).getPrivateKey())
        .toEqual(candidate.getPrivateKey());
    } finally {
      log.mockRestore();
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
