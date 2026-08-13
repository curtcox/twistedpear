import type { WidgetNode, WidgetTree } from "@twistedpear/miniapp-runtime";
import { describe, expect, it } from "vitest";
import {
  applyWidgetPatches,
  containsId,
  UnappliablePatchError,
} from "../src/index.js";

const base: WidgetTree = {
  root: {
    id: "root",
    type: "view",
    children: [
      { id: "a", type: "text", props: { value: "a" } },
      {
        id: "b",
        type: "view",
        children: [{ id: "b1", type: "text", props: { value: "b1" } }],
      },
    ],
  },
};

function ids(node: WidgetNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(ids)];
}

describe("containsId", () => {
  it("finds the node itself and any descendant", () => {
    expect(containsId(base.root, "root")).toBe(true);
    expect(containsId(base.root, "b1")).toBe(true);
  });

  it("reports ids that are absent", () => {
    expect(containsId(base.root, "missing")).toBe(false);
  });
});

describe("applyWidgetPatches", () => {
  it("returns the tree unchanged for an empty patch list", () => {
    expect(applyWidgetPatches(base, [])).toEqual(base);
  });

  it("replaces a nested node in place", () => {
    const next = applyWidgetPatches(base, [
      {
        op: "replace",
        id: "b1",
        node: { id: "b1", type: "text", props: { value: "changed" } },
      },
    ]);

    expect(next.root.children?.[1]?.children?.[0]?.props).toEqual({
      value: "changed",
    });
    expect(next.root.children?.[0]).toBe(base.root.children?.[0]);
  });

  it("replaces the root wholesale", () => {
    const replacement: WidgetNode = { id: "root", type: "scroll" };
    expect(
      applyWidgetPatches(base, [
        { op: "replace", id: "root", node: replacement },
      ]),
    ).toEqual({ root: replacement });
  });

  it("removes a subtree", () => {
    const next = applyWidgetPatches(base, [{ op: "remove", id: "b" }]);
    expect(ids(next.root)).toEqual(["root", "a"]);
  });

  it("applies patches in order", () => {
    const next = applyWidgetPatches(base, [
      {
        op: "replace",
        id: "a",
        node: {
          id: "a",
          type: "view",
          children: [{ id: "a1", type: "divider" }],
        },
      },
      { op: "remove", id: "b" },
    ]);

    expect(ids(next.root)).toEqual(["root", "a", "a1"]);
  });

  it("ignores a remove whose id is not in the tree", () => {
    expect(applyWidgetPatches(base, [{ op: "remove", id: "gone" }])).toEqual(
      base,
    );
  });

  it("rejects a replace targeting an id that is not in the tree", () => {
    const patch = {
      op: "replace",
      id: "gone",
      node: { id: "gone", type: "divider" },
    } as const;

    expect(() => applyWidgetPatches(base, [patch])).toThrow(
      UnappliablePatchError,
    );
    try {
      applyWidgetPatches(base, [patch]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(UnappliablePatchError);
      expect((error as UnappliablePatchError).patch).toBe(patch);
      expect((error as UnappliablePatchError).name).toBe(
        "UnappliablePatchError",
      );
    }
  });

  it("rejects a replace that follows the removal of the root", () => {
    expect(() =>
      applyWidgetPatches(base, [
        { op: "remove", id: "root" },
        { op: "replace", id: "a", node: { id: "a", type: "divider" } },
      ]),
    ).toThrow(UnappliablePatchError);
  });

  it("rejects a stream that removes the root outright", () => {
    expect(() =>
      applyWidgetPatches(base, [{ op: "remove", id: "root" }]),
    ).toThrow("patch stream removed the root node");
  });
});
