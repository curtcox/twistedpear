import type { WidgetNode } from "@twistedpear/miniapp-runtime";
import { describe, expect, it } from "vitest";
import { layoutWidgetTree, REFERENCE_METRIC } from "../src/index.js";

function layout(root: WidgetNode, width = 320): Record<string, unknown> {
  return layoutWidgetTree({ root }, { width, height: 640 });
}

describe("REFERENCE_METRIC", () => {
  it("is a rounded monospace metric", () => {
    expect(REFERENCE_METRIC.defaultFontSize).toBe(16);
    expect(REFERENCE_METRIC.advanceWidth(16)).toBe(10);
    expect(REFERENCE_METRIC.lineHeight(16)).toBe(20);
    expect(REFERENCE_METRIC.advanceWidth(20)).toBe(12);
    expect(REFERENCE_METRIC.lineHeight(20)).toBe(25);
  });
});

describe("layoutWidgetTree intrinsic sizing", () => {
  it("sizes text from the character grid", () => {
    expect(
      layout({ id: "t", type: "text", props: { value: "Hello" } }),
    ).toEqual({ t: { x: 0, y: 0, width: 50, height: 20 } });
  });

  it("sizes multi-line text by its widest line", () => {
    expect(
      layout({ id: "t", type: "text", props: { value: "ab\ncdef" } }),
    ).toEqual({ t: { x: 0, y: 0, width: 40, height: 40 } });
  });

  it("gives empty text one line of height", () => {
    expect(layout({ id: "t", type: "text" })).toEqual({
      t: { x: 0, y: 0, width: 0, height: 20 },
    });
  });

  it("honours the node font size", () => {
    expect(
      layout({
        id: "t",
        type: "text",
        props: { value: "abc" },
        style: { fontSize: 20 },
      }),
    ).toEqual({ t: { x: 0, y: 0, width: 36, height: 25 } });
  });

  it("clamps text to the available width", () => {
    expect(
      layout({ id: "t", type: "text", props: { value: "abcdefgh" } }, 40),
    ).toEqual({ t: { x: 0, y: 0, width: 40, height: 20 } });
  });

  it("pads the default button label", () => {
    expect(layout({ id: "b", type: "button" })).toEqual({
      b: { x: 0, y: 0, width: 84, height: 32 },
    });
  });

  it.each([
    ["text-input", 320, 32],
    ["switch", 44, 24],
    ["progress", 320, 8],
    ["divider", 320, 1],
    ["spacer", 320, 8],
    ["image", 64, 64],
    ["code-editor", 320, 160],
  ] as const)("sizes %s intrinsically", (type, width, height) => {
    expect(layout({ id: "n", type })).toEqual({
      n: { x: 0, y: 0, width, height },
    });
  });

  it.each([
    ["camera-preview", 320, 180],
    ["map-preview", 320, 180],
    ["remote-video", 320, 180],
    ["audio-meter", 240, 24],
    ["waveform", 240, 64],
  ] as const)("caps %s at its maximum width", (type, width, height) => {
    expect(layout({ id: "n", type }, 400)).toEqual({
      n: { x: 0, y: 0, width, height },
    });
  });

  it("lets a narrow viewport shrink a capped surface", () => {
    expect(layout({ id: "n", type: "camera-preview" }, 200)).toEqual({
      n: { x: 0, y: 0, width: 200, height: 180 },
    });
  });

  it("sizes a qr code from its module size plus an optional caption", () => {
    expect(layout({ id: "q", type: "qr-code" })).toEqual({
      q: { x: 0, y: 0, width: 128, height: 128 },
    });
    expect(layout({ id: "q", type: "qr-code", props: { size: 64 } })).toEqual({
      q: { x: 0, y: 0, width: 64, height: 64 },
    });
    expect(
      layout({ id: "q", type: "qr-code", props: { caption: "scan" } }),
    ).toEqual({ q: { x: 0, y: 0, width: 128, height: 148 } });
  });
});

describe("layoutWidgetTree style resolution", () => {
  it("insets a node by its margin and shrinks the available width", () => {
    expect(
      layout({ id: "v", type: "view", style: { margin: 10 } }, 200),
    ).toEqual({ v: { x: 10, y: 10, width: 180, height: 0 } });
  });

  it("resolves a percentage width against the available width", () => {
    expect(
      layout(
        {
          id: "t",
          type: "text",
          props: { value: "x" },
          style: { width: "50%" },
        },
        300,
      ),
    ).toEqual({ t: { x: 0, y: 0, width: 150, height: 20 } });
  });

  it("uses an explicit numeric height in place of the content height", () => {
    expect(
      layout({
        id: "t",
        type: "text",
        props: { value: "x" },
        style: { height: 40 },
      }),
    ).toEqual({ t: { x: 0, y: 0, width: 10, height: 40 } });
  });

  it("falls back to the content height for a percentage height", () => {
    expect(
      layout({
        id: "t",
        type: "text",
        props: { value: "x" },
        style: { height: "50%" },
      }),
    ).toEqual({ t: { x: 0, y: 0, width: 10, height: 20 } });
  });

  it("records no box for a hidden node", () => {
    expect(
      layout({ id: "v", type: "view", style: { display: "none" } }),
    ).toEqual({});
  });

  it("skips hidden children when stacking", () => {
    expect(
      layout({
        id: "root",
        type: "view",
        children: [
          { id: "hidden", type: "spacer", style: { display: "none" } },
          { id: "shown", type: "spacer" },
        ],
      }),
    ).toEqual({
      root: { x: 0, y: 0, width: 320, height: 8 },
      shown: { x: 0, y: 0, width: 320, height: 8 },
    });
  });
});

describe("layoutWidgetTree containers", () => {
  it("stacks column children with padding and gap", () => {
    expect(
      layout(
        {
          id: "root",
          type: "view",
          style: { padding: 8, gap: 4 },
          children: [
            { id: "a", type: "text", props: { value: "ab" } },
            { id: "b", type: "text", props: { value: "cde" } },
          ],
        },
        200,
      ),
    ).toEqual({
      root: { x: 0, y: 0, width: 200, height: 60 },
      a: { x: 8, y: 8, width: 20, height: 20 },
      b: { x: 8, y: 32, width: 30, height: 20 },
    });
  });

  it("lays scroll containers out like views", () => {
    expect(
      layout({
        id: "root",
        type: "scroll",
        children: [{ id: "a", type: "divider" }],
      }),
    ).toEqual({
      root: { x: 0, y: 0, width: 320, height: 1 },
      a: { x: 0, y: 0, width: 320, height: 1 },
    });
  });

  it("gives an empty container zero content height", () => {
    expect(layout({ id: "root", type: "view", style: { gap: 6 } })).toEqual({
      root: { x: 0, y: 0, width: 320, height: 0 },
    });
  });

  it("centers a row on both axes", () => {
    expect(
      layout(
        {
          id: "root",
          type: "view",
          style: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          },
          children: [
            { id: "s", type: "switch" },
            { id: "i", type: "image" },
          ],
        },
        200,
      ),
    ).toEqual({
      root: { x: 0, y: 0, width: 200, height: 64 },
      s: { x: 46, y: 20, width: 44, height: 24 },
      i: { x: 90, y: 0, width: 64, height: 64 },
    });
  });

  it("pushes a row to the end", () => {
    const boxes = layout(
      {
        id: "root",
        type: "view",
        style: { flexDirection: "row", justifyContent: "flex-end" },
        children: [
          { id: "s", type: "switch" },
          { id: "i", type: "image" },
        ],
      },
      200,
    );

    expect(boxes.s).toEqual({ x: 92, y: 0, width: 44, height: 24 });
    expect(boxes.i).toEqual({ x: 136, y: 0, width: 64, height: 64 });
  });

  it("spreads the leftover space between row children", () => {
    const boxes = layout(
      {
        id: "root",
        type: "view",
        style: { flexDirection: "row", justifyContent: "space-between" },
        children: [
          { id: "s", type: "switch" },
          { id: "i", type: "image" },
        ],
      },
      200,
    );

    expect(boxes.s).toEqual({ x: 0, y: 0, width: 44, height: 24 });
    expect(boxes.i).toEqual({ x: 136, y: 0, width: 64, height: 64 });
  });

  it("leaves a single space-between child at the start", () => {
    expect(
      layout(
        {
          id: "root",
          type: "view",
          style: { flexDirection: "row", justifyContent: "space-between" },
          children: [{ id: "s", type: "switch" }],
        },
        200,
      ).s,
    ).toEqual({ x: 0, y: 0, width: 44, height: 24 });
  });

  it("aligns row children to the cross-axis end", () => {
    expect(
      layout(
        {
          id: "root",
          type: "view",
          style: { flexDirection: "row", alignItems: "flex-end" },
          children: [
            { id: "s", type: "switch" },
            { id: "i", type: "image" },
          ],
        },
        200,
      ).s,
    ).toEqual({ x: 0, y: 40, width: 44, height: 24 });
  });

  it("places one box per list item on the item grid", () => {
    expect(
      layout({ id: "l", type: "list", props: { items: ["a", "b", "c"] } }, 100),
    ).toEqual({
      l: { x: 0, y: 0, width: 100, height: 54 },
      "l-item-0": { x: 0, y: 0, width: 100, height: 18 },
      "l-item-1": { x: 0, y: 18, width: 100, height: 18 },
      "l-item-2": { x: 0, y: 36, width: 100, height: 18 },
    });
  });

  it("gives a list with no items zero height", () => {
    expect(layout({ id: "l", type: "list" }, 100)).toEqual({
      l: { x: 0, y: 0, width: 100, height: 0 },
    });
  });
});
