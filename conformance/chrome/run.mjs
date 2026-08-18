#!/usr/bin/env node
// SPEC-CHROME conformance: fixtures keyed to the named requirements.
// Each fixture cites the rule it attacks. R2/R4/R5/R6 are broker-observable;
// R1/R3/R7 are snapshot geometry; R8/R9 are the widget-tree render oracle.
import {
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  createLoopbackBinding,
  validateWidgetTree,
} from "../../packages/miniapp-runtime/dist/index.js";
import { runSnapshotFixtures } from "./snapshot.mjs";

const CAPS = [
  "identity",
  "apps:package",
  "apps:publish",
  "apps:install",
  "apps:preview",
];
const APP = { name: "chrome-app", publisherPublicKey: "publisher-chrome-app" };
const MANIFEST_DRAFT = {
  name: "demo-app",
  version: "1.0.0",
  entry: "bundle.js",
  capabilities: ["identity", "lxmf:send"],
};
const T256 = "A".repeat(94);

let failed = false;
function check(rule, name, ok, detail = "") {
  if (ok) {
    console.log(`PASS ${rule} ${name}`);
  } else {
    failed = true;
    console.error(`FAIL ${rule} ${name}${detail === "" ? "" : `: ${detail}`}`);
  }
}

function spyAppsBackend() {
  const calls = [];
  return {
    calls,
    package: async () => (calls.push("package"), { t256: T256 }),
    publish: async () => (calls.push("publish"), { published: true }),
    install: async () => (calls.push("install"), { installed: true }),
    preview: async () => (calls.push("preview"), { launched: true }),
    stopPreview: async () => {
      calls.push("stopPreview");
    },
  };
}

function makeHost({ channel, appsBackend }) {
  const binding = createLoopbackBinding();
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(new MemoryKvStoreBackend()),
    ...binding,
    ...(appsBackend === undefined ? {} : { appsBackend }),
    ...(channel === undefined ? {} : { confirmationChannel: channel }),
  });
  return host;
}

let requestId = 0;
async function dispatch(host, namespace, method, capability, payload) {
  requestId += 1;
  return host.dispatchRaw(
    {
      id: `chrome-${requestId}`,
      namespace,
      method,
      ...(capability === undefined ? {} : { capability }),
      ...(payload === undefined ? {} : { payload }),
    },
    {
      name: APP.name,
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: CAPS,
      publisherPublicKey: APP.publisherPublicKey,
    },
    CAPS,
  );
}

const APPS_CALLS = [
  [
    "package",
    "apps:package",
    { projectPrefix: "proj", manifest: MANIFEST_DRAFT },
  ],
  ["publish", "apps:publish", { t256: T256 }],
  ["install", "apps:install", { t256: T256 }],
  [
    "preview",
    "apps:preview",
    { projectPrefix: "proj", manifest: MANIFEST_DRAFT, grants: ["identity"] },
  ],
];

// --- CHROME-R2: every apps:* call raises a host-chrome confirmation in
// --- addition to the grant (grants alone never suffice).
{
  const backend = spyAppsBackend();
  const confirmations = [];
  const channel = {
    confirm: async (request) => {
      confirmations.push(request);
      return { approved: true };
    },
  };
  const host = makeHost({ channel, appsBackend: backend });
  await host.setGrants(APP.name, APP.publisherPublicKey, CAPS, CAPS);
  for (const [method, capability, payload] of APPS_CALLS) {
    const before = confirmations.length;
    const response = await dispatch(host, "apps", method, capability, payload);
    check(
      "CHROME-R2",
      `apps.${method} confirmed then executed`,
      response.ok === true && confirmations.length === before + 1,
      JSON.stringify(response.error ?? confirmations.length),
    );
    check(
      "CHROME-R2",
      `apps.${method} confirmation precedes backend execution`,
      confirmations.length === backend.calls.length,
      `confirmations=${confirmations.length} backendCalls=${backend.calls.length}`,
    );
  }
}

// --- CHROME-R4: no app-reachable API can accept, dismiss, or auto-answer a
// --- pending confirmation; only the chrome channel can resolve it.
{
  let resolveConfirm;
  const pending = new Promise((resolve) => {
    resolveConfirm = resolve;
  });
  const backend = spyAppsBackend();
  const host = makeHost({
    channel: { confirm: () => pending },
    appsBackend: backend,
  });
  await host.setGrants(APP.name, APP.publisherPublicKey, CAPS, CAPS);

  let settled = false;
  const inFlight = dispatch(host, "apps", "package", "apps:package", {
    projectPrefix: "proj",
    manifest: MANIFEST_DRAFT,
  }).then((response) => {
    settled = true;
    return response;
  });

  // Plausible synthetic-acknowledgement attempts — all must be UNKNOWN_METHOD.
  for (const [namespace, method] of [
    ["host", "confirm"],
    ["host", "acknowledge"],
    ["apps", "confirm"],
    ["apps", "approve"],
    ["ui", "confirm"],
    ["confirm", "approve"],
  ]) {
    const response = await dispatch(host, namespace, method);
    check(
      "CHROME-R4",
      `${namespace}.${method} is not reachable`,
      response.ok === false && response.error?.code === "UNKNOWN_METHOD",
      JSON.stringify(response.error ?? response.result),
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 20));
  check(
    "CHROME-R4",
    "confirmation still pending after app-side attempts",
    settled === false && backend.calls.length === 0,
  );

  resolveConfirm({ approved: false });
  const denied = await inFlight;
  check(
    "CHROME-R4",
    "only the chrome channel resolves the confirmation (denied)",
    denied.ok === false && denied.error?.code === "CONFIRMATION_DENIED",
    JSON.stringify(denied.error),
  );
}

// --- CHROME-R5: a host without chrome refuses — never silently approves.
{
  const backend = spyAppsBackend();
  const host = makeHost({ appsBackend: backend });
  await host.setGrants(APP.name, APP.publisherPublicKey, CAPS, CAPS);
  for (const [method, capability, payload] of APPS_CALLS) {
    const response = await dispatch(host, "apps", method, capability, payload);
    check(
      "CHROME-R5",
      `headless apps.${method} refused with CONFIRMATION_UNAVAILABLE`,
      response.ok === false &&
        response.error?.code === "CONFIRMATION_UNAVAILABLE",
      JSON.stringify(response.error ?? response.result),
    );
  }
  check(
    "CHROME-R5",
    "backend never invoked without confirmation",
    backend.calls.length === 0,
    `calls=${backend.calls}`,
  );
}

// --- CHROME-R6: confirmations carry the material the user must review.
{
  const confirmations = [];
  const channel = {
    confirm: async (request) => {
      confirmations.push(request);
      return { approved: true };
    },
  };
  const host = makeHost({ channel, appsBackend: spyAppsBackend() });
  await host.setGrants(APP.name, APP.publisherPublicKey, CAPS, CAPS);
  for (const [method, capability, payload] of APPS_CALLS) {
    await dispatch(host, "apps", method, capability, payload);
  }
  const byKind = new Map(
    confirmations.map((request) => [request.kind, request]),
  );
  check(
    "CHROME-R6",
    "package confirmation lists the declared capabilities",
    byKind.get("package")?.summary?.capabilities ===
      MANIFEST_DRAFT.capabilities.join(", "),
    JSON.stringify(byKind.get("package")?.summary),
  );
  check(
    "CHROME-R6",
    "preview confirmation lists the requested grants",
    byKind.get("preview")?.summary?.grants === "identity",
    JSON.stringify(byKind.get("preview")?.summary),
  );
  check(
    "CHROME-R6",
    "install confirmation identifies the package and the review step",
    byKind.get("install")?.summary?.t256 === T256 &&
      String(byKind.get("install")?.summary?.note ?? "").includes("reviewed"),
    JSON.stringify(byKind.get("install")?.summary),
  );
  check(
    "CHROME-R6",
    "every confirmation carries an unguessable token",
    confirmations.every(
      (request) =>
        typeof request.token === "string" && request.token.length === 32,
    ),
  );
}

runSnapshotFixtures(check);

function expectInvalid(rule, name, tree, pattern) {
  try {
    validateWidgetTree(tree);
    check(rule, name, false, "tree was accepted");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(rule, name, pattern.test(message), message);
  }
}

expectInvalid(
  "CHROME-R8",
  "grant-screen imitation is rejected",
  {
    root: {
      id: "root",
      type: "view",
      children: [
        { id: "d", type: "button", props: { label: "Deny", event: "d" } },
        { id: "a", type: "button", props: { label: "Approve", event: "a" } },
      ],
    },
  },
  /CHROME-R8/,
);
expectInvalid(
  "CHROME-R9",
  "recovery-phrase solicitation is rejected",
  {
    root: {
      id: "ask",
      type: "text",
      props: { value: "Enter your recovery phrase" },
    },
  },
  /CHROME-R9/,
);

{
  const painted = [];
  const binding = createLoopbackBinding();
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(new MemoryKvStoreBackend()),
    ...binding,
    callbacks: {
      onWidgetTree: (tree) => {
        painted.push(tree.root?.children?.[0]?.props?.value);
      },
    },
  });
  const bundle = (label) =>
    new TextEncoder().encode(`import { ui } from "@twistedpear/miniapp-sdk";
await ui.render({
  root: {
    id: "root",
    type: "view",
    children: [{ id: "title", type: "text", props: { value: ${JSON.stringify(label)} } }]
  }
});
`);
  const manifest = (name) => ({
    name,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities: [],
    publisherPublicKey: "publisher-chrome-app",
  });
  await host.launch(manifest("alpha"), bundle("alpha"));
  await host.launch(manifest("beta"), bundle("beta"));
  const deadline = Date.now() + 8_000;
  while (
    Date.now() < deadline &&
    host.snapshot().widgetTree?.root.children?.[0]?.props?.value !== "beta"
  ) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const running = host
    .running()
    .map((item) => item.appId)
    .sort();
  check(
    "CHROME-R7",
    "only the foreground app has a drawing surface",
    host.snapshot().appId === "beta" &&
      running.join(",") === "alpha,beta" &&
      host.snapshot().widgetTree?.root.children?.[0]?.props?.value === "beta" &&
      painted.at(-1) === "beta",
    `appId=${host.snapshot().appId} running=${running} painted=${painted.at(-1)}`,
  );
  await host.stopAll();
}

process.exit(failed ? 1 : 0);
