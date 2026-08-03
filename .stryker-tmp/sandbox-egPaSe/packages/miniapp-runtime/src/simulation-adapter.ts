// @ts-nocheck
import { GrantStore, grantStoreKey, type GrantKeyValueStore, type GrantRecord, type MiniappCapability } from "./capabilities.js";
import { MiniappHost, type LaunchManifest } from "./host.js";
import type { BrokerAuditEntry, BrokerRequest, BrokerResponse } from "./broker.js";
import type { MiniappKvStoreBackend } from "./services/storage-kv.js";
import type { SandboxBackend } from "./sandbox/backend.js";

export interface ProductionCapabilityObservation {
  readonly handler: string;
  readonly response: BrokerResponse;
  readonly publicGrant: GrantRecord | null;
  readonly authority: Readonly<Record<string, import("@twistedpear/protocol").GrantLifecycleState>>;
  readonly storageKeys: readonly string[];
  readonly identityIds: readonly string[];
  readonly audit: readonly BrokerAuditEntry[];
  readonly egress: readonly { readonly at: number; readonly appId: string; readonly operation: string }[];
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
  private readonly egress: { at: number; appId: string; operation: string }[] = [];
  private nowValue = 0;
  private readonly host: MiniappHost;
  private negativeControlRejected = true;

  constructor(
    private readonly appId = "campaign-app",
    private readonly publisherPublicKey = "campaign-publisher",
    weakenBrokerCapabilityGate = false
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
        deriveDestinationHash: async (appId, publisher) => {
          const id = `${appId}:${publisher}:identity`;
          this.identities.add(id);
          return id;
        },
        sign: async (appId, publisher, payload) => {
          this.identities.add(`${appId}:${publisher}:identity`);
          this.egress.push({ at: this.nowValue, appId, operation: "identity.sign" });
          return new Uint8Array([0x53, ...payload]);
        }
      },
      presenceBackend: { snapshot: async () => ({ onlineInterfaces: 1, preferredInterface: "sim", peers: 1 }) },
      resourceBackend: { fetch: async (appId) => {
        this.egress.push({ at: this.nowValue, appId, operation: "resource.fetch" });
        return new Uint8Array([0x52]);
      } },
      casBackend: {
        put: async (appId, content) => {
          const t256 = `sim-${hex(content)}`;
          await this.bytes.set(`cas:${t256}`, content);
          this.egress.push({ at: this.nowValue, appId, operation: "share.cas.put" });
          return { t256, size: content.length };
        },
        get: async (_appId, t256) => this.bytes.get(`cas:${t256}`)
      }
    });
  }

  async grant(capability: MiniappCapability, at: number): Promise<void> {
    this.nowValue = at;
    await this.host.setGrants(this.appId, this.publisherPublicKey, [capability], [capability]);
  }

  async revoke(capability: MiniappCapability, at: number): Promise<void> {
    this.nowValue = at;
    await this.host.revokeGrant(this.appId, this.publisherPublicKey, capability);
  }

  async execute(capability: MiniappCapability, at: number): Promise<ProductionCapabilityObservation> {
    this.nowValue = at;
    const operation = operationFor(capability);
    const manifest: LaunchManifest = {
      name: this.appId, version: "1.0.0", entry: "index.js",
      capabilities: [capability], publisherPublicKey: this.publisherPublicKey
    };
    const response = await this.host.dispatchRaw({
      id: `sim-${at}-${capability}`,
      namespace: operation.namespace,
      method: operation.method,
      capability,
      payload: operation.payload
    }, manifest, [capability]);
    const negative = await this.host.dispatchRaw({
      id: `negative-${at}-${capability}`,
      namespace: operation.namespace,
      method: operation.method,
      capability,
      payload: operation.payload
    }, { ...manifest, capabilities: [] }, [capability]);
    this.negativeControlRejected = !negative.ok;
    return this.snapshot(operation.handler, response);
  }

  async snapshot(handler: string, response: BrokerResponse): Promise<ProductionCapabilityObservation> {
    return {
      handler,
      response,
      publicGrant: await this.grants.get(this.appId, this.publisherPublicKey),
      authority: await this.grants.authority(this.appId, this.publisherPublicKey),
      storageKeys: await this.bytes.list(""),
      identityIds: [...this.identities].sort(),
      audit: [...this.audit],
      egress: [...this.egress],
      negativeControlRejected: this.negativeControlRejected
    };
  }
}

function operationFor(capability: MiniappCapability): {
  namespace: string; method: string; payload?: unknown; handler: string;
} {
  switch (capability) {
    case "identity": return { namespace: "identity", method: "sign", payload: { payload: new Uint8Array([1]) }, handler: "MiniappHost.identity.sign" };
    case "presence": return { namespace: "presence", method: "snapshot", handler: "MiniappHost.presence.snapshot" };
    case "announce:publish": return { namespace: "announce", method: "publish", payload: { appData: new Uint8Array([1]) }, handler: "MiniappHost.announce.publish" };
    case "announce:subscribe": return { namespace: "announce", method: "subscribe", payload: { namespace: "sim" }, handler: "MiniappHost.announce.subscribe" };
    case "lxmf:send": return { namespace: "lxmf", method: "send", payload: { to: "peer", subject: "sim", body: "sim" }, handler: "MiniappHost.lxmf.send" };
    case "lxmf:receive": return { namespace: "lxmf", method: "receive", handler: "MiniappHost.lxmf.receive" };
    case "storage:kv": return { namespace: "storage.kv", method: "set", payload: { key: "sim", value: new Uint8Array([1]) }, handler: "MiniappHost.storage.kv.set" };
    case "resource:fetch": return { namespace: "resource", method: "fetch", payload: { resourceId: "sim", budgetBytes: 1 }, handler: "MiniappHost.resource.fetch" };
    case "workspace": return { namespace: "workspace", method: "write", payload: { path: "sim.txt", content: "sim" }, handler: "MiniappHost.workspace.write" };
    case "share:cas": return { namespace: "share.cas", method: "put", payload: { content: "sim" }, handler: "MiniappHost.share.cas.put" };
    default: throw new Error(`capability has no deterministic shipping adapter: ${capability}`);
  }
}

class MemoryBackend implements GrantKeyValueStore, MiniappKvStoreBackend {
  private readonly values = new Map<string, Uint8Array>();
  async get(key: string): Promise<Uint8Array | null> { return this.values.get(key)?.slice() ?? null; }
  async set(key: string, value: Uint8Array): Promise<void> { this.values.set(key, value.slice()); }
  async delete(key: string): Promise<void> { this.values.delete(key); }
  async list(prefix: string): Promise<readonly string[]> { return [...this.values.keys()].filter((key) => key.startsWith(prefix)).sort(); }
}

const unusedSandbox: SandboxBackend = {
  name: "simulation-unused",
  async spawn() { throw new Error("simulation adapter does not launch a sandbox"); }
};

function hex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}
