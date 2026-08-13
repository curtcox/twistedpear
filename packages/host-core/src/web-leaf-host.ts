import type {
  CryptoProvider,
  Identity,
  Reticulum,
  Runtime,
} from "@twistedpear/reticulum-ts";
import {
  PureCryptoProvider,
  Reticulum as Rns,
  WebSocketClientInterface,
  bytesToHex,
  loadOrCreateWebIdentity,
  webRuntime,
  type WebIdentityUnlockOptions,
} from "@twistedpear/reticulum-ts/web";
import { LXMFRouter } from "@twistedpear/lxmf-ts";
import { createResourceFetchPlane } from "./fetch-plane-resource.js";
import type { FetchPlane } from "./fetch-plane.js";
import {
  DEFAULT_WEB_LEAF_ROLES,
  assertWebLeafRoles,
  type WebLeafHostStatus,
} from "./leaf-roles.js";

export interface WebLeafHostOptions {
  readonly gatewayUrl: string;
  readonly sharedToken?: string;
  readonly identity: WebIdentityUnlockOptions;
  readonly provider?: CryptoProvider;
  readonly runtime?: Runtime;
  readonly fetchPlane?: FetchPlane;
  readonly bandwidthBytesPerSecond?: number;
}

export interface WebLeafHostSession {
  readonly reticulum: Reticulum;
  readonly identity: Identity;
  readonly lxmf: LXMFRouter;
  readonly fetchPlane: FetchPlane;
  readonly getStatus: () => WebLeafHostStatus;
  readonly stop: () => Promise<void>;
}

export async function createWebLeafHost(
  options: WebLeafHostOptions,
): Promise<WebLeafHostSession> {
  assertWebLeafRoles(DEFAULT_WEB_LEAF_ROLES);

  const provider = options.provider ?? new PureCryptoProvider();
  const runtime =
    options.runtime ??
    webRuntime({
      ...(options.identity.indexedDB === undefined
        ? {}
        : { indexedDB: options.identity.indexedDB }),
      // Identity storage and runtime state use different IndexedDB schemas.
      // Sharing a database name lets whichever opens first permanently omit the
      // other schema's object store at version 1.
      storeName: `${options.identity.storeName ?? "twistedpear-web-identity"}-runtime`,
    });
  const reticulum = Rns.create({
    provider,
    runtime,
    bandwidthBytesPerSecond: options.bandwidthBytesPerSecond ?? 512 * 1024,
  });
  reticulum.start();

  const identity = await loadOrCreateWebIdentity(provider, options.identity);
  const startedAt = Date.now();

  const wsClient = await WebSocketClientInterface.connect(provider, runtime, {
    name: "web-leaf-ws",
    provider,
    runtime,
    url: options.gatewayUrl,
    ...(options.sharedToken === undefined
      ? {}
      : { sharedToken: options.sharedToken }),
  });
  reticulum.registerInterface(wsClient);

  const lxmf = new LXMFRouter({ reticulum, provider });
  const fetchPlane =
    options.fetchPlane ??
    createResourceFetchPlane({
      reticulum,
      provider,
    });

  const buildStatus = (): WebLeafHostStatus => {
    const interfaces = reticulum.listInterfaces();
    const linkOnline = interfaces.some((iface) => iface.online);
    return {
      running: true,
      uptimeMs: Date.now() - startedAt,
      identityHash: bytesToHex(identity.hash),
      identityPersisted: true,
      gatewayUrl: options.gatewayUrl,
      linkOnline,
      onlineInterfaces: interfaces.filter((iface) => iface.online).length,
      pathTableCount: reticulum.pathTableCount,
      activeLinkCount: reticulum.activeLinkCount,
      bandwidthBytesOut: reticulum.bandwidthBytesOut,
      bandwidthBytesIn: reticulum.bandwidthBytesIn,
    };
  };

  return {
    reticulum,
    identity,
    lxmf,
    fetchPlane,
    getStatus: buildStatus,
    async stop() {
      await wsClient.close();
      reticulum.stop();
    },
  };
}
