// SPEC-SDK vector generation: run the vector inputs over the REFERENCE
// binding, record normalized outcomes as expectations, assert that every
// error code in the spec's taxonomy is covered, and write
// specs/spec-sdk/vectors/calls.json. The committed vectors are then replayed
// over BOTH bindings in CI (conformance/sdk-interop and
// conformance/bind-loopback). Regenerate with: npm run generate:sdk-vectors
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createVectorHost,
  executeStep,
  normalizeValue,
} from "../conformance/sdk-interop/vector-hosts.mjs";
import { configureVectorHost } from "../conformance/sdk-interop/vectors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = join(
  here,
  "..",
  "specs",
  "spec-sdk",
  "vectors",
  "calls.json",
);

const FULL = [
  "identity",
  "lxmf:send",
  "lxmf:receive",
  "storage:kv",
  "storage:hyperbee",
  "announce:publish",
  "announce:subscribe",
  "resource:fetch",
  "presence",
  "workspace",
  "share:cas",
  "ai:chat",
  "apps:package",
];

const app = (name, declared, granted = declared, register = true) => ({
  name,
  declared,
  granted,
  register,
});
const A = app("vector-app", FULL);

const call = (namespace, method, capability, payload) => ({
  namespace,
  method,
  ...(capability === undefined ? {} : { capability }),
  ...(payload === undefined ? {} : { payload }),
});

// Each input: { name, host?, app?, steps: [{ call, repeat?, expectCode?, messageIncludes?, match? }] }
// match: "exact" (default — pin normalized result) | "keys" | "none".
const INPUTS = [
  {
    name: "identity: destination hash and signing",
    steps: [
      { call: call("identity", "destinationHash", "identity") },
      {
        call: call("identity", "sign", "identity", {
          payload: { $textBytes: "payload" },
        }),
      },
    ],
  },
  {
    name: "ui: render a minimal tree",
    steps: [
      {
        call: call("ui", "render", undefined, {
          tree: { root: { id: "root", type: "text", props: { value: "hi" } } },
        }),
      },
    ],
  },
  {
    name: "ui: invalid widget tree is rejected (service extension code)",
    steps: [
      {
        call: call("ui", "render", undefined, {
          tree: { root: { id: "root", type: "carousel" } },
        }),
        expectCode: "INVALID_WIDGET",
      },
    ],
  },
  {
    name: "ui: event without an active app",
    steps: [
      {
        call: call("ui", "event", undefined, { nodeId: "root", event: "tap" }),
        expectCode: "BROKER_ERROR",
        messageIncludes: "No mini-app is running",
      },
    ],
  },
  {
    name: "storage.kv: set, get, isolation-scoped delete",
    steps: [
      {
        call: call("storage.kv", "set", "storage:kv", {
          key: "greeting",
          value: { $textBytes: "hello" },
        }),
      },
      { call: call("storage.kv", "get", "storage:kv", { key: "greeting" }) },
      { call: call("storage.kv", "delete", "storage:kv", { key: "greeting" }) },
      { call: call("storage.kv", "get", "storage:kv", { key: "greeting" }) },
    ],
  },
  {
    name: "storage.kv: quota exhaustion",
    steps: [
      {
        call: call("storage.kv", "set", "storage:kv", {
          key: "big",
          value: { $textBytes: "y".repeat(200) },
        }),
        expectCode: "BROKER_ERROR",
        messageIncludes: "quota",
      },
    ],
  },
  {
    name: "storage.bee: open, put, get, list",
    steps: [
      { call: call("storage.bee", "open", "storage:hyperbee") },
      {
        call: call("storage.bee", "put", "storage:hyperbee", {
          key: "post:1",
          value: { $textBytes: "first" },
        }),
      },
      {
        call: call("storage.bee", "get", "storage:hyperbee", { key: "post:1" }),
      },
      {
        call: call("storage.bee", "list", "storage:hyperbee", {
          options: { limit: 10 },
        }),
      },
    ],
  },
  {
    name: "storage.bee: quota exhaustion",
    steps: [
      {
        call: call("storage.bee", "put", "storage:hyperbee", {
          key: "big",
          value: { $textBytes: "z".repeat(200) },
        }),
        expectCode: "BROKER_ERROR",
        messageIncludes: "quota",
      },
    ],
  },
  {
    name: "lxmf: send to self and receive, inbox drains",
    steps: [
      {
        call: call("lxmf", "send", "lxmf:send", {
          to: "vector-app",
          subject: "hi",
          body: "note to self",
        }),
      },
      { call: call("lxmf", "receive", "lxmf:receive") },
      { call: call("lxmf", "receive", "lxmf:receive") },
    ],
  },
  {
    name: "announce: publish then subscribe",
    steps: [
      {
        call: call("announce", "publish", "announce:publish", {
          appData: { $textBytes: "post-1" },
        }),
      },
      {
        call: call("announce", "subscribe", "announce:subscribe"),
      },
    ],
  },
  {
    name: "presence: snapshot",
    steps: [{ call: call("presence", "snapshot", "presence") }],
  },
  {
    name: "host: info",
    steps: [{ call: call("host", "info", "presence"), match: "keys" }],
  },
  {
    name: "workspace: write, read, list",
    steps: [
      {
        call: call("workspace", "write", "workspace", {
          path: "src/main.js",
          content: "console.log(1)",
        }),
      },
      { call: call("workspace", "read", "workspace", { path: "src/main.js" }) },
      { call: call("workspace", "list", "workspace", { prefix: "src/" }) },
    ],
  },
  {
    name: "share.cas: put then get round-trips",
    steps: [
      {
        call: call("share.cas", "put", "share:cas", { content: "shared blob" }),
      },
      {
        call: call("share.cas", "get", "share:cas", {
          t256: "3231c75f2b33d1a7cc41e8eb7618273f2311a3f43149a59979f869b87ed583ad",
        }),
      },
    ],
  },
  {
    name: "resource: fetch within budget",
    steps: [
      {
        call: call("resource", "fetch", "resource:fetch", {
          resourceId: "offer:demo",
          budgetBytes: 4096,
        }),
      },
    ],
  },
  {
    name: "resource: budget exceeded",
    steps: [
      {
        call: call("resource", "fetch", "resource:fetch", {
          resourceId: "offer:demo",
          budgetBytes: 4,
        }),
        expectCode: "BROKER_ERROR",
        messageIncludes: "budget",
      },
    ],
  },
  {
    name: "resource: unknown resource",
    steps: [
      {
        call: call("resource", "fetch", "resource:fetch", {
          resourceId: "offer:missing",
        }),
        expectCode: "BROKER_ERROR",
        messageIncludes: "not found",
      },
    ],
  },
  {
    name: "capability: unknown capability in declared set",
    app: app(
      "rogue-app",
      ["identity", "network:raw"],
      ["identity", "network:raw"],
      false,
    ),
    steps: [
      {
        call: call("identity", "destinationHash", "identity"),
        expectCode: "UNKNOWN_CAPABILITY",
      },
    ],
  },
  {
    name: "capability: granted but not declared",
    app: app("undeclared-app", ["identity"], ["identity", "storage:kv"], false),
    steps: [
      {
        call: call("storage.kv", "get", "storage:kv", { key: "x" }),
        expectCode: "UNDECLARED_CAPABILITY",
      },
    ],
  },
  {
    name: "capability: declared but not granted",
    app: app("ungranted-app", ["identity", "storage:kv"], ["identity"]),
    steps: [
      {
        call: call("storage.kv", "get", "storage:kv", { key: "x" }),
        expectCode: "CAPABILITY_DENIED",
      },
    ],
  },
  {
    name: "capability: request names the wrong capability",
    steps: [
      {
        call: call("storage.kv", "get", "identity", { key: "x" }),
        expectCode: "CAPABILITY_MISMATCH",
      },
    ],
  },
  {
    name: "per-namespace denial: lxmf, announce, presence, workspace, share, resource",
    app: app("denied-app", FULL, ["identity"]),
    steps: [
      {
        call: call("lxmf", "send", "lxmf:send", {
          to: "x",
          subject: "s",
          body: "b",
        }),
        expectCode: "CAPABILITY_DENIED",
      },
      {
        call: call("announce", "publish", "announce:publish"),
        expectCode: "CAPABILITY_DENIED",
      },
      {
        call: call("presence", "snapshot", "presence"),
        expectCode: "CAPABILITY_DENIED",
      },
      {
        call: call("workspace", "list", "workspace"),
        expectCode: "CAPABILITY_DENIED",
      },
      {
        call: call("share.cas", "put", "share:cas", { content: "x" }),
        expectCode: "CAPABILITY_DENIED",
      },
      {
        call: call("resource", "fetch", "resource:fetch", {
          resourceId: "offer:demo",
        }),
        expectCode: "CAPABILITY_DENIED",
      },
    ],
  },
  {
    name: "broker: unknown method",
    steps: [
      {
        call: call("identity", "teleport", "identity"),
        expectCode: "UNKNOWN_METHOD",
      },
    ],
  },
  {
    name: "broker: rate limited",
    setup: { maxMessagesPerSecond: 4 },
    steps: [
      {
        call: call("identity", "destinationHash", "identity"),
        repeat: 6,
        expectCode: "RATE_LIMITED",
      },
    ],
  },
  {
    name: "broker: message too large",
    steps: [
      {
        call: call("storage.kv", "set", "storage:kv", {
          key: "big",
          note: { $asciiString: 300000 },
        }),
        expectCode: "MESSAGE_TOO_LARGE",
      },
    ],
  },
  {
    name: "apps: unconfigured host",
    steps: [
      {
        call: call("apps", "package", "apps:package", {
          projectPrefix: "proj",
          manifest: {
            name: "demo-app",
            version: "1.0.0",
            entry: "bundle.js",
            capabilities: [],
          },
        }),
        expectCode: "APPS_UNCONFIGURED",
      },
    ],
  },
  {
    name: "apps: no confirmation channel",
    host: "apps-noconfirm",
    steps: [
      {
        call: call("apps", "package", "apps:package", {
          projectPrefix: "proj",
          manifest: {
            name: "demo-app",
            version: "1.0.0",
            entry: "bundle.js",
            capabilities: [],
          },
        }),
        expectCode: "CONFIRMATION_UNAVAILABLE",
      },
    ],
  },
  {
    name: "apps: confirmation denied",
    host: "apps-deny",
    steps: [
      {
        call: call("apps", "package", "apps:package", {
          projectPrefix: "proj",
          manifest: {
            name: "demo-app",
            version: "1.0.0",
            entry: "bundle.js",
            capabilities: [],
          },
        }),
        expectCode: "CONFIRMATION_DENIED",
      },
    ],
  },
  {
    name: "apps: confirmation timeout",
    host: "apps-timeout",
    steps: [
      {
        call: call("apps", "package", "apps:package", {
          projectPrefix: "proj",
          manifest: {
            name: "demo-app",
            version: "1.0.0",
            entry: "bundle.js",
            capabilities: [],
          },
        }),
        expectCode: "CONFIRMATION_TIMEOUT",
      },
    ],
  },
  {
    name: "apps: approved package call succeeds",
    host: "apps-approve",
    steps: [
      {
        call: call("apps", "package", "apps:package", {
          projectPrefix: "proj",
          manifest: {
            name: "demo-app",
            version: "1.0.0",
            entry: "bundle.js",
            capabilities: [],
          },
        }),
      },
    ],
  },
  {
    name: "ai: unconfigured host",
    steps: [
      {
        call: call("ai", "chat", "ai:chat", {
          messages: [{ role: "user", content: "hi" }],
        }),
        expectCode: "AI_UNCONFIGURED",
      },
    ],
  },
  {
    name: "ai: configured chat succeeds",
    host: "ai-configured",
    steps: [
      {
        call: call("ai", "chat", "ai:chat", {
          messages: [{ role: "user", content: "hi" }],
        }),
      },
    ],
  },
  {
    name: "crypto: hash hmac randomBytes and timingSafeEqual",
    steps: [
      {
        call: call("crypto", "hash", undefined, {
          alg: "sha256",
          bytes: { $textBytes: "payload" },
        }),
      },
      {
        call: call("crypto", "hmac", undefined, {
          alg: "sha256",
          key: { $textBytes: "key" },
          bytes: { $textBytes: "payload" },
        }),
      },
      {
        call: call("crypto", "randomBytes", undefined, { n: 4 }),
        match: "none",
      },
      {
        call: call("crypto", "timingSafeEqual", undefined, {
          a: { $textBytes: "abcd" },
          b: { $textBytes: "abcd" },
        }),
      },
    ],
  },
  {
    name: "crypto: unknown algorithm is rejected",
    steps: [
      {
        call: call("crypto", "hash", undefined, {
          alg: "md5",
          bytes: { $textBytes: "payload" },
        }),
        expectCode: "CRYPTO_BAD_REQUEST",
      },
    ],
  },
];

const TAXONOMY = [
  "UNKNOWN_CAPABILITY",
  "UNDECLARED_CAPABILITY",
  "CAPABILITY_DENIED",
  "CAPABILITY_MISMATCH",
  "UNKNOWN_METHOD",
  "RATE_LIMITED",
  "MESSAGE_TOO_LARGE",
  "BROKER_ERROR",
  "CONFIRMATION_UNAVAILABLE",
  "CONFIRMATION_TIMEOUT",
  "CONFIRMATION_DENIED",
  "APPS_UNCONFIGURED",
  "AI_UNCONFIGURED",
];

const vectors = [];
const seenCodes = new Set();

for (const input of INPUTS) {
  const hostKey = input.host ?? "standard";
  const vectorApp = input.app ?? A;
  const { host, ready, close } = createVectorHost(hostKey, "reference");
  await ready;
  await configureVectorHost(host, vectorApp, input);

  const steps = [];
  for (const step of input.steps) {
    const response = await executeStep(host, vectorApp, step);
    const match = step.match ?? "exact";
    let expect;
    if (response.ok) {
      if (step.expectCode !== undefined) {
        throw new Error(
          `${input.name}: expected ${step.expectCode}, call succeeded`,
        );
      }
      expect = { ok: true };
      if (match === "exact")
        expect.result = normalizeValue(response.result) ?? null;
      if (match === "keys") {
        expect.resultKeys = Object.keys(response.result ?? {}).sort();
      }
    } else {
      const code = response.error?.code ?? "BROKER_ERROR";
      if (step.expectCode === undefined) {
        throw new Error(
          `${input.name}: unexpected failure ${code}: ${response.error?.message}`,
        );
      }
      if (code !== step.expectCode) {
        throw new Error(
          `${input.name}: expected ${step.expectCode}, got ${code}: ${response.error?.message}`,
        );
      }
      if (
        step.messageIncludes !== undefined &&
        !response.error.message
          .toLowerCase()
          .includes(step.messageIncludes.toLowerCase())
      ) {
        throw new Error(
          `${input.name}: message "${response.error.message}" lacks "${step.messageIncludes}"`,
        );
      }
      seenCodes.add(code);
      expect = {
        ok: false,
        code,
        ...(step.messageIncludes === undefined
          ? {}
          : { messageIncludes: step.messageIncludes }),
      };
    }
    steps.push({
      call: step.call,
      ...(step.repeat === undefined ? {} : { repeat: step.repeat }),
      expect,
    });
  }
  await close();

  vectors.push({
    name: input.name,
    ...(input.host === undefined ? {} : { host: input.host }),
    ...(input.app === undefined ? {} : { app: vectorApp }),
    ...(input.setup === undefined ? {} : { setup: input.setup }),
    steps,
  });
}

const missing = TAXONOMY.filter((code) => !seenCodes.has(code));
if (missing.length > 0) {
  throw new Error(
    `error taxonomy not fully covered, missing: ${missing.join(", ")}`,
  );
}

const body = {
  spec: "SPEC-SDK",
  description:
    "Broker call vectors: (granted capabilities, call, args) -> (result | error code). Each vector runs its steps in order against a fresh host in the named configuration (default: standard) with the default app (all capabilities declared+granted) unless overridden. Results are normalized: bytes as {$bytes}, receivedAt/seq zeroed, lxmf message ids as lxmf-<id>. Covers every code in the error taxonomy plus recorded service-extension codes (e.g. INVALID_WIDGET). Replayed over both the loopback and reference bindings in CI.",
  defaultApp: A,
  errorTaxonomy: TAXONOMY,
  vectors,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(body, null, 2) + "\n");
console.log(
  `wrote ${vectors.length} vectors (${seenCodes.size} taxonomy codes) -> ${outputPath}`,
);
process.exit(0);
