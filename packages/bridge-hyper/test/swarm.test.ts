import { beforeEach, describe, expect, it, vi } from "vitest";
import { Duplex } from "streamx";

interface FakeDiscovery {
  flushed(): Promise<void>;
}

class FakeSwarm {
  static instances: FakeSwarm[] = [];
  readonly options: Record<string, unknown>;
  readonly joined: Array<{ topic: Uint8Array; options: unknown }> = [];
  readonly listeners = new Map<string, (...args: never[]) => void>();
  flushes = 0;
  destroyed = false;
  flushResult: Promise<void> = Promise.resolve();

  constructor(options: Record<string, unknown>) {
    this.options = options;
    FakeSwarm.instances.push(this);
  }

  on(event: string, listener: (...args: never[]) => void) {
    this.listeners.set(event, listener);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.(...(args as never[]));
  }

  join(topic: Uint8Array, options: unknown): FakeDiscovery {
    this.joined.push({ topic, options });
    return { flushed: () => Promise.resolve() };
  }

  flush(): Promise<void> {
    this.flushes += 1;
    return this.flushResult;
  }

  destroy(): Promise<void> {
    this.destroyed = true;
    return Promise.resolve();
  }
}

vi.mock("hyperswarm", () => ({ default: FakeSwarm }));

const { createSwarm, driveTopic } = await import("../src/core/swarm.js");

function collectingDuplex(sink: Uint8Array[]) {
  return new Duplex({
    write(data: Uint8Array, callback: () => void) {
      sink.push(data);
      callback();
    },
  });
}

beforeEach(() => {
  FakeSwarm.instances = [];
  delete process.env.HYPERDHT_BOOTSTRAP;
});

describe("createSwarm", () => {
  it("applies the default peer cap and omits an absent dht", () => {
    createSwarm();

    expect(FakeSwarm.instances[0]?.options).toEqual({ maxPeers: 64 });
  });

  it("passes through maxPeers, dht, and bootstrap nodes", () => {
    const dht = { fake: true } as never;
    createSwarm({
      maxPeers: 4,
      dht,
      bootstrap: ["127.0.0.1:5000", "127.0.0.1:5001"],
    });

    expect(FakeSwarm.instances[0]?.options).toEqual({ maxPeers: 4, dht });
    expect(process.env.HYPERDHT_BOOTSTRAP).toBe(
      "127.0.0.1:5000,127.0.0.1:5001",
    );
  });

  it("joins topics with the requested role and awaits discovery", async () => {
    const session = createSwarm();
    const topic = new Uint8Array(32).fill(7);

    await session.join(topic);
    await session.join(topic, { server: false, client: true });

    expect(FakeSwarm.instances[0]?.joined).toEqual([
      { topic, options: { server: true, client: true } },
      { topic, options: { server: false, client: true } },
    ]);
  });

  it("flushes when a replicator is registered and ignores flush failures", () => {
    const session = createSwarm();
    const swarm = FakeSwarm.instances[0];
    if (swarm === undefined) throw new Error("expected a swarm");
    swarm.flushResult = Promise.reject(new Error("no peers yet"));

    session.replicate({
      replicate: () => ({ pipe: <T>(target: T) => target }),
    });

    expect(swarm.flushes).toBe(1);
  });

  it("pipes each registered store into new peer connections", async () => {
    const session = createSwarm();
    const swarm = FakeSwarm.instances[0];
    if (swarm === undefined) throw new Error("expected a swarm");

    const toPeer: Uint8Array[] = [];
    const toStore: Uint8Array[] = [];
    const socket = collectingDuplex(toPeer);
    const stream = collectingDuplex(toStore);
    const replicateArgs: boolean[] = [];
    session.replicate({
      replicate: (isInitiator: boolean) => {
        replicateArgs.push(isInitiator);
        return stream as never;
      },
    });

    swarm.emit("connection", socket, { client: true });
    expect(replicateArgs).toEqual([true]);

    socket.push(new Uint8Array([1, 2, 3]));
    stream.push(new Uint8Array([4, 5]));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(toStore).toEqual([new Uint8Array([1, 2, 3])]);
    expect(toPeer).toEqual([new Uint8Array([4, 5])]);
  });

  it("meters connection traffic through the configured bandwidth limiters", async () => {
    const inboundBytes: number[] = [];
    const outboundBytes: number[] = [];
    const session = createSwarm({
      inboundBandwidthLimiter: {
        async consume(bytes: number) {
          inboundBytes.push(bytes);
        },
      },
      outboundBandwidthLimiter: {
        async consume(bytes: number) {
          outboundBytes.push(bytes);
        },
      },
    });
    const swarm = FakeSwarm.instances[0];
    if (swarm === undefined) throw new Error("expected a swarm");

    const toPeer: Uint8Array[] = [];
    const toStore: Uint8Array[] = [];
    const socket = collectingDuplex(toPeer);
    const stream = collectingDuplex(toStore);
    session.replicate({ replicate: () => stream as never });

    swarm.emit("connection", socket, { client: false });

    socket.push(new Uint8Array([1, 2, 3]));
    stream.push(new Uint8Array([9]));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(inboundBytes).toEqual([3]);
    expect(outboundBytes).toEqual([1]);
    expect(toStore).toEqual([new Uint8Array([1, 2, 3])]);
    expect(toPeer).toEqual([new Uint8Array([9])]);
  });

  it("contains limiter failures instead of crashing the process", async () => {
    const session = createSwarm({
      inboundBandwidthLimiter: {
        consume: () => Promise.reject(new Error("budget exhausted")),
      },
    });
    const swarm = FakeSwarm.instances[0];
    if (swarm === undefined) throw new Error("expected a swarm");

    const delivered: Uint8Array[] = [];
    const socket = collectingDuplex([]);
    const stream = collectingDuplex(delivered);
    session.replicate({ replicate: () => stream as never });
    swarm.emit("connection", socket, { client: true });

    socket.push(new Uint8Array([1]));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(delivered).toEqual([]);
  });

  it("stringifies non-Error limiter rejections", async () => {
    const session = createSwarm({
      inboundBandwidthLimiter: { consume: () => Promise.reject("no budget") },
    });
    const swarm = FakeSwarm.instances[0];
    if (swarm === undefined) throw new Error("expected a swarm");

    const delivered: Uint8Array[] = [];
    const socket = collectingDuplex([]);
    const stream = collectingDuplex(delivered);
    session.replicate({ replicate: () => stream as never });
    swarm.emit("connection", socket, { client: true });

    socket.push(new Uint8Array([1]));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(delivered).toEqual([]);
  });

  it("ignores connection and replication stream errors", () => {
    const session = createSwarm();
    const swarm = FakeSwarm.instances[0];
    if (swarm === undefined) throw new Error("expected a swarm");

    const socketListeners = new Map<string, () => void>();
    const streamListeners = new Map<string, () => void>();
    const socket = {
      on(event: string, listener: () => void) {
        socketListeners.set(event, listener);
      },
      pipe: <T>(target: T) => target,
    };
    session.replicate({
      replicate: () =>
        ({
          on(event: string, listener: () => void) {
            streamListeners.set(event, listener);
          },
          pipe: <T>(target: T) => target,
        }) as never,
    });

    swarm.emit("connection", socket, { client: true });

    expect(() => socketListeners.get("error")?.()).not.toThrow();
    expect(() => streamListeners.get("error")?.()).not.toThrow();
  });

  it("drops replicators and destroys the underlying swarm", async () => {
    const session = createSwarm();
    const swarm = FakeSwarm.instances[0];
    if (swarm === undefined) throw new Error("expected a swarm");
    const replicate = vi.fn(() => ({ pipe: <T>(target: T) => target }));
    session.replicate({ replicate: replicate as never });

    await session.destroy();
    swarm.emit(
      "connection",
      { pipe: <T>(target: T) => target },
      {
        client: true,
      },
    );

    expect(swarm.destroyed).toBe(true);
    expect(replicate).not.toHaveBeenCalled();
  });
});

describe("driveTopic", () => {
  it("uses the first 32 bytes of the drive key", () => {
    const key = new Uint8Array(40).map((_, index) => index);

    expect(driveTopic(key)).toEqual(key.slice(0, 32));
  });
});
