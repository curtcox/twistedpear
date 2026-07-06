import { storage, ui } from "@twistedpear/miniapp-sdk";

await storage.kv.set("last-opened", new TextEncoder().encode(String(Date.now())));

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "File Drop" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "body", type: "text", props: { value: "Fetches shared resources through host budget checks." } },
      { id: "fetch", type: "button", props: { label: "Fetch offer", event: "resource.fetch" } }
    ]
  }
});
