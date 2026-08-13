import type { WidgetNode } from "@twistedpear/miniapp-runtime/ui";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Event wiring is invisible to a server render: react-dom never attaches the
// handlers. Standing in a recording stub for react-native lets these tests call
// the callbacks the renderer built. MiniappWidgetTree.test.tsx covers the real
// react-native-web markup.
const captured = new Map<string, Record<string, unknown>>();

vi.mock("react-native", () => {
  const host =
    (tag: string) =>
    (props: Record<string, unknown> & { readonly children?: ReactNode }) => {
      const testID = props.testID;
      if (typeof testID === "string") {
        captured.set(testID, props);
      }
      return createElement(
        tag,
        { "data-testid": testID },
        props.children ?? null,
      );
    };

  return {
    Image: host("img"),
    Pressable: host("button"),
    ScrollView: host("div"),
    Switch: host("input"),
    Text: host("span"),
    TextInput: host("input"),
    View: host("div"),
    StyleSheet: { create: (sheet: unknown) => sheet },
  };
});

const { MiniappWidgetTree } = await import("../src/MiniappWidgetTree.js");

type Event = readonly [string, string, unknown];

function mount(root: WidgetNode, onEvent?: (...event: Event) => void) {
  captured.clear();
  renderToStaticMarkup(
    <MiniappWidgetTree
      tree={{ root }}
      {...(onEvent === undefined
        ? {}
        : {
            onEvent: (nodeId: string, event: string, value?: unknown) => {
              onEvent(nodeId, event, value);
            },
          })}
    />,
  );
}

function props(testID: string): Record<string, unknown> {
  const found = captured.get(testID);
  if (found === undefined) throw new Error(`no widget rendered for ${testID}`);
  return found;
}

function handler(testID: string, name: string): (...args: never[]) => void {
  const value = props(testID)[name];
  if (typeof value !== "function") {
    throw new Error(`${testID} has no ${name} handler`);
  }
  return value as (...args: never[]) => void;
}

let events: Event[] = [];
const record = (...event: Event) => {
  events.push(event);
};

beforeEach(() => {
  events = [];
});

describe("button events", () => {
  it("emits the configured event on press", () => {
    mount({ id: "b", type: "button", props: { event: "tap" } }, record);
    handler("b", "onPress")();
    expect(events).toEqual([["b", "tap", undefined]]);
  });

  it("stays quiet without an event name or listener", () => {
    mount({ id: "b", type: "button" }, record);
    handler("b", "onPress")();
    mount({ id: "b", type: "button", props: { event: "tap" } });
    handler("b", "onPress")();
    expect(events).toEqual([]);
  });
});

describe("text input events", () => {
  it("emits the typed text", () => {
    mount({ id: "i", type: "text-input", props: { event: "typed" } }, record);
    handler("i", "onChangeText")("hello" as never);
    expect(events).toEqual([["i", "typed", "hello"]]);
  });

  it("stays quiet without an event name", () => {
    mount({ id: "i", type: "text-input" }, record);
    handler("i", "onChangeText")("hello" as never);
    expect(events).toEqual([]);
  });
});

describe("switch events", () => {
  it("emits the new value", () => {
    mount({ id: "s", type: "switch", props: { event: "toggled" } }, record);
    handler("s", "onValueChange")(true as never);
    expect(events).toEqual([["s", "toggled", true]]);
  });

  it("stays quiet without an event name", () => {
    mount({ id: "s", type: "switch" }, record);
    handler("s", "onValueChange")(false as never);
    expect(events).toEqual([]);
  });
});

describe("scroll events", () => {
  const scrolled = { nativeEvent: { contentOffset: { y: 120 } } };

  it("reports the scroll offset", () => {
    mount({ id: "sc", type: "scroll", props: { event: "scrolled" } }, record);
    handler("sc", "onScroll")(scrolled as never);
    expect(events).toEqual([["sc", "scrolled", { y: 120 }]]);
  });

  it("stays quiet without an event name", () => {
    mount({ id: "sc", type: "scroll" }, record);
    handler("sc", "onScroll")(scrolled as never);
    expect(events).toEqual([]);
  });
});

describe("code editor edits", () => {
  const editor: WidgetNode = {
    id: "e",
    type: "code-editor",
    props: { documentId: "notes.md", event: "edited" },
  };

  it("sends the minimal insertion against the baseline", () => {
    mount(editor, record);
    handler("e", "onChangeText")("abc" as never);
    expect(events).toEqual([
      [
        "e",
        "edited",
        {
          documentId: "notes.md",
          baseLength: 0,
          edits: [{ start: 0, end: 0, text: "abc" }],
        },
      ],
    ]);
  });

  it("sends nothing when the text is unchanged", () => {
    mount(editor, record);
    handler("e", "onChangeText")("" as never);
    expect(events).toEqual([]);
  });

  it("stays quiet without an event name", () => {
    mount({ id: "e", type: "code-editor", props: { documentId: "n" } }, record);
    handler("e", "onChangeText")("abc" as never);
    expect(events).toEqual([]);
  });
});

describe("minimal text edits", () => {
  // The editor diffs against its baseline, which starts empty and only advances
  // once an edit is emitted, so each case mounts a fresh editor.
  function edit(after: string): unknown {
    mount(
      { id: "e", type: "code-editor", props: { documentId: "d", event: "e" } },
      record,
    );
    handler("e", "onChangeText")(after as never);
    const [emitted] = events;
    return (emitted?.[2] as { readonly edits?: unknown[] } | undefined)
      ?.edits?.[0];
  }

  it("trims a shared prefix and suffix", () => {
    // Baseline "" then "abcd" makes "abcd" the new baseline for the next edit.
    mount(
      { id: "e", type: "code-editor", props: { documentId: "d", event: "e" } },
      record,
    );
    const onChangeText = handler("e", "onChangeText");
    onChangeText("abcd" as never);
    onChangeText("abXYcd" as never);
    onChangeText("abXYc" as never);
    expect(events.map(([, , value]) => value)).toEqual([
      {
        documentId: "d",
        baseLength: 0,
        edits: [{ start: 0, end: 0, text: "abcd" }],
      },
      {
        documentId: "d",
        baseLength: 4,
        edits: [{ start: 2, end: 2, text: "XY" }],
      },
      {
        documentId: "d",
        baseLength: 6,
        edits: [{ start: 5, end: 6, text: "" }],
      },
    ]);
  });

  it("records a pure append", () => {
    expect(edit("append")).toEqual({ start: 0, end: 0, text: "append" });
  });
});
