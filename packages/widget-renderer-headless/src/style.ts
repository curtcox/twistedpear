import type { WidgetNode } from "@twistedpear/miniapp-runtime";

type WidgetStyle = NonNullable<WidgetNode["style"]>;

const COPIED_PROPERTIES = [
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
] as const satisfies readonly (keyof WidgetStyle)[];

const FONT_WEIGHTS = {
  bold: "700",
  medium: "500",
  regular: "400",
} as const satisfies Record<NonNullable<WidgetStyle["fontWeight"]>, string>;

function copyDefinedProperty(
  source: WidgetStyle,
  target: Record<string, unknown>,
  property: (typeof COPIED_PROPERTIES)[number],
): void {
  const value = source[property];
  if (value !== undefined) target[property] = value;
}

function copyDisplay(
  source: WidgetStyle,
  target: Record<string, unknown>,
): void {
  if (source.display === undefined) return;
  target.display = source.display === "none" ? "none" : "flex";
}

function copyFontWeight(
  source: WidgetStyle,
  target: Record<string, unknown>,
): void {
  if (source.fontWeight === undefined) return;
  target.fontWeight = FONT_WEIGHTS[source.fontWeight];
}

export function renderStyle(
  style: WidgetNode["style"],
): Readonly<Record<string, unknown>> | undefined {
  if (style === undefined) return undefined;
  const rendered: Record<string, unknown> = {};
  copyDisplay(style, rendered);
  for (const property of COPIED_PROPERTIES) {
    copyDefinedProperty(style, rendered, property);
  }
  copyFontWeight(style, rendered);
  return Object.keys(rendered).length === 0 ? undefined : rendered;
}
