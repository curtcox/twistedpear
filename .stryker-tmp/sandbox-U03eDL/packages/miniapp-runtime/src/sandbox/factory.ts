// @ts-nocheck
import type { SandboxBackend } from "./backend.js";
import { BareWorkerSandboxBackend } from "./worker.js";
import { NodeWorkerSandboxBackend } from "./node-worker.js";

export function createSandboxBackend(preferred?: "bare-worker" | "node-worker"): SandboxBackend {
  if (preferred === "node-worker") {
    return new NodeWorkerSandboxBackend();
  }

  if (preferred === "bare-worker") {
    return new BareWorkerSandboxBackend();
  }

  const WorkerCtor = (globalThis as { Worker?: unknown }).Worker;
  if (WorkerCtor !== undefined) {
    try {
      return new BareWorkerSandboxBackend();
    } catch {
      // Fall through to Node worker when Bare Worker is unavailable.
    }
  }

  return new NodeWorkerSandboxBackend();
}
