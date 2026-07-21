import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import { decryptIdentityBackup, isEncryptedIdentityBackup } from "@twistedpear/host-core";
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
});
