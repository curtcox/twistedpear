import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDevChannelClient } from "../src/dev-channel.mjs";

// The worklet reaches the `tp dev` server over bare-tcp; the stub below records
// what the client asked for and lets each test drive the socket by hand.
class FakeSocket {
  static instances: FakeSocket[] = [];

  readonly listeners = new Map<string, ((value?: unknown) => void)[]>();
  connected: { host: string; port: number } | null = null;
  destroyed = false;
  ended = false;
  static failWith: Error | null = null;
  static autoConnect = true;

  constructor(readonly options: Record<string, unknown>) {
    FakeSocket.instances.push(this);
  }

  on(event: string, listener: (value?: unknown) => void): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
  }

  once(event: string, listener: (value?: unknown) => void): void {
    this.on(event, listener);
  }

  emit(event: string, value?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(value);
  }

  connect(port: number, host: string): void {
    this.connected = { host, port };
    if (FakeSocket.failWith !== null) {
      this.emit("error", FakeSocket.failWith);
      return;
    }
    if (FakeSocket.autoConnect) this.emit("connect");
  }

  end(done: () => void): void {
    this.ended = true;
    done();
  }

  destroy(): void {
    this.destroyed = true;
  }
}

vi.mock("bare-tcp", () => ({ Socket: FakeSocket }));

function client(overrides: Record<string, unknown> = {}) {
  const events: string[] = [];
  const bundles: { manifest: unknown; bytes: Uint8Array }[] = [];
  const channel = createDevChannelClient({
    isDeveloperMode: () => true,
    onBundle: async (manifest: unknown, bytes: Uint8Array) => {
      bundles.push({ manifest, bytes });
    },
    onConnected: (endpoint: string) => events.push(`connected:${endpoint}`),
    onDisconnected: () => events.push("disconnected"),
    onBundleLoaded: (name: string) => events.push(`loaded:${name}`),
    onError: (message: string) => events.push(`error:${message}`),
    ...overrides,
  });
  return { channel, events, bundles };
}

function latestSocket(): FakeSocket {
  const socket = FakeSocket.instances.at(-1);
  if (socket === undefined) throw new Error("no socket was opened");
  return socket;
}

beforeEach(() => {
  FakeSocket.instances = [];
  FakeSocket.failWith = null;
  FakeSocket.autoConnect = true;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("connect", () => {
  it("refuses to connect outside developer mode", async () => {
    const { channel } = client({ isDeveloperMode: () => false });
    await expect(channel.connect("127.0.0.1", 4321)).rejects.toThrow(
      "Developer mode is disabled",
    );
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it("reports the endpoint it reached", async () => {
    const { channel, events } = client();

    await channel.connect("127.0.0.1", 4321);

    expect(latestSocket().connected).toEqual({ host: "127.0.0.1", port: 4321 });
    expect(events).toEqual(["connected:127.0.0.1:4321"]);
    expect(channel.isConnected()).toBe(true);
  });

  it("propagates a socket error", async () => {
    FakeSocket.failWith = new Error("ECONNREFUSED");
    const { channel } = client();

    await expect(channel.connect("127.0.0.1", 4321)).rejects.toThrow(
      "ECONNREFUSED",
    );
  });

  it("times out a socket that never opens", async () => {
    vi.useFakeTimers();
    FakeSocket.autoConnect = false;
    const { channel } = client();

    const pending = channel.connect("127.0.0.1", 4321);
    const rejection = expect(pending).rejects.toThrow("connect timed out");
    await vi.advanceTimersByTimeAsync(5_000);
    await rejection;
    expect(latestSocket().destroyed).toBe(true);
  });

  it("replaces an earlier connection", async () => {
    const { channel } = client();
    await channel.connect("127.0.0.1", 4321);
    const first = latestSocket();

    await channel.connect("127.0.0.1", 4322);

    expect(first.destroyed).toBe(true);
    expect(FakeSocket.instances).toHaveLength(2);
  });

  it("reports a closed socket", async () => {
    const { channel, events } = client();
    await channel.connect("127.0.0.1", 4321);

    latestSocket().emit("close");

    expect(events).toContain("disconnected");
  });
});

describe("incoming dev-bundle lines", () => {
  async function connected() {
    const harness = client();
    await harness.channel.connect("127.0.0.1", 4321);
    return { ...harness, socket: latestSocket() };
  }

  it("decodes a bundle split across chunks", async () => {
    const { socket, bundles, events } = await connected();
    const payload = JSON.stringify({
      type: "dev-bundle",
      manifest: { name: "hello" },
      bundleHex: "0a0b0c",
    });

    socket.emit("data", payload.slice(0, 10));
    expect(bundles).toEqual([]);

    socket.emit("data", new TextEncoder().encode(`${payload.slice(10)}\n`));
    await vi.waitFor(() => expect(events).toContain("loaded:hello"));

    expect(bundles).toEqual([
      {
        manifest: { name: "hello" },
        bytes: new Uint8Array([0x0a, 0x0b, 0x0c]),
      },
    ]);
  });

  it("defaults the loaded name when the manifest has none", async () => {
    const { socket, bundles, events } = await connected();

    socket.emit(
      "data",
      `${JSON.stringify({ type: "dev-bundle", bundleHex: "" })}\n`,
    );
    await vi.waitFor(() => expect(events).toContain("loaded:mini-app"));

    expect(bundles[0]?.manifest).toEqual({});
  });

  it("surfaces a rejected bundle load", async () => {
    const harness = client({
      onBundle: async () => {
        throw new Error("bad bundle");
      },
    });
    await harness.channel.connect("127.0.0.1", 4321);

    latestSocket().emit(
      "data",
      `${JSON.stringify({ type: "dev-bundle", bundleHex: "ff" })}\n`,
    );

    await vi.waitFor(() =>
      expect(harness.events).toContain("error:bad bundle"),
    );
  });

  it("rejects invalid json and unexpected messages", async () => {
    const { socket, events } = await connected();

    socket.emit("data", "not json\n");
    socket.emit("data", `${JSON.stringify({ type: "ping" })}\n`);

    expect(events).toContain("error:Invalid dev channel payload");
    expect(events).toContain("error:Unexpected dev channel message");
  });
});

describe("disconnect", () => {
  it("is a no-op when nothing is connected", async () => {
    const { channel } = client();
    await channel.disconnect();
    expect(channel.isConnected()).toBe(false);
  });

  it("ends and destroys the socket", async () => {
    const { channel } = client();
    await channel.connect("127.0.0.1", 4321);

    await channel.disconnect();

    expect(latestSocket().ended).toBe(true);
    expect(latestSocket().destroyed).toBe(true);
    expect(channel.isConnected()).toBe(false);
  });
});
