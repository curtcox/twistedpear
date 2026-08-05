import { createServer, type Server as HttpServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import type { CryptoProvider, Identity, Reticulum } from "@twistedpear/reticulum-ts";
import { createFilePropagationPersistence } from "./propagation-persistence.js";
import {
  NodeCryptoProvider,
  BandwidthLimiter,
  Reticulum as Rns,
  bytesToHex,
  nodeRuntime,
  type Runtime
} from "@twistedpear/reticulum-ts";
import { selectPreferredInterface } from "@twistedpear/reticulum-interfaces";
import {
  FreenetClient,
  FreenetClientContractBackend,
  FreenetPropagationStore
} from "@twistedpear/bridge-freenet";
import { InterfaceManager } from "./interface-manager.js";
import {
  LXMFRouter,
  PropagationServer,
  createPropagationDestination,
  DEFAULT_PROPAGATION_QUOTAS
} from "@twistedpear/lxmf-ts";
import { ensureDir } from "./config.js";
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
    ...(freenet.authToken === undefined ? {} : { authToken: freenet.authToken })
  };
}

function loadPropagationSetWasm(): Uint8Array {
  const require = createRequire(import.meta.url);
  const packageJson = require.resolve("@twistedpear/bridge-freenet/package.json");
  return Uint8Array.from(
    readFileSync(
      join(
        dirname(packageJson),
        "contract/propagation-set/propagation-set-contract.wasm"
      )
    )
  );
}

function createFreenetPropagationMirror(
  config: HostConfig,
  sharedClient: FreenetClient | null
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
    updateOptions: { fallbackCodeField: wasm }
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
  sharedClient: FreenetClient | null
): FreenetClientContractBackend | null {
  const options = freenetClientOptions(config);
  if (options === null) {
    return null;
  }
  return new FreenetClientContractBackend({
    client: sharedClient ?? new FreenetClient(options)
  });
}

export interface NodeHostOptions {
  readonly config: HostConfig;
  readonly provider?: CryptoProvider;
  readonly runtime?: Runtime;
  readonly identityPassphrase?: string;
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

export async function createNodeHost(options: NodeHostOptions): Promise<NodeHostSession> {
  const provider = options.provider ?? new NodeCryptoProvider();
  const runtime = options.runtime ?? nodeRuntime();
  const config = options.config;
  ensureDir(config.dataDir);
  const moderation = new FileModerationStore(join(config.dataDir, "moderation.json"));

  const transportEnabled =
    config.roles.transport && config.roles.attachRnsd === null && config.relay.mode === "transport-node";
  const inboundBandwidthLimiter = new BandwidthLimiter(runtime.clock, config.quotas.bandwidthBytesPerSecond);
  const outboundBandwidthLimiter = new BandwidthLimiter(runtime.clock, config.quotas.bandwidthBytesPerSecond);
  const reticulum = Rns.create({
    provider,
    runtime,
    inboundBandwidthLimiter,
    outboundBandwidthLimiter,
    ...(transportEnabled ? { transportEnabled: true } : {})
  });
  reticulum.start();

  const identity = await loadOrCreateIdentity(
    provider,
    config.identityPath,
    options.identityPassphrase === undefined
      ? undefined
      : { passphrase: options.identityPassphrase, migrateLegacy: true }
  );
  const startedAt = Date.now();
  let announcesSeen = 0;
  const dropCensus = createDropCensus();

  reticulum.registerAnnounceHandler({
    receivedAnnounce() {
      announcesSeen += 1;
    }
  });
  reticulum.registerDropObserver((drop) => {
    dropCensus.record(drop);
  });

  let seederSession: Awaited<ReturnType<typeof startSeederRole>> | null = null;
  let propagationServer: PropagationServer | null = null;
  let statusServer: HttpServer | null = null;
  let lxmfRouter: LXMFRouter | null = null;
  const freenetOptions = freenetClientOptions(config);
  const sharedFreenetClient =
    freenetOptions === null ? null : new FreenetClient(freenetOptions);
  const freenetBackend = createFreenetContractBackend(config, sharedFreenetClient);

  if (config.roles.seeder) {
    seederSession = await startSeederRole({
      provider,
      reticulum,
      identity,
      stateDir: join(config.dataDir, "seeder"),
      bootstrap: config.bootstrap,
      quotas: config.quotas,
      inboundBandwidthLimiter,
      outboundBandwidthLimiter
    });
  }

  if (config.roles.propagation) {
    lxmfRouter = new LXMFRouter({
      reticulum,
      provider,
      inboundModeration: (sourceHash) => moderation.disposition(sourceHash)
    });
    const freenetMirror = createFreenetPropagationMirror(config, sharedFreenetClient);
    propagationServer = new PropagationServer(
      provider,
      {
        ...DEFAULT_PROPAGATION_QUOTAS,
        maxBytes: config.quotas.propagationStoreBytes,
        maxMessages: config.quotas.propagationMessageCount
      },
      {
        now: () => Date.now(),
        schedule: (ms: number, callback: () => void) => {
          const handle = setTimeout(callback, ms);
          return { cancel: () => clearTimeout(handle) };
        },
        persistence: createFilePropagationPersistence(join(config.dataDir, "propagation", "store.json")),
        ...(freenetMirror === null ? {} : { remoteMirror: freenetMirror })
      }
    );
    if (freenetMirror !== null) {
      await propagationServer.pullRemoteMirror().catch(() => {
        // Offline Freenet must not block host startup.
      });
    }
    const propagationDestination = createPropagationDestination(provider, reticulum, identity);
    propagationServer.registerHandlers(propagationDestination);
    await propagationDestination.announce();
  }

  const interfaceManager = new InterfaceManager({
    reticulum,
    provider,
    runtime,
    inboundBandwidthLimiter,
    outboundBandwidthLimiter
  });
  await interfaceManager.start(config);

  const buildStatus = (): HostStatus => {
    const interfaces = reticulum.listInterfaces();
    const preferred = selectPreferredInterface(interfaces);
    const linkOnline = interfaces.some((iface) => iface.online);
    const managerStatus = interfaceManager.status();
    const autoIface = managerStatus.interfaces.find((i: InterfaceStatus) => i.kind === "auto");
    return {
      running: true,
      uptimeMs: Date.now() - startedAt,
      identityHash: identityHashHex(identity),
      transportEnabled,
      seederEnabled: config.roles.seeder,
      propagationEnabled: config.roles.propagation,
      attachRnsd: config.roles.attachRnsd,
      relayMode: config.relay.mode,
      linkOnline,
      announcesSeen,
      dropCensus: dropCensus.snapshot(),
      autoPeers: autoIface && "peerInterfaces" in autoIface ? (autoIface as { peerInterfaces: { length: number } }).peerInterfaces.length : 0,
      onlineInterfaces: managerStatus.onlineCount ?? interfaces.filter((iface) => iface.online).length,
      preferredInterface: preferred?.name ?? null,
      interfaces: managerStatus.interfaces ?? [],
      seedStorageUsedBytes: seederSession?.usedBytes() ?? 0,
      seedStorageQuotaBytes: config.quotas.seedStorageBytes,
      propagationStoreBytes: propagationServer?.stats.usedBytes ?? 0,
      propagationMessageCount: propagationServer?.stats.messageCount ?? 0,
      propagationEvictions: propagationServer?.stats.evictions ?? 0,
      websocketGatewayPort: interfaceManager.websocketGatewayPort() ?? null,
      pathTableCount: reticulum.pathTableCount,
      activeLinkCount: reticulum.activeLinkCount,
      bandwidthBytesOut: reticulum.bandwidthBytesOut,
      bandwidthBytesIn: reticulum.bandwidthBytesIn
    };
  };

  if (config.statusEndpoint) {
    statusServer = createServer((request, response) => {
      if (request.url !== "/status" || request.method !== "GET") {
        response.statusCode = 404;
        response.end();
        return;
      }

      const remote = request.socket.remoteAddress ?? "";
      if (remote !== "127.0.0.1" && remote !== "::1" && remote !== "::ffff:127.0.0.1") {
        response.statusCode = 403;
        response.end();
        return;
      }

      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(buildStatus()));
    });
    await new Promise<void>((resolve) => {
      statusServer?.listen(config.statusEndpointPort, "127.0.0.1", () => resolve());
    });
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
      log: (line) => console.log(`[peer-agent] ${line}`)
    });
    console.log(`[peer-agent] ${config.testAgent.label} lxmf=${testAgent.lxmfAddress}`);
  }

  return {
    reticulum,
    identity,
    moderation,
    interfaceManager,
    freenetBackend,
    getStatus: buildStatus,
    async stop() {
      if (testAgent !== null) {
        await testAgent.stop();
      }
      if (statusServer !== null) {
        await new Promise<void>((resolve, reject) => {
          statusServer?.close((error) => (error ? reject(error) : resolve()));
        });
      }

      if (seederSession !== null) {
        await seederSession.stop();
      }

      await interfaceManager.stop();

      if (lxmfRouter !== null) {
        // Router shares reticulum lifecycle; no explicit teardown required.
      }

      if (freenetBackend !== null) {
        await freenetBackend.close();
      }
      if (sharedFreenetClient !== null) {
        await sharedFreenetClient.close();
      }

      await reticulum.stop();
    }
  };
}

export async function runNodeHost(options: NodeHostOptions): Promise<void> {
  const session = await createNodeHost(options);
  console.log(`host-core: running (identity ${bytesToHex(session.identity.hash)})`);

  process.on("SIGINT", () => {
    void session.stop().then(() => process.exit(0));
  });

  await new Promise(() => {
    // Run until interrupted.
  });
}
