import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GUIDA_SHIM_SOURCE } from "../src/shim.js";
import { GUIDA_COMPILER_VERSION } from "../src/build.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const descriptor = JSON.parse(
  readFileSync(
    join(root, "specs/spec-sdk/schema/calls.descriptor.json"),
    "utf8",
  ),
) as {
  compiler: { version: string };
  calls: ReadonlyArray<{
    namespace: string;
    method: string;
    skipBinding?: boolean;
    capability?: string | null;
    scanPrefix?: string;
    id: string;
  }>;
};
const capabilities = JSON.parse(
  readFileSync(
    join(root, "specs/spec-sdk/schema/api-capabilities.json"),
    "utf8",
  ),
) as Record<string, string>;

describe("Guida SDK descriptor", () => {
  it("pins the same compiler the build step names", () => {
    expect(descriptor.compiler.version).toBe(GUIDA_COMPILER_VERSION);
  });

  it("emits a shim case for every bindable call", () => {
    for (const call of descriptor.calls) {
      if (call.skipBinding) continue;
      expect(GUIDA_SHIM_SOURCE).toContain(
        `frame.namespace === ${JSON.stringify(call.namespace)} && frame.method === ${JSON.stringify(call.method)}`,
      );
    }
  });

  it("boots after subscribing so the first render is not lost", () => {
    expect(GUIDA_SHIM_SOURCE).toContain('send({ type: "boot" })');
  });

  it("does not bind async-generator SDK surfaces", () => {
    expect(GUIDA_SHIM_SOURCE).not.toContain('frame.method === "chatStream"');
    expect(GUIDA_SHIM_SOURCE).not.toContain('frame.method === "watch"');
  });

  it("covers the cookbook capability scan keys", () => {
    expect(capabilities["identity.destinationHash"]).toBe("identity");
    expect(capabilities["ai.chatStream"]).toBe("ai:chat");
    expect(capabilities["links.watch"]).toBe("link:observe");
    expect(capabilities["storage.kv."]).toBe("storage:kv");
    expect(capabilities["workspace."]).toBe("workspace");
  });
});
