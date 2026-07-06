export type WidgetType =
  | "view"
  | "text"
  | "image"
  | "button"
  | "text-input"
  | "switch"
  | "scroll"
  | "list"
  | "progress"
  | "divider"
  | "spacer";

export type WidgetStyle = Partial<{
  display: "flex" | "none";
  flexDirection: "row" | "column";
  alignItems: "stretch" | "flex-start" | "center" | "flex-end";
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between";
  gap: number;
  padding: number;
  margin: number;
  width: number | `${number}%`;
  height: number | `${number}%`;
  backgroundColor: string;
  color: string;
  fontSize: 12 | 14 | 16 | 20 | 24 | 32;
  fontWeight: "regular" | "medium" | "bold";
}>;

export interface WidgetNode {
  readonly id: string;
  readonly type: WidgetType;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly style?: WidgetStyle;
  readonly children?: ReadonlyArray<WidgetNode>;
}

export interface WidgetTree {
  readonly root: WidgetNode;
}

export const WIDGET_TYPES: ReadonlySet<string> = new Set([
  "view",
  "text",
  "image",
  "button",
  "text-input",
  "switch",
  "scroll",
  "list",
  "progress",
  "divider",
  "spacer"
]);

export const WIDGET_STYLE_KEYS: ReadonlySet<string> = new Set([
  "display",
  "flexDirection",
  "alignItems",
  "justifyContent",
  "gap",
  "padding",
  "margin",
  "width",
  "height",
  "backgroundColor",
  "color",
  "fontSize",
  "fontWeight"
]);

export const WIDGET_PROP_KEYS: ReadonlyMap<WidgetType, ReadonlySet<string>> = new Map([
  ["view", new Set(["accessibilityLabel"])],
  ["text", new Set(["value"])],
  ["image", new Set(["asset", "alt"])],
  ["button", new Set(["label", "event"])],
  ["text-input", new Set(["value", "placeholder", "event"])],
  ["switch", new Set(["value", "event"])],
  ["scroll", new Set(["event"])],
  ["list", new Set(["items", "event"])],
  ["progress", new Set(["value", "max"])],
  ["divider", new Set()],
  ["spacer", new Set(["size"])]
]);
