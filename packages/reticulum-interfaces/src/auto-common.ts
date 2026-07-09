import type { CryptoProvider, PacketInterface, Runtime } from "@twistedpear/reticulum-ts";
import { Identity, type ReticulumInterfaceOptions } from "@twistedpear/reticulum-ts";

export const SCOPE_LINK = "2";
export const MULTICAST_TEMPORARY = "1";

/** Mirrors RNS/Interfaces/AutoInterface.py constants (no Node builtins — safe for Bare worklets). */
export const AUTO_HW_MTU = 1_196;
export const AUTO_DEFAULT_DISCOVERY_PORT = 29_716;
export const AUTO_DEFAULT_DATA_PORT = 42_671;
export const AUTO_DEFAULT_GROUP_ID = "reticulum";
export const AUTO_PEERING_TIMEOUT_MS = 22_000;
export const AUTO_ANNOUNCE_INTERVAL_MS = 1_600;
export const AUTO_PEER_JOB_INTERVAL_MS = 4_000;
export const AUTO_REVERSE_PEERING_INTERVAL_MS = AUTO_ANNOUNCE_INTERVAL_MS * 3.25;
export const AUTO_BITRATE_GUESS = 10_000_000;

export interface AutoInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly groupId?: string;
  readonly discoveryPort?: number;
  readonly dataPort?: number;
  readonly allowedDevices?: ReadonlyArray<string>;
  readonly ignoredDevices?: ReadonlyArray<string>;
  readonly peeringTimeoutMs?: number;
  readonly onPeerSpawn?: (peer: AutoInterfacePeerHandle) => void;
  readonly onPeerDetach?: (peer: AutoInterfacePeerHandle) => void;
}

export interface AutoInterfacePeerHandle extends PacketInterface {
  readonly peerAddress: string;
}

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
