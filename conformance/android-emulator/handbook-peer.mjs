#!/usr/bin/env node
/**
 * Android emulator entry point — delegates to shared Handbook publisher peer.
 */

process.env.HANDBOOK_PEER_LOG_PREFIX =
  process.env.HANDBOOK_PEER_LOG_PREFIX ?? "android-emulator/handbook-peer";

await import("../handbook/handbook-peer.mjs");
