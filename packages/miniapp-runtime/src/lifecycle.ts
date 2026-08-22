import type {
  SandboxBackend,
  SandboxInstance,
  SandboxSpawnOptions,
} from "./sandbox/backend.js";
import {
  DEFAULT_CHECKPOINT_BUDGET_MS,
  type SandboxCheckpointResult,
} from "./sandbox/checkpoint.js";
import type { AppErrorReport, DiagnosticsLevel } from "./diagnostics.js";

export type MiniappLifecycleState =
  "installed" | "launching" | "running" | "suspended" | "stopped" | "crashed";

export interface MiniappLifecycleSnapshot {
  readonly appId: string;
  readonly state: MiniappLifecycleState;
  readonly version: string;
  readonly reason: string | null;
  readonly updatedAt: number;
}

export interface LifecycleOptions {
  readonly now: () => number;
  readonly watchdogMs?: number;
  /**
   * Injected delay for adapter-side waits. Watchdog timeout is enforced by
   * `SandboxInstance.ping`, not by racing this, so a live ping does not leave
   * a timer behind.
   */
  readonly delay: (ms: number) => Promise<void>;
  /** Hard budget for the will-suspend checkpoint ack. Overrun kills the app. */
  readonly checkpointBudgetMs?: number;
  readonly onAppError?: (report: AppErrorReport) => void;
  readonly onAppLog?: (level: DiagnosticsLevel, message: string) => void;
}

export class MiniappLifecycle {
  private instance: SandboxInstance | null = null;
  private state: MiniappLifecycleState = "installed";
  private reason: string | null = null;
  private updatedAt: number;
  private storedCheckpoint: Uint8Array | null = null;
  private sandboxError: string | null = null;
  private sandboxAppError: AppErrorReport | null = null;
  private pendingPushes: unknown[] = [];

  constructor(
    private readonly backend: SandboxBackend,
    private readonly spawnOptions: Omit<
      SandboxSpawnOptions,
      "brokerEndpoint"
    > & { readonly brokerEndpoint?: unknown },
    private readonly options: LifecycleOptions,
  ) {
    this.updatedAt = this.now();
  }

  snapshot(): MiniappLifecycleSnapshot {
    return {
      appId: this.spawnOptions.appId,
      version: this.spawnOptions.version,
      state: this.state,
      reason: this.reason,
      updatedAt: this.updatedAt,
    };
  }

  async launch(): Promise<MiniappLifecycleSnapshot> {
    if (this.instance !== null) {
      await this.stop("relaunch");
    }

    this.transition("launching", null);
    this.storedCheckpoint = null;
    this.sandboxError = null;
    this.sandboxAppError = null;
    this.pendingPushes = [];
    this.instance = await this.backend.spawn({
      ...this.spawnOptions,
      brokerEndpoint: this.spawnOptions.brokerEndpoint,
      onAppError: (report) => {
        this.sandboxError = report.message;
        this.sandboxAppError = report;
        this.options.onAppError?.(report);
      },
      onAppLog: (level, message) => this.options.onAppLog?.(level, message),
    });
    this.transition("running", null);
    return this.snapshot();
  }

  lastCheckpoint(): Uint8Array | null {
    return this.storedCheckpoint;
  }

  lastError(): string | null {
    this.captureSandboxError();
    return this.sandboxError;
  }

  lastAppError(): AppErrorReport | null {
    this.captureSandboxError();
    return this.sandboxAppError;
  }

  private captureSandboxError(): void {
    const error = this.instance?.lastError?.() ?? null;
    if (error !== null && error.length > 0) {
      this.sandboxError = error;
    }
    const report = this.instance?.lastAppError?.() ?? null;
    if (report !== null) {
      this.sandboxAppError = report;
    }
  }

  async suspend(reason = "host-suspended"): Promise<MiniappLifecycleSnapshot> {
    if (this.instance !== null) {
      const collected = await this.collectCheckpoint();
      if (!collected.ok) {
        await this.instance.kill("checkpoint-overrun");
        this.instance = null;
        this.transition("crashed", "checkpoint-overrun");
        return this.snapshot();
      }

      this.storedCheckpoint = collected.blob ?? null;
      await this.instance.postMessage({
        type: "lifecycle",
        state: "suspended",
        reason,
      });
    }

    this.transition("suspended", reason);
    return this.snapshot();
  }

  async resume(): Promise<MiniappLifecycleSnapshot> {
    if (this.instance === null) {
      return this.launch();
    }

    await this.instance.postMessage({
      type: "lifecycle",
      state: "running",
      checkpoint:
        this.storedCheckpoint === null
          ? null
          : Array.from(this.storedCheckpoint),
    });
    this.transition("running", null);
    await this.flushPendingPushes();
    return this.snapshot();
  }

  async stop(reason = "stopped"): Promise<MiniappLifecycleSnapshot> {
    this.captureSandboxError();
    if (this.instance !== null) {
      await this.instance.kill(reason);
      this.instance = null;
    }

    this.transition("stopped", reason);
    return this.snapshot();
  }

  async deliverUiEvent(event: {
    readonly nodeId: string;
    readonly event: string;
    readonly value?: unknown;
  }): Promise<void> {
    if (this.instance === null) {
      throw new Error("No sandbox instance is running");
    }

    await this.instance.postMessage({ type: "ui-event", ...event });
  }

  async postSandbox(message: unknown): Promise<void> {
    if (this.instance === null) {
      throw new Error("No sandbox instance is running");
    }
    if (this.state === "suspended") {
      this.pendingPushes.push(message);
      return;
    }
    await this.instance.postMessage(message);
  }

  private async flushPendingPushes(): Promise<void> {
    if (this.instance === null) return;
    const queued = this.pendingPushes.splice(0);
    for (const message of queued) {
      await this.instance.postMessage(message);
    }
  }

  async crash(reason = "injected"): Promise<MiniappLifecycleSnapshot> {
    if (this.instance !== null) {
      await this.instance.kill(reason);
      this.instance = null;
    }
    this.transition("crashed", reason);
    return this.snapshot();
  }

  async watchdogPing(): Promise<MiniappLifecycleSnapshot> {
    this.captureSandboxError();
    if (this.instance === null) {
      return this.snapshot();
    }

    if (!this.instance.isAlive()) {
      this.captureSandboxError();
      await this.instance.kill("sandbox-exit");
      this.instance = null;
      this.transition("crashed", "sandbox-exit");
      return this.snapshot();
    }

    // The adapter's ping() already times out. Racing an injected delay here
    // left a timer on every successful ping — the mini-app benchmark's 1s
    // tight loop scheduled tens of thousands of them, which is what made
    // watchdog throughput look like a 2x regression on a shared runner.
    const timeoutMs = this.options.watchdogMs ?? 1_000;
    const alive = await this.instance.ping(timeoutMs);

    if (!alive) {
      await this.instance.kill("watchdog");
      this.instance = null;
      this.transition("crashed", "watchdog");
    }

    return this.snapshot();
  }

  markCrashed(reason: string): MiniappLifecycleSnapshot {
    this.instance = null;
    this.transition("crashed", reason);
    return this.snapshot();
  }

  private transition(
    state: MiniappLifecycleState,
    reason: string | null,
  ): void {
    this.state = state;
    this.reason = reason;
    this.updatedAt = this.now();
  }

  private async collectCheckpoint(): Promise<SandboxCheckpointResult> {
    if (this.instance === null) {
      return { ok: true, blob: null };
    }

    const budget =
      this.options.checkpointBudgetMs ?? DEFAULT_CHECKPOINT_BUDGET_MS;
    if (this.instance.checkpoint !== undefined) {
      return this.instance.checkpoint(budget);
    }

    await this.instance.postMessage({
      type: "lifecycle",
      state: "will-suspend",
    });
    const alive = await this.instance.ping(budget);
    return alive ? { ok: true, blob: null } : { ok: false };
  }

  private now(): number {
    return this.options.now();
  }
}
