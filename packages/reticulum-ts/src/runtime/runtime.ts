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

export interface TcpConnectOptions {
  readonly host: string;
  readonly port: number;
  readonly connectTimeoutMs?: number;
}

export interface TcpListenOptions {
  readonly host: string;
  readonly port: number;
}

export interface TcpListener {
  readonly address: { readonly host: string; readonly port: number };
  accept(): AsyncIterable<DuplexConnection>;
  close(): Promise<void>;
}

export interface TcpFactory {
  connect(options: TcpConnectOptions): Promise<DuplexConnection>;
  listen(options: TcpListenOptions): Promise<TcpListener>;
}

export interface DatagramPacket {
  readonly data: Uint8Array;
  readonly host: string;
  readonly port: number;
}

export interface BoundDatagramSocket {
  readonly packets: AsyncIterable<DatagramPacket>;
  send(data: Uint8Array, host: string, port: number): Promise<void>;
  close(): Promise<void>;
}

export interface UdpFactory {
  bind(host: string, port: number): Promise<BoundDatagramSocket>;
}

export interface Runtime {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly tcp: TcpFactory;
  readonly udp: UdpFactory;
}
