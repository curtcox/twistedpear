/**
 * Manifest capability entries for package format v1 (strings) and v2
 * (string or object). Closed-set id checks stay in miniapp-runtime.
 */

export const PACKAGE_FORMAT_MIN = 1;
export const PACKAGE_FORMAT_MAX = 2;

export const EGRESS_TARGET_KINDS = [
  "peer",
  "group",
  "namespace",
  "key-prefix",
  "cas-id",
  "address",
] as const;

export type ManifestEgressTargetKind = (typeof EGRESS_TARGET_KINDS)[number];

/** Capabilities that a later host policy may refuse to grant on format v1. */
export const SCOPED_SET_CAPABILITY_IDS = [
  "lxmf:send",
  "announce:publish",
  "announce:subscribe",
  "device:stream",
  "link:probe",
] as const;

export type ManifestCapabilityScope =
  | { readonly kind: "offer"; readonly targetKind: ManifestEgressTargetKind }
  | { readonly kind: "own-namespace" };

export interface ManifestCapabilityObject {
  readonly id: string;
  readonly scope?: ManifestCapabilityScope;
  readonly optional?: boolean;
}

export type ManifestCapabilityEntry = string | ManifestCapabilityObject;

export interface CapabilityDeclaration {
  readonly id: string;
  readonly scope: ManifestCapabilityScope | null;
  readonly optional: boolean;
}

export class CapabilityDeclarationError extends Error {
  constructor(
    readonly code:
      "INVALID_ENTRY" | "DUPLICATE_ID" | "UNKNOWN_SCOPE" | "V1_OBJECT",
    message: string,
  ) {
    super(message);
    this.name = "CapabilityDeclarationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseScope(value: unknown): ManifestCapabilityScope {
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new CapabilityDeclarationError(
      "UNKNOWN_SCOPE",
      "Capability scope must be an object with a kind",
    );
  }
  if (value.kind === "own-namespace") {
    return { kind: "own-namespace" };
  }
  if (value.kind === "offer") {
    if (
      typeof value.targetKind !== "string" ||
      !EGRESS_TARGET_KINDS.includes(
        value.targetKind as ManifestEgressTargetKind,
      )
    ) {
      throw new CapabilityDeclarationError(
        "UNKNOWN_SCOPE",
        `Unknown offer targetKind "${String(value.targetKind)}"`,
      );
    }
    return {
      kind: "offer",
      targetKind: value.targetKind as ManifestEgressTargetKind,
    };
  }
  throw new CapabilityDeclarationError(
    "UNKNOWN_SCOPE",
    `Unknown scope kind "${value.kind}"`,
  );
}

function parseObject(entry: Record<string, unknown>): CapabilityDeclaration {
  if (typeof entry.id !== "string" || entry.id.length === 0) {
    throw new CapabilityDeclarationError(
      "INVALID_ENTRY",
      "Capability object must have a non-empty id",
    );
  }
  if (entry.optional !== undefined && typeof entry.optional !== "boolean") {
    throw new CapabilityDeclarationError(
      "INVALID_ENTRY",
      `Capability "${entry.id}" optional must be a boolean`,
    );
  }
  return {
    id: entry.id,
    scope: entry.scope === undefined ? null : parseScope(entry.scope),
    optional: entry.optional === true,
  };
}

export function parseCapabilityDeclarations(
  entries: ReadonlyArray<unknown>,
  formatVersion = PACKAGE_FORMAT_MAX,
): CapabilityDeclaration[] {
  const declarations: CapabilityDeclaration[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    let parsed: CapabilityDeclaration;
    if (typeof entry === "string") {
      if (entry.length === 0) {
        throw new CapabilityDeclarationError(
          "INVALID_ENTRY",
          "Capability id must be non-empty",
        );
      }
      parsed = { id: entry, scope: null, optional: false };
    } else if (isRecord(entry)) {
      if (formatVersion < 2) {
        throw new CapabilityDeclarationError(
          "V1_OBJECT",
          "Object capability entries require formatVersion 2",
        );
      }
      parsed = parseObject(entry);
    } else {
      throw new CapabilityDeclarationError(
        "INVALID_ENTRY",
        "Capability entry must be a string or object",
      );
    }
    if (seen.has(parsed.id)) {
      throw new CapabilityDeclarationError(
        "DUPLICATE_ID",
        `Duplicate capability "${parsed.id}"`,
      );
    }
    seen.add(parsed.id);
    declarations.push(parsed);
  }

  return declarations;
}

export function capabilityDeclarationIds(
  declarations: ReadonlyArray<CapabilityDeclaration>,
): string[] {
  return declarations.map((entry) => entry.id);
}

export function capabilityScopeLabel(
  scope: ManifestCapabilityScope | null,
): string {
  if (scope === null) return "any destination the app names";
  if (scope.kind === "own-namespace") return "this app's own namespace";
  return `contacts you choose (${scope.targetKind})`;
}

/** True when every essential declaration is in the granted set. */
export function launchGrantsSatisfyDeclarations(
  declarations: ReadonlyArray<CapabilityDeclaration>,
  granted: ReadonlyArray<string>,
): boolean {
  const grantedSet = new Set(granted);
  return declarations.every(
    (entry) => entry.optional || grantedSet.has(entry.id),
  );
}

/**
 * Host policy lever: refuse a scoped-set capability on a v1 package.
 * Phase 3 ships this **off** (`refuseUnscopedFormatV1` defaults false).
 */
export function refuseUnscopedFormatV1Grant(options: {
  readonly formatVersion: number;
  readonly capabilityId: string;
  readonly refuseUnscopedFormatV1?: boolean;
}): boolean {
  if (options.refuseUnscopedFormatV1 !== true) return false;
  if (options.formatVersion !== 1) return false;
  return (SCOPED_SET_CAPABILITY_IDS as readonly string[]).includes(
    options.capabilityId,
  );
}
