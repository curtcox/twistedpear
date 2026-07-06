import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeMessages, encodeMessage, type HostToWorkletMessage, type WorkletToHostMessage } from "@twistedpear/host-core/protocol";

const hostRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const workletBundle = join(hostRoot, "worklet/worklet.bundle");
const bareBin = join(hostRoot, "../../node_modules/bare/bin/bare");

export interface WorkletSupervisorOptions {
  readonly onMessage: (message: WorkletToHostMessage) => void;
  readonly onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
}

export class WorkletSupervisor {
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = "";
  private restartAttempts = 0;
  private stopping = false;

  constructor(private readonly options: WorkletSupervisorOptions) {}

  start(): void {
    this.stopping = false;
    this.child = spawn(bareBin, [workletBundle], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, TWISTEDPEAR_HOST_DESKTOP: "1" }
    });

    this.child.stdout.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString("utf8");
      const parsed = decodeMessages(this.buffer);
      this.buffer = parsed.remainder;
      for (const message of parsed.messages) {
        this.options.onMessage(message);
      }
    });

    this.child.stderr.on("data", (chunk: Buffer) => {
      console.error(`[worklet] ${chunk.toString("utf8").trim()}`);
    });

    this.child.on("exit", (code, signal) => {
      this.child = null;
      this.options.onExit(code, signal);
      if (!this.stopping) {
        this.restartAttempts += 1;
        const delay = Math.min(30_000, 500 * 2 ** Math.min(this.restartAttempts, 6));
        setTimeout(() => this.start(), delay);
      }
    });
  }

  send(message: HostToWorkletMessage): void {
    this.child?.stdin.write(encodeMessage(message));
  }

  stop(): void {
    this.stopping = true;
    this.send({ type: "stop" });
    this.child?.kill("SIGTERM");
  }

  kill(): void {
    this.stopping = true;
    this.child?.kill("SIGKILL");
  }

  /** Kill the child without disabling auto-restart (supervision tests). */
  simulateCrash(): void {
    this.child?.kill("SIGKILL");
  }
}
