import {
  compileGuidaMemory,
  diagnoseGuidaMemory,
  formatGuidaMemory,
  type GuidaBuildResult,
  type GuidaProblem,
  type WorkspaceFile,
} from "./compile-memory.js";
import type { GuidaFsConfig } from "./fs-config.js";
import { GUIDA_HOME_FILES, VENDOR_FILES } from "./seed-files.generated.js";

export type { GuidaBuildResult, GuidaProblem, WorkspaceFile };

export type GuidaLib = {
  make: (
    config: GuidaFsConfig,
    path: string,
    options?: { debug?: boolean; optimize?: boolean; sourcemaps?: boolean },
  ) => Promise<unknown>;
  format: (config: GuidaFsConfig, content: string) => Promise<unknown>;
  diagnostics: (config: GuidaFsConfig, args: unknown) => Promise<unknown>;
};

function seedArgs(files: ReadonlyArray<WorkspaceFile>) {
  return {
    files,
    vendorFiles: VENDOR_FILES,
    homeFiles: GUIDA_HOME_FILES,
  };
}

export async function compileWorkspaceWith(
  guida: Pick<GuidaLib, "make">,
  files: ReadonlyArray<WorkspaceFile>,
  assemble?: (compiled: string) => Promise<string> | string,
): Promise<GuidaBuildResult> {
  return compileGuidaMemory({
    make: (config, path, options) => guida.make(config, path, options),
    ...seedArgs(files),
    ...(assemble === undefined
      ? {}
      : {
          assemble: async (compiled: string) => await assemble(compiled),
        }),
  });
}

export async function diagnoseWorkspaceWith(
  guida: Pick<GuidaLib, "diagnostics">,
  files: ReadonlyArray<WorkspaceFile>,
  path?: string,
): Promise<ReadonlyArray<GuidaProblem>> {
  if (typeof guida.diagnostics !== "function") {
    throw new Error("bundled Guida library is missing diagnostics()");
  }
  return diagnoseGuidaMemory({
    diagnostics: (config, args) => guida.diagnostics(config, args),
    ...seedArgs(files),
    ...(path === undefined ? {} : { path }),
  });
}

export async function formatSourceWith(
  guida: Pick<GuidaLib, "format">,
  content: string,
  files: ReadonlyArray<WorkspaceFile> = [],
): Promise<string> {
  if (typeof guida.format !== "function") {
    throw new Error("bundled Guida library is missing format()");
  }
  return formatGuidaMemory({
    format: (config, source) => guida.format(config, source),
    content,
    ...seedArgs(files),
  });
}
