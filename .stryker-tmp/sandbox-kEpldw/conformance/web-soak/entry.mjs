/**
 * W4 browser soak: repeated hello mini-app launch / UI / suspend / stop in the tab.
 * Reports status on window.__WEB_SOAK__.
 */
// @ts-nocheck


import { WebSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/web.js";
import {
  encodeJsonWireValue,
  reviveJsonWireValue
} from "../../packages/miniapp-runtime/dist/sandbox/json-wire.js";

const DEFAULT_SOAK_DURATION_MS = 15_000;

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

function hexToBytes(hex) {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
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

async function waitForRuntime(getRuntime, predicate, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const runtime = getRuntime();
    if (runtime?.widgetTree !== null && runtime?.widgetTree !== undefined && predicate(runtime)) {
      return runtime;
    }

    await sleep(50);
  }

  throw new Error("timed out waiting for mini-app runtime");
}

async function waitForCondition(getRuntime, predicate, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const runtime = getRuntime();
    if (predicate(runtime)) {
      return runtime;
    }

    await sleep(50);
  }

  throw new Error("timed out waiting for mini-app condition");
}

async function main() {
  const params = new URLSearchParams(globalThis.location?.search ?? "");
  const soakDurationMs = Number(params.get("duration") ?? DEFAULT_SOAK_DURATION_MS);
  globalThis.__WEB_SOAK__ = { status: "starting", cycles: 0, soakDurationMs };

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

      if (message.type === "miniapp-runtime") {
        latestRuntime = message.runtime;
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
    gatewayUrl: "ws://127.0.0.1:9480"
  });

  const started = Date.now();
  let cycles = 0;
  let interfaceFlaps = 0;

  while (Date.now() - started < soakDurationMs) {
    const flap = interfaceFlaps % 2 === 0;
    send({ type: "dev-side-load-hello" });
    await waitForRuntime(
      () => latestRuntime,
      (runtime) => treeContainsText(runtime.widgetTree, "Hello from web sandbox")
    );

    send({ type: "miniapp-ui-event", nodeId: "go", event: "hello.tap" });
    await waitForRuntime(() => latestRuntime, (runtime) => treeContainsText(runtime.widgetTree, "Tapped!"));

    if (flap) {
      send({ type: "suspend-miniapp" });
      await sleep(25);
      send({ type: "resume-miniapp" });
      await waitForCondition(() => latestRuntime, (runtime) => runtime?.state === "running");
    }

    send({ type: "stop-miniapp" });
    await waitForCondition(() => latestRuntime, (runtime) => runtime?.state === "stopped");
    cycles += 1;
    interfaceFlaps += 1;
    globalThis.__WEB_SOAK__ = { status: "running", cycles, soakDurationMs };
  }

  globalThis.__WEB_SOAK__ = {
    status: "done",
    cycles,
    elapsedMs: Date.now() - started,
    soakDurationMs,
    interfaceFlaps
  };
}

main().catch((error) => {
  globalThis.__WEB_SOAK__ = {
    status: "error",
    message: error instanceof Error ? error.message : String(error),
    cycles: globalThis.__WEB_SOAK__?.cycles ?? 0
  };
});
