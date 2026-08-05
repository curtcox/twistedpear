/**
 * W2 browser spike: core worker mini-app runtime + main-thread sandbox relay.
 * Reports status on window.__WEB_MINIAPP__.
 */

import { WebSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/web.js";
import {
  encodeJsonWireValue,
  reviveJsonWireValue
} from "../../packages/miniapp-runtime/dist/sandbox/json-wire.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hexToBytes(hex) {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
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
                    request: encodeJsonWireValue(request)
                  });
                })
            }
          });

          instances.set(message.instanceId, instance);
          sendToWorker({
            type: "sandbox-spawned",
            requestId: message.requestId,
            instanceId: message.instanceId
          });
        } catch (error) {
          sendToWorker({
            type: "sandbox-spawn-failed",
            requestId: message.requestId,
            message: error instanceof Error ? error.message : String(error)
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
        const alive = instance === undefined ? false : await instance.ping(message.timeoutMs);
        sendToWorker({
          type: "sandbox-ping-result",
          requestId: message.requestId,
          alive
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
    }
  };
}

function collectTextValues(node) {
  const values = [];
  if (node.type === "text" && typeof node.props?.value === "string") {
    values.push(node.props.value);
  }

  for (const child of node.children ?? []) {
    values.push(...collectTextValues(child));
  }

  return values;
}

function treeContainsText(tree, needle) {
  return collectTextValues(tree.root).some((value) => value.includes(needle));
}

async function main() {
  globalThis.__WEB_MINIAPP__ = { status: "starting" };

  const worker = new Worker("./web-core.worker.js", { type: "module" });
  let buffer = "";
  let latestRuntime = null;
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

      if (message.type === "log") {
        console.log(`worker: ${message.line}`);
        continue;
      }

      if (message.type === "miniapp-runtime") {
        latestRuntime = message.runtime;
      }
    }
  };

  worker.onerror = (event) => {
    console.error(`worker-error: ${event.message ?? String(event)}`);
  };

  const send = (message) => {
    worker.postMessage({ channel: "host-ipc", data: encodeMessage(message) });
  };

  send({
    type: "start",
    targetHost: "127.0.0.1",
    targetPort: 9480,
    gatewayUrl: "ws://127.0.0.1:9480"
  });
  send({ type: "dev-side-load-hello" });

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (latestRuntime?.widgetTree !== null && latestRuntime?.widgetTree !== undefined) {
      if (treeContainsText(latestRuntime.widgetTree, "Hello from web sandbox")) {
        break;
      }
    }

    await sleep(100);
  }

  if (latestRuntime?.widgetTree === null || latestRuntime?.widgetTree === undefined) {
    throw new Error("mini-app widget tree did not render");
  }

  if (!treeContainsText(latestRuntime.widgetTree, "Hello from web sandbox")) {
    throw new Error("hello widget tree missing expected title");
  }

  send({ type: "miniapp-ui-event", nodeId: "go", event: "hello.tap" });

  let tapped = false;
  const tapDeadline = Date.now() + 10_000;
  while (Date.now() < tapDeadline) {
    if (latestRuntime?.widgetTree !== null && latestRuntime?.widgetTree !== undefined) {
      if (treeContainsText(latestRuntime.widgetTree, "Tapped!")) {
        tapped = true;
        break;
      }
    }

    await sleep(100);
  }

  if (!tapped) {
    throw new Error("hello tap event did not update widget tree");
  }

  globalThis.__WEB_MINIAPP__ = {
    status: "done",
    appId: latestRuntime.appId,
    state: latestRuntime.state
  };
}

main().catch((error) => {
  globalThis.__WEB_MINIAPP__ = {
    status: "error",
    message: error instanceof Error ? error.message : String(error)
  };
});
