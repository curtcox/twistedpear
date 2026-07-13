import {
  destinationHashMaterial,
  destinationNameHashMaterial,
  DestinationDirectionCode,
  DestinationTypeCode,
  expandDestinationName,
  truncateToNameHash,
  truncateToTruncatedHash,
  validateDestinationNamePart,
  TRUNCATED_HASH_BYTES
} from "@twistedpear/protocol";
import { bytesToHex } from "./crypto/bytes.js";
import type { CryptoProvider } from "./crypto/provider.js";
import { Identity } from "./identity.js";

/** Mirrors RNS/Destination.py destination types and hash derivation. */
export const DestinationType = DestinationTypeCode;

export type DestinationTypeValue = (typeof DestinationType)[keyof typeof DestinationType];

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
    options: DestinationOptions
  ) {
    validateDestinationNamePart(options.appName, "app name");
    for (const aspect of options.aspects ?? []) {
      validateDestinationNamePart(aspect, "aspect");
    }

    this.direction = options.direction;
    this.type = options.type;
    this.appName = options.appName;
    this.aspects = [...(options.aspects ?? [])];

    if (!isDestinationDirection(this.direction)) {
      throw new Error(`Unknown destination direction: ${this.direction}`);
    }

    if (!isDestinationType(this.type)) {
      throw new Error(`Unknown destination type: ${this.type}`);
    }

    if (this.type === DestinationType.PLAIN && options.identity != null) {
      throw new Error("PLAIN destinations cannot hold an identity");
    }

    if (this.type !== DestinationType.PLAIN && options.identity == null) {
      throw new Error("Non-PLAIN destinations require identity material");
    }

    this.identity = options.identity instanceof Identity ? options.identity : null;
    const identityHash = identityHashBytes(options.identity);
    this.name = Destination.expandName(identityHash, this.appName, ...this.aspects);
    this.nameHash = Destination.nameHash(this.provider, this.appName, ...this.aspects);
    this.hash = Destination.hash(this.provider, identityHash, this.appName, ...this.aspects);
    this.hexhash = bytesToHex(this.hash);
  }

  static expandName(identityHash: Uint8Array | null, appName: string, ...aspects: ReadonlyArray<string>): string {
    return expandDestinationName(identityHash, appName, aspects);
  }

  static nameHash(provider: CryptoProvider, appName: string, ...aspects: ReadonlyArray<string>): Uint8Array {
    return truncateToNameHash(Identity.fullHash(provider, destinationNameHashMaterial(appName, aspects)));
  }

  static hash(
    provider: CryptoProvider,
    identity: Identity | Uint8Array | null,
    appName: string,
    ...aspects: ReadonlyArray<string>
  ): Uint8Array {
    const nameHash = Destination.nameHash(provider, appName, ...aspects);
    const identityHash = identityHashBytes(identity);
    return truncateToTruncatedHash(
      Identity.fullHash(provider, destinationHashMaterial(nameHash, identityHash))
    );
  }
}

function identityHashBytes(identity: Identity | Uint8Array | null | undefined): Uint8Array | null {
  if (identity == null) {
    return null;
  }

  if (identity instanceof Identity) {
    return identity.hash;
  }

  if (identity.length !== TRUNCATED_HASH_BYTES) {
    throw new Error(`Identity hash must be ${TRUNCATED_HASH_BYTES} bytes`);
  }

  return identity;
}

function isDestinationType(value: number): value is DestinationTypeValue {
  return (
    value === DestinationType.SINGLE ||
    value === DestinationType.GROUP ||
    value === DestinationType.PLAIN ||
    value === DestinationType.LINK
  );
}

function isDestinationDirection(value: number): value is DestinationDirectionValue {
  return value === DestinationDirection.IN || value === DestinationDirection.OUT;
}
