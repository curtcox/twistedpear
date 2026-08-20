import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type UiHandler = (event: {
  nodeId: string;
  event: string;
  value?: unknown;
}) => void | Promise<void>;

export function listTwinDirs(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .filter(
      (dir) =>
        existsSync(join(dir, "bundle.js")) && existsSync(join(dir, "src/Main.elm")),
    )
    .sort();
}

export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function canonical(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

export async function flush(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function wrapAsync<A extends unknown[], T>(
  inflight: { n: number },
  fn: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  return async (...args: A) => {
    inflight.n += 1;
    try {
      return await fn(...args);
    } finally {
      inflight.n -= 1;
    }
  };
}

export function makeTwinSdk(frames: unknown[]) {
  const inflight = { n: 0 };
  let handler: UiHandler | undefined;
  const kv = new Map<string, Uint8Array>();
  const files = new Map<string, string>();
  const w = <A extends unknown[], T>(fn: (...args: A) => Promise<T>) =>
    wrapAsync(inflight, fn);
  const sdk = {
    inflight: () => inflight.n,
    handler: () => handler,
    ui: {
      render: async (tree: unknown) => {
        frames.push(structuredClone(tree));
      },
      onEvent: (next: UiHandler) => {
        handler = next;
      },
    },
    storage: {
      kv: {
        get: w(async (key: string) => kv.get(key) ?? null),
        set: w(async (key: string, value: Uint8Array) => {
          kv.set(key, value);
        }),
        delete: w(async (key: string) => {
          kv.delete(key);
        }),
      },
      bee: {
        open: w(async () => ({})),
        get: w(async () => null),
        put: w(async () => undefined),
        del: w(async () => undefined),
        list: w(async () => []),
      },
    },
    identity: {
      destinationHash: w(async () => "app:twin:publisher"),
      sign: w(async (payload: Uint8Array) => payload),
    },
    lxmf: {
      send: w(async () => ({ id: "lxmf-1", status: "queued" })),
      receive: w(async () => []),
    },
    announce: {
      publish: w(async () => undefined),
      subscribe: w(async () => []),
    },
    presence: {
      snapshot: w(async () => ({
        peers: 0,
        onlineInterfaces: 0,
        preferredInterface: "auto",
      })),
    },
    host: {
      info: w(async () => ({
        platform: "node",
        hostVersion: "0.15.0",
        hostApiVersion: "0.15.0",
        roles: { transport: false, seeder: false, propagation: false },
        interfaceTypes: [],
        quotas: {
          kvQuotaBytes: null,
          seedStorageUsedBytes: null,
          seedStorageQuotaBytes: null,
          memoryBytes: null,
        },
        grantedCapabilities: [],
      })),
      requestWake: w(async () => ({ accepted: false })),
    },
    workspace: {
      list: w(async (prefix?: string) =>
        [...files.keys()]
          .filter((path) => prefix === undefined || path.startsWith(prefix))
          .map((path) => ({ path, size: files.get(path)?.length ?? 0 })),
      ),
      read: w(async (path: string) => files.get(path) ?? ""),
      write: w(async (path: string, content: string) => {
        files.set(path, content);
      }),
      patch: w(async () => ({ applied: true })),
      remove: w(async (path: string) => {
        files.delete(path);
      }),
    },
    ai: {
      chat: w(async () => ({ text: "ok", model: "test" })),
      embed: w(async () => ({ vectors: [] })),
      search: w(async () => ({ hits: [] })),
    },
    apps: {
      compile: w(async () => ({ compiled: false })),
      packageProject: w(async () => ({
        t256: "A".repeat(94),
        size: 1,
        packageHash: "ab",
      })),
      publish: w(async () => ({ t256: "A".repeat(94), version: "1.0.0" })),
      install: w(async () => ({ appId: "x", version: "1.0.0", trusted: true })),
      preview: w(async () => ({ launched: true })),
      stopPreview: w(async () => undefined),
    },
    share: {
      put: w(async () => ({ t256: "A".repeat(94) })),
      get: w(async () => null),
    },
    peers: {
      request: w(async () => ({ handle: "p" })),
      listen: w(async () => ({ handle: "p" })),
      diagnostics: w(async () => []),
      info: w(async () => ({})),
      close: w(async () => undefined),
    },
    links: {
      peers: w(async () => []),
      probe: w(async () => ({ ok: true })),
    },
    relay: {
      setMode: w(async () => ({})),
      list: w(async () => []),
      status: w(async () => ({})),
      diagnostics: w(async () => ({})),
    },
    freenet: {
      get: w(async () => ({})),
      put: w(async () => ({})),
      update: w(async () => ({})),
    },
    resource: {
      fetch: w(async () => ({ content: new Uint8Array() })),
    },
    device: {
      inventory: w(async () => []),
      diagnostics: w(async () => ({})),
      open: w(async () => ({ session: "s" })),
      close: w(async () => undefined),
      read: w(async () => ({})),
      shareOffers: w(async () => []),
      requestShareOffer: w(async () => null),
      revokeShareOffer: w(async () => false),
      stream: w(async () => ({ handle: "s" })),
      streams: w(async () => []),
      accept: w(async () => undefined),
      incoming: async function* incoming() {},
    },
  };
  const record = sdk as typeof sdk & {
    invoke: (
      namespace: string,
      method: string,
      payload?: unknown,
    ) => Promise<unknown>;
  };
  record.invoke = w(
    async (namespace: string, method: string, payload?: unknown) => {
      const parts = namespace.split(".");
      let cursor: unknown = record;
      for (const part of parts) {
        if (cursor === null || typeof cursor !== "object") {
          cursor = undefined;
          break;
        }
        cursor = (cursor as Record<string, unknown>)[part];
      }
      const fn =
        cursor !== null && typeof cursor === "object"
          ? (cursor as Record<string, unknown>)[method]
          : undefined;
      if (typeof fn !== "function") {
        throw new Error(`unknown Guida SDK call: ${namespace}.${method}`);
      }
      if (payload === undefined || payload === null) return fn();
      if (typeof payload === "object" && !Array.isArray(payload)) {
        const values = Object.values(payload as Record<string, unknown>);
        return values.length === 0 ? fn() : fn(...values);
      }
      return fn(payload);
    },
  );
  return record;
}

export async function waitSettled(sdk: { inflight: () => number }): Promise<void> {
  let idle = 0;
  for (let i = 0; i < 80; i += 1) {
    await flush();
    if (sdk.inflight() === 0) {
      idle += 1;
      if (idle >= 4) return;
    } else {
      idle = 0;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
  }
}

export async function recordBundle(
  source: string,
  events: ReadonlyArray<{ nodeId: string; event: string; value?: unknown }>,
): Promise<unknown[]> {
  const frames: unknown[] = [];
  const sdk = makeTwinSdk(frames);
  const rewritten = source.replace(
    /import\s*\{([^}]*)\}\s*from\s*["']@twistedpear\/miniapp-sdk["']\s*;?/u,
    (_match, names: string) => `const {${names}} = sdk;`,
  );
  const utcMinutes = Date.prototype.getUTCMinutes;
  const localeTime = Date.prototype.toLocaleTimeString;
  Date.prototype.getUTCMinutes = () => 0;
  Date.prototype.toLocaleTimeString = () => "";
  try {
    await new Function("sdk", `return (async () => {\n${rewritten}\n})();`)(sdk);
    await waitSettled(sdk);
    const handler = sdk.handler();
    if (handler === undefined) throw new Error("app did not register onEvent");
    for (const event of events) {
      await handler(event);
      await waitSettled(sdk);
    }
    return frames;
  } finally {
    Date.prototype.getUTCMinutes = utcMinutes;
    Date.prototype.toLocaleTimeString = localeTime;
  }
}
