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

/** Every miniapp-runtime frame received, for timeout diagnostics. */
const RUNTIME_FRAMES = [];
/** Count of every host->page message by type, for timeout diagnostics. */
const MESSAGE_TYPES = new Map();
/** Lines the mini-app itself logged, for timeout diagnostics. */
const MINIAPP_LOGS = [];

function recordMessage(type) {
  MESSAGE_TYPES.set(type, (MESSAGE_TYPES.get(type) ?? 0) + 1);
}

function messageTypeCounts() {
  return Object.fromEntries(MESSAGE_TYPES);
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

/**
 * Wait for a mini-app runtime frame satisfying `predicate`.
 *
 * `label` names the condition in the failure message: without it every step in
 * every example failed with the same sentence and the harness could not say
 * which one gave up, nor whether any runtime frame had arrived at all.
 */
async function waitForRuntime(
  getRuntime,
  label,
  predicate,
  timeoutMs = 15_000,
) {
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

  const runtime = getRuntime();
  const seen =
    runtime === null || runtime === undefined
      ? "no miniapp-runtime frame ever arrived"
      : runtime.widgetTree === null || runtime.widgetTree === undefined
        ? `${RUNTIME_FRAMES.length} runtime frame(s) arrived, none with a widgetTree`
        : `${RUNTIME_FRAMES.length} runtime frame(s) arrived; latest tree text: ${JSON.stringify(
            collectTextValues(runtime.widgetTree.root).slice(0, 20),
          )}`;

  const states = RUNTIME_FRAMES.map((frame) => frame?.state ?? null);
  throw new Error(
    `timed out after ${timeoutMs}ms waiting for ${label} — ${seen}; runtime states: ${JSON.stringify(
      states,
    )}; host messages seen: ${JSON.stringify(
      messageTypeCounts(),
    )}; mini-app logs: ${JSON.stringify(MINIAPP_LOGS.slice(-10))}`,
  );
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
      recordMessage(String(message.type));
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

      if (message.type === "miniapp-log") {
        MINIAPP_LOGS.push(`${message.appId}: ${message.line}`);
        continue;
      }

      if (message.type === "miniapp-runtime") {
        latestRuntime = message.runtime;
        RUNTIME_FRAMES.push(message.runtime);
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
    identityPassphrase: "web-examples-test",
  });
  // The chat example calls identity.destinationHash() at module top level, so
  // without an installation identity it never reaches its first ui.render() and
  // the widget tree stays null until the broker's 15s readiness wait expires.
  // Every sibling web-* harness sends this; only this one did not.
  send({ type: "create-identity" });
  await sleep(1_500);

  const getRuntime = () => latestRuntime;
  const passed = [];

  await exerciseExample(
    send,
    getRuntime,
    "chat",
    EXAMPLE_FIXTURES.chat,
    async () => {
      await waitForRuntime(getRuntime, 'chat: text "Chat"', (runtime) =>
        treeContainsText(runtime.widgetTree, "Chat"),
      );
      await waitForRuntime(getRuntime, 'chat: text "Me:"', (runtime) =>
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
      await waitForRuntime(getRuntime, 'chat: text "Sent hello"', (runtime) =>
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

      await waitForRuntime(
        getRuntime,
        'file-drop: text "File Drop"',
        (runtime) => treeContainsText(runtime.widgetTree, "File Drop"),
      );
      send({
        type: "miniapp-ui-event",
        nodeId: "fetch",
        event: "resource.fetch",
      });
      await waitForRuntime(
        getRuntime,
        'file-drop: text "Fetched" or "Resource"',
        (runtime) => {
          const texts = collectTextValues(runtime.widgetTree.root);
          return texts.some(
            (value) => value.includes("Fetched") || value.includes("Resource"),
          );
        },
      );
    },
  );
  passed.push("file-drop");

  await exerciseExample(
    send,
    getRuntime,
    "board",
    EXAMPLE_FIXTURES.board,
    async () => {
      await waitForRuntime(getRuntime, 'board: text "Board"', (runtime) =>
        treeContainsText(runtime.widgetTree, "Board"),
      );
      send({
        type: "miniapp-ui-event",
        nodeId: "publish",
        event: "board.publish",
      });
      await waitForRuntime(
        getRuntime,
        'board: text "Published 1 post"',
        (runtime) => treeContainsText(runtime.widgetTree, "Published 1 post"),
      );
      send({
        type: "miniapp-ui-event",
        nodeId: "refresh",
        event: "board.refresh",
      });
      await waitForRuntime(
        getRuntime,
        'board: text "1 local post"',
        (runtime) => treeContainsText(runtime.widgetTree, "1 local post"),
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
