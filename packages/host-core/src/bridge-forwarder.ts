import { bytesToHex } from "@twistedpear/reticulum-ts";
import type { CryptoProvider, Packet, PacketInterface } from "@twistedpear/reticulum-ts";
import { Packet as PacketClass } from "@twistedpear/reticulum-ts";
import type { RelayInterfaceKind, RelayPolicyMatrix } from "./types.js";
import { inferInterfaceKind } from "@twistedpear/reticulum-interfaces";

export interface BridgeForwarderOptions {
  readonly provider: CryptoProvider;
  readonly getInterfaces: () => ReadonlyArray<PacketInterface>;
  readonly getPolicy: () => RelayPolicyMatrix;
  readonly bytesPerSecond?: number;
  readonly maxRecentHashes?: number;
  readonly now?: () => number;
}

class SimpleTokenBucket {
  private tokens: number;
  private lastUpdate: number;
  constructor(
    private readonly rate: number,
    private readonly now: () => number
  ) {
    this.tokens = rate;
    this.lastUpdate = now();
  }
  async consume(bytes: number): Promise<void> {
    const nowMs = this.now();
    const elapsed = (nowMs - this.lastUpdate) / 1000;
    this.tokens = Math.min(this.rate, this.tokens + elapsed * this.rate);
    this.lastUpdate = nowMs;
    if (bytes > this.tokens) {
      const waitMs = ((bytes - this.tokens) / this.rate) * 1000;
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      this.tokens = 0;
    } else {
      this.tokens -= bytes;
    }
  }
}

export class BridgeForwarder {
  private readonly provider: CryptoProvider;
  private readonly getInterfaces: () => ReadonlyArray<PacketInterface>;
  private readonly getPolicy: () => RelayPolicyMatrix;
  private readonly bytesPerSecond: number;
  private readonly limiters = new Map<string, SimpleTokenBucket>();
  private readonly recentHashes = new Set<string>();
  private readonly maxRecentHashes: number;
  private readonly now: () => number;
  private readonly consumers = new Map<PacketInterface, Promise<void>>();
  private running = false;

  constructor(options: BridgeForwarderOptions) {
    this.provider = options.provider;
    this.getInterfaces = options.getInterfaces;
    this.getPolicy = options.getPolicy;
    this.bytesPerSecond = options.bytesPerSecond ?? 64_000;
    this.maxRecentHashes = options.maxRecentHashes ?? 4096;
    this.now = options.now ?? Date.now;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    for (const iface of this.getInterfaces()) {
      this.attach(iface);
    }
  }

  /** Attach interfaces added while bridge mode remains active. */
  refresh(): void {
    if (!this.running) return;
    for (const iface of this.getInterfaces()) this.attach(iface);
  }

  stop(): void {
    this.running = false;
    for (const [iface] of this.consumers) {
      this.detach(iface);
    }
    this.consumers.clear();
    this.recentHashes.clear();
    this.limiters.clear();
  }

  attach(iface: PacketInterface): void {
    if (!this.running || !iface.incoming) return;
    if (this.consumers.has(iface)) return;
    const consumer = (async () => {
      try {
        for await (const packet of iface.packets) {
          if (!this.running) return;
          await this.onPacket(packet, iface);
        }
      } catch {
        // Interface closed; detach quietly.
      }
    })();
    this.consumers.set(iface, consumer);
  }

  detach(iface: PacketInterface): void {
    this.consumers.delete(iface);
  }

  private async onPacket(packet: Packet, from: PacketInterface): Promise<void> {
    if (packet.hops <= 0) return;
    const hash = this.dedupHash(packet);
    if (this.recentHashes.has(hash)) return;
    this.recentHashes.add(hash);
    if (this.recentHashes.size > this.maxRecentHashes) {
      const oldest = this.recentHashes.values().next().value;
      if (oldest !== undefined) this.recentHashes.delete(oldest);
    }

    const relayed = this.decrementHops(packet);
    if (relayed === null) return;

    const fromKind = inferInterfaceKind(from.name) as RelayInterfaceKind;
    const targets = this.getInterfaces().filter(
      (candidate) => candidate !== from && candidate.outgoing && this.isRelayAllowed(fromKind, candidate)
    );

    await Promise.all(
      targets.map(async (target) => {
        try {
          await this.limiterFor(fromKind, inferInterfaceKind(target.name) as RelayInterfaceKind).consume(packet.raw.length);
          await target.send(relayed);
        } catch {
          // Transient failure on one interface must not stop fan-out.
        }
      })
    );
  }

  private limiterFor(from: RelayInterfaceKind, to: RelayInterfaceKind): SimpleTokenBucket {
    const key = `${from}->${to}`;
    let limiter = this.limiters.get(key);
    if (limiter === undefined) {
      limiter = new SimpleTokenBucket(this.bytesPerSecond, this.now);
      this.limiters.set(key, limiter);
    }
    return limiter;
  }

  private decrementHops(packet: Packet): Packet | null {
    if (packet.hops <= 0) return null;
    const nextHops = packet.hops - 1;
    if (nextHops <= 0) return null;
    try {
      const fields = {
        headerType: packet.headerType,
        contextFlag: packet.contextFlag,
        transportType: packet.transportType,
        destinationType: packet.destinationType,
        packetType: packet.packetType,
        destinationHash: packet.destinationHash,
        context: packet.context,
        data: packet.data,
        hops: nextHops
      };
      if (packet.transportId !== null) {
        return PacketClass.fromFields(this.provider, { ...fields, transportId: packet.transportId });
      }
      return PacketClass.fromFields(this.provider, fields);
    } catch {
      return null;
    }
  }

  /** A relay loop key must not change merely because a bridge decremented hops. */
  private dedupHash(packet: Packet): string {
    try {
      const fields = {
        headerType: packet.headerType,
        contextFlag: packet.contextFlag,
        transportType: packet.transportType,
        destinationType: packet.destinationType,
        packetType: packet.packetType,
        destinationHash: packet.destinationHash,
        context: packet.context,
        data: packet.data,
        hops: 0
      };
      const normalized = packet.transportId === null
        ? PacketClass.fromFields(this.provider, fields)
        : PacketClass.fromFields(this.provider, { ...fields, transportId: packet.transportId });
      return bytesToHex(normalized.hash());
    } catch {
      return bytesToHex(packet.hash());
    }
  }

  private isRelayAllowed(fromKind: RelayInterfaceKind, to: PacketInterface): boolean {
    const toKind = inferInterfaceKind(to.name) as RelayInterfaceKind;
    const allow = this.getPolicy().allow?.[fromKind]?.[toKind];
    return allow !== false;
  }
}
