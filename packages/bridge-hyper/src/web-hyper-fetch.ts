import DHT from "@hyperswarm/dht-relay";
import WsStream from "@hyperswarm/dht-relay/ws";
import { fetchDriveVersionViaRelayedDht } from "./relay-hyper-fetch.js";

export interface WebHyperFetchOptions {
  readonly relayUrl: string;
  readonly driveKeyHex: string;
  readonly version: string;
  readonly storagePath: string;
  readonly timeoutMs?: number;
}

function openRelaySocket(relayUrl: string, timeoutMs: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(relayUrl);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("DHT relay websocket connect timeout"));
    }, timeoutMs);

    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("DHT relay websocket failed"));
    });
  });
}

export async function fetchDriveVersionViaRelay(options: WebHyperFetchOptions): Promise<Uint8Array> {
  return fetchDriveVersionViaRelayedDht({
    driveKeyHex: options.driveKeyHex,
    version: options.version,
    storagePath: options.storagePath,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    async createDht() {
      const socket = await openRelaySocket(options.relayUrl, Math.min(options.timeoutMs ?? 15_000, 15_000));
      const dht = new DHT(new WsStream(true, socket));
      const destroy = dht.destroy.bind(dht);
      dht.destroy = async () => {
        await destroy();
        socket.close();
      };
      return dht as import("./relay-hyper-fetch.js").RelayedDht;
    }
  });
}

export function dhtRelayUrlFromGateway(gatewayUrl: string, path = "/dht-relay"): string {
  const url = new URL(gatewayUrl);
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString();
}
