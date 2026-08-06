declare module "corestore" {
  export default class Corestore {
    constructor(path: string | StorageFactory);
    ready(): Promise<void>;
    close(): Promise<void>;
    replicate(isInitiator: boolean): Connection;
  }

  export type StorageFactory = (name: string) => unknown;

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
  import type DHT from "hyperdht";

  export default class Hyperswarm {
    constructor(options?: { maxPeers?: number; dht?: DHT });
    on(
      event: "connection",
      listener: (socket: Connection, peerInfo: PeerInfo) => void,
    ): void;
    join(
      topic: Uint8Array,
      options?: { server?: boolean; client?: boolean },
    ): { flushed(): Promise<void> };
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
  export function subarray(
    buffer: Uint8Array,
    start: number,
    end?: number,
  ): Uint8Array;
}

declare module "@hyperswarm/dht-relay" {
  import type { Duplex } from "streamx";

  export default class DHT {
    constructor(stream: Duplex);
    ready(): Promise<void>;
    destroy(): Promise<void>;
  }

  export function relay(dht: import("hyperdht").default, stream: Duplex): void;
}

declare module "@hyperswarm/dht-relay/ws" {
  import type { Duplex } from "streamx";

  export default class WsStream extends Duplex {
    constructor(
      isInitiator: boolean,
      socket: WebSocket | import("ws").WebSocket,
    );
  }
}

declare module "hyperdht" {
  export default class DHT {
    destroy(): Promise<void>;
  }
}

declare module "dht-universal" {
  export class DHT {
    constructor(options: { relay: string });
    ready(): Promise<void>;
    destroy(): Promise<void>;
  }
}

declare module "dht-universal/relay.js" {
  export class DHT {
    static create(options: {
      relays: ReadonlyArray<string>;
    }): Promise<{ destroy(): Promise<void> }>;
    ready(): Promise<void>;
    destroy(): Promise<void>;
  }
}

declare module "random-access-memory" {
  export default function RAM(name?: string): unknown;
}

declare module "ws" {
  import type { IncomingMessage } from "node:http";
  import type { Duplex } from "node:stream";

  export default class WebSocket {
    constructor(url: string);
    close(): void;
    once(event: "open" | "error", listener: () => void): void;
    readonly readyState: number;
  }

  export class WebSocketServer {
    constructor(options: { noServer?: boolean });
    handleUpgrade(
      request: IncomingMessage,
      socket: Duplex,
      head: Buffer,
      callback: (socket: WebSocket) => void,
    ): void;
    close(callback?: (error?: Error) => void): void;
  }
}
