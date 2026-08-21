import { extractOutput, isolateCompiledJs } from "./extract-output.js";
import {
  byteLengthOf,
  bytesOf,
  utf8,
  type GuidaFsConfig,
} from "./fs-config.js";
import { memoryGuidaConfig } from "./memory-config.js";
import {
  extractFormatted,
  flattenGuidaDiagnostics,
  problemFromError,
  type GuidaProblem,
} from "./problems.js";
import { createPackageRegistryXhr } from "./seed-xhr.js";
import { GUIDA_SHIM_SOURCE } from "./shim.js";
import {
  GUIDA_COMPILER_VERSION,
  GUIDA_VENDOR_DIR,
  WORKSPACE_CWD,
  WORKSPACE_HOME,
} from "./version.js";
import { wrapGuidaScope } from "./wrap-scope.js";

export type { GuidaProblem };

export interface WorkspaceFile {
  readonly path: string;
  readonly content: string | Uint8Array;
}

export interface GuidaBuildResult {
  readonly bundle: string;
  readonly rawBytes: number;
  readonly wrappedBytes: number;
  readonly minifiedBytes: number;
  readonly compilerVersion: string;
}

export interface SeedMemoryOptions {
  readonly files: ReadonlyArray<WorkspaceFile>;
  readonly vendorFiles: Readonly<Record<string, string>>;
  readonly homeFiles: Readonly<Record<string, string>>;
}

export interface CompileMemoryOptions extends SeedMemoryOptions {
  readonly make: (
    config: GuidaFsConfig,
    entryPath: string,
    options?: { debug?: boolean; optimize?: boolean; sourcemaps?: boolean },
  ) => Promise<unknown>;
  readonly entry?: string;
  readonly optimize?: boolean;
  readonly assemble?: (compiled: string) => Promise<string>;
}

export interface DiagnoseMemoryOptions extends SeedMemoryOptions {
  readonly diagnostics: (
    config: GuidaFsConfig,
    args: { content: string } | { path: string },
  ) => Promise<unknown>;
  readonly path?: string;
}

export interface FormatMemoryOptions extends SeedMemoryOptions {
  readonly format: (config: GuidaFsConfig, content: string) => Promise<unknown>;
  readonly content: string;
}

function putFile(
  files: Map<string, Uint8Array>,
  abs: string,
  content: string | Uint8Array,
): void {
  files.set(abs, bytesOf(content));
}

function workspacePath(cwd: string, relative: string): string {
  return `${cwd}/${relative.replace(/^\/+/u, "")}`;
}

function ensureVendoredElmJson(
  files: Map<string, Uint8Array>,
  cwd: string,
): void {
  const elmJsonPath = workspacePath(cwd, "elm.json");
  const raw = files.get(elmJsonPath);
  if (raw === undefined) return;
  const parsed = JSON.parse(utf8(raw)) as {
    "source-directories"?: string[];
  };
  const directories = parsed["source-directories"] ?? ["src"];
  if (directories.includes(GUIDA_VENDOR_DIR)) return;
  parsed["source-directories"] = [...directories, GUIDA_VENDOR_DIR];
  putFile(files, elmJsonPath, `${JSON.stringify(parsed, null, 4)}\n`);
}

function compiledFromHtml(
  files: Map<string, Uint8Array>,
  cwd: string,
): string | undefined {
  const html = files.get(workspacePath(cwd, "index.html"));
  if (html === undefined) return undefined;
  const text = utf8(html);
  return text.includes("_Platform_export")
    ? isolateCompiledJs(text)
    : undefined;
}

export function seedGuidaMemory(options: SeedMemoryOptions): {
  readonly files: Map<string, Uint8Array>;
  readonly config: GuidaFsConfig;
} {
  const cwd = WORKSPACE_CWD;
  const home = WORKSPACE_HOME;
  const files = new Map<string, Uint8Array>();
  for (const file of options.files) {
    putFile(files, workspacePath(cwd, file.path), file.content);
  }
  ensureVendoredElmJson(files, cwd);
  for (const [relative, content] of Object.entries(options.vendorFiles)) {
    putFile(
      files,
      workspacePath(cwd, `${GUIDA_VENDOR_DIR}/${relative}`),
      content,
    );
  }
  for (const [relative, content] of Object.entries(options.homeFiles)) {
    putFile(files, `${home}/.guida/${relative}`, content);
  }
  return {
    files,
    config: memoryGuidaConfig(files, {
      cwd,
      homedir: home,
      env: {},
      XMLHttpRequest: createPackageRegistryXhr(files, home),
    }),
  };
}

export async function diagnoseGuidaMemory(
  options: DiagnoseMemoryOptions,
): Promise<ReadonlyArray<GuidaProblem>> {
  const { config } = seedGuidaMemory(options);
  const path = options.path ?? "src/Main.elm";
  try {
    return flattenGuidaDiagnostics(await options.diagnostics(config, { path }));
  } catch (error) {
    return [problemFromError(error)];
  }
}

export async function formatGuidaMemory(
  options: FormatMemoryOptions,
): Promise<string> {
  const { config } = seedGuidaMemory(options);
  const raw = await options.format(config, options.content);
  const record =
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : undefined;
  const type = typeof record?.type === "string" ? record.type : "";
  if (type === "already-formatted" || type === "already formatted") {
    return options.content;
  }
  return extractFormatted(raw);
}

export async function compileGuidaMemory(
  options: CompileMemoryOptions,
): Promise<GuidaBuildResult> {
  const { files, config } = seedGuidaMemory(options);
  const entry = options.entry ?? "src/Main.elm";
  const result = await options.make(config, entry, {
    optimize: options.optimize !== false,
  });
  let compiled: string;
  try {
    compiled = extractOutput(result);
  } catch (error) {
    const fromHtml = compiledFromHtml(files, WORKSPACE_CWD);
    if (fromHtml === undefined) throw error;
    compiled = fromHtml;
  }
  const wrapped = wrapGuidaScope(compiled);
  const bundle = options.assemble
    ? await options.assemble(compiled)
    : `${wrapped}\n${GUIDA_SHIM_SOURCE}`;
  return {
    bundle,
    rawBytes: byteLengthOf(compiled),
    wrappedBytes: byteLengthOf(wrapped),
    minifiedBytes: byteLengthOf(bundle),
    compilerVersion: GUIDA_COMPILER_VERSION,
  };
}
