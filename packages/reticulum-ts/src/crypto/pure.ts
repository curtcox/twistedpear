import { cbc } from "@noble/ciphers/aes.js";
import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { hmac } from "@noble/hashes/hmac.js";
import { hkdf as nobleHkdf } from "@noble/hashes/hkdf.js";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/hashes/utils.js";
import type { CryptoProvider, HkdfInput } from "./provider.js";

/** Portable provider mirroring RNS/Cryptography/* using audited @noble/* primitives. */
export class PureCryptoProvider implements CryptoProvider {
  readonly name = "pure";

  randomBytes(length: number): Uint8Array {
    return randomBytes(length);
  }

  sha256(data: Uint8Array): Uint8Array {
    return sha256(data);
  }

  sha512(data: Uint8Array): Uint8Array {
    return sha512(data);
  }

  hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
    return hmac(sha256, key, data);
  }

  hkdf(input: HkdfInput): Uint8Array {
    if (input.hash !== "sha256") {
      throw new Error(`Unsupported HKDF hash: ${input.hash}`);
    }

    return nobleHkdf(
      sha256,
      input.keyMaterial,
      input.salt,
      input.info,
      input.length,
    );
  }

  x25519PublicFromPrivate(privateKey: Uint8Array): Uint8Array {
    return x25519.getPublicKey(privateKey);
  }

  x25519SharedSecret(
    privateKey: Uint8Array,
    publicKey: Uint8Array,
  ): Uint8Array {
    return x25519.getSharedSecret(privateKey, publicKey);
  }

  ed25519PublicFromPrivate(privateKey: Uint8Array): Uint8Array {
    return ed25519.getPublicKey(privateKey);
  }

  ed25519Sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
    return ed25519.sign(message, privateKey);
  }

  ed25519Verify(
    publicKey: Uint8Array,
    message: Uint8Array,
    signature: Uint8Array,
  ): boolean {
    return ed25519.verify(signature, message, publicKey);
  }

  aes128CbcEncrypt(
    plaintext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
  ): Uint8Array {
    return cbc(key, iv, { disablePadding: true }).encrypt(plaintext);
  }

  aes128CbcDecrypt(
    ciphertext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
  ): Uint8Array {
    return cbc(key, iv, { disablePadding: true }).decrypt(ciphertext);
  }

  aes256CbcEncrypt(
    plaintext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
  ): Uint8Array {
    return cbc(key, iv, { disablePadding: true }).encrypt(plaintext);
  }

  aes256CbcDecrypt(
    ciphertext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
  ): Uint8Array {
    return cbc(key, iv, { disablePadding: true }).decrypt(ciphertext);
  }
}
