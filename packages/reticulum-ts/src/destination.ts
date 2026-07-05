import { bytesToHex } from "./crypto/bytes.js";
import type { CryptoProvider } from "./crypto/provider.js";
import { Identity, NAME_HASH_LENGTH, TRUNCATED_HASH_LENGTH } from "./identity.js";

/** Mirrors RNS/Destination.py destination types and hash derivation. */
export const DestinationType = {
  SINGLE: 0x00,
  GROUP: 0x01,
  PLAIN: 0x02,
  LINK: 0x03
} as const;

export type DestinationTypeValue = (typeof DestinationType)[keyof typeof DestinationType];

export const DestinationDirection = {
  IN: 0x11,
  OUT: 0x12
} as const;

export type DestinationDirectionValue = (typeof DestinationDirection)[keyof typeof DestinationDirection];

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
    validateNamePart(options.appName, "app name");
    for (const aspect of options.aspects ?? []) {
      validateNamePart(aspect, "aspect");
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
    validateNamePart(appName, "app name");
    for (const aspect of aspects) {
      validateNamePart(aspect, "aspect");
    }

    let name = appName;
    for (const aspect of aspects) {
      name += `.${aspect}`;
    }

    if (identityHash !== null) {
      name += `.${bytesToHex(identityHash)}`;
    }

    return name;
  }

  static nameHash(provider: CryptoProvider, appName: string, ...aspects: ReadonlyArray<string>): Uint8Array {
    const expanded = Destination.expandName(null, appName, ...aspects);
    return Identity.fullHash(provider, new TextEncoder().encode(expanded)).subarray(0, NAME_HASH_LENGTH / 8);
  }

  static hash(
    provider: CryptoProvider,
    identity: Identity | Uint8Array | null,
    appName: string,
    ...aspects: ReadonlyArray<string>
  ): Uint8Array {
    const nameHash = Destination.nameHash(provider, appName, ...aspects);
    const identityHash = identityHashBytes(identity);
    const material = identityHash === null ? nameHash : concatBytes(nameHash, identityHash);
    return Identity.fullHash(provider, material).subarray(0, TRUNCATED_HASH_LENGTH / 8);
  }
}

function identityHashBytes(identity: Identity | Uint8Array | null | undefined): Uint8Array | null {
  if (identity == null) {
    return null;
  }

  if (identity instanceof Identity) {
    return identity.hash;
  }

  if (identity.length !== TRUNCATED_HASH_LENGTH / 8) {
    throw new Error(`Identity hash must be ${TRUNCATED_HASH_LENGTH / 8} bytes`);
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

function validateNamePart(value: string, label: string): void {
  if (value.length === 0) {
    throw new Error(`Destination ${label} cannot be empty`);
  }

  if (value.includes(".")) {
    throw new Error(`Dots cannot be used in destination ${label}s`);
  }
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}
