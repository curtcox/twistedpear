/**
 * Disposable self-hosted ntfy server for the peer-discovery rendezvous gate.
 *
 * Every instance is created, exercised, and destroyed inside one run: a pinned
 * image, a private container, a private volume, and a loopback-only port. The
 * public ntfy service is never contacted — see conformance/ntfy-service/run.mjs.
 */
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";

export const NTFY_IMAGE = "binwiederhier/ntfy:v2.11.0";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function docker(args, options = {}) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
}

function dockerChecked(args, options = {}) {
  const result = docker(args, options);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr]
      .filter((part) => part && part.trim().length > 0)
      .join("\n")
      .trim();
    throw new Error(
      `docker ${args.join(" ")} exited ${result.status}\n${detail}`,
    );
  }
  return result.stdout ?? "";
}

/** @returns {string | null} null when the daemon is reachable, else the reason. */
export function dockerUnavailableReason() {
  const result = docker(["info", "--format", "{{.ServerVersion}}"], {
    timeout: 20_000,
  });
  if (result.error) return `docker CLI not usable: ${result.error.message}`;
  if (result.status !== 0)
    return `docker daemon not reachable: ${(result.stderr ?? "").trim().split("\n").pop()}`;
  return null;
}

export function assertLoopbackOnly(url) {
  const parsed = new URL(url);
  if (!LOOPBACK_HOSTS.has(parsed.hostname))
    throw new Error(
      `refusing to use a non-loopback ntfy server (${parsed.hostname}); this gate must never touch a shared or public service`,
    );
}

/** @returns {"cached" | "pulled"} */
export function ensureImage() {
  const present = docker(["image", "inspect", NTFY_IMAGE], {
    stdio: "ignore",
    timeout: 30_000,
  });
  if (present.status === 0) return "cached";
  dockerChecked(["pull", NTFY_IMAGE], { timeout: 300_000 });
  return "pulled";
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** A container plus its volume, both removed by destroy(). */
export class DisposableNtfyServer {
  /** @param {{ name: string, auth?: boolean }} options */
  constructor(options) {
    this.name = options.name;
    this.auth = options.auth === true;
    this.volume = `${options.name}-data`;
    this.port = 0;
    this.token = null;
  }

  get baseUrl() {
    return `http://127.0.0.1:${this.port}`;
  }

  async start() {
    this.destroy();
    this.port = await freePort();
    const env = [
      `NTFY_BASE_URL=${this.baseUrl}`,
      "NTFY_LISTEN_HTTP=:80",
      "NTFY_CACHE_FILE=/var/lib/ntfy/cache.db",
      "NTFY_CACHE_DURATION=1h",
      "NTFY_ATTACHMENT_CACHE_DIR=",
      "NTFY_LOG_LEVEL=info",
    ];
    if (this.auth)
      env.push(
        "NTFY_AUTH_FILE=/var/lib/ntfy/user.db",
        "NTFY_AUTH_DEFAULT_ACCESS=deny-all",
      );
    dockerChecked([
      "run",
      "-d",
      "--name",
      this.name,
      "-p",
      `127.0.0.1:${this.port}:80`,
      "-v",
      `${this.volume}:/var/lib/ntfy`,
      ...env.flatMap((entry) => ["-e", entry]),
      NTFY_IMAGE,
      "serve",
    ]);
    await this.waitForHealth();
    if (this.auth) this.token = this.issueToken();
  }

  async restart() {
    dockerChecked(["start", this.name]);
    await this.waitForHealth();
  }

  stop() {
    dockerChecked(["stop", "-t", "1", this.name]);
  }

  async waitForHealth(timeoutMs = 45_000) {
    const deadline = Date.now() + timeoutMs;
    let lastError = "no response";
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`${this.baseUrl}/v1/health`);
        // deny-all servers answer health anonymously; any status proves the listener is up.
        if (response.status < 500) return;
        lastError = `status ${response.status}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      await sleep(250);
    }
    throw new Error(
      `${this.name} did not become healthy within ${timeoutMs}ms (${lastError})\n${this.logs()}`,
    );
  }

  /** Creates a scoped user plus a short-lived bearer token inside the container. */
  issueToken() {
    dockerChecked(
      [
        "exec",
        "-e",
        "NTFY_PASSWORD=disposable-run-password",
        this.name,
        "ntfy",
        "user",
        "add",
        "--role=user",
        "peer",
      ],
      { timeout: 30_000 },
    );
    dockerChecked(["exec", this.name, "ntfy", "access", "peer", "*", "rw"], {
      timeout: 30_000,
    });
    const created = docker(
      ["exec", this.name, "ntfy", "token", "add", "--expires", "1h", "peer"],
      { timeout: 30_000 },
    );
    // The ntfy CLI prints the created token on stderr.
    const output = `${created.stdout ?? ""}${created.stderr ?? ""}`;
    const token = /\b(tk_[a-z0-9]+)\b/.exec(output)?.[1];
    if (token === undefined)
      throw new Error(`could not parse an ntfy access token from: ${output}`);
    return token;
  }

  logs() {
    const result = docker(["logs", this.name], { timeout: 30_000 });
    return `${result.stdout ?? ""}${result.stderr ?? ""}`;
  }

  /** Counts byte-sequence hits inside a server-side file (message cache, user db). */
  countInFile(path, needle) {
    const result = docker(
      ["exec", this.name, "grep", "-c", "-a", needle, path],
      { timeout: 30_000 },
    );
    return Number.parseInt((result.stdout ?? "0").trim(), 10) || 0;
  }

  destroy() {
    docker(["rm", "-f", "-v", this.name], { stdio: "ignore" });
    docker(["volume", "rm", "-f", this.volume], { stdio: "ignore" });
  }

  exists() {
    const containers = dockerChecked([
      "ps",
      "-a",
      "--filter",
      `name=^/${this.name}$`,
      "--format",
      "{{.Names}}",
    ]).trim();
    const volumes = dockerChecked([
      "volume",
      "ls",
      "--filter",
      `name=^${this.volume}$`,
      "--format",
      "{{.Name}}",
    ]).trim();
    return { container: containers.length > 0, volume: volumes.length > 0 };
  }
}
