/**
 * Phase D: Handbook install + TOC/chapters + software-tier applets + report export
 * in the browser via the web core worker. Reports status on window.__WEB_HANDBOOK__.
 */

import { WebSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/web.js";
import {
  encodeJsonWireValue,
  reviveJsonWireValue
} from "../../packages/miniapp-runtime/dist/sandbox/json-wire.js";
import { HANDBOOK_FIXTURE } from "./fixtures.mjs";

const APPLET_CHAPTER = {
  "host-info": "difference-matrix",
  "identity-hash": "sdk-identity",
  "presence-snapshot": "sdk-presence",
  "storage-kv": "sdk-storage-kv",
  "storage-hyperbee": "sdk-storage-hyperbee",
  "lxmf-roundtrip": "sdk-lxmf",
  "announce-loop": "sdk-announce",
  "resource-fetch": "sdk-resource-fetch",
  "workspace-rw": "sdk-workspace",
  "share-cas": "sdk-share-cas",
  "apps-package-preview": "sdk-apps-package",
  "apps-publish-install": "sdk-apps-publish",
  "ai-chat": "sdk-ai-chat",
  "widget-gallery": "sdk-widget-gallery"
};

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

function findNodeById(node, id) {
  return findNode(node, (candidate) => candidate.id === id);
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

function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
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

async function waitForRuntime(getRuntime, predicate, timeoutMs = 45_000) {
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

async function tap(send, getRuntime, nodeId, event, value) {
  send({ type: "miniapp-ui-event", nodeId, event, value });
  await sleep(250);
}

async function ensureToc(send, getRuntime) {
  try {
    await waitForRuntime(
      getRuntime,
      (runtime) => findNodeById(runtime.widgetTree.root, "open-diag") !== null,
      5_000
    );
    return;
  } catch {
    // fall through
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const runtime = getRuntime();
    if (runtime?.widgetTree !== null && findNodeById(runtime.widgetTree.root, "open-diag") !== null) {
      return;
    }
    if (runtime?.widgetTree !== null && findNodeById(runtime.widgetTree.root, "back-toc") !== null) {
      await tap(send, getRuntime, "back-toc", "hb.toc");
    } else if (
      runtime?.widgetTree !== null &&
      findNodeById(runtime.widgetTree.root, "back-toc-diag") !== null
    ) {
      await tap(send, getRuntime, "back-toc-diag", "hb.toc");
    }
    await sleep(200);
  }

  await waitForRuntime(
    getRuntime,
    (runtime) => findNodeById(runtime.widgetTree.root, "open-diag") !== null,
    20_000
  );
}

async function main() {
  globalThis.__WEB_HANDBOOK__ = { status: "starting", steps: [], passedApplets: [] };

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

  const getRuntime = () => latestRuntime;
  const steps = [];
  const record = (step) => {
    steps.push(step);
    globalThis.__WEB_HANDBOOK__ = {
      status: "running",
      steps: [...steps],
      passedApplets: globalThis.__WEB_HANDBOOK__?.passedApplets ?? []
    };
  };

  send({
    type: "start",
    targetHost: "127.0.0.1",
    targetPort: 9480,
    gatewayUrl: "ws://127.0.0.1:9480",
    identityPassphrase: "web-handbook-test",
    mockAiChat: true,
    mockLocalPublish: true
  });
  send({ type: "create-identity" });
  await sleep(1_500);
  record("identity-ready");

  send({
    type: "install-app",
    appId: HANDBOOK_FIXTURE.appId,
    archiveHex: HANDBOOK_FIXTURE.archiveHex
  });
  await sleep(500);
  record("handbook-installed");

  send({
    type: "set-grants",
    appId: HANDBOOK_FIXTURE.appId,
    publisherPublicKey: HANDBOOK_FIXTURE.publisherPublicKey,
    declaredCapabilities: HANDBOOK_FIXTURE.capabilities,
    grantedCapabilities: HANDBOOK_FIXTURE.capabilities
  });
  await sleep(150);

  send({
    type: "seed-miniapp-kv",
    key: "miniapp-resource:handbook:probe",
    valueHex: bytesToHex(new TextEncoder().encode("handbook-resource-probe-payload"))
  });
  await sleep(100);

  send({ type: "launch-miniapp", appId: HANDBOOK_FIXTURE.appId });
  await waitForRuntime(getRuntime, (runtime) => treeContainsText(runtime.widgetTree, "TwistedPear Handbook"));
  await waitForRuntime(getRuntime, (runtime) => treeContainsText(runtime.widgetTree, "Contents"));
  record("toc-rendered");

  for (const chapterId of HANDBOOK_FIXTURE.chapterIds) {
    await ensureToc(send, getRuntime);
    await tap(send, getRuntime, `ch-${chapterId}`, "hb.openchapter");
    const title = HANDBOOK_FIXTURE.chapterTitles[chapterId] ?? chapterId;
    await waitForRuntime(getRuntime, (runtime) => treeContainsText(runtime.widgetTree, title));
    record(`chapter:${chapterId}`);
    await tap(send, getRuntime, "back-toc", "hb.toc");
    await waitForRuntime(getRuntime, (runtime) => treeContainsText(runtime.widgetTree, "Contents"));
  }

  const passedApplets = [];
  for (const appletId of HANDBOOK_FIXTURE.appletIds) {
    const chapter = APPLET_CHAPTER[appletId];
    if (chapter === undefined) {
      throw new Error(`No chapter mapping for applet ${appletId}`);
    }

    await ensureToc(send, getRuntime);
    await tap(send, getRuntime, `ch-${chapter}`, "hb.openchapter");
    const appletTitle = HANDBOOK_FIXTURE.appletTitles[appletId] ?? appletId;
    await waitForRuntime(getRuntime, (runtime) =>
      treeContainsText(runtime.widgetTree, `Applet: ${appletTitle}`)
    );
    await tap(send, getRuntime, `applet-run-${appletId}`, "hb.runapplet");
    let appletRuntime;
    try {
      appletRuntime = await waitForRuntime(
        getRuntime,
        (runtime) => {
          const texts = collectTextValues(runtime.widgetTree.root);
          return texts.some(
            (value) =>
              /^(PASS|FAIL|UNAVAILABLE|NOT-GRANTED|SKIPPED)\b/.test(value) ||
              value.startsWith("Error:")
          );
        },
        90_000
      );
    } catch (error) {
      const runtime = getRuntime();
      const texts =
        runtime?.widgetTree !== null && runtime?.widgetTree !== undefined
          ? collectTextValues(runtime.widgetTree.root).slice(0, 40)
          : [];
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; applet=${appletId}; texts=${JSON.stringify(texts)}`
      );
    }
    const resultLine =
      collectTextValues(appletRuntime.widgetTree.root).find(
        (value) =>
          /^(PASS|FAIL|UNAVAILABLE|NOT-GRANTED|SKIPPED)\b/.test(value) ||
          value.startsWith("Error:")
      ) ?? "";
    if (!resultLine.startsWith("PASS")) {
      throw new Error(`applet ${appletId} did not pass: ${resultLine}`);
    }
    passedApplets.push(appletId);
    record(`applet:${appletId}`);
    globalThis.__WEB_HANDBOOK__ = {
      status: "running",
      steps: [...steps],
      passedApplets: [...passedApplets]
    };

    if (appletId === "widget-gallery") {
      await sleep(300);
    }
  }

  await ensureToc(send, getRuntime);
  await tap(send, getRuntime, "open-diag", "hb.diagnostics");
  await waitForRuntime(
    getRuntime,
    (runtime) => findNodeById(runtime.widgetTree.root, "diag-export") !== null
  );
  record("diagnostics-open");

  await tap(send, getRuntime, "diag-export", "hb.export");
  const exportRuntime = await waitForRuntime(
    getRuntime,
    (runtime) => {
      const qr = findNodeById(runtime.widgetTree.root, "diag-export-qr");
      return qr !== null && T256_PATTERN.test(String(qr.props?.value ?? ""));
    },
    45_000
  );
  const qrNode = findNodeById(exportRuntime.widgetTree.root, "diag-export-qr");
  const reportId = String(qrNode.props.value);
  record("report-exported");

  if (passedApplets.length !== HANDBOOK_FIXTURE.appletIds.length) {
    throw new Error(
      `expected ${HANDBOOK_FIXTURE.appletIds.length} applets, got ${passedApplets.length}`
    );
  }

  globalThis.__WEB_HANDBOOK__ = {
    status: "done",
    steps,
    passedApplets,
    chapters: HANDBOOK_FIXTURE.chapterIds.length,
    reportId
  };
}

main().catch((error) => {
  globalThis.__WEB_HANDBOOK__ = {
    status: "error",
    message: error instanceof Error ? error.message : String(error),
    steps: globalThis.__WEB_HANDBOOK__?.steps ?? [],
    passedApplets: globalThis.__WEB_HANDBOOK__?.passedApplets ?? []
  };
});
