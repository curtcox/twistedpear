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
  sha512(data: Uint8Array): Uint8Array;
  hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array;
  hkdf(input: HkdfInput): Uint8Array;
  x25519PublicFromPrivate(privateKey: Uint8Array): Uint8Array;
  x25519SharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array;
  ed25519PublicFromPrivate(privateKey: Uint8Array): Uint8Array;
  ed25519Sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array;
  ed25519Verify(
    publicKey: Uint8Array,
    message: Uint8Array,
    signature: Uint8Array,
  ): boolean;
  aes128CbcEncrypt(
    plaintext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
  ): Uint8Array;
  aes128CbcDecrypt(
    ciphertext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
  ): Uint8Array;
  aes256CbcEncrypt(
    plaintext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
  ): Uint8Array;
  aes256CbcDecrypt(
    ciphertext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
  ): Uint8Array;
}
