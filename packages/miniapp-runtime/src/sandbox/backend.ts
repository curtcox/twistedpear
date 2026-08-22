import type { AppErrorReport, DiagnosticsLevel } from "../diagnostics.js";
import type { SandboxCheckpointResult } from "./checkpoint.js";

export interface SandboxLimits {
  readonly memoryBytes?: number;
  readonly maxMessageBytes?: number;
}

export interface SandboxSpawnOptions {
  readonly appId: string;
  readonly version: string;
  readonly entryPath: string;
  readonly bundle: Uint8Array;
  readonly brokerEndpoint: unknown;
  readonly limits?: SandboxLimits;
  /** Host-owned; must not travel the broker request path. */
  readonly onAppError?: (report: AppErrorReport) => void;
  readonly onAppLog?: (level: DiagnosticsLevel, message: string) => void;
}

export interface SandboxInstance {
  readonly id: string;
  postMessage(message: unknown): Promise<void>;
  ping(timeoutMs: number): Promise<boolean>;
  isAlive(): boolean;
  lastError?(): string | null;
  lastAppError?(): AppErrorReport | null;
  kill(reason: string): Promise<void>;
  /**
   * Ask the worker for its stored checkpoint within `budgetMs`. Optional so
   * proxy backends can fall back to a ping as the overrun detector.
   */
  checkpoint?(budgetMs: number): Promise<SandboxCheckpointResult>;
}

export interface SandboxBackend {
  readonly name: string;
  spawn(options: SandboxSpawnOptions): Promise<SandboxInstance>;
}
