import type { WidgetNode, WidgetStyle, WidgetTree } from "./schema.js";

/**
 * Canonical host render model for widget trees. Golden tests compare this structure
 * against committed fixtures; harness-mobile/miniapp-renderer.tsx must stay aligned.
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
    ...(style === undefined ? {} : { style })
  };

  switch (node.type) {
    case "view": {
      const children = describeChildren(node);
      return {
        ...base,
        component: "View",
        ...(children === undefined ? {} : { children })
      };
    }
    case "text":
      return {
        ...base,
        component: "Text",
        props: { value: String(node.props?.value ?? "") }
      };
    case "button":
      return {
        ...base,
        component: "Button",
        props: {
          label: String(node.props?.label ?? "Button"),
          ...(typeof node.props?.event === "string" ? { event: node.props.event } : {})
        }
      };
    case "text-input":
      return {
        ...base,
        component: "TextInput",
        props: {
          value: String(node.props?.value ?? ""),
          placeholder: String(node.props?.placeholder ?? ""),
          ...(typeof node.props?.event === "string" ? { event: node.props.event } : {})
        }
      };
    case "switch":
      return {
        ...base,
        component: "Switch",
        props: {
          value: Boolean(node.props?.value),
          ...(typeof node.props?.event === "string" ? { event: node.props.event } : {})
        }
      };
    case "scroll": {
      const children = describeChildren(node);
      return {
        ...base,
        component: "ScrollView",
        ...(children === undefined ? {} : { children })
      };
    }
    case "divider":
      return {
        ...base,
        component: "Divider"
      };
    case "spacer":
      return {
        ...base,
        component: "Spacer",
        props: { height: 8 }
      };
    case "progress":
      return {
        ...base,
        component: "Progress",
        props: { value: node.props?.value ?? 0 }
      };
    case "list":
      return {
        ...base,
        component: "List",
        children: (Array.isArray(node.props?.items) ? node.props.items : []).map((item, index) => ({
          component: "ListItem",
          id: `${node.id}-item-${index}`,
          props: { value: typeof item === "string" ? item : JSON.stringify(item) }
        }))
      };
    case "image":
      return {
        ...base,
        component: "Image",
        props: { asset: String(node.props?.asset ?? "") }
      };
    case "code-editor":
      return {
        ...base,
        component: "CodeEditor",
        props: {
          documentId: String(node.props?.documentId ?? ""),
          language: typeof node.props?.language === "string" ? node.props.language : "text",
          readOnly: Boolean(node.props?.readOnly),
          ...(typeof node.props?.event === "string" ? { event: node.props.event } : {})
        }
      };
    case "qr-code":
      return {
        ...base,
        component: "QrCode",
        props: {
          value: String(node.props?.value ?? ""),
          ...(typeof node.props?.size === "number" ? { size: node.props.size } : {}),
          ...(typeof node.props?.caption === "string" ? { caption: node.props.caption } : {})
        }
      };
    default:
      return {
        ...base,
        component: "Unknown"
      };
  }
}

function describeChildren(node: WidgetNode): ReadonlyArray<RenderedWidgetNode> | undefined {
  if (node.children === undefined || node.children.length === 0) {
    return undefined;
  }

  return node.children.map(describeWidgetNode);
}

function describeStyle(style?: WidgetStyle): Readonly<Record<string, unknown>> | undefined {
  if (style === undefined) {
    return undefined;
  }

  const described: Record<string, unknown> = {};
  if (style.display !== undefined) {
    described.display = style.display === "none" ? "none" : "flex";
  }
  if (style.flexDirection !== undefined) {
    described.flexDirection = style.flexDirection;
  }
  if (style.alignItems !== undefined) {
    described.alignItems = style.alignItems;
  }
  if (style.justifyContent !== undefined) {
    described.justifyContent = style.justifyContent;
  }
  if (style.gap !== undefined) {
    described.gap = style.gap;
  }
  if (style.padding !== undefined) {
    described.padding = style.padding;
  }
  if (style.margin !== undefined) {
    described.margin = style.margin;
  }
  if (style.width !== undefined) {
    described.width = style.width;
  }
  if (style.height !== undefined) {
    described.height = style.height;
  }
  if (style.backgroundColor !== undefined) {
    described.backgroundColor = style.backgroundColor;
  }
  if (style.color !== undefined) {
    described.color = style.color;
  }
  if (style.fontSize !== undefined) {
    described.fontSize = style.fontSize;
  }
  if (style.fontWeight !== undefined) {
    described.fontWeight =
      style.fontWeight === "bold" ? "700" : style.fontWeight === "medium" ? "500" : "400";
  }

  return Object.keys(described).length === 0 ? undefined : described;
}
