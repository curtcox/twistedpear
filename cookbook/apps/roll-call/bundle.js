import { identity, lxmf, storage, ui } from "@twistedpear/miniapp-sdk";

// Fan-out over unicast. There is no group messaging in v1, so "ask everyone" means
// N sends, and on a slow link N sends is a budget you have to think about.

const ROSTER_KEY = "roster";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const me = await identity.destinationHash();

/** @type {string[]} */
let roster = [];
/** @type {Map<string, string>} */
const answers = new Map();
let draft = "";
let status = "";

async function loadRoster() {
  const stored = await storage.kv.get(ROSTER_KEY);
  if (stored === null) return;
  try {
    roster = JSON.parse(decoder.decode(stored));
  } catch (error) {
    roster = [];
  }
}

async function saveRoster() {
  await storage.kv.set(ROSTER_KEY, encoder.encode(JSON.stringify(roster)));
}

async function callRoll() {
  answers.clear();
  status = `Calling ${roster.length}…`;
  for (const address of roster) {
    // Sequential on purpose. Firing all of these at once is the fastest way to meet
    // the 60-messages-per-second broker limit on a roster of any size.
    await lxmf.send({ to: address, subject: "roll-call/ask", body: "check in" });
  }
  status = `Asked ${roster.length}. Nobody has to answer, and some never will.`;
}

async function collect() {
  const messages = await lxmf.receive();
  for (const message of messages) {
    if (message.subject === "roll-call/ask") {
      await lxmf.send({ to: message.from, subject: "roll-call/here", body: "here" });
    } else if (message.subject === "roll-call/here") {
      answers.set(message.from, message.body);
    }
  }
  status = `${answers.size} of ${roster.length} have answered`;
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
          props: { value: "Roll call" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        { id: "me", type: "text", props: { value: `This app: ${me}` }, style: { fontSize: 12 } },
        {
          id: "add-row",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            {
              id: "draft",
              type: "text-input",
              props: { value: draft, placeholder: "Add an address", event: "rc.draft" }
            },
            { id: "add", type: "button", props: { label: "Add", event: "rc.add" } }
          ]
        },
        {
          id: "actions",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "call", type: "button", props: { label: "Call the roll", event: "rc.call" } },
            { id: "collect", type: "button", props: { label: "Collect", event: "rc.collect" } }
          ]
        },
        { id: "divider", type: "divider" },
        {
          id: "roster",
          type: "list",
          style: { gap: 4 },
          children: roster.map((address) => ({
            id: `row-${address}`,
            type: "text",
            props: {
              value: `${answers.has(address) ? "✓" : "…"} ${address.slice(0, 16)}…`
            }
          }))
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "rc.draft" && typeof value === "string") {
    draft = value;
  } else if (event === "rc.add") {
    if (draft.trim().length > 0) {
      roster = [...new Set([...roster, draft.trim()])];
      draft = "";
      await saveRoster();
    }
  } else if (event === "rc.call") {
    await callRoll();
  } else if (event === "rc.collect") {
    await collect();
  } else {
    return;
  }
  await render();
});

await loadRoster();
await render();
