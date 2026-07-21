import { storage, ui } from "@twistedpear/miniapp-sdk";

// The smallest useful storage:kv app. Note the two things every storage app has to do:
// tolerate a null on first run, and survive the user revoking the grant while running.

const KEY = "note";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

let text = "";
let status = "";

async function load() {
  try {
    const stored = await storage.kv.get(KEY);
    text = stored === null ? "" : decoder.decode(stored);
    status = stored === null ? "New note" : `Loaded ${stored.length} bytes`;
  } catch (error) {
    // A revoked storage:kv grant arrives here as a CapabilityError. The app keeps
    // working as a scratchpad; it just cannot promise the text will still be there.
    status = "Storage unavailable — this note will not be saved";
  }
}

async function save() {
  try {
    await storage.kv.set(KEY, encoder.encode(text));
    status = `Saved ${text.length} characters`;
  } catch (error) {
    status = "Save failed — storage unavailable";
  }
}

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Pocket notes" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "editor",
          type: "text-input",
          props: { value: text, placeholder: "Write anything", event: "note.change" },
          style: { height: 240 }
        },
        {
          id: "actions",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "save", type: "button", props: { label: "Save", event: "note.save" } },
            { id: "clear", type: "button", props: { label: "Clear", event: "note.clear" } }
          ]
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "note.change" && typeof value === "string") {
    text = value;
    status = "Unsaved changes";
  } else if (event === "note.save") {
    await save();
  } else if (event === "note.clear") {
    text = "";
    await save();
  } else {
    return;
  }
  await render();
});

await load();
await render();
