import { describe, expect, it } from "vitest";
import { diffWidgetTrees, validateWidgetTree } from "../src/index.js";

describe("widget trees", () => {
  it("accepts a whitelisted tree", () => {
    const tree = {
      root: {
        id: "root",
        type: "view",
        style: { padding: 12 },
        children: [{ id: "title", type: "text", props: { value: "Hello" } }]
      }
    } as const;

    expect(validateWidgetTree(tree)).toBe(tree);
  });

  it("rejects unsupported components, props, styles, and depth", () => {
    expect(() => validateWidgetTree({ root: { id: "x", type: "webview" as "view" } })).toThrow(/Unsupported widget type/);
    expect(() => validateWidgetTree({ root: { id: "x", type: "text", props: { html: "<b>x</b>" } } })).toThrow(/Unsupported text prop/);
    expect(() => validateWidgetTree({ root: { id: "x", type: "view", style: { position: "absolute" } } })).toThrow(/Unsupported style/);
    expect(() =>
      validateWidgetTree(
        { root: { id: "a", type: "view", children: [{ id: "b", type: "view", children: [{ id: "c", type: "view" }] }] } },
        { maxDepth: 2 }
      )
    ).toThrow(/depth/);
  });

  it("diffs changed and removed nodes", () => {
    const previous = {
      root: {
        id: "root",
        type: "view",
        children: [
          { id: "title", type: "text", props: { value: "Old" } },
          { id: "gone", type: "text", props: { value: "Gone" } }
        ]
      }
    } as const;
    const next = {
      root: {
        id: "root",
        type: "view",
        children: [{ id: "title", type: "text", props: { value: "New" } }]
      }
    } as const;

    expect(diffWidgetTrees(previous, next)).toEqual([
      { op: "replace", id: "title", node: { id: "title", type: "text", props: { value: "New" } } },
      { op: "remove", id: "gone" }
    ]);
  });
});
