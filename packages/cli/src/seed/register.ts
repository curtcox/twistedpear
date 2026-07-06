import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir } from "../config.js";

export interface SeederDriveVersion {
  readonly packageHash: string;
  readonly archivePath: string;
  readonly size: number;
}

export interface SeederDriveState {
  readonly driveKey: string;
  readonly versions: Record<string, SeederDriveVersion>;
}

export interface SeederState {
  readonly drives: ReadonlyArray<SeederDriveState>;
}

export function isSeederStateDir(address: string | null): address is string {
  if (address === null || address.length === 0) {
    return false;
  }

  return address.startsWith(".") || address.startsWith("/") || address.includes("/");
}

export function loadSeederState(stateDir: string): SeederState {
  const statePath = join(stateDir, "state.json");
  if (!existsSync(statePath)) {
    return { drives: [] };
  }

  return JSON.parse(readFileSync(statePath, "utf8")) as SeederState;
}

export function registerDriveWithSeeder(
  stateDir: string,
  driveKey: string,
  version: string,
  packageHash: string,
  size: number
): void {
  ensureDir(stateDir);
  const statePath = join(stateDir, "state.json");
  const state = loadSeederState(stateDir);
  const archivePath = `/packages/${version}.tpkg`;

  const existing = state.drives.find((drive) => drive.driveKey === driveKey);
  const drives = existing === undefined
    ? [
        ...state.drives,
        {
          driveKey,
          versions: {
            [version]: { packageHash, archivePath, size }
          }
        }
      ]
    : state.drives.map((drive) =>
        drive.driveKey === driveKey
          ? {
              driveKey,
              versions: {
                ...drive.versions,
                [version]: { packageHash, archivePath, size }
              }
            }
          : drive
      );

  writeFileSync(statePath, `${JSON.stringify({ drives }, null, 2)}\n`);
}
