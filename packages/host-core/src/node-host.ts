import { createServer, type Server as HttpServer } from "node:http";
import { join } from "node:path";
import type { CryptoProvider, Identity, Reticulum, TcpClientInterface, TcpServerInterface } from "@twistedpear/reticulum-ts";
import {
  NodeCryptoProvider,
  Reticulum as Rns,
  bytesToHex,
  nodeRuntime,
  type Runtime
} from "@twistedpear/reticulum-ts";
import { AutoInterface } from "@twistedpear/reticulum-interfaces";
import { createMdnsBonjourBridge } from "@twistedpear/reticulum-interfaces/bonjour-mdns";
import { BonjourDiscoveryProvider } from "@twistedpear/reticulum-interfaces";
import {
  LXMFRouter,
  PropagationServer,
  createPropagationDestination,
  DEFAULT_PROPAGATION_QUOTAS
} from "@twistedpear/lxmf-ts";
import { selectPreferredInterface } from "@twistedpear/reticulum-interfaces";
import { ensureDir } from "./config.js";
import { identityHashHex, loadOrCreateIdentity } from "./identity.js";
import { startSeederRole } from "./roles/seeder.js";
import type { HostConfig, HostStatus } from "./types.js";

export interface NodeHostOptions {
  readonly config: HostConfig;
  readonly provider?: CryptoProvider;
  readonly runtime?: Runtime;
}

export interface NodeHostSession {
  readonly reticulum: Reticulum;
  readonly identity: Identity;
  readonly getStatus: () => HostStatus;
  readonly stop: () => Promise<void>;
}

export async function createNodeHost(options: NodeHostOptions): Promise<NodeHostSession> {
  const provider = options.provider ?? new NodeCryptoProvider();
  const runtime = options.runtime ?? nodeRuntime();
  const config = options.config;
  ensureDir(config.dataDir);

  const transportEnabled = config.roles.transport && config.roles.attachRnsd === null;
  const reticulum = Rns.create({
    provider,
    runtime,
    ...(transportEnabled ? { transportEnabled: true } : {})
  });
  reticulum.start();

  const identity = await loadOrCreateIdentity(provider, config.identityPath);
  const startedAt = Date.now();
  let announcesSeen = 0;
  let bytesIn = 0;
  let bytesOut = 0;

  reticulum.registerAnnounceHandler({
    receivedAnnounce() {
      announcesSeen += 1;
    }
  });

  let tcpClient: TcpClientInterface | null = null;
  let tcpServer: TcpServerInterface | null = null;
  let autoIface: AutoInterface | null = null;
  let bonjourBridge = createMdnsBonjourBridge();
  let seederSession: Awaited<ReturnType<typeof startSeederRole>> | null = null;
  let propagationServer: PropagationServer | null = null;
  let statusServer: HttpServer | null = null;
  let lxmfRouter: LXMFRouter | null = null;

  if (config.roles.seeder) {
    seederSession = await startSeederRole({
      provider,
      reticulum,
      identity,
      stateDir: join(config.dataDir, "seeder"),
      bootstrap: config.bootstrap,
      quotas: config.quotas
    });
  }

  if (config.roles.propagation) {
    lxmfRouter = new LXMFRouter({ reticulum, provider });
    propagationServer = new PropagationServer(provider, {
      ...DEFAULT_PROPAGATION_QUOTAS,
      maxBytes: config.quotas.propagationStoreBytes,
      maxMessages: config.quotas.propagationMessageCount
    });
    const propagationDestination = createPropagationDestination(provider, reticulum, identity);
    propagationServer.registerHandlers(propagationDestination);
    await propagationDestination.announce();
  }

  if (config.interfaces.auto.enabled) {
    autoIface = await AutoInterface.open(provider, runtime, {
      name: "host-auto",
      provider,
      runtime
    });
    reticulum.registerInterface(autoIface);

    if (config.interfaces.auto.bonjour) {
      const bonjour = new BonjourDiscoveryProvider(bonjourBridge);
      await bonjour.start();
    }
  }

  if (config.interfaces.tcp.enabled) {
    if (config.roles.attachRnsd !== null) {
      tcpClient = await reticulum.addTcpClientInterface({
        name: "rnsd-attach",
        targetHost: config.roles.attachRnsd.host,
        targetPort: config.roles.attachRnsd.port
      });
    } else if (config.interfaces.tcp.mode === "server") {
      tcpServer = await reticulum.addTcpServerInterface({
        name: "host-tcp-server",
        listenHost: "0.0.0.0",
        listenPort: config.interfaces.tcp.listenPort ?? 4242
      });
    } else {
      tcpClient = await reticulum.addTcpClientInterface({
        name: "host-tcp-client",
        targetHost: config.interfaces.tcp.targetHost ?? "127.0.0.1",
        targetPort: config.interfaces.tcp.targetPort ?? 4242
      });
    }
  }

  const buildStatus = (): HostStatus => {
    const interfaces = reticulum.listInterfaces();
    const preferred = selectPreferredInterface(interfaces);
    const linkOnline = interfaces.some((iface) => iface.online);
    return {
      running: true,
      uptimeMs: Date.now() - startedAt,
      identityHash: identityHashHex(identity),
      transportEnabled,
      seederEnabled: config.roles.seeder,
      propagationEnabled: config.roles.propagation,
      attachRnsd: config.roles.attachRnsd,
      linkOnline,
      announcesSeen,
      autoPeers: autoIface?.peerInterfaces?.length ?? 0,
      onlineInterfaces: interfaces.filter((iface) => iface.online).length,
      preferredInterface: preferred?.name ?? null,
      seedStorageUsedBytes: seederSession?.usedBytes() ?? 0,
      seedStorageQuotaBytes: config.quotas.seedStorageBytes,
      propagationStoreBytes: propagationServer?.stats.usedBytes ?? 0,
      propagationMessageCount: propagationServer?.stats.messageCount ?? 0,
      bandwidthBytesOut: bytesOut,
      bandwidthBytesIn: bytesIn
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
      statusServer?.listen(9473, "127.0.0.1", () => resolve());
    });
  }

  return {
    reticulum,
    identity,
    getStatus: buildStatus,
    async stop() {
      if (statusServer !== null) {
        await new Promise<void>((resolve, reject) => {
          statusServer?.close((error) => (error ? reject(error) : resolve()));
        });
      }

      if (seederSession !== null) {
        await seederSession.stop();
      }

      if (autoIface !== null) {
        await autoIface.close();
      }

      await bonjourBridge.stop();

      if (tcpClient !== null) {
        await tcpClient.close();
      }

      if (tcpServer !== null) {
        await tcpServer.close();
      }

      if (lxmfRouter !== null) {
        // Router shares reticulum lifecycle; no explicit teardown required.
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
