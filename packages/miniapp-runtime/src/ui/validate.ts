import { chromeLexiconViolation } from "./chrome-lexicon.js";
import {
  ACCESSIBILITY_LIVE_REGIONS,
  CODE_EDITOR_LANGUAGES,
  MAX_ACCESSIBILITY_TEXT_LENGTH,
  MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH,
  MAX_DEVICE_SESSION_PROP_LENGTH,
  MAX_QR_CODE_VALUE_LENGTH,
  PREVIEW_SURFACE_TYPES,
  TEXT_INPUT_KEYBOARDS,
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

const PREVIEW_LAYOUT_PROPS: ReadonlySet<string> = new Set([
  "session",
  "aspectRatio",
  "zoom",
  "peer",
]);

function invalidWidget(message: string): never {
  throw new WidgetValidationError("INVALID_WIDGET", message);
}

function validateNodeIdentity(node: WidgetNode, ids: Set<string>): void {
  if (node.id.length === 0 || ids.has(node.id)) {
    invalidWidget(`Invalid or duplicate widget id: ${node.id}`);
  }
  ids.add(node.id);
}

function validateWidgetType(node: WidgetNode): void {
  if (!WIDGET_TYPES.has(node.type)) {
    invalidWidget(`Unsupported widget type: ${node.type}`);
  }
}

function validateAllowedProps(node: WidgetNode): void {
  const allowedProps = WIDGET_PROP_KEYS.get(node.type);
  for (const prop of Object.keys(node.props ?? {})) {
    if (allowedProps === undefined || !allowedProps.has(prop)) {
      invalidWidget(`Unsupported ${node.type} prop: ${prop}`);
    }
  }
}

function validateCodeEditor(node: WidgetNode): void {
  if (node.type !== "code-editor") return;

  const documentId = node.props?.documentId;
  if (
    typeof documentId !== "string" ||
    documentId.length === 0 ||
    documentId.length > MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH
  ) {
    invalidWidget("code-editor requires a documentId of 1-256 characters");
  }

  const language = node.props?.language;
  if (
    language !== undefined &&
    (typeof language !== "string" || !CODE_EDITOR_LANGUAGES.has(language))
  ) {
    invalidWidget(`Unsupported code-editor language: ${String(language)}`);
  }
}

function validateQrCode(node: WidgetNode): void {
  if (node.type !== "qr-code") return;

  const value = node.props?.value;
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_QR_CODE_VALUE_LENGTH
  ) {
    invalidWidget("qr-code requires a value of 1-512 characters");
  }
}

function validateTextInput(node: WidgetNode): void {
  if (node.type !== "text-input") return;
  const keyboard = node.props?.keyboard;
  if (
    keyboard !== undefined &&
    (typeof keyboard !== "string" || !TEXT_INPUT_KEYBOARDS.has(keyboard))
  ) {
    invalidWidget(`Unsupported text-input keyboard: ${String(keyboard)}`);
  }
}

function validateSelect(node: WidgetNode): void {
  if (node.type !== "select") return;
  const options = node.props?.options;
  if (!Array.isArray(options)) {
    invalidWidget("select requires an options array");
  }
}

function validateSlider(node: WidgetNode): void {
  if (node.type !== "slider") return;
  const value = node.props?.value;
  if (value !== undefined && typeof value !== "number") {
    invalidWidget("slider value must be a number");
  }
}

function validatePreviewSurface(node: WidgetNode): void {
  if (!PREVIEW_SURFACE_TYPES.has(node.type)) return;

  const session = node.props?.session;
  if (
    typeof session !== "string" ||
    session.length === 0 ||
    session.length > MAX_DEVICE_SESSION_PROP_LENGTH
  ) {
    invalidWidget(`${node.type} requires a host-issued device session handle`);
  }

  // Preview surfaces must not accept sample/pixel props — only opaque handles.
  for (const prop of Object.keys(node.props ?? {})) {
    if (!PREVIEW_LAYOUT_PROPS.has(prop) && prop !== "accessibilityLabel") {
      invalidWidget(`${node.type} cannot carry media payload prop: ${prop}`);
    }
  }
}

function validateStyles(node: WidgetNode): void {
  for (const style of Object.keys(node.style ?? {})) {
    if (!WIDGET_STYLE_KEYS.has(style)) {
      invalidWidget(`Unsupported style property: ${style}`);
    }
  }
}

function validateBoundedA11yString(node: WidgetNode, key: string): void {
  const value = node.props?.[key];
  if (value === undefined) return;
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > MAX_ACCESSIBILITY_TEXT_LENGTH
  ) {
    invalidWidget(
      `${node.type}.${key} must be a string of 1-${MAX_ACCESSIBILITY_TEXT_LENGTH} characters`,
    );
  }
}

function validateAccessibilityProps(node: WidgetNode): void {
  validateBoundedA11yString(node, "accessibilityLabel");
  validateBoundedA11yString(node, "accessibilityHint");
  const heading = node.props?.heading;
  if (heading !== undefined) {
    if (
      typeof heading !== "number" ||
      !Number.isInteger(heading) ||
      heading < 1 ||
      heading > 6
    ) {
      invalidWidget(`${node.type}.heading must be an integer 1-6`);
    }
  }
  const live = node.props?.live;
  if (
    live !== undefined &&
    (typeof live !== "string" || !ACCESSIBILITY_LIVE_REGIONS.has(live))
  ) {
    invalidWidget(`${node.type}.live must be "polite" or "assertive"`);
  }
  const decorative = node.props?.decorative;
  if (decorative !== undefined && decorative !== true) {
    invalidWidget(`${node.type}.decorative must be true`);
  }
}

function validateNode(node: WidgetNode, ids: Set<string>): void {
  validateNodeIdentity(node, ids);
  validateWidgetType(node);
  validateAllowedProps(node);
  validateCodeEditor(node);
  validateQrCode(node);
  validateTextInput(node);
  validateSelect(node);
  validateSlider(node);
  validatePreviewSurface(node);
  validateAccessibilityProps(node);
  validateStyles(node);
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

    validateNode(node, ids);

    for (const child of node.children ?? []) {
      visit(child, depth + 1);
    }
  };

  visit(tree.root, 1);
  const chrome = chromeLexiconViolation(tree);
  if (chrome !== null) invalidWidget(chrome);
  return tree;
}
