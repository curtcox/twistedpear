/**
 * W2 browser spike: install + launch chat, file-drop, and board example apps.
 * Reports status on window.__WEB_EXAMPLES__.
 */

import { WebSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/web.js";
import {
  encodeJsonWireValue,
  reviveJsonWireValue,
} from "../../packages/miniapp-runtime/dist/sandbox/json-wire.js";
import { EXAMPLE_FIXTURES } from "./fixtures.mjs";

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

function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function waitForRuntime(getRuntime, predicate, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const runtime = getRuntime();
    if (
      runtime?.widgetTree !== null &&
      runtime?.widgetTree !== undefined &&
      predicate(runtime)
    ) {
      return runtime;
    }

    await sleep(100);
  }

  throw new Error("timed out waiting for mini-app runtime");
}

async function exerciseExample(send, getRuntime, name, fixture, steps) {
  send({
    type: "install-app",
    appId: fixture.name,
    archiveHex: fixture.archiveHex,
  });
  await sleep(300);

  send({
    type: "set-grants",
    appId: fixture.name,
    publisherPublicKey: fixture.publisherPublicKey,
    declaredCapabilities: fixture.capabilities,
    grantedCapabilities: fixture.capabilities,
  });
  await sleep(100);

  send({ type: "launch-miniapp", appId: fixture.name });
  await sleep(500);

  await steps(getRuntime);
  send({ type: "stop-miniapp" });
  await sleep(200);
}

async function main() {
  globalThis.__WEB_EXAMPLES__ = { status: "starting", passed: [] };

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

      if (message.type === "launch-review") {
        worker.postMessage({
          channel: "host-ipc",
          data: encodeMessage({
            type: "launch-confirm",
            token: message.token,
            accept: true,
            grants: message.capabilities.map((capability) => capability.id),
          }),
        });
        continue;
      }

      if (message.type === "confirm-request") {
        worker.postMessage({
          channel: "host-ipc",
          data: encodeMessage({
            type: "confirm-response",
            token: message.token,
            approved: true,
          }),
        });
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
    gatewayUrl: "ws://127.0.0.1:9480",
  });

  const getRuntime = () => latestRuntime;
  const passed = [];

  await exerciseExample(
    send,
    getRuntime,
    "chat",
    EXAMPLE_FIXTURES.chat,
    async () => {
      await waitForRuntime(getRuntime, (runtime) =>
        treeContainsText(runtime.widgetTree, "Chat"),
      );
      await waitForRuntime(getRuntime, (runtime) =>
        treeContainsText(runtime.widgetTree, "Me:"),
      );
      send({
        type: "miniapp-ui-event",
        nodeId: "peer-input",
        event: "chat.peer",
        value: "chat-peer",
      });
      await sleep(250);
      send({ type: "miniapp-ui-event", nodeId: "send", event: "chat.send" });
      await waitForRuntime(getRuntime, (runtime) =>
        treeContainsText(runtime.widgetTree, "Sent hello"),
      );
    },
  );
  passed.push("chat");

  await exerciseExample(
    send,
    getRuntime,
    "file-drop",
    EXAMPLE_FIXTURES["file-drop"],
    async () => {
      send({
        type: "seed-miniapp-kv",
        key: "miniapp-resource:offer:demo",
        valueHex: bytesToHex(new TextEncoder().encode("phase4-demo-payload")),
      });
      await sleep(100);

      await waitForRuntime(getRuntime, (runtime) =>
        treeContainsText(runtime.widgetTree, "File Drop"),
      );
      send({
        type: "miniapp-ui-event",
        nodeId: "fetch",
        event: "resource.fetch",
      });
      await waitForRuntime(getRuntime, (runtime) => {
        const texts = collectTextValues(runtime.widgetTree.root);
        return texts.some(
          (value) => value.includes("Fetched") || value.includes("Resource"),
        );
      });
    },
  );
  passed.push("file-drop");

  await exerciseExample(
    send,
    getRuntime,
    "board",
    EXAMPLE_FIXTURES.board,
    async () => {
      await waitForRuntime(getRuntime, (runtime) =>
        treeContainsText(runtime.widgetTree, "Board"),
      );
      send({
        type: "miniapp-ui-event",
        nodeId: "publish",
        event: "board.publish",
      });
      await waitForRuntime(getRuntime, (runtime) =>
        treeContainsText(runtime.widgetTree, "Published 1 post"),
      );
      send({
        type: "miniapp-ui-event",
        nodeId: "refresh",
        event: "board.refresh",
      });
      await waitForRuntime(getRuntime, (runtime) =>
        treeContainsText(runtime.widgetTree, "1 local post"),
      );
    },
  );
  passed.push("board");

  globalThis.__WEB_EXAMPLES__ = { status: "done", passed };
}

main().catch((error) => {
  globalThis.__WEB_EXAMPLES__ = {
    status: "error",
    message: error instanceof Error ? error.message : String(error),
  };
});
