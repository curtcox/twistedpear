import { bytesToHex } from "@twistedpear/reticulum-ts";
import { resolveFromCwd } from "../config.js";
import {
  type CommandContext,
  hasFlag,
  parseFlag,
  parseOptionalFlag,
  parseOptionalFlagValue,
  parseStatusEndpointPort,
  parseTestAgentArg,
  parseWsListenArg,
  requiredPassphrase,
} from "./helpers.js";

/**
 * Freenet node config for `tp node`.
 * `--freenet` / `--freenet-node` point at an external WebSocket URL.
 * `--freenet-binary` supervises a user-supplied, optionally hash-verified
 * executable (ephemeral port + generated token; not redistributed by TP).
 */
function wantFreenetNode(args: ReadonlyArray<string>, wantSupervise: boolean): boolean {
  return (
    hasFlag(args, "--freenet") ||
    hasFlag(args, "--freenet-interface") ||
    parseFlag(args, "--freenet-node") !== null ||
    wantSupervise
  );
}

function requireHex64(value: string, flag: string, extra = ""): void {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${flag} must be 64 hex characters${extra}`);
  }
}

function resolveRendezvousHex(
  args: ReadonlyArray<string>,
  interfaceEnabled: boolean,
  logLines: string[],
): string | undefined {
  let rendezvousHex = parseFlag(args, "--freenet-rendezvous") ?? undefined;
  if (interfaceEnabled && rendezvousHex === undefined) {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    rendezvousHex = bytesToHex(bytes);
    logLines.push(
      `Freenet HDLC rendezvous (share with peer): ${rendezvousHex}`,
    );
    return rendezvousHex;
  }
  if (rendezvousHex !== undefined) {
    requireHex64(rendezvousHex, "--freenet-rendezvous", " (32 bytes)");
  }
  return rendezvousHex;
}

export function resolveFreenetNodeFlags(args: ReadonlyArray<string>): {
  readonly config: {
    readonly enabled: boolean;
    readonly url: string;
    readonly authToken?: string;
    readonly rendezvousHex?: string;
    readonly localDirection?: 0 | 1;
  } | null;
  readonly supervise: {
    readonly binaryPath: string;
    readonly expectedSha256?: string;
  } | null;
  readonly logLines: ReadonlyArray<string>;
} {
  const binaryPath = parseFlag(args, "--freenet-binary");
  const expectedSha256 =
    parseFlag(args, "--freenet-binary-sha256") ?? undefined;
  const wantSupervise =
    binaryPath !== null || hasFlag(args, "--freenet-supervise");
  if (!wantFreenetNode(args, wantSupervise)) {
    return { config: null, supervise: null, logLines: [] };
  }

  if (wantSupervise && binaryPath === null) {
    throw new Error("--freenet-supervise requires --freenet-binary <path>");
  }
  if (expectedSha256 !== undefined) {
    requireHex64(expectedSha256, "--freenet-binary-sha256");
  }

  const url =
    parseFlag(args, "--freenet-node") ??
    parseOptionalFlagValue(args, "--freenet") ??
    "ws://127.0.0.1:50509/v1/contract/command";
  const authToken = parseFlag(args, "--freenet-token") ?? undefined;
  const interfaceEnabled = hasFlag(args, "--freenet-interface");
  const logLines: string[] = [];
  const rendezvousHex = resolveRendezvousHex(
    args,
    interfaceEnabled,
    logLines,
  );
  const localDirection = parseLocalDirection(args);

  pushFreenetLog(
    logLines,
    wantSupervise,
    binaryPath,
    interfaceEnabled,
    url,
  );

  return {
    config: freenetNodeConfig({
      wantSupervise,
      interfaceEnabled,
      url,
      authToken,
      rendezvousHex,
      localDirection,
    }),
    supervise: freenetSupervise(binaryPath, expectedSha256),
    logLines,
  };
}

function freenetSupervise(
  binaryPath: string | null,
  expectedSha256: string | undefined,
): {
  readonly binaryPath: string;
  readonly expectedSha256?: string;
} | null {
  if (binaryPath === null) return null;
  return {
    binaryPath,
    ...(expectedSha256 === undefined ? {} : { expectedSha256 }),
  };
}

function parseLocalDirection(args: ReadonlyArray<string>): 0 | 1 | undefined {
  const directionFlag = parseFlag(args, "--freenet-direction");
  if (directionFlag === null) return undefined;
  const localDirection = Number(directionFlag);
  if (localDirection !== 0 && localDirection !== 1) {
    throw new Error("--freenet-direction must be 0 or 1");
  }
  return localDirection;
}

function pushFreenetLog(
  logLines: string[],
  wantSupervise: boolean,
  binaryPath: string | null,
  interfaceEnabled: boolean,
  url: string,
): void {
  if (wantSupervise) {
    logLines.push(
      `Freenet supervision enabled for user-supplied binary ${binaryPath} (hash-verified when --freenet-binary-sha256 is set)`,
    );
    return;
  }
  logLines.push(
    interfaceEnabled
      ? `Freenet HDLC interface enabled against ${url} (external node; not bundled)`
      : `Freenet URL configured for contracts/propagation mirror: ${url} (external node; not bundled)`,
  );
}

function freenetNodeConfig(input: {
  readonly wantSupervise: boolean;
  readonly interfaceEnabled: boolean;
  readonly url: string;
  readonly authToken: string | undefined;
  readonly rendezvousHex: string | undefined;
  readonly localDirection: number | undefined;
}): {
  readonly enabled: boolean;
  readonly url: string;
  readonly authToken?: string;
  readonly rendezvousHex?: string;
  readonly localDirection?: 0 | 1;
} {
  const extras = {
    ...(input.rendezvousHex === undefined ? {} : { rendezvousHex: input.rendezvousHex }),
    ...(input.localDirection === undefined
      ? {}
      : { localDirection: input.localDirection as 0 | 1 }),
  };
  if (input.wantSupervise) {
    return {
      enabled: input.interfaceEnabled,
      url: "ws://127.0.0.1:0/v1/contract/command",
      ...extras,
    };
  }
  return {
    enabled: input.interfaceEnabled,
    url: input.url,
    ...(input.authToken === undefined ? {} : { authToken: input.authToken }),
    ...extras,
  };
}

const RELAY_KINDS = [
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
] as const;

function repeatedFlagValues(
  args: ReadonlyArray<string>,
  flag: string,
): ReadonlyArray<string> {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag) {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--"))
        throw new Error(`${flag} requires a value`);
      values.push(value);
      index += 1;
    }
  }
  return values;
}

function relayModeFlag(
  args: ReadonlyArray<string>,
): "off" | "bridge" | "transport-node" | null {
  const value = parseFlag(args, "--relay-mode");
  if (
    value === null ||
    value === "off" ||
    value === "bridge" ||
    value === "transport-node"
  )
    return value;
  throw new Error("--relay-mode must be off, bridge, or transport-node");
}

function relayDirectionFlag(args: ReadonlyArray<string>): "tx" | "rx" | "both" {
  const value = parseFlag(args, "--direction") ?? "both";
  if (value === "tx" || value === "rx" || value === "both") return value;
  throw new Error("--direction must be tx, rx, or both");
}

function applyNtfyFlags(
  args: ReadonlyArray<string>,
  interfaces: Record<string, Record<string, unknown>>,
  direction: string,
): void {
  const fields = {
    baseUrl: parseFlag(args, "--ntfy-server"),
    topic: parseFlag(args, "--ntfy-topic"),
    secret: parseFlag(args, "--ntfy-secret"),
    bearerToken: parseFlag(args, "--ntfy-token"),
  };
  if (!Object.values(fields).some((value) => value !== null)) return;
  interfaces.ntfy = {
    ...(interfaces.ntfy ?? {}),
    enabled: interfaces.ntfy?.enabled ?? true,
    direction: interfaces.ntfy?.direction ?? direction,
    ...Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== null),
    ),
  };
}

function applyDeviceFlags(
  args: ReadonlyArray<string>,
  interfaces: Record<string, Record<string, unknown>>,
  direction: string,
): void {
  const rnodePort = parseFlag(args, "--rnode-port");
  if (rnodePort !== null)
    interfaces.rnode = {
      ...(interfaces.rnode ?? {}),
      enabled: true,
      direction,
      portPath: rnodePort,
    };
  const i2pPeer = parseFlag(args, "--i2p-peer");
  if (i2pPeer !== null)
    interfaces.i2p = {
      ...(interfaces.i2p ?? {}),
      enabled: true,
      direction,
      peerDestination: i2pPeer,
    };
}

/** Resolve the uniform relay/interface flags shared by headless host deployments. */
export function resolveRelayNodeFlags(args: ReadonlyArray<string>): {
  readonly relay: { readonly mode: "off" | "bridge" | "transport-node" } | null;
  readonly interfaces: Record<string, Record<string, unknown>>;
} {
  const modeValue = relayModeFlag(args);
  const direction = relayDirectionFlag(args);
  const enabled = repeatedFlagValues(args, "--enable");
  const disabled = repeatedFlagValues(args, "--disable");
  for (const kind of [...enabled, ...disabled]) {
    if (!(RELAY_KINDS as ReadonlyArray<string>).includes(kind))
      throw new Error(`Unknown relay interface kind: ${kind}`);
  }
  const interfaces: Record<string, Record<string, unknown>> = {};
  for (const kind of enabled)
    interfaces[kind] = { enabled: true, direction, relay: true };
  for (const kind of disabled)
    interfaces[kind] = { ...(interfaces[kind] ?? {}), enabled: false };

  applyNtfyFlags(args, interfaces, direction);
  applyDeviceFlags(args, interfaces, direction);

  return {
    relay: modeValue === null ? null : { mode: modeValue },
    interfaces,
  };
}

// eslint-disable-next-line max-lines-per-function -- startup composes independently tested flag resolvers and host lifecycles.
export async function runNode(ctx: CommandContext): Promise<number> {
  const { resolveHostConfig, FreenetSupervisor } =
    await import("@twistedpear/host-core");
  const { runNodeHost } = await import("@twistedpear/host-core");
  const dataDir = parseFlag(ctx.args, "--data-dir");
  const attachRnsd = parseFlag(ctx.args, "--attach-rnsd");
  const wsListen = parseOptionalFlag(ctx.args, "--ws-listen");
  const wsToken = parseFlag(ctx.args, "--ws-token");
  const serveWeb = parseOptionalFlag(ctx.args, "--serve-web");
  const relayFlags = resolveRelayNodeFlags(ctx.args);
  const freenet = resolveFreenetNodeFlags(ctx.args);
  if (freenet.logLines.length > 0) {
    for (const line of freenet.logLines) {
      console.log(line);
    }
  }

  let supervisor: InstanceType<typeof FreenetSupervisor> | null = null;
  let freenetConfig = freenet.config;
  if (freenet.supervise !== null) {
    const resolvedDataDir =
      dataDir === null
        ? resolveHostConfig({}).dataDir
        : resolveFromCwd(ctx.cwd, dataDir);
    supervisor = new FreenetSupervisor({
      binaryPath: freenet.supervise.binaryPath,
      ...(freenet.supervise.expectedSha256 === undefined
        ? {}
        : { expectedSha256: freenet.supervise.expectedSha256 }),
      dataDir: resolvedDataDir,
      onStatus: (status, detail) => {
        const suffix = detail === undefined ? "" : `: ${detail}`;
        console.log(`Freenet supervisor ${status}${suffix}`);
      },
    });
    const snapshot = await supervisor.start();
    if (snapshot.wsUrl === null) {
      throw new Error("Freenet supervisor started without a WebSocket URL");
    }
    freenetConfig = {
      enabled: freenet.config?.enabled ?? false,
      url: snapshot.wsUrl,
      ...(snapshot.authToken === null ? {} : { authToken: snapshot.authToken }),
      ...(freenet.config?.rendezvousHex === undefined
        ? {}
        : { rendezvousHex: freenet.config.rendezvousHex }),
      ...(freenet.config?.localDirection === undefined
        ? {}
        : { localDirection: freenet.config.localDirection }),
    };
    console.log(
      `Freenet supervised node online at ${snapshot.wsUrl} (user-supplied binary; not redistributed)`,
    );
  }

  const statusEndpointPort = parseStatusEndpointPort(ctx.args);
  const testAgent = parseTestAgentArg(
    parseOptionalFlagValue(ctx.args, "--test-agent"),
  );

  const config = resolveHostConfig({
    ...(dataDir === null ? {} : { dataDir: resolveFromCwd(ctx.cwd, dataDir) }),
    overrides: {
      ...(relayFlags.relay === null ? {} : { relay: relayFlags.relay }),
      roles: {
        transport: !hasFlag(ctx.args, "--no-transport") && attachRnsd === null,
        seeder: !hasFlag(ctx.args, "--no-seeder"),
        propagation: hasFlag(ctx.args, "--propagation"),
        attachRnsd:
          attachRnsd === null
            ? null
            : (() => {
                const [host, portText] = attachRnsd.split(":");
                if (host === undefined || portText === undefined) {
                  throw new Error(`Invalid --attach-rnsd value: ${attachRnsd}`);
                }

                return { host, port: Number.parseInt(portText, 10) };
              })(),
      },
      interfaces: {
        ...relayFlags.interfaces,
        ...(wsListen === null && serveWeb === null && wsToken === null
          ? {}
          : {
              websocket: {
                enabled: true,
                ...(wsListen === null ? {} : parseWsListenArg(wsListen)),
                ...(wsToken === null ? {} : { sharedToken: wsToken }),
                ...(serveWeb === null
                  ? {}
                  : {
                      staticRoot:
                        serveWeb === ""
                          ? resolveFromCwd(ctx.cwd, "dist/web-host")
                          : resolveFromCwd(ctx.cwd, serveWeb),
                    }),
              },
            }),
        ...(freenetConfig === null ? {} : { freenet: freenetConfig }),
      },
      statusEndpoint: hasFlag(ctx.args, "--status-endpoint"),
      ...(statusEndpointPort === null ? {} : { statusEndpointPort }),
      ...(testAgent === null ? {} : { testAgent }),
    },
  });

  const stopSupervisor = async () => {
    if (supervisor !== null) {
      await supervisor.stop();
      supervisor = null;
    }
  };
  // Registering a signal listener suppresses the default termination, so the
  // handler has to exit itself once the supervised node is down.
  const shutdown = (signal: NodeJS.Signals) => {
    void stopSupervisor().finally(() => {
      process.exit(signal === "SIGINT" ? 130 : 143);
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await runNodeHost({ config, identityPassphrase: requiredPassphrase(ctx) });
    return 0;
  } finally {
    await stopSupervisor();
  }
}
