// @ts-nocheck
// SPEC-WIDGET golden stream recorder. Runs each example app bundle headlessly
// against the stub SDK (widget-stream-sdk-shim.mjs), drives a scripted event
// sequence through the app's real ui.onEvent handler, and records every
// ui.render frame. Each stream pins: the validated frames, the diff stream
// between consecutive frames (ui/diff.ts), and the headless-snapshot
// rendering of every frame (the conformance oracle for other renderers).
// Regenerate with: npm run record:widget-streams
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { diffWidgetTrees, validateWidgetTree } from "../packages/miniapp-runtime/dist/index.js";
import { renderHeadlessSnapshot } from "../packages/widget-renderer-headless/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const shimUrl = pathToFileURL(join(here, "widget-stream-sdk-shim.mjs")).href;
const streamsDir = join(repo, "specs", "spec-widget", "streams");

const encoder = new TextEncoder();

const SCRIPTS = {
  chat: {
    description:
      "Chat example: set a peer id, send a hello, then refresh with two scripted inbox messages.",
    setup: (state) => {
      state.inbox = [
        { from: "peer-42", body: "hello back" },
        { from: "peer-77", body: "second message" }
      ];
    },
    events: [
      { event: "chat.peer", value: "peer-42" },
      { event: "chat.send" },
      { event: "chat.refresh" }
    ]
  },
  board: {
    description: "Board example: publish a post, then refresh counts from storage and announces.",
    setup: () => {},
    events: [{ event: "board.publish" }, { event: "board.refresh" }]
  },
  "file-drop": {
    description:
      "File-drop example: one successful scripted 2048-byte fetch, then a scripted budget failure.",
    setup: (state) => {
      state.resourceResults = [
        new Uint8Array(2048).fill(7),
        new Error("Budget exceeded for offer:demo")
      ];
    },
    events: [{ event: "resource.fetch" }, { event: "resource.fetch" }]
  }
};

function freshState() {
  return {
    frames: [],
    handler: undefined,
    kv: new Map(),
    bee: [],
    sent: [],
    inbox: [],
    announces: [],
    resourceResults: []
  };
}

async function recordApp(name) {
  const script = SCRIPTS[name];
  const bundlePath = join(repo, "apps", "examples", name, "bundle.js");
  const source = readFileSync(bundlePath, "utf8");
  if (!source.includes('from "@twistedpear/miniapp-sdk"')) {
    throw new Error(`${bundlePath} does not import @twistedpear/miniapp-sdk as expected`);
  }
  const rewritten = source.replace('from "@twistedpear/miniapp-sdk"', `from ${JSON.stringify(shimUrl)}`);
  const scratch = mkdtempSync(join(tmpdir(), "widget-stream-"));
  const modulePath = join(scratch, `${name}.mjs`);
  writeFileSync(modulePath, rewritten);

  const state = freshState();
  script.setup(state);
  globalThis.__widgetStreamRecorder = state;
  await import(pathToFileURL(modulePath).href);
  if (state.handler === undefined) throw new Error(`${name} never registered ui.onEvent`);
  for (const event of script.events) {
    await state.handler(event);
  }
  delete globalThis.__widgetStreamRecorder;

  const frames = state.frames.map((tree) => {
    validateWidgetTree(tree);
    return { tree, snapshot: renderHeadlessSnapshot(tree) };
  });
  const patches = [];
  for (let i = 1; i < frames.length; i += 1) {
    patches.push(diffWidgetTrees(frames[i - 1].tree, frames[i].tree));
  }

  return {
    spec: "SPEC-WIDGET",
    app: name,
    description: script.description,
    events: script.events,
    frames,
    patches
  };
}

mkdirSync(streamsDir, { recursive: true });
for (const name of Object.keys(SCRIPTS)) {
  const stream = await recordApp(name);
  const path = join(streamsDir, `${name}.json`);
  writeFileSync(path, JSON.stringify(stream, null, 2) + "\n");
  console.log(`${name}: ${stream.frames.length} frames, ${stream.patches.length} transitions -> ${path}`);
}

// Serialization note: streams must be plain JSON. Uint8Array values never
// appear in widget trees (validated above), so no byte encoding is needed.
