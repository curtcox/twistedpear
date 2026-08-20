import {
  compileGuidaMemory,
  type GuidaBuildResult,
  type WorkspaceFile,
} from "./compile-memory.js";
import { JsModuleGuidaCompiler, loadGuidaLibrary } from "./compiler.js";
import { memoryGuidaConfig } from "./memory-config.js";
import { minifyGuida } from "./minify.js";
import { GUIDA_HOME_FILES, VENDOR_FILES } from "./seed-files.generated.js";
import { GUIDA_SHIM_SOURCE } from "./shim.js";
import { wrapGuidaScope } from "./wrap-scope.js";
import { FetchXmlHttpRequest } from "./xhr.js";

export type { WorkspaceFile, GuidaBuildResult };

/**
 * Compile a Guida project from a file map (workspace snapshot) in memory.
 * Used by host chrome so the compiler never runs inside a mini-app sandbox.
 */
export async function compileGuidaWorkspace(
  files: ReadonlyArray<WorkspaceFile>,
): Promise<GuidaBuildResult> {
  const guida = loadGuidaLibrary();
  return compileGuidaMemory({
    make: (config, path, options) => guida.make(config, path, options),
    files,
    vendorFiles: VENDOR_FILES,
    homeFiles: GUIDA_HOME_FILES,
    assemble: async (compiled) => {
      const wrapped = wrapGuidaScope(compiled);
      const minified = await minifyGuida(wrapped);
      return `${minified}\n${GUIDA_SHIM_SOURCE}`;
    },
  });
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
