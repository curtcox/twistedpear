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
  requiredPassphrase
} from "./helpers.js";

/**
 * Freenet node config for `tp node`.
 * `--freenet` / `--freenet-node` point at an external WebSocket URL.
 * `--freenet-binary` supervises a user-supplied, optionally hash-verified
 * executable (ephemeral port + generated token; not redistributed by TP).
 */
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
  const expectedSha256 = parseFlag(args, "--freenet-binary-sha256") ?? undefined;
  const wantSupervise = binaryPath !== null || hasFlag(args, "--freenet-supervise");
  const wantFreenet =
    hasFlag(args, "--freenet") ||
    hasFlag(args, "--freenet-interface") ||
    parseFlag(args, "--freenet-node") !== null ||
    wantSupervise;
  if (!wantFreenet) {
    return { config: null, supervise: null, logLines: [] };
  }

  if (wantSupervise && binaryPath === null) {
    throw new Error("--freenet-supervise requires --freenet-binary <path>");
  }
  if (expectedSha256 !== undefined && !/^[0-9a-fA-F]{64}$/.test(expectedSha256)) {
    throw new Error("--freenet-binary-sha256 must be 64 hex characters");
  }

  const url =
    parseFlag(args, "--freenet-node") ??
    parseOptionalFlagValue(args, "--freenet") ??
    "ws://127.0.0.1:50509/v1/contract/command";
  const authToken = parseFlag(args, "--freenet-token") ?? undefined;
  const interfaceEnabled = hasFlag(args, "--freenet-interface");
  let rendezvousHex = parseFlag(args, "--freenet-rendezvous") ?? undefined;
  const directionFlag = parseFlag(args, "--freenet-direction");
  const localDirection =
    directionFlag === null ? undefined : Number(directionFlag);
  const logLines: string[] = [];

  if (
    localDirection !== undefined &&
    localDirection !== 0 &&
    localDirection !== 1
  ) {
    throw new Error("--freenet-direction must be 0 or 1");
  }

  if (interfaceEnabled) {
    if (rendezvousHex === undefined) {
      const bytes = new Uint8Array(32);
      globalThis.crypto.getRandomValues(bytes);
      rendezvousHex = bytesToHex(bytes);
      logLines.push(
        `Freenet HDLC rendezvous (share with peer): ${rendezvousHex}`
      );
    } else if (!/^[0-9a-fA-F]{64}$/.test(rendezvousHex)) {
      throw new Error("--freenet-rendezvous must be 64 hex characters (32 bytes)");
    }
  } else if (rendezvousHex !== undefined && !/^[0-9a-fA-F]{64}$/.test(rendezvousHex)) {
    throw new Error("--freenet-rendezvous must be 64 hex characters (32 bytes)");
  }

  if (wantSupervise) {
    logLines.push(
      `Freenet supervision enabled for user-supplied binary ${binaryPath} (hash-verified when --freenet-binary-sha256 is set)`
    );
  } else {
    logLines.push(
      interfaceEnabled
        ? `Freenet HDLC interface enabled against ${url} (external node; not bundled)`
        : `Freenet URL configured for contracts/propagation mirror: ${url} (external node; not bundled)`
    );
  }

  return {
    config: wantSupervise
      ? {
          enabled: interfaceEnabled,
          url: "ws://127.0.0.1:0/v1/contract/command",
          ...(rendezvousHex === undefined ? {} : { rendezvousHex }),
          ...(localDirection === undefined
            ? {}
            : { localDirection: localDirection as 0 | 1 })
        }
      : {
          enabled: interfaceEnabled,
          url,
          ...(authToken === undefined ? {} : { authToken }),
          ...(rendezvousHex === undefined ? {} : { rendezvousHex }),
          ...(localDirection === undefined
            ? {}
            : { localDirection: localDirection as 0 | 1 })
        },
    supervise:
      binaryPath === null
        ? null
        : {
            binaryPath,
            ...(expectedSha256 === undefined ? {} : { expectedSha256 })
          },
    logLines
  };
}

export async function runNode(ctx: CommandContext): Promise<number> {
  const { resolveHostConfig, FreenetSupervisor } = await import("@twistedpear/host-core");
  const { runNodeHost } = await import("@twistedpear/host-core");
  const dataDir = parseFlag(ctx.args, "--data-dir");
  const attachRnsd = parseFlag(ctx.args, "--attach-rnsd");
  const wsListen = parseOptionalFlag(ctx.args, "--ws-listen");
  const wsToken = parseFlag(ctx.args, "--ws-token");
  const serveWeb = parseOptionalFlag(ctx.args, "--serve-web");
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
      }
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
        : { localDirection: freenet.config.localDirection })
    };
    console.log(
      `Freenet supervised node online at ${snapshot.wsUrl} (user-supplied binary; not redistributed)`
    );
  }

  const statusEndpointPort = parseStatusEndpointPort(ctx.args);
  const testAgent = parseTestAgentArg(parseOptionalFlagValue(ctx.args, "--test-agent"));

  const config = resolveHostConfig({
    ...(dataDir === null ? {} : { dataDir: resolveFromCwd(ctx.cwd, dataDir) }),
    overrides: {
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
              })()
      },
      interfaces: {
        ...(wsListen === null && serveWeb === null && wsToken === null
          ? {}
          : {
              websocket: {
                enabled: true,
                ...(wsListen === null ? {} : parseWsListenArg(wsListen)),
                ...(wsToken === null ? {} : { sharedToken: wsToken }),
                ...(serveWeb === null
                  ? {}
                  : { staticRoot: serveWeb === "" ? resolveFromCwd(ctx.cwd, "dist/web-host") : resolveFromCwd(ctx.cwd, serveWeb) })
              }
            }),
        ...(freenetConfig === null ? {} : { freenet: freenetConfig })
      },
      statusEndpoint: hasFlag(ctx.args, "--status-endpoint"),
      ...(statusEndpointPort === null ? {} : { statusEndpointPort }),
      ...(testAgent === null ? {} : { testAgent })
    }
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
