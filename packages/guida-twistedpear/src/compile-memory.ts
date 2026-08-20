import { extractOutput, isolateCompiledJs } from "./extract-output.js";
import {
  byteLengthOf,
  bytesOf,
  utf8,
  type GuidaFsConfig,
} from "./fs-config.js";
import { memoryGuidaConfig } from "./memory-config.js";
import { createPackageRegistryXhr } from "./seed-xhr.js";
import { GUIDA_SHIM_SOURCE } from "./shim.js";
import {
  GUIDA_COMPILER_VERSION,
  GUIDA_VENDOR_DIR,
  WORKSPACE_CWD,
  WORKSPACE_HOME,
} from "./version.js";
import { wrapGuidaScope } from "./wrap-scope.js";

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

export interface CompileMemoryOptions {
  readonly make: (
    config: GuidaFsConfig,
    entryPath: string,
    options?: { debug?: boolean; optimize?: boolean; sourcemaps?: boolean },
  ) => Promise<unknown>;
  readonly files: ReadonlyArray<WorkspaceFile>;
  readonly vendorFiles: Readonly<Record<string, string>>;
  readonly homeFiles: Readonly<Record<string, string>>;
  readonly entry?: string;
  readonly optimize?: boolean;
  readonly assemble?: (compiled: string) => Promise<string>;
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

export async function compileGuidaMemory(
  options: CompileMemoryOptions,
): Promise<GuidaBuildResult> {
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

  const config = memoryGuidaConfig(files, {
    cwd,
    homedir: home,
    env: {},
    XMLHttpRequest: createPackageRegistryXhr(files, home),
  });
  const entry = options.entry ?? "src/Main.elm";
  const result = await options.make(config, entry, {
    optimize: options.optimize !== false,
  });
  let compiled: string;
  try {
    compiled = extractOutput(result);
  } catch (error) {
    const fromHtml = compiledFromHtml(files, cwd);
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
