import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  describeWidgetTree,
  GrantStore,
  KvStorageBeeBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  type GrantKeyValueStore,
  type LaunchManifest,
  type MiniappCapability,
  type RenderedWidgetNode,
  type WidgetNode,
  type WidgetTree,
} from "@twistedpear/miniapp-runtime";
import type { LinkProfileName } from "./link-profiles.js";
import { applyLinkProfile, type LinkProfile } from "./link-profiles.js";

export class MemoryKvStore implements GrantKeyValueStore {
  readonly values = new Map<string, Uint8Array>();

  get(key: string): Promise<Uint8Array | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.values.delete(key);
    return Promise.resolve();
  }

  list(prefix: string): Promise<ReadonlyArray<string>> {
    return Promise.resolve(
      [...this.values.keys()].filter((key) => key.startsWith(prefix)),
    );
  }
}

export interface MountAppOptions {
  readonly manifest: LaunchManifest;
  readonly bundle: Uint8Array;
  readonly grants?: ReadonlyArray<string>;
  readonly quotas?: {
    readonly kvQuotaBytes?: number;
    readonly maxMessagesPerSecond?: number;
  };
  readonly link?: LinkProfileName | LinkProfile;
}

export interface AppHandle {
  readonly host: MiniappHost;
  tree(): RenderedWidgetNode | null;
  rawTree(): WidgetTree | null;
  fire(event: string, value?: unknown): Promise<void>;
  settle(timeoutMs?: number): Promise<void>;
  revoke(capability: string): Promise<void>;
  setQuota(kvQuotaBytes: number | null): void;
  setRateLimit(maxMessagesPerSecond: number | null): void;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  crash(): Promise<void>;
  close(): Promise<void>;
}

export async function mountApp(options: MountAppOptions): Promise<AppHandle> {
  const store = new MemoryKvStore();
  const grants = options.grants ?? options.manifest.capabilities;
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: new KvStorageBeeBackend(store),
    ...(options.quotas?.kvQuotaBytes === undefined
      ? {}
      : { kvQuotaBytes: options.quotas.kvQuotaBytes }),
  });
  if (options.quotas?.maxMessagesPerSecond !== undefined) {
    host.setResourceLimits(options.manifest.name, {
      maxMessagesPerSecond: options.quotas.maxMessagesPerSecond,
    });
  }
  await host.setGrants(
    options.manifest.name,
    options.manifest.publisherPublicKey,
    options.manifest.capabilities,
    [...grants],
  );
  await host.launch(options.manifest, options.bundle);
  const handle = createHandle(host, options.manifest);
  await handle.settle();
  if (options.link !== undefined) {
    await applyLinkProfile(handle, options.link);
  }
  return handle;
}

export async function mountAppFromDir(
  appDir: string,
  overrides: Omit<MountAppOptions, "manifest" | "bundle"> = {},
): Promise<AppHandle> {
  const manifestPath = join(appDir, "app.manifest.json");
  const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    name: string;
    version: string;
    entry: string;
    capabilities?: string[];
    publisherPublicKey?: string;
  };
  const manifest: LaunchManifest = {
    name: raw.name,
    version: raw.version,
    entry: raw.entry,
    capabilities: raw.capabilities ?? [],
    publisherPublicKey: raw.publisherPublicKey ?? "test-publisher",
  };
  const bundle = new Uint8Array(
    readFileSync(join(dirname(manifestPath), manifest.entry)),
  );
  return mountApp({ ...overrides, manifest, bundle });
}

function createHandle(host: MiniappHost, manifest: LaunchManifest): AppHandle {
  return {
    host,
    tree() {
      const tree = host.snapshot().widgetTree;
      return tree === null ? null : describeWidgetTree(tree);
    },
    rawTree() {
      return host.snapshot().widgetTree;
    },
    async fire(event, value) {
      const tree = host.snapshot().widgetTree;
      if (tree === null) {
        throw new Error("No widget tree; the app has not rendered");
      }
      const nodeId = findNodeIdByEvent(tree.root, event);
      if (nodeId === null) {
        throw new Error(`No widget declares event ${event}`);
      }
      await host.handleUiEvent(nodeId, event, value);
      await settleHost(host);
    },
    settle(timeoutMs) {
      return settleHost(host, timeoutMs);
    },
    async revoke(capability) {
      await host.revokeGrant(
        manifest.name,
        manifest.publisherPublicKey,
        capability as MiniappCapability,
      );
    },
    setQuota(kvQuotaBytes) {
      host.setResourceLimits(manifest.name, { kvQuotaBytes });
    },
    setRateLimit(maxMessagesPerSecond) {
      host.setResourceLimits(manifest.name, { maxMessagesPerSecond });
    },
    async suspend() {
      await host.suspend();
    },
    async resume() {
      await host.resume();
    },
    async crash() {
      await host.crashApp(manifest.name);
    },
    async close() {
      await host.stop();
    },
  };
}

function findNodeIdByEvent(node: WidgetNode, event: string): string | null {
  if (node.props?.event === event) return node.id;
  for (const child of node.children ?? []) {
    const found = findNodeIdByEvent(child, event);
    if (found !== null) return found;
  }
  return null;
}

async function settleHost(host: MiniappHost, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = JSON.stringify(host.snapshot().widgetTree);
  let stable = 0;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    const snapshot = host.snapshot();
    if (snapshot.state === "crashed") {
      throw new Error(
        `App crashed: ${snapshot.logs.map((entry) => entry.line).join(" | ")}`,
      );
    }
    const next = JSON.stringify(snapshot.widgetTree);
    if (next === last && next !== "null") {
      stable += 1;
      if (stable >= 2) return;
    } else {
      stable = 0;
      last = next;
    }
  }
  if (host.snapshot().widgetTree === null) {
    throw new Error("App did not render a widget tree");
  }
}

export { describeWidgetTree } from "@twistedpear/miniapp-runtime";
export type { RenderedWidgetNode } from "@twistedpear/miniapp-runtime";
