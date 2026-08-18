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
});
