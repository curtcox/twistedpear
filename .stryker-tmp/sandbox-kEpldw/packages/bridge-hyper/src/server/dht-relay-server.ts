// @ts-nocheck
import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import DHT from "hyperdht";
import { relay } from "@hyperswarm/dht-relay";
import WsStream from "@hyperswarm/dht-relay/ws";
import { WebSocketServer } from "ws";

export const DEFAULT_DHT_RELAY_PATH = "/dht-relay";

export interface DhtRelayServerOptions {
  readonly path?: string;
  /** When set, relay through this DHT instance (e.g. shared with a local seeder swarm). */
  readonly dht?: InstanceType<typeof DHT>;
}

export interface DhtRelayServerSession {
  readonly path: string;
  close(): Promise<void>;
}

export function attachDhtRelayServer(
  httpServer: HttpServer,
  options: DhtRelayServerOptions = {}
): DhtRelayServerSession {
  const path = options.path ?? DEFAULT_DHT_RELAY_PATH;
  let dht: InstanceType<typeof DHT> | null = options.dht ?? null;
  const ownsDht = options.dht === undefined;
  const wss = new WebSocketServer({ noServer: true });

  const onUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname !== path) {
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws: import("ws").default) => {
      if (dht === null) {
        dht = new DHT();
      }

      relay(dht, new WsStream(false, ws));
    });
  };

  httpServer.on("upgrade", onUpgrade);

  return {
    path,
    async close() {
      httpServer.off("upgrade", onUpgrade);
      await new Promise<void>((resolve, reject) => {
        wss.close((error?: Error) => {
          if (error === undefined) {
            resolve();
          } else {
            reject(error);
          }
        });
      });
      if (ownsDht && dht !== null) {
        await dht.destroy();
      }
    }
  };
}
