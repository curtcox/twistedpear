import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

let workletSourceExists = false;
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return { ...actual, existsSync: () => workletSourceExists };
});

// The supervisor shells out to `bare` (or the node fallback) and speaks the
// newline-delimited worklet protocol over stdio. A fake child process lets
// each test drive stdout/stderr/exit without a real Bare runtime.
class FakeChildProcess extends EventEmitter {
  static instances: FakeChildProcess[] = [];

  readonly stdout = new EventEmitter();
  readonly stderr = new EventEmitter();
  readonly stdin = { write: vi.fn() };
  killed = false;
  lastSignal: string | undefined;

  constructor(
    readonly command: string,
    readonly args: string[],
    readonly options: Record<string, unknown>,
  ) {
    super();
    FakeChildProcess.instances.push(this);
  }

  kill(signal?: string): void {
    this.killed = true;
    this.lastSignal = signal;
  }
}

const spawn = vi.fn(
  (command: string, args: string[], options: Record<string, unknown>) =>
    new FakeChildProcess(command, args, options),
);

vi.mock("node:child_process", () => ({ spawn }));

const { WorkletSupervisor } = await import("../src/main/supervisor.js");

function latestChild(): FakeChildProcess {
  const child = FakeChildProcess.instances.at(-1);
  if (child === undefined) throw new Error("expected a spawned child");
  return child;
}

beforeEach(() => {
  FakeChildProcess.instances = [];
  spawn.mockClear();
  workletSourceExists = false;
  vi.useRealTimers();
});

describe("WorkletSupervisor", () => {
  it("spawns the Bare binary by default and forwards decoded messages", () => {
    const messages: unknown[] = [];
    const supervisor = new WorkletSupervisor({
      onMessage: (message) => messages.push(message),
      onExit: () => {},
    });

    supervisor.start();

    expect(spawn).toHaveBeenCalledTimes(1);
    const [command] = spawn.mock.calls[0]!;
    expect(command).toMatch(/bare\/bin\/bare$/);

    const child = latestChild();
    child.stdout.emit(
      "data",
      Buffer.from(`${JSON.stringify({ type: "log", line: "hi" })}\n`),
    );
    expect(messages).toEqual([{ type: "log", line: "hi" }]);
  });

  it("spawns the node fallback binary when requested", () => {
    const supervisor = new WorkletSupervisor({
      onMessage: () => {},
      onExit: () => {},
    });

    supervisor.start(true);

    const [command, , options] = spawn.mock.calls[0]!;
    expect(command).toBe(process.env.TWISTEDPEAR_NODE_BIN ?? "node");
    expect(
      (options as { env: Record<string, string> }).env
        .TWISTEDPEAR_WORKLET_NODE_FALLBACK,
    ).toBe("1");
  });

  it("buffers partial stdout chunks across writes", () => {
    const messages: unknown[] = [];
    const supervisor = new WorkletSupervisor({
      onMessage: (message) => messages.push(message),
      onExit: () => {},
    });
    supervisor.start();
    const child = latestChild();

    const full = `${JSON.stringify({ type: "log", line: "split" })}\n`;
    const midpoint = Math.floor(full.length / 2);
    child.stdout.emit("data", Buffer.from(full.slice(0, midpoint)));
    expect(messages).toHaveLength(0);
    child.stdout.emit("data", Buffer.from(full.slice(midpoint)));
    expect(messages).toEqual([{ type: "log", line: "split" }]);
  });

  it("writes encoded messages to the child's stdin", () => {
    const supervisor = new WorkletSupervisor({
      onMessage: () => {},
      onExit: () => {},
    });
    supervisor.start();
    const child = latestChild();

    supervisor.send({ type: "network-change" });

    expect(child.stdin.write).toHaveBeenCalledWith(
      `${JSON.stringify({ type: "network-change" })}\n`,
    );
  });

  it("does nothing when sending with no child running", () => {
    const supervisor = new WorkletSupervisor({
      onMessage: () => {},
      onExit: () => {},
    });
    expect(() => supervisor.send({ type: "network-change" })).not.toThrow();
  });

  it("reports exit and auto-restarts unless stopped", () => {
    vi.useFakeTimers();
    try {
      const exits: Array<{
        code: number | null;
        signal: NodeJS.Signals | null;
      }> = [];
      const supervisor = new WorkletSupervisor({
        onMessage: () => {},
        onExit: (code, signal) => exits.push({ code, signal }),
      });
      supervisor.start();
      const first = latestChild();

      first.emit("exit", 1, null);
      expect(exits).toEqual([{ code: 1, signal: null }]);
      expect(spawn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1_000);
      expect(spawn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not auto-restart after stop() or kill()", () => {
    vi.useFakeTimers();
    try {
      const supervisor = new WorkletSupervisor({
        onMessage: () => {},
        onExit: () => {},
      });
      supervisor.start();
      const child = latestChild();

      supervisor.stop();
      expect(child.killed).toBe(true);
      expect(child.lastSignal).toBe("SIGTERM");
      child.emit("exit", 0, null);

      vi.advanceTimersByTime(60_000);
      expect(spawn).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("kill() sends SIGKILL and suppresses restart", () => {
    const supervisor = new WorkletSupervisor({
      onMessage: () => {},
      onExit: () => {},
    });
    supervisor.start();
    const child = latestChild();

    supervisor.kill();
    expect(child.killed).toBe(true);
    expect(child.lastSignal).toBe("SIGKILL");
  });

  it("logs stderr lines prefixed with [worklet]", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const supervisor = new WorkletSupervisor({
        onMessage: () => {},
        onExit: () => {},
      });
      supervisor.start();
      const child = latestChild();

      child.stderr.emit("data", Buffer.from("boom\n"));
      expect(errorSpy).toHaveBeenCalledWith("[worklet] boom");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("ignores the node-fallback stderr hint when the fallback source is missing", () => {
    const supervisor = new WorkletSupervisor({
      onMessage: () => {},
      onExit: () => {},
    });
    supervisor.start();
    const child = latestChild();

    child.stderr.emit("data", Buffer.from("[ipc-stdio] stdin unavailable\n"));

    expect(child.killed).toBe(false);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("restarts with the node fallback when Bare's stdin is unavailable", () => {
    vi.useFakeTimers();
    try {
      workletSourceExists = true;
      const supervisor = new WorkletSupervisor({
        onMessage: () => {},
        onExit: () => {},
      });
      supervisor.start();
      const bareChild = latestChild();

      bareChild.stderr.emit(
        "data",
        Buffer.from("[ipc-stdio] stdin unavailable\n"),
      );
      expect(bareChild.killed).toBe(true);
      expect(bareChild.lastSignal).toBe("SIGTERM");

      vi.advanceTimersByTime(100);
      expect(spawn).toHaveBeenCalledTimes(2);
      const [, fallbackArgs] = spawn.mock.calls[1]!;
      expect(fallbackArgs).toEqual([expect.stringMatching(/entry\.mjs$/)]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("simulateCrash kills the child without disabling auto-restart", () => {
    const supervisor = new WorkletSupervisor({
      onMessage: () => {},
      onExit: () => {},
    });
    supervisor.start();
    const child = latestChild();

    supervisor.simulateCrash();
    expect(child.killed).toBe(true);
    expect(child.lastSignal).toBe("SIGKILL");
  });
});
