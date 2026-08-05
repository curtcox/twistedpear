import { describe, expect, it } from "vitest";
import { NodeCryptoProvider } from "../src/index.js";
import { TcpClientInterface } from "../src/interfaces/tcp.js";
import type {
  Clock,
  DuplexConnection,
  Runtime,
  TcpConnectOptions,
  Timer
} from "../src/runtime/runtime.js";
import { INTERFACE_CONNECT_TIMEOUT_MS } from "@twistedpear/protocol";

function createFakeClock(startMs = 0): Clock & {
  readonly pending: Array<{ delayMs: number; callback: () => void; cancelled: boolean }>;
  advance(ms: number): void;
} {
  let now = startMs;
  const pending: Array<{ delayMs: number; callback: () => void; cancelled: boolean }> = [];
  return {
    pending,
    now: () => now,
    setTimeout(callback: () => void, milliseconds: number): Timer {
      const entry = { delayMs: milliseconds, callback, cancelled: false };
      pending.push(entry);
      return {
        cancel() {
          entry.cancelled = true;
        }
      };
    },
    advance(ms: number) {
      now += ms;
      for (const entry of [...pending]) {
        if (entry.cancelled) {
          continue;
        }
        entry.delayMs -= ms;
        if (entry.delayMs <= 0) {
          entry.cancelled = true;
          entry.callback();
        }
      }
    }
  };
}

function hangingConnection(): Promise<DuplexConnection> {
  return new Promise(() => {
    // Never resolves — timeout must come from stepInterfaceConnect.
  });
}

function openDuplex(): DuplexConnection {
  return {
    // Keep the read loop alive until close(); an empty generator would reconnect.
    readable: (async function* () {
      await new Promise(() => {});
    })(),
    write: async () => {},
    close: async () => {}
  };
}

function immediateConnection(): Promise<DuplexConnection> {
  return Promise.resolve(openDuplex());
}

function createRuntime(
  clock: Clock,
  connect: (options: TcpConnectOptions) => Promise<DuplexConnection>
): Runtime {
  return {
    clock,
    entropy: { randomBytes: (length) => new Uint8Array(length) },
    store: {
      get: async () => undefined,
      set: async () => {},
      delete: async () => {}
    },
    tcp: {
      connect,
      listen: async () => {
        throw new Error("listen not used");
      }
    },
    udp: {
      bind: async () => {
        throw new Error("udp not used");
      }
    }
  };
}

describe("TCP interface connect adapter", () => {
  const provider = new NodeCryptoProvider();

  it("arms the protocol connect timer and times out hanging sockets", async () => {
    const clock = createFakeClock();
    let seenTimeoutMs: number | undefined;
    const runtime = createRuntime(clock, async (options) => {
      seenTimeoutMs = options.connectTimeoutMs;
      return hangingConnection();
    });

    const connectPromise = TcpClientInterface.connect(provider, runtime, {
      name: "tcp-timeout",
      targetHost: "127.0.0.1",
      targetPort: 9,
      connectTimeoutMs: 50,
      maxReconnectTries: 0
    });

    expect(seenTimeoutMs).toBe(0);
    expect(clock.pending.filter((entry) => !entry.cancelled)).toHaveLength(1);
    expect(clock.pending[0]!.delayMs).toBe(50);

    clock.advance(50);
    const iface = await connectPromise;
    expect(iface.online).toBe(false);
  });

  it("cancels the connect timer when the socket opens", async () => {
    const clock = createFakeClock();
    const runtime = createRuntime(clock, async () => immediateConnection());

    const iface = await TcpClientInterface.connect(provider, runtime, {
      name: "tcp-ok",
      targetHost: "127.0.0.1",
      targetPort: 9,
      connectTimeoutMs: INTERFACE_CONNECT_TIMEOUT_MS,
      maxReconnectTries: 0
    });

    expect(clock.pending.every((entry) => entry.cancelled)).toBe(true);
    expect(iface.online).toBe(true);
    await iface.close();
  });

  it("clears the connect timer when connect rejects", async () => {
    const clock = createFakeClock();
    const runtime = createRuntime(clock, async () => {
      throw new Error("connection refused");
    });

    const iface = await TcpClientInterface.connect(provider, runtime, {
      name: "tcp-fail",
      targetHost: "127.0.0.1",
      targetPort: 9,
      connectTimeoutMs: 1_000,
      maxReconnectTries: 0
    });

    expect(iface.online).toBe(false);
    const connectTimers = clock.pending.filter(
      (entry) => !entry.cancelled && entry.delayMs === 1_000
    );
    expect(connectTimers).toHaveLength(0);
  });
});
