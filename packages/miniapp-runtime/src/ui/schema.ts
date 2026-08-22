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
  | "select"
  | "slider"
  | "date"
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
  "select",
  "slider",
  "date",
  "camera-preview",
  "audio-meter",
  "waveform",
  "map-preview",
  "remote-video",
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
  "fontWeight",
]);

export const WIDGET_PROP_KEYS: ReadonlyMap<
  WidgetType,
  ReadonlySet<string>
> = new Map([
  ["view", new Set(["accessibilityLabel"])],
  ["text", new Set(["value"])],
  ["image", new Set(["asset", "alt"])],
  ["button", new Set(["label", "event"])],
  ["text-input", new Set(["value", "placeholder", "event", "multiline", "secure", "keyboard"])],
  ["switch", new Set(["value", "event"])],
  ["scroll", new Set(["event", "scrollOffset"])],
  ["list", new Set(["items", "event"])],
  ["progress", new Set(["value", "max"])],
  ["divider", new Set()],
  ["spacer", new Set(["size"])],
  ["code-editor", new Set(["documentId", "language", "readOnly", "event"])],
  ["qr-code", new Set(["value", "size", "caption"])],
  ["select", new Set(["value", "options", "event"])],
  ["slider", new Set(["value", "min", "max", "step", "event"])],
  ["date", new Set(["value", "event"])],
  // Preview surfaces: host draws live device output; apps lay out a region but
  // cannot read pixels/samples back through the widget tree.
  ["camera-preview", new Set(["session", "aspectRatio"])],
  ["audio-meter", new Set(["session"])],
  ["waveform", new Set(["session"])],
  ["map-preview", new Set(["session", "zoom"])],
  ["remote-video", new Set(["session", "peer"])],
]);

export const CODE_EDITOR_LANGUAGES: ReadonlySet<string> = new Set([
  "javascript",
  "json",
  "text",
  "elm",
]);
export const TEXT_INPUT_KEYBOARDS: ReadonlySet<string> = new Set([
  "default",
  "numeric",
  "email",
  "url",
]);
export const MAX_QR_CODE_VALUE_LENGTH = 512;
export const MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH = 256;
export const MAX_DEVICE_SESSION_PROP_LENGTH = 128;
export const PREVIEW_SURFACE_TYPES: ReadonlySet<WidgetType> = new Set([
  "camera-preview",
  "audio-meter",
  "waveform",
  "map-preview",
  "remote-video",
]);

/** JSON Schema fragments for WidgetStyle value constraints (serializer input). */
export const STYLE_VALUE_SCHEMAS: Readonly<Record<string, object>> = {
  display: { enum: ["flex", "none"] },
  flexDirection: { enum: ["row", "column"] },
  alignItems: { enum: ["stretch", "flex-start", "center", "flex-end"] },
  justifyContent: {
    enum: ["flex-start", "center", "flex-end", "space-between"],
  },
  gap: { type: "number" },
  padding: { type: "number" },
  margin: { type: "number" },
  width: {
    oneOf: [
      { type: "number" },
      { type: "string", pattern: "^[0-9]+(\\.[0-9]+)?%$" },
    ],
  },
  height: {
    oneOf: [
      { type: "number" },
      { type: "string", pattern: "^[0-9]+(\\.[0-9]+)?%$" },
    ],
  },
  backgroundColor: { type: "string" },
  color: { type: "string" },
  fontSize: { enum: [12, 14, 16, 20, 24, 32] },
  fontWeight: { enum: ["regular", "medium", "bold"] },
};

/** Per-type prop value schemas beyond key membership (serializer + validate.ts). */
export const EXTRA_PROP_SCHEMAS: Readonly<
  Record<string, Readonly<Record<string, object>>>
> = {
  "code-editor": {
    documentId: {
      type: "string",
      minLength: 1,
      maxLength: MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH,
    },
    language: { enum: [...CODE_EDITOR_LANGUAGES].sort() },
  },
  "qr-code": {
    value: {
      type: "string",
      minLength: 1,
      maxLength: MAX_QR_CODE_VALUE_LENGTH,
    },
  },
};

export const EXTRA_REQUIRED: Readonly<Record<string, ReadonlyArray<string>>> = {
  "code-editor": ["documentId"],
  "qr-code": ["value"],
};

/** One member per WidgetType — missing keys fail typecheck at every visit site. */
export type WidgetVisitor<T> = {
  readonly [K in WidgetType]: (node: WidgetNode & { readonly type: K }) => T;
};

export function visitWidget<T>(node: WidgetNode, visitor: WidgetVisitor<T>): T {
  const handler = visitor[node.type] as (n: WidgetNode) => T;
  return handler(node);
}
