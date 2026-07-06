/**
 * Native bridge abstractions for Phase 2 interfaces.
 * Native modules expose byte streams; protocol logic stays in TypeScript.
 */

export interface PipeStats {
  readonly bytesIn: number;
  readonly bytesOut: number;
  readonly connected: boolean;
}

export interface BlePipeEvents {
  readonly onData?: (data: Uint8Array) => void;
  readonly onConnect?: () => void;
  readonly onDisconnect?: () => void;
  readonly onError?: (error: Error) => void;
}

/** Half-duplex reliable byte pipe over BLE GATT (central or peripheral role). */
export interface BlePipe {
  readonly mtu: number;
  readonly connected: boolean;
  readonly stats: PipeStats;
  start(): Promise<void>;
  stop(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  setEvents(events: BlePipeEvents): void;
}

export interface SerialPipeEvents {
  readonly onData?: (data: Uint8Array) => void;
  readonly onConnect?: () => void;
  readonly onDisconnect?: () => void;
  readonly onError?: (error: Error) => void;
}

/** Raw serial byte pipe (USB or BLE UART transport). */
export interface SerialPipe {
  readonly connected: boolean;
  readonly stats: PipeStats;
  open(): Promise<void>;
  close(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  setEvents(events: SerialPipeEvents): void;
}

export interface MulticastNetworkInfo {
  readonly name: string;
  readonly linkLocalAddress: string;
}

export interface MulticastBridgeEvents {
  readonly onPacket?: (ifname: string, data: Uint8Array, sourceAddress: string, port: number) => void;
  readonly onNetworkChange?: (interfaces: ReadonlyArray<MulticastNetworkInfo>) => void;
}

/** Android/desktop multicast bridge for AutoInterface. */
export interface MulticastBridge {
  readonly interfaces: ReadonlyArray<MulticastNetworkInfo>;
  start(): Promise<void>;
  stop(): Promise<void>;
  joinGroup(ifname: string, groupAddress: string, port: number): Promise<void>;
  bindPort(ifname: string, port: number): Promise<void>;
  send(ifname: string, groupAddress: string, port: number, data: Uint8Array): Promise<void>;
  sendUnicast(ifname: string, targetAddress: string, port: number, data: Uint8Array): Promise<void>;
  setEvents(events: MulticastBridgeEvents): void;
}
