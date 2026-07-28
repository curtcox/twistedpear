import type { CatalogEntry } from "@twistedpear/app-registry";
import type { CryptoProvider, PacketInterface } from "@twistedpear/reticulum-ts";
import type { FetchPath, FetchProgress } from "@twistedpear/bridge-hyper";
import type { CasLocator } from "@twistedpear/cas-256t";

export type { FetchPath, FetchProgress } from "@twistedpear/bridge-hyper";

export interface FetchPlaneRequest {
  readonly entry: CatalogEntry;
  readonly version: string;
  readonly interfaces: ReadonlyArray<PacketInterface>;
  readonly freenetLocator?: CasLocator;
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
