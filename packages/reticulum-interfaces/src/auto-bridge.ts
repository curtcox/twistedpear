import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import {
  Identity,
  Packet,
  RawPacketInterface,
  type ReticulumInterfaceOptions,
} from "@twistedpear/reticulum-ts";
import {
  AUTO_ANNOUNCE_INTERVAL_MS,
  AUTO_BITRATE_GUESS,
  AUTO_DEFAULT_DATA_PORT,
  AUTO_DEFAULT_DISCOVERY_PORT,
  AUTO_DEFAULT_GROUP_ID,
  AUTO_HW_MTU,
  AUTO_PEERING_TIMEOUT_MS,
  AUTO_REVERSE_PEERING_INTERVAL_MS,
  type AutoInterfaceOptions,
  type AutoInterfacePeerHandle,
  concatBytes,
  deriveMulticastAddress,
  descopeLinkLocal,
  equalBytes,
  MULTICAST_TEMPORARY,
  SCOPE_LINK,
} from "./auto-common.js";
import type { MulticastBridge, MulticastNetworkInfo } from "./pipes.js";

export interface AutoInterfaceBridgeOptions extends AutoInterfaceOptions {
  readonly bridge: MulticastBridge;
  readonly onAdvertiseInterface?: (iface: {
    readonly name: string;
    readonly linkLocalAddress: string;
  }) => Promise<void> | void;
}

interface AdoptedInterface {
  readonly name: string;
  readonly linkLocalAddress: string;
}

interface PeerRecord {
  readonly ifname: string;
  lastHeard: number;
  lastOutbound: number;
}

class AutoInterfacePeer
  extends RawPacketInterface
  implements AutoInterfacePeerHandle
{
  readonly peerAddress: string;
  private readonly provider: CryptoProvider;
  private readonly sendPacket: (data: Uint8Array) => Promise<void>;
  private readonly onHeard: () => void;
  private detached = false;

  constructor(
    provider: CryptoProvider,
    peerAddress: string,
    sendPacket: (data: Uint8Array) => Promise<void>,
    onHeard: () => void,
    options: ReticulumInterfaceOptions,
  ) {
    super(
      { ...options, mtu: options.mtu ?? AUTO_HW_MTU },
      options.incoming ?? true,
      options.outgoing ?? true,
    );
    this.provider = provider;
    this.peerAddress = peerAddress;
    this.sendPacket = sendPacket;
    this.onHeard = onHeard;
    this.online = true;
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected async writeBytes(bytes: Uint8Array): Promise<void> {
    await this.sendPacket(bytes);
  }

  protected closeInterface(): Promise<void> {
    this.detached = true;
    this.online = false;
    return Promise.resolve();
  }

  receiveFromPeer(data: Uint8Array): void {
    if (this.detached || !this.online) {
      return;
    }

    this.onHeard();
    this.receiveBytes(data);
  }

  detach(): void {
    this.detached = true;
    this.online = false;
  }
}

/** AutoInterface backed by a native MulticastBridge (Android/mobile). */
export class AutoInterfaceBridge extends RawPacketInterface {
  private readonly groupIdBytes: Uint8Array;
  private readonly discoveryPort: number;
  private readonly dataPort: number;
  private readonly unicastDiscoveryPort: number;
  private readonly multicastAddress: string;
  private readonly adopted: AdoptedInterface[] = [];
  private readonly peers = new Map<string, PeerRecord>();
  private readonly spawned = new Map<string, AutoInterfacePeer>();
  private announceTimer: ReturnType<typeof setInterval> | null = null;
  private peerJobTimer: ReturnType<typeof setInterval> | null = null;
  private readonly peeringTimeoutMs: number;
  private finalInitDone = false;
  private bridgeStarted = false;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly bridge: MulticastBridge,
    private readonly options: AutoInterfaceBridgeOptions,
  ) {
    super(
      {
        ...options,
        mtu: options.mtu ?? AUTO_HW_MTU,
        bitrate: options.bitrate ?? AUTO_BITRATE_GUESS,
      },
      options.incoming ?? true,
      options.outgoing ?? false,
    );
    const groupId = options.groupId ?? AUTO_DEFAULT_GROUP_ID;
    this.groupIdBytes = new TextEncoder().encode(groupId);
    this.discoveryPort = options.discoveryPort ?? AUTO_DEFAULT_DISCOVERY_PORT;
    this.dataPort = options.dataPort ?? AUTO_DEFAULT_DATA_PORT;
    this.unicastDiscoveryPort = this.discoveryPort + 1;
    this.multicastAddress = deriveMulticastAddress(
      this.provider,
      this.groupIdBytes,
      SCOPE_LINK,
      MULTICAST_TEMPORARY,
    );
    this.peeringTimeoutMs = options.peeringTimeoutMs ?? AUTO_PEERING_TIMEOUT_MS;
  }

  static async open(
    provider: CryptoProvider,
    options: AutoInterfaceBridgeOptions,
  ): Promise<AutoInterfaceBridge> {
    const iface = new AutoInterfaceBridge(provider, options.bridge, options);
    await iface.start();
    return iface;
  }

  get peerInterfaces(): ReadonlyArray<AutoInterfacePeerHandle> {
    return [...this.spawned.values()];
  }

  /** Register a peer discovered by an alternate provider (for example Bonjour). */
  notifyPeerDiscovered(address: string, ifname: string): void {
    if (!this.finalInitDone) {
      return;
    }

    if (this.isLocalAddress(address)) {
      return;
    }

    this.addPeer(descopeLinkLocal(address), ifname);
  }

  /** Advertise the current link-local interfaces on alternate discovery providers. */
  async advertiseDiscovery(): Promise<void> {
    for (const iface of this.adopted) {
      await this.options.onAdvertiseInterface?.(iface);
    }
  }

  async start(): Promise<void> {
    this.bridge.setEvents({
      onPacket: (ifname, data, sourceAddress, port) => {
        this.handleBridgePacket(ifname, data, sourceAddress, port);
      },
      onNetworkChange: (interfaces) => {
        void this.syncInterfaces(interfaces);
      },
    });

    if (!this.bridgeStarted) {
      await this.bridge.start();
      this.bridgeStarted = true;
    }

    await this.syncInterfaces(this.bridge.interfaces);
    if (this.adopted.length === 0) {
      return;
    }

    this.announceTimer = setInterval(() => {
      for (const iface of this.adopted) {
        void this.peerAnnounce(iface);
      }
    }, AUTO_ANNOUNCE_INTERVAL_MS);

    this.peerJobTimer = setInterval(() => {
      this.runPeerJobs();
    }, 4_000);

    await new Promise((resolve) =>
      setTimeout(resolve, AUTO_ANNOUNCE_INTERVAL_MS * 1.2),
    );
    this.finalInitDone = true;
    this.online = true;
  }

  protected decodePacket(): Packet | null {
    return null;
  }

  protected writeBytes(): Promise<void> {
    // Parent AutoInterface does not carry traffic; peers do.
    return Promise.resolve();
  }

  protected async closeInterface(): Promise<void> {
    if (this.announceTimer !== null) {
      clearInterval(this.announceTimer);
      this.announceTimer = null;
    }

    if (this.peerJobTimer !== null) {
      clearInterval(this.peerJobTimer);
      this.peerJobTimer = null;
    }

    for (const peer of this.spawned.values()) {
      await peer.close();
    }

    this.spawned.clear();
    this.peers.clear();
    this.adopted.length = 0;

    if (this.bridgeStarted) {
      await this.bridge.stop();
      this.bridgeStarted = false;
    }

    this.online = false;
  }

  private async syncInterfaces(
    interfaces: ReadonlyArray<MulticastNetworkInfo>,
  ): Promise<void> {
    const next = interfaces.map((iface) => ({
      name: iface.name,
      linkLocalAddress: descopeLinkLocal(iface.linkLocalAddress),
    }));
    const previous = new Set(this.adopted.map((iface) => iface.name));
    this.adopted.length = 0;
    this.adopted.push(...next);

    for (const iface of next) {
      if (previous.has(iface.name)) {
        continue;
      }

      await this.bridge.joinGroup(
        iface.name,
        this.multicastAddress,
        this.discoveryPort,
      );
      await this.bridge.bindPort(iface.name, this.unicastDiscoveryPort);
      await this.bridge.bindPort(iface.name, this.dataPort);
    }

    await this.advertiseDiscovery();
  }

  private handleBridgePacket(
    ifname: string,
    data: Uint8Array,
    sourceAddress: string,
    port: number,
  ): void {
    if (port === this.discoveryPort || port === this.unicastDiscoveryPort) {
      this.handleDiscoveryPacket(
        data,
        sourceAddress,
        ifname,
        port === this.discoveryPort,
      );
      return;
    }

    if (port === this.dataPort) {
      const peer = this.spawned.get(descopeLinkLocal(sourceAddress));
      if (peer !== undefined) {
        peer.receiveFromPeer(data);
      } else {
        this.addPeer(descopeLinkLocal(sourceAddress), ifname);
        const spawned = this.spawned.get(descopeLinkLocal(sourceAddress));
        spawned?.receiveFromPeer(data);
      }
    }
  }

  private handleDiscoveryPacket(
    data: Uint8Array,
    sourceAddress: string,
    ifname: string,
    announce = true,
  ): void {
    if (!this.finalInitDone) {
      return;
    }

    // RNS AutoInterface uses Identity.full_hash (32 bytes), not the truncated hash.
    const expectedHash = Identity.fullHash(
      this.provider,
      concatBytes(this.groupIdBytes, new TextEncoder().encode(sourceAddress)),
    );
    if (data.length < expectedHash.length) {
      return;
    }

    const receivedHash = Uint8Array.from(data.subarray(0, expectedHash.length));
    if (!equalBytes(receivedHash, expectedHash)) {
      return;
    }

    if (this.isLocalAddress(sourceAddress)) {
      return;
    }

    this.addPeer(descopeLinkLocal(sourceAddress), ifname);
    if (!announce) {
      void this.reverseAnnounce(ifname, descopeLinkLocal(sourceAddress));
    }
  }

  private addPeer(address: string, ifname: string): void {
    const existing = this.peers.get(address);
    if (existing === undefined) {
      this.peers.set(address, {
        ifname,
        lastHeard: Date.now(),
        lastOutbound: Date.now(),
      });
      this.spawnPeer(address, ifname);
      return;
    }

    this.peers.set(address, { ...existing, lastHeard: Date.now() });
  }

  private spawnPeer(address: string, ifname: string): void {
    const peer = new AutoInterfacePeer(
      this.provider,
      address,
      async (payload) => {
        await this.bridge.sendUnicast(ifname, address, this.dataPort, payload);
      },
      () => {
        const record = this.peers.get(address);
        if (record !== undefined) {
          this.peers.set(address, { ...record, lastHeard: Date.now() });
        }
      },
      {
        name: `${this.name}/${ifname}/${address}`,
        mtu: this.mtu,
        outgoing: true,
      },
    );

    const previous = this.spawned.get(address);
    if (previous !== undefined) {
      void previous.close();
    }

    this.spawned.set(address, peer);
    this.options.onPeerSpawn?.(peer);
  }

  private async peerAnnounce(iface: AdoptedInterface): Promise<void> {
    // Must match RNS AutoInterface.peer_announce: full_hash, not truncated.
    const token = Identity.fullHash(
      this.provider,
      concatBytes(
        this.groupIdBytes,
        new TextEncoder().encode(iface.linkLocalAddress),
      ),
    );

    await this.bridge.send(
      iface.name,
      this.multicastAddress,
      this.discoveryPort,
      token,
    );
  }

  private async reverseAnnounce(
    ifname: string,
    peerAddress: string,
  ): Promise<void> {
    const adopted = this.adopted.find((candidate) => candidate.name === ifname);
    if (adopted === undefined) {
      return;
    }

    const token = Identity.fullHash(
      this.provider,
      concatBytes(
        this.groupIdBytes,
        new TextEncoder().encode(adopted.linkLocalAddress),
      ),
    );

    await this.bridge.sendUnicast(
      ifname,
      peerAddress,
      this.unicastDiscoveryPort,
      token,
    );
  }

  private runPeerJobs(): void {
    const now = Date.now();
    for (const [address, peer] of this.peers.entries()) {
      if (now > peer.lastHeard + this.peeringTimeoutMs) {
        this.peers.delete(address);
        const spawned = this.spawned.get(address);
        if (spawned !== undefined) {
          this.options.onPeerDetach?.(spawned);
          spawned.detach();
          void spawned.close();
          this.spawned.delete(address);
        }

        continue;
      }

      if (now > peer.lastOutbound + AUTO_REVERSE_PEERING_INTERVAL_MS) {
        void this.reverseAnnounce(peer.ifname, address);
        this.peers.set(address, { ...peer, lastOutbound: now });
      }
    }
  }

  private isLocalAddress(address: string): boolean {
    return this.adopted.some(
      (iface) => iface.linkLocalAddress === descopeLinkLocal(address),
    );
  }
}
