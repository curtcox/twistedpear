import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  serializeAppTrace,
  type AppTrace,
  type LaunchManifest,
} from "@twistedpear/miniapp-runtime";
import { fireTraceEvent, recordSession } from "@twistedpear/miniapp-test";
import { runTrace } from "../src/commands/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const diceDir = join(repoRoot, "cookbook/apps/dice-table");
const notesDir = join(repoRoot, "cookbook/apps/pocket-notes");
const temporaryDirectories: string[] = [];

function appOf(dir: string): {
  manifest: LaunchManifest;
  bundle: Uint8Array;
} {
  const raw = JSON.parse(
    readFileSync(join(dir, "app.manifest.json"), "utf8"),
  ) as LaunchManifest & { publisherPublicKey?: string };
  const manifest: LaunchManifest = {
    ...raw,
    publisherPublicKey: raw.publisherPublicKey ?? "tp-trace-publisher",
  };
  return {
    manifest,
    bundle: new Uint8Array(readFileSync(join(dir, manifest.entry))),
  };
}

async function recordDiceTrace(): Promise<AppTrace> {
  const recording = await recordSession({
    ...appOf(diceDir),
    script: async (session) => {
      await fireTraceEvent(session, "dice.coin");
      await fireTraceEvent(session, "dice.roll.20");
    },
  });
  await recording.host.stop();
  return recording.trace;
}

function writeTrace(trace: AppTrace): string {
  const dir = mkdtempSync(join(tmpdir(), "tp-trace-"));
  temporaryDirectories.push(dir);
  const path = join(dir, "session.tptrace");
  writeFileSync(path, serializeAppTrace(trace));
  return path;
}

let diceTrace: AppTrace;

beforeAll(async () => {
  diceTrace = await recordDiceTrace();
}, 60_000);

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("tp trace replay", () => {
  it("replays a recorded session against the app it names", async () => {
    const lines: string[] = [];
    const log = vi
      .spyOn(console, "log")
      .mockImplementation((line: string) => void lines.push(line));
    try {
      expect(
        await runTrace({
          cwd: repoRoot,
          args: ["replay", writeTrace(diceTrace), diceDir],
        }),
      ).toBe(0);
    } finally {
      log.mockRestore();
    }
    expect(lines.join("\n")).toContain("replay matched the recorded tape");
  }, 60_000);

  it("emits a machine-readable report under --json", async () => {
    const lines: string[] = [];
    const log = vi
      .spyOn(console, "log")
      .mockImplementation((line: string) => void lines.push(line));
    try {
      expect(
        await runTrace({
          cwd: repoRoot,
          args: ["replay", writeTrace(diceTrace), diceDir, "--json"],
        }),
      ).toBe(0);
    } finally {
      log.mockRestore();
    }
    const report = JSON.parse(lines.join("\n")) as {
      ok: boolean;
      appId: string;
      divergences: unknown[];
      clockDrift: number;
    };
    expect(report).toMatchObject({
      ok: true,
      appId: "dice-table",
      divergences: [],
      clockDrift: 0,
    });
  }, 60_000);

  it("refuses a trace recorded for a different app", async () => {
    const errors: string[] = [];
    const error = vi
      .spyOn(console, "error")
      .mockImplementation((line: string) => void errors.push(line));
    try {
      expect(
        await runTrace({
          cwd: repoRoot,
          args: ["replay", writeTrace(diceTrace), notesDir],
        }),
      ).toBe(1);
    } finally {
      error.mockRestore();
    }
    expect(errors.join("\n")).toContain("dice-table");
  }, 60_000);

  it("refuses a trace stamped with another host API version", async () => {
    const errors: string[] = [];
    const error = vi
      .spyOn(console, "error")
      .mockImplementation((line: string) => void errors.push(line));
    try {
      const path = writeTrace({
        ...diceTrace,
        hostApiVersion: "0.0.1-not-this-host",
      });
      expect(
        await runTrace({ cwd: repoRoot, args: ["replay", path, diceDir] }),
      ).toBe(1);
    } finally {
      error.mockRestore();
    }
    expect(errors.join("\n")).toContain("0.0.1-not-this-host");
  }, 60_000);

  it("rejects an unknown verb and a path that is not an app", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await runTrace({ cwd: repoRoot, args: ["shrink"] })).toBe(1);
      expect(
        await runTrace({
          cwd: repoRoot,
          args: ["replay", writeTrace(diceTrace), join(repoRoot, "docs")],
        }),
      ).toBe(1);
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  }, 60_000);
});

describe("tp trace step", () => {
  it("lists one step per recorded input and renders the last headlessly", async () => {
    const lines: string[] = [];
    const log = vi
      .spyOn(console, "log")
      .mockImplementation((line: string) => void lines.push(line));
    try {
      expect(
        await runTrace({
          cwd: repoRoot,
          args: ["step", writeTrace(diceTrace), diceDir],
        }),
      ).toBe(0);
    } finally {
      log.mockRestore();
    }
    const output = lines.join("\n");
    expect(output).toContain("dice-table: 3 step(s)");
    expect(output).toContain("launch");
    expect(output).toContain("dice.coin");
    expect(output).toContain("dice.roll.20");
    // The headless renderer, not the raw widget tree.
    expect(output).toContain("View#root");
  }, 60_000);

  it("renders one step's accessibility tree under --at and --ax", async () => {
    const lines: string[] = [];
    const log = vi
      .spyOn(console, "log")
      .mockImplementation((line: string) => void lines.push(line));
    try {
      expect(
        await runTrace({
          cwd: repoRoot,
          args: ["step", writeTrace(diceTrace), diceDir, "--at", "0", "--ax"],
        }),
      ).toBe(0);
    } finally {
      log.mockRestore();
    }
    const output = lines.join("\n");
    expect(output).toContain("step 0: launch");
    expect(output).not.toContain("step 1:");
    expect(output).toContain("button");
  }, 60_000);

  it("reports a step index the session does not have", async () => {
    const errors: string[] = [];
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi
      .spyOn(console, "error")
      .mockImplementation((line: string) => void errors.push(line));
    try {
      expect(
        await runTrace({
          cwd: repoRoot,
          args: ["step", writeTrace(diceTrace), diceDir, "--at", "99"],
        }),
      ).toBe(1);
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
    expect(errors.join("\n")).toContain("no step 99");
  }, 60_000);
});
