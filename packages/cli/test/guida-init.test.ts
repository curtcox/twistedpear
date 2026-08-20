import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOST_API_VERSION } from "@twistedpear/miniapp-runtime";
import { runGuidaInit } from "../src/commands/guida-commands.js";

describe("tp guida init", () => {
  it("scaffolds Main.elm, elm.json, and the current host API", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-guida-init-"));
    try {
      await expect(runGuidaInit({ cwd, args: ["demo"] })).resolves.toBe(0);
      const manifest = JSON.parse(
        readFileSync(join(cwd, "demo", "app.manifest.json"), "utf8"),
      ) as { minHostApi: string; entry: string; capabilities: string[] };
      expect(manifest.minHostApi).toBe(HOST_API_VERSION);
      expect(manifest.entry).toBe("bundle.js");
      expect(manifest.capabilities).toEqual([]);
      expect(readFileSync(join(cwd, "demo", "src", "Main.elm"), "utf8")).toMatch(
        /Program\.app/,
      );
      expect(readFileSync(join(cwd, "demo", "elm.json"), "utf8")).toMatch(
        /"elm-version": "0.19.1"/,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
