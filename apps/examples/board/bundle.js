import { announce, storage, ui } from "@twistedpear/miniapp-sdk";

await storage.bee.open();

let postCount = 0;
let status = "Publish a post to the board namespace.";

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        { id: "title", type: "text", props: { value: "Board" }, style: { fontSize: 20, fontWeight: "bold" } },
        { id: "body", type: "text", props: { value: status } },
        { id: "publish", type: "button", props: { label: "Publish post", event: "board.publish" } },
        { id: "refresh", type: "button", props: { label: "Refresh board", event: "board.refresh" } }
      ]
    }
  });
}

ui.onEvent(async ({ event }) => {
  if (event === "board.publish") {
    const key = `post:${Date.now()}`;
    const body = new TextEncoder().encode(`Post ${key}`);
    await storage.bee.put(key, body);
    await announce.publish(body, "board");
    postCount += 1;
    status = `Published ${postCount} post(s) locally`;
    await render();
    return;
  }

  if (event === "board.refresh") {
    const posts = await storage.bee.list({ limit: 10 });
    const announces = await announce.subscribe("board");
    status = `${posts.length} local post(s), ${announces.length} announce(s) on board`;
    await render();
  }
});

await render();
