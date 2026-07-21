import { storage, ui } from "@twistedpear/miniapp-sdk";

// Hyperbee keys sort lexicographically, so a zero-padded reverse timestamp gives
// newest-first ordering for free. This is the whole trick: choose the key so the
// listing you want is a range scan and not a sort in app memory.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** @type {{ key: string; at: string; text: string }[]} */
let entries = [];
let draft = "";
let status = "";

function keyFor(date) {
  // Descending key: larger timestamps sort earlier.
  const reverse = 10_000_000_000_000 - date.getTime();
  return `obs/${String(reverse).padStart(14, "0")}`;
}

async function refresh() {
  const listed = await storage.bee.list({ gte: "obs/", lt: "obs0", limit: 50 });
  entries = listed.map((row) => ({
    key: row.key,
    ...JSON.parse(decoder.decode(row.value))
  }));
}

async function add() {
  if (draft.trim().length === 0) return;
  const now = new Date();
  await storage.bee.put(
    keyFor(now),
    encoder.encode(JSON.stringify({ at: now.toISOString(), text: draft.trim() }))
  );
  draft = "";
  status = "Logged";
  await refresh();
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
          props: { value: "Field log" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "draft",
          type: "text-input",
          props: { value: draft, placeholder: "What did you observe?", event: "log.draft" }
        },
        { id: "add", type: "button", props: { label: "Log it", event: "log.add" } },
        { id: "divider", type: "divider" },
        {
          id: "entries",
          type: "scroll",
          children: [
            {
              id: "entry-list",
              type: "list",
              style: { gap: 8 },
              children: entries.map((entry) => ({
                id: `entry-${entry.key}`,
                type: "view",
                style: { gap: 2 },
                children: [
                  {
                    id: `when-${entry.key}`,
                    type: "text",
                    props: { value: entry.at.replace("T", " ").slice(0, 19) },
                    style: { fontSize: 12 }
                  },
                  { id: `what-${entry.key}`, type: "text", props: { value: entry.text } }
                ]
              }))
            }
          ]
        },
        {
          id: "status",
          type: "text",
          props: { value: `${status} · ${entries.length} entries held locally` },
          style: { fontSize: 12 }
        }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "log.draft" && typeof value === "string") {
    draft = value;
  } else if (event === "log.add") {
    await add();
  } else {
    return;
  }
  await render();
});

await storage.bee.open();
await refresh();
await render();
