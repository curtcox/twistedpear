import { announce, apps, storage, ui } from "@twistedpear/miniapp-sdk";

// Curation without a registry. There is no store, no search, and no moderation, so the
// only filter that exists is a list of publishers you personally decided to trust. This
// app maintains that list and nothing else — apps.install still raises a host
// confirmation and a full capability review every single time.

const TRUSTED_KEY = "trusted";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** @type {string[]} */
let trusted = [];
/** @type {{ from: string; name: string; t256: string; at: number }[]} */
let heard = [];
let draft = "";
let status = "Listening for app announces";

async function load() {
  const stored = await storage.kv.get(TRUSTED_KEY);
  if (stored === null) return;
  try {
    trusted = JSON.parse(decoder.decode(stored));
  } catch (error) {
    trusted = [];
  }
}

async function saveTrusted() {
  await storage.kv.set(TRUSTED_KEY, encoder.encode(JSON.stringify(trusted)));
}

announce.subscribe().then(async (stream) => {
  for await (const event of stream) {
    const data = event.appData ?? {};
    if (typeof data.t256 !== "string" || data.t256.length !== 94) continue;
    heard = [
      { from: event.from ?? "unknown", name: String(data.name ?? "unnamed"), t256: data.t256, at: Date.now() },
      ...heard.filter((row) => row.t256 !== data.t256)
    ].slice(0, 50);
    await render();
  }
});

async function install(t256) {
  status = "Waiting for the host's capability review…";
  await render();
  try {
    await apps.install(t256);
    status = "Installed";
  } catch (error) {
    // Denied at the confirmation, denied at the capability review, or the bytes
    // could not be resolved because no locator announce was heard.
    status = `Not installed: ${error?.message ?? "denied"}`;
  }
}

async function render() {
  const visible = heard.filter((row) => trusted.length === 0 || trusted.includes(row.from));
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "App relay" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "trust-row",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            {
              id: "draft",
              type: "text-input",
              props: { value: draft, placeholder: "Trust a publisher address", event: "ar.draft" }
            },
            { id: "trust", type: "button", props: { label: "Trust", event: "ar.trust" } }
          ]
        },
        {
          id: "trusted",
          type: "text",
          props: {
            value:
              trusted.length === 0
                ? "Trusting nobody — showing everything heard. This is not a safe default."
                : `Trusting ${trusted.length} publisher(s)`
          },
          style: { fontSize: 11 }
        },
        { id: "divider", type: "divider" },
        {
          id: "heard",
          type: "list",
          style: { gap: 8 },
          children: visible.map((row, index) => ({
            id: `heard-${index}`,
            type: "view",
            style: { gap: 2 },
            children: [
              { id: `name-${index}`, type: "text", props: { value: row.name } },
              {
                id: `from-${index}`,
                type: "text",
                props: { value: `from ${row.from.slice(0, 16)}… · ${row.t256.slice(0, 16)}…` },
                style: { fontSize: 11 }
              },
              {
                id: `install-${index}`,
                type: "button",
                props: { label: "Install…", event: `ar.install.${index}` }
              }
            ]
          }))
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "ar.draft" && typeof value === "string") draft = value;
  else if (event === "ar.trust") {
    if (draft.trim().length > 0) {
      trusted = [...new Set([...trusted, draft.trim()])];
      draft = "";
      await saveTrusted();
    }
  } else if (event.startsWith("ar.install.")) {
    const visible = heard.filter((row) => trusted.length === 0 || trusted.includes(row.from));
    const row = visible[Number.parseInt(event.slice("ar.install.".length), 10)];
    if (row !== undefined) await install(row.t256);
  } else return;
  await render();
});

await load();
await render();
