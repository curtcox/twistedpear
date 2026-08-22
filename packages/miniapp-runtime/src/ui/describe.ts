import {
  visitWidget,
  type WidgetNode,
  type WidgetStyle,
  type WidgetTree,
} from "./schema.js";

/**
 * Canonical host render model for widget trees. Golden tests compare this structure
 * against committed fixtures; @twistedpear/widget-renderer-rn must stay aligned.
 */
export interface RenderedWidgetNode {
  readonly component: string;
  readonly id: string;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly style?: Readonly<Record<string, unknown>>;
  readonly children?: ReadonlyArray<RenderedWidgetNode>;
}

export function describeWidgetTree(tree: WidgetTree): RenderedWidgetNode {
  return describeWidgetNode(tree.root);
}

function describeWidgetNode(node: WidgetNode): RenderedWidgetNode {
  const style = describeStyle(node.style);
  const base = {
    id: node.id,
    ...(style === undefined ? {} : { style }),
  };

  return visitWidget(node, {
    view: (n) => {
      const children = describeChildren(n);
      return {
        ...base,
        component: "View",
        ...(children === undefined ? {} : { children }),
      };
    },
    text: (n) => ({
      ...base,
      component: "Text",
      props: { value: String(n.props?.value ?? "") },
    }),
    button: (n) => ({
      ...base,
      component: "Button",
      props: {
        label: String(n.props?.label ?? "Button"),
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {}),
      },
    }),
    "text-input": (n) => ({
      ...base,
      component: "TextInput",
      props: {
        value: String(n.props?.value ?? ""),
        placeholder: String(n.props?.placeholder ?? ""),
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {}),
        ...(n.props?.multiline === true ? { multiline: true } : {}),
        ...(n.props?.secure === true ? { secure: true } : {}),
        ...(typeof n.props?.keyboard === "string"
          ? { keyboard: n.props.keyboard }
          : {}),
      },
    }),
    select: (n) => ({
      ...base,
      component: "Select",
      props: {
        value: String(n.props?.value ?? ""),
        options: Array.isArray(n.props?.options) ? n.props.options : [],
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {}),
      },
    }),
    slider: (n) => ({
      ...base,
      component: "Slider",
      props: {
        value: typeof n.props?.value === "number" ? n.props.value : 0,
        min: typeof n.props?.min === "number" ? n.props.min : 0,
        max: typeof n.props?.max === "number" ? n.props.max : 100,
        ...(typeof n.props?.step === "number" ? { step: n.props.step } : {}),
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {}),
      },
    }),
    date: (n) => ({
      ...base,
      component: "Date",
      props: {
        value: String(n.props?.value ?? ""),
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {}),
      },
    }),
    switch: (n) => ({
      ...base,
      component: "Switch",
      props: {
        value: Boolean(n.props?.value),
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {}),
      },
    }),
    scroll: (n) => {
      const children = describeChildren(n);
      return {
        ...base,
        component: "ScrollView",
        ...(children === undefined ? {} : { children }),
      };
    },
    divider: () => ({
      ...base,
      component: "Divider",
    }),
    spacer: () => ({
      ...base,
      component: "Spacer",
      props: { height: 8 },
    }),
    progress: (n) => ({
      ...base,
      component: "Progress",
      props: { value: n.props?.value ?? 0 },
    }),
    list: (n) => ({
      ...base,
      component: "List",
      children: (Array.isArray(n.props?.items) ? n.props.items : []).map(
        (item, index) => ({
          component: "ListItem",
          id: `${n.id}-item-${index}`,
          props: {
            value: typeof item === "string" ? item : JSON.stringify(item),
          },
        }),
      ),
    }),
    image: (n) => ({
      ...base,
      component: "Image",
      props: { asset: String(n.props?.asset ?? "") },
    }),
    "code-editor": (n) => ({
      ...base,
      component: "CodeEditor",
      props: {
        documentId: String(n.props?.documentId ?? ""),
        language:
          typeof n.props?.language === "string" ? n.props.language : "text",
        readOnly: Boolean(n.props?.readOnly),
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {}),
      },
    }),
    "qr-code": (n) => ({
      ...base,
      component: "QrCode",
      props: {
        value: String(n.props?.value ?? ""),
        ...(typeof n.props?.size === "number" ? { size: n.props.size } : {}),
        ...(typeof n.props?.caption === "string"
          ? { caption: n.props.caption }
          : {}),
      },
    }),
    "camera-preview": (n) => describePreview(base, n),
    "audio-meter": (n) => describePreview(base, n),
    waveform: (n) => describePreview(base, n),
    "map-preview": (n) => describePreview(base, n),
    "remote-video": (n) => describePreview(base, n),
  });
}

function describePreview(
  base: {
    readonly id: string;
    readonly style?: Readonly<Record<string, unknown>>;
  },
  node: WidgetNode,
): RenderedWidgetNode {
  return {
    ...base,
    component: "DevicePreview",
    props: {
      surface: node.type,
      session: String(node.props?.session ?? ""),
      ...(typeof node.props?.aspectRatio === "string"
        ? { aspectRatio: node.props.aspectRatio }
        : {}),
      ...(typeof node.props?.zoom === "number"
        ? { zoom: node.props.zoom }
        : {}),
      ...(typeof node.props?.peer === "string"
        ? { peer: node.props.peer }
        : {}),
    },
  };
}

function describeChildren(
  node: WidgetNode,
): ReadonlyArray<RenderedWidgetNode> | undefined {
  if (node.children === undefined || node.children.length === 0) {
    return undefined;
  }

  return node.children.map(describeWidgetNode);
}

const STYLE_PASSTHROUGH = [
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
] as const satisfies ReadonlyArray<keyof WidgetStyle>;

function describeStyle(
  style?: WidgetStyle,
): Readonly<Record<string, unknown>> | undefined {
  if (style === undefined) {
    return undefined;
  }

  const described: Record<string, unknown> = {};
  if (style.display !== undefined) {
    described.display = style.display === "none" ? "none" : "flex";
  }
  for (const key of STYLE_PASSTHROUGH) {
    const value = style[key];
    if (value !== undefined) described[key] = value;
  }
  if (style.fontWeight !== undefined) {
    described.fontWeight = cssFontWeight(style.fontWeight);
  }

  return Object.keys(described).length === 0 ? undefined : described;
}

function cssFontWeight(weight: WidgetStyle["fontWeight"]): string {
  if (weight === "bold") return "700";
  if (weight === "medium") return "500";
  return "400";
}
