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
  | "spacer"
  | "code-editor"
  | "qr-code"
  | "camera-preview"
  | "audio-meter"
  | "waveform"
  | "map-preview"
  | "remote-video";

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
  "spacer",
  "code-editor",
  "qr-code",
  "camera-preview",
  "audio-meter",
  "waveform",
  "map-preview",
  "remote-video"
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
  ["scroll", new Set(["event", "scrollOffset"])],
  ["list", new Set(["items", "event"])],
  ["progress", new Set(["value", "max"])],
  ["divider", new Set()],
  ["spacer", new Set(["size"])],
  // Content-by-reference: the editor carries a workspace documentId, never file
  // text, so large sources cannot blow the widget-tree byte budget.
  ["code-editor", new Set(["documentId", "language", "readOnly", "event"])],
  ["qr-code", new Set(["value", "size", "caption"])],
  // Preview surfaces: host draws live device output; apps lay out a region but
  // cannot read pixels/samples back through the widget tree.
  ["camera-preview", new Set(["session", "aspectRatio"])],
  ["audio-meter", new Set(["session"])],
  ["waveform", new Set(["session"])],
  ["map-preview", new Set(["session", "zoom"])],
  ["remote-video", new Set(["session", "peer"])]
]);

export const CODE_EDITOR_LANGUAGES: ReadonlySet<string> = new Set(["javascript", "json", "text"]);
export const MAX_QR_CODE_VALUE_LENGTH = 512;
export const MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH = 256;
export const MAX_DEVICE_SESSION_PROP_LENGTH = 128;
export const PREVIEW_SURFACE_TYPES: ReadonlySet<WidgetType> = new Set([
  "camera-preview",
  "audio-meter",
  "waveform",
  "map-preview",
  "remote-video"
]);
