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

export const MAX_ACCESSIBILITY_TEXT_LENGTH = 128;
export const ACCESSIBILITY_LIVE_REGIONS: ReadonlySet<string> = new Set([
  "polite",
  "assertive",
]);
export const ACCESSIBILITY_LABEL_TYPES: ReadonlySet<WidgetType> = new Set([
  "view",
  "scroll",
  "list",
  "progress",
  "text-input",
  "switch",
  "slider",
  "select",
  "date",
  "code-editor",
  "qr-code",
  "camera-preview",
  "audio-meter",
  "waveform",
  "map-preview",
  "remote-video",
]);
/** Controls whose accessible name can come only from accessibilityLabel. */
export const NAMED_CONTROL_TYPES: ReadonlySet<WidgetType> = new Set([
  "switch",
  "slider",
  "select",
  "date",
]);
export const ACCESSIBILITY_HINT_TYPES: ReadonlySet<WidgetType> = new Set([
  "button",
  "text-input",
  "switch",
  "slider",
  "select",
  "date",
  "code-editor",
]);
export const ACCESSIBILITY_HEADING_TYPES: ReadonlySet<WidgetType> = new Set([
  "text",
]);
export const ACCESSIBILITY_LIVE_TYPES: ReadonlySet<WidgetType> = new Set([
  "text",
  "view",
]);
export const ACCESSIBILITY_DECORATIVE_TYPES: ReadonlySet<WidgetType> = new Set([
  "image",
  "view",
]);

export const WIDGET_PROP_KEYS: ReadonlyMap<
  WidgetType,
  ReadonlySet<string>
> = (() => {
  const keys = new Map<WidgetType, Set<string>>([
    ["view", new Set()],
    ["text", new Set(["value"])],
    ["image", new Set(["asset", "alt"])],
    ["button", new Set(["label", "event"])],
    [
      "text-input",
      new Set([
        "value",
        "placeholder",
        "event",
        "multiline",
        "secure",
        "keyboard",
      ]),
    ],
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
    // Preview surfaces: host draws live device output; apps lay out a region
    // but cannot read pixels/samples back through the widget tree.
    ["camera-preview", new Set(["session", "aspectRatio"])],
    ["audio-meter", new Set(["session"])],
    ["waveform", new Set(["session"])],
    ["map-preview", new Set(["session", "zoom"])],
    ["remote-video", new Set(["session", "peer"])],
  ]);
  const attach = (types: ReadonlySet<WidgetType>, prop: string): void => {
    for (const type of types) {
      const allowed = keys.get(type);
      if (allowed === undefined) {
        throw new Error(`cannot attach ${prop} to unknown type ${type}`);
      }
      allowed.add(prop);
    }
  };
  attach(ACCESSIBILITY_LABEL_TYPES, "accessibilityLabel");
  attach(ACCESSIBILITY_HINT_TYPES, "accessibilityHint");
  attach(ACCESSIBILITY_HEADING_TYPES, "heading");
  attach(ACCESSIBILITY_LIVE_TYPES, "live");
  attach(ACCESSIBILITY_DECORATIVE_TYPES, "decorative");
  return keys;
})();

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

const ACCESSIBILITY_LABEL_SCHEMA = {
  type: "string",
  minLength: 1,
  maxLength: MAX_ACCESSIBILITY_TEXT_LENGTH,
};
const ACCESSIBILITY_HINT_SCHEMA = {
  type: "string",
  minLength: 1,
  maxLength: MAX_ACCESSIBILITY_TEXT_LENGTH,
};
const ACCESSIBILITY_HEADING_SCHEMA = {
  type: "integer",
  minimum: 1,
  maximum: 6,
};
const ACCESSIBILITY_LIVE_SCHEMA = {
  enum: ["assertive", "polite"],
};
const ACCESSIBILITY_DECORATIVE_SCHEMA = { const: true };

function withAccessibilitySchemas(
  base: Record<string, Record<string, object>>,
): Record<string, Record<string, object>> {
  const add = (
    types: ReadonlySet<WidgetType>,
    key: string,
    schema: object,
  ): void => {
    for (const type of types) {
      base[type] = { ...base[type], [key]: schema };
    }
  };
  add(
    ACCESSIBILITY_LABEL_TYPES,
    "accessibilityLabel",
    ACCESSIBILITY_LABEL_SCHEMA,
  );
  add(ACCESSIBILITY_HINT_TYPES, "accessibilityHint", ACCESSIBILITY_HINT_SCHEMA);
  add(ACCESSIBILITY_HEADING_TYPES, "heading", ACCESSIBILITY_HEADING_SCHEMA);
  add(ACCESSIBILITY_LIVE_TYPES, "live", ACCESSIBILITY_LIVE_SCHEMA);
  add(
    ACCESSIBILITY_DECORATIVE_TYPES,
    "decorative",
    ACCESSIBILITY_DECORATIVE_SCHEMA,
  );
  return base;
}

/** Per-type prop value schemas beyond key membership (serializer + validate.ts). */
export const EXTRA_PROP_SCHEMAS: Readonly<
  Record<string, Readonly<Record<string, object>>>
> = withAccessibilitySchemas({
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
});

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
