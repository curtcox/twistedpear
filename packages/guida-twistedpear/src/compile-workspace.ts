import {
  compileWorkspaceWith,
  diagnoseWorkspaceWith,
  formatSourceWith,
  type GuidaBuildResult,
  type GuidaProblem,
  type WorkspaceFile,
} from "./workspace-ops.js";
import { JsModuleGuidaCompiler, loadGuidaLibrary } from "./compiler.js";
import { memoryGuidaConfig } from "./memory-config.js";
import { minifyGuida } from "./minify.js";
import { GUIDA_SHIM_SOURCE } from "./shim.js";
import { wrapGuidaScope } from "./wrap-scope.js";
import { FetchXmlHttpRequest } from "./xhr.js";

export type { WorkspaceFile, GuidaBuildResult, GuidaProblem };

/**
 * Compile a Guida project from a file map (workspace snapshot) in memory.
 * Used by host chrome so the compiler never runs inside a mini-app sandbox.
 */
export async function compileGuidaWorkspace(
  files: ReadonlyArray<WorkspaceFile>,
): Promise<GuidaBuildResult> {
  return compileWorkspaceWith(loadGuidaLibrary(), files, async (compiled) => {
    const wrapped = wrapGuidaScope(compiled);
    const minified = await minifyGuida(wrapped);
    return `${minified}\n${GUIDA_SHIM_SOURCE}`;
  });
}

export async function diagnoseGuidaWorkspace(
  files: ReadonlyArray<WorkspaceFile>,
  path?: string,
): Promise<ReadonlyArray<GuidaProblem>> {
  return diagnoseWorkspaceWith(loadGuidaLibrary(), files, path);
}

export async function formatGuidaSource(
  content: string,
  files: ReadonlyArray<WorkspaceFile> = [],
): Promise<string> {
  return formatSourceWith(loadGuidaLibrary(), content, files);
}

/** In-memory compiler config for diagnostics/format without touching disk. */
export function compilerForMemoryWorkspace(
  files: Map<string, Uint8Array>,
  cwd = "/app",
): JsModuleGuidaCompiler {
  return new JsModuleGuidaCompiler(
    memoryGuidaConfig(files, {
      cwd,
      homedir: "/home",
      XMLHttpRequest: FetchXmlHttpRequest,
    }),
  );
}
