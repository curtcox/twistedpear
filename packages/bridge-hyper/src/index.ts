export { attachDhtRelayServer, DEFAULT_DHT_RELAY_PATH } from "./dht-relay-server.js";
export type { DhtRelayServerOptions, DhtRelayServerSession } from "./dht-relay-server.js";
export {
  attachGatewayBulkFetchServer,
  createGatewayBulkFetchHttpHandler,
  DEFAULT_BULK_FETCH_PATH
} from "./gateway-bulk-fetch-server.js";
export type {
  GatewayBulkFetcher,
  GatewayBulkFetchServerOptions,
  GatewayBulkFetchServerSession
} from "./gateway-bulk-fetch-server.js";
export { fetchDriveVersionViaHyperswarm } from "./gateway-hyperswarm-fetch.js";
export type { GatewayHyperswarmFetchOptions } from "./gateway-hyperswarm-fetch.js";
export { fetchDriveVersionViaNodeRelay } from "./node-relay-hyper-fetch.js";
export type { NodeRelayHyperFetchOptions } from "./node-relay-hyper-fetch.js";

export { createSwarm, driveTopic } from "./swarm.js";
export type { SwarmOptions, SwarmSession } from "./swarm.js";

export { DriveManager } from "./drive.js";
export type { DriveManagerOptions, PublishedVersion } from "./drive.js";

export {
  RESOURCE_PROTOCOL_VERSION,
  attachPackageResourceServer,
  sendPackageResourceRequest,
  parseListResponse
} from "./resource-server.js";
export type { PackageResourceRequest, PackageVersionInfo, PackageResourceServerOptions } from "./resource-server.js";

export { PackageResourceClient } from "./resource-client.js";
export type { PackageResourceClientOptions } from "./resource-client.js";

export {
  SIZE_WARNING_BLE_BYTES,
  SIZE_WARNING_RNODE_BYTES,
  BULK_BLOCK_RNODE_BYTES,
  assessFetchBudget,
  fetchPackage,
  estimateTransferSeconds
} from "./fetch.js";
export type { FetchPath, FetchProgress, FetchPackageOptions, FetchPackageResult, FetchBudgetAssessment } from "./fetch.js";
