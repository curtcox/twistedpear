import { createServer, type Server as HttpServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import type {
  CryptoProvider,
  Identity,
  Reticulum,
} from "@twistedpear/reticulum-ts";
import { createFilePropagationPersistence } from "./propagation-persistence.js";
import {
  NodeCryptoProvider,
  BandwidthLimiter,
  Reticulum as Rns,
  bytesToHex,
  nodeRuntime,
  type Runtime,
} from "@twistedpear/reticulum-ts";
import { selectPreferredInterface } from "@twistedpear/reticulum-interfaces";
import {
  FreenetClient,
  FreenetClientContractBackend,
  FreenetPropagationStore,
} from "@twistedpear/bridge-freenet";
import {
  InterfaceManager,
  type InterfaceEffectFactories,
} from "./interface-manager.js";
import {
  LXMFRouter,
  PropagationServer,
  createPropagationDestination,
  DEFAULT_PROPAGATION_QUOTAS,
} from "@twistedpear/lxmf-ts";
import { ensureDir, saveHostConfigFile } from "./config.js";
import { identityHashHex, loadOrCreateIdentity } from "./identity.js";
import { startSeederRole } from "./roles/seeder.js";
import { FileModerationStore } from "./moderation-store.js";
import { mountTestAgent, type TestAgentSession } from "./test-agent.js";
import { createDropCensus } from "./drop-census.js";
import type { HostConfig, HostStatus, InterfaceStatus } from "./types.js";

function freenetClientOptions(config: HostConfig): {
  url: string;
  authToken?: string;
} | null {
  const freenet = config.interfaces.freenet;
  if (freenet.url === undefined || freenet.url.length === 0) {
    return null;
  }
  return {
    url: freenet.url,
    ...(freenet.authToken === undefined
      ? {}
      : { authToken: freenet.authToken }),
  };
}

function loadPropagationSetWasm(): Uint8Array {
  const require = createRequire(import.meta.url);
  const packageJson =
    require.resolve("@twistedpear/bridge-freenet/package.json");
  return Uint8Array.from(
    readFileSync(
      join(
        dirname(packageJson),
        "contract/propagation-set/propagation-set-contract.wasm",
      ),
    ),
  );
}

function createFreenetPropagationMirror(
  config: HostConfig,
  sharedClient: FreenetClient | null,
): FreenetPropagationStore | null {
  const freenet = config.interfaces.freenet;
  if (!freenet.enabled) {
    return null;
  }
  const options = freenetClientOptions(config);
  if (options === null) {
    return null;
  }
  if (freenet.propagationMirror === false) {
    return null;
  }
  const wasm = loadPropagationSetWasm();
  const client = sharedClient ?? new FreenetClient(options);
  return new FreenetPropagationStore({
    client,
    wasm,
    updateOptions: { fallbackCodeField: wasm },
  });
}

/**
 * Contract broker backend when a Freenet WebSocket URL is configured.
 * Independent of `interfaces.freenet.enabled` (that flag opens the HDLC
 * packet-log interface); apps can use `freenet:contract` against a remote
 * node without carrying Freenet as a Reticulum hop.
 */
function createFreenetContractBackend(
  config: HostConfig,
  sharedClient: FreenetClient | null,
): FreenetClientContractBackend | null {
  const options = freenetClientOptions(config);
  if (options === null) {
    return null;
  }
  return new FreenetClientContractBackend({
    client: sharedClient ?? new FreenetClient(options),
  });
}

export interface NodeHostOptions {
  readonly config: HostConfig;
  readonly provider?: CryptoProvider;
  readonly runtime?: Runtime;
  readonly identityPassphrase?: string;
  /** Host-owned BLE/camera/audio drivers for physical relay interfaces. */
  readonly interfaceEffects?: InterfaceEffectFactories;
}

export interface NodeHostSession {
  readonly reticulum: Reticulum;
  readonly identity: Identity;
  readonly moderation: FileModerationStore;
  /** Owns interface lifecycle and relay policy; implements the mini-app `RelayService` surface. */
  readonly interfaceManager: InterfaceManager;
  /**
   * Hex-facing Freenet adapter for `freenet:contract` when
   * `interfaces.freenet.url` is set; otherwise null. Independent of the
   * Freenet HDLC interface `enabled` flag.
   */
  readonly freenetBackend: FreenetClientContractBackend | null;
  readonly getStatus: () => HostStatus;
  readonly stop: () => Promise<void>;
}

function autoPeerCount(autoIface: InterfaceStatus | undefined): number {
  if (autoIface === undefined || !("peerInterfaces" in autoIface)) {
    return 0;
  }
  return (autoIface as { peerInterfaces: { length: number } }).peerInterfaces
    .length;
}

function onlineInterfaceCount(
  managerStatus: ReturnType<InterfaceManager["status"]>,
  interfaces: ReturnType<Reticulum["listInterfaces"]>,
): number {
  if (managerStatus.onlineCount !== undefined) {
    return managerStatus.onlineCount;
  }
  return interfaces.filter((iface) => iface.online).length;
}

function buildNodeHostStatus(input: {
  readonly reticulum: Reticulum;
  readonly identity: Identity;
  readonly config: HostConfig;
  readonly interfaceManager: InterfaceManager;
  readonly startedAt: number;
  readonly announcesSeen: number;
  readonly dropCensus: ReturnType<typeof createDropCensus>;
  readonly seederSession: Awaited<ReturnType<typeof startSeederRole>> | null;
  readonly propagationServer: PropagationServer | null;
}): HostStatus {
  const interfaces = input.reticulum.listInterfaces();
  const preferred = selectPreferredInterface(interfaces);
  const managerStatus = input.interfaceManager.status();
  const autoIface = managerStatus.interfaces.find(
    (i: InterfaceStatus) => i.kind === "auto",
  );
  const stats =
    input.propagationServer === null
      ? { usedBytes: 0, messageCount: 0, evictions: 0 }
      : input.propagationServer.stats;
  const preferredName = preferred == null ? null : preferred.name;
  const seedBytes =
    input.seederSession === null ? 0 : input.seederSession.usedBytes();
  return {
    running: true,
    uptimeMs: Date.now() - input.startedAt,
    identityHash: identityHashHex(input.identity),
    transportEnabled: input.reticulum.isTransportEnabled,
    seederEnabled: input.config.roles.seeder,
    propagationEnabled: input.config.roles.propagation,
    attachRnsd: input.config.roles.attachRnsd,
    relayMode: input.interfaceManager.relayMode,
    linkOnline: interfaces.some((iface) => iface.online),
    announcesSeen: input.announcesSeen,
    dropCensus: input.dropCensus.snapshot(),
    autoPeers: autoPeerCount(autoIface),
    onlineInterfaces: onlineInterfaceCount(managerStatus, interfaces),
    preferredInterface: preferredName,
    interfaces: managerStatus.interfaces,
    seedStorageUsedBytes: seedBytes,
    seedStorageQuotaBytes: input.config.quotas.seedStorageBytes,
    propagationStoreBytes: stats.usedBytes,
    propagationMessageCount: stats.messageCount,
    propagationEvictions: stats.evictions,
    websocketGatewayPort: input.interfaceManager.websocketGatewayPort(),
    pathTableCount: input.reticulum.pathTableCount,
    activeLinkCount: input.reticulum.activeLinkCount,
    bandwidthBytesOut: input.reticulum.bandwidthBytesOut,
    bandwidthBytesIn: input.reticulum.bandwidthBytesIn,
  };
}

async function listenLoopbackStatus(
  port: number,
  buildStatus: () => HostStatus,
): Promise<HttpServer> {
  const statusServer = createServer((request, response) => {
    if (request.url !== "/status" || request.method !== "GET") {
      response.statusCode = 404;
      response.end();
      return;
    }

    const remote = request.socket.remoteAddress ?? "";
    if (
      remote !== "127.0.0.1" &&
      remote !== "::1" &&
      remote !== "::ffff:127.0.0.1"
    ) {
      response.statusCode = 403;
      response.end();
      return;
    }

    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(buildStatus()));
  });
  await new Promise<void>((resolve) => {
    statusServer.listen(port, "127.0.0.1", () => resolve());
  });
  return statusServer;
}

async function stopNodeHostResources(input: {
  readonly testAgent: TestAgentSession | null;
  readonly statusServer: HttpServer | null;
  readonly seederSession: Awaited<ReturnType<typeof startSeederRole>> | null;
  readonly interfaceManager: InterfaceManager;
  readonly freenetBackend: FreenetClientContractBackend | null;
  readonly sharedFreenetClient: FreenetClient | null;
  readonly reticulum: Reticulum;
}): Promise<void> {
  if (input.testAgent !== null) {
    await input.testAgent.stop();
  }
  if (input.statusServer !== null) {
    await new Promise<void>((resolve, reject) => {
      input.statusServer?.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (input.seederSession !== null) {
    await input.seederSession.stop();
  }
  await input.interfaceManager.stop();
  if (input.freenetBackend !== null) {
    await input.freenetBackend.close();
  }
  if (input.sharedFreenetClient !== null) {
    await input.sharedFreenetClient.close();
  }
  input.reticulum.stop();
}

async function startPropagationRole(input: {
  readonly config: HostConfig;
  readonly provider: CryptoProvider;
  readonly reticulum: Reticulum;
  readonly identity: Identity;
  readonly moderation: FileModerationStore;
  readonly sharedFreenetClient: FreenetClient | null;
}): Promise<{
  propagationServer: PropagationServer | null;
  lxmfRouter: LXMFRouter | null;
}> {
  if (!input.config.roles.propagation) {
    return { propagationServer: null, lxmfRouter: null };
  }
  const lxmfRouter = new LXMFRouter({
    reticulum: input.reticulum,
    provider: input.provider,
    inboundModeration: (sourceHash) => input.moderation.disposition(sourceHash),
  });
  const freenetMirror = createFreenetPropagationMirror(
    input.config,
    input.sharedFreenetClient,
  );
  const propagationServer = new PropagationServer(
    input.provider,
    {
      ...DEFAULT_PROPAGATION_QUOTAS,
      maxBytes: input.config.quotas.propagationStoreBytes,
      maxMessages: input.config.quotas.propagationMessageCount,
    },
    {
      now: () => Date.now(),
      schedule: (ms: number, callback: () => void) => {
        const handle = setTimeout(callback, ms);
        return { cancel: () => clearTimeout(handle) };
      },
      persistence: createFilePropagationPersistence(
        join(input.config.dataDir, "propagation", "store.json"),
      ),
      ...(freenetMirror === null ? {} : { remoteMirror: freenetMirror }),
    },
  );
  if (freenetMirror !== null) {
    await propagationServer.pullRemoteMirror().catch(() => {
      // Offline Freenet must not block host startup.
    });
  }
  const propagationDestination = createPropagationDestination(
    input.provider,
    input.reticulum,
    input.identity,
  );
  propagationServer.registerHandlers(propagationDestination);
  await propagationDestination.announce();
  return { propagationServer, lxmfRouter };
}

function startHostReticulum(options: NodeHostOptions): {
  provider: CryptoProvider;
  runtime: Runtime;
  reticulum: Reticulum;
  inboundBandwidthLimiter: BandwidthLimiter;
  outboundBandwidthLimiter: BandwidthLimiter;
  dropCensus: ReturnType<typeof createDropCensus>;
  counters: { announcesSeen: number; startedAt: number };
} {
  const provider = options.provider ?? new NodeCryptoProvider();
  const runtime = options.runtime ?? nodeRuntime();
  const config = options.config;
  const transportEnabled =
    config.roles.transport &&
    config.roles.attachRnsd === null &&
    config.relay.mode === "transport-node";
  const inboundBandwidthLimiter = new BandwidthLimiter(
    runtime.clock,
    config.quotas.bandwidthBytesPerSecond,
  );
  const outboundBandwidthLimiter = new BandwidthLimiter(
    runtime.clock,
    config.quotas.bandwidthBytesPerSecond,
  );
  const reticulum = Rns.create({
    provider,
    runtime,
    inboundBandwidthLimiter,
    outboundBandwidthLimiter,
    ...(options.interfaceEffects === undefined
      ? {}
      : { effects: options.interfaceEffects }),
    ...(transportEnabled ? { transportEnabled: true } : {}),
  });
  reticulum.start();
  const dropCensus = createDropCensus();
  const counters = { announcesSeen: 0, startedAt: Date.now() };
  reticulum.registerAnnounceHandler({
    receivedAnnounce() {
      counters.announcesSeen += 1;
    },
  });
  reticulum.registerDropObserver((drop) => {
    dropCensus.record(drop);
  });
  return {
    provider,
    runtime,
    reticulum,
    inboundBandwidthLimiter,
    outboundBandwidthLimiter,
    dropCensus,
    counters,
  };
}

export async function createNodeHost(
  options: NodeHostOptions,
): Promise<NodeHostSession> {
  const config = options.config;
  ensureDir(config.dataDir);
  const moderation = new FileModerationStore(
    join(config.dataDir, "moderation.json"),
  );
  const {
    provider,
    runtime,
    reticulum,
    inboundBandwidthLimiter,
    outboundBandwidthLimiter,
    dropCensus,
    counters,
  } = startHostReticulum(options);

  const identity = await loadOrCreateIdentity(
    provider,
    config.identityPath,
    options.identityPassphrase === undefined
      ? undefined
      : { passphrase: options.identityPassphrase, migrateLegacy: true },
  );

  let statusServer: HttpServer | null = null;
  const freenetOptions = freenetClientOptions(config);
  const sharedFreenetClient =
    freenetOptions === null ? null : new FreenetClient(freenetOptions);
  const freenetBackend = createFreenetContractBackend(
    config,
    sharedFreenetClient,
  );

  const seederSession = config.roles.seeder
    ? await startSeederRole({
        provider,
        reticulum,
        identity,
        stateDir: join(config.dataDir, "seeder"),
        bootstrap: config.bootstrap,
        quotas: config.quotas,
        inboundBandwidthLimiter,
        outboundBandwidthLimiter,
      })
    : null;

  const { propagationServer, lxmfRouter } = await startPropagationRole({
    config,
    provider,
    reticulum,
    identity,
    moderation,
    sharedFreenetClient,
  });

  const interfaceManager = new InterfaceManager({
    reticulum,
    provider,
    runtime,
    inboundBandwidthLimiter,
    outboundBandwidthLimiter,
    onConfigChange: (nextConfig) => {
      saveHostConfigFile(join(nextConfig.dataDir, "config.json"), nextConfig);
    },
  });
  await interfaceManager.start(config);

  const buildStatus = (): HostStatus =>
    buildNodeHostStatus({
      reticulum,
      identity,
      config,
      interfaceManager,
      startedAt: counters.startedAt,
      announcesSeen: counters.announcesSeen,
      dropCensus,
      seederSession,
      propagationServer,
    });

  if (config.statusEndpoint) {
    statusServer = await listenLoopbackStatus(
      config.statusEndpointPort,
      buildStatus,
    );
  }

  let testAgent: TestAgentSession | null = null;
  if (config.testAgent !== null) {
    testAgent = await mountTestAgent({
      reticulum,
      provider,
      identity,
      label: config.testAgent.label,
      platform: "tp-node",
      controlHost: config.testAgent.host,
      controlPort: config.testAgent.port,
      log: (line) => console.log(`[peer-agent] ${line}`),
    });
    console.log(
      `[peer-agent] ${config.testAgent.label} lxmf=${testAgent.lxmfAddress}`,
    );
  }

  return {
    reticulum,
    identity,
    moderation,
    interfaceManager,
    freenetBackend,
    getStatus: buildStatus,
    async stop() {
      // Router shares reticulum lifecycle; retain until teardown.
      void lxmfRouter;
      await stopNodeHostResources({
        testAgent,
        statusServer,
        seederSession,
        interfaceManager,
        freenetBackend,
        sharedFreenetClient,
        reticulum,
      });
    },
  };
}

export async function runNodeHost(options: NodeHostOptions): Promise<void> {
  const session = await createNodeHost(options);
  console.log(
    `host-core: running (identity ${bytesToHex(session.identity.hash)})`,
  );

  process.on("SIGINT", () => {
    void session.stop().then(() => process.exit(0));
  });

  await new Promise(() => {
    // Run until interrupted.
  });
}
