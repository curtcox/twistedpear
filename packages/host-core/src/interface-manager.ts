import {
  bytesToHex,
  registerWebSocketServerInterface,
  type ByteRateLimiter,
  type CryptoProvider,
  type PacketInterface,
  type Runtime,
  type Reticulum
} from "@twistedpear/reticulum-ts";
import {
  AutoInterface,
  BonjourDiscoveryProvider,
  BleInterface,
  OpticalInterface,
  AcousticInterface,
  FreenetInterface,
  FREENET_DEFAULT_BITRATE,
  DEFAULT_INTERFACE_BITRATES,
  inferInterfaceKind
} from "@twistedpear/reticulum-interfaces";
import type { OpticalChannel, AcousticChannel } from "@twistedpear/reticulum-interfaces";
import { createMdnsBonjourBridge } from "@twistedpear/reticulum-interfaces/bonjour-mdns";
import type { BlePipe } from "@twistedpear/reticulum-interfaces";
import { FreenetContractPacketLogBackend } from "@twistedpear/bridge-freenet";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import type {
  AcousticInterfaceConfig,
  BluetoothInterfaceConfig,
  FreenetInterfaceConfig,
  HostConfig,
  HostRelayConfig,
  InterfaceDirection,
  InterfaceStatus,
  NtfyInterfaceConfig,
  OpticalInterfaceConfig,
  RelayInterfaceKind,
  RelayMode,
  RelayPolicyMatrix,
  TcpInterfaceConfig,
  WebSocketInterfaceConfig
} from "./types.js";
import { BridgeForwarder } from "./bridge-forwarder.js";
import { NtfyPacketInterface } from "./ntfy-interface.js";

export type { InterfaceStatus } from "./types.js";

export interface InterfaceEffectFactories {
  readonly bluetooth?: { createPipe(config: BluetoothInterfaceConfig): Promise<BlePipe> };
  readonly optical?: { createChannel(config: OpticalInterfaceConfig): Promise<OpticalChannel> };
  readonly acoustic?: { createChannel(config: AcousticInterfaceConfig): Promise<AcousticChannel> };
}

const EFFECT_KINDS: ReadonlyArray<RelayInterfaceKind> = ["bluetooth", "optical", "acoustic"];

let packetLogWasmCache: Uint8Array | null = null;

function loadPacketLogWasm(): Uint8Array {
  if (packetLogWasmCache !== null) return packetLogWasmCache;
  const require = createRequire(import.meta.url);
  const packageJson = require.resolve("@twistedpear/bridge-freenet/package.json");
  const wasmPath = join(
    dirname(packageJson),
    "contract/packet-log/packet-log-contract.wasm"
  );
  packetLogWasmCache = Uint8Array.from(readFileSync(wasmPath));
  return packetLogWasmCache;
}

function hexToBytesLocal(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Freenet rendezvousHex must be even-length hex");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

export type { OpticalChannel, AcousticChannel } from "@twistedpear/reticulum-interfaces";

export interface InterfaceManagerOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly inboundBandwidthLimiter?: ByteRateLimiter;
  readonly outboundBandwidthLimiter?: ByteRateLimiter;
  readonly effects?: InterfaceEffectFactories;
  readonly onChange?: (status: ReadonlyArray<InterfaceStatus>) => void;
}

export interface ManagedInterface {
  readonly kind: RelayInterfaceKind;
  readonly iface: PacketInterface;
  readonly config: unknown;
  readonly bytesIn: number;
  readonly bytesOut: number;
}

export type InterfaceDiagnosticState = "available" | "permission-required" | "unsupported" | "offline" | "policy-disabled";

export interface InterfaceDiagnostic {
  readonly kind: RelayInterfaceKind;
  readonly state: InterfaceDiagnosticState;
  readonly reason?: string;
}

function directionToFlags(direction: InterfaceDirection): { incoming: boolean; outgoing: boolean } {
  switch (direction) {
    case "tx":
      return { incoming: false, outgoing: true };
    case "rx":
      return { incoming: true, outgoing: false };
    case "both":
    default:
      return { incoming: true, outgoing: true };
  }
}

function normalizeDirection(direction?: InterfaceDirection): InterfaceDirection {
  return direction ?? "both";
}

function normalizeRelay(relay?: boolean): boolean {
  return relay ?? true;
}

export class InterfaceManager {
  private readonly reticulum: Reticulum;
  private readonly provider: CryptoProvider;
  private readonly runtime: Runtime;
  private readonly inboundBandwidthLimiter: ByteRateLimiter | undefined;
  private readonly outboundBandwidthLimiter: ByteRateLimiter | undefined;
  private readonly effects: InterfaceEffectFactories;
  private readonly onChange: ((status: ReadonlyArray<InterfaceStatus>) => void) | undefined;

  private config: HostConfig | null = null;
  private readonly interfaces = new Map<RelayInterfaceKind, ManagedInterface>();
  private readonly servers = new Map<RelayInterfaceKind, { close(): Promise<void>; address?: { port: number } | null }>();
  private readonly bridge: BridgeForwarder;
  private bonjour: BonjourDiscoveryProvider | null = null;
  private dhtRelaySession: { close(): Promise<void> } | null = null;
  private readonly bonjourBridge = createMdnsBonjourBridge();

  constructor(options: InterfaceManagerOptions) {
    this.reticulum = options.reticulum;
    this.provider = options.provider;
    this.runtime = options.runtime;
    this.inboundBandwidthLimiter = options.inboundBandwidthLimiter;
    this.outboundBandwidthLimiter = options.outboundBandwidthLimiter;
    this.effects = options.effects ?? {};
    this.onChange = options.onChange;
    this.bridge = new BridgeForwarder({
      provider: this.provider,
      getInterfaces: () => this.relayInterfaces(),
      getPolicy: () => this.config?.relay.policy ?? {}
    });
  }

  get relayMode(): RelayMode {
    return this.config?.relay.mode ?? "off";
  }

  async start(config: HostConfig): Promise<void> {
    await this.setConfig(config);
  }

  async stop(): Promise<void> {
    this.bridge.stop();
    for (const kind of [...this.interfaces.keys()]) {
      await this.closeKind(kind);
    }
    for (const [kind, server] of this.servers) {
      this.servers.delete(kind);
      await server.close().catch(() => undefined);
    }
    if (this.bonjour !== null) {
      await this.bonjour.stop().catch(() => undefined);
      this.bonjour = null;
    }
    await this.bonjourBridge.stop();
    this.config = null;
  }

  async setConfig(config: HostConfig): Promise<void> {
    const previous = this.config;
    this.config = config;
    const kinds: RelayInterfaceKind[] = [
      "tcp",
      "websocket",
      "auto",
      "i2p",
      "rnode",
      "bluetooth",
      "optical",
      "acoustic",
      "ntfy",
      "freenet"
    ];
    for (const kind of kinds) {
      const oldConfig = previous === null ? null : this.kindConfig(previous, kind);
      const newConfig = this.kindConfig(config, kind);
      if (!this.configEqual(oldConfig, newConfig)) {
        await this.closeKind(kind);
        await this.openKind(kind, newConfig);
      }
    }
    this.updateBridgeMode();
    this.notify();
  }

  async setMode(mode: RelayMode): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    await this.setConfig({ ...this.config, relay: { ...this.config.relay, mode } });
  }

  async setDirection(kind: RelayInterfaceKind, direction: InterfaceDirection): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    const next = this.patchInterfaceConfig(this.config, kind, { direction });
    await this.setConfig(next);
  }

  async enable(kind: RelayInterfaceKind, options?: Record<string, unknown>): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    const next = this.patchInterfaceConfig(this.config, kind, { enabled: true, ...options });
    await this.setConfig(next);
  }

  async disable(kind: RelayInterfaceKind): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    const next = this.patchInterfaceConfig(this.config, kind, { enabled: false });
    await this.setConfig(next);
  }

  async configure(kind: RelayInterfaceKind, patch: Record<string, unknown>): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    const next = this.patchInterfaceConfig(this.config, kind, patch);
    await this.setConfig(next);
  }

  async setPolicy(policy: RelayPolicyMatrix): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    await this.setConfig({ ...this.config, relay: { ...this.config.relay, policy } });
  }

  list(): ReadonlyArray<InterfaceStatus> {
    return [...this.interfaces.values()].map((entry) => this.statusFor(entry));
  }

  status(): {
    readonly mode: RelayMode;
    readonly interfaces: ReadonlyArray<InterfaceStatus>;
    readonly onlineCount: number;
  } {
    const interfaces = this.list();
    return {
      mode: this.relayMode,
      interfaces,
      onlineCount: interfaces.filter((i) => i.online).length
    };
  }

  async diagnostics(): Promise<ReadonlyArray<InterfaceDiagnostic>> {
    const kinds: RelayInterfaceKind[] = [
      "tcp",
      "websocket",
      "auto",
      "i2p",
      "rnode",
      "bluetooth",
      "optical",
      "acoustic",
      "ntfy",
      "freenet"
    ];
    return kinds.map((kind) => {
      const managed = this.interfaces.get(kind);
      if (managed !== undefined) {
        return {
          kind,
          state: managed.iface.online ? "available" : "offline"
        } as InterfaceDiagnostic;
      }
      if (EFFECT_KINDS.includes(kind) && (this.effects as Record<string, unknown>)[kind] === undefined) {
        return { kind, state: "unsupported", reason: "No host effect factory registered" };
      }
      if (kind === "rnode" || kind === "i2p") {
        return { kind, state: "unsupported", reason: "No host driver factory registered" };
      }
      return { kind, state: "policy-disabled", reason: "Interface disabled in config" };
    });
  }

  getHandle(kind: RelayInterfaceKind): PacketInterface | null {
    return this.interfaces.get(kind)?.iface ?? null;
  }

  websocketGatewayPort(): number | null {
    return this.servers.get("websocket")?.address?.port ?? null;
  }

  private relayInterfaces(): ReadonlyArray<PacketInterface> {
    return [...this.interfaces.values()]
      .filter((entry) => {
        const config = this.kindConfig(this.config!, entry.kind) as { relay?: boolean };
        return normalizeRelay(config.relay);
      })
      .map((entry) => entry.iface);
  }

  private updateBridgeMode(): void {
    this.bridge.stop();
    if (this.config?.relay.mode === "bridge") {
      this.bridge.start();
    }
  }

  private notify(): void {
    this.onChange?.(this.list());
  }

  private statusFor(entry: ManagedInterface): InterfaceStatus {
    const config = this.kindConfig(this.config!, entry.kind);
    return {
      kind: entry.kind,
      name: entry.iface.name,
      enabled: (config as { enabled: boolean }).enabled,
      online: entry.iface.online,
      direction: normalizeDirection((config as { direction?: InterfaceDirection }).direction),
      relay: normalizeRelay((config as { relay?: boolean }).relay),
      bitrate: entry.iface.bitrate,
      bytesIn: entry.bytesIn,
      bytesOut: entry.bytesOut
    };
  }

  private async closeKind(kind: RelayInterfaceKind): Promise<void> {
    const managed = this.interfaces.get(kind);
    if (managed !== undefined) {
      this.interfaces.delete(kind);
      await managed.iface.close().catch(() => undefined);
    }
    const server = this.servers.get(kind);
    if (server !== undefined) {
      this.servers.delete(kind);
      await server.close().catch(() => undefined);
    }
    if (kind === "websocket" && this.dhtRelaySession !== null) {
      await this.dhtRelaySession.close().catch(() => undefined);
      this.dhtRelaySession = null;
    }
    if (kind === "auto" && this.bonjour !== null) {
      await this.bonjour.stop().catch(() => undefined);
      this.bonjour = null;
    }
  }

  private async openKind(kind: RelayInterfaceKind, config: unknown): Promise<void> {
    if (!(config as { enabled?: boolean }).enabled) return;
    const direction = normalizeDirection((config as { direction?: InterfaceDirection }).direction);
    const { incoming, outgoing } = directionToFlags(direction);
    let iface: PacketInterface | null = null;
    try {
      iface = await this.createInterface(kind, config, incoming, outgoing);
    } catch (error) {
      console.warn(`interface-manager: failed to open ${kind}:`, error);
      return;
    }
    if (iface === null) return;
    this.reticulum.registerInterface(iface);
    this.interfaces.set(kind, {
      kind,
      iface,
      config,
      bytesIn: 0,
      bytesOut: 0
    });
  }

  private async createInterface(
    kind: RelayInterfaceKind,
    config: unknown,
    incoming: boolean,
    outgoing: boolean
  ): Promise<PacketInterface | null> {
    switch (kind) {
      case "tcp":
        return this.createTcpInterface(config as TcpInterfaceConfig, incoming, outgoing);
      case "websocket":
        return this.createWebSocketInterface(config as WebSocketInterfaceConfig, incoming, outgoing);
      case "auto":
        return this.createAutoInterface(config as { multicast?: boolean; bonjour?: boolean }, incoming, outgoing);
      case "i2p":
        return this.createI2pInterface(config as { samHost?: string; samPort?: number }, incoming, outgoing);
      case "rnode":
        return this.createRnodeInterface(
          config as { portPath?: string; baudRate?: number },
          incoming,
          outgoing
        );
      case "bluetooth":
        return this.createBluetoothInterface(config as BluetoothInterfaceConfig, incoming, outgoing);
      case "optical":
        return this.createOpticalInterface(config as OpticalInterfaceConfig, incoming, outgoing);
      case "acoustic":
        return this.createAcousticInterface(config as AcousticInterfaceConfig, incoming, outgoing);
      case "ntfy":
        return this.createNtfyInterface(config as NtfyInterfaceConfig, incoming, outgoing);
      case "freenet":
        return this.createFreenetInterface(config as FreenetInterfaceConfig, incoming, outgoing);
      default:
        return null;
    }
  }

  private async createTcpInterface(
    config: TcpInterfaceConfig,
    incoming: boolean,
    outgoing: boolean
  ): Promise<PacketInterface | null> {
    const roles = this.config!.roles;
    if (roles.attachRnsd !== null) {
      return this.reticulum.addTcpClientInterface({
        name: "rnsd-attach",
        targetHost: roles.attachRnsd.host,
        targetPort: roles.attachRnsd.port,
        incoming,
        outgoing
      });
    }
    if (config.mode === "server") {
      const server = await this.reticulum.addTcpServerInterface({
        name: "host-tcp-server",
        listenHost: "0.0.0.0",
        listenPort: config.listenPort ?? 4242,
        incoming,
        outgoing
      });
      this.servers.set("tcp", server);
      // The server itself is not a PacketInterface; spawned clients are registered internally.
      return null;
    }
    return this.reticulum.addTcpClientInterface({
      name: "host-tcp-client",
      targetHost: config.targetHost ?? "127.0.0.1",
      targetPort: config.targetPort ?? 4242,
      incoming,
      outgoing
    });
  }

  private async createWebSocketInterface(
    config: WebSocketInterfaceConfig,
    incoming: boolean,
    outgoing: boolean
  ): Promise<PacketInterface | null> {
    const bridgeHyper = await import("@twistedpear/bridge-hyper");
    const bulkFetchHandler = bridgeHyper.createGatewayBulkFetchHttpHandler(
      (driveKeyHex, version) =>
        bridgeHyper.fetchDriveVersionViaHyperswarm({
          driveKeyHex,
          version,
          ...(this.inboundBandwidthLimiter === undefined ? {} : { inboundBandwidthLimiter: this.inboundBandwidthLimiter }),
          ...(this.outboundBandwidthLimiter === undefined ? {} : { outboundBandwidthLimiter: this.outboundBandwidthLimiter })
        }),
      {
        ...(this.outboundBandwidthLimiter === undefined ? {} : { outboundBandwidthLimiter: this.outboundBandwidthLimiter })
      }
    );
    const wsServer = await registerWebSocketServerInterface(this.reticulum, {
      name: "host-ws-gateway",
      listenHost: config.listenHost ?? "127.0.0.1",
      listenPort: config.listenPort ?? 9480,
      ...(config.path === undefined ? {} : { path: config.path }),
      ...(config.sharedToken === undefined ? {} : { sharedToken: config.sharedToken }),
      ...(config.staticRoot === undefined ? {} : { staticRoot: config.staticRoot }),
      incoming,
      outgoing,
      serveHttp: bulkFetchHandler
    });
    if (config.dhtRelay !== false) {
      const httpServer = wsServer.httpServer;
      if (httpServer !== null) {
        this.dhtRelaySession = bridgeHyper.attachDhtRelayServer(httpServer);
      }
    }
    this.servers.set("websocket", wsServer);
    // The WebSocket server itself is not a PacketInterface; spawned clients are registered internally.
    return null;
  }

  private async createAutoInterface(
    config: { multicast?: boolean; bonjour?: boolean },
    incoming: boolean,
    outgoing: boolean
  ): Promise<PacketInterface> {
    const iface = await AutoInterface.open(this.provider, this.runtime, {
      name: "host-auto",
      provider: this.provider,
      runtime: this.runtime,
      incoming,
      outgoing
    });
    if (config.bonjour !== false) {
      this.bonjour = new BonjourDiscoveryProvider(this.bonjourBridge);
      await this.bonjour.start();
    }
    return iface;
  }

  private async createI2pInterface(
    _config: { samHost?: string; samPort?: number; peerDestination?: string },
    _incoming: boolean,
    _outgoing: boolean
  ): Promise<PacketInterface | null> {
    // TODO: wire I2PInterface.connect once a peerDestination / SAM session factory is configured
    return null;
  }

  private async createRnodeInterface(
    _config: { portPath?: string; baudRate?: number },
    _incoming: boolean,
    _outgoing: boolean
  ): Promise<PacketInterface | null> {
    // TODO: wire RNodeInterface.open once a SerialPipe factory is configured
    return null;
  }

  private async createBluetoothInterface(
    config: BluetoothInterfaceConfig,
    incoming: boolean,
    outgoing: boolean
  ): Promise<PacketInterface | null> {
    if (this.effects.bluetooth === undefined) return null;
    const pipe = await this.effects.bluetooth.createPipe(config);
    return BleInterface.open(this.provider, {
      name: "host-bluetooth",
      provider: this.provider,
      pipe,
      ...(config.pipeMtu === undefined ? {} : { pipeMtu: config.pipeMtu }),
      incoming,
      outgoing
    });
  }

  private async createOpticalInterface(
    config: OpticalInterfaceConfig,
    incoming: boolean,
    outgoing: boolean
  ): Promise<PacketInterface | null> {
    if (this.effects.optical === undefined) return null;
    const channel = await this.effects.optical.createChannel(config);
    return OpticalInterface.open(this.provider, {
      name: "host-optical",
      provider: this.provider,
      channel,
      ...(config.frameRate === undefined ? {} : { frameRate: config.frameRate }),
      ...(config.colorCodes === undefined ? {} : { colorCodes: config.colorCodes }),
      ...(config.bitrateHint === undefined ? {} : { bitrate: config.bitrateHint }),
      incoming,
      outgoing
    });
  }

  private async createAcousticInterface(
    config: AcousticInterfaceConfig,
    incoming: boolean,
    outgoing: boolean
  ): Promise<PacketInterface | null> {
    if (this.effects.acoustic === undefined) return null;
    const channel = await this.effects.acoustic.createChannel(config);
    return AcousticInterface.open(this.provider, {
      name: "host-acoustic",
      provider: this.provider,
      channel,
      ...(config.band === undefined ? {} : { band: config.band }),
      ...(config.bitrateHint === undefined ? {} : { bitrate: config.bitrateHint }),
      incoming,
      outgoing
    });
  }

  private async createNtfyInterface(
    config: NtfyInterfaceConfig,
    incoming: boolean,
    outgoing: boolean
  ): Promise<PacketInterface | null> {
    const secret = config.secret ?? bytesToHex(this.provider.randomBytes(16));
    const topic = config.topic ?? bytesToHex(this.provider.randomBytes(8));
    const iface = new NtfyPacketInterface(this.provider, {
      name: "host-ntfy",
      provider: this.provider,
      baseUrl: config.baseUrl ?? "https://ntfy.sh",
      topic,
      secret,
      ...(config.bearerToken === undefined ? {} : { bearerToken: config.bearerToken }),
      ...(config.pollIntervalMs === undefined ? {} : { pollIntervalMs: config.pollIntervalMs }),
      incoming,
      outgoing,
      bitrate: config.bitrateHint ?? DEFAULT_INTERFACE_BITRATES.ntfy ?? 10_000
    });
    await iface.start();
    return iface;
  }

  private async createFreenetInterface(
    config: FreenetInterfaceConfig,
    incoming: boolean,
    outgoing: boolean
  ): Promise<PacketInterface | null> {
    const url = config.url;
    if (url === undefined || url.length === 0) {
      throw new Error("Freenet interface requires interfaces.freenet.url");
    }
    const rendezvous =
      config.rendezvousHex === undefined
        ? this.provider.randomBytes(32)
        : hexToBytesLocal(config.rendezvousHex);
    if (rendezvous.length !== 32) {
      throw new Error("Freenet rendezvous must be 32 bytes");
    }
    const wasm = loadPacketLogWasm();
    const backend = new FreenetContractPacketLogBackend({
      clientOptions: {
        url,
        ...(config.authToken === undefined ? {} : { authToken: config.authToken })
      },
      wasm,
      rendezvous,
      localDirection: config.localDirection ?? 0,
      ...(config.retentionPerDirection === undefined
        ? {}
        : { retentionPerDirection: config.retentionPerDirection }),
      updateOptions: { codeField: wasm }
    });
    return FreenetInterface.open(this.provider, {
      name: "host-freenet",
      provider: this.provider,
      backend,
      incoming,
      outgoing,
      bitrate: config.bitrateHint ?? FREENET_DEFAULT_BITRATE
    });
  }

  private kindConfig(config: HostConfig, kind: RelayInterfaceKind): unknown {
    return config.interfaces[kind];
  }

  private configEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private patchInterfaceConfig(
    config: HostConfig,
    kind: RelayInterfaceKind,
    patch: Record<string, unknown>
  ): HostConfig {
    const existing = config.interfaces[kind];
    return {
      ...config,
      interfaces: {
        ...config.interfaces,
        [kind]: { ...existing, ...patch }
      }
    };
  }
}
