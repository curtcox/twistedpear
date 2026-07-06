declare module "corestore" {
  export default class Corestore {
    constructor(path: string);
    ready(): Promise<void>;
    close(): Promise<void>;
    replicate(isInitiator: boolean): Connection;
  }

  export interface Connection {
    pipe<T>(destination: T): T;
  }
}

declare module "hyperdrive" {
  import type Corestore from "corestore";

  export default class Hyperdrive {
    constructor(store: Corestore, key?: Uint8Array);
    readonly key: Uint8Array;
    ready(): Promise<void>;
    close(): Promise<void>;
    update(): Promise<void>;
    put(path: string, content: Uint8Array): Promise<void>;
    get(path: string): Promise<Uint8Array | null>;
    entry(path: string): Promise<{ key: string } | null>;
    list(prefix: string): AsyncIterable<{ key: string }>;
  }
}

declare module "hyperswarm" {
  export default class Hyperswarm {
    constructor(options?: { maxPeers?: number });
    on(event: "connection", listener: (socket: Connection, peerInfo: PeerInfo) => void): void;
    join(topic: Uint8Array, options?: { server?: boolean; client?: boolean }): { flushed(): Promise<void> };
    flush(): Promise<void>;
    destroy(): Promise<void>;
  }

  export interface Connection {
    pipe<T>(destination: T): T;
  }

  export interface PeerInfo {
    client: boolean;
  }
}

declare module "b4a" {
  export function from(value: string, encoding?: string): Uint8Array;
  export function subarray(buffer: Uint8Array, start: number, end?: number): Uint8Array;
}
