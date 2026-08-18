import type { WidgetTree } from "@twistedpear/miniapp-runtime";
import { layoutWidgetTree, type Box, type Viewport } from "./geometry.js";

/**
 * CHROME-R3 snapshot geometry: host chrome is a sibling layer of the app
 * surface, never a descendant of the widget tree. App boxes are clipped to
 * the surface; the confirmation layer sits at a higher z and cannot be
 * painted over.
 */
export interface ChromeCopy {
  readonly title: string;
  readonly descriptions: ReadonlyArray<string>;
}

export interface HostChromeFrame {
  readonly viewport: Viewport;
  readonly appSurface: Box;
  readonly appLayerZ: number;
  readonly confirmation: {
    readonly z: number;
    readonly box: Box;
    readonly copy: ChromeCopy;
  } | null;
}

/** Reference phone frame: confirmation card is a host overlay, not app UI. */
export const REFERENCE_CONFIRMATION_FRAME: HostChromeFrame = {
  viewport: { width: 390, height: 844 },
  appSurface: { x: 0, y: 0, width: 390, height: 844 },
  appLayerZ: 0,
  confirmation: {
    z: 1,
    box: { x: 24, y: 180, width: 342, height: 280 },
    copy: { title: "Install an app?", descriptions: [] },
  },
};

export function layoutAppInFrame(
  tree: WidgetTree,
  frame: HostChromeFrame,
): Record<string, Box> {
  const raw = layoutWidgetTree(tree, {
    width: frame.appSurface.width,
    height: frame.appSurface.height,
  });
  const boxes: Record<string, Box> = {};
  for (const [id, box] of Object.entries(raw)) {
    boxes[id] = {
      x: frame.appSurface.x + box.x,
      y: frame.appSurface.y + box.y,
      width: box.width,
      height: box.height,
    };
  }
  return boxes;
}

export function appBoxesStayInsideSurface(
  boxes: Readonly<Record<string, Box>>,
  surface: Box,
): boolean {
  return Object.values(boxes).every(
    (box) =>
      box.x >= surface.x &&
      box.y >= surface.y &&
      box.x + box.width <= surface.x + surface.width &&
      box.y + box.height <= surface.y + surface.height,
  );
}

export function confirmationIsHostLayer(frame: HostChromeFrame): boolean {
  const chrome = frame.confirmation;
  if (chrome === null) return true;
  return chrome.z > frame.appLayerZ;
}

export function confirmationCopyInTree(
  tree: WidgetTree,
  copy: ChromeCopy,
): boolean {
  const blobs = flattenText(tree.root);
  if (copy.title.length > 0 && blobs.includes(copy.title)) return true;
  return copy.descriptions.some((line) => blobs.includes(line));
}

function flattenText(node: {
  readonly props?: Readonly<Record<string, unknown>>;
  readonly children?: ReadonlyArray<typeof node>;
}): string {
  const parts: string[] = [];
  const props = node.props ?? {};
  for (const key of ["value", "label", "placeholder", "caption"] as const) {
    const value = props[key];
    if (typeof value === "string") parts.push(value);
  }
  for (const child of node.children ?? []) parts.push(flattenText(child));
  return parts.join("\n");
}
