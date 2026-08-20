/**
 * Bare/worklet entry for on-device Guida compile. No node:fs, no terser.
 * Packed into shipping desktop and mobile worklets as a host asset.
 */
import * as guidaNs from "./guida-lib.generated.js";
import {
  compileGuidaMemory,
  type GuidaBuildResult,
  type WorkspaceFile,
} from "./compile-memory.js";
import { GUIDA_HOME_FILES, VENDOR_FILES } from "./seed-files.generated.js";

type GuidaLib = {
  make: (
    config: unknown,
    path: string,
    options?: { debug?: boolean; optimize?: boolean; sourcemaps?: boolean },
  ) => Promise<unknown>;
};

function loadGuida(): GuidaLib {
  const namespace = guidaNs as unknown as { default?: GuidaLib } & GuidaLib;
  const loaded = namespace.default ?? namespace;
  if (typeof loaded.make !== "function") {
    throw new Error("bundled Guida library is missing make()");
  }
  return loaded;
}

export async function compileGuidaWorkspace(
  files: ReadonlyArray<WorkspaceFile>,
): Promise<GuidaBuildResult> {
  const guida = loadGuida();
  return compileGuidaMemory({
    make: (config, path, options) => guida.make(config, path, options),
    files,
    vendorFiles: VENDOR_FILES,
    homeFiles: GUIDA_HOME_FILES,
  });
}

export type { GuidaBuildResult, WorkspaceFile };
