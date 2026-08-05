import b4a from "b4a";
import Hyperdrive from "hyperdrive";
import Hyperswarm from "hyperswarm";
import { driveTopic } from "./swarm.js";

const PACKAGE_PATH_PREFIX = "/packages/";

export interface RelayedDht {
  destroy(): Promise<void>;
}

export interface RelayStore {
  ready(): Promise<void>;
  replicate(isInitiator: boolean): { pipe<T>(destination: T): T };
  close(): Promise<void>;
}

export interface RelayHyperFetchOptions {
  readonly driveKeyHex: string;
  readonly version: string;
  readonly timeoutMs?: number;
  readonly createDht: () => Promise<RelayedDht>;
  readonly createStore: () => Promise<RelayStore>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchDriveVersionViaRelayedDht(options: RelayHyperFetchOptions): Promise<Uint8Array> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const dht = await options.createDht();

  const swarm = new Hyperswarm({ dht: dht as never });
  const store = await options.createStore();

  const drive = new Hyperdrive(store, b4a.from(options.driveKeyHex, "hex"));
  await drive.ready();

  swarm.on("connection", (peerSocket, peerInfo) => {
    const stream = store.replicate(peerInfo.client);
    peerSocket.pipe(stream).pipe(peerSocket);
  });

  const discovery = swarm.join(driveTopic(drive.key), { server: false, client: true });
  await discovery.flushed();
  await swarm.flush();

  const archivePath = `${PACKAGE_PATH_PREFIX}${options.version}.tpkg`;
  const deadline = Date.now() + timeoutMs;

  try {
    while (Date.now() < deadline) {
      await drive.update();
      const entry = await drive.entry(archivePath);
      if (entry !== null) {
        const archive = await drive.get(archivePath);
        if (archive !== null) {
          return archive;
        }
      }

      await sleep(250);
    }

    throw new Error(`hyperdrive fetch timed out for ${options.version}`);
  } finally {
    await Promise.allSettled([swarm.destroy(), drive.close(), store.close(), dht.destroy()]);
  }
}
