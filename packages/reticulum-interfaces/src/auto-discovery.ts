import type { MulticastBridge, MulticastNetworkInfo } from "./pipes.js";

export const BONJOUR_RETICULUM_SERVICE = "_reticulum._udp";

export interface DiscoveryPeer {
  readonly id: string;
  readonly ifname: string;
  readonly address: string;
  readonly dataPort: number;
  readonly discoveredAt: number;
  readonly provider: DiscoveryProviderKind;
}

export type DiscoveryProviderKind = "multicast" | "bonjour";

export interface DiscoveryProviderEvents {
  readonly onPeer?: (peer: DiscoveryPeer) => void;
  readonly onNetworkChange?: (interfaces: ReadonlyArray<MulticastNetworkInfo>) => void;
  readonly onError?: (error: Error) => void;
}

export interface DiscoveryProvider {
  readonly kind: DiscoveryProviderKind;
  readonly interfaces: ReadonlyArray<MulticastNetworkInfo>;
  readonly available: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  advertise(ifname: string, address: string, dataPort: number): Promise<void>;
  setEvents(events: DiscoveryProviderEvents): void;
}

export interface DiscoverySelection {
  readonly primary: DiscoveryProviderKind | null;
  readonly active: ReadonlyArray<DiscoveryProviderKind>;
}

export function selectDiscoveryProviders(options: {
  readonly multicastAvailable: boolean;
  readonly multicastEntitled?: boolean;
  readonly bonjourAvailable: boolean;
  readonly allowConcurrent?: boolean;
}): DiscoverySelection {
  const multicastUsable = options.multicastAvailable && options.multicastEntitled !== false;
  const active: DiscoveryProviderKind[] = [];

  if (multicastUsable) {
    active.push("multicast");
  }

  if (options.bonjourAvailable && (!multicastUsable || options.allowConcurrent === true)) {
    active.push("bonjour");
  }

  return {
    primary: active[0] ?? null,
    active
  };
}

export class MulticastDiscoveryProvider implements DiscoveryProvider {
  readonly kind = "multicast";
  private events: DiscoveryProviderEvents = {};

  constructor(private readonly bridge: MulticastBridge) {}

  get interfaces(): ReadonlyArray<MulticastNetworkInfo> {
    return this.bridge.interfaces;
  }

  get available(): boolean {
    return this.bridge.interfaces.length > 0;
  }

  setEvents(events: DiscoveryProviderEvents): void {
    this.events = events;
    this.bridge.setEvents({
      onNetworkChange: (interfaces) => this.events.onNetworkChange?.(interfaces),
      onPacket: () => {}
    });
  }

  async start(): Promise<void> {
    await this.bridge.start();
  }

  async stop(): Promise<void> {
    await this.bridge.stop();
  }

  async advertise(ifname: string, address: string, dataPort: number): Promise<void> {
    void address;
    await this.bridge.bindPort(ifname, dataPort);
  }
}
