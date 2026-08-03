// @ts-nocheck
export { attachDhtRelayServer, DEFAULT_DHT_RELAY_PATH } from "./server/dht-relay-server.js";
export type { DhtRelayServerOptions, DhtRelayServerSession } from "./server/dht-relay-server.js";
export {
  attachGatewayBulkFetchServer,
  createGatewayBulkFetchHttpHandler,
  driveFetcherFromBulk,
  DEFAULT_BULK_FETCH_PATH
} from "./server/gateway-bulk-fetch-server.js";
export type {
  GatewayBulkFetcher,
  GatewayBulkFetchServerOptions,
  GatewayBulkFetchServerSession
} from "./server/gateway-bulk-fetch-server.js";
export { fetchDriveVersionViaHyperswarm, createGatewayHyperswarmDriveFetcher } from "./server/gateway-hyperswarm-drive-fetch.js";
export type { GatewayHyperswarmFetchOptions } from "./server/gateway-hyperswarm-drive-fetch.js";
export { fetchDriveVersionViaNodeRelay, createNodeRelayDriveFetcher } from "./server/node-relay-hyper-fetch.js";
export type { NodeRelayHyperFetchOptions } from "./server/node-relay-hyper-fetch.js";

export { createSwarm, driveTopic } from "./core/swarm.js";
export type { SwarmOptions, SwarmSession } from "./core/swarm.js";

export { DriveManager } from "./core/drive.js";
export type { DriveManagerOptions, PublishedVersion } from "./core/drive.js";

export {
  RESOURCE_PROTOCOL_VERSION,
  attachPackageResourceServer,
  sendPackageResourceRequest,
  parseListResponse
} from "./server/resource-server.js";
export type { PackageResourceRequest, PackageVersionInfo, PackageResourceServerOptions } from "./server/resource-server.js";

export { PackageResourceClient } from "./client/resource-client.js";
export type { PackageResourceClientOptions } from "./client/resource-client.js";

export {
  SIZE_WARNING_BLE_BYTES,
  SIZE_WARNING_RNODE_BYTES,
  BULK_BLOCK_RNODE_BYTES,
  assessFetchBudget,
  fetchPackage,
  estimateTransferSeconds
} from "./core/fetch.js";
export type {
  DriveFetcher,
  FreenetFetcher,
  FetchPath,
  FetchProgress,
  FetchPackageOptions,
  FetchPackageResult,
  FetchBudgetAssessment
} from "./core/fetch.js";
