#!/usr/bin/env node
// @ts-nocheck
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

// ---------------------------------------------------------------------------
// SPEC-WIDGET: recorded golden streams drive every renderer implementation.
// ---------------------------------------------------------------------------
const { readdirSync } = await import("node:fs");
const { diffWidgetTrees } = await import("../../packages/miniapp-runtime/dist/index.js");
const {
  UnappliablePatchError,
  applyWidgetPatches,
  containsId,
  renderHeadlessSnapshot,
  renderHeadlessTree
} = await import("../../packages/widget-renderer-headless/dist/index.js");
const { createValidator } = await import("../tools/mini-json-schema.mjs");
const { generateWidgetSchema } = await import("../../scripts/generate-widget-schema.mjs");

const specDir = join(dirname(fileURLToPath(import.meta.url)), "../../specs/spec-widget");
const schemaPath = join(specDir, "schema/widget.schema.json");

// Authority check: the committed schema must match the vocabulary tables.
const committedSchema = readFileSync(schemaPath, "utf8");
const regenerated = JSON.stringify(generateWidgetSchema(), null, 2) + "\n";
if (committedSchema !== regenerated) {
  throw new Error("specs/spec-widget/schema/widget.schema.json drifted from ui/schema.ts — run npm run generate:widget-schema");
}

const validateTreeSchema = createValidator(`${schemaPath}#/$defs/tree`);
const validatePatchStream = createValidator(`${schemaPath}#/$defs/patchStream`);

// Schema canaries: out-of-vocabulary trees must be rejected.
const badTrees = [
  { root: { id: "r", type: "carousel" } },
  { root: { id: "r", type: "text", props: { value: "x", onClick: "nope" } } },
  { root: { id: "r", type: "view", style: { zIndex: 3 } } },
  { root: { id: "r", type: "qr-code", props: { value: "" } } }
];
for (const bad of badTrees) {
  if (validateTreeSchema(bad).length === 0) {
    throw new Error(`widget schema failed to reject: ${JSON.stringify(bad)}`);
  }
}

const streamsDir = join(specDir, "streams");
const streamFiles = readdirSync(streamsDir).filter((name) => name.endsWith(".json")).sort();
if (streamFiles.length < 3) {
  throw new Error(`expected at least 3 recorded widget streams, found ${streamFiles.length}`);
}

for (const file of streamFiles) {
  const stream = JSON.parse(readFileSync(join(streamsDir, file), "utf8"));
  const frames = stream.frames;
  for (const [index, frame] of frames.entries()) {
    const where = `${stream.app} frame ${index}`;
    // 1. Vocabulary: schema and host validation agree the frame is well-formed.
    const schemaErrors = validateTreeSchema(frame.tree);
    if (schemaErrors.length > 0) {
      throw new Error(`${where} violates the widget schema: ${schemaErrors[0]}`);
    }
    validateWidgetTree(frame.tree);
    // 2. Renderer parity: the headless interpretation must equal the canonical
    //    host render model node-for-node.
    assertEqual(renderHeadlessTree(frame.tree), describeWidgetTree(frame.tree), `${where} headless/canonical parity`);
    // 3. Golden snapshot from the headless-snapshot oracle.
    const snapshot = renderHeadlessSnapshot(frame.tree);
    if (snapshot !== frame.snapshot) {
      throw new Error(`${where} headless snapshot drifted:\n--- pinned\n${frame.snapshot}\n--- got\n${snapshot}`);
    }
  }
  // 4. Update stream: pinned patches must be exactly what the differ emits,
  //    must validate against the patch schema, and — where the stream contains
  //    no structural inserts — must reconstruct the next frame.
  for (let i = 1; i < frames.length; i += 1) {
    const where = `${stream.app} transition ${i - 1}->${i}`;
    const pinned = stream.patches[i - 1];
    const patchErrors = validatePatchStream(pinned);
    if (patchErrors.length > 0) {
      throw new Error(`${where} patch stream violates schema: ${patchErrors[0]}`);
    }
    assertEqual(diffWidgetTrees(frames[i - 1].tree, frames[i].tree), pinned, `${where} diff`);
    try {
      const rebuilt = applyWidgetPatches(frames[i - 1].tree, pinned);
      assertEqual(rebuilt, frames[i].tree, `${where} patch reconstruction`);
    } catch (error) {
      if (!(error instanceof UnappliablePatchError)) throw error;
      // Structural insert: the replacement node must exist in the next frame.
      if (!containsId(frames[i].tree.root, error.patch.id)) {
        throw new Error(`${where} insert patch for id absent from next frame: ${error.patch.id}`);
      }
    }
  }
  console.log(`widget-parity: stream ${stream.app} (${frames.length} frames) passed`);
}

console.log("widget-parity: recorded golden streams drive schema, differ, and headless renderer");

// ---------------------------------------------------------------------------
// SPEC-PRESENT: reference layout vectors recomputed by the headless renderer.
// ---------------------------------------------------------------------------
const { layoutWidgetTree } = await import("../../packages/widget-renderer-headless/dist/index.js");
const layoutVectorsPath = join(specDir, "../spec-present/vectors/layout.json");
const layoutDoc = JSON.parse(readFileSync(layoutVectorsPath, "utf8"));
if (layoutDoc.vectors.length < 10) {
  throw new Error(`expected at least 10 layout vectors, found ${layoutDoc.vectors.length}`);
}
for (const vector of layoutDoc.vectors) {
  validateWidgetTree(vector.tree);
  const boxes = layoutWidgetTree(vector.tree, vector.viewport);
  assertEqual(boxes, vector.boxes, `layout vector ${vector.name}`);
}
console.log(`widget-parity: ${layoutDoc.vectors.length} SPEC-PRESENT layout vectors reproduced exactly`);
