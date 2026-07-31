var __filename='';var __dirname='';var process={env:{}};

// ../../packages/bridge-hyper/src/server/gateway-bulk-fetch-server.ts
var DEFAULT_BULK_FETCH_PATH = "/bulk-fetch";

// ../../packages/bridge-hyper/src/client/web-gateway-hyper-fetch.ts
function gatewayHttpUrlFromWebSocket(gatewayUrl) {
  const url = new URL(gatewayUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  return url.toString();
}
function bulkFetchUrlFromGateway(gatewayUrl, driveKeyHex, version, path = DEFAULT_BULK_FETCH_PATH) {
  const url = new URL(gatewayHttpUrlFromWebSocket(gatewayUrl));
  url.pathname = path;
  url.search = `driveKey=${encodeURIComponent(driveKeyHex)}&version=${encodeURIComponent(version)}`;
  url.hash = "";
  return url.toString();
}
async function fetchDriveVersionViaGateway(options) {
  const timeoutMs = options.timeoutMs ?? 9e4;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      bulkFetchUrlFromGateway(
        options.gatewayUrl,
        options.driveKeyHex,
        options.version,
        options.bulkFetchPath
      ),
      { signal: controller.signal }
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        detail.length > 0 ? `gateway bulk fetch failed (${response.status}): ${detail}` : `gateway bulk fetch failed (${response.status})`
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
async function fetchDriveVersionForWeb(options) {
  return fetchDriveVersionViaGateway(options);
}
function dhtRelayUrlFromGateway(gatewayUrl, path = "/dht-relay") {
  const url = new URL(gatewayUrl);
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString();
}
export {
  bulkFetchUrlFromGateway,
  dhtRelayUrlFromGateway,
  fetchDriveVersionForWeb,
  fetchDriveVersionViaGateway,
  gatewayHttpUrlFromWebSocket
};
