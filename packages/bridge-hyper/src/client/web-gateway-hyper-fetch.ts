import { DEFAULT_BULK_FETCH_PATH } from "../server/gateway-bulk-fetch-server.js";

export interface WebGatewayHyperFetchOptions {
  readonly gatewayUrl: string;
  readonly driveKeyHex: string;
  readonly version: string;
  readonly timeoutMs?: number;
  readonly bulkFetchPath?: string;
}

export interface WebCompositeHyperFetchOptions extends WebGatewayHyperFetchOptions {
  readonly dhtRelayPath?: string;
}

export function gatewayHttpUrlFromWebSocket(gatewayUrl: string): string {
  const url = new URL(gatewayUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  return url.toString();
}

export function bulkFetchUrlFromGateway(
  gatewayUrl: string,
  driveKeyHex: string,
  version: string,
  path = DEFAULT_BULK_FETCH_PATH,
): string {
  const url = new URL(gatewayHttpUrlFromWebSocket(gatewayUrl));
  url.pathname = path;
  url.search = `driveKey=${encodeURIComponent(driveKeyHex)}&version=${encodeURIComponent(version)}`;
  url.hash = "";
  return url.toString();
}

export async function fetchDriveVersionViaGateway(
  options: WebGatewayHyperFetchOptions,
): Promise<Uint8Array> {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      bulkFetchUrlFromGateway(
        options.gatewayUrl,
        options.driveKeyHex,
        options.version,
        options.bulkFetchPath,
      ),
      { signal: controller.signal },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        detail.length > 0
          ? `gateway bulk fetch failed (${response.status}): ${detail}`
          : `gateway bulk fetch failed (${response.status})`,
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("gateway bulk fetch timed out");
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchDriveVersionForWeb(
  options: WebCompositeHyperFetchOptions,
): Promise<Uint8Array> {
  return fetchDriveVersionViaGateway(options);
}

export function dhtRelayUrlFromGateway(
  gatewayUrl: string,
  path = "/dht-relay",
): string {
  const url = new URL(gatewayUrl);
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString();
}
