import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { LaunchManifest } from "@twistedpear/miniapp-runtime";
import {
  TraceInputError,
  TraceReplayError,
  fireTraceEvent,
  recordSession,
  replaySession,
  roundTripSession,
} from "../src/index.js";
import { traceInputs } from "../src/trace-replay.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function cookbookApp(name: string): {
  manifest: LaunchManifest;
  bundle: Uint8Array;
} {
  const dir = join(repoRoot, "cookbook/apps", name);
  const raw = JSON.parse(
    readFileSync(join(dir, "app.manifest.json"), "utf8"),
  ) as LaunchManifest & { publisherPublicKey?: string };
  const manifest: LaunchManifest = {
    ...raw,
    publisherPublicKey: raw.publisherPublicKey ?? "trace-test-publisher",
  };
  return {
    manifest,
    bundle: new Uint8Array(readFileSync(join(dir, manifest.entry))),
  };
}

// dice-table draws entropy on every input, so a round trip that reproduces its
// rolls is evidence the sandbox seed replayed, not just that the tape lines up.
const diceScript = async (
  session: Parameters<
    NonNullable<Parameters<typeof roundTripSession>[0]["script"]>
  >[0],
): Promise<void> => {
  await fireTraceEvent(session, "dice.coin");
  await fireTraceEvent(session, "dice.roll.20");
  await fireTraceEvent(session, "dice.card");
};

describe("TRACE-3 replay", () => {
  it("round trips an entropy-drawing cookbook app", async () => {
    const report = await roundTripSession({
      ...cookbookApp("dice-table"),
      script: diceScript,
    });
    expect(report.divergences).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.patchesMatch).toBe(true);
    expect(report.patches.length).toBeGreaterThan(0);
    expect(traceInputs(report.recorded)).toEqual([
      "dice.coin",
      "dice.roll.20",
      "dice.card",
    ]);
    // One step per input, plus the launch.
    expect(report.steps).toHaveLength(4);
    expect(report.steps[0]?.input).toBe("launch");
  }, 60_000);

  it("round trips an app with no entropy and no inputs", async () => {
    const report = await roundTripSession(cookbookApp("unit-converter"));
    expect(report.divergences).toEqual([]);
    expect(report.patchesMatch).toBe(true);
  }, 60_000);

  // The tape is shape-only by construction: it says an entropy draw happened
  // and how many bytes, never which bytes. A replay on a different sandbox seed
  // therefore still matches the tape while rendering something else, and only
  // the patch-stream comparison catches it.
  it("reports a different sandbox seed as a patch-stream difference", async () => {
    const app = cookbookApp("dice-table");
    const recording = await recordSession({ ...app, script: diceScript });
    await recording.host.stop();
    const report = await replaySession({
      ...app,
      trace: recording.trace,
      clock: { startMs: 1_700_000_000_000 },
    });
    expect(report.divergences.filter((row) => row.at < 2)).toEqual([]);
    expect(JSON.stringify(report.patches)).not.toBe(
      JSON.stringify(recording.patches),
    );
    expect(report.clockDrift).toBeGreaterThan(0);
  }, 60_000);

  it("refuses a trace recorded for a different app", async () => {
    const recording = await recordSession(cookbookApp("unit-converter"));
    await recording.host.stop();
    await expect(
      replaySession({ ...cookbookApp("dice-table"), trace: recording.trace }),
    ).rejects.toBeInstanceOf(TraceReplayError);
  }, 60_000);

  it("refuses a trace stamped with another host API version", async () => {
    const recording = await recordSession(cookbookApp("unit-converter"));
    await recording.host.stop();
    await expect(
      replaySession({
        ...cookbookApp("unit-converter"),
        trace: { ...recording.trace, hostApiVersion: "0.0.1-not-this-host" },
      }),
    ).rejects.toBeInstanceOf(TraceReplayError);
  }, 60_000);

  it("fails loudly when a replayed tree cannot accept a recorded input", async () => {
    const recording = await recordSession(cookbookApp("unit-converter"));
    await recording.host.stop();
    await expect(
      replaySession({
        ...cookbookApp("unit-converter"),
        trace: {
          ...recording.trace,
          entries: [
            ...recording.trace.entries,
            { t: "inbound", at: 1, kind: "ui", name: "no.such.event" },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(TraceInputError);
  }, 60_000);
});
