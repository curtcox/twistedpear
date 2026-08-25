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

  it("projects every remaining widget role and value shape", () => {
    expect(
      renderHeadlessAxSnapshot(
        tree({
          id: "root",
          type: "view",
          props: { accessibilityLabel: "All" },
          children: [
            { id: "plain", type: "text", props: { value: "Hi" } },
            {
              id: "pane",
              type: "scroll",
              props: { accessibilityLabel: "Pane" },
              children: [
                { id: "bar", type: "progress", props: { value: 0.5 } },
              ],
            },
            { id: "rule", type: "divider" },
            {
              id: "ed",
              type: "code-editor",
              props: { value: "x", documentId: "d" },
            },
            {
              id: "qr",
              type: "qr-code",
              props: { value: "https://x", caption: "Scan" },
            },
            {
              id: "choice",
              type: "select",
              props: { value: "a", options: ["a"] },
            },
            { id: "when", type: "date", props: { value: "2026-01-01" } },
            { id: "cam", type: "camera-preview" },
            { id: "meter", type: "audio-meter" },
            { id: "wave", type: "waveform" },
            { id: "map", type: "map-preview" },
            { id: "remote", type: "remote-video" },
            {
              id: "mute",
              type: "switch",
              props: { value: false, accessibilityLabel: "Mute" },
            },
            { id: "objs", type: "list", props: { items: [{ n: 1 }] } },
            { id: "empty", type: "list" },
          ],
        }),
      ),
    ).toBe(
      [
        'group "All"',
        '  text "Hi"',
        '  generic "Pane"',
        '    progressbar value="0.5"',
        "  separator",
        '  textbox value="x"',
        '  image "Scan"',
        '  combobox value="a"',
        '  textbox value="2026-01-01"',
        "  image",
        "  meter",
        "  image",
        "  image",
        "  image",
        '  switch "Mute" state=unchecked',
        "  list",
        '    listitem "{\\"n\\":1}"',
        "  list",
      ].join("\n"),
    );
  });

  it("flattens an unnamed scroll so labelled children surface", () => {
    expect(
      renderHeadlessAxSnapshot(
        tree({
          id: "root",
          type: "scroll",
          children: [{ id: "go", type: "button", props: { label: "Go" } }],
        }),
      ),
    ).toBe('button "Go"');
  });
});
