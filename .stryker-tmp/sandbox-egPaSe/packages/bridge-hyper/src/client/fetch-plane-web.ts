// @ts-nocheck
import type { CatalogEntry } from "@twistedpear/app-registry";
import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import { unpackPackage } from "@twistedpear/app-registry";
import { fetchDriveVersionViaGateway } from "./web-gateway-hyper-fetch.js";

export type WebFetchPath = "hyperdrive" | "resource";

export interface WebFetchProgress {
  readonly path: WebFetchPath;
  readonly bytesReceived: number;
  readonly totalBytes: number;
  readonly phase: "starting" | "downloading" | "verifying" | "complete" | "failed";
}

export interface WebFetchPlaneRequest {
  readonly entry: CatalogEntry;
  readonly version: string;
  readonly onProgress?: (progress: WebFetchProgress) => void;
}

export interface WebFetchPlaneResult {
  readonly path: WebFetchPath;
  readonly archiveBytes: Uint8Array;
  readonly packageHash: string;
}

export interface WebFetchPlane {
  fetchPackage(provider: CryptoProvider, request: WebFetchPlaneRequest): Promise<WebFetchPlaneResult>;
}

export interface WebCompositeFetchPlaneOptions {
  readonly resourcePlane: WebFetchPlane;
  readonly gatewayUrl: string;
}

export function createWebCompositeFetchPlane(options: WebCompositeFetchPlaneOptions): WebFetchPlane {
  return {
    async fetchPackage(provider: CryptoProvider, request: WebFetchPlaneRequest): Promise<WebFetchPlaneResult> {
      if (request.entry.driveKey.length > 0) {
        try {
          request.onProgress?.({
            path: "hyperdrive",
            bytesReceived: 0,
            totalBytes: request.entry.packageSize,
            phase: "starting"
          });

          const archiveBytes = await fetchDriveVersionViaGateway({
            gatewayUrl: options.gatewayUrl,
            driveKeyHex: request.entry.driveKey,
            version: request.version
          });

          request.onProgress?.({
            path: "hyperdrive",
            bytesReceived: archiveBytes.length,
            totalBytes: archiveBytes.length,
            phase: "verifying"
          });

          const verified = unpackPackage(provider, archiveBytes);
          if (verified.packageHash !== request.entry.packageHash) {
            throw new Error("Package hash mismatch after hyperdrive fetch");
          }

          request.onProgress?.({
            path: "hyperdrive",
            bytesReceived: archiveBytes.length,
            totalBytes: archiveBytes.length,
            phase: "complete"
          });

          return {
            path: "hyperdrive",
            archiveBytes,
            packageHash: verified.packageHash
          };
        } catch {
          request.onProgress?.({
            path: "hyperdrive",
            bytesReceived: 0,
            totalBytes: request.entry.packageSize,
            phase: "failed"
          });
        }
      }

      return options.resourcePlane.fetchPackage(provider, request);
    }
  };
}
