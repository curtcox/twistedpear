import type {
  MulticastBridge,
  MulticastBridgeEvents,
  MulticastNetworkInfo,
} from "@twistedpear/reticulum-interfaces";

// The bridges class wires worklet IPC messages to Node-only network bridges.
// Faking those bridges keeps the tests off real sockets/mDNS/serial ports
// while exercising the full dispatch surface.
export class FakeMulticast implements MulticastBridge {
  interfaces: ReadonlyArray<MulticastNetworkInfo> = [];
  events: MulticastBridgeEvents = {};
  started = 0;
  stopped = 0;
  joined: unknown[] = [];
  bound: unknown[] = [];
  sent: unknown[] = [];
  unicast: unknown[] = [];

  async start(): Promise<void> {
    this.started += 1;
  }
  async stop(): Promise<void> {
    this.stopped += 1;
  }
  async joinGroup(
    ifname: string,
    groupAddress: string,
    port: number,
  ): Promise<void> {
    this.joined.push({ ifname, groupAddress, port });
  }
  async bindPort(ifname: string, port: number): Promise<void> {
    this.bound.push({ ifname, port });
  }
  async send(
    ifname: string,
    groupAddress: string,
    port: number,
    data: Uint8Array,
  ): Promise<void> {
    this.sent.push({ ifname, groupAddress, port, data });
  }
  async sendUnicast(
    ifname: string,
    targetAddress: string,
    port: number,
    data: Uint8Array,
  ): Promise<void> {
    this.unicast.push({ ifname, targetAddress, port, data });
  }
  setEvents(events: MulticastBridgeEvents): void {
    this.events = events;
  }
}

export class FakeBonjour {
  events: Record<string, unknown> = {};
  started: string[] = [];
  stopped = 0;
  advertised: unknown[] = [];

  async start(serviceType: string): Promise<void> {
    this.started.push(serviceType);
  }
  async stop(): Promise<void> {
    this.stopped += 1;
  }
  async advertise(record: unknown): Promise<void> {
    this.advertised.push(record);
  }
  setEvents(events: Record<string, unknown>): void {
    this.events = events;
  }
}

export class FakeSerialPipe {
  events: Record<string, (...args: unknown[]) => void> = {};
  connected = false;
  opened = 0;
  closed = 0;
  written: Uint8Array[] = [];
  static failToOpen = false;

  async open(): Promise<void> {
    this.opened += 1;
    if (FakeSerialPipe.failToOpen) throw new Error("no such device");
    this.connected = true;
  }
  async close(): Promise<void> {
    this.closed += 1;
  }
  async write(data: Uint8Array): Promise<void> {
    this.written.push(data);
  }
  setEvents(events: Record<string, (...args: unknown[]) => void>): void {
    this.events = events;
  }
}
