import { pkcs7Pad, pkcs7Unpad } from "./pkcs7.js";
import type { CryptoProvider } from "./provider.js";

/** Mirrors RNS/Cryptography/Token.py */
export const TOKEN_OVERHEAD = 48;

export interface TokenEncryptOptions {
  readonly iv?: Uint8Array;
}

type TokenMode = "aes128" | "aes256";

export class Token {
  private readonly mode: TokenMode;
  private readonly signingKey: Uint8Array;
  private readonly encryptionKey: Uint8Array;

  constructor(
    private readonly provider: CryptoProvider,
    key: Uint8Array
  ) {
    if (key.length === 32) {
      this.mode = "aes128";
      this.signingKey = key.subarray(0, 16);
      this.encryptionKey = key.subarray(16, 32);
    } else if (key.length === 64) {
      this.mode = "aes256";
      this.signingKey = key.subarray(0, 32);
      this.encryptionKey = key.subarray(32, 64);
    } else {
      throw new Error(`Token key must be 32 or 64 bytes, not ${key.length}`);
    }
  }

  static generateKey(provider: CryptoProvider): Uint8Array {
    return provider.randomBytes(32);
  }

  verifyHmac(token: Uint8Array): boolean {
    if (token.length <= 32) {
      throw new Error(`Cannot verify HMAC on token of only ${token.length} bytes`);
    }

    const receivedHmac = token.subarray(token.length - 32);
    const expectedHmac = this.provider.hmacSha256(this.signingKey, token.subarray(0, token.length - 32));
    if (receivedHmac.length !== expectedHmac.length) {
      return false;
    }

    let mismatch = 0;
    for (let index = 0; index < receivedHmac.length; index += 1) {
      mismatch |= (receivedHmac[index] ?? 0) ^ (expectedHmac[index] ?? 0);
    }

    return mismatch === 0;
  }

  encrypt(data: Uint8Array, options: TokenEncryptOptions = {}): Uint8Array {
    if (!(data instanceof Uint8Array)) {
      throw new TypeError("Token plaintext input must be bytes");
    }

    const iv = options.iv ?? this.provider.randomBytes(16);
    if (iv.length !== 16) {
      throw new Error("Token IV must be 16 bytes");
    }

    const ciphertext =
      this.mode === "aes256"
        ? this.provider.aes256CbcEncrypt(pkcs7Pad(data), this.encryptionKey, iv)
        : this.provider.aes128CbcEncrypt(pkcs7Pad(data), this.encryptionKey, iv);
    const signedParts = concatBytes(iv, ciphertext);
    const hmac = this.provider.hmacSha256(this.signingKey, signedParts);
    return concatBytes(signedParts, hmac);
  }

  decrypt(token: Uint8Array): Uint8Array {
    if (!(token instanceof Uint8Array)) {
      throw new TypeError("Token must be bytes");
    }

    if (!this.verifyHmac(token)) {
      throw new Error("Token HMAC was invalid");
    }

    const iv = token.subarray(0, 16);
    const ciphertext = token.subarray(16, token.length - 32);

    try {
      const decrypted =
        this.mode === "aes256"
          ? this.provider.aes256CbcDecrypt(ciphertext, this.encryptionKey, iv)
          : this.provider.aes128CbcDecrypt(ciphertext, this.encryptionKey, iv);
      const plaintext = pkcs7Unpad(decrypted);
      return plaintext;
    } catch {
      throw new Error("Could not decrypt token");
    }
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
