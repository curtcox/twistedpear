// @ts-nocheck
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { describeWidgetTree, validateWidgetTree } from "../src/index.js";
import type { RenderedWidgetNode } from "../src/ui/describe.js";

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../conformance/fixtures/widget-trees");

function loadFixture(name: string): RenderedWidgetNode {
  return JSON.parse(readFileSync(resolve(fixturesDir, `${name}.json`), "utf8")) as RenderedWidgetNode;
}

describe("widget tree golden render model", () => {
  it("matches hello fixture", () => {
    const tree = validateWidgetTree({
      root: {
        id: "root",
        type: "view",
        style: { padding: 16, gap: 8 },
        children: [
          { id: "title", type: "text", props: { value: "Hello" }, style: { fontSize: 20, fontWeight: "bold" } },
          { id: "go", type: "button", props: { label: "Tap me", event: "hello.tap" } }
        ]
      }
    });

    expect(describeWidgetTree(tree)).toEqual(loadFixture("hello"));
  });

  it("matches chat panel fixture", () => {
    const tree = validateWidgetTree({
      root: {
        id: "root",
        type: "view",
        style: { padding: 16, gap: 12 },
        children: [
          { id: "title", type: "text", props: { value: "Chat" }, style: { fontSize: 20, fontWeight: "bold" } },
          {
            id: "peer-input",
            type: "text-input",
            props: { value: "", placeholder: "Peer app id", event: "chat.peer" }
          },
          { id: "send", type: "button", props: { label: "Send hello", event: "chat.send" } },
          {
            id: "inbox-scroll",
            type: "scroll",
            children: [{ id: "inbox", type: "text", props: { value: "No messages yet" } }]
          }
        ]
      }
    });

    expect(describeWidgetTree(tree)).toEqual(loadFixture("chat-panel"));
  });

  it("describes list, image, switch, progress, divider, and spacer nodes", () => {
    const tree = validateWidgetTree({
      root: {
        id: "root",
        type: "view",
        children: [
          { id: "hero", type: "image", props: { asset: "icon.png" } },
          { id: "toggle", type: "switch", props: { value: true, event: "settings.toggle" } },
          { id: "meter", type: "progress", props: { value: 42 } },
          { id: "items", type: "list", props: { items: ["alpha", "beta"] } },
          { id: "rule", type: "divider" },
          { id: "gap", type: "spacer" }
        ]
      }
    });

    expect(describeWidgetTree(tree)).toEqual({
      component: "View",
      id: "root",
      children: [
        { component: "Image", id: "hero", props: { asset: "icon.png" } },
        { component: "Switch", id: "toggle", props: { value: true, event: "settings.toggle" } },
        { component: "Progress", id: "meter", props: { value: 42 } },
        {
          component: "List",
          id: "items",
          children: [
            { component: "ListItem", id: "items-item-0", props: { value: "alpha" } },
            { component: "ListItem", id: "items-item-1", props: { value: "beta" } }
          ]
        },
        { component: "Divider", id: "rule" },
        { component: "Spacer", id: "gap", props: { height: 8 } }
      ]
    });
  });
});
