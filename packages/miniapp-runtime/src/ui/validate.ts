import { WIDGET_PROP_KEYS, WIDGET_STYLE_KEYS, WIDGET_TYPES, type WidgetNode, type WidgetTree } from "./schema.js";

export interface WidgetValidationOptions {
  readonly maxNodes?: number;
  readonly maxDepth?: number;
  readonly maxBytes?: number;
}

export class WidgetValidationError extends Error {
  constructor(readonly code: "TOO_LARGE" | "TOO_DEEP" | "TOO_MANY_NODES" | "INVALID_WIDGET", message: string) {
    super(message);
    this.name = "WidgetValidationError";
  }
}

export function validateWidgetTree(tree: WidgetTree, options: WidgetValidationOptions = {}): WidgetTree {
  const maxBytes = options.maxBytes ?? 256 * 1024;
  const bytes = new TextEncoder().encode(JSON.stringify(tree)).length;
  if (bytes > maxBytes) {
    throw new WidgetValidationError("TOO_LARGE", `Widget tree exceeds ${maxBytes} bytes`);
  }

  const maxNodes = options.maxNodes ?? 5_000;
  const maxDepth = options.maxDepth ?? 32;
  let count = 0;
  const ids = new Set<string>();

  const visit = (node: WidgetNode, depth: number) => {
    count += 1;
    if (count > maxNodes) {
      throw new WidgetValidationError("TOO_MANY_NODES", `Widget tree exceeds ${maxNodes} nodes`);
    }

    if (depth > maxDepth) {
      throw new WidgetValidationError("TOO_DEEP", `Widget tree exceeds depth ${maxDepth}`);
    }

    if (node.id.length === 0 || ids.has(node.id)) {
      throw new WidgetValidationError("INVALID_WIDGET", `Invalid or duplicate widget id: ${node.id}`);
    }
    ids.add(node.id);

    if (!WIDGET_TYPES.has(node.type)) {
      throw new WidgetValidationError("INVALID_WIDGET", `Unsupported widget type: ${node.type}`);
    }

    const allowedProps = WIDGET_PROP_KEYS.get(node.type);
    for (const prop of Object.keys(node.props ?? {})) {
      if (allowedProps === undefined || !allowedProps.has(prop)) {
        throw new WidgetValidationError("INVALID_WIDGET", `Unsupported ${node.type} prop: ${prop}`);
      }
    }

    for (const style of Object.keys(node.style ?? {})) {
      if (!WIDGET_STYLE_KEYS.has(style)) {
        throw new WidgetValidationError("INVALID_WIDGET", `Unsupported style property: ${style}`);
      }
    }

    for (const child of node.children ?? []) {
      visit(child, depth + 1);
    }
  };

  visit(tree.root, 1);
  return tree;
}
