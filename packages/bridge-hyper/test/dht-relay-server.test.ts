import { createServer, type Server } from "node:http";
import type { Socket } from "node:net";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";

class FakeDht {
  static instances: FakeDht[] = [];
  destroyed = 0;

  constructor() {
    FakeDht.instances.push(this);
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

const relay = vi.fn();

vi.mock("hyperdht", () => ({ default: FakeDht }));
vi.mock("@hyperswarm/dht-relay", () => ({ relay }));
vi.mock("@hyperswarm/dht-relay/ws", () => ({ default: FakeWsStream }));

const { attachDhtRelayServer, DEFAULT_DHT_RELAY_PATH } =
  await import("../src/server/dht-relay-server.js");

/** Upgraded sockets outlive `server.close()`, so the test tracks them itself. */
const openSockets = new Map<Server, Set<Socket>>();

async function listening(): Promise<{ server: Server; port: number }> {
  const server = createServer();
  const sockets = new Set<Socket>();
  openSockets.set(server, sockets);
  server.on("connection", (socket: Socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("expected a listening server");
  }
  return { server, port: address.port };
}

function closeServer(server: Server): Promise<void> {
  for (const socket of openSockets.get(server) ?? []) socket.destroy();
  openSockets.delete(server);
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("open", () => resolve(socket));
    socket.once("error", (error: Error) => reject(error));
  });
}

/** An ignored upgrade leaves the socket hanging, so absence is the assertion. */
async function upgradeIgnored(url: string): Promise<boolean> {
  const socket = new WebSocket(url);
  const opened = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), 250);
    const settle = (value: boolean) => {
      clearTimeout(timer);
      resolve(value);
    };
    socket.once("open", () => settle(true));
    socket.once("error", () => settle(false));
  });
  socket.on("error", () => {
    // Tearing down a socket that never finished its handshake is expected.
  });
  socket.terminate();
  return !opened;
}

beforeEach(() => {
  FakeDht.instances = [];
  relay.mockClear();
});

describe("attachDhtRelayServer", () => {
  it("relays upgrades on the default path over a lazily created DHT", async () => {
    const { server, port } = await listening();
    const session = attachDhtRelayServer(server);
    expect(session.path).toBe(DEFAULT_DHT_RELAY_PATH);

    const socket = await connect(
      `ws://127.0.0.1:${port}${DEFAULT_DHT_RELAY_PATH}`,
    );

    expect(relay).toHaveBeenCalledTimes(1);
    expect(FakeDht.instances).toHaveLength(1);
    expect(relay.mock.calls[0]?.[0]).toBe(FakeDht.instances[0]);
    expect(relay.mock.calls[0]?.[1]).toBeInstanceOf(FakeWsStream);
    expect((relay.mock.calls[0]?.[1] as FakeWsStream).isInitiator).toBe(false);

    socket.close();
    await session.close();
    expect(FakeDht.instances[0]?.destroyed).toBe(1);
    await closeServer(server);
  });

  it("reuses one DHT across connections and leaves other paths alone", async () => {
    const { server, port } = await listening();
    const session = attachDhtRelayServer(server, { path: "/relay" });

    const first = await connect(`ws://127.0.0.1:${port}/relay`);
    const second = await connect(`ws://127.0.0.1:${port}/relay`);
    expect(relay).toHaveBeenCalledTimes(2);
    expect(FakeDht.instances).toHaveLength(1);

    expect(await upgradeIgnored(`ws://127.0.0.1:${port}/other`)).toBe(true);

    first.close();
    second.close();
    await session.close();
    await closeServer(server);
  });

  it("relays over a caller-supplied DHT and leaves it running on close", async () => {
    const { server, port } = await listening();
    const dht = new FakeDht();
    FakeDht.instances = [];
    const session = attachDhtRelayServer(server, { dht: dht as never });

    const socket = await connect(
      `ws://127.0.0.1:${port}${DEFAULT_DHT_RELAY_PATH}`,
    );

    expect(relay.mock.calls[0]?.[0]).toBe(dht);
    expect(FakeDht.instances).toHaveLength(0);

    socket.close();
    await session.close();
    expect(dht.destroyed).toBe(0);
    await closeServer(server);
  });

  it("stops handling upgrades after close", async () => {
    const { server, port } = await listening();
    const session = attachDhtRelayServer(server);

    await session.close();
    expect(server.listenerCount("upgrade")).toBe(0);
    expect(
      await upgradeIgnored(`ws://127.0.0.1:${port}${DEFAULT_DHT_RELAY_PATH}`),
    ).toBe(true);

    await closeServer(server);
  });
});
