// SPEC-PRESENT layout vector generation. The headless-snapshot renderer is
// the reference geometry producer: each vector pins { tree, viewport, boxes }
// under the monospace reference metric. Regenerate deliberately with:
//   npm run generate:layout-vectors
// The widget-parity runner recomputes every vector and fails on any drift.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateWidgetTree } from "../packages/miniapp-runtime/dist/index.js";
import { layoutWidgetTree } from "../packages/widget-renderer-headless/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const streamsDir = join(repo, "specs", "spec-widget", "streams");
const outputPath = join(
  repo,
  "specs",
  "spec-present",
  "vectors",
  "layout.json",
);

const MOBILE = { width: 320, height: 568 };
const TABLET = { width: 768, height: 1024 };

const syntheticTrees = {
  "row-justify-space-between": {
    root: {
      id: "root",
      type: "view",
      style: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 8,
        width: 300,
      },
      children: [
        { id: "left", type: "button", props: { label: "Back" } },
        {
          id: "mid",
          type: "text",
          props: { value: "Title" },
          style: { fontSize: 20 },
        },
        { id: "right", type: "switch", props: { value: true } },
      ],
    },
  },
  "nested-percent-and-margins": {
    root: {
      id: "root",
      type: "view",
      style: { padding: 12, gap: 6 },
      children: [
        {
          id: "half",
          type: "view",
          style: { width: "50%", padding: 4, gap: 4, margin: 2 },
          children: [
            { id: "bar", type: "progress", props: { value: 30, max: 100 } },
            { id: "rule", type: "divider" },
            { id: "gap", type: "spacer", props: { size: 12 } },
            {
              id: "note",
              type: "text",
              props: { value: "half width" },
              style: { fontSize: 12 },
            },
          ],
        },
        {
          id: "wide",
          type: "text-input",
          props: { value: "", placeholder: "full width" },
        },
      ],
    },
  },
  "list-items": {
    root: {
      id: "root",
      type: "view",
      style: { padding: 10 },
      children: [
        {
          id: "menu",
          type: "list",
          props: { items: ["alpha", "beta", "gamma"] },
        },
      ],
    },
  },
  "display-none-subtree": {
    root: {
      id: "root",
      type: "view",
      style: { padding: 8, gap: 8 },
      children: [
        { id: "shown", type: "text", props: { value: "visible" } },
        {
          id: "hidden",
          type: "view",
          style: { display: "none" },
          children: [
            { id: "inner", type: "text", props: { value: "not laid out" } },
          ],
        },
        { id: "after", type: "text", props: { value: "directly after" } },
      ],
    },
  },
  "media-and-editor": {
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        { id: "pic", type: "image", props: { asset: "logo.png", alt: "logo" } },
        {
          id: "qr",
          type: "qr-code",
          props: { value: "lxmf:demo", size: 96, caption: "scan me" },
        },
        {
          id: "editor",
          type: "code-editor",
          props: { documentId: "doc-1", language: "javascript" },
        },
      ],
    },
  },
};

const vectors = [];

function addVector(name, tree, viewport, note) {
  validateWidgetTree(tree);
  vectors.push({
    name,
    ...(note === undefined ? {} : { note }),
    tree,
    viewport,
    boxes: layoutWidgetTree(tree, viewport),
  });
}

for (const [name, tree] of Object.entries(syntheticTrees)) {
  addVector(`${name}@mobile`, tree, MOBILE);
  addVector(`${name}@tablet`, tree, TABLET);
}

for (const app of ["chat", "board", "file-drop"]) {
  const stream = JSON.parse(
    readFileSync(join(streamsDir, `${app}.json`), "utf8"),
  );
  const first = stream.frames[0].tree;
  const last = stream.frames[stream.frames.length - 1].tree;
  addVector(
    `stream-${app}-first@mobile`,
    first,
    MOBILE,
    "first recorded frame of the golden stream",
  );
  addVector(
    `stream-${app}-last@mobile`,
    last,
    MOBILE,
    "last recorded frame of the golden stream",
  );
}

const body = {
  spec: "SPEC-PRESENT",
  description:
    "Reference layout geometry produced by the headless-snapshot renderer. Each vector is { tree, viewport, boxes } with one box per laid-out node in viewport coordinates; display:none subtrees produce no boxes. The reference metric is font-independent; renderers using real fonts conform within the declared tolerances.",
  metric: {
    kind: "monospace",
    advanceWidth: "round(fontSize * 0.6) per character, every character",
    lineHeight: "round(fontSize * 1.25)",
    defaultFontSize: 16,
  },
  tolerance: {
    reference: { x: 0, y: 0, width: 0, height: 0 },
    realFonts: {
      note: "per-box tolerance for renderers measuring real fonts: text-derived extents may deviate by the given fraction of the reference extent; positions inherit accumulated deviation",
      widthFraction: 0.25,
      heightFraction: 0.25,
    },
  },
  vectors,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(body, null, 2) + "\n");
console.log(`wrote ${vectors.length} layout vectors -> ${outputPath}`);
