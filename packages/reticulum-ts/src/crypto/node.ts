import { createHash, createHmac, hkdfSync, randomBytes } from "node:crypto";
import type { CryptoProvider, HkdfInput } from "./provider.js";

export class NodeCryptoProvider implements CryptoProvider {
  readonly name = "node";

  randomBytes(length: number): Uint8Array {
    return Uint8Array.from(randomBytes(length));
  }

  sha256(data: Uint8Array): Uint8Array {
    return Uint8Array.from(createHash("sha256").update(data).digest());
  }

  hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
    return Uint8Array.from(createHmac("sha256", key).update(data).digest());
  }

  hkdf(input: HkdfInput): Uint8Array {
    if (input.hash !== "sha256") {
      throw new Error(`Unsupported HKDF hash: ${input.hash}`);
    }

    const output = hkdfSync("sha256", input.keyMaterial, input.salt, input.info, input.length);
    return output instanceof ArrayBuffer
      ? new Uint8Array(output)
      : Uint8Array.from(output);
  }
}
