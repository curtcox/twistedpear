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

type NodeProps = WidgetNode["props"];

interface WidgetNodeBase {
  readonly id: string;
  readonly style?: Readonly<Record<string, unknown>>;
}

function optionalStringProp(
  props: NodeProps,
  key: string,
): Record<string, string> {
  const value = props?.[key];
  return typeof value === "string" ? { [key]: value } : {};
}

function optionalNumberProp(
  props: NodeProps,
  key: string,
): Record<string, number> {
  const value = props?.[key];
  return typeof value === "number" ? { [key]: value } : {};
}

function optionalTrueProp(
  props: NodeProps,
  key: string,
): Record<string, true> {
  return props?.[key] === true ? { [key]: true } : {};
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function describeWithChildren(
  base: WidgetNodeBase,
  component: string,
  node: WidgetNode,
): RenderedWidgetNode {
  const children = describeChildren(node);
  return {
    ...base,
    component,
    ...(children === undefined ? {} : { children }),
  };
}

function describeTextInput(
  base: WidgetNodeBase,
  n: WidgetNode,
): RenderedWidgetNode {
  return {
    ...base,
    component: "TextInput",
    props: {
      value: String(n.props?.value ?? ""),
      placeholder: String(n.props?.placeholder ?? ""),
      ...optionalStringProp(n.props, "event"),
      ...optionalTrueProp(n.props, "multiline"),
      ...optionalTrueProp(n.props, "secure"),
      ...optionalStringProp(n.props, "keyboard"),
    },
  };
}

function describeSlider(
  base: WidgetNodeBase,
  n: WidgetNode,
): RenderedWidgetNode {
  return {
    ...base,
    component: "Slider",
    props: {
      value: numberOr(n.props?.value, 0),
      min: numberOr(n.props?.min, 0),
      max: numberOr(n.props?.max, 100),
      ...optionalNumberProp(n.props, "step"),
      ...optionalStringProp(n.props, "event"),
    },
  };
}

function describeList(
  base: WidgetNodeBase,
  n: WidgetNode,
): RenderedWidgetNode {
  return {
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
  };
}

function describeCodeEditor(
  base: WidgetNodeBase,
  n: WidgetNode,
): RenderedWidgetNode {
  return {
    ...base,
    component: "CodeEditor",
    props: {
      documentId: String(n.props?.documentId ?? ""),
      language:
        typeof n.props?.language === "string" ? n.props.language : "text",
      readOnly: Boolean(n.props?.readOnly),
      ...optionalStringProp(n.props, "event"),
    },
  };
}

function describeQrCode(
  base: WidgetNodeBase,
  n: WidgetNode,
): RenderedWidgetNode {
  return {
    ...base,
    component: "QrCode",
    props: {
      value: String(n.props?.value ?? ""),
      ...optionalNumberProp(n.props, "size"),
      ...optionalStringProp(n.props, "caption"),
    },
  };
}

function describeWidgetNode(node: WidgetNode): RenderedWidgetNode {
  const style = describeStyle(node.style);
  const base: WidgetNodeBase = {
    id: node.id,
    ...(style === undefined ? {} : { style }),
  };

  return visitWidget(node, {
    view: (n) => describeWithChildren(base, "View", n),
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
        ...optionalStringProp(n.props, "event"),
      },
    }),
    "text-input": (n) => describeTextInput(base, n),
    select: (n) => ({
      ...base,
      component: "Select",
      props: {
        value: String(n.props?.value ?? ""),
        options: Array.isArray(n.props?.options) ? n.props.options : [],
        ...optionalStringProp(n.props, "event"),
      },
    }),
    slider: (n) => describeSlider(base, n),
    date: (n) => ({
      ...base,
      component: "Date",
      props: {
        value: String(n.props?.value ?? ""),
        ...optionalStringProp(n.props, "event"),
      },
    }),
    switch: (n) => ({
      ...base,
      component: "Switch",
      props: {
        value: Boolean(n.props?.value),
        ...optionalStringProp(n.props, "event"),
      },
    }),
    scroll: (n) => describeWithChildren(base, "ScrollView", n),
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
    list: (n) => describeList(base, n),
    image: (n) => ({
      ...base,
      component: "Image",
      props: { asset: String(n.props?.asset ?? "") },
    }),
    "code-editor": (n) => describeCodeEditor(base, n),
    "qr-code": (n) => describeQrCode(base, n),
    "camera-preview": (n) => describePreview(base, n),
    "audio-meter": (n) => describePreview(base, n),
    waveform: (n) => describePreview(base, n),
    "map-preview": (n) => describePreview(base, n),
    "remote-video": (n) => describePreview(base, n),
  });
}

function describePreview(
  base: WidgetNodeBase,
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
