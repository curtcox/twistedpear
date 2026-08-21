export const WORKLET_IPC_READY_MS = 90_000;

export type WorkletIpcReadyGate = {
  readonly promise: Promise<void>;
  signal(): void;
  cancel(reason?: string): void;
};

/**
 * Resolves on the first BareKit IPC chunk so the host does not send `start` /
 * `create-identity` into an isolate that is still evaluating the worklet bundle.
 */
export function createWorkletIpcReadyGate(
  timeoutMs = WORKLET_IPC_READY_MS,
): WorkletIpcReadyGate {
  let settled = false;
  let resolveReady: () => void = () => {};
  let rejectReady: (error: Error) => void = () => {};
  const promise = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const timer = setTimeout(() => {
    if (settled) {
      return;
    }
    settled = true;
    rejectReady(new Error(`worklet IPC ready timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  function settle(action: () => void): void {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timer);
    action();
  }

  return {
    promise,
    signal() {
      settle(() => resolveReady());
    },
    cancel(reason = "worklet start aborted") {
      settle(() => rejectReady(new Error(reason)));
    },
  };
}
