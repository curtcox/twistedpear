import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes } from "node:crypto";
import sodium from "sodium-native";
import type { CryptoProvider, HkdfInput } from "./provider.js";

function toBuffer(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes);
}

function toUint8Array(buffer: Buffer | Uint8Array): Uint8Array {
  return Uint8Array.from(buffer);
}

export class NodeCryptoProvider implements CryptoProvider {
  readonly name = "node";

  randomBytes(length: number): Uint8Array {
    return toUint8Array(randomBytes(length));
  }

  sha256(data: Uint8Array): Uint8Array {
    return toUint8Array(createHash("sha256").update(data).digest());
  }

  hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
    return toUint8Array(createHmac("sha256", key).update(data).digest());
  }

  hkdf(input: HkdfInput): Uint8Array {
    if (input.hash !== "sha256") {
      throw new Error(`Unsupported HKDF hash: ${input.hash}`);
    }

    const output = hkdfSync("sha256", input.keyMaterial, input.salt, input.info, input.length);
    return output instanceof ArrayBuffer ? new Uint8Array(output) : toUint8Array(output);
  }

  x25519PublicFromPrivate(privateKey: Uint8Array): Uint8Array {
    const publicKey = Buffer.alloc(sodium.crypto_scalarmult_BYTES);
    sodium.crypto_scalarmult_base(publicKey, toBuffer(privateKey));
    return toUint8Array(publicKey);
  }

  x25519SharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
    const shared = Buffer.alloc(sodium.crypto_scalarmult_BYTES);
    sodium.crypto_scalarmult(shared, toBuffer(privateKey), toBuffer(publicKey));
    return toUint8Array(shared);
  }

  ed25519PublicFromPrivate(privateKey: Uint8Array): Uint8Array {
    const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES);
    const expandedPrivateKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES);
    sodium.crypto_sign_seed_keypair(publicKey, expandedPrivateKey, toBuffer(privateKey));
    return toUint8Array(publicKey);
  }

  ed25519Sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
    const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES);
    const expandedPrivateKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES);
    sodium.crypto_sign_seed_keypair(publicKey, expandedPrivateKey, toBuffer(privateKey));

    const signature = Buffer.alloc(sodium.crypto_sign_BYTES);
    sodium.crypto_sign_detached(signature, toBuffer(message), expandedPrivateKey);
    return toUint8Array(signature);
  }

  ed25519Verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean {
    return sodium.crypto_sign_verify_detached(
      toBuffer(signature),
      toBuffer(message),
      toBuffer(publicKey)
    );
  }

  aes128CbcEncrypt(plaintext: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
    const cipher = createCipheriv("aes-128-cbc", key, iv);
    cipher.setAutoPadding(false);
    return toUint8Array(Buffer.concat([cipher.update(plaintext), cipher.final()]));
  }

  aes128CbcDecrypt(ciphertext: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
    const decipher = createDecipheriv("aes-128-cbc", key, iv);
    decipher.setAutoPadding(false);
    return toUint8Array(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
  }
}
