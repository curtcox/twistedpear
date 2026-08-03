/**
 * W3 browser spike: DevStudio workspace + package/sign/publish through the WS gateway.
 * Reports status on window.__WEB_DEVSTUDIO__.
 */
// @ts-nocheck


import { WebSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/web.js";
import {
  encodeJsonWireValue,
  reviveJsonWireValue
} from "../../packages/miniapp-runtime/dist/sandbox/json-wire.js";
import { DEVSTUDIO_FIXTURE } from "./fixtures.mjs";

const T256_PATTERN = /^[A-Za-z0-9_-]{94}$/;

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

function findNode(node, predicate) {
  if (predicate(node)) {
    return node;
  }

  for (const child of node.children ?? []) {
    const found = findNode(child, predicate);
    if (found !== null) {
      return found;
    }
  }

  return null;
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

async function waitForRuntime(getRuntime, predicate, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const runtime = getRuntime();
    if (runtime?.widgetTree !== null && runtime?.widgetTree !== undefined && predicate(runtime)) {
      return runtime;
    }

    await sleep(100);
  }

  throw new Error("timed out waiting for mini-app runtime");
}

async function main() {
  globalThis.__WEB_DEVSTUDIO__ = { status: "starting", steps: [] };

  const params = new URLSearchParams(globalThis.location?.search ?? "");
  const gatewayUrl = params.get("ws");
  if (gatewayUrl === null || gatewayUrl.length === 0) {
    throw new Error("Missing ?ws= gateway URL query parameter");
  }

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
            grants: message.capabilities.map((capability) => capability.id)
          })
        });
        continue;
      }

      if (message.type === "install-review") {
        worker.postMessage({
          channel: "host-ipc",
          data: encodeMessage({
            type: "install-confirm",
            token: message.token,
            accept: true,
            grants: message.capabilities.map((capability) => capability.id)
          })
        });
        continue;
      }

      if (message.type === "confirm-request") {
        worker.postMessage({
          channel: "host-ipc",
          data: encodeMessage({
            type: "confirm-response",
            token: message.token,
            approved: true
          })
        });
        continue;
      }

      if (message.type === "miniapp-runtime" && (message.slot === undefined || message.slot === "main")) {
        if (message.runtime !== null) {
          latestRuntime = message.runtime;
        }
      }

      if (message.type === "miniapp-log") {
        console.log(`miniapp:${message.line}`);
      }

      if (message.type === "log") {
        console.log(`worker:${message.line}`);
      }
    }
  };

  const send = (message) => {
    worker.postMessage({ channel: "host-ipc", data: encodeMessage(message) });
  };

  const steps = [];
  const record = (step) => {
    steps.push(step);
    globalThis.__WEB_DEVSTUDIO__ = { status: "running", steps: [...steps] };
  };

  send({
    type: "start",
    targetHost: "127.0.0.1",
    targetPort: 9480,
    gatewayUrl,
    identityPassphrase: "web-devstudio-test"
  });
  send({ type: "import-identity", privateKeyHex: DEVSTUDIO_FIXTURE.privateKeyHex });
  send({ type: "set-interfaces", tcp: true, auto: false, ble: false, rnode: false });
  await sleep(2_000);
  record("gateway-online");

  send({
    type: "install-app",
    appId: DEVSTUDIO_FIXTURE.appId,
    archiveHex: DEVSTUDIO_FIXTURE.archiveHex
  });
  await sleep(400);
  record("devstudio-installed");

  send({
    type: "set-grants",
    appId: DEVSTUDIO_FIXTURE.appId,
    publisherPublicKey: DEVSTUDIO_FIXTURE.publisherPublicKey,
    declaredCapabilities: DEVSTUDIO_FIXTURE.capabilities,
    grantedCapabilities: DEVSTUDIO_FIXTURE.capabilities
  });
  await sleep(100);

  send({ type: "launch-miniapp", appId: DEVSTUDIO_FIXTURE.appId });
  await waitForRuntime(() => latestRuntime, (runtime) => treeContainsText(runtime.widgetTree, "DevStudio"));
  record("devstudio-launched");

  send({ type: "miniapp-ui-event", nodeId: "new-project", event: "ds.newproject" });
  await waitForRuntime(
    () => latestRuntime,
    (runtime) => findNode(runtime.widgetTree.root, (node) => node.type === "code-editor") !== null
  );
  record("hello-project-created");

  send({ type: "miniapp-ui-event", nodeId: "package", event: "ds.package" });
  await waitForRuntime(
    () => latestRuntime,
    (runtime) => {
      const qr = findNode(runtime.widgetTree.root, (node) => node.type === "qr-code");
      return qr !== null && T256_PATTERN.test(String(qr.props?.value ?? ""));
    },
    45_000
  );
  const packagedRuntime = latestRuntime;
  const qrNode = findNode(packagedRuntime.widgetTree.root, (node) => node.type === "qr-code");
  const packagedT256 = String(qrNode.props.value);
  record("packaged");

  send({ type: "miniapp-ui-event", nodeId: "publish", event: "ds.publish" });
  await waitForRuntime(
    () => latestRuntime,
    (runtime) => {
      const texts = collectTextValues(runtime.widgetTree.root);
      if (texts.some((value) => value.includes("Publish failed"))) {
        throw new Error(texts.find((value) => value.includes("Publish failed")) ?? "Publish failed");
      }

      return texts.some((value) => value.includes("Published v0.1.0"));
    },
    45_000
  );
  record("published");

  globalThis.__WEB_DEVSTUDIO__ = {
    status: "done",
    steps,
    packagedT256,
    appId: DEVSTUDIO_FIXTURE.appId
  };
}

main().catch((error) => {
  globalThis.__WEB_DEVSTUDIO__ = {
    status: "error",
    message: error instanceof Error ? error.message : String(error),
    steps: globalThis.__WEB_DEVSTUDIO__?.steps ?? []
  };
});
