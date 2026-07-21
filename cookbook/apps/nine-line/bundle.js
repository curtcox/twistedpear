import { lxmf, storage, ui } from "@twistedpear/miniapp-sdk";

// Designed backwards from the link. On a LoRa interface at a few hundred bits per
// second, a 2 KiB message is roughly a minute of airtime. So the wire format is nine
// fixed positional fields joined by "|" — no keys, no JSON, no whitespace — and the
// whole report is refused if it exceeds 220 bytes.

const MAX_BYTES = 220;
const QUEUE_KEY = "queue";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const LINES = [
  "1 Location",
  "2 Callsign / frequency",
  "3 Precedence",
  "4 Equipment needed",
  "5 Number of people",
  "6 Security at site",
  "7 Marking method",
  "8 Nationality / status",
  "9 Terrain / hazards"
];

let recipient = "";
/** @type {string[]} */
let values = LINES.map(() => "");
/** @type {{ to: string; body: string; at: number }[]} */
let queue = [];
let status = "";

function wire() {
  return values.map((value) => value.replace(/\|/g, "/").trim()).join("|");
}

function byteLength() {
  return encoder.encode(wire()).length;
}

async function loadQueue() {
  const stored = await storage.kv.get(QUEUE_KEY);
  if (stored === null) return;
  try {
    queue = JSON.parse(decoder.decode(stored));
  } catch (error) {
    queue = [];
  }
}

async function saveQueue() {
  await storage.kv.set(QUEUE_KEY, encoder.encode(JSON.stringify(queue)));
}

async function send() {
  const body = wire();
  if (byteLength() > MAX_BYTES) {
    status = `${byteLength()} bytes — over the ${MAX_BYTES}-byte ceiling. Shorten a field.`;
    return;
  }
  if (recipient.trim().length === 0) {
    status = "Need a recipient";
    return;
  }
  try {
    await lxmf.send({ to: recipient.trim(), subject: "9L", body });
    status = `Sent ${byteLength()} bytes`;
  } catch (error) {
    // No link right now. Queue it — the platform will not retry for you, and the app
    // is not running when it is closed, so "later" means "next time someone opens this".
    queue = [...queue, { to: recipient.trim(), body, at: Date.now() }];
    await saveQueue();
    status = `No link. Queued — ${queue.length} report(s) waiting. Reopen this app when you have a link.`;
  }
}

async function flush() {
  const remaining = [];
  let sent = 0;
  for (const item of queue) {
    try {
      await lxmf.send({ to: item.to, subject: "9L", body: item.body });
      sent += 1;
    } catch (error) {
      remaining.push(item);
    }
  }
  queue = remaining;
  await saveQueue();
  status = `Flushed ${sent}, ${queue.length} still queued`;
}

async function render() {
  const bytes = byteLength();
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 10 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Nine line" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "recipient",
          type: "text-input",
          props: { value: recipient, placeholder: "Recipient address", event: "nl.to" }
        },
        {
          id: "lines",
          type: "scroll",
          children: [
            {
              id: "line-list",
              type: "list",
              style: { gap: 6 },
              children: LINES.map((label, index) => ({
                id: `line-${index}`,
                type: "text-input",
                props: { value: values[index], placeholder: label, event: `nl.field.${index}` }
              }))
            }
          ]
        },
        {
          id: "budget",
          type: "text",
          props: { value: `${bytes} / ${MAX_BYTES} bytes` },
          style: { fontWeight: "bold", color: bytes > MAX_BYTES ? "#cc2222" : undefined }
        },
        {
          id: "actions",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "send", type: "button", props: { label: "Send", event: "nl.send" } },
            {
              id: "flush",
              type: "button",
              props: { label: `Flush queue (${queue.length})`, event: "nl.flush", disabled: queue.length === 0 }
            }
          ]
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "nl.to" && typeof value === "string") recipient = value;
  else if (event.startsWith("nl.field.") && typeof value === "string") {
    values[Number.parseInt(event.slice("nl.field.".length), 10)] = value;
  } else if (event === "nl.send") await send();
  else if (event === "nl.flush") await flush();
  else return;
  await render();
});

await loadQueue();
await render();
