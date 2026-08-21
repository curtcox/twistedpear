/**
 * Bare/worklet entry for on-device Guida compile. No node:fs, no terser.
 * Packed into shipping desktop and mobile worklets as a host asset.
 */
import * as guidaNs from "./guida-lib.generated.js";
import {
  compileGuidaMemory,
  diagnoseGuidaMemory,
  formatGuidaMemory,
  type GuidaBuildResult,
  type GuidaProblem,
  type WorkspaceFile,
} from "./compile-memory.js";
import { GUIDA_HOME_FILES, VENDOR_FILES } from "./seed-files.generated.js";

type GuidaLib = {
  make: (
    config: unknown,
    path: string,
    options?: { debug?: boolean; optimize?: boolean; sourcemaps?: boolean },
  ) => Promise<unknown>;
  format: (config: unknown, content: string) => Promise<unknown>;
  diagnostics: (config: unknown, args: unknown) => Promise<unknown>;
};

function loadGuida(): GuidaLib {
  const namespace = guidaNs as unknown as { default?: GuidaLib } & GuidaLib;
  const loaded = namespace.default ?? namespace;
  if (typeof loaded.make !== "function") {
    throw new Error("bundled Guida library is missing make()");
  }
  return loaded;
}

function seedArgs(files: ReadonlyArray<WorkspaceFile>) {
  return {
    files,
    vendorFiles: VENDOR_FILES,
    homeFiles: GUIDA_HOME_FILES,
  };
}

export async function compileGuidaWorkspace(
  files: ReadonlyArray<WorkspaceFile>,
): Promise<GuidaBuildResult> {
  const guida = loadGuida();
  return compileGuidaMemory({
    make: (config, path, options) => guida.make(config, path, options),
    ...seedArgs(files),
  });
}

export async function diagnoseGuidaWorkspace(
  files: ReadonlyArray<WorkspaceFile>,
  path?: string,
): Promise<ReadonlyArray<GuidaProblem>> {
  const guida = loadGuida();
  if (typeof guida.diagnostics !== "function") {
    throw new Error("bundled Guida library is missing diagnostics()");
  }
  return diagnoseGuidaMemory({
    diagnostics: (config, args) => guida.diagnostics(config, args),
    ...seedArgs(files),
    ...(path === undefined ? {} : { path }),
  });
}

export async function formatGuidaSource(
  content: string,
  files: ReadonlyArray<WorkspaceFile> = [],
): Promise<string> {
  const guida = loadGuida();
  if (typeof guida.format !== "function") {
    throw new Error("bundled Guida library is missing format()");
  }
  return formatGuidaMemory({
    format: (config, source) => guida.format(config, source),
    content,
    ...seedArgs(files),
  });
}

export type { GuidaBuildResult, GuidaProblem, WorkspaceFile };
