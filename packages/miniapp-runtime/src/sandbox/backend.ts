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
}

export interface SandboxInstance {
  readonly id: string;
  postMessage(message: unknown): Promise<void>;
  ping(timeoutMs: number): Promise<boolean>;
  kill(reason: string): Promise<void>;
}

export interface SandboxBackend {
  readonly name: string;
  spawn(options: SandboxSpawnOptions): Promise<SandboxInstance>;
}
