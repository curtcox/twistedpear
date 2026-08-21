import { describe, expect, it } from "vitest";
import {
  createMessageSlot,
  decodeWorkerSource,
  installBareWorkerPolyfill,
  tryReadSlot,
  tryWriteSlot,
} from "../src/bare-worker-polyfill.mjs";

describe("bare worker mailbox", () => {
  it("round-trips a JSON message through a SharedArrayBuffer slot", () => {
    const slot = createMessageSlot();
    expect(tryReadSlot(slot)).toBeNull();
    expect(tryWriteSlot(slot, { type: "ping", id: "1" })).toBe(true);
    expect(tryWriteSlot(slot, { type: "drop" })).toBe(false);
    expect(tryReadSlot(slot)).toEqual({ type: "ping", id: "1" });
    expect(tryReadSlot(slot)).toBeNull();
    expect(tryWriteSlot(slot, { type: "pong" })).toBe(true);
  });

  it("decodes the data: Worker source the sandbox emits", () => {
    const source = `data:text/javascript,${encodeURIComponent("self.postMessage(1)")}`;
    expect(decodeWorkerSource(source)).toBe("self.postMessage(1)");
  });

  it("installs Worker only when Bare.Thread exists", () => {
    const globals: Record<string, unknown> = {};
    expect(installBareWorkerPolyfill(globals)).toBe(false);
    globals.Bare = { Thread: class Thread {} };
    expect(installBareWorkerPolyfill(globals)).toBe(false);
    globals.SharedArrayBuffer = SharedArrayBuffer;
    expect(installBareWorkerPolyfill(globals)).toBe(true);
    expect(typeof globals.Worker).toBe("function");
    expect(installBareWorkerPolyfill(globals)).toBe(false);
  });

  it("rejects an oversized mailbox payload and an unsupported Worker source", () => {
    const slot = createMessageSlot();
    expect(() => tryWriteSlot(slot, "x".repeat(40_000))).toThrow(/overflow/);
    expect(() =>
      decodeWorkerSource("https://example.invalid/worker.js"),
    ).toThrow(/unsupported Bare Worker source/);
  });

  it("constructs a Bare thread Worker, posts, and terminates", () => {
    class Thread {
      terminated = false;
      constructor(
        readonly script: string,
        readonly options: { source: string; data: unknown },
      ) {}
      terminate() {
        this.terminated = true;
      }
    }

    const globals: Record<string, unknown> = {
      Bare: { Thread },
      SharedArrayBuffer,
    };
    expect(installBareWorkerPolyfill(globals)).toBe(true);
    const Worker = globals.Worker as new (
      source: string,
      options?: { data?: unknown },
    ) => {
      onmessage: ((event: { data: unknown }) => void) | null;
      postMessage(data: unknown): void;
      terminate(): void;
      _toHost: SharedArrayBuffer;
      _thread: Thread;
    };
    const worker = new Worker(
      `data:text/javascript,${encodeURIComponent("self.onmessage = () => {}")}`,
      { data: { role: "sandbox" } },
    );
    try {
      expect(worker._thread.script).toBe("/tp-sandbox-worker.js");
      expect(worker._thread.options.source).toContain("Bare.Thread.self.data");
      const received: unknown[] = [];
      worker.onmessage = (event) => received.push(event.data);
      expect(tryWriteSlot(worker._toHost, { type: "from-thread" })).toBe(true);
      worker.postMessage({ type: "ping" });
      expect(received).toEqual([{ type: "from-thread" }]);
    } finally {
      worker.terminate();
      expect(worker._thread.terminated).toBe(true);
      worker.terminate();
    }
  });
});

describe("webAssemblyInstantiateAvailable", () => {
  it("treats a namespace object with instantiate as available", async () => {
    const { webAssemblyInstantiateAvailable } =
      await import("../src/webassembly-available.mjs");
    expect(
      webAssemblyInstantiateAvailable({
        WebAssembly: { instantiate: async () => {} },
      }),
    ).toBe(true);
  });

  it("rejects a missing or non-callable instantiate", async () => {
    const { webAssemblyInstantiateAvailable } =
      await import("../src/webassembly-available.mjs");
    expect(webAssemblyInstantiateAvailable({})).toBe(false);
    expect(webAssemblyInstantiateAvailable({ WebAssembly: {} })).toBe(false);
  });
});
