import {
  DESTINATION_IDENTITY_HASH_BYTES,
  DestinationDirectionCode,
  DestinationTypeCode,
  destinationHashMaterialRawFromActions,
  destinationNameHashMaterialRawFromActions,
  expandedDestinationNameFromActions,
  initialDestinationConstructionState,
  initialDestinationHashMaterialState,
  initialDestinationIdentityHashState,
  initialDestinationNameHashMaterialState,
  initialExpandDestinationNameState,
  initialTruncateHashBytesState,
  initialValidateDestinationNamePartState,
  shouldMissDestinationIdentityHash,
  shouldProceedDestinationConstruction,
  shouldProceedValidateDestinationNamePart,
  shouldRejectDestinationConstructionBadDirection,
  shouldRejectDestinationConstructionBadIdentityBinding,
  shouldRejectDestinationConstructionBadType,
  shouldRejectDestinationNameHashMaterial,
  shouldRejectExpandDestinationName,
  shouldRejectLengthDestinationIdentityHash,
  shouldRejectTruncateHashBytes,
  shouldRejectValidateDestinationNamePart,
  shouldUseBytesDestinationIdentityHash,
  shouldUseDestinationHashMaterial,
  shouldUseDestinationNameHashMaterial,
  shouldUseExpandDestinationName,
  shouldUseObjectDestinationIdentityHash,
  shouldUseTruncateHashBytes,
  stepDestinationConstructionWithActions,
  stepDestinationHashMaterialWithActions,
  stepDestinationIdentityHashWithActions,
  stepDestinationNameHashMaterialWithActions,
  stepExpandDestinationNameWithActions,
  stepTruncateHashBytesWithActions,
  stepValidateDestinationNamePartWithActions,
  truncateHashBytesRawFromActions,
  NAME_HASH_BYTES,
  TRUNCATED_HASH_BYTES,
} from "@twistedpear/protocol";
import { bytesToHex } from "./crypto/bytes.js";
import type { CryptoProvider } from "./crypto/provider.js";
import { Identity } from "./identity.js";

/** Mirrors RNS/Destination.py destination types and hash derivation. */
export const DestinationType = DestinationTypeCode;

export type DestinationTypeValue =
  (typeof DestinationType)[keyof typeof DestinationType];

export const DestinationDirection = DestinationDirectionCode;

export type DestinationDirectionValue =
  (typeof DestinationDirection)[keyof typeof DestinationDirection];

export interface DestinationOptions {
  readonly identity?: Identity | Uint8Array | null;
  readonly direction: DestinationDirectionValue;
  readonly type: DestinationTypeValue;
  readonly appName: string;
  readonly aspects?: ReadonlyArray<string>;
}

export class Destination {
  readonly identity: Identity | null;
  readonly direction: DestinationDirectionValue;
  readonly type: DestinationTypeValue;
  readonly appName: string;
  readonly aspects: ReadonlyArray<string>;
  readonly name: string;
  readonly nameHash: Uint8Array;
  readonly hash: Uint8Array;
  readonly hexhash: string;

  constructor(
    private readonly provider: CryptoProvider,
    options: DestinationOptions,
  ) {
    assertValidDestinationNamePart(options.appName, "app name");
    for (const aspect of options.aspects ?? []) {
      assertValidDestinationNamePart(aspect, "aspect");
    }

    this.direction = options.direction;
    this.type = options.type;
    this.appName = options.appName;
    this.aspects = [...(options.aspects ?? [])];

    const gate = stepDestinationConstructionWithActions(
      initialDestinationConstructionState(),
      {
        kind: "destination/construction-gate",
        direction: this.direction,
        type: this.type,
        identityPresent: options.identity != null,
      },
    );
    if (shouldRejectDestinationConstructionBadDirection(gate.actions)) {
      throw new Error(`Unknown destination direction: ${this.direction}`);
    }
    if (shouldRejectDestinationConstructionBadType(gate.actions)) {
      throw new Error(`Unknown destination type: ${this.type}`);
    }
    if (shouldRejectDestinationConstructionBadIdentityBinding(gate.actions)) {
      throw new Error(
        this.type === DestinationType.PLAIN
          ? "PLAIN destinations cannot hold an identity"
          : "Non-PLAIN destinations require identity material",
      );
    }
    if (!shouldProceedDestinationConstruction(gate.actions)) {
      throw new Error("Destination construction rejected");
    }

    this.identity =
      options.identity instanceof Identity ? options.identity : null;
    const identityHash = identityHashBytes(options.identity);
    this.name = Destination.expandName(
      identityHash,
      this.appName,
      ...this.aspects,
    );
    this.nameHash = Destination.nameHash(
      this.provider,
      this.appName,
      ...this.aspects,
    );
    this.hash = Destination.hash(
      this.provider,
      identityHash,
      this.appName,
      ...this.aspects,
    );
    this.hexhash = bytesToHex(this.hash);
  }

  static expandName(
    identityHash: Uint8Array | null,
    appName: string,
    ...aspects: ReadonlyArray<string>
  ): string {
    const stepped = stepExpandDestinationNameWithActions(
      initialExpandDestinationNameState(),
      {
        kind: "destination/expand-name-gate",
        identityHash,
        appName,
        aspects,
      },
    );
    const name = expandedDestinationNameFromActions(stepped.actions);
    if (
      shouldRejectExpandDestinationName(stepped.actions) ||
      !shouldUseExpandDestinationName(stepped.actions) ||
      name === null
    ) {
      throw new Error("Destination name expansion rejected");
    }
    return name;
  }

  static nameHash(
    provider: CryptoProvider,
    appName: string,
    ...aspects: ReadonlyArray<string>
  ): Uint8Array {
    const materialStepped = stepDestinationNameHashMaterialWithActions(
      initialDestinationNameHashMaterialState(),
      {
        kind: "destination/name-hash-material-gate",
        appName,
        aspects,
      },
    );
    const material = destinationNameHashMaterialRawFromActions(
      materialStepped.actions,
    );
    if (
      shouldRejectDestinationNameHashMaterial(materialStepped.actions) ||
      !shouldUseDestinationNameHashMaterial(materialStepped.actions) ||
      material === null
    ) {
      throw new Error("Destination name-hash material rejected");
    }
    const stepped = stepTruncateHashBytesWithActions(
      initialTruncateHashBytesState(),
      {
        kind: "hash-truncate/truncate-gate",
        digest: Identity.fullHash(provider, material),
        length: NAME_HASH_BYTES,
      },
    );
    const raw = truncateHashBytesRawFromActions(stepped.actions);
    if (
      shouldRejectTruncateHashBytes(stepped.actions) ||
      !shouldUseTruncateHashBytes(stepped.actions) ||
      raw === null
    ) {
      throw new Error(`digest must be at least ${NAME_HASH_BYTES} bytes`);
    }
    return raw;
  }

  static hash(
    provider: CryptoProvider,
    identity: Identity | Uint8Array | null,
    appName: string,
    ...aspects: ReadonlyArray<string>
  ): Uint8Array {
    const nameHash = Destination.nameHash(provider, appName, ...aspects);
    const identityHash = identityHashBytes(identity);
    const materialStepped = stepDestinationHashMaterialWithActions(
      initialDestinationHashMaterialState(),
      {
        kind: "destination/hash-material-gate",
        nameHash,
        identityHash,
      },
    );
    const material = destinationHashMaterialRawFromActions(
      materialStepped.actions,
    );
    if (
      !shouldUseDestinationHashMaterial(materialStepped.actions) ||
      material === null
    ) {
      throw new Error("Destination hash material rejected");
    }
    const stepped = stepTruncateHashBytesWithActions(
      initialTruncateHashBytesState(),
      {
        kind: "hash-truncate/truncate-gate",
        digest: Identity.fullHash(provider, material),
        length: TRUNCATED_HASH_BYTES,
      },
    );
    const raw = truncateHashBytesRawFromActions(stepped.actions);
    if (
      shouldRejectTruncateHashBytes(stepped.actions) ||
      !shouldUseTruncateHashBytes(stepped.actions) ||
      raw === null
    ) {
      throw new Error(`digest must be at least ${TRUNCATED_HASH_BYTES} bytes`);
    }
    return raw;
  }
}

function assertValidDestinationNamePart(value: string, label: string): void {
  const stepped = stepValidateDestinationNamePartWithActions(
    initialValidateDestinationNamePartState(),
    {
      kind: "destination/name-part-gate",
      value,
      label,
    },
  );
  if (
    shouldRejectValidateDestinationNamePart(stepped.actions) ||
    !shouldProceedValidateDestinationNamePart(stepped.actions)
  ) {
    if (value.length === 0) {
      throw new Error(`Destination ${label} cannot be empty`);
    }
    throw new Error(`Dots cannot be used in destination ${label}s`);
  }
}

function identityHashBytes(
  identity: Identity | Uint8Array | null | undefined,
): Uint8Array | null {
  const identityKind =
    identity == null
      ? "missing"
      : identity instanceof Identity
        ? "object"
        : "bytes";
  const stepped = stepDestinationIdentityHashWithActions(
    initialDestinationIdentityHashState(),
    {
      kind: "destination/identity-hash-gate",
      identityKind,
      ...(identityKind === "bytes"
        ? { bytesLength: (identity as Uint8Array).length }
        : {}),
    },
  );
  if (shouldMissDestinationIdentityHash(stepped.actions)) {
    return null;
  }
  if (shouldUseObjectDestinationIdentityHash(stepped.actions)) {
    return (identity as Identity).hash;
  }
  if (shouldRejectLengthDestinationIdentityHash(stepped.actions)) {
    throw new Error(
      `Identity hash must be ${DESTINATION_IDENTITY_HASH_BYTES} bytes`,
    );
  }
  if (shouldUseBytesDestinationIdentityHash(stepped.actions)) {
    return identity as Uint8Array;
  }
  return null;
}
