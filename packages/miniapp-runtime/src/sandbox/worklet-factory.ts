import type { SandboxBackend } from "./backend.js";
import { BareWorkerSandboxBackend } from "./worker.js";

/** Bare worklet entry always uses the Bare Worker sandbox; no Node worker_threads fallback. */
export function createSandboxBackend(
  preferred?: "bare-worker" | "node-worker",
): SandboxBackend {
  void preferred;
  return new BareWorkerSandboxBackend();
}
