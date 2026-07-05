export interface HkdfInput {
  readonly hash: "sha256";
  readonly keyMaterial: Uint8Array;
  readonly salt: Uint8Array;
  readonly info: Uint8Array;
  readonly length: number;
}

export interface CryptoProvider {
  readonly name: string;
  randomBytes(length: number): Uint8Array;
  sha256(data: Uint8Array): Uint8Array;
  hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array;
  hkdf(input: HkdfInput): Uint8Array;
}
