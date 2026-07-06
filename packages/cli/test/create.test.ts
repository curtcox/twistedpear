import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { HOST_API_VERSION } from "@twistedpear/miniapp-runtime";
import { runCreate, runDev } from "../src/commands/index.js";

describe("tp create/dev", () => {
  it("scaffolds the hello template with the current host API", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-create-"));
    try {
      await expect(runCreate({ cwd, args: ["hello"] })).resolves.toBe(0);
      const manifest = JSON.parse(await readFile(join(cwd, "hello-miniapp", "app.manifest.json"), "utf8")) as {
        minHostApi: string;
        capabilities: string[];
      };
      expect(manifest.minHostApi).toBe(HOST_API_VERSION);
      expect(manifest.capabilities).toEqual([]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("validates capabilities before dev side-load", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-dev-"));
    try {
      await runCreate({ cwd, args: ["chat-min"] });
      await expect(runDev({ cwd, args: ["chat-min"] })).resolves.toBe(0);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
