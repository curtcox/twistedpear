import type {
  InterfaceDiagnostic,
  InterfaceDirection,
  InterfaceStatus,
  RelayInterfaceKind,
  RelayMode,
  RelayPolicyMatrix,
  RelayService,
  RelayStatus,
} from "./relay.js";
import { RelayBrokerServiceError } from "./relay.js";

const MANAGED_KINDS: ReadonlyArray<RelayInterfaceKind> = [
  "tcp",
  "auto",
  "bluetooth",
  "rnode",
];

const UNSUPPORTED_KINDS: ReadonlyArray<RelayInterfaceKind> = [
  "websocket",
  "i2p",
  "optical",
  "acoustic",
  "ntfy",
  "freenet",
];

function kindToEnabled(
  kind: RelayInterfaceKind,
  flags: WorkletFlagRelaySnapshot,
): boolean {
  switch (kind) {
    case "tcp":
      return flags.tcpEnabled;
    case "auto":
      return flags.autoEnabled;
    case "bluetooth":
      return flags.bleEnabled;
    case "rnode":
      return flags.rnodeEnabled;
    default:
      return false;
  }
}

function kindToOnline(
  kind: RelayInterfaceKind,
  flags: WorkletFlagRelaySnapshot,
): boolean {
  switch (kind) {
    case "tcp":
      return flags.tcpOnline === true;
    case "auto":
      return flags.autoOnline === true;
    case "bluetooth":
      return flags.bleOnline === true;
    case "rnode":
      return flags.rnodeOnline === true;
    default:
      return false;
  }
}

function requireManaged(
  controller: WorkletFlagRelayController,
  kind: RelayInterfaceKind,
): void {
  if (!MANAGED_KINDS.includes(kind)) {
    throw new RelayBrokerServiceError(
      "RELAY_UNSUPPORTED",
      `${kind} is not managed by this host`,
    );
  }
}

function listInterfaces(
  controller: WorkletFlagRelayController,
  directions: Map<RelayInterfaceKind, InterfaceDirection>,
  mode: RelayMode,
): ReadonlyArray<InterfaceStatus> {
  const flags = controller.getFlags();
  return MANAGED_KINDS.map((kind) => {
    const enabled = kindToEnabled(kind, flags) === true;
    return {
      kind,
      name: kind,
      enabled,
      online: enabled && kindToOnline(kind, flags),
      direction: directions.get(kind) ?? "both",
      relay: mode !== "off",
      bitrate: null,
      bytesIn: 0,
      bytesOut: 0,
    };
  });
}

const ENABLE_FLAGS: Record<
  "tcp" | "auto" | "bluetooth" | "rnode",
  keyof WorkletFlagRelaySnapshot
> = {
  tcp: "tcpEnabled",
  auto: "autoEnabled",
  bluetooth: "bleEnabled",
  rnode: "rnodeEnabled",
};

const DISABLE_FLAGS = ENABLE_FLAGS;

function applyTcpEnableOptions(
  controller: WorkletFlagRelayController,
  options?: Record<string, unknown>,
): void {
  const host =
    typeof options?.targetHost === "string" ? options.targetHost : undefined;
  const port =
    typeof options?.targetPort === "number" ? options.targetPort : 4242;
  if (host !== undefined) controller.setTcpTarget?.(host, port);
}

function applyEnableOptions(
  controller: WorkletFlagRelayController,
  kind: RelayInterfaceKind,
  options?: Record<string, unknown>,
): void {
  if (kind === "tcp") {
    applyTcpEnableOptions(controller, options);
    return;
  }
  if (kind === "rnode" && options !== undefined) {
    controller.setRnodeOptions?.(options);
  }
}

async function enableKind(
  controller: WorkletFlagRelayController,
  directions: Map<RelayInterfaceKind, InterfaceDirection>,
  kind: RelayInterfaceKind,
  options?: Record<string, unknown>,
): Promise<void> {
  requireManaged(controller, kind);
  applyEnableOptions(controller, kind, options);
  const flag = ENABLE_FLAGS[kind as keyof typeof ENABLE_FLAGS];
  controller.setFlags({ [flag]: true });
  await controller.applyInterfaceConfig();
  const direction = directions.get(kind) ?? "both";
  if (direction !== "both") await controller.setDirection?.(kind, direction);
}

async function disableKind(
  controller: WorkletFlagRelayController,
  kind: RelayInterfaceKind,
): Promise<void> {
  requireManaged(controller, kind);
  const flag = DISABLE_FLAGS[kind as keyof typeof DISABLE_FLAGS];
  controller.setFlags({ [flag]: false });
  await controller.applyInterfaceConfig();
}

function collectDiagnostics(
  controller: WorkletFlagRelayController,
): ReadonlyArray<InterfaceDiagnostic> {
  const flags = controller.getFlags();
  const managed = MANAGED_KINDS.map((kind) => {
    const enabled = kindToEnabled(kind, flags) === true;
    const online = kindToOnline(kind, flags);
    return {
      kind,
      state: (enabled
        ? online
          ? "available"
          : "offline"
        : "policy-disabled") as InterfaceDiagnostic["state"],
      ...(enabled && !online
        ? { reason: "interface enabled but not online" }
        : {}),
    };
  });
  return [
    ...managed,
    ...UNSUPPORTED_KINDS.map((kind) => ({
      kind,
      state: "unsupported" as const,
      reason: "not managed by this worklet control plane",
    })),
  ];
}

export interface WorkletFlagRelaySnapshot {
  readonly tcpEnabled: boolean;
  readonly autoEnabled: boolean;
  readonly bleEnabled: boolean;
  readonly rnodeEnabled: boolean;
  readonly tcpOnline?: boolean;
  readonly autoOnline?: boolean;
  readonly bleOnline?: boolean;
  readonly rnodeOnline?: boolean;
}

export interface WorkletFlagRelayController {
  /** Current enable/online flags from the host worklet status. */
  getFlags(): WorkletFlagRelaySnapshot;
  /** Mutate enable flags before applyInterfaceConfig. */
  setFlags(patch: Partial<WorkletFlagRelaySnapshot>): void;
  /** Apply the same path Settings uses (start/stop interfaces). */
  applyInterfaceConfig(): Promise<void>;
  /** Optional: stash TCP target before enabling. */
  setTcpTarget?(host: string, port: number): void;
  /** Optional: stash RNode device/port before enabling. */
  setRnodeOptions?(options: Record<string, unknown>): void;
  /** Change actual relay behavior; omitted by hosts that cannot hot-toggle it. */
  setMode?(mode: RelayMode): void | Promise<void>;
  /** Rebuild or reconfigure the real PacketInterface direction. */
  setDirection?(
    kind: RelayInterfaceKind,
    direction: InterfaceDirection,
  ): void | Promise<void>;
  /** Apply bridge forwarding policy in the host transport plane. */
  setPolicy?(policy: RelayPolicyMatrix): void | Promise<void>;
  /** Desktop defaults to transport-node; mobile leaf defaults to off. */
  initialMode?: RelayMode;
}

/**
 * Thin RelayService over a worklet flag + applyInterfaceConfig control plane.
 * Does not own PacketInterfaces — avoids dual-registering beside Auto/BLE IPC bridges.
 */
export function createWorkletFlagRelayService(
  controller: WorkletFlagRelayController,
): RelayService {
  let mode: RelayMode = controller.initialMode ?? "off";
  let policy: RelayPolicyMatrix = {};
  const directions = new Map<RelayInterfaceKind, InterfaceDirection>([
    ["tcp", "both"],
    ["auto", "both"],
    ["bluetooth", "both"],
    ["rnode", "both"],
  ]);

  const list = (): ReadonlyArray<InterfaceStatus> =>
    listInterfaces(controller, directions, mode);

  return {
    async setMode(next: RelayMode): Promise<void> {
      if (next === mode) return;
      if (controller.setMode === undefined) {
        throw new RelayBrokerServiceError(
          "RELAY_UNSUPPORTED",
          "This host cannot hot-change relay mode",
        );
      }
      await controller.setMode(next);
      mode = next;
    },
    enable(kind, options) {
      return enableKind(controller, directions, kind, options);
    },
    disable(kind) {
      return disableKind(controller, kind);
    },
    async setDirection(
      kind: RelayInterfaceKind,
      direction: InterfaceDirection,
    ): Promise<void> {
      requireManaged(controller, kind);
      if (directions.get(kind) === direction) return;
      if (controller.setDirection === undefined) {
        throw new RelayBrokerServiceError(
          "RELAY_UNSUPPORTED",
          `${kind} direction cannot be changed on this host`,
        );
      }
      await controller.setDirection(kind, direction);
      directions.set(kind, direction);
    },
    async configure(
      kind: RelayInterfaceKind,
      patch: Record<string, unknown>,
    ): Promise<void> {
      const wasEnabled = kindToEnabled(kind, controller.getFlags()) === true;
      if (patch.enabled === false) await disableKind(controller, kind);
      else if (patch.enabled === true || wasEnabled)
        await enableKind(controller, directions, kind, patch);
      if (patch.direction !== undefined) {
        const direction = patch.direction as InterfaceDirection;
        requireManaged(controller, kind);
        if (directions.get(kind) === direction) return;
        if (controller.setDirection === undefined) {
          throw new RelayBrokerServiceError(
            "RELAY_UNSUPPORTED",
            `${kind} direction cannot be changed on this host`,
          );
        }
        await controller.setDirection(kind, direction);
        directions.set(kind, direction);
      }
    },
    async setPolicy(next: RelayPolicyMatrix): Promise<void> {
      if (controller.setPolicy === undefined) {
        throw new RelayBrokerServiceError(
          "RELAY_UNSUPPORTED",
          "This host does not implement a relay policy matrix",
        );
      }
      await controller.setPolicy(next);
      policy = next;
    },
    list,
    status(): RelayStatus {
      const interfaces = list();
      return {
        mode,
        interfaces,
        onlineCount: interfaces.filter((entry) => entry.online).length,
      };
    },
    diagnostics(): Promise<ReadonlyArray<InterfaceDiagnostic>> {
      void policy;
      return Promise.resolve(collectDiagnostics(controller));
    },
  };
}
