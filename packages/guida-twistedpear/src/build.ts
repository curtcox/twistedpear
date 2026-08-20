import { existsSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JsModuleGuidaCompiler } from "./compiler.js";
import { minifyGuida } from "./minify.js";
import { GUIDA_SHIM_SOURCE } from "./shim.js";
import { wrapGuidaScope } from "./wrap-scope.js";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const VENDORED_ELM = join(PACKAGE_ROOT, "elm");
export const GUIDA_VENDOR_DIR = "guida-vendor";
export const GUIDA_COMPILER_VERSION = "1.0.0-beta.2";

export interface GuidaBuildOptions {
  readonly appDir: string;
  readonly entry?: string;
  readonly optimize?: boolean;
  readonly minify?: boolean;
}

export interface GuidaBuildResult {
  readonly bundle: string;
  readonly rawBytes: number;
  readonly wrappedBytes: number;
  readonly minifiedBytes: number;
  readonly compilerVersion: string;
}

export function assembleGuidaBundle(
  compiled: string,
  options: { minify?: boolean } = {},
): Promise<string> {
  const wrapped = wrapGuidaScope(compiled);
  if (options.minify === false) {
    return Promise.resolve(`${wrapped}\n${GUIDA_SHIM_SOURCE}`);
  }
  return minifyGuida(wrapped).then(
    (minified) => `${minified}\n${GUIDA_SHIM_SOURCE}`,
  );
}

export function hasVendoredSources(
  appDir: string,
  directories: ReadonlyArray<string>,
): boolean {
  return directories.some((dir) => {
    const resolved = isAbsolute(dir) ? dir : join(appDir, dir);
    return existsSync(join(resolved, "TwistedPear", "Program.elm"));
  });
}

export async function ensureVendoredSources(appDir: string): Promise<void> {
  const vendorDir = join(appDir, GUIDA_VENDOR_DIR);
  await cp(VENDORED_ELM, vendorDir, { recursive: true, force: true });
  const elmJsonPath = join(appDir, "elm.json");
  const parsed = JSON.parse(await readFile(elmJsonPath, "utf8")) as {
    "source-directories"?: string[];
  };
  const directories = parsed["source-directories"] ?? ["src"];
  if (directories.includes(GUIDA_VENDOR_DIR)) return;
  parsed["source-directories"] = [...directories, GUIDA_VENDOR_DIR];
  await writeFile(elmJsonPath, `${JSON.stringify(parsed, null, 4)}\n`);
}

export async function buildGuidaApp(
  options: GuidaBuildOptions,
): Promise<GuidaBuildResult> {
  const entry = options.entry ?? "src/Main.elm";
  await ensureVendoredSources(options.appDir);
  const compiler = JsModuleGuidaCompiler.forDirectory(options.appDir);
  const made = await compiler.make(entry, {
    optimize: options.optimize !== false,
  });
  const wrapped = wrapGuidaScope(made.output);
  const minified =
    options.minify === false ? wrapped : await minifyGuida(wrapped);
  const bundle = `${minified}\n${GUIDA_SHIM_SOURCE}`;
  await mkdir(options.appDir, { recursive: true });
  await writeFile(join(options.appDir, "bundle.js"), bundle);
  return {
    bundle,
    rawBytes: Buffer.byteLength(made.output),
    wrappedBytes: Buffer.byteLength(wrapped),
    minifiedBytes: Buffer.byteLength(bundle),
    compilerVersion: GUIDA_COMPILER_VERSION,
  };
}
