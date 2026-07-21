import { identity, lxmf, ui } from "@twistedpear/miniapp-sdk";

// LXMF has no sessions. Correlating a reply to a request is the app's job, and the
// only tool is something you put in the body yourself. Here it is a nonce.

const me = await identity.destinationHash();

let peer = "";
/** @type {Map<string, number>} */
const outstanding = new Map();
/** @type {{ nonce: string; ms: number | null }[]} */
let results = [];
let status = "Idle";

function nonce() {
  return Math.random().toString(36).slice(2, 10);
}

async function ping() {
  if (peer.trim().length === 0) {
    status = "Enter a peer address first";
    return;
  }
  const id = nonce();
  outstanding.set(id, Date.now());
  results = [{ nonce: id, ms: null }, ...results].slice(0, 10);
  status = `Sent ping ${id}`;
  await lxmf.send({ to: peer.trim(), subject: "signal-check/ping", body: id });
}

async function poll() {
  const messages = await lxmf.receive();
  for (const message of messages) {
    if (message.subject === "signal-check/ping") {
      // Someone is pinging us. Answer with the same nonce so they can match it.
      await lxmf.send({ to: message.from, subject: "signal-check/pong", body: message.body });
      continue;
    }
    if (message.subject !== "signal-check/pong") continue;
    const sentAt = outstanding.get(message.body);
    if (sentAt === undefined) continue;
    outstanding.delete(message.body);
    results = results.map((row) =>
      row.nonce === message.body ? { ...row, ms: Date.now() - sentAt } : row
    );
  }
  status = `Checked inbox · ${outstanding.size} still outstanding`;
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
          props: { value: "Signal check" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        { id: "me", type: "text", props: { value: `This app: ${me}` }, style: { fontSize: 12 } },
        {
          id: "peer",
          type: "text-input",
          props: { value: peer, placeholder: "Peer app address", event: "sc.peer" }
        },
        {
          id: "actions",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "ping", type: "button", props: { label: "Ping", event: "sc.ping" } },
            { id: "poll", type: "button", props: { label: "Check replies", event: "sc.poll" } }
          ]
        },
        { id: "divider", type: "divider" },
        {
          id: "results",
          type: "list",
          style: { gap: 2 },
          children: results.map((row) => ({
            id: `row-${row.nonce}`,
            type: "text",
            props: {
              value: row.ms === null ? `${row.nonce} … waiting` : `${row.nonce} — ${row.ms} ms`
            }
          }))
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } },
        {
          id: "caveat",
          type: "text",
          props: {
            value: "Round trip includes however long the app sat closed. There is no background delivery."
          },
          style: { fontSize: 12 }
        }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "sc.peer" && typeof value === "string") peer = value;
  else if (event === "sc.ping") await ping();
  else if (event === "sc.poll") await poll();
  else return;
  await render();
});

await render();
