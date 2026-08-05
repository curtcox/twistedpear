import type { SandboxBackend, SandboxInstance, SandboxSpawnOptions } from "./sandbox/backend.js";

export type MiniappLifecycleState = "installed" | "launching" | "running" | "suspended" | "stopped" | "crashed";

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
  /** Injected delay used by the watchdog race — adapters supply setTimeout. */
  readonly delay: (ms: number) => Promise<void>;
}

export class MiniappLifecycle {
  private instance: SandboxInstance | null = null;
  private state: MiniappLifecycleState = "installed";
  private reason: string | null = null;
  private updatedAt: number;

  constructor(
    private readonly backend: SandboxBackend,
    private readonly spawnOptions: Omit<SandboxSpawnOptions, "brokerEndpoint"> & { readonly brokerEndpoint?: unknown },
    private readonly options: LifecycleOptions
  ) {
    this.updatedAt = this.now();
  }

  snapshot(): MiniappLifecycleSnapshot {
    return {
      appId: this.spawnOptions.appId,
      version: this.spawnOptions.version,
      state: this.state,
      reason: this.reason,
      updatedAt: this.updatedAt
    };
  }

  async launch(): Promise<MiniappLifecycleSnapshot> {
    if (this.instance !== null) {
      await this.stop("relaunch");
    }

    this.transition("launching", null);
    this.instance = await this.backend.spawn({
      ...this.spawnOptions,
      brokerEndpoint: this.spawnOptions.brokerEndpoint
    });
    this.transition("running", null);
    return this.snapshot();
  }

  async suspend(reason = "host-suspended"): Promise<MiniappLifecycleSnapshot> {
    if (this.instance !== null) {
      await this.instance.postMessage({ type: "lifecycle", state: "suspended", reason });
    }

    this.transition("suspended", reason);
    return this.snapshot();
  }

  async resume(): Promise<MiniappLifecycleSnapshot> {
    if (this.instance === null) {
      return this.launch();
    }

    await this.instance.postMessage({ type: "lifecycle", state: "running" });
    this.transition("running", null);
    return this.snapshot();
  }

  async stop(reason = "stopped"): Promise<MiniappLifecycleSnapshot> {
    if (this.instance !== null) {
      await this.instance.kill(reason);
      this.instance = null;
    }

    this.transition("stopped", reason);
    return this.snapshot();
  }

  async deliverUiEvent(event: { readonly nodeId: string; readonly event: string; readonly value?: unknown }): Promise<void> {
    if (this.instance === null) {
      throw new Error("No sandbox instance is running");
    }

    await this.instance.postMessage({ type: "ui-event", ...event });
  }

  async watchdogPing(): Promise<MiniappLifecycleSnapshot> {
    if (this.instance === null) {
      return this.snapshot();
    }

    if (!this.instance.isAlive()) {
      await this.instance.kill("sandbox-exit");
      this.instance = null;
      this.transition("crashed", "sandbox-exit");
      return this.snapshot();
    }

    const timeoutMs = this.options.watchdogMs ?? 1_000;
    const ping = this.instance.ping(timeoutMs);
    const timeout = this.options.delay(timeoutMs).then(() => false as const);
    const alive = await Promise.race([ping, timeout]);

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

  private transition(state: MiniappLifecycleState, reason: string | null): void {
    this.state = state;
    this.reason = reason;
    this.updatedAt = this.now();
  }

  private now(): number {
    return this.options.now();
  }
}
