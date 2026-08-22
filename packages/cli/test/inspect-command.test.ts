import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCreate, runInit, runPack } from "../src/commands/index.js";
import { inspectArchive } from "../src/commands/inspect-commands.js";

const passphrase = "conformance identity passphrase";
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("tp inspect", () => {
  it("verifies hashes and prints install estimates", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-inspect-"));
    temporaryDirectories.push(cwd);
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(
        await runInit({ cwd, args: [], identityPassphrase: passphrase }),
      ).toBe(0);
      expect(await runCreate({ cwd, args: ["hello"] })).toBe(0);
      expect(
        await runPack({ cwd, args: ["hello-miniapp", "--out", "hello.tpkg"] }),
      ).toBe(0);
    } finally {
      consoleLog.mockRestore();
    }
    const archive = new Uint8Array(readFileSync(join(cwd, "hello.tpkg")));
    const report = inspectArchive(archive);
    expect(report).toContain("sha512: verified");
    expect(report).toContain("sha256:");
    expect(report).toContain("signature: verified");
    expect(report).toContain("install: LAN");
    expect(report).toContain("LoRa");
  });
});
