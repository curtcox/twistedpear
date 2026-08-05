import { BONJOUR_RETICULUM_SERVICE, type DiscoveryPeer, type DiscoveryProvider, type DiscoveryProviderEvents } from "./auto-discovery.js";
import type { MulticastNetworkInfo } from "./pipes.js";

export interface BonjourServiceRecord {
  readonly id: string;
  readonly ifname: string;
  readonly host: string;
  readonly port: number;
}

export interface BonjourBridgeEvents {
  readonly onServiceFound?: (record: BonjourServiceRecord) => void;
  readonly onServiceLost?: (id: string) => void;
  readonly onNetworkChange?: (interfaces: ReadonlyArray<MulticastNetworkInfo>) => void;
  readonly onError?: (message: string) => void;
}

export interface BonjourBridge {
  readonly interfaces: ReadonlyArray<MulticastNetworkInfo>;
  start(serviceType: string): Promise<void>;
  stop(): Promise<void>;
  advertise(record: BonjourServiceRecord): Promise<void>;
  setEvents(events: BonjourBridgeEvents): void;
}

export class BonjourDiscoveryProvider implements DiscoveryProvider {
  readonly kind = "bonjour";
  private events: DiscoveryProviderEvents = {};

  constructor(private readonly bridge: BonjourBridge) {}

  get interfaces(): ReadonlyArray<MulticastNetworkInfo> {
    return this.bridge.interfaces;
  }

  get available(): boolean {
    return true;
  }

  setEvents(events: DiscoveryProviderEvents): void {
    this.events = events;
    this.bridge.setEvents({
      onServiceFound: (record) => this.events.onPeer?.(serviceRecordToPeer(record)),
      onNetworkChange: (interfaces) => this.events.onNetworkChange?.(interfaces),
      onError: (message) => this.events.onError?.(new Error(message))
    });
  }

  async start(): Promise<void> {
    await this.bridge.start(BONJOUR_RETICULUM_SERVICE);
  }

  async stop(): Promise<void> {
    await this.bridge.stop();
  }

  async advertise(ifname: string, address: string, dataPort: number): Promise<void> {
    await this.bridge.advertise({
      id: `${ifname}:${address}:${dataPort}`,
      ifname,
      host: address,
      port: dataPort
    });
  }
}

export function serviceRecordToPeer(record: BonjourServiceRecord): DiscoveryPeer {
  return {
    id: record.id,
    ifname: record.ifname,
    address: record.host,
    dataPort: record.port,
    discoveredAt: Date.now(),
    provider: "bonjour"
  };
}
