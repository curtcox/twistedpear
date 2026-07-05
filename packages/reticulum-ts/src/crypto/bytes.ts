import type { CryptoProvider } from "./provider.js";

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex strings must contain an even number of characters");
  }

  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export function hashBytes(provider: CryptoProvider, bytes: Uint8Array): string {
  return bytesToHex(provider.sha256(bytes));
}

export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index]! ^ right[index]!;
  }

  return diff === 0;
}
