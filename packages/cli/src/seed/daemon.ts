import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
import { ensureDir } from "../config.js";

export interface SeederOptions {
  readonly cwd: string;
  readonly stateDir: string;
  readonly transport: boolean;
}

interface SeederState {
  readonly drives: ReadonlyArray<{ driveKey: string; versions: Record<string, { packageHash: string; archivePath: string }> }>;
}

export async function runSeeder(options: SeederOptions): Promise<void> {
  ensureDir(options.stateDir);
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();
  const reticulum = Reticulum.create({
    provider,
    runtime,
    ...(options.transport ? { transportOptions: { transportEnabled: true } } : {})
  });
  reticulum.start();

  const statePath = join(options.stateDir, "state.json");
  const state: SeederState = existsSync(statePath)
    ? (JSON.parse(readFileSync(statePath, "utf8")) as SeederState)
    : { drives: [] };

  const swarm = createSwarm();
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
    appName: "tp.seeder",
    aspects: ["resource"]
  });

  attachPackageResourceServer(destination, {
    async listVersions() {
      const versions = await driveManager.listVersions();
      return versions.map((version) => ({ version, packageHash: "", size: 0 }));
    },
    async fetchArchive(version) {
      return driveManager.fetchVersion(version);
    }
  });

  for (const drive of state.drives) {
    await driveManager.openDrive(drive.driveKey);
    console.log(`seeder: mirroring drive ${drive.driveKey}`);
  }

  const persist = () => {
    writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  };

  process.on("SIGINT", async () => {
    persist();
    await driveManager.close();
    await swarm.destroy();
    await reticulum.stop();
    process.exit(0);
  });

  console.log("tp seed: running (stdout logs, state dir:", options.stateDir, ")");
  await new Promise(() => {
    // Run until interrupted.
  });
}
