/**
 * Bare worklet-safe surface for bridge-hyper.
 * Excludes WebSocket gateway / DHT relay modules that depend on Node's `ws` package.
 * Hyperdrive/Hyperswarm live in worklet-hyper.ts (lazy-loaded — corestore native addons).
 */
export {
  RESOURCE_PROTOCOL_VERSION,
  attachPackageResourceServer,
  sendPackageResourceRequest,
  parseListResponse,
} from "./server/resource-server.js";
export type {
  PackageResourceRequest,
  PackageVersionInfo,
  PackageResourceServerOptions,
} from "./server/resource-server.js";

export { PackageResourceClient } from "./client/resource-client.js";
export type { PackageResourceClientOptions } from "./client/resource-client.js";

export {
  SIZE_WARNING_BLE_BYTES,
  SIZE_WARNING_RNODE_BYTES,
  BULK_BLOCK_RNODE_BYTES,
  assessFetchBudget,
  fetchPackage,
  estimateTransferSeconds,
} from "./core/fetch.js";
export type {
  DriveFetcher,
  FetchPath,
  FetchProgress,
  FetchPackageOptions,
  FetchPackageResult,
  FetchBudgetAssessment,
} from "./core/fetch.js";
