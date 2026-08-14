import type {
  BoundDatagramSocket,
  Clock,
  DatagramPacket,
  DuplexConnection,
  Entropy,
  KeyValueStore,
  Runtime,
  TcpConnectOptions,
  TcpFactory,
  TcpListenOptions,
  TcpListener,
  Timer,
  UdpFactory,
} from "../runtime.js";

export interface WebRuntimeOptions {
  readonly storeName?: string;
  readonly indexedDB?: WebIndexedDB;
  readonly clock?: Clock;
  readonly entropy?: Entropy;
}

export interface WebIndexedDB {
  open(name: string, version?: number): WebIDBOpenRequest;
}

interface WebIDBOpenRequest extends WebIDBRequest<WebIDBDatabase> {
  onupgradeneeded: ((event: WebIDBVersionChangeEvent) => void) | null;
}

interface WebIDBVersionChangeEvent {
  readonly target: WebIDBOpenRequest | null;
}

interface WebIDBRequest<T> {
  readonly result: T;
  readonly error: Error | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

interface WebIDBDatabase {
  createObjectStore(name: string): void;
  transaction(name: string, mode: "readonly" | "readwrite"): WebIDBTransaction;
}

interface WebIDBTransaction {
  objectStore(name: string): WebIDBObjectStore;
}

interface WebIDBObjectStore {
  get(key: string): WebIDBRequest<Uint8Array | ArrayBuffer | undefined>;
  put(value: Uint8Array, key: string): WebIDBRequest<unknown>;
  delete(key: string): WebIDBRequest<unknown>;
}

class WebTimer implements Timer {
  constructor(private readonly id: ReturnType<typeof setTimeout>) {}

  cancel(): void {
    clearTimeout(this.id);
  }
}

class WebClock implements Clock {
  now(): number {
    return Date.now();
  }

  setTimeout(callback: () => void, milliseconds: number): Timer {
    return new WebTimer(setTimeout(callback, milliseconds));
  }
}

type GlobalCrypto = {
  getRandomValues: (array: Uint8Array) => Uint8Array;
};

class WebEntropy implements Entropy {
  randomBytes(length: number): Uint8Array {
    const out = new Uint8Array(length);
    const c = (globalThis as { crypto?: GlobalCrypto }).crypto;
    if (c !== undefined && typeof c.getRandomValues === "function") {
      c.getRandomValues(out);
      return out;
    }
    throw new Error("WebEntropy requires globalThis.crypto.getRandomValues");
  }
}

class IndexedDbKeyValueStore implements KeyValueStore {
  private readonly ready: Promise<WebIDBDatabase>;

  constructor(
    indexedDB: WebIndexedDB,
    private readonly storeName: string,
  ) {
    this.ready = new Promise((resolve, reject) => {
      const request = indexedDB.open(storeName, 1);
      request.onupgradeneeded = (event) => {
        event.target?.result.createObjectStore("kv");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(
          request.error ??
            new Error(`Failed to open IndexedDB store ${storeName}`),
        );
    });
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    const result = await this.request((store) => store.get(key), "readonly");
    if (result === undefined) {
      return undefined;
    }

    return result instanceof Uint8Array
      ? Uint8Array.from(result)
      : new Uint8Array(result);
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    await this.request(
      (store) => store.put(Uint8Array.from(value), key),
      "readwrite",
    );
  }

  async delete(key: string): Promise<void> {
    await this.request((store) => store.delete(key), "readwrite");
  }

  private async request<T>(
    makeRequest: (store: WebIDBObjectStore) => WebIDBRequest<T>,
    mode: "readonly" | "readwrite",
  ): Promise<T> {
    const database = await this.ready;
    const request = makeRequest(
      database.transaction("kv", mode).objectStore("kv"),
    );
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB request failed"));
    });
  }
}

class UnsupportedTcpFactory implements TcpFactory {
  connect(_options: TcpConnectOptions): Promise<DuplexConnection> {
    return Promise.reject(
      new Error(
        "TCP is unavailable in the web runtime; use WebSocketClientInterface",
      ),
    );
  }

  listen(_options: TcpListenOptions): Promise<TcpListener> {
    return Promise.reject(
      new Error("TCP listen is unavailable in the web runtime"),
    );
  }
}

class UnsupportedUdpFactory implements UdpFactory {
  bind(_host: string, _port: number): Promise<BoundDatagramSocket> {
    return Promise.reject(new Error("UDP is unavailable in the web runtime"));
  }
}

export function webRuntime(options: WebRuntimeOptions = {}): Runtime {
  const indexedDB =
    options.indexedDB ??
    (globalThis as { readonly indexedDB?: WebIndexedDB }).indexedDB;
  if (indexedDB === undefined) {
    throw new Error("IndexedDB is required for the web runtime store");
  }

  return {
    clock: options.clock ?? new WebClock(),
    entropy: options.entropy ?? new WebEntropy(),
    store: new IndexedDbKeyValueStore(
      indexedDB,
      options.storeName ?? "twistedpear-reticulum",
    ),
    tcp: new UnsupportedTcpFactory(),
    udp: new UnsupportedUdpFactory(),
  };
}
