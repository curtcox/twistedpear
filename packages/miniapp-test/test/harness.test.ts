import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { describeWidgetTree, mountApp, mountAppFromDir } from "../src/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function treeText(node: ReturnType<typeof describeWidgetTree> | null): string {
  if (node === null) return "";
  const value = typeof node.props?.value === "string" ? node.props.value : "";
  const children = (node.children ?? []).map(treeText).join(" ");
  return `${value} ${children}`.trim();
}

describe("miniapp-test harness", () => {
  it("mounts dice-table and records a coin flip on the golden tree", async () => {
    const handle = await mountAppFromDir(
      join(repoRoot, "cookbook/apps/dice-table"),
    );
    try {
      expect(handle.tree()?.component).toBe("View");
      await handle.fire("dice.coin");
      const text = treeText(handle.tree());
      expect(text.includes("Heads") || text.includes("Tails")).toBe(true);
    } finally {
      await handle.close();
    }
  });

  it("reproduces a capability denial after revoke", async () => {
    const bundle = new TextEncoder().encode(`
sdk.ui.onEvent(async () => {
  try {
    await sdk.storage.kv.set("k", new TextEncoder().encode("v"));
    await sdk.ui.render({
      root: { id: "root", type: "text", props: { value: "wrote" } }
    });
  } catch (error) {
    await sdk.ui.render({
      root: {
        id: "root",
        type: "text",
        props: { value: error instanceof Error ? error.message : String(error) }
      }
    });
  }
});
await sdk.ui.render({
  root: {
    id: "root",
    type: "view",
    children: [{ id: "go", type: "button", props: { label: "Go", event: "write" } }]
  }
});
`);
    const handle = await mountApp({
      manifest: {
        name: "deny-app",
        version: "1.0.0",
        entry: "bundle.js",
        capabilities: ["storage:kv"],
        publisherPublicKey: "publisher",
      },
      bundle,
      grants: ["storage:kv"],
    });
    try {
      await handle.revoke("storage:kv");
      await handle.fire("write");
      expect(treeText(handle.tree()).toLowerCase()).toMatch(
        /denied|capability/,
      );
    } finally {
      await handle.close();
    }
  });

  it("reproduces a quota failure", async () => {
    const bundle = new TextEncoder().encode(`
sdk.ui.onEvent(async () => {
  try {
    await sdk.storage.kv.set("k", new Uint8Array(64));
    await sdk.ui.render({
      root: { id: "root", type: "text", props: { value: "wrote" } }
    });
  } catch (error) {
    await sdk.ui.render({
      root: {
        id: "root",
        type: "text",
        props: { value: error instanceof Error ? error.message : String(error) }
      }
    });
  }
});
await sdk.ui.render({
  root: {
    id: "root",
    type: "view",
    children: [{ id: "go", type: "button", props: { label: "Go", event: "write" } }]
  }
});
`);
    const handle = await mountApp({
      manifest: {
        name: "quota-app",
        version: "1.0.0",
        entry: "bundle.js",
        capabilities: ["storage:kv"],
        publisherPublicKey: "publisher",
      },
      bundle,
      grants: ["storage:kv"],
      quotas: { kvQuotaBytes: 8 },
    });
    try {
      await handle.fire("write");
      expect(treeText(handle.tree()).toLowerCase()).toMatch(/quota/);
    } finally {
      await handle.close();
    }
  });

  it("reuses describeWidgetTree for assertions", async () => {
    const handle = await mountAppFromDir(
      join(repoRoot, "cookbook/apps/breath-pacer"),
    );
    try {
      const raw = handle.rawTree();
      expect(raw).not.toBeNull();
      expect(handle.tree()).toEqual(describeWidgetTree(raw!));
    } finally {
      await handle.close();
    }
  });
});
