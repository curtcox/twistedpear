import { describe, expect, it } from "vitest";
import {
  MiniappLifecycle,
  NodeWorkerSandboxBackend,
  type SandboxBackend,
  type SandboxInstance,
} from "../src/index.js";
import {
  DEFAULT_CHECKPOINT_BUDGET_MS,
  type SandboxCheckpointResult,
} from "../src/sandbox/checkpoint.js";

const wall = {
  now: () => Date.now(),
  delay: (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

function mockBackend(options: {
  checkpoint: (budgetMs: number) => Promise<SandboxCheckpointResult>;
}): {
  backend: SandboxBackend;
  messages: unknown[];
  kills: string[];
} {
  const messages: unknown[] = [];
  const kills: string[] = [];
  return {
    messages,
    kills,
    backend: {
      name: "lifecycle-mock",
      async spawn(spawn): Promise<SandboxInstance> {
        let alive = true;
        return {
          id: spawn.appId,
          async postMessage(message) {
            messages.push(message);
          },
          async ping() {
            return alive;
          },
          isAlive() {
            return alive;
          },
          async kill(reason) {
            alive = false;
            kills.push(reason);
          },
          checkpoint: options.checkpoint,
        };
      },
    },
  };
}

describe("mini-app lifecycle events", () => {
  it("collects a checkpoint within the budget and resumes with it", async () => {
    const blob = new Uint8Array([7, 8, 9]);
    const { backend, messages, kills } = mockBackend({
      checkpoint: async () => ({ ok: true, blob }),
    });
    const lifecycle = new MiniappLifecycle(
      backend,
      {
        appId: "notes",
        version: "1.0.0",
        entryPath: "bundle.js",
        bundle: new Uint8Array(),
        brokerEndpoint: { request: async () => ({ id: "0", ok: true }) },
      },
      wall,
    );

    await lifecycle.launch();
    const suspended = await lifecycle.suspend("host-suspended");
    expect(suspended.state).toBe("suspended");
    expect(lifecycle.lastCheckpoint()).toEqual(blob);
    expect(kills).toEqual([]);
    expect(messages).toEqual([
      { type: "lifecycle", state: "suspended", reason: "host-suspended" },
    ]);

    const resumed = await lifecycle.resume();
    expect(resumed.state).toBe("running");
    expect(messages[1]).toEqual({
      type: "lifecycle",
      state: "running",
      checkpoint: [7, 8, 9],
    });
    await lifecycle.stop("cleanup");
  });

  it("kills an app that overruns the checkpoint budget", async () => {
    const { backend, kills } = mockBackend({
      checkpoint: async () => ({ ok: false }),
    });
    const lifecycle = new MiniappLifecycle(
      backend,
      {
        appId: "wedged",
        version: "1.0.0",
        entryPath: "bundle.js",
        bundle: new Uint8Array(),
        brokerEndpoint: { request: async () => ({ id: "0", ok: true }) },
      },
      { ...wall, checkpointBudgetMs: DEFAULT_CHECKPOINT_BUDGET_MS },
    );

    await lifecycle.launch();
    const snapshot = await lifecycle.suspend();
    expect(snapshot.state).toBe("crashed");
    expect(snapshot.reason).toBe("checkpoint-overrun");
    expect(kills).toEqual(["checkpoint-overrun"]);
  });

  it("collects a Node worker checkpoint and restores it on resume", async () => {
    const backend = new NodeWorkerSandboxBackend();
    const lifecycle = new MiniappLifecycle(
      backend,
      {
        appId: "checkpointed",
        version: "1.0.0",
        entryPath: "bundle.js",
        bundle: new TextEncoder().encode(`
sdk.host.setCheckpoint(new Uint8Array([1, 2, 3]));
sdk.host.onResume((blob) => {
  sdk.ui.render({ type: "column", children: [{ type: "text", props: { value: String(blob && blob[0]) } }] });
});
await new Promise(() => {});
`),
        brokerEndpoint: {
          request: async (request: { id?: string }) => ({
            id: request.id ?? "0",
            ok: true,
            result: "ok",
          }),
        },
      },
      { ...wall, checkpointBudgetMs: 200 },
    );

    await lifecycle.launch();
    await wall.delay(50);
    const suspended = await lifecycle.suspend();
    expect(suspended.state).toBe("suspended");
    expect([
      ...((lifecycle.lastCheckpoint() ?? new Uint8Array()) as Uint8Array),
    ]).toEqual([1, 2, 3]);

    const resumed = await lifecycle.resume();
    expect(resumed.state).toBe("running");
    await lifecycle.stop("cleanup");
  });
});
