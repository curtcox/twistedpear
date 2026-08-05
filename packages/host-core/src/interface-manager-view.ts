import type { PacketInterface } from "@twistedpear/reticulum-ts";
import { DEFAULT_INTERFACE_BITRATES } from "@twistedpear/reticulum-interfaces";
import type {
  HostConfig,
  InterfaceDirection,
  InterfaceStatus,
  RelayInterfaceKind,
} from "./types.js";

interface ManagedInterfaceView {
  readonly iface: PacketInterface;
}

interface InterfaceDiagnosticView {
  readonly kind: RelayInterfaceKind;
  readonly state:
    | "available"
    | "permission-required"
    | "unsupported"
    | "offline"
    | "policy-disabled";
  readonly reason?: string;
}

interface CommonConfig {
  readonly enabled: boolean;
  readonly direction?: InterfaceDirection;
  readonly relay?: boolean;
  readonly bitrateHint?: number;
}

interface InterfaceViewInputs {
  readonly kinds: ReadonlyArray<RelayInterfaceKind>;
  readonly config: HostConfig;
  readonly managed: ReadonlyMap<RelayInterfaceKind, ManagedInterfaceView>;
  readonly serverKinds: ReadonlySet<RelayInterfaceKind>;
  readonly registered: (
    kind: RelayInterfaceKind,
  ) => ReadonlyArray<PacketInterface>;
}

function direction(value?: InterfaceDirection): InterfaceDirection {
  return value ?? "both";
}

function inactiveStatus(
  kind: RelayInterfaceKind,
  config: CommonConfig,
  serverOnline: boolean,
): InterfaceStatus {
  return {
    kind,
    name: `host-${kind}`,
    enabled: config.enabled,
    online: serverOnline,
    direction: direction(config.direction),
    relay: config.relay ?? true,
    bitrate: config.bitrateHint ?? DEFAULT_INTERFACE_BITRATES[kind] ?? null,
    bytesIn: 0,
    bytesOut: 0,
  };
}

function activeStatus(
  kind: RelayInterfaceKind,
  config: CommonConfig,
  managed: ManagedInterfaceView | undefined,
  interfaces: ReadonlyArray<PacketInterface>,
  serverOnline: boolean,
): InterfaceStatus {
  const reportedBitrate = interfaces.find(
    (iface) => iface.bitrate !== null,
  )?.bitrate;
  return {
    kind,
    name: managed?.iface.name ?? `host-${kind}-server`,
    enabled: config.enabled,
    online: serverOnline || interfaces.some((iface) => iface.online),
    direction: direction(config.direction),
    relay: config.relay ?? true,
    bitrate:
      config.bitrateHint ??
      reportedBitrate ??
      DEFAULT_INTERFACE_BITRATES[kind] ??
      null,
    bytesIn: interfaces.reduce(
      (total, iface) => total + (iface.bytesIn ?? 0),
      0,
    ),
    bytesOut: interfaces.reduce(
      (total, iface) => total + (iface.bytesOut ?? 0),
      0,
    ),
  };
}

function statusForKind(
  inputs: InterfaceViewInputs,
  kind: RelayInterfaceKind,
): InterfaceStatus {
  const config = inputs.config.interfaces[kind] as CommonConfig;
  const managed = inputs.managed.get(kind);
  const registered = inputs.registered(kind);
  const serverOnline = inputs.serverKinds.has(kind);
  if (managed === undefined && registered.length === 0) {
    return inactiveStatus(kind, config, serverOnline);
  }
  const interfaces =
    managed === undefined
      ? registered
      : [...new Set([managed.iface, ...registered])];
  return activeStatus(kind, config, managed, interfaces, serverOnline);
}

export function buildInterfaceStatuses(
  inputs: InterfaceViewInputs,
): ReadonlyArray<InterfaceStatus> {
  return inputs.kinds.map((kind) => statusForKind(inputs, kind));
}

export function buildInterfaceDiagnostics(
  inputs: InterfaceViewInputs,
  failures: ReadonlyMap<RelayInterfaceKind, string>,
  effectKinds: ReadonlySet<RelayInterfaceKind>,
  availableEffects: ReadonlySet<RelayInterfaceKind>,
): ReadonlyArray<InterfaceDiagnosticView> {
  return inputs.kinds.map((kind) => {
    const managed = inputs.managed.get(kind);
    if (
      managed !== undefined ||
      inputs.serverKinds.has(kind) ||
      inputs.registered(kind).length > 0
    ) {
      return {
        kind,
        state:
          managed === undefined || managed.iface.online
            ? "available"
            : "offline",
      };
    }
    const failure = failures.get(kind);
    if (failure !== undefined)
      return { kind, state: "offline", reason: failure };
    if (effectKinds.has(kind) && !availableEffects.has(kind)) {
      return {
        kind,
        state: "unsupported",
        reason: "No host effect factory registered",
      };
    }
    return {
      kind,
      state: "policy-disabled",
      reason: "Interface disabled in config",
    };
  });
}
