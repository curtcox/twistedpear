// @ts-nocheck
import { identity, lxmf, storage, ui } from "@twistedpear/miniapp-sdk";

const me = await identity.destinationHash();
const savedPeer = await storage.kv.get("last-peer");
let peer = savedPeer === null ? "" : new TextDecoder().decode(savedPeer);
let inboxSummary = "No messages yet";

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        { id: "title", type: "text", props: { value: "Chat" }, style: { fontSize: 20, fontWeight: "bold" } },
        { id: "me", type: "text", props: { value: `Me: ${me}` } },
        {
          id: "peer-input",
          type: "text-input",
          props: { value: peer, placeholder: "Peer app id", event: "chat.peer" }
        },
        { id: "send", type: "button", props: { label: "Send hello", event: "chat.send" } },
        { id: "refresh", type: "button", props: { label: "Check inbox", event: "chat.refresh" } },
        { id: "inbox", type: "text", props: { value: inboxSummary } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "chat.peer" && typeof value === "string") {
    peer = value;
    await storage.kv.set("last-peer", new TextEncoder().encode(value));
    await render();
    return;
  }

  if (event === "chat.send") {
    if (peer.length === 0) {
      inboxSummary = "Set a peer app id first";
      await render();
      return;
    }

    await lxmf.send({ to: peer, subject: "hello", body: `Hi from ${me}` });
    inboxSummary = `Sent hello to ${peer}`;
    await render();
    return;
  }

  if (event === "chat.refresh") {
    const messages = await lxmf.receive();
    inboxSummary =
      messages.length === 0
        ? "Inbox empty"
        : messages.map((message) => `${message.from}: ${message.body}`).join("\n");
    await render();
  }
});

await render();
