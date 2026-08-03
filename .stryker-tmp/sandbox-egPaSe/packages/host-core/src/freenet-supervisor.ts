// @ts-nocheck
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes
} from "node:crypto";
import { createServer } from "node:net";
import {
  chmodSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import {
  spawn,
  type SpawnOptionsWithoutStdio
} from "node:child_process";

export type FreenetSupervisorStatus =
  | "stopped"
  | "starting"
  | "online"
  | "degraded"
  | "failed";

export interface FreenetSupervisorSpawnResult {
  readonly stdout: NodeJS.ReadableStream;
  readonly stderr: NodeJS.ReadableStream;
  readonly pid?: number | undefined;
  kill(signal?: NodeJS.Signals | number): boolean;
  readonly exitCode: number | null;
  readonly signalCode: NodeJS.Signals | null;
  once(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): void;
  on(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): void;
  off?(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): void;
}

export type FreenetSupervisorSpawner = (
  command: string,
  args: ReadonlyArray<string>,
  options: {
    readonly env?: NodeJS.ProcessEnv;
    readonly stdio?: SpawnOptionsWithoutStdio["stdio"];
  }
) => FreenetSupervisorSpawnResult;

export interface FreenetSupervisorOptions {
  /** Absolute path to a user-supplied Freenet executable. */
  readonly binaryPath: string;
  /** Optional expected SHA-256 (hex) of the binary; verified before start. */
  readonly expectedSha256?: string;
  /** Host data directory; node state is isolated under `<dataDir>/freenet-node`. */
  readonly dataDir: string;
  readonly host?: string;
  readonly readyTimeoutMs?: number;
  readonly maxRestartAttempts?: number;
  readonly initialBackoffMs?: number;
  readonly maxBackoffMs?: number;
  readonly onStatus?: (status: FreenetSupervisorStatus, detail?: string) => void;
  readonly spawner?: FreenetSupervisorSpawner;
  readonly allocatePort?: () => Promise<number>;
  readonly createToken?: () => string;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly readyCheck?: (port: number, token: string) => Promise<boolean>;
}

export interface FreenetSupervisorSnapshot {
  readonly status: FreenetSupervisorStatus;
  readonly wsUrl: string | null;
  readonly authToken: string | null;
  readonly port: number | null;
  readonly restartAttempts: number;
  readonly lastError: string | null;
  readonly binaryPath: string;
  readonly stateDir: string;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function allocateEphemeralPort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Failed to allocate ephemeral port"));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest("hex");
}

function writeGatewayTransportKey(path: string): void {
  const secret = randomBytes(32);
  writeFileSync(path, `${Buffer.from(secret).toString("hex")}\n`, {
    mode: 0o600
  });
  // Validate the secret is a usable X25519 key before handing it to Freenet.
  const pkcs8Prefix = Buffer.from("302e020100300506032b656e04220420", "hex");
  const privateKey = createPrivateKey({
    key: Buffer.concat([pkcs8Prefix, Buffer.from(secret)]),
    format: "der",
    type: "pkcs8"
  });
  createPublicKey(privateKey);
  chmodSync(path, 0o600);
}

function defaultSpawner(
  command: string,
  args: ReadonlyArray<string>,
  options: {
    readonly env?: NodeJS.ProcessEnv;
    readonly stdio?: SpawnOptionsWithoutStdio["stdio"];
  }
): FreenetSupervisorSpawnResult {
  return spawn(command, [...args], {
    ...options,
    stdio: ["ignore", "pipe", "pipe"]
  }) as unknown as FreenetSupervisorSpawnResult;
}

async function defaultReadyCheck(port: number, _token: string): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      signal: AbortSignal.timeout(1_500)
    });
    return response.ok || response.status === 401 || response.status === 404;
  } catch {
    return false;
  }
}

/**
 * Supervises a user-supplied, optionally hash-verified Freenet executable.
 * Leaves all non-Freenet host paths usable when the process is unavailable.
 */
export class FreenetSupervisor {
  readonly #options: FreenetSupervisorOptions;
  readonly #stateDir: string;
  readonly #homeDir: string;
  #status: FreenetSupervisorStatus = "stopped";
  #child: FreenetSupervisorSpawnResult | null = null;
  #port: number | null = null;
  #networkPort: number | null = null;
  #authToken: string | null = null;
  #restartAttempts = 0;
  #stopping = false;
  #lastError: string | null = null;
  #startGeneration = 0;

  constructor(options: FreenetSupervisorOptions) {
    this.#options = options;
    this.#stateDir = join(options.dataDir, "freenet-node");
    this.#homeDir = join(this.#stateDir, "home");
  }

  get status(): FreenetSupervisorStatus {
    return this.#status;
  }

  snapshot(): FreenetSupervisorSnapshot {
    return {
      status: this.#status,
      wsUrl: this.wsUrl,
      authToken: this.#authToken,
      port: this.#port,
      restartAttempts: this.#restartAttempts,
      lastError: this.#lastError,
      binaryPath: this.#options.binaryPath,
      stateDir: this.#stateDir
    };
  }

  get wsUrl(): string | null {
    if (this.#port === null) return null;
    return `ws://127.0.0.1:${this.#port}/v1/contract/command`;
  }

  /** Auth token for the local API. Never include this in URLs or log lines. */
  get authToken(): string | null {
    return this.#authToken;
  }

  async start(): Promise<FreenetSupervisorSnapshot> {
    if (this.#status === "online" || this.#status === "starting") {
      return this.snapshot();
    }

    this.#stopping = false;
    this.#restartAttempts = 0;
    this.#lastError = null;
    await this.#verifyBinary();
    mkdirSync(join(this.#stateDir, "config"), { recursive: true });
    mkdirSync(join(this.#stateDir, "data"), { recursive: true });
    mkdirSync(join(this.#stateDir, "logs"), { recursive: true });
    // Isolate Freenet app-support paths so a supervised node cannot pick up a
    // host-wide gateways.toml or collide with a concurrent Freenet.app install.
    const support = join(
      this.#homeDir,
      "Library",
      "Application Support",
      "The-Freenet-Project-Inc.Freenet"
    );
    mkdirSync(support, { recursive: true });
    writeFileSync(join(support, "gateways.toml"), "gateways = []\n");
    await this.#launch(false);
    return this.snapshot();
  }

  async stop(): Promise<void> {
    this.#stopping = true;
    this.#startGeneration += 1;
    const child = this.#child;
    this.#child = null;
    if (child !== null && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await this.#waitForExit(child, 5_000);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await this.#waitForExit(child, 1_000);
      }
    }
    this.#setStatus("stopped");
    this.#port = null;
    this.#networkPort = null;
    this.#authToken = null;
  }

  async #verifyBinary(): Promise<void> {
    if (!existsSync(this.#options.binaryPath)) {
      throw new Error(`Freenet binary not found: ${this.#options.binaryPath}`);
    }
    const expected = this.#options.expectedSha256;
    if (expected === undefined) return;
    const actual = await sha256File(this.#options.binaryPath);
    if (actual.toLowerCase() !== expected.toLowerCase()) {
      throw new Error(
        `Freenet binary SHA-256 mismatch (expected ${expected}, got ${actual})`
      );
    }
  }

  async #launch(isRestart: boolean): Promise<void> {
    const generation = ++this.#startGeneration;
    this.#setStatus("starting", isRestart ? "restarting after unexpected exit" : undefined);

    const allocatePort = this.#options.allocatePort ?? allocateEphemeralPort;
    const createToken =
      this.#options.createToken ?? (() => randomBytes(32).toString("hex"));
    const spawner = this.#options.spawner ?? defaultSpawner;
    const host = this.#options.host ?? "127.0.0.1";

    this.#port = await allocatePort();
    this.#networkPort = await allocatePort();
    this.#authToken = createToken();

    const transportKeyPath = join(this.#stateDir, "gateway-x25519-secret");
    writeGatewayTransportKey(transportKeyPath);

    // Freenet 0.2.112 refuses a bare network node without gateways. Supervise
    // a loopback-only gateway so a user-supplied binary can serve the local
    // WS API without joining the public network.
    const args = [
      "network",
      "--ws-api-address",
      host,
      "--ws-api-port",
      String(this.#port),
      "--network-address",
      host,
      "--network-port",
      String(this.#networkPort),
      "--public-network-address",
      host,
      "--public-network-port",
      String(this.#networkPort),
      "--config-dir",
      join(this.#stateDir, "config"),
      "--data-dir",
      join(this.#stateDir, "data"),
      "--log-dir",
      join(this.#stateDir, "logs"),
      "--skip-load-from-network",
      "--is-gateway",
      "--transport-keypair",
      transportKeyPath,
      "--min-number-of-connections",
      "0",
      "--max-number-of-connections",
      "4",
      "--disable-auto-update"
    ];

    // Auth token is held for TwistedPear clients and never placed in wsUrl,
    // argv, or supervisor status logs. Bind loopback-only so the local API
    // is not exposed on other interfaces.
    const child = spawner(this.#options.binaryPath, args, {
      env: {
        ...process.env,
        HOME: this.#homeDir,
        FREENET_TELEMETRY_ENABLED: "false"
      }
    });
    this.#child = child;

    child.stdout.setEncoding?.("utf8");
    child.stderr.setEncoding?.("utf8");
    child.stderr.on?.("data", (chunk: string | Buffer) => {
      const text = redactFreenetAuthToken(String(chunk), this.#authToken);
      if (text.toLowerCase().includes("error")) {
        this.#lastError = text.trim().slice(-500);
      }
    });

    child.once("exit", (code, signal) => {
      void this.#onExit(generation, code, signal);
    });

    const ready = await this.#waitUntilReady();
    if (generation !== this.#startGeneration) return;
    if (!ready) {
      this.#lastError = `Freenet node did not become ready on port ${this.#port}`;
      this.#stopping = true;
      this.#startGeneration += 1;
      child.kill("SIGTERM");
      this.#child = null;
      this.#setStatus("failed", this.#lastError);
      throw new Error(this.#lastError);
    }

    this.#restartAttempts = isRestart ? this.#restartAttempts : 0;
    this.#setStatus("online");
  }

  async #waitUntilReady(): Promise<boolean> {
    const timeoutMs = this.#options.readyTimeoutMs ?? 30_000;
    const sleep = this.#options.sleep ?? defaultSleep;
    const readyCheck = this.#options.readyCheck ?? defaultReadyCheck;
    const deadline = (this.#options.now ?? Date.now)() + timeoutMs;
    while ((this.#options.now ?? Date.now)() < deadline) {
      if (this.#stopping || this.#port === null || this.#authToken === null) {
        return false;
      }
      if (await readyCheck(this.#port, this.#authToken)) {
        return true;
      }
      await sleep(200);
    }
    return false;
  }

  async #onExit(
    generation: number,
    code: number | null,
    signal: NodeJS.Signals | null
  ): Promise<void> {
    if (generation !== this.#startGeneration) return;
    this.#child = null;
    if (this.#stopping) {
      this.#setStatus("stopped");
      return;
    }

    this.#lastError = `Freenet process exited (code=${code}, signal=${signal})`;
    const maxAttempts = this.#options.maxRestartAttempts ?? 5;
    if (this.#restartAttempts >= maxAttempts) {
      this.#setStatus("failed", this.#lastError);
      return;
    }

    this.#setStatus("degraded", this.#lastError);
    this.#restartAttempts += 1;
    const initial = this.#options.initialBackoffMs ?? 500;
    const maxBackoff = this.#options.maxBackoffMs ?? 30_000;
    const delay = Math.min(maxBackoff, initial * 2 ** (this.#restartAttempts - 1));
    const sleep = this.#options.sleep ?? defaultSleep;
    await sleep(delay);
    if (this.#stopping || generation !== this.#startGeneration) return;
    try {
      await this.#launch(true);
    } catch (error) {
      this.#lastError = error instanceof Error ? error.message : String(error);
      this.#setStatus("failed", this.#lastError);
    }
  }

  #setStatus(status: FreenetSupervisorStatus, detail?: string): void {
    this.#status = status;
    this.#options.onStatus?.(status, detail);
  }

  #waitForExit(
    child: FreenetSupervisorSpawnResult,
    timeoutMs: number
  ): Promise<void> {
    if (child.exitCode !== null || child.signalCode !== null) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}

/** Redact auth tokens from strings destined for logs or UI dumps. */
export function redactFreenetAuthToken(
  text: string,
  token: string | null | undefined
): string {
  if (token === undefined || token === null || token.length === 0) {
    return text;
  }
  return text.split(token).join("[redacted-token]");
}

export function readOptionalSha256File(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return readFileSync(path, "utf8").trim().split(/\s+/)[0];
}
