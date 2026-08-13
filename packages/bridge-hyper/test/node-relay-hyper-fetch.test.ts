import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RelayHyperFetchOptions } from "../src/core/relay-hyper-fetch.js";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static behaviour: "open" | "error" | "hang" = "open";

  readonly handlers = new Map<string, () => void>();
  closed = false;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
    if (FakeWebSocket.behaviour === "hang") return;
    setTimeout(() => {
      this.handlers.get(
        FakeWebSocket.behaviour === "open" ? "open" : "error",
      )?.();
    }, 0);
  }

  once(event: string, listener: () => void) {
    this.handlers.set(event, listener);
    return this;
  }

  close() {
    this.closed = true;
  }
}

class FakeCorestore {
  static instances: FakeCorestore[] = [];
  constructor(readonly storagePath: string) {
    FakeCorestore.instances.push(this);
  }

  ready(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeRelayDht {
  static instances: FakeRelayDht[] = [];
  destroyed = 0;

  constructor(readonly stream: unknown) {
    FakeRelayDht.instances.push(this);
  }

  ready(): Promise<void> {
    return Promise.resolve();
  }

  destroy(): Promise<void> {
    this.destroyed += 1;
    return Promise.resolve();
  }
}

class FakeWsStream {
  constructor(
    readonly isInitiator: boolean,
    readonly socket: unknown,
  ) {}
}

const relayFetch = vi.fn(
  (options: RelayHyperFetchOptions): Promise<Uint8Array> =>
    Promise.resolve(new Uint8Array([options.version.length])),
);

vi.mock("ws", () => ({ default: FakeWebSocket }));
vi.mock("corestore", () => ({ default: FakeCorestore }));
vi.mock("@hyperswarm/dht-relay", () => ({ default: FakeRelayDht }));
vi.mock("@hyperswarm/dht-relay/ws", () => ({ default: FakeWsStream }));
vi.mock("../src/core/relay-hyper-fetch.js", () => ({
  fetchDriveVersionViaRelayedDht: relayFetch,
}));

const { createNodeRelayDriveFetcher, fetchDriveVersionViaNodeRelay } =
  await import("../src/server/node-relay-hyper-fetch.js");

const DRIVE_KEY_HEX = "12".repeat(32);
const RELAY_URL = "ws://127.0.0.1:9480/dht-relay";

beforeEach(() => {
  FakeWebSocket.instances = [];
  FakeWebSocket.behaviour = "open";
  FakeCorestore.instances = [];
  FakeRelayDht.instances = [];
  relayFetch.mockClear();
  relayFetch.mockImplementation(async () => new Uint8Array([1]));
});

describe("fetchDriveVersionViaNodeRelay", () => {
  it("forwards the drive key, version, and timeout to the relayed fetch", async () => {
    const bytes = await fetchDriveVersionViaNodeRelay({
      relayUrl: RELAY_URL,
      driveKeyHex: DRIVE_KEY_HEX,
      version: "1.0.0",
      timeoutMs: 1_000,
    });

    expect(bytes).toEqual(new Uint8Array([1]));
    const options = relayFetch.mock.calls[0]?.[0];
    expect(options?.driveKeyHex).toBe(DRIVE_KEY_HEX);
    expect(options?.version).toBe("1.0.0");
    expect(options?.timeoutMs).toBe(1_000);
  });

  it("omits the timeout when the caller does not set one", async () => {
    await fetchDriveVersionViaNodeRelay({
      relayUrl: RELAY_URL,
      driveKeyHex: DRIVE_KEY_HEX,
      version: "1.0.0",
    });

    expect(relayFetch.mock.calls[0]?.[0]).not.toHaveProperty("timeoutMs");
  });

  it("removes the temporary store even when the fetch fails", async () => {
    let storagePath = "";
    relayFetch.mockImplementation(async (options) => {
      await options.createStore();
      storagePath = FakeCorestore.instances[0]?.storagePath ?? "";
      throw new Error("relay unavailable");
    });

    await expect(
      fetchDriveVersionViaNodeRelay({
        relayUrl: RELAY_URL,
        driveKeyHex: DRIVE_KEY_HEX,
        version: "1.0.0",
      }),
    ).rejects.toThrow("relay unavailable");
    expect(storagePath).not.toBe("");
    expect(existsSync(storagePath)).toBe(false);
  });

  it("builds a ready Corestore in a temporary directory", async () => {
    let storagePath = "";
    let existedDuringFetch = false;
    relayFetch.mockImplementation(async (options) => {
      await options.createStore();
      storagePath = FakeCorestore.instances[0]?.storagePath ?? "";
      existedDuringFetch = existsSync(storagePath);
      return new Uint8Array(0);
    });

    await fetchDriveVersionViaNodeRelay({
      relayUrl: RELAY_URL,
      driveKeyHex: DRIVE_KEY_HEX,
      version: "1.0.0",
    });

    expect(existedDuringFetch).toBe(true);
    expect(existsSync(storagePath)).toBe(false);
  });

  it("opens the relay websocket and closes it when the DHT is destroyed", async () => {
    relayFetch.mockImplementation(async (options) => {
      const dht = await options.createDht();
      await dht.destroy();
      return new Uint8Array(0);
    });

    await fetchDriveVersionViaNodeRelay({
      relayUrl: RELAY_URL,
      driveKeyHex: DRIVE_KEY_HEX,
      version: "1.0.0",
    });

    expect(FakeWebSocket.instances[0]?.url).toBe(RELAY_URL);
    expect(FakeRelayDht.instances[0]?.destroyed).toBe(1);
    expect(FakeWebSocket.instances[0]?.closed).toBe(true);
  });

  it("fails when the relay websocket errors", async () => {
    FakeWebSocket.behaviour = "error";
    relayFetch.mockImplementation((options) => options.createDht() as never);

    await expect(
      fetchDriveVersionViaNodeRelay({
        relayUrl: RELAY_URL,
        driveKeyHex: DRIVE_KEY_HEX,
        version: "1.0.0",
      }),
    ).rejects.toThrow("DHT relay websocket failed");
  });

  it("fails when the relay websocket never opens", async () => {
    FakeWebSocket.behaviour = "hang";
    relayFetch.mockImplementation((options) => options.createDht() as never);

    await expect(
      fetchDriveVersionViaNodeRelay({
        relayUrl: RELAY_URL,
        driveKeyHex: DRIVE_KEY_HEX,
        version: "1.0.0",
        timeoutMs: 20,
      }),
    ).rejects.toThrow("DHT relay websocket connect timeout");
    expect(FakeWebSocket.instances[0]?.closed).toBe(true);
  });
});

describe("createNodeRelayDriveFetcher", () => {
  it("binds the relay URL and forwards per-call arguments", async () => {
    const fetcher = createNodeRelayDriveFetcher({ relayUrl: RELAY_URL });

    await fetcher.fetchDriveVersion(DRIVE_KEY_HEX, "3.0.0");

    expect(relayFetch.mock.calls[0]?.[0]?.version).toBe("3.0.0");
    expect(relayFetch.mock.calls[0]?.[0]?.driveKeyHex).toBe(DRIVE_KEY_HEX);
  });
});
