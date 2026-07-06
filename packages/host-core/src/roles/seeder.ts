import { existsSync, readFileSync, unwatchFile, watchFile, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CryptoProvider, Identity, Reticulum } from "@twistedpear/reticulum-ts";
import {
  DestinationDirection,
  DestinationType
} from "@twistedpear/reticulum-ts";
import { DriveManager, attachPackageResourceServer, createSwarm } from "@twistedpear/bridge-hyper";
import {
  listSeederArchives,
  loadSeederState,
  readSeederArchive,
  evictSeederToQuota,
  type SeederState
} from "../seeder-state.js";
import type { HostQuotas } from "../types.js";

export interface SeederRoleOptions {
  readonly provider: CryptoProvider;
  readonly reticulum: Reticulum;
  readonly identity: Identity;
  readonly stateDir: string;
  readonly bootstrap: ReadonlyArray<string>;
  readonly quotas: HostQuotas;
}

export interface SeederRoleSession {
  readonly usedBytes: () => number;
  readonly stop: () => Promise<void>;
}

export async function startSeederRole(options: SeederRoleOptions): Promise<SeederRoleSession> {
  const statePath = join(options.stateDir, "state.json");
  let state = loadSeederState(options.stateDir);
  const swarm = createSwarm({ bootstrap: options.bootstrap });
  const driveManager = new DriveManager({
    storagePath: join(options.stateDir, "drives"),
    swarm
  });
  await driveManager.ready();

  const destination = options.reticulum.registerDestination({
    provider: options.provider,
    identity: options.identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: ["seeder", "resource"]
  });

  const resourceState = () => loadSeederState(options.stateDir);

  attachPackageResourceServer(destination, {
    async listVersions() {
      return listSeederArchives(resourceState()).map((entry) => ({
        version: entry.version,
        packageHash: entry.packageHash,
        size: entry.size
      }));
    },
    async fetchArchive(version) {
      return readSeederArchive(options.stateDir, resourceState(), version);
    }
  });

  const syncDrives = async (next: SeederState) => {
    evictSeederToQuota(options.stateDir, options.quotas.seedStorageBytes);

    for (const drive of next.drives) {
      if (state.drives.some((existing) => existing.driveKey === drive.driveKey)) {
        continue;
      }

      await driveManager.openDrive(drive.driveKey, { serve: true });
    }

    state = next;
  };

  for (const drive of state.drives) {
    await driveManager.openDrive(drive.driveKey, { serve: true });
  }

  if (existsSync(statePath)) {
    watchFile(statePath, { interval: 500 }, () => {
      void syncDrives(loadSeederState(options.stateDir)).catch(() => {
        // State reload failures are surfaced via host logs.
      });
    });
  }

  const usedBytes = () =>
    state.drives.reduce((total, drive) => {
      return (
        total +
        Object.values(drive.versions).reduce((driveTotal, version) => driveTotal + version.size, 0)
      );
    }, 0);

  return {
    usedBytes,
    async stop() {
      unwatchFile(statePath);
      writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
      await driveManager.close();
      await swarm.destroy();
    }
  };
}
