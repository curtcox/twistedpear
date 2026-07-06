import { existsSync, readFileSync, unwatchFile, watchFile, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  Reticulum,
  nodeRuntime
} from "@twistedpear/reticulum-ts";
import { DriveManager, attachPackageResourceServer, createSwarm } from "@twistedpear/bridge-hyper";
import { ensureDir, loadConfig } from "../config.js";
import {
  listSeederArchives,
  loadSeederState,
  readSeederArchive,
  type SeederState
} from "./register.js";
import { attachSeederDrives } from "./sync.js";

export interface SeederOptions {
  readonly cwd: string;
  readonly stateDir: string;
  readonly transport: boolean;
}

export interface SeederSession {
  readonly stop: () => Promise<void>;
}

export async function startSeeder(options: SeederOptions): Promise<SeederSession> {
  ensureDir(options.stateDir);
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();
  const config = loadConfig(options.cwd);
  const reticulum = Reticulum.create({
    provider,
    runtime,
    ...(options.transport ? { transportOptions: { transportEnabled: true } } : {})
  });
  reticulum.start();

  let state = loadSeederState(options.stateDir);
  const swarm = createSwarm({ bootstrap: config.bootstrap });
  const driveManager = new DriveManager({ storagePath: join(options.stateDir, "drives"), swarm });
  await driveManager.ready();

  const identityPath = join(options.cwd, ".tp", "identity");
  const identity = existsSync(identityPath)
    ? Identity.fromBytes(provider, new Uint8Array(readFileSync(identityPath)))
    : new Identity(provider);

  if (identity === null) {
    throw new Error("Seeder requires a valid identity at .tp/identity");
  }

  const destination = reticulum.registerDestination({
    provider,
    identity,
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
    for (const drive of next.drives) {
      if (state.drives.some((existing) => existing.driveKey === drive.driveKey)) {
        continue;
      }

      await driveManager.openDrive(drive.driveKey, { serve: true });
      console.log(
        `seeder: attached drive ${drive.driveKey} (${Object.keys(drive.versions).length} version(s))`
      );
    }

    state = next;
  };

  await attachSeederDrives(driveManager, state);

  const statePath = join(options.stateDir, "state.json");
  watchFile(statePath, { interval: 500 }, () => {
    void syncDrives(loadSeederState(options.stateDir)).catch((error) => {
      console.error("seeder: state reload failed:", error instanceof Error ? error.message : error);
    });
  });

  const persist = () => {
    writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  };

  return {
    async stop() {
      unwatchFile(statePath);
      persist();
      await driveManager.close();
      await swarm.destroy();
      await reticulum.stop();
      if (typeof swarm.swarm.removeAllListeners === "function") {
        swarm.swarm.removeAllListeners();
      }
    }
  };
}

export async function runSeeder(options: SeederOptions): Promise<void> {
  const session = await startSeeder(options);

  process.on("SIGINT", () => {
    void session.stop().then(() => process.exit(0));
  });

  console.log("tp seed: running (stdout logs, state dir:", options.stateDir, ")");
  await new Promise(() => {
    // Run until interrupted.
  });
}
