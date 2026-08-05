import {
  CODE_EDITOR_LANGUAGES,
  MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH,
  MAX_DEVICE_SESSION_PROP_LENGTH,
  MAX_QR_CODE_VALUE_LENGTH,
  PREVIEW_SURFACE_TYPES,
  WIDGET_PROP_KEYS,
  WIDGET_STYLE_KEYS,
  WIDGET_TYPES,
  type WidgetNode,
  type WidgetTree,
} from "./schema.js";

export interface WidgetValidationOptions {
  readonly maxNodes?: number;
  readonly maxDepth?: number;
  readonly maxBytes?: number;
}

export class WidgetValidationError extends Error {
  constructor(
    readonly code:
      "TOO_LARGE" | "TOO_DEEP" | "TOO_MANY_NODES" | "INVALID_WIDGET",
    message: string,
  ) {
    super(message);
    this.name = "WidgetValidationError";
  }
}

export function validateWidgetTree(
  tree: WidgetTree,
  options: WidgetValidationOptions = {},
): WidgetTree {
  const maxBytes = options.maxBytes ?? 256 * 1024;
  const bytes = new TextEncoder().encode(JSON.stringify(tree)).length;
  if (bytes > maxBytes) {
    throw new WidgetValidationError(
      "TOO_LARGE",
      `Widget tree exceeds ${maxBytes} bytes`,
    );
  }

  const maxNodes = options.maxNodes ?? 5_000;
  const maxDepth = options.maxDepth ?? 32;
  let count = 0;
  const ids = new Set<string>();

  const visit = (node: WidgetNode, depth: number) => {
    count += 1;
    if (count > maxNodes) {
      throw new WidgetValidationError(
        "TOO_MANY_NODES",
        `Widget tree exceeds ${maxNodes} nodes`,
      );
    }

    if (depth > maxDepth) {
      throw new WidgetValidationError(
        "TOO_DEEP",
        `Widget tree exceeds depth ${maxDepth}`,
      );
    }

    if (node.id.length === 0 || ids.has(node.id)) {
      throw new WidgetValidationError(
        "INVALID_WIDGET",
        `Invalid or duplicate widget id: ${node.id}`,
      );
    }
    ids.add(node.id);

    if (!WIDGET_TYPES.has(node.type)) {
      throw new WidgetValidationError(
        "INVALID_WIDGET",
        `Unsupported widget type: ${node.type}`,
      );
    }

    const allowedProps = WIDGET_PROP_KEYS.get(node.type);
    for (const prop of Object.keys(node.props ?? {})) {
      if (allowedProps === undefined || !allowedProps.has(prop)) {
        throw new WidgetValidationError(
          "INVALID_WIDGET",
          `Unsupported ${node.type} prop: ${prop}`,
        );
      }
    }

    if (node.type === "code-editor") {
      const documentId = node.props?.documentId;
      if (
        typeof documentId !== "string" ||
        documentId.length === 0 ||
        documentId.length > MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH
      ) {
        throw new WidgetValidationError(
          "INVALID_WIDGET",
          "code-editor requires a documentId of 1-256 characters",
        );
      }

      const language = node.props?.language;
      if (
        language !== undefined &&
        (typeof language !== "string" || !CODE_EDITOR_LANGUAGES.has(language))
      ) {
        throw new WidgetValidationError(
          "INVALID_WIDGET",
          `Unsupported code-editor language: ${String(language)}`,
        );
      }
    }

    if (node.type === "qr-code") {
      const value = node.props?.value;
      if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.length > MAX_QR_CODE_VALUE_LENGTH
      ) {
        throw new WidgetValidationError(
          "INVALID_WIDGET",
          "qr-code requires a value of 1-512 characters",
        );
      }
    }

    if (PREVIEW_SURFACE_TYPES.has(node.type)) {
      const session = node.props?.session;
      if (
        typeof session !== "string" ||
        session.length === 0 ||
        session.length > MAX_DEVICE_SESSION_PROP_LENGTH
      ) {
        throw new WidgetValidationError(
          "INVALID_WIDGET",
          `${node.type} requires a host-issued device session handle`,
        );
      }
      // Preview surfaces must not accept sample/pixel props — only opaque handles.
      for (const prop of Object.keys(node.props ?? {})) {
        if (
          prop === "session" ||
          prop === "aspectRatio" ||
          prop === "zoom" ||
          prop === "peer"
        )
          continue;
        throw new WidgetValidationError(
          "INVALID_WIDGET",
          `${node.type} cannot carry media payload prop: ${prop}`,
        );
      }
    }

    for (const style of Object.keys(node.style ?? {})) {
      if (!WIDGET_STYLE_KEYS.has(style)) {
        throw new WidgetValidationError(
          "INVALID_WIDGET",
          `Unsupported style property: ${style}`,
        );
      }
    }

    for (const child of node.children ?? []) {
      visit(child, depth + 1);
    }
  };

  visit(tree.root, 1);
  return tree;
}
