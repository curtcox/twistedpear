import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGuidaApp } from "../src/build.js";
import {
  createVectorHost,
  expandDirectives,
  manifestFor,
} from "../../../conformance/sdk-interop/vector-hosts.mjs";
import {
  configureVectorHost,
  mismatchDescription,
} from "../../../conformance/sdk-interop/vectors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const harnessDir = join(here, "../fixtures/vector-harness");
const descriptor = JSON.parse(
  readFileSync(
    join(root, "specs/spec-sdk/schema/calls.descriptor.json"),
    "utf8",
  ),
) as {
  calls: ReadonlyArray<{
    namespace: string;
    method: string;
    skipBinding?: boolean;
    capability?: string | null;
    sdkPath: ReadonlyArray<string>;
    args?: ReadonlyArray<{ name: string; type: string }>;
  }>;
};
const vectors = JSON.parse(
  readFileSync(join(root, "specs/spec-sdk/vectors/calls.json"), "utf8"),
) as {
  defaultApp: {
    name: string;
    declared: string[];
    granted: string[];
    register?: boolean;
  };
  vectors: ReadonlyArray<{
    name: string;
    host?: string;
    app?: {
      name: string;
      declared: string[];
      granted: string[];
      register?: boolean;
    };
    setup?: { maxMessagesPerSecond?: number };
    steps: ReadonlyArray<{
      call: {
        namespace: string;
        method: string;
        capability?: string;
        payload?: unknown;
      };
      expect: {
        ok: boolean;
        code?: string;
        result?: unknown;
        resultKeys?: string[];
        messageIncludes?: string;
      };
      repeat?: number;
    }>;
  }>;
};

type UiHandler = (event: {
  nodeId: string;
  event: string;
  value?: unknown;
}) => void | Promise<void>;

function jsonSafe(value: unknown): unknown {
  if (value instanceof Uint8Array) return Array.from(value);
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        jsonSafe(item),
      ]),
    );
  }
  return value;
}

function findBinding(namespace: string, method: string) {
  return descriptor.calls.find((call) => {
    if (call.namespace === namespace && call.method === method) return true;
    if (
      namespace === "apps" &&
      method === "package" &&
      call.method === "packageProject"
    ) {
      return true;
    }
    if (
      namespace === "workspace" &&
      method === "delete" &&
      call.method === "remove"
    ) {
      return true;
    }
    return false;
  });
}

function wrapPayload(
  binding: (typeof descriptor.calls)[number] | undefined,
  payload: unknown,
): unknown {
  if (binding === undefined || binding.skipBinding)
    return jsonSafe(payload ?? null);
  const args = binding.args ?? [];
  if (args.length === 0) return null;
  const record =
    payload !== null && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : undefined;
  if (record !== undefined && args.every((arg) => arg.name in record)) {
    return jsonSafe(record);
  }
  if (args.length === 1) {
    return jsonSafe({ [args[0].name]: payload });
  }
  return jsonSafe(payload);
}

function asBytes(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return Uint8Array.from(value);
  }
  return value;
}

function toBrokerPayload(
  binding: (typeof descriptor.calls)[number] | undefined,
  payload: unknown,
): unknown {
  if (payload === undefined || payload === null) return payload;
  const args = binding?.args ?? [];
  if (args.length === 1 && args[0].name === "request") {
    if (
      payload !== null &&
      typeof payload === "object" &&
      "request" in payload
    ) {
      return (payload as { request: unknown }).request;
    }
    return payload;
  }
  if (
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    const body = { ...(payload as Record<string, unknown>) };
    for (const arg of args) {
      if (arg.type === "bytes" && arg.name in body) {
        body[arg.name] = asBytes(body[arg.name]);
      }
    }
    return body;
  }
  return payload;
}

function brokerMethod(namespace: string, method: string): string {
  if (namespace === "apps" && method === "packageProject") return "package";
  if (namespace === "workspace" && method === "remove") return "delete";
  return method;
}

function resultText(frames: unknown[]): string {
  const last = frames.at(-1) as {
    root?: {
      children?: ReadonlyArray<{ id?: string; props?: { value?: string } }>;
    };
  };
  const node = last?.root?.children?.find((child) => child.id === "result");
  return node?.props?.value ?? "";
}

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

const guidaAvailable = await import("guida")
  .then(() => true)
  .catch(() => false);

describe.skipIf(!guidaAvailable)("Guida SPEC-SDK vector replay", () => {
  it("replays every vector through generated bindings and the shim", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-guida-vectors-"));
    try {
      cpSync(harnessDir, cwd, { recursive: true });
      const built = await buildGuidaApp({ appDir: cwd });
      const failures: string[] = [];
      for (const vector of vectors.vectors) {
        const vectorApp = vector.app ?? vectors.defaultApp;
        const { host, ready, close } = createVectorHost(
          vector.host ?? "standard",
          "reference",
        );
        await ready;
        try {
          await configureVectorHost(host, vectorApp, vector);
          failures.push(
            ...(await replayVector(built.bundle, host, vectorApp, vector)),
          );
        } finally {
          await close();
        }
      }
      expect(failures).toEqual([]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 180_000);
});

async function replayVector(
  bundle: string,
  host: ReturnType<typeof createVectorHost>["host"],
  vectorApp: (typeof vectors)["defaultApp"],
  vector: (typeof vectors.vectors)[number],
): Promise<string[]> {
  const frames: unknown[] = [];
  let handler: UiHandler | undefined;
  let lastResponse:
    | {
        ok: boolean;
        error?: { code?: string; message?: string };
        result?: unknown;
      }
    | undefined;
  let pendingCapability: string | undefined;
  let requestId = 0;

  const callBroker = async (
    namespace: string,
    method: string,
    payload: unknown,
  ) => {
    requestId += 1;
    const binding = findBinding(namespace, method);
    const response = await host.dispatchRaw(
      {
        id: `guida-vector-${requestId}`,
        namespace,
        method: brokerMethod(namespace, method),
        ...(pendingCapability === undefined
          ? {}
          : { capability: pendingCapability }),
        ...(payload === undefined || payload === null
          ? {}
          : { payload: toBrokerPayload(binding, payload) }),
      },
      manifestFor(vectorApp),
      vectorApp.granted,
    );
    lastResponse = response;
    if (!response.ok) {
      const error = new Error(response.error?.message ?? "failed") as Error & {
        code?: string;
      };
      error.code = response.error?.code;
      throw error;
    }
    return response.result;
  };

  const sdk: Record<string, unknown> = {
    ui: {
      render: async (tree: unknown) => {
        frames.push(structuredClone(tree));
      },
      onEvent: (next: UiHandler) => {
        handler = next;
      },
    },
    invoke: (namespace: string, method: string, payload: unknown) =>
      callBroker(namespace, method, payload),
  };

  await new Function("sdk", `return (async () => {\n${bundle}\n})();`)(sdk);
  await flush();
  if (handler === undefined)
    throw new Error("harness did not register onEvent");

  const failures: string[] = [];
  for (const [index, step] of vector.steps.entries()) {
    const binding = findBinding(step.call.namespace, step.call.method);
    const method = binding?.method ?? step.call.method;
    pendingCapability = step.call.capability;
    const payload = wrapPayload(
      binding,
      step.call.payload === undefined
        ? null
        : expandDirectives(step.call.payload),
    );
    const raw = JSON.stringify({
      namespace: binding?.namespace ?? step.call.namespace,
      method,
      payload,
    });
    lastResponse = undefined;
    const repeat = step.repeat ?? 1;
    for (let n = 0; n < repeat; n += 1) {
      await handler({ nodeId: "call", event: "call", value: raw });
      await flush();
      await handler({ nodeId: "run", event: "run" });
      const deadline = Date.now() + 3_000;
      while (Date.now() < deadline) {
        await flush();
        if (lastResponse !== undefined) break;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }
    const where = `${vector.name} step ${index}`;
    if (lastResponse === undefined) {
      failures.push(`${where}: no broker response (${resultText(frames)})`);
      continue;
    }
    const mismatch = mismatchDescription(lastResponse, step.expect, where);
    if (mismatch !== null) failures.push(mismatch);
  }
  return failures;
}
