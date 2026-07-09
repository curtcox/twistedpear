/**
 * Hyperdrive / Hyperswarm surface for Bare worklets.
 * Kept out of worklet.ts so corestore and its native addons load only on demand.
 */
export { createSwarm, driveTopic } from "./swarm.js";
export type { SwarmOptions, SwarmSession } from "./swarm.js";

export { DriveManager } from "./drive.js";
export type { DriveManagerOptions, PublishedVersion } from "./drive.js";
