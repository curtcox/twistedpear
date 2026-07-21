import { storage, ui } from "@twistedpear/miniapp-sdk";

// A ledger, not a balance. Every entry is appended and totals are derived on read,
// which is the only shape that survives an app being killed mid-write. It also means
// the Hyperbee history grows forever — and history counts against the byte quota.

const BEE = "ledger";
let bee = null;

/** @type {{ key: string; who: string; what: string; cents: number }[]} */
let entries = [];
let who = "";
let what = "";
let amount = "";
let status = "";

async function refresh() {
  const rows = await storage.bee.list(bee, { gte: "e/", lt: "e0", limit: 200 });
  entries = rows.map((row) => ({ key: row.key, ...row.value }));
}

function totals() {
  /** @type {Map<string, number>} */
  const byPerson = new Map();
  for (const entry of entries) {
    byPerson.set(entry.who, (byPerson.get(entry.who) ?? 0) + entry.cents);
  }
  const people = [...byPerson.keys()];
  const total = [...byPerson.values()].reduce((a, b) => a + b, 0);
  const fairShare = people.length === 0 ? 0 : Math.round(total / people.length);
  return { total, people, fairShare, byPerson };
}

function money(cents) {
  return `${(cents / 100).toFixed(2)}`;
}

async function add() {
  const cents = Math.round(Number.parseFloat(amount) * 100);
  if (!Number.isFinite(cents) || who.trim().length === 0) {
    status = "Need a name and an amount";
    return;
  }
  const key = `e/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await storage.bee.put(bee, key, { who: who.trim(), what: what.trim(), cents });
  what = "";
  amount = "";
  status = "Added";
  await refresh();
}

async function render() {
  const { total, people, fairShare, byPerson } = totals();
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Split the bill" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "who",
          type: "text-input",
          props: { value: who, placeholder: "Who paid", event: "bill.who" }
        },
        {
          id: "what",
          type: "text-input",
          props: { value: what, placeholder: "For what", event: "bill.what" }
        },
        {
          id: "amount",
          type: "text-input",
          props: { value: amount, placeholder: "Amount", event: "bill.amount" }
        },
        { id: "add", type: "button", props: { label: "Add", event: "bill.add" } },
        { id: "divider", type: "divider" },
        {
          id: "total",
          type: "text",
          props: { value: `Total ${money(total)} · ${people.length} people · ${money(fairShare)} each` },
          style: { fontWeight: "bold" }
        },
        {
          id: "settle",
          type: "list",
          style: { gap: 2 },
          children: people.map((person) => {
            const delta = (byPerson.get(person) ?? 0) - fairShare;
            const verdict = delta === 0 ? "square" : delta > 0 ? `is owed ${money(delta)}` : `owes ${money(-delta)}`;
            return {
              id: `settle-${person}`,
              type: "text",
              props: { value: `${person} ${verdict}` }
            };
          })
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "bill.who" && typeof value === "string") who = value;
  else if (event === "bill.what" && typeof value === "string") what = value;
  else if (event === "bill.amount" && typeof value === "string") amount = value;
  else if (event === "bill.add") await add();
  else return;
  await render();
});

bee = await storage.bee.open(BEE);
await refresh();
await render();
