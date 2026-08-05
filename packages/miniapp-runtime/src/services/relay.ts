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
  | "ntfy"
  | "freenet";
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
  enable(
    kind: RelayInterfaceKind,
    options?: Record<string, unknown>,
  ): Promise<void>;
  disable(kind: RelayInterfaceKind): Promise<void>;
  setDirection(
    kind: RelayInterfaceKind,
    direction: InterfaceDirection,
  ): Promise<void>;
  configure(
    kind: RelayInterfaceKind,
    patch: Record<string, unknown>,
  ): Promise<void>;
  setPolicy(policy: RelayPolicyMatrix): Promise<void>;
  list(): ReadonlyArray<InterfaceStatus>;
  status(): RelayStatus;
  diagnostics(): Promise<ReadonlyArray<InterfaceDiagnostic>>;
}

export interface RelayMutationNotice {
  readonly appId: string;
  readonly method:
    | "setMode"
    | "enable"
    | "disable"
    | "setDirection"
    | "configure"
    | "setPolicy";
  readonly kind?: RelayInterfaceKind;
}

export class RelayBrokerServiceError extends Error {
  constructor(
    readonly code:
      "RELAY_UNCONFIGURED" | "RELAY_BAD_REQUEST" | "RELAY_UNSUPPORTED",
    message: string,
  ) {
    super(message);
    this.name = "RelayBrokerServiceError";
  }
}

const VALID_DIRECTIONS: ReadonlyArray<InterfaceDirection> = [
  "tx",
  "rx",
  "both",
];
const VALID_MODES: ReadonlyArray<RelayMode> = [
  "off",
  "bridge",
  "transport-node",
];
const VALID_KINDS: ReadonlyArray<RelayInterfaceKind> = [
  "tcp",
  "websocket",
  "auto",
  "i2p",
  "rnode",
  "bluetooth",
  "optical",
  "acoustic",
  "ntfy",
  "freenet",
];

const COMMON_FIELDS = ["enabled", "direction", "relay", "bitrateHint"] as const;
const KIND_FIELDS: Readonly<Record<RelayInterfaceKind, ReadonlyArray<string>>> =
  {
    tcp: ["mode", "targetHost", "targetPort", "listenPort"],
    websocket: [
      "listenHost",
      "listenPort",
      "path",
      "sharedToken",
      "staticRoot",
      "dhtRelay",
    ],
    auto: ["multicast", "bonjour"],
    i2p: ["samHost", "samPort", "peerDestination"],
    rnode: ["portPath", "baudRate"],
    bluetooth: ["pipeMtu", "deviceId"],
    optical: ["frameRate", "colorCodes"],
    acoustic: ["band", "bitrate"],
    ntfy: ["baseUrl", "topic", "secret", "bearerToken", "pollIntervalMs"],
    freenet: [
      "url",
      "authToken",
      "retentionPerDirection",
      "rendezvousHex",
      "localDirection",
      "propagationMirror",
    ],
  };

function badRequest(message: string): never {
  throw new RelayBrokerServiceError("RELAY_BAD_REQUEST", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertOptionalBoolean(
  record: Record<string, unknown>,
  key: string,
): void {
  if (record[key] !== undefined && typeof record[key] !== "boolean")
    badRequest(`${key} must be a boolean`);
}

function assertOptionalString(
  record: Record<string, unknown>,
  key: string,
): void {
  if (
    record[key] !== undefined &&
    (typeof record[key] !== "string" || record[key].length === 0)
  ) {
    badRequest(`${key} must be a non-empty string`);
  }
}

function assertOptionalPositiveNumber(
  record: Record<string, unknown>,
  key: string,
): void {
  const value = record[key];
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
  ) {
    badRequest(`${key} must be a positive finite number`);
  }
}

function validateOptionNames(
  kind: RelayInterfaceKind,
  record: Record<string, unknown>,
): void {
  const allowed = new Set<string>([...COMMON_FIELDS, ...KIND_FIELDS[kind]]);
  for (const key of Object.keys(record))
    if (!allowed.has(key)) badRequest(`Unknown ${kind} option: ${key}`);
}

function validateOptionScalars(record: Record<string, unknown>): void {
  for (const key of [
    "enabled",
    "relay",
    "multicast",
    "bonjour",
    "dhtRelay",
    "colorCodes",
    "propagationMirror",
  ]) {
    assertOptionalBoolean(record, key);
  }
  for (const key of [
    "bitrateHint",
    "targetPort",
    "listenPort",
    "samPort",
    "baudRate",
    "pipeMtu",
    "frameRate",
    "bitrate",
    "pollIntervalMs",
    "retentionPerDirection",
  ]) {
    assertOptionalPositiveNumber(record, key);
  }
  for (const key of [
    "targetHost",
    "listenHost",
    "path",
    "sharedToken",
    "staticRoot",
    "samHost",
    "peerDestination",
    "portPath",
    "deviceId",
    "baseUrl",
    "topic",
    "secret",
    "bearerToken",
    "url",
    "authToken",
    "rendezvousHex",
  ]) {
    assertOptionalString(record, key);
  }
}

function assertOptionalChoice(
  record: Record<string, unknown>,
  key: string,
  values: ReadonlyArray<unknown>,
  message: string,
): void {
  if (record[key] !== undefined && !values.includes(record[key]))
    badRequest(message);
}

function validateOptionChoices(record: Record<string, unknown>): void {
  assertOptionalChoice(
    record,
    "direction",
    VALID_DIRECTIONS,
    "Invalid interface direction",
  );
  assertOptionalChoice(
    record,
    "mode",
    ["client", "server"],
    "TCP mode must be client or server",
  );
  assertOptionalChoice(
    record,
    "band",
    ["audible", "ultrasonic"],
    "Acoustic band must be audible or ultrasonic",
  );
  assertOptionalChoice(
    record,
    "localDirection",
    [0, 1],
    "Freenet localDirection must be 0 or 1",
  );
  if (
    typeof record.rendezvousHex === "string" &&
    !/^[0-9a-fA-F]{64}$/.test(record.rendezvousHex)
  )
    badRequest("Freenet rendezvousHex must be 64 hexadecimal characters");
}

function validateInterfaceOptions(
  kind: RelayInterfaceKind,
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!isRecord(value)) badRequest(`${label} must be an object`);
  const record = value;
  validateOptionNames(kind, record);
  validateOptionScalars(record);
  validateOptionChoices(record);
  return record;
}

function validatePolicyRow(from: string, row: unknown): void {
  if (!VALID_KINDS.includes(from as RelayInterfaceKind))
    badRequest(`Invalid policy source: ${from}`);
  if (!isRecord(row)) badRequest(`Policy row ${from} must be an object`);
  for (const [to, allow] of Object.entries(row)) {
    if (!VALID_KINDS.includes(to as RelayInterfaceKind))
      badRequest(`Invalid policy destination: ${to}`);
    if (typeof allow !== "boolean")
      badRequest(`Policy ${from}→${to} must be a boolean`);
  }
}

function validatePolicy(value: unknown): RelayPolicyMatrix {
  if (!isRecord(value)) badRequest("Policy must be an object");
  for (const key of Object.keys(value))
    if (key !== "allow") badRequest(`Unknown policy field: ${key}`);
  if (value.allow === undefined) return {};
  if (!isRecord(value.allow)) badRequest("Policy allow must be an object");
  for (const [from, row] of Object.entries(value.allow))
    validatePolicyRow(from, row);
  return value as RelayPolicyMatrix;
}

export class RelayBrokerService {
  constructor(
    private readonly service: RelayService,
    private readonly onMutation?: (notice: RelayMutationNotice) => void,
  ) {}

  async setMode(_appId: string, payload: { mode: RelayMode }): Promise<void> {
    if (!VALID_MODES.includes(payload.mode)) {
      throw new RelayBrokerServiceError(
        "RELAY_BAD_REQUEST",
        "Invalid relay mode",
      );
    }
    await this.service.setMode(payload.mode);
    this.onMutation?.({ appId: _appId, method: "setMode" });
  }

  async enable(
    _appId: string,
    payload: { kind: RelayInterfaceKind; options?: Record<string, unknown> },
  ): Promise<void> {
    if (!VALID_KINDS.includes(payload.kind)) {
      throw new RelayBrokerServiceError(
        "RELAY_BAD_REQUEST",
        "Invalid interface kind",
      );
    }
    const options =
      payload.options === undefined
        ? undefined
        : validateInterfaceOptions(
            payload.kind,
            payload.options,
            "Interface options",
          );
    await this.service.enable(payload.kind, options);
    this.onMutation?.({ appId: _appId, method: "enable", kind: payload.kind });
  }

  async disable(
    _appId: string,
    payload: { kind: RelayInterfaceKind },
  ): Promise<void> {
    if (!VALID_KINDS.includes(payload.kind)) {
      throw new RelayBrokerServiceError(
        "RELAY_BAD_REQUEST",
        "Invalid interface kind",
      );
    }
    await this.service.disable(payload.kind);
    this.onMutation?.({ appId: _appId, method: "disable", kind: payload.kind });
  }

  async setDirection(
    _appId: string,
    payload: { kind: RelayInterfaceKind; direction: InterfaceDirection },
  ): Promise<void> {
    if (!VALID_KINDS.includes(payload.kind)) {
      throw new RelayBrokerServiceError(
        "RELAY_BAD_REQUEST",
        "Invalid interface kind",
      );
    }
    if (!VALID_DIRECTIONS.includes(payload.direction)) {
      throw new RelayBrokerServiceError(
        "RELAY_BAD_REQUEST",
        "Invalid interface direction",
      );
    }
    await this.service.setDirection(payload.kind, payload.direction);
    this.onMutation?.({
      appId: _appId,
      method: "setDirection",
      kind: payload.kind,
    });
  }

  async configure(
    _appId: string,
    payload: { kind: RelayInterfaceKind; patch: Record<string, unknown> },
  ): Promise<void> {
    if (!VALID_KINDS.includes(payload.kind)) {
      throw new RelayBrokerServiceError(
        "RELAY_BAD_REQUEST",
        "Invalid interface kind",
      );
    }
    await this.service.configure(
      payload.kind,
      validateInterfaceOptions(
        payload.kind,
        payload.patch,
        "Configuration patch",
      ),
    );
    this.onMutation?.({
      appId: _appId,
      method: "configure",
      kind: payload.kind,
    });
  }

  async setPolicy(
    _appId: string,
    payload: { policy: RelayPolicyMatrix },
  ): Promise<void> {
    await this.service.setPolicy(validatePolicy(payload.policy));
    this.onMutation?.({ appId: _appId, method: "setPolicy" });
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
