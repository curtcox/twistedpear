import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import { Identity } from "@twistedpear/reticulum-ts";

export const SCOPE_LINK = "2";
export const MULTICAST_TEMPORARY = "1";

export function deriveMulticastAddress(
  provider: CryptoProvider,
  groupId: Uint8Array,
  scope: string,
  addressType: string
): string {
  const groupHash = Identity.fullHash(provider, groupId);
  const parts = [
    "0",
    hexPair(groupHash[3] ?? 0, groupHash[2] ?? 0),
    hexPair(groupHash[5] ?? 0, groupHash[4] ?? 0),
    hexPair(groupHash[7] ?? 0, groupHash[6] ?? 0),
    hexPair(groupHash[9] ?? 0, groupHash[8] ?? 0),
    hexPair(groupHash[11] ?? 0, groupHash[10] ?? 0),
    hexPair(groupHash[13] ?? 0, groupHash[12] ?? 0)
  ];

  return `ff${addressType}${scope}:${parts.join(":")}`;
}

export function hexPair(low: number, high: number): string {
  return ((high << 8) | low).toString(16).padStart(4, "0");
}

export function descopeLinkLocal(address: string): string {
  return address.split("%")[0]?.replace(/fe80:[0-9a-f]*::/i, "fe80::") ?? address;
}

export function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return merged;
}

export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}
