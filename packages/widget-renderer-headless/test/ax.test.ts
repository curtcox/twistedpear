import type { WidgetNode, WidgetTree } from "@twistedpear/miniapp-runtime";
import { describe, expect, it } from "vitest";
import { renderHeadlessAxSnapshot } from "../src/index.js";

function tree(root: WidgetNode): WidgetTree {
  return { root };
}

describe("renderHeadlessAxSnapshot", () => {
  it("projects a labelled view and image alt", () => {
    expect(
      renderHeadlessAxSnapshot(
        tree({
          id: "root",
          type: "view",
          props: { accessibilityLabel: "Panel" },
          children: [
            {
              id: "hero",
              type: "image",
              props: { asset: "pear.png", alt: "A pear" },
            },
          ],
        }),
      ),
    ).toBe('group "Panel"\n  image "A pear"');
  });

  it("flattens an unnamed view so the button is a root node", () => {
    expect(
      renderHeadlessAxSnapshot(
        tree({
          id: "root",
          type: "view",
          children: [{ id: "go", type: "button", props: { label: "Save" } }],
        }),
      ),
    ).toBe('button "Save"');
  });

  it("omits a decorative image and flattens spacers", () => {
    expect(
      renderHeadlessAxSnapshot(
        tree({
          id: "root",
          type: "view",
          children: [
            {
              id: "mark",
              type: "image",
              props: { asset: "mark.png", decorative: true },
            },
            { id: "gap", type: "spacer", props: { size: 8 } },
            { id: "go", type: "button", props: { label: "Next" } },
          ],
        }),
      ),
    ).toBe('button "Next"');
  });

  it("promotes text with heading to heading with a level", () => {
    expect(
      renderHeadlessAxSnapshot(
        tree({
          id: "h",
          type: "text",
          props: { value: "Title", heading: 1 },
        }),
      ),
    ).toBe('heading "Title" level=1');
  });

  it("records text-input value and slider value", () => {
    expect(
      renderHeadlessAxSnapshot(
        tree({
          id: "root",
          type: "view",
          props: { accessibilityLabel: "Form" },
          children: [
            {
              id: "name",
              type: "text-input",
              props: { value: "Ada", accessibilityLabel: "Name" },
            },
            {
              id: "vol",
              type: "slider",
              props: { value: 7, accessibilityLabel: "Volume" },
            },
          ],
        }),
      ),
    ).toBe(
      [
        'group "Form"',
        '  textbox "Name" value="Ada"',
        '  slider "Volume" value="7"',
      ].join("\n"),
    );
  });

  it("records switch state and list items", () => {
    expect(
      renderHeadlessAxSnapshot(
        tree({
          id: "root",
          type: "view",
          props: { accessibilityLabel: "Form" },
          children: [
            {
              id: "alerts",
              type: "switch",
              props: { value: true, accessibilityLabel: "Alerts" },
            },
            {
              id: "people",
              type: "list",
              props: { items: ["Ada", "Bob"] },
            },
          ],
        }),
      ),
    ).toBe(
      [
        'group "Form"',
        '  switch "Alerts" state=checked',
        "  list",
        '    listitem "Ada"',
        '    listitem "Bob"',
      ].join("\n"),
    );
  });
});
