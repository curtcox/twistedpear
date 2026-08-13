import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeSwarm {
  static instances: FakeSwarm[] = [];
  readonly joined: Array<{ topic: Uint8Array; options: unknown }> = [];
  readonly listeners = new Map<string, (...args: never[]) => void>();
  destroyed = false;

  constructor(readonly options: Record<string, unknown>) {
    FakeSwarm.instances.push(this);
  }

  on(event: string, listener: (...args: never[]) => void) {
    this.listeners.set(event, listener);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.(...(args as never[]));
  }

  join(topic: Uint8Array, options: unknown) {
    this.joined.push({ topic, options });
    return { flushed: () => Promise.resolve() };
  }

  flush(): Promise<void> {
    return Promise.resolve();
  }

  destroy(): Promise<void> {
    this.destroyed = true;
    return Promise.resolve();
  }
}

class FakeHyperdrive {
  static instances: FakeHyperdrive[] = [];
  static files = new Map<string, Uint8Array>();
  /** Number of `update()` calls before the archive becomes visible. */
  static appearAfterUpdates = 0;

  readonly key = new Uint8Array(32).fill(3);
  updates = 0;
  closed = false;

  constructor(
    readonly store: unknown,
    readonly requestedKey: Uint8Array,
  ) {
    FakeHyperdrive.instances.push(this);
  }

  ready(): Promise<void> {
    return Promise.resolve();
  }

  update(): Promise<void> {
    this.updates += 1;
    return Promise.resolve();
  }

  private visible(path: string): Uint8Array | null {
    if (this.updates <= FakeHyperdrive.appearAfterUpdates) return null;
    return FakeHyperdrive.files.get(path) ?? null;
  }

  entry(path: string): Promise<{ key: string } | null> {
    const bytes = this.visible(path);
    return Promise.resolve(bytes === null ? null : { key: path });
  }

  get(path: string): Promise<Uint8Array | null> {
    return Promise.resolve(this.visible(path));
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

vi.mock("hyperswarm", () => ({ default: FakeSwarm }));
vi.mock("hyperdrive", () => ({ default: FakeHyperdrive }));

const { fetchDriveVersionViaRelayedDht } =
  await import("../src/core/relay-hyper-fetch.js");

const DRIVE_KEY_HEX = "cd".repeat(32);

function harness() {
  const dht = { destroy: vi.fn(async () => {}) };
  const store = {
    ready: vi.fn(async () => {}),
    replicate: vi.fn(() => ({ pipe: <T>(target: T) => target })),
    close: vi.fn(async () => {}),
  };
  return {
    dht,
    store,
    options: {
      driveKeyHex: DRIVE_KEY_HEX,
      createDht: async () => dht,
      createStore: async () => store,
    },
  };
}

beforeEach(() => {
  FakeSwarm.instances = [];
  FakeHyperdrive.instances = [];
  FakeHyperdrive.files = new Map();
  FakeHyperdrive.appearAfterUpdates = 0;
});

describe("fetchDriveVersionViaRelayedDht", () => {
  it("joins the drive topic as a client and returns the archive", async () => {
    const archive = new Uint8Array([9, 9, 9]);
    FakeHyperdrive.files.set("/packages/1.0.0.tpkg", archive);
    const { options, dht, store } = harness();

    const bytes = await fetchDriveVersionViaRelayedDht({
      ...options,
      version: "1.0.0",
    });

    expect(bytes).toEqual(archive);
    const swarm = FakeSwarm.instances[0];
    expect(swarm?.options).toEqual({ dht });
    expect(swarm?.joined).toEqual([
      {
        topic: new Uint8Array(32).fill(3),
        options: { server: false, client: true },
      },
    ]);
    expect(
      Buffer.from(FakeHyperdrive.instances[0]?.requestedKey ?? []).toString(
        "hex",
      ),
    ).toBe(DRIVE_KEY_HEX);
    expect(store.ready).not.toHaveBeenCalled();
  });

  it("retries until the archive replicates in", async () => {
    FakeHyperdrive.appearAfterUpdates = 2;
    FakeHyperdrive.files.set("/packages/2.0.0.tpkg", new Uint8Array([1]));
    const { options } = harness();

    const bytes = await fetchDriveVersionViaRelayedDht({
      ...options,
      version: "2.0.0",
      timeoutMs: 5_000,
    });

    expect(bytes).toEqual(new Uint8Array([1]));
    expect(FakeHyperdrive.instances[0]?.updates).toBe(3);
  });

  it("replicates the store into each peer connection", async () => {
    FakeHyperdrive.files.set("/packages/1.0.0.tpkg", new Uint8Array([1]));
    const { options, store } = harness();
    const pending = fetchDriveVersionViaRelayedDht({
      ...options,
      version: "1.0.0",
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    const swarm = FakeSwarm.instances[0];
    const piped: unknown[] = [];
    const peerSocket = {
      pipe: (target: unknown) => {
        piped.push(target);
        return { pipe: (next: unknown) => piped.push(next) };
      },
    };
    swarm?.emit("connection", peerSocket, { client: true });

    await pending;
    expect(store.replicate).toHaveBeenCalledWith(true);
    expect(piped).toHaveLength(2);
  });

  it("times out and tears down every resource", async () => {
    const { options, dht, store } = harness();

    await expect(
      fetchDriveVersionViaRelayedDht({
        ...options,
        version: "3.0.0",
        timeoutMs: 300,
      }),
    ).rejects.toThrow("hyperdrive fetch timed out for 3.0.0");

    expect(FakeSwarm.instances[0]?.destroyed).toBe(true);
    expect(FakeHyperdrive.instances[0]?.closed).toBe(true);
    expect(store.close).toHaveBeenCalledTimes(1);
    expect(dht.destroy).toHaveBeenCalledTimes(1);
  });

  it("tears down even when the archive is found", async () => {
    FakeHyperdrive.files.set("/packages/1.0.0.tpkg", new Uint8Array([2]));
    const { options, dht, store } = harness();

    await fetchDriveVersionViaRelayedDht({ ...options, version: "1.0.0" });

    expect(FakeSwarm.instances[0]?.destroyed).toBe(true);
    expect(store.close).toHaveBeenCalledTimes(1);
    expect(dht.destroy).toHaveBeenCalledTimes(1);
  });
});
