import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dhtRelayUrlFromGateway,
  fetchDriveVersionForWeb,
  fetchDriveVersionViaGateway,
  gatewayHttpUrlFromWebSocket,
} from "../src/client/web-gateway-hyper-fetch.js";

const DRIVE_KEY = "ab".repeat(32);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gateway URL derivation", () => {
  it("maps websocket schemes onto their http equivalents", () => {
    expect(gatewayHttpUrlFromWebSocket("ws://127.0.0.1:9480")).toBe(
      "http://127.0.0.1:9480/",
    );
    expect(gatewayHttpUrlFromWebSocket("wss://gateway.example/relay")).toBe(
      "https://gateway.example/relay",
    );
  });

  it("derives the dht relay URL from the gateway URL", () => {
    expect(dhtRelayUrlFromGateway("ws://127.0.0.1:9480/other?x=1#frag")).toBe(
      "ws://127.0.0.1:9480/dht-relay",
    );
    expect(dhtRelayUrlFromGateway("wss://gateway.example", "/relay")).toBe(
      "wss://gateway.example/relay",
    );
  });
});

describe("fetchDriveVersionViaGateway", () => {
  it("returns the archive bytes on success", async () => {
    const archive = new Uint8Array([1, 2, 3, 4]);
    const requested: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      requested.push(url);
      return new Response(archive, { status: 200 });
    });

    const bytes = await fetchDriveVersionViaGateway({
      gatewayUrl: "ws://127.0.0.1:9480",
      driveKeyHex: DRIVE_KEY,
      version: "1.0.0",
    });

    expect(bytes).toEqual(archive);
    expect(requested).toEqual([
      `http://127.0.0.1:9480/bulk-fetch?driveKey=${DRIVE_KEY}&version=1.0.0`,
    ]);
  });

  it("honours a custom bulk fetch path", async () => {
    const requested: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      requested.push(url);
      return new Response(new Uint8Array(0), { status: 200 });
    });

    await fetchDriveVersionForWeb({
      gatewayUrl: "wss://gateway.example",
      driveKeyHex: DRIVE_KEY,
      version: "2.0.0",
      bulkFetchPath: "/archives",
    });

    expect(requested[0]).toBe(
      `https://gateway.example/archives?driveKey=${DRIVE_KEY}&version=2.0.0`,
    );
  });

  it("reports the response detail when the gateway rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response("no such version", { status: 502 }),
    );

    await expect(
      fetchDriveVersionViaGateway({
        gatewayUrl: "ws://127.0.0.1:9480",
        driveKeyHex: DRIVE_KEY,
        version: "1.0.0",
      }),
    ).rejects.toThrow("gateway bulk fetch failed (502): no such version");
  });

  it("reports the status alone when the error body is empty", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));

    await expect(
      fetchDriveVersionViaGateway({
        gatewayUrl: "ws://127.0.0.1:9480",
        driveKeyHex: DRIVE_KEY,
        version: "1.0.0",
      }),
    ).rejects.toThrow(/gateway bulk fetch failed \(404\)$/);
  });

  it("translates an aborted request into a timeout error", async () => {
    vi.stubGlobal(
      "fetch",
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        }),
    );

    await expect(
      fetchDriveVersionViaGateway({
        gatewayUrl: "ws://127.0.0.1:9480",
        driveKeyHex: DRIVE_KEY,
        version: "1.0.0",
        timeoutMs: 5,
      }),
    ).rejects.toThrow("gateway bulk fetch timed out");
  });

  it("propagates transport errors unchanged", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("connection refused");
    });

    await expect(
      fetchDriveVersionViaGateway({
        gatewayUrl: "ws://127.0.0.1:9480",
        driveKeyHex: DRIVE_KEY,
        version: "1.0.0",
      }),
    ).rejects.toThrow("connection refused");
  });
});
