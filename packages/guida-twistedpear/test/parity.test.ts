import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGuidaApp } from "../src/build.js";

const here = dirname(fileURLToPath(import.meta.url));
const template = join(here, "../templates/hello");
const jsTwin = join(here, "../fixtures/hello-js/bundle.js");

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function canonical(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

type UiHandler = (event: {
  nodeId: string;
  event: string;
  value?: unknown;
}) => void | Promise<void>;

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function recordJs(events: ReadonlyArray<{ nodeId: string; event: string }>) {
  const frames: unknown[] = [];
  let handler: UiHandler | undefined;
  const sdk = {
    ui: {
      render: async (tree: unknown) => {
        frames.push(structuredClone(tree));
      },
      onEvent: (next: UiHandler) => {
        handler = next;
      },
    },
  };
  const source = readFileSync(jsTwin, "utf8").replace(
    /import\s*\{[^}]*\}\s*from\s*["']@twistedpear\/miniapp-sdk["']\s*;?/,
    "const { ui } = sdk;",
  );
  await new Function("sdk", `return (async () => {\n${source}\n})();`)(sdk);
  await flush();
  if (handler === undefined) throw new Error("JS twin did not register onEvent");
  for (const event of events) {
    await handler(event);
    await flush();
  }
  return frames;
}

async function recordGuida(
  bundle: string,
  events: ReadonlyArray<{ nodeId: string; event: string }>,
) {
  const frames: unknown[] = [];
  let handler: UiHandler | undefined;
  const sdk = {
    ui: {
      render: async (tree: unknown) => {
        frames.push(structuredClone(tree));
      },
      onEvent: (next: UiHandler) => {
        handler = next;
      },
    },
  };
  await new Function("sdk", `return (async () => {\n${bundle}\n})();`)(sdk);
  await flush();
  if (handler === undefined) throw new Error("Guida app did not register onEvent");
  for (const event of events) {
    await handler(event);
    await flush();
  }
  return frames;
}

describe.skipIf(
  await import("guida")
    .then(() => false)
    .catch(() => true),
)("Guida/JS widget-stream parity", () => {
  it("hello twins emit canonically identical frames for the same taps", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "tp-guida-hello-"));
    try {
      cpSync(template, cwd, { recursive: true });
      const built = await buildGuidaApp({ appDir: cwd });
      expect(built.bundle).toContain("sdk.ui.render");
      expect(built.bundle).toContain("sdk.ui.onEvent");
      const events = [
        { nodeId: "tap", event: "tap" },
        { nodeId: "tap", event: "tap" },
      ];
      const jsFrames = await recordJs(events);
      const guidaFrames = await recordGuida(built.bundle, events);
      expect(jsFrames.length).toBeGreaterThan(1);
      expect(canonical(guidaFrames)).toBe(canonical(jsFrames));
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 120_000);
});
