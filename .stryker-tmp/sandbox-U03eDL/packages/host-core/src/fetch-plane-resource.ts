// @ts-nocheck
import { appDestinationName, unpackPackage, type CatalogEntry } from "@twistedpear/app-registry";
import {
  parseListResponse,
  sendPackageResourceRequest
} from "@twistedpear/bridge-hyper/resource-server";
import type { CryptoProvider, Link, Reticulum } from "@twistedpear/reticulum-ts";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  LinkStatus,
  hexToBytes
} from "@twistedpear/reticulum-ts/web";
import type { FetchPlane, FetchPlaneRequest, FetchPlaneResult } from "./fetch-plane.js";

export interface ResourceFetchPlaneOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
}

export function createResourceFetchPlane(options: ResourceFetchPlaneOptions): FetchPlane {
  return {
    async fetchPackage(provider, request) {
      return fetchPackageResource(provider, options.reticulum, request);
    }
  };
}

async function fetchPackageResource(
  provider: CryptoProvider,
  reticulum: Reticulum,
  request: FetchPlaneRequest
): Promise<FetchPlaneResult> {
  request.onProgress?.({
    path: "resource",
    bytesReceived: 0,
    totalBytes: request.entry.packageSize,
    phase: "starting"
  });

  if (request.signal?.aborted) {
    throw new Error("fetch aborted");
  }

  const link = await openPublisherLink(provider, reticulum, request.entry);
  try {
    const archiveBytes = await sendPackageResourceRequest(
      link,
      { type: "fetch", version: request.version },
      { timeoutMs: 120_000 }
    );

    request.onProgress?.({
      path: "resource",
      bytesReceived: archiveBytes.length,
      totalBytes: archiveBytes.length,
      phase: "verifying"
    });

    const verified = unpackPackage(provider, archiveBytes);
    if (verified.packageHash !== request.entry.packageHash) {
      throw new Error("Package hash mismatch after resource fetch");
    }

    request.onProgress?.({
      path: "resource",
      bytesReceived: archiveBytes.length,
      totalBytes: archiveBytes.length,
      phase: "complete"
    });

    return {
      path: "resource",
      archiveBytes,
      packageHash: verified.packageHash
    };
  } finally {
    await link.teardown();
  }
}

export async function listResourceVersions(
  provider: CryptoProvider,
  reticulum: Reticulum,
  entry: CatalogEntry
) {
  const link = await openPublisherLink(provider, reticulum, entry);
  try {
    const response = await sendPackageResourceRequest(link, { type: "list" });
    return parseListResponse(response);
  } finally {
    await link.teardown();
  }
}

async function openPublisherLink(
  provider: CryptoProvider,
  reticulum: Reticulum,
  entry: CatalogEntry
): Promise<Link> {
  const publisherKey = hexToBytes(entry.servingPublicKey ?? entry.publisherPublicKey);
  const publisherIdentity = Identity.fromPublicKey(provider, publisherKey);
  if (publisherIdentity === null) {
    throw new Error("Invalid serving public key");
  }

  const destinationName = appDestinationName(provider, entry.publisherPublicKey, entry.name);
  const parts = destinationName.split(".");
  const appName = parts[0] ?? "tp";
  const aspects = parts.slice(1);

  const out = reticulum.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName,
    aspects
  });

  const link = out.requestLink({});
  return waitForActiveLink(link);
}

async function waitForActiveLink(link: Link): Promise<Link> {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    if (link.status === LinkStatus.ACTIVE) {
      return link;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error("link did not become active");
}
