import type { PacketInterface } from "@twistedpear/reticulum-ts";

/** Known interface kinds for outbound prioritization (M9). */
export const InterfaceKind = {
  AUTO: "auto",
  TCP: "tcp",
  WEBSOCKET: "websocket",
  UDP: "udp",
  BLE: "ble",
  BLUETOOTH: "bluetooth",
  RNODE: "rnode",
  I2P: "i2p",
  FREENET: "freenet",
  OPTICAL: "optical",
  ACOUSTIC: "acoustic",
  NTFY: "ntfy",
  UNKNOWN: "unknown",
} as const;

export type InterfaceKindValue =
  (typeof InterfaceKind)[keyof typeof InterfaceKind];

/** Default outbound preference: higher bitrate / lower latency first. */
export const DEFAULT_INTERFACE_PRIORITY: ReadonlyArray<InterfaceKindValue> = [
  InterfaceKind.AUTO,
  InterfaceKind.TCP,
  InterfaceKind.WEBSOCKET,
  InterfaceKind.UDP,
  InterfaceKind.BLE,
  InterfaceKind.BLUETOOTH,
  InterfaceKind.RNODE,
  InterfaceKind.I2P,
  InterfaceKind.FREENET,
  InterfaceKind.OPTICAL,
  InterfaceKind.ACOUSTIC,
  InterfaceKind.NTFY,
  InterfaceKind.UNKNOWN,
];

/** Default bitrates (bps) used when an interface does not report one. */
export const DEFAULT_INTERFACE_BITRATES: Readonly<
  Partial<Record<InterfaceKindValue, number>>
> = {
  [InterfaceKind.AUTO]: 10_000_000,
  [InterfaceKind.TCP]: 1_000_000,
  [InterfaceKind.WEBSOCKET]: 1_000_000,
  [InterfaceKind.UDP]: 1_000_000,
  [InterfaceKind.BLE]: 20_000,
  [InterfaceKind.BLUETOOTH]: 20_000,
  [InterfaceKind.RNODE]: 5_000,
  [InterfaceKind.I2P]: 100_000,
  // S2 local 1 KiB p95 ≈ 89 ms → ~92 kbps; rounded down for policy.
  [InterfaceKind.FREENET]: 90_000,
  [InterfaceKind.OPTICAL]: 1_000,
  [InterfaceKind.ACOUSTIC]: 500,
  [InterfaceKind.NTFY]: 10_000,
};

export interface InterfacePolicyOptions {
  readonly priority?: ReadonlyArray<InterfaceKindValue>;
  readonly defaultBitrates?: Readonly<
    Partial<Record<InterfaceKindValue, number>>
  >;
}

export interface RankedInterface {
  readonly iface: PacketInterface;
  readonly kind: InterfaceKindValue;
  readonly rank: number;
  readonly effectiveBitrate: number;
}

interface InterfaceKindRule {
  readonly kind: InterfaceKindValue;
  readonly aliases: ReadonlyArray<string>;
}

/** Ordered to preserve precedence when a registered name contains several aliases. */
const INTERFACE_KIND_RULES: ReadonlyArray<InterfaceKindRule> = [
  { kind: InterfaceKind.AUTO, aliases: ["auto"] },
  { kind: InterfaceKind.WEBSOCKET, aliases: ["websocket", "ws-gateway"] },
  { kind: InterfaceKind.TCP, aliases: ["tcp"] },
  { kind: InterfaceKind.UDP, aliases: ["udp"] },
  // "bluetooth" contains "ble", so the more specific alias comes first.
  { kind: InterfaceKind.BLUETOOTH, aliases: ["bluetooth"] },
  { kind: InterfaceKind.BLE, aliases: ["ble"] },
  { kind: InterfaceKind.RNODE, aliases: ["rnode", "kiss", "lora"] },
  { kind: InterfaceKind.I2P, aliases: ["i2p", "sam"] },
  { kind: InterfaceKind.FREENET, aliases: ["freenet", "tplg"] },
  {
    kind: InterfaceKind.OPTICAL,
    aliases: ["optical", "qr", "camera", "screen"],
  },
  {
    kind: InterfaceKind.ACOUSTIC,
    aliases: ["acoustic", "audio", "speaker", "microphone", "mic"],
  },
  { kind: InterfaceKind.NTFY, aliases: ["ntfy"] },
];

/** Infer interface kind from its registered name (harness and reference naming conventions). */
export function inferInterfaceKind(name: string): InterfaceKindValue {
  const normalized = name.toLowerCase();
  for (const rule of INTERFACE_KIND_RULES) {
    if (rule.aliases.some((alias) => normalized.includes(alias))) {
      return rule.kind;
    }
  }

  return InterfaceKind.UNKNOWN;
}

function rankForKind(
  kind: InterfaceKindValue,
  priority: ReadonlyArray<InterfaceKindValue>,
): number {
  const index = priority.indexOf(kind);
  return index < 0 ? priority.length : index;
}

function effectiveBitrate(
  iface: PacketInterface,
  kind: InterfaceKindValue,
  defaultBitrates: Readonly<Partial<Record<InterfaceKindValue, number>>>,
): number {
  if (iface.bitrate !== null && iface.bitrate > 0) {
    return iface.bitrate;
  }

  return defaultBitrates[kind] ?? 1;
}

/** Rank outgoing interfaces for outbound path selection. Online interfaces sort first. */
export function rankOutgoingInterfaces(
  interfaces: ReadonlyArray<PacketInterface>,
  options: InterfacePolicyOptions = {},
): ReadonlyArray<RankedInterface> {
  const priority = options.priority ?? DEFAULT_INTERFACE_PRIORITY;
  const defaultBitrates = options.defaultBitrates ?? DEFAULT_INTERFACE_BITRATES;

  return interfaces
    .filter((iface) => iface.outgoing)
    .map((iface) => {
      const kind = inferInterfaceKind(iface.name);
      return {
        iface,
        kind,
        rank: rankForKind(kind, priority),
        effectiveBitrate: effectiveBitrate(iface, kind, defaultBitrates),
      };
    })
    .sort((left, right) => {
      if (left.iface.online !== right.iface.online) {
        return left.iface.online ? -1 : 1;
      }

      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return right.effectiveBitrate - left.effectiveBitrate;
    });
}

/** Return the preferred online outgoing interface, if any. */
export function selectPreferredInterface(
  interfaces: ReadonlyArray<PacketInterface>,
  options?: InterfacePolicyOptions,
): PacketInterface | null {
  const ranked = rankOutgoingInterfaces(interfaces, options);
  return (
    ranked.find((entry) => entry.iface.online)?.iface ??
    ranked[0]?.iface ??
    null
  );
}
