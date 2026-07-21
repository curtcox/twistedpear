import { announce, storage, ui } from "@twistedpear/miniapp-sdk";

// Announce is fan-out with no server and no delivery guarantee. Everyone who is
// listening when you publish hears you; everyone else never will. The local Hyperbee
// is not a cache of a remote truth — it is this host's whole record of what it heard.

const ANNOUNCE_NAMESPACE = "neighborhood-board";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** @type {{ key: string; from: string; text: string; at: string }[]} */
let posts = [];
let draft = "";
let status = "Listening";

async function refresh() {
  const rows = await storage.bee.list({ gte: "p/", lt: "p0", limit: 100 });
  posts = rows.map((row) => ({ key: row.key, ...JSON.parse(decoder.decode(row.value)) }));
}

async function store(from, text, at) {
  const reverse = 10_000_000_000_000 - new Date(at).getTime();
  await storage.bee.put(
    `p/${String(reverse).padStart(14, "0")}`,
    encoder.encode(JSON.stringify({ from, text, at }))
  );
  await refresh();
}

async function post() {
  if (draft.trim().length === 0) return;
  const at = new Date().toISOString();
  const payload = { text: draft.trim().slice(0, 180), at };
  await announce.publish(encoder.encode(JSON.stringify(payload)), ANNOUNCE_NAMESPACE);
  await store("me", payload.text, at);
  draft = "";
  status = "Published. Only hosts within radio reach right now will have heard it.";
}

announce.subscribe(ANNOUNCE_NAMESPACE).then(async (events) => {
  for (const event of events) {
    const data = JSON.parse(decoder.decode(event.appData));
    if (typeof data.text !== "string") continue;
    await store(event.destination, data.text, data.at ?? new Date().toISOString());
    await render();
  }
});

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
          props: { value: "Neighborhood board" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "draft",
          type: "text-input",
          props: { value: draft, placeholder: "Post to the neighbourhood (180 chars)", event: "nb.draft" }
        },
        { id: "post", type: "button", props: { label: "Post", event: "nb.post" } },
        { id: "divider", type: "divider" },
        {
          id: "posts",
          type: "scroll",
          children: [
            {
              id: "post-list",
              type: "list",
              style: { gap: 10 },
              children: posts.map((item) => ({
                id: `post-${item.key}`,
                type: "view",
                style: { gap: 2 },
                children: [
                  { id: `text-${item.key}`, type: "text", props: { value: item.text } },
                  {
                    id: `meta-${item.key}`,
                    type: "text",
                    props: { value: `${item.from.slice(0, 12)} · ${item.at.slice(0, 16).replace("T", " ")}` },
                    style: { fontSize: 12 }
                  }
                ]
              }))
            }
          ]
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "nb.draft" && typeof value === "string") draft = value;
  else if (event === "nb.post") await post();
  else return;
  await render();
});

await storage.bee.open();
await refresh();
await render();
