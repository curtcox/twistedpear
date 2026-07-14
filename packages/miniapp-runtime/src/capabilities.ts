import type { Event } from "@twistedpear/effects";
import {
  grantRecordFromActions,
  grantStoreKey as protocolGrantStoreKey,
  initialDecodeGrantRecordState,
  initialGrantHostState,
  shouldRejectDecodeGrantRecord,
  shouldUseDecodeGrantRecord,
  stepDecodeGrantRecordWithActions,
  stepGrantHost,
  type GrantEvent
} from "@twistedpear/protocol";

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
  | "apps:package"
  | "apps:publish"
  | "apps:install"
  | "apps:preview"
  | "share:cas";

export interface CapabilityDefinition {
  readonly id: MiniappCapability;
  readonly description: string;
}

export const CAPABILITY_DEFINITIONS: ReadonlyArray<CapabilityDefinition> = [
  { id: "identity", description: "Use an app-scoped identity for signing and addressing." },
  { id: "presence", description: "Read coarse peer/interface presence and host info." },
  { id: "announce:subscribe", description: "Receive announces in the app namespace." },
  { id: "announce:publish", description: "Publish the app destination." },
  { id: "lxmf:send", description: "Send LXMF messages from the app destination." },
  { id: "lxmf:receive", description: "Receive LXMF messages for the app destination." },
  { id: "storage:kv", description: "Store local key/value data for this app." },
  { id: "storage:hyperbee", description: "Store ordered local Hyperbee data for this app." },
  { id: "resource:fetch", description: "Fetch package resources through host budget rules." },
  { id: "workspace", description: "Read and write project source files in this app's private workspace." },
  { id: "ai:chat", description: "Send prompts to the host-configured AI service; prompts may include workspace content." },
  { id: "apps:package", description: "Package and sign apps under this device's publisher identity (asks each time)." },
  { id: "apps:publish", description: "Publish signed apps so other users can find and install them (asks each time)." },
  { id: "apps:install", description: "Ask the host to install apps from a 256t id (asks each time, with capability review)." },
  { id: "apps:preview", description: "Run a built app in the host's sandboxed dev-preview slot." },
  { id: "share:cas", description: "Store and retrieve bounded content-addressed data shared by 256t id." }
];

const CAPABILITY_IDS = new Set<string>(CAPABILITY_DEFINITIONS.map((definition) => definition.id));

export class CapabilityError extends Error {
  constructor(
    readonly code: "UNKNOWN_CAPABILITY" | "UNDECLARED_CAPABILITY" | "CAPABILITY_DENIED",
    message: string,
    readonly capability: string
  ) {
    super(message);
    this.name = "CapabilityError";
  }
}

export function isMiniappCapability(value: string): value is MiniappCapability {
  return CAPABILITY_IDS.has(value);
}

export function validateManifestCapabilities(capabilities: ReadonlyArray<string>): MiniappCapability[] {
  const validated: MiniappCapability[] = [];
  const seen = new Set<string>();

  for (const capability of capabilities) {
    if (!isMiniappCapability(capability)) {
      throw new CapabilityError(
        "UNKNOWN_CAPABILITY",
        `Unknown capability "${capability}". Update minHostApi if this app targets a newer host API.`,
        capability
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
  const definition = CAPABILITY_DEFINITIONS.find((entry) => entry.id === capability);
  return definition?.description ?? capability;
}

export interface GrantRecord {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly granted: ReadonlyArray<MiniappCapability>;
  readonly updatedAt: number;
}

export interface GrantKeyValueStore {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}

export function grantStoreKey(appId: string, publisherPublicKey: string): string {
  return protocolGrantStoreKey(appId, publisherPublicKey);
}

function throwGrantError(message: string, capability: string): never {
  throw new CapabilityError(
    "UNDECLARED_CAPABILITY",
    message.includes("undeclared")
      ? `Capability "${capability}" was not declared by the signed manifest.`
      : message,
    capability
  );
}

async function applyGrantStep(
  store: GrantKeyValueStore,
  state: ReturnType<typeof initialGrantHostState>,
  event: GrantEvent
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

export class GrantStore {
  constructor(private readonly store: GrantKeyValueStore) {}

  async get(appId: string, publisherPublicKey: string): Promise<GrantRecord | null> {
    const raw = await this.store.get(grantStoreKey(appId, publisherPublicKey));
    if (raw === null) {
      return null;
    }

    const decodeStepped = stepDecodeGrantRecordWithActions(initialDecodeGrantRecordState(), {
      kind: "grant/decode-gate",
      bytes: raw
    });
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
      updatedAt: parsed.updatedAt
    };
  }

  async set(
    appId: string,
    publisherPublicKey: string,
    declared: ReadonlyArray<string>,
    requestedGrants: ReadonlyArray<string>,
    now: number
  ): Promise<GrantRecord> {
    const declaredCapabilities = validateManifestCapabilities(declared);
    const requested = validateManifestCapabilities(requestedGrants);
    const state = await applyGrantStep(this.store, initialGrantHostState(appId, publisherPublicKey), {
      kind: "grant/set",
      at: now,
      declared: declaredCapabilities,
      requested
    } as GrantEvent);

    if (state.record === null) {
      throw new Error("grant set did not produce a record");
    }

    return {
      appId: state.record.appId,
      publisherPublicKey: state.record.publisherPublicKey,
      granted: validateManifestCapabilities([...state.record.granted]),
      updatedAt: state.record.updatedAt
    };
  }

  async revoke(appId: string, publisherPublicKey: string, capability: MiniappCapability, now: number): Promise<GrantRecord | null> {
    const existing = await this.get(appId, publisherPublicKey);
    if (existing === null) {
      return null;
    }

    const state = await applyGrantStep(
      this.store,
      {
        ...initialGrantHostState(appId, publisherPublicKey),
        record: {
          appId: existing.appId,
          publisherPublicKey: existing.publisherPublicKey,
          granted: existing.granted,
          updatedAt: existing.updatedAt
        },
        lastError: null
      },
      { kind: "grant/revoke", at: now, capability } as GrantEvent
    );

    if (state.record === null) {
      return null;
    }

    return {
      appId: state.record.appId,
      publisherPublicKey: state.record.publisherPublicKey,
      granted: validateManifestCapabilities([...state.record.granted]),
      updatedAt: state.record.updatedAt
    };
  }

  async delete(appId: string, publisherPublicKey: string): Promise<void> {
    await this.store.delete(grantStoreKey(appId, publisherPublicKey));
  }
}

export function assertCapabilityAllowed(options: {
  readonly capability: string;
  readonly declared: ReadonlyArray<string>;
  readonly granted: ReadonlyArray<string>;
}): MiniappCapability {
  const capabilities = validateManifestCapabilities([options.capability]);
  const capability = capabilities[0];
  if (capability === undefined) {
    throw new CapabilityError("UNKNOWN_CAPABILITY", `Unknown capability "${options.capability}".`, options.capability);
  }
  const declared = new Set(validateManifestCapabilities(options.declared));
  if (!declared.has(capability)) {
    throw new CapabilityError(
      "UNDECLARED_CAPABILITY",
      `Capability "${capability}" was not declared by the signed manifest.`,
      capability
    );
  }

  const granted = new Set(validateManifestCapabilities(options.granted));
  if (!granted.has(capability)) {
    throw new CapabilityError("CAPABILITY_DENIED", `Capability "${capability}" has not been granted.`, capability);
  }

  return capability;
}
