import { lxmf, storage, ui } from "@twistedpear/miniapp-sdk";

// Store-and-forward is the app's problem, not the platform's. Mini-apps do not run in
// the background, so nothing is delivered while this app is closed, and nothing retries
// on its own. Everything that has to survive that lives in storage:kv.

const LOG_KEY = "net-log";
const OUTBOX_KEY = "outbox";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** @type {{ call: string; at: number; note: string }[]} */
let checkins = [];
/** @type {{ to: string; body: string }[]} */
let outbox = [];
let call = "";
let note = "";
let netControl = "";
let status = "";

async function loadAll() {
  const log = await storage.kv.get(LOG_KEY);
  if (log !== null) {
    try {
      checkins = JSON.parse(decoder.decode(log));
    } catch (error) {
      checkins = [];
    }
  }
  const box = await storage.kv.get(OUTBOX_KEY);
  if (box !== null) {
    try {
      outbox = JSON.parse(decoder.decode(box));
    } catch (error) {
      outbox = [];
    }
  }
}

async function persist() {
  checkins = checkins.slice(-500);
  await storage.kv.set(LOG_KEY, encoder.encode(JSON.stringify(checkins)));
  await storage.kv.set(OUTBOX_KEY, encoder.encode(JSON.stringify(outbox)));
}

async function checkIn() {
  if (call.trim().length === 0) return;
  checkins = [...checkins, { call: call.trim().toUpperCase(), at: Date.now(), note: note.trim() }];
  call = "";
  note = "";
  await persist();
  status = `${checkins.length} check-ins logged locally`;
}

function roster() {
  return checkins.map((row) => `${row.call}${row.note ? ` (${row.note})` : ""}`).join(", ");
}

async function fileRoster() {
  if (netControl.trim().length === 0) {
    status = "Set net control's address first";
    return;
  }
  const body = `NET ${new Date().toISOString().slice(0, 16)} ${checkins.length}: ${roster()}`;
  try {
    await lxmf.send({ to: netControl.trim(), subject: "net/roster", body });
    status = `Filed ${body.length} bytes to net control`;
  } catch (error) {
    outbox = [...outbox, { to: netControl.trim(), body }];
    await persist();
    status = `No link. Held in the outbox (${outbox.length}).`;
  }
}

async function drain() {
  const remaining = [];
  let sent = 0;
  for (const item of outbox) {
    try {
      await lxmf.send({ to: item.to, subject: "net/roster", body: item.body });
      sent += 1;
    } catch (error) {
      remaining.push(item);
    }
  }
  outbox = remaining;
  await persist();
  status = `Sent ${sent}; ${outbox.length} still held`;
}

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 10 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Net ledger" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "control",
          type: "text-input",
          props: { value: netControl, placeholder: "Net control address", event: "nl.control" }
        },
        { id: "divider", type: "divider" },
        {
          id: "call",
          type: "text-input",
          props: { value: call, placeholder: "Callsign", event: "nl.call" }
        },
        {
          id: "note",
          type: "text-input",
          props: { value: note, placeholder: "Traffic / comment", event: "nl.note" }
        },
        { id: "checkin", type: "button", props: { label: "Check in", event: "nl.checkin" } },
        { id: "divider2", type: "divider" },
        {
          id: "roster",
          type: "scroll",
          children: [
            {
              id: "roster-list",
              type: "list",
              style: { gap: 2 },
              children: [...checkins]
                .reverse()
                .slice(0, 40)
                .map((row, index) => ({
                  id: `ci-${index}`,
                  type: "text",
                  props: {
                    value: `${new Date(row.at).toLocaleTimeString()} ${row.call} ${row.note}`
                  },
                  style: { fontSize: 13 }
                }))
            }
          ]
        },
        {
          id: "actions",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "file", type: "button", props: { label: "File roster", event: "nl.file" } },
            {
              id: "drain",
              type: "button",
              props: { label: `Outbox (${outbox.length})`, event: "nl.drain", disabled: outbox.length === 0 }
            }
          ]
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "nl.control" && typeof value === "string") netControl = value;
  else if (event === "nl.call" && typeof value === "string") call = value;
  else if (event === "nl.note" && typeof value === "string") note = value;
  else if (event === "nl.checkin") await checkIn();
  else if (event === "nl.file") await fileRoster();
  else if (event === "nl.drain") await drain();
  else return;
  await render();
});

await loadAll();
await render();
