import { share, workspace, ui } from "@twistedpear/miniapp-sdk";

// The cache is the whole point. Fetching costs airtime; reading a workspace file costs
// nothing. An app that re-fetches on every launch is an app that is rude on a radio.

const CACHE_DIR = "zines";
let identifier = "";
/** @type {string[]} */
let cached = [];
/** @type {string[]} */
let pages = [];
let pageIndex = 0;
let status = "";

async function refreshCache() {
  try {
    cached = (await workspace.list(CACHE_DIR)).map((file) => file.path);
  } catch (error) {
    cached = [];
  }
}

function cachePath(t256) {
  return `${CACHE_DIR}/${t256.slice(0, 24)}.txt`;
}

async function open(t256) {
  const path = cachePath(t256);
  if (cached.includes(path) || cached.includes(path.split("/").pop())) {
    pages = (await workspace.read(path)).split("\n---\n");
    pageIndex = 0;
    status = "Read from cache — no bytes over the air";
    return;
  }

  status = "Fetching…";
  await render();
  const text = await share.get(t256);
  if (text === null) {
    status = "Not found — no locator announce was heard";
    return;
  }
  // 256 KiB per workspace file. A zine that does not fit is a zine that needs splitting.
  if (text.length > 256 * 1024) {
    status = "Too large for one workspace file (256 KiB limit)";
    return;
  }
  await workspace.write(path, text);
  await refreshCache();
  pages = text.split("\n---\n");
  pageIndex = 0;
  status = `Fetched and cached ${text.length} bytes`;
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
          props: { value: "Zine reader" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "id",
          type: "text-input",
          props: { value: identifier, placeholder: "256t identifier", event: "zr.id" }
        },
        { id: "open", type: "button", props: { label: "Open", event: "zr.open" } },
        {
          id: "cached",
          type: "list",
          style: { gap: 2 },
          children: cached.map((name, index) => ({
            id: `cached-${index}`,
            type: "button",
            props: { label: `Cached: ${name}`, event: `zr.cached.${index}` }
          }))
        },
        { id: "divider", type: "divider" },
        {
          id: "page",
          type: "scroll",
          children: [
            {
              id: "page-text",
              type: "text",
              props: { value: pages[pageIndex] ?? "Nothing open" }
            }
          ]
        },
        {
          id: "nav",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "prev", type: "button", props: { label: "◀", event: "zr.prev" } },
            {
              id: "pageno",
              type: "text",
              props: { value: pages.length === 0 ? "—" : `${pageIndex + 1} / ${pages.length}` }
            },
            { id: "next", type: "button", props: { label: "▶", event: "zr.next" } }
          ]
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "zr.id" && typeof value === "string") identifier = value;
  else if (event === "zr.open") await open(identifier.trim());
  else if (event.startsWith("zr.cached.")) {
    const name = cached[Number.parseInt(event.slice("zr.cached.".length), 10)];
    pages = (await workspace.read(name.includes("/") ? name : `${CACHE_DIR}/${name}`)).split("\n---\n");
    pageIndex = 0;
    status = "Read from cache";
  } else if (event === "zr.prev") pageIndex = Math.max(0, pageIndex - 1);
  else if (event === "zr.next") pageIndex = Math.min(pages.length - 1, pageIndex + 1);
  else return;
  await render();
});

await refreshCache();
await render();
