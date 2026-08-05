import { cbc } from "@noble/ciphers/aes.js";
import { hmac } from "@noble/hashes/hmac.js";
import { hkdf as nobleHkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha256.js";
import { sha512 } from "@noble/hashes/sha512.js";
import { randomBytes } from "@noble/hashes/utils.js";
import type { CryptoProvider, HkdfInput } from "./provider.js";
import type SodiumNative from "sodium-native";

let sodium: typeof SodiumNative | undefined;

function loadSodium(): typeof SodiumNative {
  if (sodium === undefined) {
    sodium = require("sodium-native") as typeof SodiumNative;
  }

  return sodium;
}

function toBuffer(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes);
}

function toUint8Array(buffer: Buffer): Uint8Array {
  return Uint8Array.from(buffer);
}

/** Bare fast path: sodium-native curves + @noble symmetric crypto (no node:crypto). */
export class BareCryptoProvider implements CryptoProvider {
  readonly name = "bare";

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
    const lib = loadSodium();
    const publicKey = Buffer.alloc(lib.crypto_scalarmult_BYTES);
    lib.crypto_scalarmult_base(publicKey, toBuffer(privateKey));
    return toUint8Array(publicKey);
  }

  x25519SharedSecret(
    privateKey: Uint8Array,
    publicKey: Uint8Array,
  ): Uint8Array {
    const lib = loadSodium();
    const shared = Buffer.alloc(lib.crypto_scalarmult_BYTES);
    lib.crypto_scalarmult(shared, toBuffer(privateKey), toBuffer(publicKey));
    return toUint8Array(shared);
  }

  ed25519PublicFromPrivate(privateKey: Uint8Array): Uint8Array {
    const lib = loadSodium();
    const publicKey = Buffer.alloc(lib.crypto_sign_PUBLICKEYBYTES);
    const expandedPrivateKey = Buffer.alloc(lib.crypto_sign_SECRETKEYBYTES);
    lib.crypto_sign_seed_keypair(
      publicKey,
      expandedPrivateKey,
      toBuffer(privateKey),
    );
    return toUint8Array(publicKey);
  }

  ed25519Sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
    const lib = loadSodium();
    const publicKey = Buffer.alloc(lib.crypto_sign_PUBLICKEYBYTES);
    const expandedPrivateKey = Buffer.alloc(lib.crypto_sign_SECRETKEYBYTES);
    lib.crypto_sign_seed_keypair(
      publicKey,
      expandedPrivateKey,
      toBuffer(privateKey),
    );

    const signature = Buffer.alloc(lib.crypto_sign_BYTES);
    lib.crypto_sign_detached(signature, toBuffer(message), expandedPrivateKey);
    return toUint8Array(signature);
  }

  ed25519Verify(
    publicKey: Uint8Array,
    message: Uint8Array,
    signature: Uint8Array,
  ): boolean {
    const lib = loadSodium();
    return lib.crypto_sign_verify_detached(
      toBuffer(signature),
      toBuffer(message),
      toBuffer(publicKey),
    );
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
