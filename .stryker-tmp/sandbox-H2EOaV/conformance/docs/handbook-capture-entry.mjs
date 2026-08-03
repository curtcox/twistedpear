/**
 * Render a captured Handbook widget tree for documentation screenshots.
 */
// @ts-nocheck


import React from "react";
import { createRoot } from "react-dom/client";
import { validateWidgetTree } from "../../packages/miniapp-runtime/dist/ui/validate.js";
import { MiniappWidgetTree } from "../../packages/widget-renderer-rn/dist/index.js";

const rootEl = document.getElementById("root");
if (rootEl === null) {
  throw new Error("Missing #root element");
}

const rawTree = globalThis.__HANDBOOK_CAPTURE_TREE__;
if (rawTree === undefined || rawTree === null) {
  throw new Error("Missing __HANDBOOK_CAPTURE_TREE__");
}

const tree = validateWidgetTree(rawTree);
createRoot(rootEl).render(React.createElement(MiniappWidgetTree, { tree }));
globalThis.__HANDBOOK_CAPTURE_READY__ = true;
