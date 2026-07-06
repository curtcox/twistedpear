import { announce, storage, ui } from "@twistedpear/miniapp-sdk";

await storage.bee();
await announce.subscribe("board");

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Board" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "body", type: "text", props: { value: "Posts are announced and stored locally." } },
      { id: "publish", type: "button", props: { label: "Publish post", event: "board.publish" } }
    ]
  }
});
