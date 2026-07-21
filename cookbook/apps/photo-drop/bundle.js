import { share, resource, storage, ui } from "@twistedpear/miniapp-sdk";

// Two different mechanisms, easy to confuse:
//   share.put/get — content-addressed bytes, identified by a 94-character 256t string.
//   resource.fetch — a budgeted pull of a resource the host already knows how to reach.
// share.get only resolves if a locator announce for those bytes was already heard. There
// is no "go and find it" — if nobody announced it, the identifier is just a string.

const HISTORY_KEY = "drops";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** @type {string[]} */
let history = [];
let identifier = "";
let bytes = null;
let status = "";
let budgetKib = 256;

async function load() {
  const stored = await storage.kv.get(HISTORY_KEY);
  if (stored !== null) {
    try {
      history = JSON.parse(decoder.decode(stored));
    } catch (error) {
      history = [];
    }
  }
}

async function remember(t256) {
  history = [...new Set([t256, ...history])].slice(0, 20);
  await storage.kv.set(HISTORY_KEY, encoder.encode(JSON.stringify(history)));
}

async function putSample() {
  // A real app would take these bytes from a picker. The cookbook keeps the sample
  // self-contained, so it shares a small generated payload instead.
  const payload = `photo-drop sample ${new Date().toISOString()}`;
  const shared = await share.put(payload);
  identifier = shared.t256;
  await remember(shared.t256);
  status = `Shared ${shared.size} bytes as ${shared.t256.slice(0, 12)}…`;
}

async function fetchIt() {
  if (identifier.trim().length !== 94) {
    status = "A 256t identifier is 94 characters";
    return;
  }
  status = "Fetching…";
  await render();
  try {
    bytes = await resource.fetch({
      resourceId: identifier.trim(),
      budgetBytes: budgetKib * 1024
    });
    status = `Fetched ${bytes.length} bytes`;
    await remember(identifier.trim());
  } catch (error) {
    // Over budget, no locator announce heard, or the link went away mid-transfer.
    status = `Fetch failed: ${error?.message ?? "unavailable"}`;
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
          props: { value: "Photo drop" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        { id: "put", type: "button", props: { label: "Share a payload", event: "pd.put" } },
        {
          id: "id",
          type: "text-input",
          props: { value: identifier, placeholder: "256t identifier", event: "pd.id" }
        },
        identifier.length === 94
          ? { id: "qr", type: "qr-code", props: { value: identifier } }
          : { id: "qr-placeholder", type: "spacer" },
        {
          id: "budget",
          type: "text-input",
          props: { value: String(budgetKib), placeholder: "Budget (KiB)", event: "pd.budget" }
        },
        { id: "fetch", type: "button", props: { label: "Fetch", event: "pd.fetch" } },
        { id: "divider", type: "divider" },
        {
          id: "preview",
          type: "text",
          props: { value: bytes === null ? "Nothing fetched yet" : decoder.decode(bytes).slice(0, 200) }
        },
        {
          id: "history",
          type: "list",
          style: { gap: 2 },
          children: history.map((item, index) => ({
            id: `hist-${index}`,
            type: "button",
            props: { label: `${item.slice(0, 24)}…`, event: `pd.recall.${index}` }
          }))
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "pd.id" && typeof value === "string") identifier = value;
  else if (event === "pd.budget" && typeof value === "string") {
    budgetKib = Number.parseInt(value, 10) || 256;
  } else if (event === "pd.put") await putSample();
  else if (event === "pd.fetch") await fetchIt();
  else if (event.startsWith("pd.recall.")) {
    identifier = history[Number.parseInt(event.slice("pd.recall.".length), 10)] ?? identifier;
  } else return;
  await render();
});

await load();
await render();
