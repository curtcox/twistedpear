import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { decodeAppDataArchive } from "@twistedpear/host-core";
import { runApp } from "../src/commands/index.js";

const PASSPHRASE = "correct horse battery staple";

describe("tp app export", () => {
  it("writes an encrypted archive from the local kv store and does not restore", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-cli-app-data-"));
    mkdirSync(join(cwd, ".tp"));
    writeFileSync(
      join(cwd, ".tp", "miniapp-kv.json"),
      JSON.stringify({
        "miniapp-kv:hello:greeting": { seq: 2, value: Buffer.from("hi").toString("hex") },
      }),
    );
    const readSecret = vi.fn(async () => PASSPHRASE);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      expect(
        await runApp({
          cwd,
          args: ["export", "hello", "--out", "hello.tpappdata"],
          readSecret,
        }),
      ).toBe(0);
      const bytes = new Uint8Array(
        readFileSync(join(cwd, "hello.tpappdata")),
      );
      const restored = decodeAppDataArchive(bytes, PASSPHRASE);
      expect(restored.records).toHaveLength(1);
      expect(new TextDecoder().decode(restored.records[0]?.value)).toBe("hi");
      expect(log.mock.calls.join("\n")).toMatch(/Exported 1 records/);
      expect(log.mock.calls.join("\n")).not.toMatch(/restore/i);
    } finally {
      log.mockRestore();
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 120_000);
});
