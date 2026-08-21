/**
 * Host-side wait for a sandbox checkpoint ack.
 *
 * The worker already holds the blob (`host.setCheckpoint`); will-suspend only
 * copies it. An ack that never arrives, or a blob over the cap, is treated as
 * overrun so the host can kill rather than delay its own quiesce.
 */

const MAX_CHECKPOINT_BYTES = 64 * 1024;
export const DEFAULT_CHECKPOINT_BUDGET_MS = 500;

export type SandboxCheckpointResult =
  | { readonly ok: true; readonly blob: Uint8Array | null }
  | { readonly ok: false };

function decodeCheckpointBlob(value: unknown): SandboxCheckpointResult {
  if (value == null) {
    return { ok: true, blob: null };
  }

  if (value instanceof Uint8Array) {
    return value.byteLength > MAX_CHECKPOINT_BYTES
      ? { ok: false }
      : { ok: true, blob: value };
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    if (value.length > MAX_CHECKPOINT_BYTES) {
      return { ok: false };
    }

    return { ok: true, blob: new Uint8Array(value) };
  }

  return { ok: false };
}

export function createCheckpointCollector(): {
  handleMessage: (message: unknown) => boolean;
  request: (
    postMessage: (message: unknown) => void,
    budgetMs: number,
  ) => Promise<SandboxCheckpointResult>;
} {
  let waiter: ((result: SandboxCheckpointResult) => void) | null = null;

  return {
    handleMessage(message: unknown): boolean {
      if (waiter === null) {
        return false;
      }

      const typed = message as { type?: string; blob?: unknown };
      if (typed.type !== "checkpoint-ack") {
        return false;
      }

      const settle = waiter;
      waiter = null;
      settle(decodeCheckpointBlob(typed.blob));
      return true;
    },
    request(postMessage, budgetMs): Promise<SandboxCheckpointResult> {
      return new Promise((resolve) => {
        let settled = false;
        const finish = (result: SandboxCheckpointResult): void => {
          if (settled) {
            return;
          }

          settled = true;
          waiter = null;
          clearTimeout(timer);
          resolve(result);
        };
        const timer = setTimeout(() => finish({ ok: false }), budgetMs);
        waiter = finish;
        postMessage({ type: "lifecycle", state: "will-suspend" });
      });
    },
  };
}
