import type { WidgetNode, WidgetTree } from "@twistedpear/miniapp-runtime";

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

interface Placed {
  readonly width: number;
  readonly height: number;
}

interface ChildPlacement {
  readonly child: WidgetNode;
  readonly main: number;
  readonly size: Placed;
}

interface AxisDistribution {
  readonly offset: number;
  readonly between: number;
}

interface ContentBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

interface ContainerLayout {
  readonly row: boolean;
  readonly align: NonNullable<WidgetNode["style"]>["alignItems"];
  readonly bounds: ContentBounds;
  readonly cross: number;
  readonly distribution: AxisDistribution;
}

/** Monospace reference metric: every character has the same advance width. */
export const REFERENCE_METRIC = {
  defaultFontSize: 16,
  advanceWidth: (fontSize: number): number => Math.round(fontSize * 0.6),
  lineHeight: (fontSize: number): number => Math.round(fontSize * 1.25),
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
  listItemFontSize: 14,
} as const;

const FIXED_WIDTHS: Partial<Record<WidgetNode["type"], number>> = {
  switch: INTRINSIC.switchWidth,
  image: INTRINSIC.imageSize,
};

const MAX_WIDTHS: Partial<Record<WidgetNode["type"], number>> = {
  "camera-preview": 320,
  "map-preview": 320,
  "remote-video": 320,
  "audio-meter": 240,
  waveform: 240,
};

const FIXED_HEIGHTS: Partial<Record<WidgetNode["type"], number>> = {
  "text-input": INTRINSIC.textInputHeight,
  select: INTRINSIC.textInputHeight,
  slider: INTRINSIC.switchHeight,
  date: INTRINSIC.textInputHeight,
  switch: INTRINSIC.switchHeight,
  progress: INTRINSIC.progressHeight,
  divider: INTRINSIC.dividerHeight,
  spacer: INTRINSIC.spacerHeight,
  image: INTRINSIC.imageSize,
  "code-editor": INTRINSIC.codeEditorHeight,
  "camera-preview": 180,
  "map-preview": 180,
  "remote-video": 180,
  "audio-meter": 24,
  waveform: 64,
};

export function layoutWidgetTree(
  tree: WidgetTree,
  viewport: Viewport,
): Record<string, Box> {
  const boxes: Record<string, Box> = {};
  place(tree.root, 0, 0, viewport.width, boxes);
  return boxes;
}

function asString(value: unknown, fallback: string): string {
  return value === undefined || value === null ? fallback : String(value);
}

function textSize(value: string, fontSize: number): Placed {
  const lines = value.length === 0 ? [""] : value.split("\n");
  const widest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    width: widest * REFERENCE_METRIC.advanceWidth(fontSize),
    height: lines.length * REFERENCE_METRIC.lineHeight(fontSize),
  };
}

function place(
  node: WidgetNode,
  x: number,
  y: number,
  availWidth: number,
  boxes: Record<string, Box>,
): Placed {
  const style = node.style ?? {};
  if (style.display === "none") return { width: 0, height: 0 };

  const margin = style.margin ?? 0;
  const innerX = x + margin;
  const innerY = y + margin;
  const availInner = Math.max(0, availWidth - 2 * margin);
  const width =
    resolveWidth(style.width, availInner) ?? intrinsicWidth(node, availInner);
  const fontSize = style.fontSize ?? REFERENCE_METRIC.defaultFontSize;
  const contentHeight = measureContent(
    node,
    { x: innerX, y: innerY, width },
    fontSize,
    boxes,
  );
  const height = resolveHeight(style.height) ?? contentHeight;
  boxes[node.id] = { x: innerX, y: innerY, width, height };
  return { width: width + 2 * margin, height: height + 2 * margin };
}

function measureContent(
  node: WidgetNode,
  bounds: ContentBounds,
  fontSize: number,
  boxes: Record<string, Box>,
): number {
  if (node.type === "view" || node.type === "scroll") {
    return layoutContainer(node, bounds.x, bounds.y, bounds.width, boxes);
  }
  if (node.type === "list") {
    return layoutList(node, bounds.x, bounds.y, bounds.width, boxes);
  }
  return intrinsicHeight(node, fontSize);
}

function layoutList(
  node: WidgetNode,
  x: number,
  y: number,
  width: number,
  boxes: Record<string, Box>,
): number {
  const items = Array.isArray(node.props?.items) ? node.props.items : [];
  const lineHeight = REFERENCE_METRIC.lineHeight(INTRINSIC.listItemFontSize);
  items.forEach((_item, index) => {
    boxes[`${node.id}-item-${index}`] = {
      x,
      y: y + index * lineHeight,
      width,
      height: lineHeight,
    };
  });
  return items.length * lineHeight;
}

function layoutContainer(
  node: WidgetNode,
  x: number,
  y: number,
  width: number,
  boxes: Record<string, Box>,
): number {
  const style = node.style ?? {};
  const padding = style.padding ?? 0;
  const gap = style.gap ?? 0;
  const row = style.flexDirection === "row";
  const inner = Math.max(0, width - 2 * padding);
  const children = (node.children ?? []).filter(isDisplayed);
  const { placements, main, cross } = measureChildren(
    children,
    row,
    inner,
    gap,
  );
  const distribution = distributeMainAxis(
    row,
    style.justifyContent,
    inner,
    main,
    placements.length,
  );
  placeChildren(
    placements,
    {
      row,
      align: style.alignItems ?? "stretch",
      bounds: { x: x + padding, y: y + padding, width: inner },
      cross,
      distribution,
    },
    boxes,
  );
  return contentHeight(row, main, cross) + 2 * padding;
}

function isDisplayed(node: WidgetNode): boolean {
  return node.style?.display !== "none";
}

function measureChildren(
  children: readonly WidgetNode[],
  row: boolean,
  available: number,
  gap: number,
): { placements: ChildPlacement[]; main: number; cross: number } {
  const placements: ChildPlacement[] = [];
  let cursor = 0;
  let cross = 0;
  for (const child of children) {
    const size = place(child, 0, 0, available, {});
    placements.push({ child, main: cursor, size });
    cursor += mainSize(row, size) + gap;
    cross = Math.max(cross, crossSize(row, size));
  }
  const main = placements.length === 0 ? 0 : cursor - gap;
  return { placements, main, cross };
}

function mainSize(row: boolean, size: Placed): number {
  return row ? size.width : size.height;
}

function crossSize(row: boolean, size: Placed): number {
  return row ? size.height : size.width;
}

function distributeMainAxis(
  row: boolean,
  justify: NonNullable<WidgetNode["style"]>["justifyContent"],
  available: number,
  content: number,
  childCount: number,
): AxisDistribution {
  if (!row) return { offset: 0, between: 0 };
  const leftover = Math.max(0, available - content);
  if (justify === "center") {
    return { offset: Math.round(leftover / 2), between: 0 };
  }
  if (justify === "flex-end") return { offset: leftover, between: 0 };
  if (justify === "space-between" && childCount > 1) {
    return { offset: 0, between: Math.round(leftover / (childCount - 1)) };
  }
  return { offset: 0, between: 0 };
}

function placeChildren(
  placements: readonly ChildPlacement[],
  layout: ContainerLayout,
  boxes: Record<string, Box>,
): void {
  for (const [index, placement] of placements.entries()) {
    const main =
      placement.main +
      layout.distribution.offset +
      layout.distribution.between * index;
    const crossAvailable = layout.row ? layout.cross : layout.bounds.width;
    const crossPosition = alignCrossAxis(
      layout.align,
      crossAvailable,
      crossSize(layout.row, placement.size),
    );
    const childX = layout.bounds.x + (layout.row ? main : crossPosition);
    const childY = layout.bounds.y + (layout.row ? crossPosition : main);
    place(
      placement.child,
      childX,
      childY,
      layout.row ? placement.size.width : layout.bounds.width,
      boxes,
    );
  }
}

function alignCrossAxis(
  align: NonNullable<WidgetNode["style"]>["alignItems"],
  available: number,
  size: number,
): number {
  if (align === "center") return Math.round((available - size) / 2);
  if (align === "flex-end") return available - size;
  // Stretch sizing is handled by fill components taking the available width.
  return 0;
}

function contentHeight(row: boolean, main: number, cross: number): number {
  return row ? cross : main;
}

function resolveWidth(
  value: number | `${number}%` | undefined,
  avail: number,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return value;
  return Math.round((Number.parseFloat(value) / 100) * avail);
}

function resolveHeight(
  value: number | `${number}%` | undefined,
): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function intrinsicWidth(node: WidgetNode, available: number): number {
  const fontSize = node.style?.fontSize ?? REFERENCE_METRIC.defaultFontSize;
  if (node.type === "text") {
    return Math.min(
      available,
      textSize(asString(node.props?.value, ""), fontSize).width,
    );
  }
  if (node.type === "button") {
    return Math.min(
      available,
      textSize(asString(node.props?.label, "Button"), fontSize).width +
        2 * INTRINSIC.buttonPaddingX,
    );
  }
  if (node.type === "qr-code") return qrSize(node);
  const fixed = FIXED_WIDTHS[node.type];
  if (fixed !== undefined) return fixed;
  const maximum = MAX_WIDTHS[node.type];
  return maximum === undefined ? available : Math.min(available, maximum);
}

function intrinsicHeight(node: WidgetNode, fontSize: number): number {
  if (node.type === "text") {
    return textSize(asString(node.props?.value, ""), fontSize).height;
  }
  if (node.type === "button") {
    return REFERENCE_METRIC.lineHeight(fontSize) + 2 * INTRINSIC.buttonPaddingY;
  }
  if (node.type === "qr-code") return qrHeight(node, fontSize);
  return FIXED_HEIGHTS[node.type] ?? 0;
}

function qrSize(node: WidgetNode): number {
  return typeof node.props?.size === "number"
    ? node.props.size
    : INTRINSIC.qrSize;
}

function qrHeight(node: WidgetNode, fontSize: number): number {
  const caption =
    typeof node.props?.caption === "string"
      ? REFERENCE_METRIC.lineHeight(fontSize)
      : 0;
  return qrSize(node) + caption;
}
