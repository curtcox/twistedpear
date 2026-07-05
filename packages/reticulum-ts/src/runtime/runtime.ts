export interface Timer {
  cancel(): void;
}

export interface Clock {
  now(): number;
  setTimeout(callback: () => void, milliseconds: number): Timer;
}

export interface KeyValueStore {
  get(key: string): Promise<Uint8Array | undefined>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface DuplexConnection {
  readonly readable: AsyncIterable<Uint8Array>;
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

export interface DatagramSocket {
  send(data: Uint8Array, host: string, port: number): Promise<void>;
  close(): Promise<void>;
}

export interface Runtime {
  readonly clock: Clock;
  readonly store: KeyValueStore;
}
