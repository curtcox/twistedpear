/**
 * Bare/worklet entry for on-device Guida compile. No node:fs, no terser.
 * Packed into shipping desktop and mobile worklets as a host asset.
 */
import * as guidaNs from "./guida-lib.generated.js";
import type {
  GuidaBuildResult,
  GuidaProblem,
  WorkspaceFile,
} from "./compile-memory.js";
import {
  compileWorkspaceWith,
  diagnoseWorkspaceWith,
  formatSourceWith,
  type GuidaLib,
} from "./workspace-ops.js";

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
  return compileWorkspaceWith(loadGuida(), files);
}

export async function diagnoseGuidaWorkspace(
  files: ReadonlyArray<WorkspaceFile>,
  path?: string,
): Promise<ReadonlyArray<GuidaProblem>> {
  return diagnoseWorkspaceWith(loadGuida(), files, path);
}

export async function formatGuidaSource(
  content: string,
  files: ReadonlyArray<WorkspaceFile> = [],
): Promise<string> {
  return formatSourceWith(loadGuida(), content, files);
}
