import {
  registerWebSocketServerInterface,
  type ByteRateLimiter,
  type CryptoProvider,
  type PacketInterface,
  type Reticulum,
  type Runtime,
} from "@twistedpear/reticulum-ts";
import type { BonjourBridge } from "@twistedpear/reticulum-interfaces";
import {
  AutoInterface,
  BonjourDiscoveryProvider,
  BleInterface,
  I2PInterface,
  RNodeInterface,
  FreenetInterface,
  FREENET_DEFAULT_BITRATE,
} from "@twistedpear/reticulum-interfaces";
import type { BlePipe } from "@twistedpear/reticulum-interfaces";
import { FreenetContractPacketLogBackend } from "@twistedpear/bridge-freenet";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import type {
  AcousticInterfaceConfig,
  BluetoothInterfaceConfig,
  FreenetInterfaceConfig,
  NtfyInterfaceConfig,
  OpticalInterfaceConfig,
  RelayInterfaceKind,
  TcpInterfaceConfig,
  WebSocketInterfaceConfig,
} from "./types.js";
import {
  openAcousticInterface,
  openNtfyInterface,
  openOpticalInterface,
} from "./interface-manager-media.js";
import type { InterfaceEffectFactories } from "./interface-manager.js";

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

export interface InterfaceOpenContext {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly effects: InterfaceEffectFactories;
  readonly inboundBandwidthLimiter: ByteRateLimiter | undefined;
  readonly outboundBandwidthLimiter: ByteRateLimiter | undefined;
  readonly attachRnsd: { readonly host: string; readonly port: number } | null;
  readonly servers: Map<
    RelayInterfaceKind,
    { close(): Promise<void>; address?: { port: number } | null }
  >;
  readonly bonjourBridge: BonjourBridge;
  bonjour: BonjourDiscoveryProvider | null;
  dhtRelaySession: { close(): Promise<void> } | null;
}

export async function openManagedInterface(
  ctx: InterfaceOpenContext,
  kind: RelayInterfaceKind,
  config: unknown,
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface | null> {
  switch (kind) {
    case "tcp":
      return createTcpInterface(
        ctx,
        config as TcpInterfaceConfig,
        incoming,
        outgoing,
      );
    case "websocket":
      return createWebSocketInterface(
        ctx,
        config as WebSocketInterfaceConfig,
        incoming,
        outgoing,
      );
    case "auto":
      return createAutoInterface(
        ctx,
        config as { multicast?: boolean; bonjour?: boolean },
        incoming,
        outgoing,
      );
    case "i2p":
      return createI2pInterface(
        ctx,
        config as {
          samHost?: string;
          samPort?: number;
          peerDestination?: string;
        },
        incoming,
        outgoing,
      );
    case "rnode":
      return createRnodeInterface(
        ctx,
        config as { portPath?: string; baudRate?: number },
        incoming,
        outgoing,
      );
    default:
      return openSpecialtyInterface(ctx, kind, config, incoming, outgoing);
  }
}

function openSpecialtyInterface(
  ctx: InterfaceOpenContext,
  kind: RelayInterfaceKind,
  config: unknown,
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface | null> {
  switch (kind) {
    case "bluetooth":
      return createBluetoothInterface(
        ctx,
        config as BluetoothInterfaceConfig,
        incoming,
        outgoing,
      );
    case "optical":
      return createOpticalInterface(
        ctx,
        config as OpticalInterfaceConfig,
        incoming,
        outgoing,
      );
    case "acoustic":
      return createAcousticInterface(
        ctx,
        config as AcousticInterfaceConfig,
        incoming,
        outgoing,
      );
    case "ntfy":
      return createNtfyInterface(
        ctx,
        config as NtfyInterfaceConfig,
        incoming,
        outgoing,
      );
    case "freenet":
      return createFreenetInterface(
        ctx,
        config as FreenetInterfaceConfig,
        incoming,
        outgoing,
      );
    default:
      return Promise.resolve(null);
  }
}

async function createTcpInterface(
  ctx: InterfaceOpenContext,
  config: TcpInterfaceConfig,
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface | null> {
  if (ctx.attachRnsd !== null) {
    return ctx.reticulum.addTcpClientInterface({
      name: "rnsd-attach",
      targetHost: ctx.attachRnsd.host,
      targetPort: ctx.attachRnsd.port,
      incoming,
      outgoing,
    });
  }
  if (config.mode === "server") {
    const server = await ctx.reticulum.addTcpServerInterface({
      name: "host-tcp-server",
      listenHost: "0.0.0.0",
      listenPort: config.listenPort ?? 4242,
      incoming,
      outgoing,
    });
    ctx.servers.set("tcp", server);
    return null;
  }
  return ctx.reticulum.addTcpClientInterface({
    name: "host-tcp-client",
    targetHost: config.targetHost ?? "127.0.0.1",
    targetPort: config.targetPort ?? 4242,
    incoming,
    outgoing,
  });
}

async function createWebSocketInterface(
  ctx: InterfaceOpenContext,
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
        ...(ctx.inboundBandwidthLimiter === undefined
          ? {}
          : { inboundBandwidthLimiter: ctx.inboundBandwidthLimiter }),
        ...(ctx.outboundBandwidthLimiter === undefined
          ? {}
          : { outboundBandwidthLimiter: ctx.outboundBandwidthLimiter }),
      }),
    {
      ...(ctx.outboundBandwidthLimiter === undefined
        ? {}
        : { outboundBandwidthLimiter: ctx.outboundBandwidthLimiter }),
    },
  );
  const wsServer = await registerWebSocketServerInterface(ctx.reticulum, {
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
      ctx.dhtRelaySession = bridgeHyper.attachDhtRelayServer(httpServer);
    }
  }
  ctx.servers.set("websocket", wsServer);
  return null;
}

async function createAutoInterface(
  ctx: InterfaceOpenContext,
  config: { multicast?: boolean; bonjour?: boolean },
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface> {
  const iface = await AutoInterface.open(ctx.provider, ctx.runtime, {
    name: "host-auto",
    provider: ctx.provider,
    runtime: ctx.runtime,
    incoming,
    outgoing,
  });
  if (config.bonjour !== false) {
    ctx.bonjour = new BonjourDiscoveryProvider(ctx.bonjourBridge);
    await ctx.bonjour.start();
  }
  return iface;
}

async function createI2pInterface(
  ctx: InterfaceOpenContext,
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
  return I2PInterface.connect(ctx.provider, {
    name: "host-i2p",
    provider: ctx.provider,
    runtime: ctx.runtime,
    peerDestination: config.peerDestination,
    ...(config.samHost === undefined ? {} : { samHost: config.samHost }),
    ...(config.samPort === undefined ? {} : { samPort: config.samPort }),
    incoming,
    outgoing,
  });
}

async function createRnodeInterface(
  ctx: InterfaceOpenContext,
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
  return RNodeInterface.open(ctx.provider, {
    name: "host-rnode",
    provider: ctx.provider,
    pipe,
    incoming,
    outgoing,
  });
}

async function createBluetoothInterface(
  ctx: InterfaceOpenContext,
  config: BluetoothInterfaceConfig,
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface | null> {
  if (ctx.effects.bluetooth === undefined) return null;
  const pipe = await ctx.effects.bluetooth.createPipe(config);
  return BleInterface.open(ctx.provider, {
    name: "host-bluetooth",
    provider: ctx.provider,
    pipe,
    ...(config.pipeMtu === undefined ? {} : { pipeMtu: config.pipeMtu }),
    incoming,
    outgoing,
  });
}

async function createOpticalInterface(
  ctx: InterfaceOpenContext,
  config: OpticalInterfaceConfig,
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface | null> {
  if (ctx.effects.optical === undefined) return null;
  const channel = await ctx.effects.optical.createChannel(config);
  return openOpticalInterface(
    ctx.provider,
    channel,
    config,
    incoming,
    outgoing,
  );
}

async function createAcousticInterface(
  ctx: InterfaceOpenContext,
  config: AcousticInterfaceConfig,
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface | null> {
  if (ctx.effects.acoustic === undefined) return null;
  const channel = await ctx.effects.acoustic.createChannel(config);
  return openAcousticInterface(
    ctx.provider,
    channel,
    config,
    incoming,
    outgoing,
  );
}

async function createNtfyInterface(
  ctx: InterfaceOpenContext,
  config: NtfyInterfaceConfig,
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface | null> {
  return openNtfyInterface(ctx.provider, config, incoming, outgoing);
}

async function createFreenetInterface(
  ctx: InterfaceOpenContext,
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
      ? ctx.provider.randomBytes(32)
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
  return FreenetInterface.open(ctx.provider, {
    name: "host-freenet",
    provider: ctx.provider,
    backend,
    incoming,
    outgoing,
    bitrate: config.bitrateHint ?? FREENET_DEFAULT_BITRATE,
  });
}
