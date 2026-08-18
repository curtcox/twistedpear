import type { Event } from "@twistedpear/effects";
import {
  grantRecordFromActions,
  grantStoreKey as protocolGrantStoreKey,
  initialDecodeGrantRecordState,
  initialGrantHostState,
  riskClassForCapability,
  shouldRejectDecodeGrantRecord,
  shouldUseDecodeGrantRecord,
  stepDecodeGrantRecordWithActions,
  stepGrantHost,
  type CapabilityRiskClass,
  type GrantEvent,
  type GrantHostState,
  type GrantLifecycleState,
} from "@twistedpear/protocol";
import {
  DEVICE_CAPABILITY_DEFINITIONS,
  type DeviceCapability,
} from "./device-capabilities.gen.js";

export type MiniappCapability =
  | "identity"
  | "presence"
  | "announce:subscribe"
  | "announce:publish"
  | "lxmf:send"
  | "lxmf:receive"
  | "storage:kv"
  | "storage:hyperbee"
  | "resource:fetch"
  | "workspace"
  | "ai:chat"
  | "ai:embed"
  | "apps:package"
  | "apps:publish"
  | "apps:install"
  | "apps:preview"
  | "apps:channel"
  | "share:cas"
  | "peer:connect"
  | "link:observe"
  | "link:probe"
  | "relay:configure"
  | "relay:read"
  | "freenet:contract"
  | DeviceCapability;

export interface CapabilityDefinition {
  readonly id: MiniappCapability;
  readonly description: string;
  readonly riskClass: CapabilityRiskClass;
}

type CapabilityDefinitionBase = Omit<CapabilityDefinition, "riskClass">;

const CORE_CAPABILITY_DEFINITIONS: ReadonlyArray<CapabilityDefinitionBase> = [
  {
    id: "identity",
    description: "Use an app-scoped identity for signing and addressing.",
  },
  {
    id: "presence",
    description: "Read coarse peer/interface presence and host info.",
  },
  {
    id: "announce:subscribe",
    description: "Receive announces in this app's own namespace only.",
  },
  {
    id: "announce:publish",
    description: "Publish this app's own destination, not another app's.",
  },
  {
    id: "lxmf:send",
    description:
      "Send LXMF messages to contacts you choose in the host, from the app destination.",
  },
  {
    id: "lxmf:receive",
    description: "Receive LXMF messages for the app destination.",
  },
  { id: "storage:kv", description: "Store local key/value data for this app." },
  {
    id: "storage:hyperbee",
    description: "Store ordered local Hyperbee data for this app.",
  },
  {
    id: "resource:fetch",
    description: "Fetch package resources through host budget rules.",
  },
  {
    id: "workspace",
    description:
      "Read and write project source files in this app's private workspace.",
  },
  {
    id: "ai:chat",
    description:
      "Send prompts to the host-configured AI service; prompts may include workspace content.",
  },
  {
    id: "ai:embed",
    description:
      "Send bounded text to the host-configured embedding model and rank vectors locally.",
  },
  {
    id: "apps:package",
    description:
      "Package and sign apps under this device's publisher identity (asks each time).",
  },
  {
    id: "apps:publish",
    description:
      "Publish signed apps so other users can find and install them (asks each time).",
  },
  {
    id: "apps:install",
    description:
      "Ask the host to install apps from a 256t id (asks each time, with capability review).",
  },
  {
    id: "apps:preview",
    description: "Run a built app in the host's sandboxed dev-preview slot.",
  },
  {
    id: "apps:channel",
    description:
      "Send and receive messages with another running mini-app named when you grant this.",
  },
  {
    id: "share:cas",
    description:
      "Store and retrieve bounded content-addressed data shared by 256t id.",
  },
  {
    id: "peer:connect",
    description:
      "Ask trusted host chrome to find, confirm, and connect an app-scoped peer.",
  },
  {
    id: "link:observe",
    description:
      "See which peers are reachable and how good the connection to each is.",
  },
  {
    id: "link:probe",
    description:
      "Send a small test transmission to a host-offered peer (uses airtime and battery).",
  },
  {
    id: "relay:configure",
    description:
      "Turn this device's radios, camera, microphone, speaker, and internet-push relaying on or off, and forward other people's traffic. This grant permits changes without another prompt.",
  },
  {
    id: "relay:read",
    description: "Read host relay mode, interface status, and diagnostics.",
  },
  {
    id: "freenet:contract",
    description:
      "Read and publish Freenet contract state. Updates are published to a global network and cannot be recalled (asks each time for put/update).",
  },
];

export const CAPABILITY_DEFINITIONS: ReadonlyArray<CapabilityDefinition> = [
  ...CORE_CAPABILITY_DEFINITIONS,
  ...DEVICE_CAPABILITY_DEFINITIONS.map((entry) => ({
    id: entry.id as MiniappCapability,
    description: entry.description,
  })),
].map((definition) => ({
  ...definition,
  riskClass: riskClassForCapability(definition.id),
}));

const CAPABILITY_IDS = new Set<string>(
  CAPABILITY_DEFINITIONS.map((definition) => definition.id),
);

export class CapabilityError extends Error {
  constructor(
    readonly code:
      "UNKNOWN_CAPABILITY" | "UNDECLARED_CAPABILITY" | "CAPABILITY_DENIED",
    message: string,
    readonly capability: string,
  ) {
    super(message);
    this.name = "CapabilityError";
  }
}

export function isMiniappCapability(value: string): value is MiniappCapability {
  return CAPABILITY_IDS.has(value);
}

export function validateManifestCapabilities(
  capabilities: ReadonlyArray<string | { readonly id: string }>,
): MiniappCapability[] {
  const validated: MiniappCapability[] = [];
  const seen = new Set<string>();

  for (const entry of capabilities) {
    const capability = typeof entry === "string" ? entry : entry.id;
    if (!isMiniappCapability(capability)) {
      throw new CapabilityError(
        "UNKNOWN_CAPABILITY",
        `Unknown capability "${capability}". Update minHostApi if this app targets a newer host API.`,
        capability,
      );
    }

    if (!seen.has(capability)) {
      seen.add(capability);
      validated.push(capability);
    }
  }

  return validated;
}

export function describeCapability(capability: MiniappCapability): string {
  const definition = CAPABILITY_DEFINITIONS.find(
    (entry) => entry.id === capability,
  );
  return definition?.description ?? capability;
}

export interface GrantRecord {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly granted: ReadonlyArray<MiniappCapability>;
  readonly updatedAt: number;
}

export interface GrantSetOptions {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly declared: ReadonlyArray<string | { readonly id: string }>;
  readonly requestedGrants: ReadonlyArray<string>;
  readonly now: number;
  readonly ttlMs: number;
}

export interface GrantKeyValueStore {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}

export function grantStoreKey(
  appId: string,
  publisherPublicKey: string,
): string {
  return protocolGrantStoreKey(appId, publisherPublicKey);
}

function throwGrantError(message: string, capability: string): never {
  throw new CapabilityError(
    "UNDECLARED_CAPABILITY",
    message.includes("undeclared")
      ? `Capability "${capability}" was not declared by the signed manifest.`
      : message,
    capability,
  );
}

async function applyGrantStep(
  store: GrantKeyValueStore,
  state: ReturnType<typeof initialGrantHostState>,
  event: GrantEvent,
): Promise<ReturnType<typeof initialGrantHostState>> {
  const result = stepGrantHost(state, event as unknown as Event);
  if (result.state.lastError !== null) {
    const match = /undeclared capability: (.+)/.exec(result.state.lastError);
    throwGrantError(result.state.lastError, match?.[1] ?? "unknown");
  }

  for (const intent of result.intents) {
    if (intent.kind === "store/write") {
      await store.set(intent.write.key, intent.write.value);
    }
  }

  return result.state;
}

interface PersistedGrantAuthority {
  readonly version: 1;
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly lifecycles: Readonly<Record<string, GrantLifecycleState>>;
}

function authorityStoreKey(appId: string, publisherPublicKey: string): string {
  return `${grantStoreKey(appId, publisherPublicKey)}:authority:v1`;
}

function encodeAuthority(state: GrantHostState): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      version: 1,
      appId: state.appId,
      publisherPublicKey: state.publisherPublicKey,
      lifecycles: state.lifecycles ?? {},
    } satisfies PersistedGrantAuthority),
  );
}

function decodeAuthority(
  raw: Uint8Array | null,
  appId: string,
  publisherPublicKey: string,
): Readonly<Record<string, GrantLifecycleState>> {
  if (raw === null) return {};
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  } catch {
    throw new Error("invalid persisted grant authority");
  }
  if (typeof value !== "object" || value === null)
    throw new Error("invalid persisted grant authority");
  const authority = value as Partial<PersistedGrantAuthority>;
  if (!isPersistedAuthority(authority, appId, publisherPublicKey)) {
    throw new Error("invalid persisted grant authority");
  }
  for (const lifecycle of Object.values(authority.lifecycles)) {
    if (!isGrantLifecycle(lifecycle)) {
      throw new Error("invalid persisted grant authority");
    }
  }
  return authority.lifecycles;
}

function isPersistedAuthority(
  authority: Partial<PersistedGrantAuthority>,
  appId: string,
  publisherPublicKey: string,
): authority is PersistedGrantAuthority {
  const lifecycles: unknown = authority.lifecycles;
  return (
    authority.version === 1 &&
    authority.appId === appId &&
    authority.publisherPublicKey === publisherPublicKey &&
    typeof lifecycles === "object" &&
    lifecycles !== null
  );
}

function isOptionalSafeInteger(value: number | null): boolean {
  return value === null || Number.isSafeInteger(value);
}

function isGrantLifecycle(lifecycle: GrantLifecycleState): boolean {
  const raw: unknown = lifecycle;
  if (typeof raw !== "object" || raw === null) {
    return false;
  }
  const record = raw as GrantLifecycleState;
  return (
    ["requested", "granted", "active", "denied", "expired", "revoked"].includes(
      record.phase,
    ) &&
    Number.isSafeInteger(record.requestedAt) &&
    isOptionalSafeInteger(record.expiresAt) &&
    isOptionalSafeInteger(record.firstUsedAt) &&
    isOptionalSafeInteger(record.revokedAt)
  );
}

export class GrantStore {
  constructor(private readonly store: GrantKeyValueStore) {}

  private async loadState(
    appId: string,
    publisherPublicKey: string,
  ): Promise<GrantHostState> {
    const key = grantStoreKey(appId, publisherPublicKey);
    const [recordRaw, authorityRaw] = await Promise.all([
      this.store.get(key),
      this.store.get(authorityStoreKey(appId, publisherPublicKey)),
    ]);
    let state = initialGrantHostState(appId, publisherPublicKey);
    if (recordRaw !== null) {
      state = stepGrantHost(state, {
        kind: "store/value",
        key,
        value: recordRaw,
      }).state;
      if (state.lastError !== null) throw new Error(state.lastError);
    }
    const persisted = decodeAuthority(authorityRaw, appId, publisherPublicKey);
    return Object.keys(persisted).length === 0
      ? state
      : { ...state, lifecycles: persisted };
  }

  private async persistAuthority(state: GrantHostState): Promise<void> {
    await this.store.set(
      authorityStoreKey(state.appId, state.publisherPublicKey),
      encodeAuthority(state),
    );
  }

  async get(
    appId: string,
    publisherPublicKey: string,
  ): Promise<GrantRecord | null> {
    const raw = await this.store.get(grantStoreKey(appId, publisherPublicKey));
    if (raw === null) {
      return null;
    }

    const decodeStepped = stepDecodeGrantRecordWithActions(
      initialDecodeGrantRecordState(),
      {
        kind: "grant/decode-gate",
        bytes: raw,
      },
    );
    if (
      shouldRejectDecodeGrantRecord(decodeStepped.actions) ||
      !shouldUseDecodeGrantRecord(decodeStepped.actions)
    ) {
      throw new Error("invalid grant record");
    }
    const parsed = grantRecordFromActions(decodeStepped.actions);
    if (parsed === null) {
      throw new Error("invalid grant record");
    }
    return {
      appId: parsed.appId,
      publisherPublicKey: parsed.publisherPublicKey,
      granted: validateManifestCapabilities([...parsed.granted]),
      updatedAt: parsed.updatedAt,
    };
  }

  /** Read persisted lifecycle authority without deriving it from the public grant record. */
  async authority(
    appId: string,
    publisherPublicKey: string,
  ): Promise<Readonly<Record<string, GrantLifecycleState>>> {
    return (await this.loadState(appId, publisherPublicKey)).lifecycles ?? {};
  }

  async set(options: GrantSetOptions): Promise<GrantRecord> {
    const { appId, publisherPublicKey, declared, requestedGrants, now, ttlMs } =
      options;
    const declaredCapabilities = validateManifestCapabilities(declared);
    const requested = validateManifestCapabilities(requestedGrants);
    const before = await this.loadState(appId, publisherPublicKey);
    const terminal = requested.find((capability) => {
      const phase = before.lifecycles?.[capability]?.phase;
      return phase === "denied" || phase === "expired" || phase === "revoked";
    });
    if (terminal !== undefined) {
      throw new CapabilityError(
        "CAPABILITY_DENIED",
        "Terminal grant authority cannot be revived by set.",
        terminal,
      );
    }
    const state = await applyGrantStep(this.store, before, {
      kind: "grant/set",
      at: now,
      declared: declaredCapabilities,
      requested,
      ttlMs,
    } as GrantEvent);

    await this.persistAuthority(state);

    if (state.record === null) {
      throw new CapabilityError(
        "CAPABILITY_DENIED",
        "Terminal grant authority cannot be revived by set.",
        requested[0] ?? "unknown",
      );
    }

    return {
      appId: state.record.appId,
      publisherPublicKey: state.record.publisherPublicKey,
      granted: validateManifestCapabilities([...state.record.granted]),
      updatedAt: state.record.updatedAt,
    };
  }

  async revoke(
    appId: string,
    publisherPublicKey: string,
    capability: MiniappCapability,
    now: number,
  ): Promise<GrantRecord | null> {
    const before = await this.loadState(appId, publisherPublicKey);
    if (before.record === null) {
      return null;
    }

    const state = await applyGrantStep(this.store, before, {
      kind: "grant/revoke",
      at: now,
      capability,
    } as GrantEvent);
    await this.persistAuthority(state);

    if (state.record === null) {
      return null;
    }

    return {
      appId: state.record.appId,
      publisherPublicKey: state.record.publisherPublicKey,
      granted: validateManifestCapabilities([...state.record.granted]),
      updatedAt: state.record.updatedAt,
    };
  }

  async deny(
    appId: string,
    publisherPublicKey: string,
    capability: MiniappCapability,
    now: number,
  ): Promise<void> {
    const state = await applyGrantStep(
      this.store,
      await this.loadState(appId, publisherPublicKey),
      { kind: "grant/deny", at: now, capability } as GrantEvent,
    );
    await this.persistAuthority(state);
  }

  async use(
    appId: string,
    publisherPublicKey: string,
    capability: MiniappCapability,
    now: number,
  ): Promise<GrantRecord | null> {
    let state = await this.loadState(appId, publisherPublicKey);
    state = await applyGrantStep(this.store, state, {
      kind: "grant/ttl",
      at: now,
      capability,
    } as GrantEvent);
    state = await applyGrantStep(this.store, state, {
      kind: "grant/first-use",
      at: now,
      capability,
    } as GrantEvent);
    await this.persistAuthority(state);
    if (state.record === null) return null;
    return {
      appId: state.record.appId,
      publisherPublicKey: state.record.publisherPublicKey,
      granted: validateManifestCapabilities([...state.record.granted]),
      updatedAt: state.record.updatedAt,
    };
  }

  async delete(
    appId: string,
    publisherPublicKey: string,
    now = 0,
  ): Promise<void> {
    const existing = await this.get(appId, publisherPublicKey);
    if (existing === null) {
      await this.store.delete(grantStoreKey(appId, publisherPublicKey));
      return;
    }
    await this.set({
      appId,
      publisherPublicKey,
      declared: existing.granted,
      requestedGrants: [],
      now,
      ttlMs: 1,
    });
  }
}

export function assertCapabilityAllowed(options: {
  readonly capability: string;
  readonly declared: ReadonlyArray<string | { readonly id: string }>;
  readonly granted: ReadonlyArray<string>;
}): MiniappCapability {
  const capabilities = validateManifestCapabilities([options.capability]);
  const capability = capabilities[0];
  if (capability === undefined) {
    throw new CapabilityError(
      "UNKNOWN_CAPABILITY",
      `Unknown capability "${options.capability}".`,
      options.capability,
    );
  }
  const declared = new Set(validateManifestCapabilities(options.declared));
  if (!declared.has(capability)) {
    throw new CapabilityError(
      "UNDECLARED_CAPABILITY",
      `Capability "${capability}" was not declared by the signed manifest.`,
      capability,
    );
  }

  const granted = new Set(validateManifestCapabilities(options.granted));
  if (!granted.has(capability)) {
    throw new CapabilityError(
      "CAPABILITY_DENIED",
      `Capability "${capability}" has not been granted.`,
      capability,
    );
  }

  return capability;
}
