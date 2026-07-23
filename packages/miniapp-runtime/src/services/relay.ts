export type RelayMode = "off" | "bridge" | "transport-node";
export type RelayInterfaceKind =
  | "tcp"
  | "websocket"
  | "auto"
  | "i2p"
  | "rnode"
  | "bluetooth"
  | "optical"
  | "acoustic"
  | "ntfy";
export type InterfaceDirection = "tx" | "rx" | "both";

export interface InterfaceStatus {
  readonly kind: RelayInterfaceKind;
  readonly name: string;
  readonly enabled: boolean;
  readonly online: boolean;
  readonly direction: InterfaceDirection;
  readonly relay: boolean;
  readonly bitrate: number | null;
  readonly bytesIn: number;
  readonly bytesOut: number;
}

export type InterfaceDiagnosticState =
  | "available"
  | "permission-required"
  | "unsupported"
  | "offline"
  | "policy-disabled";

export interface InterfaceDiagnostic {
  readonly kind: RelayInterfaceKind;
  readonly state: InterfaceDiagnosticState;
  readonly reason?: string;
}

export interface RelayPolicyMatrix {
  readonly allow?: {
    readonly [From in RelayInterfaceKind]?: {
      readonly [To in RelayInterfaceKind]?: boolean;
    };
  };
}

export interface RelayStatus {
  readonly mode: RelayMode;
  readonly interfaces: ReadonlyArray<InterfaceStatus>;
  readonly onlineCount: number;
}

export interface RelayService {
  setMode(mode: RelayMode): Promise<void>;
  enable(kind: RelayInterfaceKind, options?: Record<string, unknown>): Promise<void>;
  disable(kind: RelayInterfaceKind): Promise<void>;
  setDirection(kind: RelayInterfaceKind, direction: InterfaceDirection): Promise<void>;
  configure(kind: RelayInterfaceKind, patch: Record<string, unknown>): Promise<void>;
  setPolicy(policy: RelayPolicyMatrix): Promise<void>;
  list(): ReadonlyArray<InterfaceStatus>;
  status(): RelayStatus;
  diagnostics(): Promise<ReadonlyArray<InterfaceDiagnostic>>;
}

export class RelayBrokerServiceError extends Error {
  constructor(
    readonly code: "RELAY_UNCONFIGURED" | "RELAY_BAD_REQUEST",
    message: string
  ) {
    super(message);
    this.name = "RelayBrokerServiceError";
  }
}

const VALID_DIRECTIONS: ReadonlyArray<InterfaceDirection> = ["tx", "rx", "both"];
const VALID_MODES: ReadonlyArray<RelayMode> = ["off", "bridge", "transport-node"];
const VALID_KINDS: ReadonlyArray<RelayInterfaceKind> = [
  "tcp",
  "websocket",
  "auto",
  "i2p",
  "rnode",
  "bluetooth",
  "optical",
  "acoustic",
  "ntfy"
];

export class RelayBrokerService {
  constructor(private readonly service: RelayService) {}

  async setMode(_appId: string, payload: { mode: RelayMode }): Promise<void> {
    if (!VALID_MODES.includes(payload.mode)) {
      throw new RelayBrokerServiceError("RELAY_BAD_REQUEST", "Invalid relay mode");
    }
    return this.service.setMode(payload.mode);
  }

  async enable(_appId: string, payload: { kind: RelayInterfaceKind; options?: Record<string, unknown> }): Promise<void> {
    if (!VALID_KINDS.includes(payload.kind)) {
      throw new RelayBrokerServiceError("RELAY_BAD_REQUEST", "Invalid interface kind");
    }
    return this.service.enable(payload.kind, payload.options);
  }

  async disable(_appId: string, payload: { kind: RelayInterfaceKind }): Promise<void> {
    if (!VALID_KINDS.includes(payload.kind)) {
      throw new RelayBrokerServiceError("RELAY_BAD_REQUEST", "Invalid interface kind");
    }
    return this.service.disable(payload.kind);
  }

  async setDirection(
    _appId: string,
    payload: { kind: RelayInterfaceKind; direction: InterfaceDirection }
  ): Promise<void> {
    if (!VALID_KINDS.includes(payload.kind)) {
      throw new RelayBrokerServiceError("RELAY_BAD_REQUEST", "Invalid interface kind");
    }
    if (!VALID_DIRECTIONS.includes(payload.direction)) {
      throw new RelayBrokerServiceError("RELAY_BAD_REQUEST", "Invalid interface direction");
    }
    return this.service.setDirection(payload.kind, payload.direction);
  }

  async configure(
    _appId: string,
    payload: { kind: RelayInterfaceKind; patch: Record<string, unknown> }
  ): Promise<void> {
    if (!VALID_KINDS.includes(payload.kind)) {
      throw new RelayBrokerServiceError("RELAY_BAD_REQUEST", "Invalid interface kind");
    }
    if (typeof payload.patch !== "object" || payload.patch === null) {
      throw new RelayBrokerServiceError("RELAY_BAD_REQUEST", "Configuration patch must be an object");
    }
    return this.service.configure(payload.kind, payload.patch);
  }

  async setPolicy(_appId: string, payload: { policy: RelayPolicyMatrix }): Promise<void> {
    if (typeof payload.policy !== "object" || payload.policy === null) {
      throw new RelayBrokerServiceError("RELAY_BAD_REQUEST", "Policy must be an object");
    }
    return this.service.setPolicy(payload.policy);
  }

  list(_appId: string): ReadonlyArray<InterfaceStatus> {
    return this.service.list();
  }

  status(_appId: string): RelayStatus {
    return this.service.status();
  }

  diagnostics(_appId: string): Promise<ReadonlyArray<InterfaceDiagnostic>> {
    return this.service.diagnostics();
  }
}
