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

  it("prints help when the app id is missing and refuses to overwrite without --force", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-cli-app-data-"));
    mkdirSync(join(cwd, ".tp"));
    writeFileSync(join(cwd, ".tp", "miniapp-kv.json"), "{}");
    const help = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      expect(await runApp({ cwd, args: ["export"], readSecret: vi.fn() })).toBe(
        1,
      );
      expect(help.mock.calls.join("\n")).toMatch(/tp app export/);
      writeFileSync(join(cwd, "hello.tpappdata"), "no");
      await expect(
        runApp({
          cwd,
          args: ["export", "hello", "--out", "hello.tpappdata"],
          readSecret: vi.fn(async () => PASSPHRASE),
        }),
      ).rejects.toThrow(/Refusing to overwrite/);
    } finally {
      help.mockRestore();
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe("tp app restore", () => {
  it("restores an archive, refuses collisions, and replaces on request", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-cli-app-restore-"));
    mkdirSync(join(cwd, ".tp"));
    writeFileSync(
      join(cwd, ".tp", "miniapp-kv.json"),
      JSON.stringify({
        "miniapp-kv:hello:greeting": {
          seq: 2,
          value: Buffer.from("hi").toString("hex"),
        },
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
      writeFileSync(join(cwd, ".tp", "miniapp-kv.json"), "{}");
      expect(
        await runApp({
          cwd,
          args: ["restore", "hello.tpappdata"],
          readSecret,
        }),
      ).toBe(0);
      expect(log.mock.calls.join("\n")).toMatch(/Restored 1 records/);
      expect(log.mock.calls.join("\n")).toMatch(/address does not/);
      expect(log.mock.calls.join("\n")).toMatch(/Parked data/);
      await expect(
        runApp({
          cwd,
          args: ["restore", "hello.tpappdata"],
          readSecret,
        }),
      ).rejects.toThrow(/already exists/);
      expect(
        await runApp({
          cwd,
          args: ["restore", "hello.tpappdata", "--replace"],
          readSecret,
        }),
      ).toBe(0);
    } finally {
      log.mockRestore();
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 120_000);

  it("writes nothing when the archive is damaged", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-cli-app-restore-bad-"));
    mkdirSync(join(cwd, ".tp"));
    writeFileSync(join(cwd, ".tp", "miniapp-kv.json"), "{}");
    writeFileSync(join(cwd, "bad.tpappdata"), "not-an-archive");
    try {
      await expect(
        runApp({
          cwd,
          args: ["restore", "bad.tpappdata"],
          readSecret: vi.fn(async () => PASSPHRASE),
        }),
      ).rejects.toThrow();
      expect(JSON.parse(readFileSync(join(cwd, ".tp", "miniapp-kv.json"), "utf8"))).toEqual(
        {},
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
