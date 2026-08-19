import { afterEach, describe, expect, it, vi } from "vitest";
import { createWorkletIpcReadyGate } from "../worklet-ipc-ready.js";

describe("createWorkletIpcReadyGate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves on the first signal and ignores later ones", async () => {
    const gate = createWorkletIpcReadyGate(1_000);
    gate.signal();
    await expect(gate.promise).resolves.toBeUndefined();
    gate.signal();
    await expect(gate.promise).resolves.toBeUndefined();
  });

  it("cancel rejects an unsettled gate and is ignored after signal", async () => {
    const live = createWorkletIpcReadyGate(1_000);
    live.cancel("boot failed");
    await expect(live.promise).rejects.toThrow(/boot failed/);
    const done = createWorkletIpcReadyGate(1_000);
    done.signal();
    done.cancel("too late");
    await expect(done.promise).resolves.toBeUndefined();
  });

  it("rejects when no IPC chunk arrives before the timeout", async () => {
    vi.useFakeTimers();
    const gate = createWorkletIpcReadyGate(50);
    const pending = expect(gate.promise).rejects.toThrow(
      /worklet IPC ready timed out after 50ms/,
    );
    await vi.advanceTimersByTimeAsync(50);
    await pending;
  });
});
