import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ensureDir } from "./config.js";

export interface SeederDriveVersion {
  readonly packageHash: string;
  readonly archiveFile: string;
  readonly size: number;
  readonly storedAt?: number;
}

export interface SeederDriveState {
  readonly driveKey: string;
  readonly versions: Record<string, SeederDriveVersion>;
}

export interface SeederState {
  readonly drives: ReadonlyArray<SeederDriveState>;
  readonly pinnedVersions?: ReadonlyArray<string>;
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
    pinnedVersions?: ReadonlyArray<string>;
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
            archiveFile: info.archiveFile ?? info.archivePath ?? seederArchiveFile(drive.driveKey, version),
            ...(info.storedAt === undefined ? {} : { storedAt: info.storedAt })
          }
        ])
      )
    })),
    pinnedVersions: raw.pinnedVersions ?? []
  };
}

export function totalSeederBytes(state: SeederState): number {
  let total = 0;
  for (const drive of state.drives) {
    for (const info of Object.values(drive.versions)) {
      total += info.size;
    }
  }

  return total;
}

export function pinSeederVersion(stateDir: string, version: string): void {
  const state = loadSeederState(stateDir);
  const pinned = new Set(state.pinnedVersions ?? []);
  pinned.add(version);
  writeSeederState(stateDir, { ...state, pinnedVersions: [...pinned] });
}

export function evictSeederToQuota(stateDir: string, quotaBytes: number): number {
  let state = loadSeederState(stateDir);
  const pinned = new Set(state.pinnedVersions ?? []);
  let evicted = 0;

  while (totalSeederBytes(state) > quotaBytes) {
    const candidate = findOldestEvictableVersion(state, pinned);
    if (candidate === null) {
      break;
    }

    const absoluteArchive = join(stateDir, candidate.archiveFile);
    if (existsSync(absoluteArchive)) {
      rmSync(absoluteArchive, { force: true });
    }

    state = {
      ...state,
      drives: state.drives
        .map((drive) => {
          if (drive.driveKey !== candidate.driveKey) {
            return drive;
          }

          const versions = { ...drive.versions };
          delete versions[candidate.version];
          return { driveKey: drive.driveKey, versions };
        })
        .filter((drive) => Object.keys(drive.versions).length > 0)
    };
    writeSeederState(stateDir, state);
    evicted += 1;
  }

  return evicted;
}

function findOldestEvictableVersion(
  state: SeederState,
  pinned: ReadonlySet<string>
): { readonly driveKey: string; readonly version: string; readonly archiveFile: string } | null {
  let oldest:
    | { readonly driveKey: string; readonly version: string; readonly archiveFile: string; readonly storedAt: number }
    | null = null;

  for (const drive of state.drives) {
    for (const [version, info] of Object.entries(drive.versions)) {
      if (pinned.has(version)) {
        continue;
      }

      const storedAt = info.storedAt ?? 0;
      if (oldest === null || storedAt < oldest.storedAt) {
        oldest = {
          driveKey: drive.driveKey,
          version,
          archiveFile: info.archiveFile,
          storedAt
        };
      }
    }
  }

  return oldest === null ? null : oldest;
}

function writeSeederState(stateDir: string, state: SeederState): void {
  const statePath = join(stateDir, "state.json");
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
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

  const state = loadSeederState(stateDir);
  const storedAt = Date.now();

  const existing = state.drives.find((drive) => drive.driveKey === driveKey);
  const drives =
    existing === undefined
      ? [
          ...state.drives,
          {
            driveKey,
            versions: {
              [version]: { packageHash, archiveFile, size: archiveBytes.length, storedAt }
            }
          }
        ]
      : state.drives.map((drive) =>
          drive.driveKey === driveKey
            ? {
                driveKey,
                versions: {
                  ...drive.versions,
                  [version]: { packageHash, archiveFile, size: archiveBytes.length, storedAt }
                }
              }
            : drive
        );

  writeSeederState(stateDir, { ...state, drives });
}

export function registerDriveWithSeederQuota(
  stateDir: string,
  driveKey: string,
  version: string,
  packageHash: string,
  archiveBytes: Uint8Array,
  quotaBytes: number
): number {
  registerDriveWithSeeder(stateDir, driveKey, version, packageHash, archiveBytes);
  return evictSeederToQuota(stateDir, quotaBytes);
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
