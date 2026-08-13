import {
  LinkResourceStrategy,
  Resource,
  type Link,
  type RegisteredDestination,
} from "@twistedpear/reticulum-ts";

export const RESOURCE_PROTOCOL_VERSION = 1;

export type PackageResourceRequest =
  | { readonly type: "list" }
  | { readonly type: "fetch"; readonly version: string };

export interface PackageVersionInfo {
  readonly version: string;
  readonly packageHash: string;
  readonly size: number;
}

export interface PackageResourceServerOptions {
  readonly listVersions: () => Promise<ReadonlyArray<PackageVersionInfo>>;
  readonly fetchArchive: (version: string) => Promise<Uint8Array>;
}

function encodeRequest(request: PackageResourceRequest): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({ v: RESOURCE_PROTOCOL_VERSION, ...request }),
  );
}

function decodeRequest(bytes: Uint8Array): PackageResourceRequest {
  const value = JSON.parse(
    new TextDecoder().decode(bytes),
  ) as PackageResourceRequest & { v?: number };
  if (value.type === "list") {
    return { type: "list" };
  }

  if (value.type === "fetch" && typeof value.version === "string") {
    return { type: "fetch", version: value.version };
  }

  throw new Error("Invalid package resource request");
}

function encodeListResponse(
  versions: ReadonlyArray<PackageVersionInfo>,
): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ versions }));
}

export function attachPackageResourceServer(
  destination: RegisteredDestination,
  options: PackageResourceServerOptions,
): void {
  destination.setLinkEstablishedCallback((link) => {
    link.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);
    link.callbacks.packet = (data) => {
      void handlePackageResourceRequest(link, options, data);
    };
  });
}

async function handlePackageResourceRequest(
  link: Link,
  options: PackageResourceServerOptions,
  data: Uint8Array,
): Promise<void> {
  try {
    const request = decodeRequest(data);
    if (request.type === "list") {
      const versions = await options.listVersions();
      Resource.send(link, encodeListResponse(versions));
      return;
    }

    const archive = await options.fetchArchive(request.version);
    Resource.send(link, archive, { advertise: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "package resource error";
    Resource.send(
      link,
      new TextEncoder().encode(JSON.stringify({ error: message })),
    );
  }
}

export interface PackageResourceRequestOptions {
  readonly timeoutMs?: number;
}

export async function sendPackageResourceRequest(
  link: Link,
  request: PackageResourceRequest,
  options: PackageResourceRequestOptions = {},
): Promise<Uint8Array> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  return new Promise<Uint8Array>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("package resource request timed out")),
      timeoutMs,
    );
    link.callbacks.resourceConcluded = (resource) => {
      clearTimeout(timer);
      resolve(resource.data ?? new Uint8Array(0));
    };

    void link.send(encodeRequest(request));
  });
}

export function parseListResponse(
  bytes: Uint8Array,
): ReadonlyArray<PackageVersionInfo> {
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
    versions: PackageVersionInfo[];
  };
  return parsed.versions;
}
