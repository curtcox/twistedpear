import DHT from "@hyperswarm/dht-relay";
import WsStream from "@hyperswarm/dht-relay/ws";
import Corestore from "corestore";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import WebSocket from "ws";
import { fetchDriveVersionViaRelayedDht, type RelayedDht } from "./relay-hyper-fetch.js";

export interface NodeRelayHyperFetchOptions {
  readonly relayUrl: string;
  readonly driveKeyHex: string;
  readonly version: string;
  readonly timeoutMs?: number;
}

function openRelaySocket(relayUrl: string, timeoutMs: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(relayUrl);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("DHT relay websocket connect timeout"));
    }, timeoutMs);

    socket.once("open", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once("error", () => {
      clearTimeout(timer);
      reject(new Error("DHT relay websocket failed"));
    });
  });
}

export async function fetchDriveVersionViaNodeRelay(options: NodeRelayHyperFetchOptions): Promise<Uint8Array> {
  const storagePath = mkdtempSync(join(tmpdir(), "tp-relay-fetch-"));
  try {
    return await fetchDriveVersionViaRelayedDht({
      driveKeyHex: options.driveKeyHex,
      version: options.version,
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
      async createStore() {
        const store = new Corestore(storagePath);
        await store.ready();
        return store;
      },
      async createDht() {
      const socket = await openRelaySocket(options.relayUrl, Math.min(options.timeoutMs ?? 15_000, 15_000));
      const dht = new DHT(new WsStream(true, socket));
      const destroy = dht.destroy.bind(dht);
      dht.destroy = async () => {
        await destroy();
        socket.close();
      };
      return dht as RelayedDht;
      }
    });
  } finally {
    rmSync(storagePath, { recursive: true, force: true });
  }
}
