import { storage, ui } from "@twistedpear/miniapp-sdk";

// Small structured state in storage:kv. KV takes bytes, not objects, so the app owns
// its own encoding — here JSON, which is fine at this size and terrible at a megabyte.

const KEY = "streak-state";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** @type {{ days: string[] }} */
let state = { days: [] };
let status = "";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function previousDay(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function currentStreak() {
  const marked = new Set(state.days);
  let day = today();
  if (!marked.has(day)) day = previousDay(day);
  let count = 0;
  while (marked.has(day)) {
    count += 1;
    day = previousDay(day);
  }
  return count;
}

async function load() {
  const stored = await storage.kv.get(KEY);
  if (stored === null) return;
  try {
    const parsed = JSON.parse(decoder.decode(stored));
    if (Array.isArray(parsed.days)) state = { days: parsed.days };
  } catch (error) {
    // Corrupt or hand-edited state. Start over rather than crash on launch.
    status = "Stored state was unreadable; starting fresh";
  }
}

async function persist() {
  // Keep the document bounded — a year of dates is about 4 KiB, and the app's whole
  // KV quota is shared with everything else it ever stores.
  state.days = [...new Set(state.days)].sort().slice(-366);
  await storage.kv.set(KEY, encoder.encode(JSON.stringify(state)));
}

async function render() {
  const done = state.days.includes(today());
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Streak tracker" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "streak",
          type: "text",
          props: { value: `${currentStreak()} day streak` },
          style: { fontSize: 32, fontWeight: "bold" }
        },
        {
          id: "today",
          type: "switch",
          props: { value: done, label: `Done today (${today()})`, event: "streak.toggle" }
        },
        { id: "divider", type: "divider" },
        {
          id: "recent",
          type: "list",
          style: { gap: 2 },
          children: state.days
            .slice(-10)
            .reverse()
            .map((day) => ({
              id: `day-${day}`,
              type: "text",
              props: { value: `✓ ${day}` },
              style: { fontSize: 13 }
            }))
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event !== "streak.toggle") return;
  const day = today();
  state.days = value === true ? [...state.days, day] : state.days.filter((d) => d !== day);
  await persist();
  status = "Saved";
  await render();
});

await load();
await render();
