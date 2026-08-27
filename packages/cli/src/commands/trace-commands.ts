import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  parseAppTrace,
  type AppTrace,
  type LaunchManifest,
} from "@twistedpear/miniapp-runtime";
import {
  TraceInputError,
  TraceReplayError,
  replaySession,
  type ReplayReport,
  type TraceStep,
} from "@twistedpear/miniapp-test";
import {
  renderHeadlessAxSnapshot,
  renderHeadlessSnapshot,
} from "@twistedpear/widget-renderer-headless";
import { resolveFromCwd } from "../config.js";
import {
  type CommandContext,
  hasFlag,
  parseFlag,
  printHelp,
} from "./helpers.js";

interface LoadedApp {
  readonly manifest: LaunchManifest;
  readonly bundle: Uint8Array;
}

/** `app.manifest.json` as it comes off disk: unvalidated, fields optional. */
interface ManifestFile {
  readonly name: string;
  readonly version: string;
  readonly entry: string;
  readonly capabilities?: ReadonlyArray<string>;
  readonly publisherPublicKey?: string;
  readonly minHostApi?: string;
}

function loadTrace(path: string): AppTrace {
  return parseAppTrace(JSON.parse(readFileSync(path, "utf8")));
}

function loadApp(appDir: string): LoadedApp {
  const manifestPath = join(appDir, "app.manifest.json");
  const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestFile;
  const manifest: LaunchManifest = {
    name: raw.name,
    version: raw.version,
    entry: raw.entry,
    capabilities: raw.capabilities ?? [],
    publisherPublicKey: raw.publisherPublicKey ?? "tp-trace-publisher",
    ...(raw.minHostApi === undefined ? {} : { minHostApi: raw.minHostApi }),
  };
  return {
    manifest,
    bundle: new Uint8Array(
      readFileSync(join(dirname(manifestPath), manifest.entry)),
    ),
  };
}

/**
 * `<file.tptrace> [app-dir]`. The trace names the app but never carries its
 * bundle, so replay always needs the source the trace was recorded against.
 */
function resolveTargets(
  ctx: CommandContext,
  verb: string,
): { trace: AppTrace; app: LoadedApp } | null {
  const tracePath = ctx.args[1];
  if (tracePath === undefined) {
    printHelp("trace");
    return null;
  }
  const appDirArg =
    parseFlag(ctx.args, "--app") ??
    (ctx.args[2] !== undefined && !ctx.args[2].startsWith("--")
      ? ctx.args[2]
      : ".");
  const appDir = resolveFromCwd(ctx.cwd, appDirArg);
  if (
    !statSync(join(appDir, "app.manifest.json"), {
      throwIfNoEntry: false,
    })?.isFile()
  ) {
    console.error(`tp trace ${verb}: not an app directory: ${appDir}`);
    return null;
  }
  return {
    trace: loadTrace(resolveFromCwd(ctx.cwd, tracePath)),
    app: loadApp(appDir),
  };
}

async function replayFor(
  ctx: CommandContext,
  verb: string,
): Promise<ReplayReport | null> {
  const targets = resolveTargets(ctx, verb);
  if (targets === null) return null;
  return replaySession({
    ...targets.app,
    trace: targets.trace,
    allowHostApiSkew: hasFlag(ctx.args, "--allow-host-skew"),
    strictClock: hasFlag(ctx.args, "--strict-clock"),
  });
}

function reportReplay(report: ReplayReport, json: boolean): number {
  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: report.ok,
          appId: report.appId,
          recordedEntries: report.recorded.entries.length,
          observedEntries: report.observed.entries.length,
          clockDrift: report.clockDrift,
          divergences: report.divergences,
        },
        null,
        2,
      ),
    );
    return report.ok ? 0 : 1;
  }
  console.log(
    `${report.appId}: ${report.recorded.entries.length} recorded entr(ies), ${report.observed.entries.length} replayed`,
  );
  if (report.clockDrift > 0) {
    console.log(
      `  clock drift on ${report.clockDrift} entr(ies) — shapes matched, timestamps did not`,
    );
  }
  if (report.ok) {
    console.log("  replay matched the recorded tape");
    return 0;
  }
  for (const divergence of report.divergences) {
    console.log(
      `  diverged at entry ${divergence.at}: expected ${divergence.expected ?? "(end of tape)"}, got ${divergence.actual ?? "(end of tape)"}`,
    );
  }
  return 1;
}

function stepLine(step: TraceStep): string {
  const nodeId = step.nodeId === null ? "" : ` on #${step.nodeId}`;
  return `  ${String(step.index).padStart(3)}  ${step.input}${nodeId}  ${step.patches.length} patch(es)`;
}

function printStep(step: TraceStep, ax: boolean): void {
  console.log(`step ${step.index}: ${step.input}`);
  if (step.tree === null) {
    console.log("  (no widget tree)");
    return;
  }
  const snapshot = ax
    ? renderHeadlessAxSnapshot(step.tree)
    : renderHeadlessSnapshot(step.tree);
  for (const line of snapshot.split("\n")) console.log(`  ${line}`);
}

async function runTraceReplay(ctx: CommandContext): Promise<number> {
  const report = await replayFor(ctx, "replay");
  if (report === null) return 1;
  return reportReplay(report, hasFlag(ctx.args, "--json"));
}

async function runTraceStep(ctx: CommandContext): Promise<number> {
  const report = await replayFor(ctx, "step");
  if (report === null) return 1;
  const ax = hasFlag(ctx.args, "--ax");
  const at = parseFlag(ctx.args, "--at");
  if (at !== null) {
    const index = Number.parseInt(at, 10);
    const step = report.steps[index];
    if (step === undefined) {
      console.error(
        `tp trace step: no step ${at}; the session has ${report.steps.length}`,
      );
      return 1;
    }
    printStep(step, ax);
    return report.ok ? 0 : 1;
  }
  console.log(`${report.appId}: ${report.steps.length} step(s)`);
  for (const step of report.steps) console.log(stepLine(step));
  printStep(report.steps[report.steps.length - 1] as TraceStep, ax);
  return report.ok ? 0 : 1;
}

export async function runTrace(ctx: CommandContext): Promise<number> {
  const verb = ctx.args[0];
  if (verb !== "replay" && verb !== "step") {
    printHelp("trace");
    return 1;
  }
  try {
    return verb === "replay"
      ? await runTraceReplay(ctx)
      : await runTraceStep(ctx);
  } catch (error) {
    // A refused replay is a result, not a crash: the trace named another app,
    // another host API, or an input this build of the app cannot accept.
    if (error instanceof TraceReplayError || error instanceof TraceInputError) {
      console.error(`tp trace ${verb}: ${error.message}`);
      return 1;
    }
    throw error;
  }
}
