// @ts-nocheck
import type { IncomingMessage, Server as HttpServer, ServerResponse } from "node:http";
import type { ByteRateLimiter } from "@twistedpear/reticulum-ts";

import type { DriveFetcher } from "../core/fetch.js";

export const DEFAULT_BULK_FETCH_PATH = "/bulk-fetch";

/** @deprecated Prefer DriveFetcher; kept as the HTTP handler callback shape. */
export type GatewayBulkFetcher = (driveKeyHex: string, version: string) => Promise<Uint8Array>;

export function driveFetcherFromBulk(fetcher: GatewayBulkFetcher): DriveFetcher {
  return {
    fetchDriveVersion(driveKeyHex, version) {
      return fetcher(driveKeyHex, version);
    }
  };
}

export interface GatewayBulkFetchServerOptions {
  readonly path?: string;
  readonly outboundBandwidthLimiter?: ByteRateLimiter;
}

export interface GatewayBulkFetchServerSession {
  readonly path: string;
  close(): Promise<void>;
}

export function createGatewayBulkFetchHttpHandler(
  fetcher: GatewayBulkFetcher,
  options: GatewayBulkFetchServerOptions = {}
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  const path = options.path ?? DEFAULT_BULK_FETCH_PATH;

  return async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    if (requestUrl.pathname !== path) {
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end();
      return;
    }

    const driveKeyHex = requestUrl.searchParams.get("driveKey")?.trim() ?? "";
    const version = requestUrl.searchParams.get("version")?.trim() ?? "";
    if (driveKeyHex.length === 0 || version.length === 0) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("driveKey and version query parameters are required");
      return;
    }

    try {
      const archive = await fetcher(driveKeyHex, version);
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": String(archive.length),
        "access-control-allow-origin": "*"
      });
      if (request.method === "HEAD") {
        response.end();
        return;
      }

      const limiter = options.outboundBandwidthLimiter;
      if (limiter === undefined) {
        response.end(archive);
        return;
      }
      const chunkBytes = 16 * 1024;
      for (let offset = 0; offset < archive.length; offset += chunkBytes) {
        const chunk = archive.subarray(offset, Math.min(offset + chunkBytes, archive.length));
        await limiter.consume(chunk.length);
        response.write(chunk);
      }
      response.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      response.end(message);
    }
  };
}

export function attachGatewayBulkFetchServer(
  httpServer: HttpServer,
  fetcher: GatewayBulkFetcher,
  options: GatewayBulkFetchServerOptions = {}
): GatewayBulkFetchServerSession {
  const path = options.path ?? DEFAULT_BULK_FETCH_PATH;
  const handler = createGatewayBulkFetchHttpHandler(fetcher, options);
  const onRequest = (request: IncomingMessage, response: ServerResponse) => {
    void handler(request, response);
  };

  httpServer.on("request", onRequest);

  return {
    path,
    close() {
      httpServer.off("request", onRequest);
      return Promise.resolve();
    }
  };
}
