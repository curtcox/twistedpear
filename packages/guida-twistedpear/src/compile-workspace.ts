import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { dirname, join } from "node:path";
import { buildGuidaApp, type GuidaBuildResult } from "./build.js";
import { JsModuleGuidaCompiler } from "./compiler.js";
import { memoryGuidaConfig } from "./memory-config.js";

export interface WorkspaceFile {
  readonly path: string;
  readonly content: string | Uint8Array;
}

/**
 * Compile a Guida project from a file map (workspace snapshot) via a temp dir.
 * Used by host chrome so the compiler never runs inside a mini-app sandbox.
 */
export async function compileGuidaWorkspace(
  files: ReadonlyArray<WorkspaceFile>,
): Promise<GuidaBuildResult> {
  const root = mkdtempSync(join(tmpdir(), "tp-guida-ws-"));
  try {
    for (const file of files) {
      const dest = join(root, file.path);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, file.content);
    }
    return await buildGuidaApp({ appDir: root });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** In-memory compiler config for diagnostics/format without touching disk. */
export function compilerForMemoryWorkspace(
  files: Map<string, Buffer>,
  cwd = "/app",
): JsModuleGuidaCompiler {
  return new JsModuleGuidaCompiler(
    memoryGuidaConfig(files, { cwd, homedir: homedir() }),
  );
}
