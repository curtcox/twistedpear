import { describe, expect, it } from "vitest";
import {
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend,
  validateWidgetTree,
  type GrantKeyValueStore,
} from "../src/index.js";

class MemoryStore implements GrantKeyValueStore {
  readonly values = new Map<string, Uint8Array>();
  async get(key: string): Promise<Uint8Array | null> {
    return this.values.get(key) ?? null;
  }
  async set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
  async list(prefix: string): Promise<ReadonlyArray<string>> {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

const GLOBALS = [
  "Array",
  "Object",
  "Map",
  "Set",
  "Promise",
  "Uint8Array",
  "TextEncoder",
  "TextDecoder",
  "JSON",
  "Math",
  "Date",
  "console",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "queueMicrotask",
  "URL",
  "URLSearchParams",
  "AbortController",
  "crypto",
  "Intl",
  "structuredClone",
  "Atomics",
  "SharedArrayBuffer",
  "WebAssembly",
  "fetch",
  "XMLHttpRequest",
  "process",
  "require",
  "module",
  "Buffer",
  "window",
  "document",
  "Worker",
] as const;

const GUARANTEED = new Set([
  "Array",
  "Object",
  "Map",
  "Set",
  "Promise",
  "Uint8Array",
  "TextEncoder",
  "TextDecoder",
  "JSON",
  "Math",
  "Date",
  "console",
  "setTimeout",
  "queueMicrotask",
]);

const FORBIDDEN = new Set(["process", "require", "module", "fetch", "XMLHttpRequest"]);

async function probeNodeWorker(): Promise<Record<string, boolean>> {
  const store = new MemoryStore();
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
  });
  await host.launch(
    {
      name: "probe",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: [],
      publisherPublicKey: "publisher",
    },
    new TextEncoder().encode(`
const names = ${JSON.stringify(GLOBALS)};
const present = {};
for (const name of names) present[name] = typeof globalThis[name] !== "undefined";
console.log(JSON.stringify(present));
await sdk.ui.render({
  root: { id: "root", type: "text", props: { value: "probed" } }
});
`),
  );
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const snapshot = host.diagnostics("probe");
    const line = snapshot.entries.find((entry) => entry.message.startsWith("{"));
    if (line !== undefined) {
      await host.stopAll();
      return JSON.parse(line.message) as Record<string, boolean>;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  await host.stopAll();
  throw new Error("probe did not log globals");
}

describe("ambient sandbox globals", () => {
  it("pins the node-worker surface", async () => {
    const present = await probeNodeWorker();
    for (const name of GUARANTEED) {
      expect(present[name], name).toBe(true);
    }
    for (const name of FORBIDDEN) {
      expect(present[name], name).toBe(false);
    }
    expect(present).toMatchSnapshot();
  });

  it("still rejects unknown widget props", () => {
    expect(() =>
      validateWidgetTree({
        root: {
          id: "root",
          type: "text-input",
          props: { value: "", extra: true },
        },
      }),
    ).toThrow(/Unsupported/);
  });
});
