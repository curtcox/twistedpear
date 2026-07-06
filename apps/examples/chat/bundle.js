import { identity, lxmf, storage, ui } from "@twistedpear/miniapp-sdk";

const me = await identity.destinationHash();
const lastPeer = await storage.kv.get("last-peer");

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Chat" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "me", type: "text", props: { value: `Me: ${me}` } },
      { id: "peer", type: "text", props: { value: `Last peer: ${lastPeer === null ? "none" : String(lastPeer)}` } },
      { id: "send", type: "button", props: { label: "Send hello", event: "chat.send" } }
    ]
  }
});

await lxmf.receive();
