// @ts-nocheck
import type {
  InterfaceDiagnostic,
  InterfaceDirection,
  InterfaceStatus,
  RelayInterfaceKind,
  RelayMode,
  RelayPolicyMatrix,
  RelayService,
  RelayStatus
} from "./relay.js";

const MANAGED_KINDS: ReadonlyArray<RelayInterfaceKind> = ["tcp", "auto", "bluetooth", "rnode"];

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
  /** Desktop defaults to transport-node; mobile leaf defaults to off. */
  initialMode?: RelayMode;
}

/**
 * Thin RelayService over a worklet flag + applyInterfaceConfig control plane.
 * Does not own PacketInterfaces — avoids dual-registering beside Auto/BLE IPC bridges.
 */
export function createWorkletFlagRelayService(controller: WorkletFlagRelayController): RelayService {
  let mode: RelayMode = controller.initialMode ?? "off";
  let policy: RelayPolicyMatrix = {};
  const directions = new Map<RelayInterfaceKind, InterfaceDirection>([
    ["tcp", "both"],
    ["auto", "both"],
    ["bluetooth", "both"],
    ["rnode", "both"]
  ]);

  const kindToEnabled = (kind: RelayInterfaceKind, flags: WorkletFlagRelaySnapshot): boolean | null => {
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
        return null;
    }
  };

  const kindToOnline = (kind: RelayInterfaceKind, flags: WorkletFlagRelaySnapshot): boolean => {
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
  };

  const list = (): ReadonlyArray<InterfaceStatus> => {
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
        bytesOut: 0
      };
    });
  };

  return {
    async setMode(next: RelayMode): Promise<void> {
      mode = next;
      if (next === "off") {
        controller.setFlags({
          tcpEnabled: false,
          autoEnabled: false,
          bleEnabled: false,
          rnodeEnabled: false
        });
        await controller.applyInterfaceConfig();
      }
    },
    async enable(kind: RelayInterfaceKind, options?: Record<string, unknown>): Promise<void> {
      if (kindToEnabled(kind, controller.getFlags()) === null) {
        return;
      }
      if (kind === "tcp") {
        const host = typeof options?.targetHost === "string" ? options.targetHost : undefined;
        const port = typeof options?.targetPort === "number" ? options.targetPort : 4242;
        if (host !== undefined) {
          controller.setTcpTarget?.(host, port);
        }
        controller.setFlags({ tcpEnabled: true });
      } else if (kind === "auto") {
        controller.setFlags({ autoEnabled: true });
      } else if (kind === "bluetooth") {
        controller.setFlags({ bleEnabled: true });
      } else if (kind === "rnode") {
        if (options !== undefined) {
          controller.setRnodeOptions?.(options);
        }
        controller.setFlags({ rnodeEnabled: true });
      }
      await controller.applyInterfaceConfig();
    },
    async disable(kind: RelayInterfaceKind): Promise<void> {
      if (kindToEnabled(kind, controller.getFlags()) === null) {
        return;
      }
      if (kind === "tcp") controller.setFlags({ tcpEnabled: false });
      else if (kind === "auto") controller.setFlags({ autoEnabled: false });
      else if (kind === "bluetooth") controller.setFlags({ bleEnabled: false });
      else if (kind === "rnode") controller.setFlags({ rnodeEnabled: false });
      await controller.applyInterfaceConfig();
    },
    async setDirection(kind: RelayInterfaceKind, direction: InterfaceDirection): Promise<void> {
      if (kindToEnabled(kind, controller.getFlags()) === null) {
        return;
      }
      directions.set(kind, direction);
    },
    async configure(kind: RelayInterfaceKind, patch: Record<string, unknown>): Promise<void> {
      await this.enable(kind, patch);
    },
    async setPolicy(next: RelayPolicyMatrix): Promise<void> {
      policy = next;
    },
    list,
    status(): RelayStatus {
      const interfaces = list();
      return {
        mode,
        interfaces,
        onlineCount: interfaces.filter((entry) => entry.online).length
      };
    },
    async diagnostics(): Promise<ReadonlyArray<InterfaceDiagnostic>> {
      void policy;
      const flags = controller.getFlags();
      const managed = MANAGED_KINDS.map((kind) => {
        const enabled = kindToEnabled(kind, flags) === true;
        const online = kindToOnline(kind, flags);
        return {
          kind,
          state: (enabled ? (online ? "available" : "offline") : "policy-disabled") as InterfaceDiagnostic["state"],
          ...(enabled && !online ? { reason: "interface enabled but not online" } : {})
        };
      });
      const unsupported: RelayInterfaceKind[] = ["websocket", "i2p", "optical", "acoustic", "ntfy", "freenet"];
      return [
        ...managed,
        ...unsupported.map((kind) => ({
          kind,
          state: "unsupported" as const,
          reason: "not managed by this worklet control plane"
        }))
      ];
    }
  };
}
