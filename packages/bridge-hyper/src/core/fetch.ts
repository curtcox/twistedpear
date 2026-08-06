import {
  DEFAULT_INTERFACE_BITRATES,
  InterfaceKind,
  inferInterfaceKind,
  type InterfaceKindValue,
} from "@twistedpear/reticulum-interfaces/policy";
import type {
  CryptoProvider,
  PacketInterface,
} from "@twistedpear/reticulum-ts";
import { unpackPackage, type CatalogEntry } from "@twistedpear/app-registry";
import type { CasLocator } from "@twistedpear/cas-256t";
import type { DriveManager } from "./drive.js";
import type { PackageResourceClient } from "../client/resource-client.js";

export const SIZE_WARNING_BLE_BYTES = 256 * 1024;
export const SIZE_WARNING_RNODE_BYTES = 32 * 1024;
export const BULK_BLOCK_RNODE_BYTES = 64 * 1024;

export type FetchPath = "hyperdrive" | "lan-mirror" | "freenet" | "resource";

/**
 * Single drive-byte fetcher used by gateway, node-relay, and web leaf paths.
 * Prefer this over special-cased call sites when selecting a bulk/drive transport.
 */
export interface DriveFetcher {
  fetchDriveVersion(driveKeyHex: string, version: string): Promise<Uint8Array>;
}

/** Structural seam implemented by bridge-freenet without creating a package cycle. */
export interface FreenetFetcher {
  fetchLocator(locator: CasLocator): Promise<Uint8Array>;
}

export interface FetchProgress {
  readonly path: FetchPath;
  readonly bytesReceived: number;
  readonly totalBytes: number;
  readonly phase:
    "starting" | "downloading" | "verifying" | "complete" | "failed";
}

export interface FetchPackageOptions {
  readonly entry: CatalogEntry;
  readonly version: string;
  readonly interfaces: ReadonlyArray<PacketInterface>;
  readonly driveManager?: DriveManager;
  /** Alternate hyperdrive path when a DriveManager is not wired (gateway/leaf fetchers). */
  readonly driveFetcher?: DriveFetcher;
  readonly lanMirrorKeyHex?: string;
  readonly freenetFetcher?: FreenetFetcher;
  readonly freenetLocator?: CasLocator;
  readonly resourceClient?: PackageResourceClient;
  readonly forcePath?: FetchPath;
  readonly onProgress?: (progress: FetchProgress) => void;
  readonly signal?: AbortSignal;
}

export interface FetchPackageResult {
  readonly path: FetchPath;
  readonly archiveBytes: Uint8Array;
  readonly verified: Awaited<ReturnType<typeof unpackPackage>>;
}

export interface FetchBudgetAssessment {
  readonly allowed: boolean;
  readonly warning: string | null;
  readonly blockedReason: string | null;
}

export function assessFetchBudget(
  entry: CatalogEntry,
  interfaces: ReadonlyArray<PacketInterface>,
  freenetNodeAvailable = false,
): FetchBudgetAssessment {
  const kinds = new Set(
    interfaces
      .filter((iface) => iface.online)
      .map((iface) => inferInterfaceKind(iface.name)),
  );
  const onlyRnode =
    kinds.size > 0 &&
    [...kinds].every(
      (kind) => kind === InterfaceKind.RNODE || kind === InterfaceKind.I2P,
    );

  if (
    !freenetNodeAvailable &&
    onlyRnode &&
    entry.packageSize > BULK_BLOCK_RNODE_BYTES
  ) {
    return {
      allowed: false,
      warning: null,
      blockedReason: `Package size ${entry.packageSize} exceeds RNode bulk budget (${BULK_BLOCK_RNODE_BYTES} bytes)`,
    };
  }

  if (
    kinds.has(InterfaceKind.BLE) &&
    entry.packageSize > SIZE_WARNING_BLE_BYTES
  ) {
    return {
      allowed: true,
      warning: `Large package (${entry.packageSize} bytes) over BLE may take several minutes`,
      blockedReason: null,
    };
  }

  if (
    kinds.has(InterfaceKind.RNODE) &&
    entry.packageSize > SIZE_WARNING_RNODE_BYTES
  ) {
    return {
      allowed: true,
      warning: `Package size ${entry.packageSize} bytes is large for LoRa transfer`,
      blockedReason: null,
    };
  }

  return { allowed: true, warning: null, blockedReason: null };
}

function ipPathsAvailable(interfaces: ReadonlyArray<PacketInterface>): boolean {
  return interfaces.some((iface) => {
    if (!iface.online) {
      return false;
    }

    const kind = inferInterfaceKind(iface.name);
    return (
      kind === InterfaceKind.AUTO ||
      kind === InterfaceKind.TCP ||
      kind === InterfaceKind.UDP
    );
  });
}

function orderedPaths(
  interfaces: ReadonlyArray<PacketInterface>,
  freenetAvailable: boolean,
  forcePath?: FetchPath,
): FetchPath[] {
  if (forcePath !== undefined) {
    return [forcePath];
  }

  if (ipPathsAvailable(interfaces)) {
    return freenetAvailable
      ? ["hyperdrive", "lan-mirror", "freenet", "resource"]
      : ["hyperdrive", "lan-mirror", "resource"];
  }

  return freenetAvailable ? ["freenet", "resource"] : ["resource"];
}

export async function fetchPackage(
  provider: CryptoProvider,
  options: FetchPackageOptions,
): Promise<FetchPackageResult> {
  const freenetNodeAvailable =
    options.freenetFetcher !== undefined &&
    options.freenetLocator !== undefined;
  const budget = assessFetchBudget(
    options.entry,
    options.interfaces,
    freenetNodeAvailable || options.forcePath === "freenet",
  );
  if (!budget.allowed) {
    throw new Error(budget.blockedReason ?? "fetch blocked by budget rules");
  }

  const paths = orderedPaths(
    options.interfaces,
    freenetNodeAvailable,
    options.forcePath,
  );
  let lastError: Error | null = null;

  for (const path of paths) {
    options.onProgress?.({
      path,
      bytesReceived: 0,
      totalBytes: options.entry.packageSize,
      phase: "starting",
    });

    if (options.signal?.aborted) {
      throw new Error("fetch aborted");
    }

    try {
      const archiveBytes = await fetchByPath(path, options);
      options.onProgress?.({
        path,
        bytesReceived: archiveBytes.length,
        totalBytes: archiveBytes.length,
        phase: "verifying",
      });

      const verified = unpackPackage(provider, archiveBytes);
      if (verified.packageHash !== options.entry.packageHash) {
        throw new Error("Package hash mismatch after fetch");
      }

      options.onProgress?.({
        path,
        bytesReceived: archiveBytes.length,
        totalBytes: archiveBytes.length,
        phase: "complete",
      });

      return { path, archiveBytes, verified };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      options.onProgress?.({
        path,
        bytesReceived: 0,
        totalBytes: options.entry.packageSize,
        phase: "failed",
      });
    }
  }

  throw lastError ?? new Error("all fetch paths failed");
}

async function fetchByPath(
  path: FetchPath,
  options: FetchPackageOptions,
): Promise<Uint8Array> {
  switch (path) {
    case "hyperdrive": {
      if (options.driveFetcher !== undefined) {
        return options.driveFetcher.fetchDriveVersion(
          options.entry.driveKey,
          options.version,
        );
      }

      if (options.driveManager === undefined) {
        throw new Error("hyperdrive path unavailable");
      }

      if (options.driveManager.activeDrive === null) {
        await options.driveManager.openDrive(options.entry.driveKey);
      }

      return options.driveManager.fetchVersion(options.version);
    }

    case "lan-mirror": {
      if (
        options.driveManager === undefined ||
        options.lanMirrorKeyHex === undefined
      ) {
        throw new Error("lan mirror path unavailable");
      }

      await options.driveManager.mirrorFrom(options.lanMirrorKeyHex);
      return options.driveManager.fetchVersion(options.version);
    }

    case "freenet": {
      if (
        options.freenetFetcher === undefined ||
        options.freenetLocator === undefined
      ) {
        throw new Error("freenet path unavailable");
      }
      return options.freenetFetcher.fetchLocator(options.freenetLocator);
    }

    case "resource": {
      if (options.resourceClient === undefined) {
        throw new Error("resource path unavailable");
      }

      const result = await options.resourceClient.fetchVersion(options.version);
      return result.archiveBytes;
    }

    default:
      throw new Error(`unknown fetch path: ${path satisfies never}`);
  }
}

export function estimateTransferSeconds(
  sizeBytes: number,
  kind: InterfaceKindValue,
): number {
  const bitrate = DEFAULT_INTERFACE_BITRATES[kind] ?? 5_000;
  return Math.ceil((sizeBytes * 8) / bitrate);
}
