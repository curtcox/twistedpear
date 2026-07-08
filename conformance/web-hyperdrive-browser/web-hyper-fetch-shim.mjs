/**
 * Conformance shim: stand in for web-hyper-fetch.js when relayed Hyperswarm peer
 * discovery is unavailable in CI. Fetches the publisher fixture from the same origin
 * as the Playwright static server.
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
