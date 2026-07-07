import type { CatalogEntry } from "@twistedpear/app-registry";
import type { CryptoProvider, PacketInterface } from "@twistedpear/reticulum-ts";

export type FetchPath = "hyperdrive" | "lan-mirror" | "resource";

export interface FetchProgress {
  readonly path: FetchPath;
  readonly bytesReceived: number;
  readonly totalBytes: number;
  readonly phase: "starting" | "downloading" | "verifying" | "complete" | "failed";
}

export interface FetchPlaneRequest {
  readonly entry: CatalogEntry;
  readonly version: string;
  readonly interfaces: ReadonlyArray<PacketInterface>;
  readonly onProgress?: (progress: FetchProgress) => void;
  readonly signal?: AbortSignal;
}

export interface FetchPlaneResult {
  readonly path: FetchPath;
  readonly archiveBytes: Uint8Array;
  readonly packageHash: string;
}

export interface FetchPlane {
  fetchPackage(provider: CryptoProvider, request: FetchPlaneRequest): Promise<FetchPlaneResult>;
}
