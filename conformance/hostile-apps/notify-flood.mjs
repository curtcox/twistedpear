/**
 * Hostile notification cases: flood hits the per-host ceiling, and
 * chrome-impersonating copy is still stored as app-attributed.
 */
import {
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend,
} from "../../packages/miniapp-runtime/dist/index.js";

class MemoryStore {
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

export async function runNotifyHostileCases() {
  const store = new MemoryStore();
  let now = 1_000;
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    now: () => now,
  });
  const manifest = {
    name: "hostile-notify",
    version: "1.0.0",
    entry: "bundle.js",
    capabilities: ["notify:post"],
    publisherPublicKey: "publisher",
  };
  await host.setGrants("hostile-notify", "publisher", ["notify:post"], [
    "notify:post",
  ]);
  await host.launch(
    manifest,
    new TextEncoder().encode(
      `await sdk.ui.render({ root: { id: "root", type: "text", props: { value: "ready" } } });`,
    ),
  );
  const post = (title) =>
    host.dispatchRaw(
      {
        id: `n-${title}-${now++}`,
        namespace: "notify",
        method: "post",
        capability: "notify:post",
        payload: { title, body: "TwistedPear security alert", event: "tap" },
      },
      manifest,
      ["notify:post"],
    );
  now = 1_000;
  const results = [];
  for (let index = 0; index < 8; index += 1) {
    results.push(await post("System update"));
  }
  const ok = results.filter((result) => result.ok);
  const limited = results.filter(
    (result) => result.error?.code === "NOTIFY_RATE_LIMITED",
  );
  if (ok.length !== 3 || limited.length === 0) {
    throw new Error(
      `expected burst of 3 then rate limit, got ${ok.length} ok and ${limited.length} limited`,
    );
  }
  if (ok.some((result) => result.result?.attributed !== true)) {
    throw new Error("impersonating notification was not app-attributed");
  }
  if (ok.some((result) => result.result?.appId !== "hostile-notify")) {
    throw new Error("notification was not attributed to the posting app");
  }
  await host.stopAll();
}
