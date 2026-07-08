/**
 * Legacy conformance shim (superseded by live gateway `/bulk-fetch` in test:web-hyperdrive-browser).
 * Kept for local experiments when relay peer discovery regresses.
 */

export function dhtRelayUrlFromGateway(gatewayUrl, path = "/dht-relay") {
  const url = new URL(gatewayUrl);
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export async function fetchDriveVersionViaRelay(_options) {
  const archiveUrl = new URL("./test-hyper-archive", import.meta.url).href;
  const response = await fetch(archiveUrl);
  if (!response.ok) {
    throw new Error(`hyperdrive fixture fetch failed (${response.status})`);
  }

  return new Uint8Array(await response.arrayBuffer());
}
