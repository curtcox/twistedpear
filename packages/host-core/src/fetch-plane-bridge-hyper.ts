import type {
  PackageResourceClient,
  DriveFetcher,
  DriveManager,
  FreenetFetcher
} from "@twistedpear/bridge-hyper";
import { fetchPackage as bridgeFetchPackage } from "@twistedpear/bridge-hyper";
import type { FetchPlane } from "./fetch-plane.js";

export interface BridgeHyperFetchPlaneOptions {
  readonly driveManager?: DriveManager;
  readonly driveFetcher?: DriveFetcher;
  readonly resourceClient?: PackageResourceClient;
  readonly lanMirrorKeyHex?: string;
  readonly freenetFetcher?: FreenetFetcher;
}

export function createBridgeHyperFetchPlane(options: BridgeHyperFetchPlaneOptions): FetchPlane {
  return {
    async fetchPackage(provider, request) {
      const result = await bridgeFetchPackage(provider, {
        entry: request.entry,
        version: request.version,
        interfaces: request.interfaces,
        ...(options.driveManager === undefined ? {} : { driveManager: options.driveManager }),
        ...(options.driveFetcher === undefined ? {} : { driveFetcher: options.driveFetcher }),
        ...(options.resourceClient === undefined ? {} : { resourceClient: options.resourceClient }),
        ...(options.lanMirrorKeyHex === undefined ? {} : { lanMirrorKeyHex: options.lanMirrorKeyHex }),
        ...(options.freenetFetcher === undefined ? {} : { freenetFetcher: options.freenetFetcher }),
        ...(request.freenetLocator === undefined ? {} : { freenetLocator: request.freenetLocator }),
        ...(request.onProgress === undefined ? {} : { onProgress: request.onProgress }),
        ...(request.signal === undefined ? {} : { signal: request.signal })
      });

      return {
        path: result.path,
        archiveBytes: result.archiveBytes,
        packageHash: result.verified.packageHash
      };
    }
  };
}
