import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  compileGuidaWorkspace,
  type WorkspaceFile,
} from "../src/compile-workspace.js";
import { canonical, listTwinDirs, recordBundle } from "./twins.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const template = join(here, "../templates/hello");
const jsTwin = join(here, "../fixtures/hello-js/bundle.js");
const cookbookApps = join(root, "cookbook/apps");
const exampleApps = join(root, "apps/examples");
const cookbookExamples = join(root, "cookbook/examples");
const twinCases = [
  ...listTwinDirs(cookbookApps),
  ...listTwinDirs(exampleApps),
  ...listTwinDirs(cookbookExamples),
].map((dir) => ({ dir, label: relative(root, dir) }));

const skipGuida = await import("guida").then(() => false).catch(() => true);

function readWorkspaceSources(
  appDir: string,
  sourceDir = join(appDir, "src"),
): WorkspaceFile[] {
  return readdirSync(sourceDir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(sourceDir, entry.name);
    if (entry.isDirectory()) {
      return readWorkspaceSources(appDir, path);
    }
    return [
      {
        path: relative(appDir, path),
        content: readFileSync(path, "utf8"),
      },
    ];
  });
}

function readWorkspace(appDir: string): WorkspaceFile[] {
  return [
    {
      path: "elm.json",
      content: readFileSync(join(appDir, "elm.json"), "utf8"),
    },
    ...readWorkspaceSources(appDir),
  ];
}

async function buildAndCompare(
  appDir: string,
  jsSource: string,
  events: ReadonlyArray<{ nodeId: string; event: string; value?: unknown }>,
  mode: "all" | "settled",
) {
  const interval = globalThis.setInterval;
  globalThis.setInterval = (() => 0) as typeof setInterval;
  try {
    const built = await compileGuidaWorkspace(readWorkspace(appDir));
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
      const built = await compileGuidaWorkspace(readWorkspace(dir));
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

  it("discovers every cookbook and example twin", () => {
    expect(twinCases.length).toBeGreaterThanOrEqual(29);
  });

  it.each(twinCases)(
    "$label twin matches on the settled initial tree",
    async ({ dir }) => {
      await buildAndCompare(
        dir,
        readFileSync(join(dir, "bundle.js"), "utf8"),
        [],
        "settled",
      );
    },
    120_000,
  );
});
