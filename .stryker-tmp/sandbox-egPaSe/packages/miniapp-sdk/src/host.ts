// @ts-nocheck
import type { HostInfo } from "@twistedpear/miniapp-runtime";
import { callHost } from "./rpc.js";

/**
 * Host metadata for diagnostics and platform-difference matrices.
 * Requires the `presence` capability (coarse host/peer state).
 */
export async function info(): Promise<HostInfo> {
  return (await callHost("host", "info", undefined, "presence")) as HostInfo;
}
