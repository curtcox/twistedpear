import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ensureDir } from "../config.js";

export interface SeederDriveVersion {
  readonly packageHash: string;
  readonly archiveFile: string;
  readonly size: number;
}

export interface SeederDriveState {
  readonly driveKey: string;
  readonly versions: Record<string, SeederDriveVersion>;
}

export interface SeederState {
  readonly drives: ReadonlyArray<SeederDriveState>;
}

export interface SeederArchiveVersion {
  readonly driveKey: string;
  readonly version: string;
  readonly packageHash: string;
  readonly size: number;
}

export function isSeederStateDir(address: string | null): address is string {
  if (address === null || address.length === 0) {
    return false;
  }

  return address.startsWith(".") || address.startsWith("/") || address.includes("/");
}

export function seederArchiveFile(driveKey: string, version: string): string {
  return join("archives", driveKey, `${version}.tpkg`);
}

export function loadSeederState(stateDir: string): SeederState {
  const statePath = join(stateDir, "state.json");
  if (!existsSync(statePath)) {
    return { drives: [] };
  }

  const raw = JSON.parse(readFileSync(statePath, "utf8")) as {
    drives: ReadonlyArray<{
      driveKey: string;
      versions: Record<string, SeederDriveVersion & { archivePath?: string }>;
    }>;
  };

  return {
    drives: raw.drives.map((drive) => ({
      driveKey: drive.driveKey,
      versions: Object.fromEntries(
        Object.entries(drive.versions).map(([version, info]) => [
          version,
          {
            packageHash: info.packageHash,
            size: info.size,
            archiveFile: info.archiveFile ?? info.archivePath ?? seederArchiveFile(drive.driveKey, version)
          }
        ])
      )
    }))
  };
}

export function registerDriveWithSeeder(
  stateDir: string,
  driveKey: string,
  version: string,
  packageHash: string,
  archiveBytes: Uint8Array
): void {
  ensureDir(stateDir);
  const archiveFile = seederArchiveFile(driveKey, version);
  const absoluteArchive = join(stateDir, archiveFile);
  ensureDir(dirname(absoluteArchive));
  writeFileSync(absoluteArchive, archiveBytes);

  const statePath = join(stateDir, "state.json");
  const state = loadSeederState(stateDir);

  const existing = state.drives.find((drive) => drive.driveKey === driveKey);
  const drives = existing === undefined
    ? [
        ...state.drives,
        {
          driveKey,
          versions: {
            [version]: { packageHash, archiveFile, size: archiveBytes.length }
          }
        }
      ]
    : state.drives.map((drive) =>
        drive.driveKey === driveKey
          ? {
              driveKey,
              versions: {
                ...drive.versions,
                [version]: { packageHash, archiveFile, size: archiveBytes.length }
              }
            }
          : drive
      );

  writeFileSync(statePath, `${JSON.stringify({ drives }, null, 2)}\n`);
}

export function listSeederArchives(state: SeederState): ReadonlyArray<SeederArchiveVersion> {
  const versions: SeederArchiveVersion[] = [];

  for (const drive of state.drives) {
    for (const [version, info] of Object.entries(drive.versions)) {
      versions.push({
        driveKey: drive.driveKey,
        version,
        packageHash: info.packageHash,
        size: info.size
      });
    }
  }

  return versions.sort((left, right) => left.version.localeCompare(right.version));
}

export function readSeederArchive(stateDir: string, state: SeederState, version: string): Uint8Array {
  for (const drive of state.drives) {
    const info = drive.versions[version];
    if (info === undefined) {
      continue;
    }

    const absolute = join(stateDir, info.archiveFile);
    if (!existsSync(absolute)) {
      throw new Error(`Missing seeder archive at ${info.archiveFile}`);
    }

    return new Uint8Array(readFileSync(absolute));
  }

  throw new Error(`Version not found: ${version}`);
}
