import { networkInterfaces } from "node:os";
import { createSocket, type Socket as DgramSocket } from "node:dgram";
import type { CryptoProvider, PacketInterface, Runtime } from "@twistedpear/reticulum-ts";
import { Identity, Packet, RawPacketInterface, TRUNCATED_HASH_LENGTH, type ReticulumInterfaceOptions } from "@twistedpear/reticulum-ts";
import {
  AUTO_ANNOUNCE_INTERVAL_MS,
  AUTO_BITRATE_GUESS,
  AUTO_DEFAULT_DATA_PORT,
  AUTO_DEFAULT_DISCOVERY_PORT,
  AUTO_DEFAULT_GROUP_ID,
  AUTO_HW_MTU,
  AUTO_PEERING_TIMEOUT_MS,
  AUTO_PEER_JOB_INTERVAL_MS,
  AUTO_REVERSE_PEERING_INTERVAL_MS,
  type AutoInterfaceOptions,
  type AutoInterfacePeerHandle,
  concatBytes,
  deriveMulticastAddress,
  descopeLinkLocal,
  equalBytes,
  MULTICAST_TEMPORARY,
  SCOPE_LINK
} from "./auto-common.js";

export {
  AUTO_ANNOUNCE_INTERVAL_MS,
  AUTO_BITRATE_GUESS,
  AUTO_DEFAULT_DATA_PORT,
  AUTO_DEFAULT_DISCOVERY_PORT,
  AUTO_DEFAULT_GROUP_ID,
  AUTO_HW_MTU,
  AUTO_PEERING_TIMEOUT_MS,
  AUTO_PEER_JOB_INTERVAL_MS,
  AUTO_REVERSE_PEERING_INTERVAL_MS,
  type AutoInterfaceOptions,
  type AutoInterfacePeerHandle
} from "./auto-common.js";

const ANDROID_IGNORE_IFS = new Set(["dummy0", "lo", "tun0"]);
const ALL_IGNORE_IFS = new Set(["lo0"]);

interface AdoptedInterface {
  readonly name: string;
  readonly linkLocalAddress: string;
}

interface PeerRecord {
  readonly ifname: string;
  lastHeard: number;
  lastOutbound: number;
}

class AutoInterfacePeer extends RawPacketInterface implements AutoInterfacePeerHandle {
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
    options: ReticulumInterfaceOptions
  ) {
    super({ ...options, mtu: options.mtu ?? AUTO_HW_MTU }, true, options.outgoing ?? true);
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

  protected async closeInterface(): Promise<void> {
    this.detached = true;
    this.online = false;
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

export class AutoInterface extends RawPacketInterface {
  private readonly groupIdBytes: Uint8Array;
  private readonly discoveryPort: number;
  private readonly dataPort: number;
  private readonly unicastDiscoveryPort: number;
  private readonly multicastAddress: string;
  private readonly adopted: AdoptedInterface[] = [];
  private readonly peers = new Map<string, PeerRecord>();
  private readonly spawned = new Map<string, AutoInterfacePeer>();
  private discoverySockets: DgramSocket[] = [];
  private dataSockets = new Map<string, Awaited<ReturnType<Runtime["udp"]["bind"]>>>();
  private announceTimer: ReturnType<typeof setInterval> | null = null;
  private peerJobTimer: ReturnType<typeof setInterval> | null = null;
  private readonly peeringTimeoutMs: number;
  private finalInitDone = false;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly runtime: Runtime,
    private readonly options: AutoInterfaceOptions
  ) {
    super({ ...options, mtu: options.mtu ?? AUTO_HW_MTU, bitrate: options.bitrate ?? AUTO_BITRATE_GUESS }, true, options.outgoing ?? false);
    const groupId = options.groupId ?? AUTO_DEFAULT_GROUP_ID;
    this.groupIdBytes = new TextEncoder().encode(groupId);
    this.discoveryPort = options.discoveryPort ?? AUTO_DEFAULT_DISCOVERY_PORT;
    this.dataPort = options.dataPort ?? AUTO_DEFAULT_DATA_PORT;
    this.unicastDiscoveryPort = this.discoveryPort + 1;
    this.multicastAddress = deriveMulticastAddress(this.provider, this.groupIdBytes, SCOPE_LINK, MULTICAST_TEMPORARY);
    this.peeringTimeoutMs = options.peeringTimeoutMs ?? AUTO_PEERING_TIMEOUT_MS;
  }

  static async open(provider: CryptoProvider, runtime: Runtime, options: AutoInterfaceOptions): Promise<AutoInterface> {
    const iface = new AutoInterface(provider, runtime, options);
    await iface.start();
    return iface;
  }

  get peerInterfaces(): ReadonlyArray<AutoInterfacePeerHandle> {
    return [...this.spawned.values()];
  }

  async start(): Promise<void> {
    this.adopted.push(...enumerateInterfaces(this.options.allowedDevices ?? [], this.options.ignoredDevices ?? []));
    if (this.adopted.length === 0) {
      return;
    }

    for (const iface of this.adopted) {
      await this.startDiscoverySockets(iface);
      const dataSocket = await this.runtime.udp.bind(iface.linkLocalAddress, this.dataPort);
      this.dataSockets.set(iface.name, dataSocket);
      void this.readDataSocket(iface.name, dataSocket);
    }

    this.announceTimer = setInterval(() => {
      for (const iface of this.adopted) {
        void this.peerAnnounce(iface);
      }
    }, AUTO_ANNOUNCE_INTERVAL_MS);

    this.peerJobTimer = setInterval(() => {
      this.runPeerJobs();
    }, AUTO_PEER_JOB_INTERVAL_MS);

    await new Promise((resolve) => setTimeout(resolve, AUTO_ANNOUNCE_INTERVAL_MS * 1.2));
    this.finalInitDone = true;
    this.online = true;
  }

  protected decodePacket(): Packet | null {
    return null;
  }

  protected async writeBytes(): Promise<void> {
    // Parent AutoInterface does not carry traffic; peers do.
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

    for (const socket of this.discoverySockets) {
      socket.close();
    }

    this.discoverySockets = [];

    for (const socket of this.dataSockets.values()) {
      await socket.close();
    }

    this.dataSockets.clear();
    this.online = false;
  }

  private async startDiscoverySockets(iface: AdoptedInterface): Promise<void> {
    const multicastSocket = createSocket({ type: "udp6", reuseAddr: true });
    multicastSocket.on("message", (data, remote) => {
      this.handleDiscoveryPacket(data, remote.address, iface.name);
    });

    await new Promise<void>((resolve, reject) => {
      multicastSocket.once("error", reject);
      multicastSocket.bind(this.discoveryPort, () => {
        try {
          multicastSocket.addMembership(this.multicastAddress, iface.linkLocalAddress);
        } catch {
          // Some hosts cannot join multicast on all interfaces.
        }

        multicastSocket.off("error", reject);
        resolve();
      });
    });

    const unicastSocket = createSocket({ type: "udp6", reuseAddr: true });
    unicastSocket.on("message", (data, remote) => {
      this.handleDiscoveryPacket(data, remote.address, iface.name, false);
    });

    await new Promise<void>((resolve, reject) => {
      unicastSocket.once("error", reject);
      unicastSocket.bind(this.unicastDiscoveryPort, iface.linkLocalAddress, () => {
        unicastSocket.off("error", reject);
        resolve();
      });
    });

    this.discoverySockets.push(multicastSocket, unicastSocket);
  }

  private handleDiscoveryPacket(data: Buffer, sourceAddress: string, ifname: string, announce = true): void {
    if (!this.finalInitDone) {
      return;
    }

    const hashLength = TRUNCATED_HASH_LENGTH / 8;
    if (data.length < hashLength) {
      return;
    }

    const receivedHash = Uint8Array.from(data.subarray(0, hashLength));
    const expectedHash = Identity.truncatedHash(this.provider, concatBytes(this.groupIdBytes, new TextEncoder().encode(sourceAddress)));
    if (!equalBytes(receivedHash, expectedHash)) {
      return;
    }

    if (this.isLocalAddress(sourceAddress)) {
      return;
    }

    this.addPeer(sourceAddress, ifname);
    if (!announce) {
      void this.reverseAnnounce(ifname, sourceAddress);
    }
  }

  private addPeer(address: string, ifname: string): void {
    const existing = this.peers.get(address);
    if (existing === undefined) {
      this.peers.set(address, { ifname, lastHeard: Date.now(), lastOutbound: Date.now() });
      this.spawnPeer(address, ifname);
      return;
    }

    this.peers.set(address, { ...existing, lastHeard: Date.now() });
  }

  private spawnPeer(address: string, ifname: string): void {
    const peer = new AutoInterfacePeer(
      this.provider,
      address,
      async (data) => {
        const socket = this.dataSockets.get(ifname);
        if (socket === undefined) {
          throw new Error(`Missing data socket for ${ifname}`);
        }

        await socket.send(data, address, this.dataPort);
      },
      () => {
        const record = this.peers.get(address);
        if (record !== undefined) {
          this.peers.set(address, { ...record, lastHeard: Date.now() });
        }
      },
      { name: `${this.name}/${ifname}/${address}`, mtu: this.mtu, outgoing: this.outgoing }
    );

    const previous = this.spawned.get(address);
    if (previous !== undefined) {
      void previous.close();
    }

    this.spawned.set(address, peer);
    this.options.onPeerSpawn?.(peer);
  }

  private async readDataSocket(ifname: string, socket: Awaited<ReturnType<Runtime["udp"]["bind"]>>): Promise<void> {
    for await (const packet of socket.packets) {
      const peer = this.spawned.get(packet.host);
      if (peer !== undefined) {
        peer.receiveFromPeer(packet.data);
      } else {
        this.addPeer(packet.host, ifname);
        const spawned = this.spawned.get(packet.host);
        spawned?.receiveFromPeer(packet.data);
      }
    }
  }

  private async peerAnnounce(iface: AdoptedInterface): Promise<void> {
    const token = Identity.truncatedHash(
      this.provider,
      concatBytes(this.groupIdBytes, new TextEncoder().encode(iface.linkLocalAddress))
    );

    await new Promise<void>((resolve, reject) => {
      const socket = createSocket({ type: "udp6" });
      socket.once("error", reject);
      socket.send(token, this.discoveryPort, this.multicastAddress, (error) => {
        socket.close();
        if (error === undefined || error === null) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  private async reverseAnnounce(ifname: string, peerAddress: string): Promise<void> {
    const adopted = this.adopted.find((candidate) => candidate.name === ifname);
    if (adopted === undefined) {
      return;
    }

    const token = Identity.truncatedHash(
      this.provider,
      concatBytes(this.groupIdBytes, new TextEncoder().encode(adopted.linkLocalAddress))
    );

    await new Promise<void>((resolve, reject) => {
      const socket = createSocket({ type: "udp6" });
      socket.once("error", reject);
      socket.send(token, this.unicastDiscoveryPort, peerAddress, (error) => {
        socket.close();
        if (error === undefined || error === null) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
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
    return this.adopted.some((iface) => iface.linkLocalAddress === descopeLinkLocal(address));
  }
}

function enumerateInterfaces(allowed: ReadonlyArray<string>, ignored: ReadonlyArray<string>): AdoptedInterface[] {
  const allowedSet = new Set(allowed);
  const ignoredSet = new Set([...ignored, ...ANDROID_IGNORE_IFS, ...ALL_IGNORE_IFS]);
  const interfaces: AdoptedInterface[] = [];

  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (addresses === undefined) {
      continue;
    }

    if (ignoredSet.has(name)) {
      continue;
    }

    if (allowedSet.size > 0 && !allowedSet.has(name)) {
      continue;
    }

    for (const address of addresses) {
      if (address.family !== "IPv6" || !address.address.startsWith("fe80:")) {
        continue;
      }

      interfaces.push({ name, linkLocalAddress: descopeLinkLocal(address.address) });
      break;
    }
  }

  return interfaces;
}
