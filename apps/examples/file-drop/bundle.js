import { resource, storage, ui } from "@twistedpear/miniapp-sdk";

let status = "Tap fetch to load offer:demo through host budget checks.";

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        { id: "title", type: "text", props: { value: "File Drop" }, style: { fontSize: 20, fontWeight: "bold" } },
        { id: "body", type: "text", props: { value: status } },
        { id: "fetch", type: "button", props: { label: "Fetch offer", event: "resource.fetch" } }
      ]
    }
  });
}

ui.onEvent(async ({ event }) => {
  if (event !== "resource.fetch") {
    return;
  }

  try {
    const bytes = await resource.fetch({ resourceId: "offer:demo", budgetBytes: 4096 });
    await storage.kv.set("last-fetch", bytes);
    status = `Fetched ${bytes.length} bytes for offer:demo`;
  } catch (error) {
    status = error instanceof Error ? error.message : "Fetch failed";
  }

  await render();
});

await render();
