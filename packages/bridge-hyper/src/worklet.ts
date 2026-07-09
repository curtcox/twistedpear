/**
 * Bare worklet-safe surface for bridge-hyper.
 * Excludes WebSocket gateway / DHT relay modules that depend on Node's `ws` package.
 */
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
export type {
  FetchPath,
  FetchProgress,
  FetchPackageOptions,
  FetchPackageResult,
  FetchBudgetAssessment
} from "./fetch.js";
