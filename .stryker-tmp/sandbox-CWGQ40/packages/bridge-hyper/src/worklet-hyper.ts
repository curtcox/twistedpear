/**
 * Lazy-loaded Hyperdrive/Hyperswarm surface for Bare worklets.
 * Separated so corestore native addons are not pulled into the default worklet graph.
 */
// @ts-nocheck

export { createSwarm, driveTopic } from "./core/swarm.js";
export type { SwarmOptions, SwarmSession } from "./core/swarm.js";

export { DriveManager } from "./core/drive.js";
export type { DriveManagerOptions, PublishedVersion } from "./core/drive.js";
