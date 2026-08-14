import type {
  SandboxBackend,
  SandboxInstance,
  SandboxSpawnOptions,
} from "./backend.js";

export class CompartmentBackendUnavailableError extends Error {
  constructor() {
    super(
      "The hardened in-worklet compartment backend is retained as the losing M0 spike stub; use BareWorkerSandboxBackend on device.",
    );
    this.name = "CompartmentBackendUnavailableError";
  }
}

export class HardenedCompartmentSandboxBackend implements SandboxBackend {
  readonly name = "hardened-compartment";

  spawn(options: SandboxSpawnOptions): Promise<SandboxInstance> {
    void options;
    return Promise.reject(new CompartmentBackendUnavailableError());
  }
}
