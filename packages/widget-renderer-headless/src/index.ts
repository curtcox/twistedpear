/**
 * Headless-snapshot widget renderer — the SPEC-WIDGET conformance oracle.
 *
 * Independently interprets the widget vocabulary (it deliberately does not
 * import the RN renderer or `describeWidgetTree`; parity tests compare the two
 * interpretations node-for-node), applies update-stream patches, renders
 * deterministic text snapshots, and computes SPEC-PRESENT reference geometry
 * under the monospace reference metric.
 */
import type {
  RenderedWidgetNode,
  WidgetNode,
  WidgetPatch,
  WidgetTree
} from "@twistedpear/miniapp-runtime";
import { visitWidget } from "@twistedpear/miniapp-runtime";

// ---------------------------------------------------------------------------
// Interpretation (SPEC-WIDGET): tree -> rendered model
// ---------------------------------------------------------------------------

export function renderHeadlessTree(tree: WidgetTree): RenderedWidgetNode {
  return renderNode(tree.root);
}

function renderNode(node: WidgetNode): RenderedWidgetNode {
  const style = renderStyle(node.style);
  const base = {
    id: node.id,
    ...(style === undefined ? {} : { style })
  };
  const children = (node.children ?? []).map(renderNode);
  const withChildren = children.length === 0 ? {} : { children };

  return visitWidget(node, {
    view: () => ({ ...base, component: "View", ...withChildren }),
    scroll: () => ({ ...base, component: "ScrollView", ...withChildren }),
    text: (n) => ({ ...base, component: "Text", props: { value: asString(n.props?.value, "") } }),
    button: (n) => ({
      ...base,
      component: "Button",
      props: {
        label: asString(n.props?.label, "Button"),
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {})
      }
    }),
    "text-input": (n) => ({
      ...base,
      component: "TextInput",
      props: {
        value: asString(n.props?.value, ""),
        placeholder: asString(n.props?.placeholder, ""),
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {})
      }
    }),
    switch: (n) => ({
      ...base,
      component: "Switch",
      props: {
        value: Boolean(n.props?.value),
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {})
      }
    }),
    divider: () => ({ ...base, component: "Divider" }),
    spacer: () => ({ ...base, component: "Spacer", props: { height: 8 } }),
    progress: (n) => ({ ...base, component: "Progress", props: { value: n.props?.value ?? 0 } }),
    list: (n) => ({
      ...base,
      component: "List",
      children: (Array.isArray(n.props?.items) ? n.props.items : []).map((item, index) => ({
        component: "ListItem",
        id: `${n.id}-item-${index}`,
        props: { value: typeof item === "string" ? item : JSON.stringify(item) }
      }))
    }),
    image: (n) => ({ ...base, component: "Image", props: { asset: asString(n.props?.asset, "") } }),
    "code-editor": (n) => ({
      ...base,
      component: "CodeEditor",
      props: {
        documentId: asString(n.props?.documentId, ""),
        language: typeof n.props?.language === "string" ? n.props.language : "text",
        readOnly: Boolean(n.props?.readOnly),
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {})
      }
    }),
    "qr-code": (n) => ({
      ...base,
      component: "QrCode",
      props: {
        value: asString(n.props?.value, ""),
        ...(typeof n.props?.size === "number" ? { size: n.props.size } : {}),
        ...(typeof n.props?.caption === "string" ? { caption: n.props.caption } : {})
      }
    }),
    "camera-preview": (n) => previewSurface(base, n),
    "audio-meter": (n) => previewSurface(base, n),
    waveform: (n) => previewSurface(base, n),
    "map-preview": (n) => previewSurface(base, n),
    "remote-video": (n) => previewSurface(base, n)
  });
}

function previewSurface(
  base: { readonly id: string; readonly style?: Readonly<Record<string, unknown>> },
  node: WidgetNode
): RenderedWidgetNode {
  return {
    ...base,
    component: "DevicePreview",
    props: {
      surface: node.type,
      session: asString(node.props?.session, "")
    }
  };
}

function asString(value: unknown, fallback: string): string {
  return value === undefined || value === null ? fallback : String(value);
}

function renderStyle(style: WidgetNode["style"]): Readonly<Record<string, unknown>> | undefined {
  if (style === undefined) return undefined;
  const out: Record<string, unknown> = {};
  if (style.display !== undefined) out.display = style.display === "none" ? "none" : "flex";
  if (style.flexDirection !== undefined) out.flexDirection = style.flexDirection;
  if (style.alignItems !== undefined) out.alignItems = style.alignItems;
  if (style.justifyContent !== undefined) out.justifyContent = style.justifyContent;
  if (style.gap !== undefined) out.gap = style.gap;
  if (style.padding !== undefined) out.padding = style.padding;
  if (style.margin !== undefined) out.margin = style.margin;
  if (style.width !== undefined) out.width = style.width;
  if (style.height !== undefined) out.height = style.height;
  if (style.backgroundColor !== undefined) out.backgroundColor = style.backgroundColor;
  if (style.color !== undefined) out.color = style.color;
  if (style.fontSize !== undefined) out.fontSize = style.fontSize;
  if (style.fontWeight !== undefined) {
    out.fontWeight = style.fontWeight === "bold" ? "700" : style.fontWeight === "medium" ? "500" : "400";
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

// ---------------------------------------------------------------------------
// Update stream (SPEC-WIDGET): independent patch consumer
// ---------------------------------------------------------------------------

/**
 * Apply a diff stream to a tree. The stream format (SPEC-WIDGET) can replace
 * or remove nodes by id; it cannot express the insertion position of a child
 * whose id was absent from the previous frame — hosts always deliver the full
 * next tree alongside patches, so such a patch is a render invalidation, not
 * a constructive edit. This consumer is therefore strict: a replace targeting
 * an id not present in the tree throws `UnappliablePatchError`.
 */
export class UnappliablePatchError extends Error {
  constructor(readonly patch: WidgetPatch) {
    super(`replace patch targets id not present in the tree: ${patch.id}`);
    this.name = "UnappliablePatchError";
  }
}

export function applyWidgetPatches(tree: WidgetTree, patches: readonly WidgetPatch[]): WidgetTree {
  let root: WidgetNode | null = tree.root;
  for (const patch of patches) {
    if (patch.op === "replace" && (root === null || !containsId(root, patch.id))) {
      throw new UnappliablePatchError(patch);
    }
    root = root === null ? null : applyPatch(root, patch);
  }
  if (root === null) {
    throw new Error("patch stream removed the root node");
  }
  return { root };
}

function applyPatch(root: WidgetNode, patch: WidgetPatch): WidgetNode | null {
  if (patch.id === root.id) return patch.op === "replace" ? patch.node : null;
  const children = root.children ?? [];
  let changed = false;
  const next: WidgetNode[] = [];
  for (const child of children) {
    const replaced = applyPatch(child, patch);
    if (replaced !== child) changed = true;
    if (replaced !== null) next.push(replaced);
  }
  return changed ? { ...root, children: next } : root;
}

export function containsId(node: WidgetNode, id: string): boolean {
  if (node.id === id) return true;
  return (node.children ?? []).some((child) => containsId(child, id));
}

// ---------------------------------------------------------------------------
// Snapshot: deterministic text rendering of the rendered model
// ---------------------------------------------------------------------------

export function renderHeadlessSnapshot(tree: WidgetTree): string {
  const lines: string[] = [];
  const emit = (node: RenderedWidgetNode, depth: number): void => {
    const pad = "  ".repeat(depth);
    const props =
      node.props === undefined || Object.keys(node.props).length === 0
        ? ""
        : ` ${stableJson(node.props)}`;
    const style = node.style === undefined ? "" : ` style=${stableJson(node.style)}`;
    lines.push(`${pad}${node.component}#${node.id}${props}${style}`);
    for (const child of node.children ?? []) emit(child, depth + 1);
  };
  emit(renderHeadlessTree(tree), 0);
  return lines.join("\n");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// Reference geometry (SPEC-PRESENT): monospace metric, flex-subset layout
// ---------------------------------------------------------------------------

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Monospace reference metric: every character has the same advance width. */
export const REFERENCE_METRIC = {
  defaultFontSize: 16,
  advanceWidth: (fontSize: number): number => Math.round(fontSize * 0.6),
  lineHeight: (fontSize: number): number => Math.round(fontSize * 1.25)
} as const;

const INTRINSIC = {
  buttonPaddingX: 12,
  buttonPaddingY: 6,
  textInputHeight: 32,
  switchWidth: 44,
  switchHeight: 24,
  progressHeight: 8,
  dividerHeight: 1,
  spacerHeight: 8,
  imageSize: 64,
  qrSize: 128,
  codeEditorHeight: 160,
  listItemFontSize: 14
} as const;

export function layoutWidgetTree(tree: WidgetTree, viewport: Viewport): Record<string, Box> {
  const boxes: Record<string, Box> = {};
  place(tree.root, 0, 0, viewport.width, boxes);
  return boxes;
}

interface Placed {
  readonly width: number;
  readonly height: number;
}

function textSize(value: string, fontSize: number): Placed {
  const lines = value.length === 0 ? [""] : value.split("\n");
  const widest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    width: widest * REFERENCE_METRIC.advanceWidth(fontSize),
    height: lines.length * REFERENCE_METRIC.lineHeight(fontSize)
  };
}

function place(
  node: WidgetNode,
  x: number,
  y: number,
  availWidth: number,
  boxes: Record<string, Box>
): Placed {
  const style = node.style ?? {};
  if (style.display === "none") {
    return { width: 0, height: 0 };
  }
  const margin = style.margin ?? 0;
  const innerX = x + margin;
  const innerY = y + margin;
  const availInner = Math.max(0, availWidth - 2 * margin);
  const width = resolveWidth(style.width, availInner) ?? intrinsicWidth(node, availInner);
  const fontSize = style.fontSize ?? REFERENCE_METRIC.defaultFontSize;

  let contentHeight = 0;
  if (node.type === "view" || node.type === "scroll") {
    contentHeight = layoutContainer(node, innerX, innerY, width, boxes);
  } else if (node.type === "list") {
    const items = Array.isArray(node.props?.items) ? node.props.items : [];
    const lineHeight = REFERENCE_METRIC.lineHeight(INTRINSIC.listItemFontSize);
    items.forEach((_item, index) => {
      boxes[`${node.id}-item-${index}`] = {
        x: innerX,
        y: innerY + index * lineHeight,
        width,
        height: lineHeight
      };
    });
    contentHeight = items.length * lineHeight;
  } else {
    contentHeight = intrinsicHeight(node, fontSize);
  }

  const height = resolveHeight(style.height) ?? contentHeight;
  boxes[node.id] = { x: innerX, y: innerY, width, height };
  return { width: width + 2 * margin, height: height + 2 * margin };
}

function layoutContainer(
  node: WidgetNode,
  x: number,
  y: number,
  width: number,
  boxes: Record<string, Box>
): number {
  const style = node.style ?? {};
  const padding = style.padding ?? 0;
  const gap = style.gap ?? 0;
  const row = style.flexDirection === "row";
  const align = style.alignItems ?? "stretch";
  const inner = Math.max(0, width - 2 * padding);
  const children = (node.children ?? []).filter((child) => child.style?.display !== "none");

  // Measure pass (scratch box map), then place pass with final coordinates.
  const placements: Array<{ child: WidgetNode; main: number; size: Placed }> = [];
  let cursor = 0;
  let cross = 0;
  for (const child of children) {
    const size = place(child, 0, 0, inner, {});
    placements.push({ child, main: cursor, size });
    cursor += (row ? size.width : size.height) + gap;
    cross = Math.max(cross, row ? size.height : size.width);
  }
  const contentMain = placements.length === 0 ? 0 : cursor - gap;

  // Main-axis distribution is only meaningful along a bounded axis (rows).
  let offset = 0;
  let between = 0;
  if (row) {
    const leftover = Math.max(0, inner - contentMain);
    if (style.justifyContent === "center") offset = Math.round(leftover / 2);
    else if (style.justifyContent === "flex-end") offset = leftover;
    else if (style.justifyContent === "space-between" && placements.length > 1) {
      between = Math.round(leftover / (placements.length - 1));
    }
  }

  for (const [index, placement] of placements.entries()) {
    const mainPos = placement.main + offset + between * index;
    const crossAvail = row ? cross : inner;
    const crossSize = row ? placement.size.height : placement.size.width;
    // "stretch" positions at the cross start; stretch sizing is handled by
    // fill components taking the available width in place().
    let crossPos = 0;
    if (align === "center") crossPos = Math.round((crossAvail - crossSize) / 2);
    else if (align === "flex-end") crossPos = crossAvail - crossSize;
    const childX = x + padding + (row ? mainPos : crossPos);
    const childY = y + padding + (row ? crossPos : mainPos);
    place(placement.child, childX, childY, row ? placement.size.width : inner, boxes);
  }

  // The container's content height: rows extend along x, so their height is
  // the cross extent; columns stack along y, so it is the main extent.
  return (row ? cross : contentMain) + 2 * padding;
}

function resolveWidth(value: number | `${number}%` | undefined, avail: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return value;
  return Math.round((Number.parseFloat(value) / 100) * avail);
}

function resolveHeight(value: number | `${number}%` | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function intrinsicWidth(node: WidgetNode, avail: number): number {
  const fontSize = node.style?.fontSize ?? REFERENCE_METRIC.defaultFontSize;
  switch (node.type) {
    case "text":
      return Math.min(avail, textSize(asString(node.props?.value, ""), fontSize).width);
    case "button":
      return Math.min(
        avail,
        textSize(asString(node.props?.label, "Button"), fontSize).width + 2 * INTRINSIC.buttonPaddingX
      );
    case "switch":
      return INTRINSIC.switchWidth;
    case "image":
      return INTRINSIC.imageSize;
    case "qr-code":
      return typeof node.props?.size === "number" ? node.props.size : INTRINSIC.qrSize;
    case "camera-preview":
    case "map-preview":
    case "remote-video":
      return Math.min(avail, 320);
    case "audio-meter":
    case "waveform":
      return Math.min(avail, 240);
    default:
      return avail; // stretch components fill the available width
  }
}

function intrinsicHeight(node: WidgetNode, fontSize: number): number {
  switch (node.type) {
    case "text":
      return textSize(asString(node.props?.value, ""), fontSize).height;
    case "button":
      return REFERENCE_METRIC.lineHeight(fontSize) + 2 * INTRINSIC.buttonPaddingY;
    case "text-input":
      return INTRINSIC.textInputHeight;
    case "switch":
      return INTRINSIC.switchHeight;
    case "progress":
      return INTRINSIC.progressHeight;
    case "divider":
      return INTRINSIC.dividerHeight;
    case "spacer":
      return INTRINSIC.spacerHeight;
    case "image":
      return INTRINSIC.imageSize;
    case "qr-code": {
      const size = typeof node.props?.size === "number" ? node.props.size : INTRINSIC.qrSize;
      const caption = typeof node.props?.caption === "string" ? REFERENCE_METRIC.lineHeight(fontSize) : 0;
      return size + caption;
    }
    case "code-editor":
      return INTRINSIC.codeEditorHeight;
    case "camera-preview":
    case "map-preview":
    case "remote-video":
      return 180;
    case "audio-meter":
      return 24;
    case "waveform":
      return 64;
    default:
      return 0;
  }
}
