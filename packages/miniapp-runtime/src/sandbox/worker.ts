import type { SandboxBackend, SandboxInstance, SandboxSpawnOptions } from "./backend.js";

export class WorkerBackendUnavailableError extends Error {
  constructor() {
    super("Bare Worker backend is selected by the Phase 4 ADR but is not available in this Node test harness.");
    this.name = "WorkerBackendUnavailableError";
  }
}

export class BareWorkerSandboxBackend implements SandboxBackend {
  readonly name = "bare-worker";

  async spawn(_options: SandboxSpawnOptions): Promise<SandboxInstance> {
    throw new WorkerBackendUnavailableError();
  }
}
