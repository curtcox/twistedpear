export type MiniappCapability =
  | "identity"
  | "presence"
  | "announce:subscribe"
  | "announce:publish"
  | "lxmf:send"
  | "lxmf:receive"
  | "storage:kv"
  | "storage:hyperbee"
  | "resource:fetch";

export interface CapabilityDefinition {
  readonly id: MiniappCapability;
  readonly description: string;
}

export const CAPABILITY_DEFINITIONS: ReadonlyArray<CapabilityDefinition> = [
  { id: "identity", description: "Use an app-scoped identity for signing and addressing." },
  { id: "presence", description: "Read coarse peer and interface presence." },
  { id: "announce:subscribe", description: "Receive announces in the app namespace." },
  { id: "announce:publish", description: "Publish the app destination." },
  { id: "lxmf:send", description: "Send LXMF messages from the app destination." },
  { id: "lxmf:receive", description: "Receive LXMF messages for the app destination." },
  { id: "storage:kv", description: "Store local key/value data for this app." },
  { id: "storage:hyperbee", description: "Store ordered local Hyperbee data for this app." },
  { id: "resource:fetch", description: "Fetch package resources through host budget rules." }
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
  return `miniapp-grants:${publisherPublicKey}:${appId}`;
}

export class GrantStore {
  constructor(private readonly store: GrantKeyValueStore) {}

  async get(appId: string, publisherPublicKey: string): Promise<GrantRecord | null> {
    const raw = await this.store.get(grantStoreKey(appId, publisherPublicKey));
    if (raw === null) {
      return null;
    }

    const parsed = JSON.parse(new TextDecoder().decode(raw)) as GrantRecord;
    return {
      appId: parsed.appId,
      publisherPublicKey: parsed.publisherPublicKey,
      granted: validateManifestCapabilities(parsed.granted),
      updatedAt: parsed.updatedAt
    };
  }

  async set(
    appId: string,
    publisherPublicKey: string,
    declared: ReadonlyArray<string>,
    requestedGrants: ReadonlyArray<string>,
    now = Date.now()
  ): Promise<GrantRecord> {
    const declaredCapabilities = new Set(validateManifestCapabilities(declared));
    const granted = validateManifestCapabilities(requestedGrants);

    for (const capability of granted) {
      if (!declaredCapabilities.has(capability)) {
        throw new CapabilityError(
          "UNDECLARED_CAPABILITY",
          `Capability "${capability}" was not declared by the signed manifest.`,
          capability
        );
      }
    }

    const record: GrantRecord = {
      appId,
      publisherPublicKey,
      granted,
      updatedAt: now
    };
    await this.store.set(grantStoreKey(appId, publisherPublicKey), new TextEncoder().encode(JSON.stringify(record)));
    return record;
  }

  async revoke(appId: string, publisherPublicKey: string, capability: MiniappCapability, now = Date.now()): Promise<GrantRecord | null> {
    const existing = await this.get(appId, publisherPublicKey);
    if (existing === null) {
      return null;
    }

    const record: GrantRecord = {
      ...existing,
      granted: existing.granted.filter((entry) => entry !== capability),
      updatedAt: now
    };
    await this.store.set(grantStoreKey(appId, publisherPublicKey), new TextEncoder().encode(JSON.stringify(record)));
    return record;
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
