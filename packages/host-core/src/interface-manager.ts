import {
  bytesToHex,
  type ByteRateLimiter,
  type CryptoProvider,
  type PacketInterface,
  type Runtime,
  type Reticulum,
} from "@twistedpear/reticulum-ts";
import {
  BonjourDiscoveryProvider,
  inferInterfaceKind,
} from "@twistedpear/reticulum-interfaces";
import type {
  OpticalChannel,
  AcousticChannel,
} from "@twistedpear/reticulum-interfaces";
import { createMdnsBonjourBridge } from "@twistedpear/reticulum-interfaces/bonjour-mdns";
import type { BlePipe } from "@twistedpear/reticulum-interfaces";
import type {
  AcousticInterfaceConfig,
  BluetoothInterfaceConfig,
  HostConfig,
  InterfaceDirection,
  InterfaceStatus,
  OpticalInterfaceConfig,
  RelayInterfaceKind,
  RelayMode,
  RelayPolicyMatrix,
} from "./types.js";
import { BridgeForwarder } from "./bridge-forwarder.js";
import { validateHostConfig } from "./config.js";
import { interfaceDirectionFlags } from "./types.js";
import {
  buildInterfaceDiagnostics,
  buildInterfaceStatuses,
} from "./interface-manager-view.js";
import {
  openManagedInterface,
  type InterfaceOpenContext,
} from "./interface-manager-open.js";

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

  diagnostics(): Promise<ReadonlyArray<InterfaceDiagnostic>> {
    const availableEffects = new Set(
      EFFECT_KINDS.filter(
        (kind) => (this.effects as Record<string, unknown>)[kind] !== undefined,
      ),
    );
    return Promise.resolve(
      buildInterfaceDiagnostics(
        this.viewInputs(),
        this.failures,
        new Set(EFFECT_KINDS),
        availableEffects,
      ),
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
      iface = await openManagedInterface(
        this.interfaceOpenContext(),
        kind,
        config,
        incoming,
        outgoing,
      );
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

  private interfaceOpenContext(): InterfaceOpenContext {
    const manager = this;
    return {
      reticulum: manager.reticulum,
      provider: manager.provider,
      runtime: manager.runtime,
      effects: manager.effects,
      inboundBandwidthLimiter: manager.inboundBandwidthLimiter,
      outboundBandwidthLimiter: manager.outboundBandwidthLimiter,
      attachRnsd: manager.config?.roles.attachRnsd ?? null,
      servers: manager.servers,
      bonjourBridge: manager.bonjourBridge,
      get bonjour() {
        return manager.bonjour;
      },
      set bonjour(value) {
        manager.bonjour = value;
      },
      get dhtRelaySession() {
        return manager.dhtRelaySession;
      },
      set dhtRelaySession(value) {
        manager.dhtRelaySession = value;
      },
    };
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
