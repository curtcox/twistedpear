import { describe, expect, it } from "vitest";
import {
  REFERENCE_CONFIRMATION_FRAME,
  appBoxesStayInsideSurface,
  confirmationCopyInTree,
  confirmationIsHostLayer,
  layoutAppInFrame,
} from "../src/chrome-geometry.js";

describe("host chrome geometry", () => {
  it("keeps the confirmation layer above the app and clips full-bleed trees", () => {
    const frame = REFERENCE_CONFIRMATION_FRAME;
    expect(confirmationIsHostLayer(frame)).toBe(true);
    const tree = {
      root: {
        id: "root",
        type: "view" as const,
        style: { width: "100%" as const },
        children: [
          {
            id: "fill",
            type: "text" as const,
            props: { value: "hello" },
            style: { height: 800 },
          },
        ],
      },
    };
    const boxes = layoutAppInFrame(tree, frame);
    expect(appBoxesStayInsideSurface(boxes, frame.appSurface)).toBe(true);
    expect(
      confirmationCopyInTree(
        tree,
        frame.confirmation?.copy ?? { title: "", descriptions: [] },
      ),
    ).toBe(false);
  });

  it("treats a missing confirmation overlay as host-owned", () => {
    expect(
      confirmationIsHostLayer({
        ...REFERENCE_CONFIRMATION_FRAME,
        confirmation: null,
      }),
    ).toBe(true);
  });

  it("rejects app boxes that escape the surface and matches chrome copy in the tree", () => {
    const frame = REFERENCE_CONFIRMATION_FRAME;
    expect(
      appBoxesStayInsideSurface(
        { escaped: { x: -1, y: 0, width: 10, height: 10 } },
        frame.appSurface,
      ),
    ).toBe(false);
    const tree = {
      root: {
        id: "root",
        type: "view" as const,
        children: [
          {
            id: "title",
            type: "text" as const,
            props: { value: "Install an app?" },
          },
          {
            id: "hint",
            type: "text" as const,
            props: { label: "Reads your files" },
          },
        ],
      },
    };
    expect(
      confirmationCopyInTree(tree, {
        title: "Install an app?",
        descriptions: [],
      }),
    ).toBe(true);
    expect(
      confirmationCopyInTree(
        { root: { id: "root", type: "view" as const } },
        { title: "", descriptions: ["Reads your files"] },
      ),
    ).toBe(false);
    expect(
      confirmationCopyInTree(tree, {
        title: "",
        descriptions: ["Reads your files"],
      }),
    ).toBe(true);
  });
});
