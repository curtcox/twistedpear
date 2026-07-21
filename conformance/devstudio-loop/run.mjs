#!/usr/bin/env node
/**
 * DevStudio two-instance loop: instance A develops a mini-app inside the
 * DevStudio mini-app (edit + AI edit via a mock OpenRouter endpoint), packages
 * and signs it, publishes it, and shares its 94-character 256t id. Instance B
 * (a second in-process host with its own identity, connected to A only through
 * a Reticulum pipe link) imports A's identity into its trust store, resolves
 * the 256t id via the CAS locator announce, fetches over the Reticulum
 * Resource path, verifies, reviews capabilities (granting a subset), runs the
 * app, exercises fewer-capabilities enforcement, adjusts resource limits, and
 * force-quits.
 */

import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  InstalledPackageStore,
  TrustStore,
  buildAppAnnounceSummary,
  buildUnsignedManifest,
  decodePublisherIdentity256t,
  encodeAppAnnounceData,
  encodePublisherIdentity256t,
  packPackage,
  signManifest,
  unpackPackage,
  verifyPackage
} from "../../packages/app-registry/dist/index.js";
import {
  casAnnounceAspects,
  decode256t,
  decodeCasLocator,
  encodeCasLocator,
  signCasLocator,
  toCatalogEntryLike,
  verify256t,
  verifyCasLocator
} from "../../packages/cas-256t/dist/index.js";
import { PackageResourceClient, attachPackageResourceServer, fetchPackage } from "../../packages/bridge-hyper/dist/index.js";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  bytesToHex,
  nodeRuntime
} from "../../packages/reticulum-ts/dist/index.js";
import { HOST_API_VERSION, validateManifestCapabilities } from "../../packages/miniapp-runtime/dist/index.js";
import { createWorkletMiniappHost } from "../../apps/host-desktop/worklet/miniapp-host.mjs";
import { createSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/factory.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();
const sha512 = (data) => provider.sha512(data);
const devstudioDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../apps/devstudio");

const MOCK_AI_BUNDLE = `import { lxmf, ui } from "@twistedpear/miniapp-sdk";

let title = "Hello AI";

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        { id: "title", type: "text", props: { value: title } },
        { id: "send", type: "button", props: { label: "Send", event: "hello.send" } }
      ]
    }
  });
}

ui.onEvent(async ({ event }) => {
  if (event === "hello.send") {
    try {
      await lxmf.send({ to: "peer", subject: "hi", body: "hi" });
      title = "SENT";
    } catch (error) {
      title = "DENIED: " + error.message;
    }
    await render();
  }
});

await render();
`;

class MemoryKvStore {
  values = new Map();

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async set(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }

  async list(prefix) {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

function archiveStore() {
  const values = new Map();
  return {
    async get(key) {
      return values.get(key);
    },
    async set(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    }
  };
}

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitFor(evaluate, timeoutMs = 20_000, what = "condition") {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate();
    if (value !== null && value !== undefined && value !== false) {
      return value;
    }

    await sleep(50);
  }

  throw new Error(`waitFor timeout: ${what}`);
}

function findNode(tree, predicate) {
  if (!tree?.root) {
    return null;
  }

  const walk = (node) => {
    if (predicate(node)) {
      return node;
    }

    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found !== null) {
        return found;
      }
    }

    return null;
  };

  return walk(tree.root);
}

function latestRuntime(outbound, slot) {
  return [...outbound].reverse().find((message) => message.type === "miniapp-runtime" && message.slot === slot);
}

function startMockOpenRouter() {
  const requests = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      const parsed = JSON.parse(body || "{}");
      requests.push({ url: request.url, auth: request.headers.authorization, body: parsed });
      if (parsed.stream === true) {
        response.writeHead(200, { "content-type": "text/event-stream" });
        const midpoint = Math.floor(MOCK_AI_BUNDLE.length / 2);
        for (const content of [MOCK_AI_BUNDLE.slice(0, midpoint), MOCK_AI_BUNDLE.slice(midpoint)]) {
          response.write(`data: ${JSON.stringify({ model: "mock/model", choices: [{ delta: { content } }] })}\n\n`);
        }
        response.end(`data: ${JSON.stringify({ model: "mock/model", choices: [{ delta: {} }], usage: { prompt_tokens: 10, completion_tokens: 20 } })}\n\ndata: [DONE]\n\n`);
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          model: "mock/model",
          choices: [{ message: { role: "assistant", content: MOCK_AI_BUNDLE } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 }
        })
      );
    });
  });

  return new Promise((resolveStart) => {
    server.listen(0, "127.0.0.1", () => {
      resolveStart({
        url: `http://127.0.0.1:${server.address().port}/v1`,
        requests,
        close: () =>
          new Promise((resolveClose) => {
            // Drop keep-alive sockets or close() waits on them indefinitely.
            server.closeAllConnections?.();
            server.close(resolveClose);
          })
      });
    });
  });
}

async function withTimeout(promise, ms, what) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms: ${what}`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function runDevstudioLoop() {
  const tmp = mkdtempSync(join(tmpdir(), "tp-devstudio-loop-"));
  const mockAi = await startMockOpenRouter();

  // --- Two Reticulum nodes joined by an in-process pipe link (the "network") ---
  const nodeA = Reticulum.create({ provider, runtime });
  const nodeB = Reticulum.create({ provider, runtime });
  nodeA.start();
  nodeB.start();
  const [pipeA, pipeB] = PipeInterface.pair(provider);
  nodeA.registerInterface(pipeA);
  nodeB.registerInterface(pipeB);

  const identityA = new Identity(provider);
  const identityB = new Identity(provider);

  // --- Instance B: locator collection + trust store ---
  const bLocators = new Map();
  nodeB.registerAnnounceHandler({
    receivedAnnounce(info) {
      if (info.appData === null) {
        return;
      }

      try {
        const locator = decodeCasLocator(info.appData);
        if (verifyCasLocator(provider, locator)) {
          bLocators.set(locator.t256, locator);
        }
      } catch {
        // not a TPCL payload
      }
    }
  });

  const kvA = new MemoryKvStore();
  const kvB = new MemoryKvStore();
  const trustStoreB = new TrustStore(kvB);
  const installedA = new InstalledPackageStore(64 * 1024 * 1024);
  const installedB = new InstalledPackageStore(64 * 1024 * 1024);
  const runtimeA = { ...runtime, store: archiveStore() };
  const runtimeB = { ...runtime, store: archiveStore() };

  const outboundA = [];
  const outboundB = [];
  const confirmationsA = [];
  const installReviewsB = [];
  /** appId -> grants to accept at launch review */
  const launchGrantPlan = new Map();

  let publisherAppDestination = null;
  let publishedArchive = null;

  async function publishArchiveA({ t256, archive }) {
    const unpacked = unpackPackage(provider, archive);
    publishedArchive = { version: unpacked.manifest.version, packageHash: unpacked.packageHash, archive };

    const publisherHash = bytesToHex(provider.sha256(identityA.getPublicKey()).slice(0, 8));
    const nameHash = bytesToHex(provider.sha256(new TextEncoder().encode(unpacked.manifest.name)).slice(0, 8));
    publisherAppDestination = nodeA.registerDestination({
      provider,
      identity: identityA,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: ["app", publisherHash, nameHash]
    });
    publisherAppDestination.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
    attachPackageResourceServer(publisherAppDestination, {
      async listVersions() {
        return [
          {
            version: publishedArchive.version,
            packageHash: publishedArchive.packageHash,
            size: publishedArchive.archive.length
          }
        ];
      },
      async fetchArchive() {
        return publishedArchive.archive;
      }
    });

    const summary = buildAppAnnounceSummary(provider, identityA, {
      manifest: unpacked.manifest,
      packageSize: archive.length,
      packageHash: unpacked.packageHash,
      resourceAvailable: true
    });
    await publisherAppDestination.announce({ appData: encodeAppAnnounceData(summary) });

    const locator = signCasLocator(identityA, {
      t256,
      appId: unpacked.manifest.name,
      version: unpacked.manifest.version,
      driveKey: "0".repeat(64),
      packageHash: unpacked.packageHash,
      packageSize: archive.length
    });
    const casDestination = nodeA.registerDestination({
      provider,
      identity: identityA,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: casAnnounceAspects(t256)
    });
    await casDestination.announce({ appData: encodeCasLocator(locator) });

    return { t256, driveKey: "0".repeat(64), version: unpacked.manifest.version };
  }

  async function installFromT256B(t256) {
    const locator = await waitFor(() => bLocators.get(t256) ?? null, 20_000, "cas locator announce on B");

    const resourceClient = new PackageResourceClient({
      provider,
      runtime,
      publisherPublicKeyHex: locator.publisherPublicKey,
      appName: locator.appId,
      identity: identityB
    });
    await resourceClient.start();
    const [clientPipe, aSidePipe] = PipeInterface.pair(provider);
    resourceClient.node.registerInterface(clientPipe);
    nodeA.registerInterface(aSidePipe);
    await publisherAppDestination.announce();
    await waitFor(
      () => (resourceClient.node.hasPath(publisherAppDestination.hash) ? true : null),
      20_000,
      "path to publisher on B's resource client"
    );

    let archive;
    try {
      const result = await withTimeout(
        fetchPackage(provider, {
          entry: toCatalogEntryLike(locator),
          version: locator.version,
          interfaces: [],
          forcePath: "resource",
          resourceClient
        }),
        60_000,
        "resource fetch on B"
      );
      archive = result.archiveBytes;
    } finally {
      await withTimeout(resourceClient.stop(), 5_000, "resource client stop").catch(() => {});
    }

    if (!verify256t(t256, archive, sha512)) {
      throw new Error("fetched archive does not match its 256t id");
    }

    const appId = unpackPackage(provider, archive).manifest.name;
    const verified = verifyPackage(provider, archive, {
      hostApiVersion: HOST_API_VERSION,
      minVersion: installedB.latestVersion(appId) ?? undefined
    });
    const declared = validateManifestCapabilities(verified.manifest.capabilities);
    const trusted = await trustStoreB.isTrusted(verified.manifest.publisherPublicKey);

    // Scripted capability review: user accepts a SUBSET of the declared caps.
    const grants = declared.filter((capability) => capability === "storage:kv");
    installReviewsB.push({ appId, declared, grants, trusted });

    const archivePath = `packages/${appId}/${verified.manifest.version}.tpkg`;
    await runtimeB.store.set(archivePath, archive);
    installedB.install(
      {
        appId,
        version: verified.manifest.version,
        packageHash: verified.packageHash,
        installedAt: Date.now(),
        manifest: verified.manifest,
        archivePath
      },
      archive.length
    );
    if (grants.length > 0) {
      await hostB.setGrants(appId, verified.manifest.publisherPublicKey, verified.manifest.capabilities, grants);
    }

    return { appId, version: verified.manifest.version, trusted };
  }

  const hostA = createWorkletMiniappHost({
    provider,
    kvStore: kvA,
    createSandboxBackend,
    sandboxBackend: "node-worker",
    beeStoragePath: join(tmp, "bee-a"),
    send: (message) => outboundA.push(message),
    onDeveloperModeChange() {},
    onMiniappStateChange() {},
    getPresenceSnapshot: () => ({ autoPeers: 1, onlineInterfaces: 1, preferredInterface: "pipe" }),
    getPublisherIdentity: async () => identityA,
    aiConfig: { baseUrl: mockAi.url, apiKey: "test-key", model: "mock/model" },
    publishArchive: publishArchiveA,
    async requestUserConfirmation(request) {
      confirmationsA.push({ kind: request.kind, summary: request.summary, appId: request.appId });
      return { approved: true };
    },
    async requestLaunchReview(review) {
      const grants = launchGrantPlan.get(review.appId) ?? review.capabilities.map((entry) => entry.id);
      return { accept: true, grants };
    }
  });

  const hostB = createWorkletMiniappHost({
    provider,
    kvStore: kvB,
    createSandboxBackend,
    sandboxBackend: "node-worker",
    beeStoragePath: join(tmp, "bee-b"),
    send: (message) => outboundB.push(message),
    onDeveloperModeChange() {},
    onMiniappStateChange() {},
    getPresenceSnapshot: () => ({ autoPeers: 1, onlineInterfaces: 1, preferredInterface: "pipe" }),
    getPublisherIdentity: async () => identityB,
    installFromT256: installFromT256B,
    async requestUserConfirmation() {
      return { approved: true };
    },
    async requestLaunchReview(review) {
      const grants = launchGrantPlan.get(review.appId) ?? [];
      return { accept: true, grants };
    }
  });

  const cleanup = async () => {
    const safely = async (action, what) => {
      try {
        await withTimeout(Promise.resolve(action()), 5_000, `cleanup ${what}`);
      } catch {
        // best-effort teardown
      }
    };
    await safely(() => hostA.stop(), "hostA");
    await safely(() => hostB.stop(), "hostB");
    await safely(() => nodeA.stop(), "nodeA");
    await safely(() => nodeB.stop(), "nodeB");
    await safely(() => mockAi.close(), "mock AI server");
    rmSync(tmp, { recursive: true, force: true });
  };

  try {
    // ---- 1. Install + launch DevStudio on A (signed by A's identity) ----
    const devstudioManifest = JSON.parse(readFileSync(join(devstudioDir, "app.manifest.json"), "utf8"));
    const devstudioFiles = [
      { path: "bundle.js", content: new Uint8Array(readFileSync(join(devstudioDir, "bundle.js"))) }
    ];
    const unsigned = buildUnsignedManifest(
      {
        name: devstudioManifest.name,
        version: devstudioManifest.version,
        entry: devstudioManifest.entry,
        capabilities: devstudioManifest.capabilities,
        icon: null,
        minHostApi: devstudioManifest.minHostApi,
        driveKey: "0".repeat(64),
        publisherPublicKey: bytesToHex(identityA.getPublicKey()),
        files: devstudioFiles
      },
      provider
    );
    const signedManifest = signManifest(provider, identityA, unsigned);
    const packed = packPackage(provider, { ...signedManifest, signature: signedManifest.signature, files: devstudioFiles });
    const devstudioVerified = verifyPackage(provider, packed.archiveBytes, { hostApiVersion: HOST_API_VERSION });

    const devstudioArchivePath = "packages/devstudio/0.1.0.tpkg";
    await runtimeA.store.set(devstudioArchivePath, packed.archiveBytes);
    installedA.install(
      {
        appId: "devstudio",
        version: devstudioVerified.manifest.version,
        packageHash: devstudioVerified.packageHash,
        installedAt: Date.now(),
        manifest: devstudioVerified.manifest,
        archivePath: devstudioArchivePath
      },
      packed.archiveBytes.length
    );

    launchGrantPlan.set("devstudio", devstudioManifest.capabilities);
    await hostA.setGrants(
      "devstudio",
      devstudioVerified.manifest.publisherPublicKey,
      devstudioVerified.manifest.capabilities,
      devstudioManifest.capabilities
    );
    await hostA.launch(installedA, runtimeA, "devstudio");

    const initialTree = await waitFor(
      () => {
        const tree = latestRuntime(outboundA, "main")?.runtime?.widgetTree;
        return tree && findNode(tree, (node) => node.id === "new-project") ? tree : null;
      },
      20_000,
      "DevStudio initial render on A"
    );
    if (findNode(initialTree, (node) => node.type === "code-editor") !== null) {
      throw new Error("editor should not render before a project exists");
    }

    // ---- 2. Create a project; assert code-editor appears (content-by-reference) ----
    await hostA.handleUiEvent("new-project", "ds.newproject");
    const editorTree = await waitFor(
      () => {
        const tree = latestRuntime(outboundA, "main")?.runtime?.widgetTree;
        return tree && findNode(tree, (node) => node.type === "code-editor") ? tree : null;
      },
      20_000,
      "code editor on A"
    );
    const editorNode = findNode(editorTree, (node) => node.type === "code-editor");
    if (editorNode.props.documentId !== "hello-app/bundle.js") {
      throw new Error(`unexpected editor documentId: ${editorNode.props.documentId}`);
    }

    const templateContent = await hostA.readWorkspaceFile("hello-app/bundle.js");
    if (!templateContent.includes("Hello from DevStudio")) {
      throw new Error("hello template missing from workspace");
    }

    // ---- 3. Direct edit through the editor event ----
    await hostA.handleUiEvent("editor", "ds.edit", {
      documentId: "hello-app/bundle.js",
      baseLength: templateContent.length,
      edits: [{
        start: templateContent.indexOf("Hello from DevStudio"),
        end: templateContent.indexOf("Hello from DevStudio") + "Hello from DevStudio".length,
        text: "Hello (edited)"
      }]
    });
    await waitFor(
      async () => ((await hostA.readWorkspaceFile("hello-app/bundle.js")).includes("Hello (edited)") ? true : null),
      10_000,
      "direct edit persisted on A"
    );

    // ---- 4. AI edit via the mock OpenRouter endpoint ----
    await hostA.handleUiEvent("ai-prompt", "ds.aiprompt", "Rename the title to Hello AI and add a send button");
    await hostA.handleUiEvent("ai-run", "ds.airun");
    await waitFor(
      () => {
        const tree = latestRuntime(outboundA, "main")?.runtime?.widgetTree;
        return tree && findNode(tree, (node) => node.id === "ai-apply") ? true : null;
      },
      20_000,
      "AI proposal on A"
    );
    if (mockAi.requests.length !== 1 || mockAi.requests[0].auth !== "Bearer test-key") {
      throw new Error("mock AI endpoint saw an unexpected request");
    }
    if (mockAi.requests[0].body.stream !== true) {
      throw new Error("DevStudio AI edit did not request a streaming response");
    }
    if (JSON.stringify(mockAi.requests[0].body).includes("test-key")) {
      throw new Error("API key leaked into the request body");
    }

    await hostA.handleUiEvent("ai-apply", "ds.aiapply");
    await waitFor(
      async () => ((await hostA.readWorkspaceFile("hello-app/bundle.js")) === MOCK_AI_BUNDLE ? true : null),
      10_000,
      "AI edit applied on A"
    );

    // ---- 5. Declare capabilities in the project manifest via the editor ----
    await hostA.handleUiEvent("editor", "ds.edit", {
      documentId: "hello-app/app.json",
      baseLength: (await hostA.readWorkspaceFile("hello-app/app.json")).length,
      edits: [{
        start: 0,
        end: (await hostA.readWorkspaceFile("hello-app/app.json")).length,
        text: JSON.stringify(
          { name: "hello-app", version: "0.1.0", entry: "bundle.js", capabilities: ["storage:kv", "lxmf:send"] },
          null,
          2
        )
      }]
    });
    await sleep(200);

    // ---- 6. Preview the app under development in the sandboxed preview slot ----
    await hostA.handleUiEvent("preview", "ds.preview");
    await waitFor(
      () => {
        const preview = latestRuntime(outboundA, "preview")?.runtime;
        const tree = preview?.widgetTree;
        return tree && findNode(tree, (node) => node.props?.value === "Hello AI") ? true : null;
      },
      20_000,
      "preview render on A"
    );
    await hostA.handleUiEvent("stop-preview", "ds.stoppreview");
    await waitFor(
      () => (latestRuntime(outboundA, "preview")?.runtime === null ? true : null),
      10_000,
      "preview stopped on A"
    );

    // ---- 7. Package & sign; extract the 94-char 256t id from the QR widget ----
    await hostA.handleUiEvent("package", "ds.package");
    const qrTree = await waitFor(
      () => {
        const tree = latestRuntime(outboundA, "main")?.runtime?.widgetTree;
        return tree && findNode(tree, (node) => node.type === "qr-code") ? tree : null;
      },
      20_000,
      "package QR on A"
    );
    const t256 = findNode(qrTree, (node) => node.type === "qr-code").props.value;
    if (t256.length !== 94) {
      throw new Error(`256t id has wrong length: ${t256.length}`);
    }

    const decoded = decode256t(t256);
    if (decoded.sha512 === null) {
      throw new Error("expected a hashed (non-inline) 256t id for the package");
    }

    // ---- 8. Publish to the network ----
    await hostA.handleUiEvent("publish", "ds.publish");
    await waitFor(() => (publishedArchive !== null ? true : null), 20_000, "publish on A");
    await waitFor(
      () => {
        const tree = latestRuntime(outboundA, "main")?.runtime?.widgetTree;
        const statusNode = findNode(tree, (node) => node.id === "status");
        const value = statusNode?.props?.value ?? "";
        if (value.startsWith("Publish failed")) {
          throw new Error(`DevStudio reported: ${value}`);
        }

        return value.startsWith("Published") ? true : null;
      },
      20_000,
      "publish status on A"
    );
    if (!verify256t(t256, publishedArchive.archive, sha512)) {
      throw new Error("published archive does not match the shared 256t id");
    }

    const confirmedKinds = confirmationsA.map((entry) => entry.kind);
    for (const kind of ["preview", "package", "publish"]) {
      if (confirmedKinds.filter((entry) => entry === kind).length !== 1) {
        throw new Error(`expected exactly one "${kind}" confirmation on A, saw [${confirmedKinds.join(", ")}]`);
      }
    }
    const packageConfirmation = confirmationsA.find((entry) => entry.kind === "package");
    if (!packageConfirmation.summary.capabilities.includes("lxmf:send")) {
      throw new Error("package confirmation did not surface the requested capabilities");
    }

    // ---- 9. Trust exchange: A's identity as an inline 256t string ----
    const identityString = encodePublisherIdentity256t(identityA.getPublicKey());
    if (identityString.length !== 94 || decode256t(identityString).inline === null) {
      throw new Error("identity string must be a 94-char inline 256t id");
    }

    await trustStoreB.add({
      publisherPublicKey: decodePublisherIdentity256t(identityString),
      label: "Instance A",
      addedAt: Date.now(),
      source: "qr"
    });

    // ---- 10. B resolves the 256t id, fetches, verifies, reviews (subset), installs ----
    const installResult = await installFromT256B(t256);
    if (installResult.appId !== "hello-app" || installResult.trusted !== true) {
      throw new Error(`unexpected install result: ${JSON.stringify(installResult)}`);
    }
    const review = installReviewsB[0];
    if (review.declared.join(",") !== "storage:kv,lxmf:send" || review.grants.join(",") !== "storage:kv") {
      throw new Error("install review did not record the declared caps and subset grant");
    }

    // ---- 11. B runs the app with fewer capabilities than requested ----
    launchGrantPlan.set("hello-app", ["storage:kv"]);
    await hostB.launch(installedB, runtimeB, "hello-app");
    await waitFor(
      () => {
        const tree = latestRuntime(outboundB, "main")?.runtime?.widgetTree;
        return tree && findNode(tree, (node) => node.props?.value === "Hello AI") ? true : null;
      },
      20_000,
      "hello-app render on B"
    );

    await hostB.handleUiEvent("send", "hello.send");
    await waitFor(
      () => {
        const tree = latestRuntime(outboundB, "main")?.runtime?.widgetTree;
        const title = findNode(tree, (node) => node.id === "title");
        return typeof title?.props?.value === "string" && title.props.value.startsWith("DENIED:") ? true : null;
      },
      20_000,
      "capability denial visible on B"
    );

    // ---- 12. B adjusts resource limits while the app runs ----
    const limits = hostB.setLimits("hello-app", { maxMessagesPerSecond: 4, memoryBytes: 64 * 1024 * 1024 });
    if (limits.maxMessagesPerSecond !== 4 || limits.memoryPendingRestart !== true) {
      throw new Error(`unexpected limits snapshot: ${JSON.stringify(limits)}`);
    }
    if (![...outboundB].reverse().some((message) => message.type === "limits")) {
      throw new Error("limits update was not pushed to the renderer");
    }

    // ---- 13. B force-quits ----
    await hostB.stop("user-forced");
    const finalRuntime = latestRuntime(outboundB, "main")?.runtime;
    if (finalRuntime?.state !== "stopped") {
      throw new Error(`expected stopped state after force quit, got ${finalRuntime?.state}`);
    }

    await hostA.stop();
    console.log(
      "devstudio-loop: develop (edit + AI) → preview → package → publish → 256t transfer → trust → subset install → run → capability denial → limits → force-quit passed across two instances"
    );
  } catch (error) {
    // Print before cleanup: a hung teardown must never swallow the failure.
    console.error(error);
    await cleanup();
    throw error;
  }

  await cleanup();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Worker threads, Reticulum pipes, and the corestore bee backend keep the
  // event loop alive; exit explicitly and enforce an overall deadline.
  const deadline = setTimeout(() => {
    console.error("devstudio-loop: global timeout (240s)");
    process.exit(2);
  }, 240_000);

  runDevstudioLoop()
    .then(() => {
      clearTimeout(deadline);
      process.exit(0);
    })
    .catch(() => {
      clearTimeout(deadline);
      process.exit(1);
    });
}
