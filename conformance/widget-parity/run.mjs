#!/usr/bin/env node
import { describeWidgetTree, validateWidgetTree } from "../../packages/miniapp-runtime/dist/index.js";

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

const described = describeWidgetTree(helloTree);
if (described.component !== "View" || described.children?.length !== 2) {
  throw new Error("describeWidgetTree contract mismatch");
}

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

console.log("widget-parity: RN describe contract + DOM whitelist coverage passed");
