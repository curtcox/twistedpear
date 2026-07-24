import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { createGatewayBulkFetchHttpHandler } from "../src/server/gateway-bulk-fetch-server.js";
import { bulkFetchUrlFromGateway } from "../src/client/web-gateway-hyper-fetch.js";

describe("gateway bulk fetch", () => {
  it("builds same-origin bulk fetch URLs from gateway websocket URLs", () => {
    expect(bulkFetchUrlFromGateway("ws://127.0.0.1:9480", "abc".repeat(16), "0.1.0")).toBe(
      "http://127.0.0.1:9480/bulk-fetch?driveKey=" +
        encodeURIComponent("abc".repeat(16)) +
        "&version=" +
        encodeURIComponent("0.1.0")
    );
  });

  it("serves archives from the gateway bulk fetch route", async () => {
    const archive = new Uint8Array(32_770).map((_, index) => index % 251);
    const limitedChunks: number[] = [];
    const handler = createGatewayBulkFetchHttpHandler(
      async (driveKeyHex, version) => {
        expect(driveKeyHex).toBe("feed".repeat(16));
        expect(version).toBe("0.2.0");
        return archive;
      },
      {
        outboundBandwidthLimiter: {
          async consume(bytes) {
            limitedChunks.push(bytes);
          }
        }
      }
    );

    const server = createServer((request, response) => {
      void handler(request, response);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("expected listening server");
    }

    const url = `http://127.0.0.1:${address.port}/bulk-fetch?driveKey=${"feed".repeat(16)}&version=0.2.0`;
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(archive);
    expect(limitedChunks).toEqual([16_384, 16_384, 2]);

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
});
