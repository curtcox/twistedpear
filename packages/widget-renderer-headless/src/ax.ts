/**
 * Accessibility-tree projection over a widget tree.
 *
 * The host can compute this without a browser: role is a closed map of
 * widget type, name comes from the bounded a11y props plus a few native
 * name fields, and a node with nothing to expose flattens into its parent.
 */
import {
  visitWidget,
  type WidgetNode,
  type WidgetTree,
} from "@twistedpear/miniapp-runtime";

export interface AxNode {
  readonly role: string;
  readonly name?: string;
  readonly level?: number;
  readonly value?: string;
  readonly state?: string;
  readonly children?: ReadonlyArray<AxNode>;
}

const VALUE_WIDGETS = new Set<WidgetNode["type"]>([
  "text-input",
  "select",
  "slider",
  "date",
  "progress",
  "code-editor",
]);

function stringProp(
  props: WidgetNode["props"],
  key: string,
): string | undefined {
  const value = props?.[key];
  return typeof value === "string" ? value : undefined;
}

function numberProp(
  props: WidgetNode["props"],
  key: string,
): number | undefined {
  const value = props?.[key];
  return typeof value === "number" ? value : undefined;
}

function roleOf(node: WidgetNode): string | null {
  return visitWidget(node, {
    view: () => "group",
    text: (n) =>
      numberProp(n.props, "heading") === undefined ? "text" : "heading",
    image: () => "image",
    button: () => "button",
    "text-input": () => "textbox",
    switch: () => "switch",
    scroll: () => "generic",
    list: () => "list",
    progress: () => "progressbar",
    divider: () => "separator",
    spacer: () => null,
    "code-editor": () => "textbox",
    "qr-code": () => "image",
    select: () => "combobox",
    slider: () => "slider",
    date: () => "textbox",
    "camera-preview": () => "image",
    "audio-meter": () => "meter",
    waveform: () => "image",
    "map-preview": () => "image",
    "remote-video": () => "image",
  });
}

function nameOf(node: WidgetNode): string | undefined {
  return (
    stringProp(node.props, "accessibilityLabel") ??
    (node.type === "image" ? stringProp(node.props, "alt") : undefined) ??
    (node.type === "button" ? stringProp(node.props, "label") : undefined) ??
    (node.type === "text" ? stringProp(node.props, "value") : undefined) ??
    (node.type === "qr-code" ? stringProp(node.props, "caption") : undefined)
  );
}

function valueOf(node: WidgetNode): string | undefined {
  if (!VALUE_WIDGETS.has(node.type)) return undefined;
  const value = node.props?.value;
  if (value == null) return undefined;
  return typeof value === "string" ? value : String(value);
}

function stateOf(node: WidgetNode): string | undefined {
  if (node.type !== "switch") return undefined;
  return node.props?.value === true ? "checked" : "unchecked";
}

function listItems(node: WidgetNode): AxNode[] {
  if (node.type !== "list") return [];
  const items = Array.isArray(node.props?.items) ? node.props.items : [];
  return items.map((item) => ({
    role: "listitem",
    name: typeof item === "string" ? item : JSON.stringify(item),
  }));
}

function withField<K extends string, T>(
  key: K,
  value: T | undefined,
): {} | Record<K, T> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, T>);
}

function unnamedContainer(role: string, name: string | undefined): boolean {
  return name === undefined && (role === "group" || role === "generic");
}

function toAxNode(
  node: WidgetNode,
  role: string,
  name: string | undefined,
  children: AxNode[],
): AxNode {
  const level =
    node.type === "text" ? numberProp(node.props, "heading") : undefined;
  return {
    role,
    ...withField("name", name),
    ...withField("level", level),
    ...withField("value", valueOf(node)),
    ...withField("state", stateOf(node)),
    ...withField("children", children.length === 0 ? undefined : children),
  };
}

function projectNode(node: WidgetNode): AxNode[] {
  if (node.props?.decorative === true) return [];
  const projectedChildren = [
    ...(node.children ?? []).flatMap(projectNode),
    ...listItems(node),
  ];
  const role = roleOf(node);
  const name = nameOf(node);
  if (role === null || unnamedContainer(role, name)) return projectedChildren;
  return [toAxNode(node, role, name, projectedChildren)];
}

function projectAxTree(tree: WidgetTree): AxNode[] {
  return projectNode(tree.root);
}

function formatAx(node: AxNode, depth: number): string[] {
  const bits = [node.role];
  if (node.name !== undefined) bits.push(JSON.stringify(node.name));
  if (node.level !== undefined) bits.push(`level=${node.level}`);
  if (node.value !== undefined)
    bits.push(`value=${JSON.stringify(node.value)}`);
  if (node.state !== undefined) bits.push(`state=${node.state}`);
  const line = `${"  ".repeat(depth)}${bits.join(" ")}`;
  return [
    line,
    ...(node.children ?? []).flatMap((child) => formatAx(child, depth + 1)),
  ];
}

export function renderHeadlessAxSnapshot(tree: WidgetTree): string {
  return projectAxTree(tree)
    .flatMap((node) => formatAx(node, 0))
    .join("\n");
}
