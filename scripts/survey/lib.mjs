import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const REPORTS = path.join(ROOT, "reports");

/**
 * Run a command and hand back everything about how it went.
 *
 * Nothing here throws on a non-zero exit. The survey reports what it measured
 * and records what it could not; a tool that fails is data about the tool, not
 * a reason to abandon the other eleven.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string, maxBuffer?: number, env?: NodeJS.ProcessEnv }} [options]
 */
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
    maxBuffer: options.maxBuffer ?? 512 * 1024 * 1024,
    env: options.env ?? process.env,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

/**
 * Parse stdout as JSON, with the failure carrying enough to debug it.
 *
 * Several of these tools exit non-zero *because* they found something, so exit
 * status is not a usable signal. Whether usable JSON came back is.
 *
 * @param {ReturnType<typeof run>} result
 * @param {string} label
 */
export function parseJson(result, label) {
  const text = result.stdout.trim();
  if (text === "") {
    const detail = result.error
      ? result.error.message
      : (result.stderr.trim().split("\n").slice(-5).join("\n") ??
        "no stderr either");
    throw new Error(
      `${label} produced no stdout (exit ${result.status}): ${detail}`,
    );
  }
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new Error(
      `${label} produced unparseable JSON (exit ${result.status}): ${text.slice(0, 300)}`,
      { cause },
    );
  }
}

/** @param {string} file @param {unknown} value */
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return fs.statSync(file).size;
}

/** @param {string} file */
export function readJson(file, fallback = undefined) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

/**
 * The installed version of an npm package, or null when it is absent.
 *
 * Read from `node_modules` rather than from `package.json`, because a range in
 * `package.json` is a request and this manifest has to record what actually
 * ran.
 *
 * @param {string} name
 */
export function packageVersion(name) {
  try {
    return readJson(path.join(ROOT, "node_modules", name, "package.json"))
      .version;
  } catch {
    return null;
  }
}

const EXCLUDED = [
  /^archive\//,
  /^site\//,
  /(^|\/)dist\//,
  /(^|\/)node_modules\//,
  /\.gen\.ts$/,
  /\.generated\.js$/,
  /\.generated\.mjs$/,
  /\.generated\.d\.ts$/,
  /^packages\/guida-twistedpear\/seed\//,
  /^conformance\/guida-compiler\//,
  /\.bundle(\.[a-z]+)?$/,
  /^apps\/harness-mobile\/(android|ios|public)\//,
  /^apps\/handbook\/(generated|seeds)\//,
  /^apps\/host-desktop\/src\/renderer\/vendor\//,
  /^packages\/reticulum-ts\/docs\/api\//,
  /^apps\/harness-mobile\/worklet\/(web-)?entry-part-/,
  // Built by the web conformance runners; gitignored, and tens of thousands of
  // lines of inlined dependencies each.
  /^conformance\/.*\/web-core\.worker\.js$/,
  /^conformance\/.*\/web-hyper-fetch\.js$/,
  /^conformance\/.*\/(fixtures|publisher-data|fixture)\.mjs$/,
];

/** @param {string} file */
export function isExcluded(file) {
  return EXCLUDED.some((pattern) => pattern.test(file));
}
