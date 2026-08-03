// @ts-nocheck
import DHT from "@hyperswarm/dht-relay";
import WsStream from "@hyperswarm/dht-relay/ws";
import Corestore from "corestore";
import RAM from "random-access-memory";
import {
  bulkFetchUrlFromGateway,
  fetchDriveVersionViaGateway,
  gatewayHttpUrlFromWebSocket,
  type WebCompositeHyperFetchOptions,
  type WebGatewayHyperFetchOptions
} from "./web-gateway-hyper-fetch.js";
import { fetchDriveVersionViaRelayedDht } from "../core/relay-hyper-fetch.js";

export type { WebCompositeHyperFetchOptions, WebGatewayHyperFetchOptions };
export { bulkFetchUrlFromGateway, fetchDriveVersionViaGateway, gatewayHttpUrlFromWebSocket };

export interface WebHyperFetchOptions {
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
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    async createStore() {
      const store = new Corestore(RAM);
      await store.ready();
      return store;
    },
    async createDht() {
      const socket = await openRelaySocket(options.relayUrl, Math.min(options.timeoutMs ?? 15_000, 15_000));
      const dht = new DHT(new WsStream(true, socket));
      await dht.ready();
      const destroy = dht.destroy.bind(dht);
      dht.destroy = async () => {
        await destroy();
        socket.close();
      };
      return dht as import("../core/relay-hyper-fetch.js").RelayedDht;
    }
  });
}

export async function fetchDriveVersionForWeb(options: WebCompositeHyperFetchOptions): Promise<Uint8Array> {
  try {
    return await fetchDriveVersionViaGateway(options);
  } catch {
    return fetchDriveVersionViaRelay({
      relayUrl: dhtRelayUrlFromGateway(options.gatewayUrl, options.dhtRelayPath),
      driveKeyHex: options.driveKeyHex,
      version: options.version,
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs })
    });
  }
}

export function dhtRelayUrlFromGateway(gatewayUrl: string, path = "/dht-relay"): string {
  const url = new URL(gatewayUrl);
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString();
}
