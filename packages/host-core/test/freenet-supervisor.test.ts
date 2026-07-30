import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FreenetSupervisor,
  redactFreenetAuthToken,
  type FreenetSupervisorSpawnResult
} from "../src/freenet-supervisor.js";

class FakeChild extends EventEmitter implements FreenetSupervisorSpawnResult {
  readonly stdout = new Readable({ read() {} });
  readonly stderr = new Readable({ read() {} });
  readonly pid = 4242;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  killed = false;

  kill(signal?: NodeJS.Signals | number): boolean {
    this.killed = true;
    this.signalCode = typeof signal === "string" ? signal : "SIGTERM";
    this.exitCode = null;
    queueMicrotask(() => this.emit("exit", this.exitCode, this.signalCode));
    return true;
  }

  crash(code = 1): void {
    this.exitCode = code;
    this.signalCode = null;
    this.emit("exit", code, null);
  }
}

describe("FreenetSupervisor", () => {
  const temps: string[] = [];

  afterEach(async () => {
    temps.length = 0;
  });

  function tempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "tp-freenet-supervisor-"));
    temps.push(dir);
    return dir;
  }

  function writeBinary(dir: string, contents = "#!/bin/sh\necho freenet\n"): string {
    const path = join(dir, "freenet-fake");
    writeFileSync(path, contents, { mode: 0o755 });
    return path;
  }

  it("starts with an ephemeral port, generated token, and online status", async () => {
    const dataDir = tempDir();
    const binaryPath = writeBinary(dataDir);
    let ports = 18000;
    const children: FakeChild[] = [];

    const supervisor = new FreenetSupervisor({
      binaryPath,
      dataDir,
      allocatePort: async () => {
        ports += 1;
        return ports;
      },
      createToken: () => "test-token-value-do-not-log",
      readyCheck: async () => true,
      sleep: async () => {},
      spawner: (_command, args) => {
        expect(args).toContain("--ws-api-port");
        expect(args).toContain("--is-gateway");
        expect(args).toContain("--transport-keypair");
        expect(args.join(" ")).not.toContain("test-token-value-do-not-log");
        const child = new FakeChild();
        children.push(child);
        return child;
      }
    });

    const snapshot = await supervisor.start();
    expect(snapshot.status).toBe("online");
    expect(snapshot.port).toBe(18001);
    expect(snapshot.wsUrl).toBe("ws://127.0.0.1:18001/v1/contract/command");
    expect(snapshot.wsUrl).not.toContain("test-token");
    expect(snapshot.authToken).toBe("test-token-value-do-not-log");
    expect(snapshot.stateDir).toContain("freenet-node");
    expect(children).toHaveLength(1);

    await supervisor.stop();
    expect(supervisor.status).toBe("stopped");
    expect(children[0]!.killed).toBe(true);
  });

  it("rejects a binary whose SHA-256 does not match", async () => {
    const dataDir = tempDir();
    const binaryPath = writeBinary(dataDir, "wrong-bytes");
    const supervisor = new FreenetSupervisor({
      binaryPath,
      dataDir,
      expectedSha256: "0".repeat(64),
      readyCheck: async () => true,
      spawner: () => new FakeChild()
    });

    await expect(supervisor.start()).rejects.toThrow(/SHA-256 mismatch/);
    expect(supervisor.status).toBe("stopped");
  });

  it("accepts a hash-verified binary", async () => {
    const dataDir = tempDir();
    const contents = "verified-freenet-binary";
    const binaryPath = writeBinary(dataDir, contents);
    const expectedSha256 = createHash("sha256").update(contents).digest("hex");
    const supervisor = new FreenetSupervisor({
      binaryPath,
      dataDir,
      expectedSha256,
      allocatePort: async () => 19001,
      createToken: () => "token",
      readyCheck: async () => true,
      sleep: async () => {},
      spawner: () => new FakeChild()
    });

    await supervisor.start();
    expect(supervisor.status).toBe("online");
    await supervisor.stop();
  });

  it("restarts unexpected exits with bounded backoff then fails", async () => {
    const dataDir = tempDir();
    const binaryPath = writeBinary(dataDir);
    const children: FakeChild[] = [];
    const statuses: string[] = [];
    let launches = 0;

    const supervisor = new FreenetSupervisor({
      binaryPath,
      dataDir,
      maxRestartAttempts: 2,
      initialBackoffMs: 1,
      maxBackoffMs: 1,
      allocatePort: async () => 20000 + launches,
      createToken: () => `token-${launches}`,
      readyCheck: async () => true,
      sleep: async () => {},
      onStatus: (status) => statuses.push(status),
      spawner: () => {
        launches += 1;
        const child = new FakeChild();
        children.push(child);
        return child;
      }
    });

    await supervisor.start();
    expect(supervisor.status).toBe("online");

    children[0]!.crash(1);
    await vi.waitFor(() => expect(launches).toBe(2));
    children[1]!.crash(1);
    await vi.waitFor(() => expect(launches).toBe(3));
    children[2]!.crash(1);
    await vi.waitFor(() => expect(supervisor.status).toBe("failed"));

    expect(statuses).toContain("degraded");
    expect(statuses).toContain("failed");
    expect(supervisor.snapshot().restartAttempts).toBe(2);
  });

  it("reports failed when readiness never arrives", async () => {
    const dataDir = tempDir();
    const binaryPath = writeBinary(dataDir);
    const child = new FakeChild();
    const supervisor = new FreenetSupervisor({
      binaryPath,
      dataDir,
      readyTimeoutMs: 50,
      allocatePort: async () => 21001,
      createToken: () => "token",
      readyCheck: async () => false,
      now: (() => {
        let t = 0;
        return () => {
          t += 30;
          return t;
        };
      })(),
      sleep: async () => {},
      spawner: () => child
    });

    await expect(supervisor.start()).rejects.toThrow(/did not become ready/);
    expect(supervisor.status).toBe("failed");
  });
});

describe("redactFreenetAuthToken", () => {
  it("removes the token from log-bound text", () => {
    expect(redactFreenetAuthToken("token=secret-value ok", "secret-value")).toBe(
      "token=[redacted-token] ok"
    );
    expect(redactFreenetAuthToken("plain", null)).toBe("plain");
  });
});
