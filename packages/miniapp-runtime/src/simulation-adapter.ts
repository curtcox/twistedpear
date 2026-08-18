import {
  GrantStore,
  type GrantKeyValueStore,
  type GrantRecord,
  type MiniappCapability,
} from "./capabilities.js";
import { MiniappHost, type LaunchManifest } from "./host.js";
import type { BrokerAuditEntry, BrokerResponse } from "./broker.js";
import type { MiniappKvStoreBackend } from "./services/storage-kv.js";
import type { SandboxBackend } from "./sandbox/backend.js";

export interface ProductionCapabilityObservation {
  readonly handler: string;
  readonly response: BrokerResponse;
  readonly publicGrant: GrantRecord | null;
  readonly authority: Readonly<
    Record<string, import("@twistedpear/protocol").GrantLifecycleState>
  >;
  readonly storageKeys: readonly string[];
  readonly identityIds: readonly string[];
  readonly audit: readonly BrokerAuditEntry[];
  readonly egress: readonly {
    readonly at: number;
    readonly appId: string;
    readonly operation: string;
  }[];
  readonly negativeControlRejected: boolean;
}

/**
 * Deterministic adapter over the shipping MiniappHost, GrantStore, broker
 * registrations, and capability service backends. It is intentionally small:
 * the simulator supplies time and reads independent backend/audit projections.
 */
export class ProductionCapabilityAdapter {
  private readonly bytes = new MemoryBackend();
  private readonly grants = new GrantStore(this.bytes);
  private readonly audit: BrokerAuditEntry[] = [];
  private readonly identities = new Set<string>();
  private readonly egress: { at: number; appId: string; operation: string }[] =
    [];
  private nowValue = 0;
  private readonly host: MiniappHost;
  private negativeControlRejected = true;

  constructor(
    private readonly appId = "campaign-app",
    private readonly publisherPublicKey = "campaign-publisher",
    weakenBrokerCapabilityGate = false,
  ) {
    this.identities.add(`${appId}:${publisherPublicKey}:publisher`);
    this.host = new MiniappHost({
      backend: unusedSandbox,
      grantStore: this.grants,
      kvBackend: this.bytes,
      now: () => this.nowValue,
      brokerAudit: (entry) => this.audit.push(entry),
      enforceBrokerCapabilities: !weakenBrokerCapabilityGate,
      identityBackend: {
        deriveDestinationHash: (appId, publisher) => {
          const id = `${appId}:${publisher}:identity`;
          this.identities.add(id);
          return Promise.resolve(id);
        },
        sign: (appId, publisher, payload) => {
          this.identities.add(`${appId}:${publisher}:identity`);
          this.egress.push({
            at: this.nowValue,
            appId,
            operation: "identity.sign",
          });
          return Promise.resolve(new Uint8Array([0x53, ...payload]));
        },
      },
      presenceBackend: {
        snapshot: () =>
          Promise.resolve({
            onlineInterfaces: 1,
            preferredInterface: "sim",
            peers: 1,
          }),
      },
      resourceBackend: {
        fetch: (appId) => {
          this.egress.push({
            at: this.nowValue,
            appId,
            operation: "resource.fetch",
          });
          return Promise.resolve(new Uint8Array([0x52]));
        },
      },
      casBackend: {
        put: async (appId, content) => {
          const t256 = `sim-${hex(content)}`;
          await this.bytes.set(`cas:${t256}`, content);
          this.egress.push({
            at: this.nowValue,
            appId,
            operation: "share.cas.put",
          });
          return { t256, size: content.length };
        },
        get: (_appId, t256) => Promise.resolve(this.bytes.get(`cas:${t256}`)),
      },
    });
  }

  async grant(capability: MiniappCapability, at: number): Promise<void> {
    this.nowValue = at;
    await this.host.setGrants(
      this.appId,
      this.publisherPublicKey,
      [capability],
      [capability],
    );
  }

  async revoke(capability: MiniappCapability, at: number): Promise<void> {
    this.nowValue = at;
    await this.host.revokeGrant(
      this.appId,
      this.publisherPublicKey,
      capability,
    );
  }

  async execute(
    capability: MiniappCapability,
    at: number,
  ): Promise<ProductionCapabilityObservation> {
    this.nowValue = at;
    const operation = operationFor(capability);
    if (capability === "lxmf:send") {
      const to = (operation.payload as { to?: string } | undefined)?.to ?? "peer";
      this.host.grantEgressOffer({
        appId: this.appId,
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: to,
        ttlMs: 60_000,
      });
    }
    const manifest: LaunchManifest = {
      name: this.appId,
      version: "1.0.0",
      entry: "index.js",
      capabilities: [capability],
      publisherPublicKey: this.publisherPublicKey,
    };
    const response = await this.host.dispatchRaw(
      {
        id: `sim-${at}-${capability}`,
        namespace: operation.namespace,
        method: operation.method,
        capability,
        payload: operation.payload,
      },
      manifest,
      [capability],
    );
    const negative = await this.host.dispatchRaw(
      {
        id: `negative-${at}-${capability}`,
        namespace: operation.namespace,
        method: operation.method,
        capability,
        payload: operation.payload,
      },
      { ...manifest, capabilities: [] },
      [capability],
    );
    this.negativeControlRejected = !negative.ok;
    return this.snapshot(operation.handler, response);
  }

  async snapshot(
    handler: string,
    response: BrokerResponse,
  ): Promise<ProductionCapabilityObservation> {
    return {
      handler,
      response,
      publicGrant: await this.grants.get(this.appId, this.publisherPublicKey),
      authority: await this.grants.authority(
        this.appId,
        this.publisherPublicKey,
      ),
      storageKeys: await this.bytes.list(""),
      identityIds: [...this.identities].sort(),
      audit: [...this.audit],
      egress: [...this.egress],
      negativeControlRejected: this.negativeControlRejected,
    };
  }
}

type SimulatedOperation = {
  namespace: string;
  method: string;
  payload?: unknown;
  handler: string;
};

const SIMULATED_OPERATIONS: Partial<
  Record<MiniappCapability, () => SimulatedOperation>
> = {
  identity: () => ({
    namespace: "identity",
    method: "sign",
    payload: { payload: new Uint8Array([1]) },
    handler: "MiniappHost.identity.sign",
  }),
  presence: () => ({
    namespace: "presence",
    method: "snapshot",
    handler: "MiniappHost.presence.snapshot",
  }),
  "announce:publish": () => ({
    namespace: "announce",
    method: "publish",
    payload: { appData: new Uint8Array([1]) },
    handler: "MiniappHost.announce.publish",
  }),
  "announce:subscribe": () => ({
    namespace: "announce",
    method: "subscribe",
    payload: { namespace: "sim" },
    handler: "MiniappHost.announce.subscribe",
  }),
  "lxmf:send": () => ({
    namespace: "lxmf",
    method: "send",
    payload: { to: "peer", subject: "sim", body: "sim" },
    handler: "MiniappHost.lxmf.send",
  }),
  "lxmf:receive": () => ({
    namespace: "lxmf",
    method: "receive",
    handler: "MiniappHost.lxmf.receive",
  }),
  "storage:kv": () => ({
    namespace: "storage.kv",
    method: "set",
    payload: { key: "sim", value: new Uint8Array([1]) },
    handler: "MiniappHost.storage.kv.set",
  }),
  "resource:fetch": () => ({
    namespace: "resource",
    method: "fetch",
    payload: { resourceId: "sim", budgetBytes: 1 },
    handler: "MiniappHost.resource.fetch",
  }),
  workspace: () => ({
    namespace: "workspace",
    method: "write",
    payload: { path: "sim.txt", content: "sim" },
    handler: "MiniappHost.workspace.write",
  }),
  "share:cas": () => ({
    namespace: "share.cas",
    method: "put",
    payload: { content: "sim" },
    handler: "MiniappHost.share.cas.put",
  }),
};

function operationFor(capability: MiniappCapability): SimulatedOperation {
  const factory = SIMULATED_OPERATIONS[capability];
  if (factory === undefined) {
    throw new Error(
      `capability has no deterministic shipping adapter: ${capability}`,
    );
  }
  return factory();
}

class MemoryBackend implements GrantKeyValueStore, MiniappKvStoreBackend {
  private readonly values = new Map<string, Uint8Array>();
  get(key: string): Promise<Uint8Array | null> {
    return Promise.resolve(this.values.get(key)?.slice() ?? null);
  }
  set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value.slice());
    return Promise.resolve();
  }
  delete(key: string): Promise<void> {
    this.values.delete(key);
    return Promise.resolve();
  }
  list(prefix: string): Promise<readonly string[]> {
    return Promise.resolve(
      [...this.values.keys()].filter((key) => key.startsWith(prefix)).sort(),
    );
  }
}

const unusedSandbox: SandboxBackend = {
  name: "simulation-unused",
  spawn() {
    return Promise.reject(
      new Error("simulation adapter does not launch a sandbox"),
    );
  },
};

function hex(bytes: Uint8Array): string {
  return [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
