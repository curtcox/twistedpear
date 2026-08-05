import {
  bytesToHex,
  registerWebSocketServerInterface,
  type ByteRateLimiter,
  type CryptoProvider,
  type PacketInterface,
  type Runtime,
  type Reticulum,
} from "@twistedpear/reticulum-ts";
import {
  AutoInterface,
  BonjourDiscoveryProvider,
  BleInterface,
  I2PInterface,
  RNodeInterface,
  FreenetInterface,
  FREENET_DEFAULT_BITRATE,
  inferInterfaceKind,
} from "@twistedpear/reticulum-interfaces";
import type {
  OpticalChannel,
  AcousticChannel,
} from "@twistedpear/reticulum-interfaces";
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
  WebSocketInterfaceConfig,
} from "./types.js";
import { BridgeForwarder } from "./bridge-forwarder.js";
import { validateHostConfig } from "./config.js";
import { interfaceDirectionFlags } from "./types.js";
import {
  buildInterfaceDiagnostics,
  buildInterfaceStatuses,
} from "./interface-manager-view.js";
import {
  openAcousticInterface,
  openNtfyInterface,
  openOpticalInterface,
} from "./interface-manager-media.js";

export type { InterfaceStatus } from "./types.js";

export interface InterfaceEffectFactories {
  readonly bluetooth?: {
    createPipe(config: BluetoothInterfaceConfig): Promise<BlePipe>;
  };
  readonly optical?: {
    createChannel(config: OpticalInterfaceConfig): Promise<OpticalChannel>;
  };
  readonly acoustic?: {
    createChannel(config: AcousticInterfaceConfig): Promise<AcousticChannel>;
  };
}

const EFFECT_KINDS: ReadonlyArray<RelayInterfaceKind> = [
  "bluetooth",
  "optical",
  "acoustic",
];
const RELAY_INTERFACE_KINDS: ReadonlyArray<RelayInterfaceKind> = [
  "tcp",
  "websocket",
  "auto",
  "i2p",
  "rnode",
  "bluetooth",
  "optical",
  "acoustic",
  "ntfy",
  "freenet",
];

let packetLogWasmCache: Uint8Array | null = null;

function loadPacketLogWasm(): Uint8Array {
  if (packetLogWasmCache !== null) return packetLogWasmCache;
  const require = createRequire(import.meta.url);
  const packageJson =
    require.resolve("@twistedpear/bridge-freenet/package.json");
  const wasmPath = join(
    dirname(packageJson),
    "contract/packet-log/packet-log-contract.wasm",
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

export type {
  OpticalChannel,
  AcousticChannel,
} from "@twistedpear/reticulum-interfaces";

export interface InterfaceManagerOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly inboundBandwidthLimiter?: ByteRateLimiter;
  readonly outboundBandwidthLimiter?: ByteRateLimiter;
  readonly effects?: InterfaceEffectFactories;
  readonly onChange?: (status: ReadonlyArray<InterfaceStatus>) => void;
  /** Persist or otherwise publish a successfully applied hot configuration. */
  readonly onConfigChange?: (config: HostConfig) => void | Promise<void>;
}

export interface ManagedInterface {
  readonly kind: RelayInterfaceKind;
  readonly iface: PacketInterface;
  readonly config: unknown;
  readonly bytesIn: number;
  readonly bytesOut: number;
}

export type InterfaceDiagnosticState =
  | "available"
  | "permission-required"
  | "unsupported"
  | "offline"
  | "policy-disabled";

export interface InterfaceDiagnostic {
  readonly kind: RelayInterfaceKind;
  readonly state: InterfaceDiagnosticState;
  readonly reason?: string;
}

function normalizeDirection(
  direction?: InterfaceDirection,
): InterfaceDirection {
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
  private readonly onChange:
    ((status: ReadonlyArray<InterfaceStatus>) => void) | undefined;
  private readonly onConfigChange:
    ((config: HostConfig) => void | Promise<void>) | undefined;

  private config: HostConfig | null = null;
  private readonly interfaces = new Map<RelayInterfaceKind, ManagedInterface>();
  private readonly failures = new Map<RelayInterfaceKind, string>();
  private readonly servers = new Map<
    RelayInterfaceKind,
    { close(): Promise<void>; address?: { port: number } | null }
  >();
  private readonly bridge: BridgeForwarder;
  private interfaceObserverCleanup: (() => void) | null = null;
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
    this.onConfigChange = options.onConfigChange;
    this.bridge = new BridgeForwarder({
      provider: this.provider,
      getInterfaces: () => this.relayInterfaces(),
      getPolicy: () => this.config?.relay.policy ?? {},
    });
  }

  get relayMode(): RelayMode {
    return this.config?.relay.mode ?? "off";
  }

  async start(config: HostConfig): Promise<void> {
    this.interfaceObserverCleanup ??= this.reticulum.observeInterfaces(() => {
      this.bridge.refresh();
      this.notify();
    });
    await this.applyConfig(config, false);
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
    this.interfaceObserverCleanup?.();
    this.interfaceObserverCleanup = null;
    this.config = null;
  }

  async setConfig(config: HostConfig): Promise<void> {
    await this.applyConfig(config, true);
  }

  private async applyConfig(
    config: HostConfig,
    persist: boolean,
  ): Promise<void> {
    validateHostConfig(config);
    const previous = this.config;
    this.config = config;
    this.reticulum.setTransportEnabled(
      config.roles.transport &&
        config.roles.attachRnsd === null &&
        config.relay.mode === "transport-node",
    );
    for (const kind of RELAY_INTERFACE_KINDS) {
      const oldConfig =
        previous === null ? null : this.kindConfig(previous, kind);
      const newConfig = this.kindConfig(config, kind);
      if (!this.configEqual(oldConfig, newConfig)) {
        await this.closeKind(kind);
        await this.openKind(kind, newConfig);
      }
    }
    this.updateBridgeMode();
    this.notify();
    if (persist) await this.onConfigChange?.(config);
  }

  async setMode(mode: RelayMode): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    await this.setConfig({
      ...this.config,
      relay: { ...this.config.relay, mode },
    });
  }

  async setDirection(
    kind: RelayInterfaceKind,
    direction: InterfaceDirection,
  ): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    const next = this.patchInterfaceConfig(this.config, kind, { direction });
    await this.setConfig(next);
  }

  async enable(
    kind: RelayInterfaceKind,
    options?: Record<string, unknown>,
  ): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    const generated =
      kind === "ntfy"
        ? {
            topic: bytesToHex(this.provider.randomBytes(8)),
            secret: bytesToHex(this.provider.randomBytes(16)),
          }
        : {};
    const next = this.patchInterfaceConfig(this.config, kind, {
      ...generated,
      enabled: true,
      ...options,
    });
    await this.setConfig(next);
  }

  async disable(kind: RelayInterfaceKind): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    const next = this.patchInterfaceConfig(this.config, kind, {
      enabled: false,
    });
    await this.setConfig(next);
  }

  async configure(
    kind: RelayInterfaceKind,
    patch: Record<string, unknown>,
  ): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    const next = this.patchInterfaceConfig(this.config, kind, patch);
    await this.setConfig(next);
  }

  async setPolicy(policy: RelayPolicyMatrix): Promise<void> {
    if (this.config === null) throw new Error("Interface manager not started");
    await this.setConfig({
      ...this.config,
      relay: { ...this.config.relay, policy },
    });
  }

  list(): ReadonlyArray<InterfaceStatus> {
    if (this.config === null) return [];
    return buildInterfaceStatuses(this.viewInputs());
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
      onlineCount: interfaces.filter((i) => i.online).length,
    };
  }

  async diagnostics(): Promise<ReadonlyArray<InterfaceDiagnostic>> {
    const availableEffects = new Set(
      EFFECT_KINDS.filter(
        (kind) => (this.effects as Record<string, unknown>)[kind] !== undefined,
      ),
    );
    return buildInterfaceDiagnostics(
      this.viewInputs(),
      this.failures,
      new Set(EFFECT_KINDS),
      availableEffects,
    );
  }

  private viewInputs() {
    return {
      kinds: RELAY_INTERFACE_KINDS,
      config: this.config!,
      managed: this.interfaces,
      serverKinds: new Set(this.servers.keys()),
      registered: (kind: RelayInterfaceKind) => this.registeredInterfaces(kind),
    };
  }

  getHandle(kind: RelayInterfaceKind): PacketInterface | null {
    return this.interfaces.get(kind)?.iface ?? null;
  }

  websocketGatewayPort(): number | null {
    return this.servers.get("websocket")?.address?.port ?? null;
  }

  private relayInterfaces(): ReadonlyArray<PacketInterface> {
    if (this.config === null) return [];
    return this.reticulum.listInterfaces().filter((iface) => {
      const kind = inferInterfaceKind(iface.name);
      if (!RELAY_INTERFACE_KINDS.includes(kind as RelayInterfaceKind))
        return false;
      const config = this.kindConfig(
        this.config!,
        kind as RelayInterfaceKind,
      ) as {
        enabled: boolean;
        relay?: boolean;
      };
      return config.enabled && normalizeRelay(config.relay);
    });
  }

  private registeredInterfaces(
    kind: RelayInterfaceKind,
  ): ReadonlyArray<PacketInterface> {
    return this.reticulum
      .listInterfaces()
      .filter((iface) => inferInterfaceKind(iface.name) === kind);
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

  private async closeKind(kind: RelayInterfaceKind): Promise<void> {
    this.failures.delete(kind);
    const managed = this.interfaces.get(kind);
    if (managed !== undefined) {
      this.interfaces.delete(kind);
      this.reticulum.unregisterInterface(managed.iface);
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

  private async openKind(
    kind: RelayInterfaceKind,
    config: unknown,
  ): Promise<void> {
    if (!(config as { enabled?: boolean }).enabled) return;
    const direction = normalizeDirection(
      (config as { direction?: InterfaceDirection }).direction,
    );
    const { incoming, outgoing } = interfaceDirectionFlags(direction);
    let iface: PacketInterface | null = null;
    try {
      iface = await this.createInterface(kind, config, incoming, outgoing);
    } catch (error) {
      this.failures.set(
        kind,
        error instanceof Error ? error.message : String(error),
      );
      console.warn(`interface-manager: failed to open ${kind}:`, error);
      return;
    }
    if (iface === null) return;
    // Reticulum convenience constructors (for example addTcpClientInterface)
    // register their result before returning it, while standalone adapters do
    // not. Keep the manager as the lifecycle owner without double-registering
    // interfaces created through those convenience paths.
    if (!this.reticulum.listInterfaces().includes(iface)) {
      this.reticulum.registerInterface(iface);
    }
    this.interfaces.set(kind, {
      kind,
      iface,
      config,
      bytesIn: 0,
      bytesOut: 0,
    });
  }

  private async createInterface(
    kind: RelayInterfaceKind,
    config: unknown,
    incoming: boolean,
    outgoing: boolean,
  ): Promise<PacketInterface | null> {
    switch (kind) {
      case "tcp":
        return this.createTcpInterface(
          config as TcpInterfaceConfig,
          incoming,
          outgoing,
        );
      case "websocket":
        return this.createWebSocketInterface(
          config as WebSocketInterfaceConfig,
          incoming,
          outgoing,
        );
      case "auto":
        return this.createAutoInterface(
          config as { multicast?: boolean; bonjour?: boolean },
          incoming,
          outgoing,
        );
      case "i2p":
        return this.createI2pInterface(
          config as { samHost?: string; samPort?: number },
          incoming,
          outgoing,
        );
      case "rnode":
        return this.createRnodeInterface(
          config as { portPath?: string; baudRate?: number },
          incoming,
          outgoing,
        );
      case "bluetooth":
        return this.createBluetoothInterface(
          config as BluetoothInterfaceConfig,
          incoming,
          outgoing,
        );
      case "optical":
        return this.createOpticalInterface(
          config as OpticalInterfaceConfig,
          incoming,
          outgoing,
        );
      case "acoustic":
        return this.createAcousticInterface(
          config as AcousticInterfaceConfig,
          incoming,
          outgoing,
        );
      case "ntfy":
        return this.createNtfyInterface(
          config as NtfyInterfaceConfig,
          incoming,
          outgoing,
        );
      case "freenet":
        return this.createFreenetInterface(
          config as FreenetInterfaceConfig,
          incoming,
          outgoing,
        );
      default:
        return null;
    }
  }

  private async createTcpInterface(
    config: TcpInterfaceConfig,
    incoming: boolean,
    outgoing: boolean,
  ): Promise<PacketInterface | null> {
    const roles = this.config!.roles;
    if (roles.attachRnsd !== null) {
      return this.reticulum.addTcpClientInterface({
        name: "rnsd-attach",
        targetHost: roles.attachRnsd.host,
        targetPort: roles.attachRnsd.port,
        incoming,
        outgoing,
      });
    }
    if (config.mode === "server") {
      const server = await this.reticulum.addTcpServerInterface({
        name: "host-tcp-server",
        listenHost: "0.0.0.0",
        listenPort: config.listenPort ?? 4242,
        incoming,
        outgoing,
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
      outgoing,
    });
  }

  private async createWebSocketInterface(
    config: WebSocketInterfaceConfig,
    incoming: boolean,
    outgoing: boolean,
  ): Promise<PacketInterface | null> {
    const bridgeHyper = await import("@twistedpear/bridge-hyper");
    const bulkFetchHandler = bridgeHyper.createGatewayBulkFetchHttpHandler(
      (driveKeyHex, version) =>
        bridgeHyper.fetchDriveVersionViaHyperswarm({
          driveKeyHex,
          version,
          ...(this.inboundBandwidthLimiter === undefined
            ? {}
            : { inboundBandwidthLimiter: this.inboundBandwidthLimiter }),
          ...(this.outboundBandwidthLimiter === undefined
            ? {}
            : { outboundBandwidthLimiter: this.outboundBandwidthLimiter }),
        }),
      {
        ...(this.outboundBandwidthLimiter === undefined
          ? {}
          : { outboundBandwidthLimiter: this.outboundBandwidthLimiter }),
      },
    );
    const wsServer = await registerWebSocketServerInterface(this.reticulum, {
      name: "host-ws-gateway",
      listenHost: config.listenHost ?? "127.0.0.1",
      listenPort: config.listenPort ?? 9480,
      ...(config.path === undefined ? {} : { path: config.path }),
      ...(config.sharedToken === undefined
        ? {}
        : { sharedToken: config.sharedToken }),
      ...(config.staticRoot === undefined
        ? {}
        : { staticRoot: config.staticRoot }),
      incoming,
      outgoing,
      serveHttp: bulkFetchHandler,
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
    outgoing: boolean,
  ): Promise<PacketInterface> {
    const iface = await AutoInterface.open(this.provider, this.runtime, {
      name: "host-auto",
      provider: this.provider,
      runtime: this.runtime,
      incoming,
      outgoing,
    });
    if (config.bonjour !== false) {
      this.bonjour = new BonjourDiscoveryProvider(this.bonjourBridge);
      await this.bonjour.start();
    }
    return iface;
  }

  private async createI2pInterface(
    config: { samHost?: string; samPort?: number; peerDestination?: string },
    incoming: boolean,
    outgoing: boolean,
  ): Promise<PacketInterface> {
    if (
      config.peerDestination === undefined ||
      config.peerDestination.length === 0
    ) {
      throw new Error("I2P interface requires interfaces.i2p.peerDestination");
    }
    return I2PInterface.connect(this.provider, {
      name: "host-i2p",
      provider: this.provider,
      runtime: this.runtime,
      peerDestination: config.peerDestination,
      ...(config.samHost === undefined ? {} : { samHost: config.samHost }),
      ...(config.samPort === undefined ? {} : { samPort: config.samPort }),
      incoming,
      outgoing,
    });
  }

  private async createRnodeInterface(
    config: { portPath?: string; baudRate?: number },
    incoming: boolean,
    outgoing: boolean,
  ): Promise<PacketInterface> {
    if (config.portPath === undefined || config.portPath.length === 0) {
      throw new Error("RNode interface requires interfaces.rnode.portPath");
    }
    const { createSerialNodePipe } =
      await import("@twistedpear/reticulum-interfaces/serial-node");
    const pipe = createSerialNodePipe({
      path: config.portPath,
      ...(config.baudRate === undefined ? {} : { baudRate: config.baudRate }),
    });
    return RNodeInterface.open(this.provider, {
      name: "host-rnode",
      provider: this.provider,
      pipe,
      incoming,
      outgoing,
    });
  }

  private async createBluetoothInterface(
    config: BluetoothInterfaceConfig,
    incoming: boolean,
    outgoing: boolean,
  ): Promise<PacketInterface | null> {
    if (this.effects.bluetooth === undefined) return null;
    const pipe = await this.effects.bluetooth.createPipe(config);
    return BleInterface.open(this.provider, {
      name: "host-bluetooth",
      provider: this.provider,
      pipe,
      ...(config.pipeMtu === undefined ? {} : { pipeMtu: config.pipeMtu }),
      incoming,
      outgoing,
    });
  }

  private async createOpticalInterface(
    config: OpticalInterfaceConfig,
    incoming: boolean,
    outgoing: boolean,
  ): Promise<PacketInterface | null> {
    if (this.effects.optical === undefined) return null;
    const channel = await this.effects.optical.createChannel(config);
    return openOpticalInterface(
      this.provider,
      channel,
      config,
      incoming,
      outgoing,
    );
  }

  private async createAcousticInterface(
    config: AcousticInterfaceConfig,
    incoming: boolean,
    outgoing: boolean,
  ): Promise<PacketInterface | null> {
    if (this.effects.acoustic === undefined) return null;
    const channel = await this.effects.acoustic.createChannel(config);
    return openAcousticInterface(
      this.provider,
      channel,
      config,
      incoming,
      outgoing,
    );
  }

  private async createNtfyInterface(
    config: NtfyInterfaceConfig,
    incoming: boolean,
    outgoing: boolean,
  ): Promise<PacketInterface | null> {
    return openNtfyInterface(this.provider, config, incoming, outgoing);
  }

  private async createFreenetInterface(
    config: FreenetInterfaceConfig,
    incoming: boolean,
    outgoing: boolean,
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
        ...(config.authToken === undefined
          ? {}
          : { authToken: config.authToken }),
      },
      wasm,
      rendezvous,
      localDirection: config.localDirection ?? 0,
      ...(config.retentionPerDirection === undefined
        ? {}
        : { retentionPerDirection: config.retentionPerDirection }),
      updateOptions: { fallbackCodeField: wasm },
    });
    return FreenetInterface.open(this.provider, {
      name: "host-freenet",
      provider: this.provider,
      backend,
      incoming,
      outgoing,
      bitrate: config.bitrateHint ?? FREENET_DEFAULT_BITRATE,
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
    patch: Record<string, unknown>,
  ): HostConfig {
    const existing = config.interfaces[kind];
    return {
      ...config,
      interfaces: {
        ...config.interfaces,
        [kind]: { ...existing, ...patch },
      },
    };
  }
}
