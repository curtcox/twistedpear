import { identity, lxmf, ui } from "@twistedpear/miniapp-sdk";

// identity.sign happens in the broker. The private key never enters the sandbox, which
// is why this app can be trusted with a signature and not with a key.
//
// What the signature proves: this app, on this host, produced these bytes. What it does
// not prove: that the person holding the host is who you think, or that the note is true.

const me = await identity.destinationHash();

let peer = "";
let note = "";
let status = "";
/** @type {{ from: string; body: string; signature: string }[]} */
let received = [];

async function drop() {
  if (peer.trim().length === 0 || note.trim().length === 0) {
    status = "Need a recipient and a note";
    return;
  }
  const payload = note.trim();
  const signature = await identity.sign(new TextEncoder().encode(payload));
  const envelope = JSON.stringify({
    from: me,
    body: payload,
    signature: Array.from(signature)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  });
  await lxmf.send({ to: peer.trim(), subject: "dead-drop/note", body: envelope });
  note = "";
  status = `Dropped ${envelope.length} bytes`;
}

async function collect() {
  const messages = await lxmf.receive();
  received = messages
    .filter((message) => message.subject === "dead-drop/note")
    .map((message) => {
      try {
        const parsed = JSON.parse(message.body);
        return { from: parsed.from, body: parsed.body, signature: parsed.signature };
      } catch (error) {
        return { from: message.from, body: "(unreadable envelope)", signature: "" };
      }
    });
  status = `${received.length} notes in the drop`;
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
          props: { value: "Dead drop" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        { id: "me", type: "text", props: { value: `Signing as ${me}` }, style: { fontSize: 11 } },
        {
          id: "peer",
          type: "text-input",
          props: { value: peer, placeholder: "Recipient address", event: "dd.peer" }
        },
        {
          id: "note",
          type: "text-input",
          props: { value: note, placeholder: "Short note", event: "dd.note", multiline: true },
          style: { minHeight: 96 }
        },
        {
          id: "actions",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "drop", type: "button", props: { label: "Drop it", event: "dd.drop" } },
            { id: "collect", type: "button", props: { label: "Collect", event: "dd.collect" } }
          ]
        },
        { id: "divider", type: "divider" },
        {
          id: "received",
          type: "list",
          style: { gap: 8 },
          children: received.map((item, index) => ({
            id: `note-${index}`,
            type: "view",
            style: { gap: 2 },
            children: [
              { id: `body-${index}`, type: "text", props: { value: item.body } },
              {
                id: `sig-${index}`,
                type: "text",
                props: { value: `signed ${item.signature.slice(0, 16)}… by ${item.from.slice(0, 16)}…` },
                style: { fontSize: 11 }
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
  if (event === "dd.peer" && typeof value === "string") peer = value;
  else if (event === "dd.note" && typeof value === "string") note = value;
  else if (event === "dd.drop") await drop();
  else if (event === "dd.collect") await collect();
  else return;
  await render();
});

await render();
