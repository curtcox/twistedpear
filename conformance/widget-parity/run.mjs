#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describeWidgetTree, validateWidgetTree } from "../../packages/miniapp-runtime/dist/index.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/widget-trees");

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), "utf8"));
}

function deepEqual(left, right) {
  return JSON.stringify(sortKeys(left)) === JSON.stringify(sortKeys(right));
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = sortKeys(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function assertEqual(actual, expected, label) {
  if (!deepEqual(actual, expected)) {
    throw new Error(`${label} mismatch:\nexpected ${JSON.stringify(expected)}\nactual   ${JSON.stringify(actual)}`);
  }
}

const helloTree = validateWidgetTree({
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

assertEqual(describeWidgetTree(helloTree), loadFixture("hello"), "hello golden fixture");

const chatTree = validateWidgetTree({
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

assertEqual(describeWidgetTree(chatTree), loadFixture("chat-panel"), "chat-panel golden fixture");

const domTypes = ["view", "text", "button", "text-input", "switch", "scroll", "divider", "spacer", "progress", "list", "image"];
for (const type of domTypes) {
  validateWidgetTree({
    root: {
      id: "root",
      type,
      props:
        type === "text"
          ? { value: "x" }
          : type === "button"
            ? { label: "x", event: "x" }
            : type === "text-input"
              ? { value: "", event: "x" }
              : type === "switch"
                ? { value: false, event: "x" }
                : type === "progress"
                  ? { value: 0 }
                  : type === "list"
                    ? { items: [] }
                    : type === "image"
                      ? { asset: "a.png" }
                      : undefined
    }
  });
}

console.log("widget-parity: golden fixtures + DOM whitelist coverage passed");
