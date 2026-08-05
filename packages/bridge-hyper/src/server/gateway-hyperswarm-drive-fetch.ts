import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DriveManager } from "../core/drive.js";
import { createSwarm } from "../core/swarm.js";
import type { DriveFetcher } from "../core/fetch.js";
import type { ByteRateLimiter } from "@twistedpear/reticulum-ts";

export interface GatewayHyperswarmFetchOptions {
  readonly driveKeyHex: string;
  readonly version: string;
  readonly timeoutMs?: number;
  readonly inboundBandwidthLimiter?: ByteRateLimiter;
  readonly outboundBandwidthLimiter?: ByteRateLimiter;
}

export function createGatewayHyperswarmDriveFetcher(
  options: Omit<GatewayHyperswarmFetchOptions, "driveKeyHex" | "version"> = {}
): DriveFetcher {
  return {
    fetchDriveVersion(driveKeyHex, version) {
      return fetchDriveVersionViaHyperswarm({ ...options, driveKeyHex, version });
    }
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchDriveVersionViaHyperswarm(
  options: GatewayHyperswarmFetchOptions
): Promise<Uint8Array> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const storagePath = mkdtempSync(join(tmpdir(), "tp-gateway-fetch-"));
  const swarm = createSwarm({
    ...(options.inboundBandwidthLimiter === undefined
      ? {}
      : { inboundBandwidthLimiter: options.inboundBandwidthLimiter }),
    ...(options.outboundBandwidthLimiter === undefined
      ? {}
      : { outboundBandwidthLimiter: options.outboundBandwidthLimiter })
  });
  const driveManager = new DriveManager({ storagePath, swarm });

  try {
    await driveManager.ready();
    await driveManager.openDrive(options.driveKeyHex, { serve: false });

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        return await driveManager.fetchVersion(options.version);
      } catch {
        await sleep(250);
      }
    }

    throw new Error(`hyperdrive fetch timed out for ${options.version}`);
  } finally {
    await driveManager.close();
    await swarm.destroy();
    rmSync(storagePath, { recursive: true, force: true });
  }
}
