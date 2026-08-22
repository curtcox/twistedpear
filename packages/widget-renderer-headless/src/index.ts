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

function renderNode(node: WidgetNode): RenderedWidgetNode {
  const style = renderStyle(node.style);
  const base = {
    id: node.id,
    ...(style === undefined ? {} : { style }),
  };
  const children = (node.children ?? []).map(renderNode);
  const withChildren = children.length === 0 ? {} : { children };

  return visitWidget(node, {
    view: () => ({ ...base, component: "View", ...withChildren }),
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
        ...(typeof n.props?.event === "string" ? { event: n.props.event } : {}),
      },
    }),
    "text-input": (n) => ({
      ...base,
      component: "TextInput",
      props: {
        value: asString(n.props?.value, ""),
        placeholder: asString(n.props?.placeholder, ""),
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
        value: asString(n.props?.value, ""),
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
        value: asString(n.props?.value, ""),
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
    divider: () => ({ ...base, component: "Divider" }),
    spacer: () => ({ ...base, component: "Spacer", props: { height: 8 } }),
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
      props: { asset: asString(n.props?.asset, "") },
    }),
    "code-editor": (n) => ({
      ...base,
      component: "CodeEditor",
      props: {
        documentId: asString(n.props?.documentId, ""),
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
        value: asString(n.props?.value, ""),
        ...(typeof n.props?.size === "number" ? { size: n.props.size } : {}),
        ...(typeof n.props?.caption === "string"
          ? { caption: n.props.caption }
          : {}),
      },
    }),
    "camera-preview": (n) => previewSurface(base, n),
    "audio-meter": (n) => previewSurface(base, n),
    waveform: (n) => previewSurface(base, n),
    "map-preview": (n) => previewSurface(base, n),
    "remote-video": (n) => previewSurface(base, n),
  });
}

function previewSurface(
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
