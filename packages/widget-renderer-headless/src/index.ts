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
  WidgetTree,
} from "@twistedpear/miniapp-runtime";
import { visitWidget } from "@twistedpear/miniapp-runtime";
import { renderStyle } from "./style.js";

export {
  layoutWidgetTree,
  REFERENCE_METRIC,
  type Box,
  type Viewport,
} from "./geometry.js";

// ---------------------------------------------------------------------------
// Interpretation (SPEC-WIDGET): tree -> rendered model
// ---------------------------------------------------------------------------

export function renderHeadlessTree(tree: WidgetTree): RenderedWidgetNode {
  return renderNode(tree.root);
}

type NodeProps = WidgetNode["props"];

interface RenderNodeBase {
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

function optionalTrueProp(props: NodeProps, key: string): Record<string, true> {
  return props?.[key] === true ? { [key]: true } : {};
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function renderTextInput(
  base: RenderNodeBase,
  n: WidgetNode,
): RenderedWidgetNode {
  return {
    ...base,
    component: "TextInput",
    props: {
      value: asString(n.props?.value, ""),
      placeholder: asString(n.props?.placeholder, ""),
      ...optionalStringProp(n.props, "event"),
      ...optionalTrueProp(n.props, "multiline"),
      ...optionalTrueProp(n.props, "secure"),
      ...optionalStringProp(n.props, "keyboard"),
    },
  };
}

function renderSlider(base: RenderNodeBase, n: WidgetNode): RenderedWidgetNode {
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

function renderList(base: RenderNodeBase, n: WidgetNode): RenderedWidgetNode {
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

function renderCodeEditor(
  base: RenderNodeBase,
  n: WidgetNode,
): RenderedWidgetNode {
  return {
    ...base,
    component: "CodeEditor",
    props: {
      documentId: asString(n.props?.documentId, ""),
      language:
        typeof n.props?.language === "string" ? n.props.language : "text",
      readOnly: Boolean(n.props?.readOnly),
      ...optionalStringProp(n.props, "event"),
    },
  };
}

function renderQrCode(base: RenderNodeBase, n: WidgetNode): RenderedWidgetNode {
  return {
    ...base,
    component: "QrCode",
    props: {
      value: asString(n.props?.value, ""),
      ...optionalNumberProp(n.props, "size"),
      ...optionalStringProp(n.props, "caption"),
    },
  };
}

function renderNode(node: WidgetNode): RenderedWidgetNode {
  const style = renderStyle(node.style);
  const base = {
    id: node.id,
    ...(style === undefined ? {} : { style }),
  };
  const children = (node.children ?? []).map(renderNode);
  const withChildren = children.length === 0 ? {} : { children };

  return visitWidget(node, {
    view: (n) => {
      const props = optionalStringProp(n.props, "accessibilityLabel");
      return {
        ...base,
        component: "View",
        ...(Object.keys(props).length === 0 ? {} : { props }),
        ...withChildren,
      };
    },
    scroll: () => ({ ...base, component: "ScrollView", ...withChildren }),
    text: (n) => ({
      ...base,
      component: "Text",
      props: { value: asString(n.props?.value, "") },
    }),
    button: (n) => ({
      ...base,
      component: "Button",
      props: {
        label: asString(n.props?.label, "Button"),
        ...optionalStringProp(n.props, "event"),
      },
    }),
    "text-input": (n) => renderTextInput(base, n),
    select: (n) => ({
      ...base,
      component: "Select",
      props: {
        value: asString(n.props?.value, ""),
        options: Array.isArray(n.props?.options) ? n.props.options : [],
        ...optionalStringProp(n.props, "event"),
      },
    }),
    slider: (n) => renderSlider(base, n),
    date: (n) => ({
      ...base,
      component: "Date",
      props: {
        value: asString(n.props?.value, ""),
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
    divider: () => ({ ...base, component: "Divider" }),
    spacer: () => ({ ...base, component: "Spacer", props: { height: 8 } }),
    progress: (n) => ({
      ...base,
      component: "Progress",
      props: { value: n.props?.value ?? 0 },
    }),
    list: (n) => renderList(base, n),
    image: (n) => ({
      ...base,
      component: "Image",
      props: {
        asset: asString(n.props?.asset, ""),
        ...optionalStringProp(n.props, "alt"),
      },
    }),
    "code-editor": (n) => renderCodeEditor(base, n),
    "qr-code": (n) => renderQrCode(base, n),
    "camera-preview": (n) => previewSurface(base, n),
    "audio-meter": (n) => previewSurface(base, n),
    waveform: (n) => previewSurface(base, n),
    "map-preview": (n) => previewSurface(base, n),
    "remote-video": (n) => previewSurface(base, n),
  });
}

function previewSurface(
  base: RenderNodeBase,
  node: WidgetNode,
): RenderedWidgetNode {
  return {
    ...base,
    component: "DevicePreview",
    props: {
      surface: node.type,
      session: asString(node.props?.session, ""),
    },
  };
}

function asString(value: unknown, fallback: string): string {
  return value === undefined || value === null ? fallback : String(value);
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

export function applyWidgetPatches(
  tree: WidgetTree,
  patches: readonly WidgetPatch[],
): WidgetTree {
  let root: WidgetNode | null = tree.root;
  for (const patch of patches) {
    if (
      patch.op === "replace" &&
      (root === null || !containsId(root, patch.id))
    ) {
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
    const style =
      node.style === undefined ? "" : ` style=${stableJson(node.style)}`;
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
