import { workspace, ui } from "@twistedpear/miniapp-sdk";

// The workspace is a plain, strictly-relative filesystem with hard ceilings:
// 256 KiB per file, 4 MiB and 512 files per app. This app shows all three limits
// mattering in an app small enough to read in one sitting.

const DIR = "recipes";
const MAX_FILE_BYTES = 256 * 1024;
const MAX_FILES = 512;

/** @type {string[]} */
let files = [];
let openFile = null;
let text = "";
let newName = "";
let status = "";

function pathFor(name) {
  const safe = name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-");
  return safe.length === 0 ? null : `${DIR}/${safe}.md`;
}

async function refresh() {
  try {
    files = (await workspace.list(DIR)).map((file) => file.path);
  } catch (error) {
    files = [];
  }
}

async function open(path) {
  openFile = path;
  text = await workspace.read(path);
  status = `Open: ${path}`;
}

async function save() {
  if (openFile === null) return;
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
    status = "Too large — the per-file limit is 256 KiB";
    return;
  }
  await workspace.write(openFile, text);
  status = "Saved";
}

async function create() {
  const path = pathFor(newName);
  if (path === null) {
    status = "Give it a name";
    return;
  }
  if (files.length >= MAX_FILES) {
    status = `At the ${MAX_FILES}-file ceiling — delete something first`;
    return;
  }
  await workspace.write(path, `# ${newName}\n\n## Ingredients\n\n## Method\n`);
  newName = "";
  await refresh();
  await open(path);
}

async function remove() {
  if (openFile === null) return;
  await workspace.remove(openFile);
  openFile = null;
  text = "";
  await refresh();
  status = "Deleted";
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
          props: { value: "Recipe box" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "new-row",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            {
              id: "newname",
              type: "text-input",
              props: { value: newName, placeholder: "New recipe", event: "rb.name" }
            },
            { id: "create", type: "button", props: { label: "Create", event: "rb.create" } }
          ]
        },
        {
          id: "files",
          type: "list",
          style: { gap: 2 },
          children: files.map((name, index) => ({
            id: `file-${index}`,
            type: "button",
            props: { label: name, event: `rb.open.${index}` }
          }))
        },
        { id: "divider", type: "divider" },
        {
          id: "editor",
          type: "text-input",
          props: { value: text, placeholder: "Select a recipe", event: "rb.text" },
          style: { height: 200 }
        },
        {
          id: "actions",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "save", type: "button", props: { label: "Save", event: "rb.save" } },
            { id: "delete", type: "button", props: { label: "Delete", event: "rb.delete" } }
          ]
        },
        {
          id: "status",
          type: "text",
          props: { value: `${status} · ${files.length}/${MAX_FILES} files` },
          style: { fontSize: 12 }
        }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "rb.name" && typeof value === "string") newName = value;
  else if (event === "rb.text" && typeof value === "string") text = value;
  else if (event === "rb.create") await create();
  else if (event === "rb.save") await save();
  else if (event === "rb.delete") await remove();
  else if (event.startsWith("rb.open.")) {
    const name = files[Number.parseInt(event.slice("rb.open.".length), 10)];
    await open(name.includes("/") ? name : `${DIR}/${name}`);
  } else return;
  await render();
});

await refresh();
await render();
