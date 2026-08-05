/**
 * W3 browser spike: install chat from 256t via Resource fetch + install review.
 * Reports status on window.__WEB_DISTRIBUTION__.
 */

import { WebSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/web.js";
import {
  encodeJsonWireValue,
  reviveJsonWireValue,
} from "../../packages/miniapp-runtime/dist/sandbox/json-wire.js";
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

function hexToBytes(hex) {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(
      normalized.slice(index * 2, index * 2 + 2),
      16,
    );
  }

  return bytes;
}

function createSandboxRelay(sendToWorker) {
  const instances = new Map();
  const pendingBrokers = new Map();

  return {
    async handleWorkerMessage(message) {
      if (message.type === "sandbox-spawn") {
        const backend = new WebSandboxBackend();
        try {
          const instance = await backend.spawn({
            appId: message.appId,
            version: message.version,
            entryPath: message.entryPath,
            bundle: hexToBytes(message.bundleHex),
            brokerEndpoint: {
              request: async (request) =>
                new Promise((resolve, reject) => {
                  const requestId = `broker-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
                  pendingBrokers.set(requestId, { resolve, reject });
                  sendToWorker({
                    type: "sandbox-broker-request",
                    requestId,
                    instanceId: message.instanceId,
                    request: encodeJsonWireValue(request),
                  });
                }),
            },
          });

          instances.set(message.instanceId, instance);
          sendToWorker({
            type: "sandbox-spawned",
            requestId: message.requestId,
            instanceId: message.instanceId,
          });
        } catch (error) {
          sendToWorker({
            type: "sandbox-spawn-failed",
            requestId: message.requestId,
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return;
      }

      if (message.type === "sandbox-post") {
        const instance = instances.get(message.instanceId);
        await instance?.postMessage(message.payload);
        return;
      }

      if (message.type === "sandbox-ping") {
        const instance = instances.get(message.instanceId);
        const alive =
          instance === undefined
            ? false
            : await instance.ping(message.timeoutMs);
        sendToWorker({
          type: "sandbox-ping-result",
          requestId: message.requestId,
          alive,
        });
        return;
      }

      if (message.type === "sandbox-kill") {
        const instance = instances.get(message.instanceId);
        if (instance !== undefined) {
          await instance.kill(message.reason);
          instances.delete(message.instanceId);
        }

        return;
      }

      if (message.type === "sandbox-broker-response") {
        const waiter = pendingBrokers.get(message.requestId);
        if (waiter === undefined) {
          return;
        }

        pendingBrokers.delete(message.requestId);
        waiter.resolve(reviveJsonWireValue(message.response));
      }
    },
  };
}

async function main() {
  globalThis.__WEB_DISTRIBUTION__ = { status: "starting" };

  const params = new URLSearchParams(globalThis.location?.search ?? "");
  const gatewayUrl = params.get("ws");
  if (gatewayUrl === null || gatewayUrl.length === 0) {
    throw new Error("Missing ?ws= gateway URL query parameter");
  }

  const worker = new Worker("./web-core.worker.js", { type: "module" });
  let buffer = "";
  let installResult = null;
  const relay = createSandboxRelay((message) => {
    worker.postMessage({ channel: "host-ipc", data: encodeMessage(message) });
  });

  worker.onmessage = (event) => {
    if (event.data?.channel !== "ipc") {
      return;
    }

    const chunk = typeof event.data.data === "string" ? event.data.data : "";
    const decoded = decodeMessages(`${buffer}${chunk}`);
    buffer = decoded.remainder;

    for (const message of decoded.messages) {
      if (
        message.type === "sandbox-spawn" ||
        message.type === "sandbox-post" ||
        message.type === "sandbox-ping" ||
        message.type === "sandbox-kill" ||
        message.type === "sandbox-broker-response"
      ) {
        void relay.handleWorkerMessage(message);
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
    targetHost: "127.0.0.1",
    targetPort: 9480,
    gatewayUrl,
    identityPassphrase: "web-distribution-test",
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

  const deadline = Date.now() + 90_000;
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

  if (installResult.appId !== DISTRIBUTION_FIXTURE.appId) {
    throw new Error(
      `expected appId ${DISTRIBUTION_FIXTURE.appId}, got ${installResult.appId}`,
    );
  }

  globalThis.__WEB_DISTRIBUTION__ = {
    status: "done",
    appId: installResult.appId,
    version: installResult.version,
    trusted: installResult.trusted,
  };
}

main().catch((error) => {
  globalThis.__WEB_DISTRIBUTION__ = {
    status: "error",
    message: error instanceof Error ? error.message : String(error),
  };
});
