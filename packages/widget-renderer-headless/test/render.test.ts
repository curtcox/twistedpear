import type { WidgetNode, WidgetTree } from "@twistedpear/miniapp-runtime";
import { describe, expect, it } from "vitest";
import { renderHeadlessSnapshot, renderHeadlessTree } from "../src/index.js";

function tree(root: WidgetNode): WidgetTree {
  return { root };
}

function rendered(node: WidgetNode): ReturnType<typeof renderHeadlessTree> {
  return renderHeadlessTree(tree(node));
}

describe("renderHeadlessTree", () => {
  it("renders containers with their children", () => {
    expect(
      rendered({
        id: "root",
        type: "view",
        children: [
          {
            id: "inner",
            type: "scroll",
            children: [{ id: "d", type: "divider" }],
          },
        ],
      }),
    ).toEqual({
      id: "root",
      component: "View",
      children: [
        {
          id: "inner",
          component: "ScrollView",
          children: [{ id: "d", component: "Divider" }],
        },
      ],
    });
  });

  it("omits the children key when a container has none", () => {
    expect(rendered({ id: "root", type: "view" })).toEqual({
      id: "root",
      component: "View",
    });
  });

  it("renders the style block only when the node carries one", () => {
    expect(
      rendered({
        id: "root",
        type: "view",
        style: { padding: 8, fontWeight: "bold", display: "flex" },
      }),
    ).toEqual({
      id: "root",
      component: "View",
      style: { display: "flex", padding: 8, fontWeight: "700" },
    });
  });

  it("passes display:none through and normalizes every other display", () => {
    expect(
      rendered({ id: "root", type: "view", style: { display: "none" } }).style,
    ).toEqual({ display: "none" });
  });

  it("omits the style block when it holds no recognized property", () => {
    expect(
      rendered({ id: "root", type: "view", style: {} }).style,
    ).toBeUndefined();
  });

  it("coerces text values and falls back to the empty string", () => {
    expect(rendered({ id: "t", type: "text", props: { value: 42 } })).toEqual({
      id: "t",
      component: "Text",
      props: { value: "42" },
    });
    expect(rendered({ id: "t", type: "text" })).toEqual({
      id: "t",
      component: "Text",
      props: { value: "" },
    });
  });

  it("defaults the button label and carries a string event through", () => {
    expect(rendered({ id: "b", type: "button" })).toEqual({
      id: "b",
      component: "Button",
      props: { label: "Button" },
    });
    expect(
      rendered({
        id: "b",
        type: "button",
        props: { label: "Go", event: "tap" },
      }),
    ).toEqual({
      id: "b",
      component: "Button",
      props: { label: "Go", event: "tap" },
    });
  });

  it("drops a non-string event", () => {
    expect(
      rendered({ id: "b", type: "button", props: { label: "Go", event: 7 } }),
    ).toEqual({ id: "b", component: "Button", props: { label: "Go" } });
  });

  it("renders text inputs with value, placeholder, and event", () => {
    expect(
      rendered({
        id: "i",
        type: "text-input",
        props: { value: "abc", placeholder: "name", event: "change" },
      }),
    ).toEqual({
      id: "i",
      component: "TextInput",
      props: { value: "abc", placeholder: "name", event: "change" },
    });
    expect(rendered({ id: "i", type: "text-input" })).toEqual({
      id: "i",
      component: "TextInput",
      props: { value: "", placeholder: "" },
    });
  });

  it("renders text input flags and optional keyboard", () => {
    expect(
      rendered({
        id: "i",
        type: "text-input",
        props: {
          multiline: true,
          secure: true,
          keyboard: "email",
        },
      }),
    ).toEqual({
      id: "i",
      component: "TextInput",
      props: {
        value: "",
        placeholder: "",
        multiline: true,
        secure: true,
        keyboard: "email",
      },
    });
  });

  it("coerces switch values to booleans", () => {
    expect(rendered({ id: "s", type: "switch", props: { value: 1 } })).toEqual({
      id: "s",
      component: "Switch",
      props: { value: true },
    });
    expect(rendered({ id: "s", type: "switch" })).toEqual({
      id: "s",
      component: "Switch",
      props: { value: false },
    });
  });

  it("renders select, slider, and date controls with defaults and events", () => {
    expect(
      rendered({
        id: "select",
        type: "select",
        props: { options: ["one"], value: "one", event: "choose" },
      }),
    ).toEqual({
      id: "select",
      component: "Select",
      props: { options: ["one"], value: "one", event: "choose" },
    });
    expect(
      rendered({
        id: "slider",
        type: "slider",
        props: { value: 2, min: 1, max: 5, step: 0.5, event: "slide" },
      }),
    ).toEqual({
      id: "slider",
      component: "Slider",
      props: { value: 2, min: 1, max: 5, step: 0.5, event: "slide" },
    });
    expect(
      rendered({
        id: "fallback-slider",
        type: "slider",
        props: { value: "bad", min: "bad", max: "bad", step: "bad" },
      }),
    ).toEqual({
      id: "fallback-slider",
      component: "Slider",
      props: { value: 0, min: 0, max: 100 },
    });
    expect(
      rendered({
        id: "invalid-select",
        type: "select",
        props: { options: "bad" },
      }),
    ).toEqual({
      id: "invalid-select",
      component: "Select",
      props: { value: "", options: [] },
    });
    expect(rendered({ id: "date", type: "date" })).toEqual({
      id: "date",
      component: "Date",
      props: { value: "" },
    });
  });
});

describe("renderHeadlessTree leaf widgets", () => {
  it("renders spacers and progress with their defaults", () => {
    expect(rendered({ id: "sp", type: "spacer" })).toEqual({
      id: "sp",
      component: "Spacer",
      props: { height: 8 },
    });
    expect(rendered({ id: "p", type: "progress" })).toEqual({
      id: "p",
      component: "Progress",
      props: { value: 0 },
    });
    expect(
      rendered({ id: "p", type: "progress", props: { value: 0.5 } }),
    ).toEqual({ id: "p", component: "Progress", props: { value: 0.5 } });
  });

  it("expands list items into synthesized ListItem children", () => {
    expect(
      rendered({
        id: "l",
        type: "list",
        props: { items: ["one", { two: 2 }] },
      }),
    ).toEqual({
      id: "l",
      component: "List",
      children: [
        { id: "l-item-0", component: "ListItem", props: { value: "one" } },
        {
          id: "l-item-1",
          component: "ListItem",
          props: { value: '{"two":2}' },
        },
      ],
    });
  });

  it("renders an empty list when items is absent or not an array", () => {
    expect(rendered({ id: "l", type: "list" })).toEqual({
      id: "l",
      component: "List",
      children: [],
    });
    expect(
      rendered({ id: "l", type: "list", props: { items: "nope" } }),
    ).toEqual({ id: "l", component: "List", children: [] });
  });

  it("renders images and code editors", () => {
    expect(rendered({ id: "img", type: "image" })).toEqual({
      id: "img",
      component: "Image",
      props: { asset: "" },
    });
    expect(
      rendered({
        id: "ed",
        type: "code-editor",
        props: {
          documentId: "doc",
          language: "ts",
          readOnly: true,
          event: "edit",
        },
      }),
    ).toEqual({
      id: "ed",
      component: "CodeEditor",
      props: {
        documentId: "doc",
        language: "ts",
        readOnly: true,
        event: "edit",
      },
    });
    expect(rendered({ id: "ed", type: "code-editor" })).toEqual({
      id: "ed",
      component: "CodeEditor",
      props: { documentId: "", language: "text", readOnly: false },
    });
  });

  it("renders qr codes with optional size and caption", () => {
    expect(
      rendered({ id: "q", type: "qr-code", props: { value: "x" } }),
    ).toEqual({
      id: "q",
      component: "QrCode",
      props: { value: "x" },
    });
    expect(
      rendered({
        id: "q",
        type: "qr-code",
        props: { value: "x", size: 64, caption: "scan" },
      }),
    ).toEqual({
      id: "q",
      component: "QrCode",
      props: { value: "x", size: 64, caption: "scan" },
    });
  });

  it.each([
    "camera-preview",
    "audio-meter",
    "waveform",
    "map-preview",
    "remote-video",
  ] as const)("renders %s as a device preview surface", (type) => {
    expect(rendered({ id: "s", type, props: { session: "sess" } })).toEqual({
      id: "s",
      component: "DevicePreview",
      props: { surface: type, session: "sess" },
    });
  });
});

describe("renderHeadlessSnapshot", () => {
  it("emits stable sorted props and styles", () => {
    expect(
      renderHeadlessSnapshot({
        root: {
          id: "root",
          type: "progress",
          props: { value: ["hello", "world"] },
          style: { color: "red" },
        },
      }),
    ).toBe('Progress#root {"value":["hello","world"]} style={"color":"red"}');
  });
});

describe("renderHeadlessSnapshot", () => {
  it("renders one indented line per node with sorted props and style", () => {
    const snapshot = renderHeadlessSnapshot(
      tree({
        id: "root",
        type: "view",
        style: { gap: 4, padding: 8 },
        children: [
          {
            id: "title",
            type: "text",
            props: { value: "Hi" },
            style: { fontSize: 20 },
          },
          { id: "div", type: "divider" },
        ],
      }),
    );

    expect(snapshot).toBe(
      [
        'View#root style={"gap":4,"padding":8}',
        '  Text#title {"value":"Hi"} style={"fontSize":20}',
        "  Divider#div",
      ].join("\n"),
    );
  });

  it("gives each synthesized list item its own line", () => {
    expect(
      renderHeadlessSnapshot(
        tree({ id: "l", type: "list", props: { items: ["a", "b"] } }),
      ),
    ).toBe(
      [
        "List#l",
        '  ListItem#l-item-0 {"value":"a"}',
        '  ListItem#l-item-1 {"value":"b"}',
      ].join("\n"),
    );
  });
});
