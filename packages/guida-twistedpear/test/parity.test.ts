import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGuidaApp } from "../src/build.js";
import { compileGuidaWorkspace } from "../src/compile-workspace.js";
import {
  canonical,
  listTwinDirs,
  recordBundle,
} from "./twins.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const template = join(here, "../templates/hello");
const jsTwin = join(here, "../fixtures/hello-js/bundle.js");
const cookbookApps = join(root, "cookbook/apps");
const exampleApps = join(root, "apps/examples");
const cookbookExamples = join(root, "cookbook/examples");

const skipGuida = await import("guida")
  .then(() => false)
  .catch(() => true);

async function buildAndCompare(
  appDir: string,
  jsSource: string,
  events: ReadonlyArray<{ nodeId: string; event: string; value?: unknown }>,
  mode: "all" | "settled",
) {
  const cwd = mkdtempSync(join(tmpdir(), "tp-guida-parity-"));
  const interval = globalThis.setInterval;
  globalThis.setInterval = (() => 0) as typeof setInterval;
  try {
    cpSync(appDir, cwd, { recursive: true });
    const built = await buildGuidaApp({ appDir: cwd });
    const jsFrames = await recordBundle(jsSource, events);
    const guidaFrames = await recordBundle(built.bundle, events);
    expect(jsFrames.length).toBeGreaterThan(0);
    expect(guidaFrames.length).toBeGreaterThan(0);
    if (mode === "all") {
      expect(canonical(guidaFrames)).toBe(canonical(jsFrames));
      return;
    }
    const guida = canonical(guidaFrames.at(-1));
    const js = canonical(jsFrames.at(-1));
    expect(guida).toBe(js);
  } finally {
    globalThis.setInterval = interval;
    rmSync(cwd, { recursive: true, force: true });
  }
}

describe.skipIf(skipGuida)("Guida/JS widget-stream parity", () => {
  it("hello twins emit canonically identical frames for the same taps", async () => {
    const { readFileSync } = await import("node:fs");
    await buildAndCompare(
      template,
      readFileSync(jsTwin, "utf8"),
      [
        { nodeId: "tap", event: "tap" },
        { nodeId: "tap", event: "tap" },
      ],
      "all",
    );
  }, 120_000);

  it("contract-notebook twins match on the settled initial tree", async () => {
    const dir = join(cookbookExamples, "contract-notebook");
    const interval = globalThis.setInterval;
    globalThis.setInterval = (() => 0) as typeof setInterval;
    try {
      const built = await compileGuidaWorkspace([
        { path: "elm.json", content: readFileSync(join(dir, "elm.json"), "utf8") },
        {
          path: "src/Main.elm",
          content: readFileSync(join(dir, "src/Main.elm"), "utf8"),
        },
      ]);
      const jsFrames = await recordBundle(
        readFileSync(join(dir, "bundle.js"), "utf8"),
        [],
      );
      const guidaFrames = await recordBundle(built.bundle, []);
      expect(jsFrames.length).toBeGreaterThan(0);
      expect(guidaFrames.length).toBeGreaterThan(0);
      expect(canonical(guidaFrames.at(-1))).toBe(canonical(jsFrames.at(-1)));
    } finally {
      globalThis.setInterval = interval;
    }
  }, 120_000);

  it("unit-converter twins match after input and unit select", async () => {
    const { readFileSync } = await import("node:fs");
    const dir = join(cookbookApps, "unit-converter");
    await buildAndCompare(
      dir,
      readFileSync(join(dir, "bundle.js"), "utf8"),
      [
        { nodeId: "input", event: "conv.input", value: "12.4" },
        { nodeId: "unit-m-ft", event: "conv.select.m-ft" },
      ],
      "settled",
    );
  }, 120_000);

  it("every cookbook and example twin matches on the settled initial tree", async () => {
    const { readFileSync } = await import("node:fs");
    const dirs = [
      ...listTwinDirs(cookbookApps),
      ...listTwinDirs(exampleApps),
      ...listTwinDirs(cookbookExamples),
    ];
    expect(dirs.length).toBeGreaterThanOrEqual(29);
    const mismatches: string[] = [];
    for (const dir of dirs) {
      try {
        await buildAndCompare(
          dir,
          readFileSync(join(dir, "bundle.js"), "utf8"),
          [],
          "settled",
        );
      } catch (error) {
        mismatches.push(
          `${dir}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  }, 420_000);
});
