import Hyperswarm from "hyperswarm";
import { Transform } from "streamx";
import type { ByteRateLimiter } from "@twistedpear/reticulum-ts";

export interface SwarmOptions {
  readonly bootstrap?: ReadonlyArray<string>;
  readonly maxPeers?: number;
  readonly dht?: import("hyperdht").default;
  readonly inboundBandwidthLimiter?: ByteRateLimiter;
  readonly outboundBandwidthLimiter?: ByteRateLimiter;
}

export interface SwarmSession {
  readonly swarm: Hyperswarm;
  join(
    topic: Uint8Array,
    options?: { readonly server?: boolean; readonly client?: boolean },
  ): Promise<void>;
  replicate(store: {
    replicate: (isInitiator: boolean) => { pipe<T>(destination: T): T };
  }): void;
  destroy(): Promise<void>;
}

export function createSwarm(options: SwarmOptions = {}): SwarmSession {
  const swarm = new Hyperswarm({
    maxPeers: options.maxPeers ?? 64,
    ...(options.dht === undefined ? {} : { dht: options.dht }),
  });

  if (options.bootstrap !== undefined) {
    // Hyperswarm reads DHT bootstrap from hyperdht; inject via env for testnet.
    process.env.HYPERDHT_BOOTSTRAP = options.bootstrap.join(",");
  }

  const replicators = new Set<{
    replicate: (isInitiator: boolean) => { pipe<T>(destination: T): T };
  }>();

  const throttler = (limiter: ByteRateLimiter | undefined) => {
    if (limiter === undefined) return null;
    const transform = new Transform({
      transform(
        data: Uint8Array,
        callback: (error: Error | null, data?: Uint8Array) => void,
      ) {
        void limiter.consume(data.byteLength).then(
          () => callback(null, data),
          (error: unknown) =>
            callback(error instanceof Error ? error : new Error(String(error))),
        );
      },
    });
    transform.on("error", () => {
      // A rejected budget tears down this peer's pipeline, not the process.
    });
    return transform;
  };

  swarm.on("connection", (socket, peerInfo) => {
    const connection = socket as {
      on?(event: string, listener: () => void): void;
    };
    connection.on?.("error", () => {
      // Peers disconnect during replication; ignore reset errors.
    });

    for (const store of replicators) {
      const stream = store.replicate(peerInfo.client) as {
        on?(event: string, listener: () => void): void;
        pipe<T>(destination: T): T;
      };
      stream.on?.("error", () => {
        // Ignore stream errors from transient peers.
      });
      const inbound = throttler(options.inboundBandwidthLimiter);
      const outbound = throttler(options.outboundBandwidthLimiter);
      if (inbound === null) socket.pipe(stream);
      else socket.pipe(inbound).pipe(stream as never);
      if (outbound === null) stream.pipe(socket);
      else stream.pipe(outbound).pipe(socket as never);
    }
  });

  return {
    swarm,
    async join(topic, joinOptions = { server: true, client: true }) {
      const discovery = swarm.join(topic, joinOptions);
      await discovery.flushed();
    },
    replicate(store) {
      replicators.add(store);
      swarm.flush().catch(() => {
        // Best-effort flush for late joiners.
      });
    },
    async destroy() {
      replicators.clear();
      await swarm.destroy();
    },
  };
}

export function driveTopic(driveKey: Uint8Array): Uint8Array {
  return driveKey.slice(0, 32);
}
