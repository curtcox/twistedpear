/**
 * W4 browser spike: install from 256t via Hyperdrive-over-relay (no Resource fallback).
 * Reports status on window.__WEB_HYPERDRIVE__.
 */

import { DISTRIBUTION_FIXTURE } from "./fixtures.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function encodeMessage(message) {
  return `${JSON.stringify(message)}\n`;
}

function decodeMessages(buffer) {
  const messages = [];
  let remainder = buffer;

  while (true) {
    const newline = remainder.indexOf("\n");
    if (newline < 0) {
      break;
    }

    const line = remainder.slice(0, newline).trim();
    remainder = remainder.slice(newline + 1);
    if (line.length === 0) {
      continue;
    }

    try {
      messages.push(JSON.parse(line));
    } catch {
      // Ignore malformed lines.
    }
  }

  return { messages, remainder };
}

async function main() {
  globalThis.__WEB_HYPERDRIVE__ = { status: "starting" };

  const params = new URLSearchParams(globalThis.location?.search ?? "");
  const gatewayUrl = params.get("ws");
  if (gatewayUrl === null || gatewayUrl.length === 0) {
    throw new Error("Missing ?ws= gateway URL query parameter");
  }

  const worker = new Worker("./web-core.worker.js", { type: "module" });
  let buffer = "";
  let installResult = null;

  worker.onmessage = (event) => {
    if (event.data?.channel !== "ipc") {
      return;
    }

    const chunk = typeof event.data.data === "string" ? event.data.data : "";
    const decoded = decodeMessages(`${buffer}${chunk}`);
    buffer = decoded.remainder;

    for (const message of decoded.messages) {
      if (message.type === "log") {
        console.log(message.line);
        continue;
      }

      if (message.type === "install-review") {
        worker.postMessage({
          channel: "host-ipc",
          data: encodeMessage({
            type: "install-confirm",
            token: message.token,
            accept: true,
            grants: message.capabilities.map((capability) => capability.id),
          }),
        });
        continue;
      }

      if (message.type === "install-256t-result") {
        installResult = message;
      }
    }
  };

  const send = (message) => {
    worker.postMessage({ channel: "host-ipc", data: encodeMessage(message) });
  };

  send({
    type: "start",
    gatewayUrl,
    identityPassphrase: "web-hyperdrive-browser-test",
  });
  send({ type: "create-identity" });
  send({
    type: "set-interfaces",
    tcp: true,
    auto: false,
    ble: false,
    rnode: false,
  });
  await sleep(2_000);

  send({ type: "install-from-256t", t256: DISTRIBUTION_FIXTURE.t256 });

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (installResult !== null) {
      break;
    }

    await sleep(200);
  }

  if (installResult === null) {
    throw new Error("timed out waiting for install-256t-result");
  }

  if (installResult.ok !== true) {
    throw new Error(`256t install failed: ${installResult.error ?? "unknown"}`);
  }

  if (installResult.fetchPath !== "hyperdrive") {
    throw new Error(
      `expected hyperdrive fetch path, got ${installResult.fetchPath ?? "unknown"}`,
    );
  }

  if (installResult.appId !== DISTRIBUTION_FIXTURE.appId) {
    throw new Error(
      `expected appId ${DISTRIBUTION_FIXTURE.appId}, got ${installResult.appId}`,
    );
  }

  globalThis.__WEB_HYPERDRIVE__ = {
    status: "done",
    appId: installResult.appId,
    version: installResult.version,
    fetchPath: installResult.fetchPath,
  };
}

main().catch((error) => {
  globalThis.__WEB_HYPERDRIVE__ = {
    status: "error",
    message: error instanceof Error ? error.message : String(error),
  };
});
