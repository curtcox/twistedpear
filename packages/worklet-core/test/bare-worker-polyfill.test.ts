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
