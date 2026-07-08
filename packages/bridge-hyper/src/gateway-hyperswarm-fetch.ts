import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DriveManager } from "./drive.js";
import { createSwarm } from "./swarm.js";

export interface GatewayHyperswarmFetchOptions {
  readonly driveKeyHex: string;
  readonly version: string;
  readonly timeoutMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchDriveVersionViaHyperswarm(
  options: GatewayHyperswarmFetchOptions
): Promise<Uint8Array> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const storagePath = mkdtempSync(join(tmpdir(), "tp-gateway-fetch-"));
  const swarm = createSwarm();
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
