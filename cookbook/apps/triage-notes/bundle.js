import { ai, storage, ui } from "@twistedpear/miniapp-sdk";

// The rule this app exists to demonstrate: a model's output is untrusted input. It is
// parsed, validated field by field, and only then written to the store. An app that
// JSON.parses a model reply straight into its database has a data-integrity bug waiting.

const BEE = "records";
let bee = null;

const FIELDS = ["subject", "location", "severity", "action"];
const SEVERITIES = ["low", "medium", "high"];

let dictation = "";
/** @type {Record<string, string> | null} */
let parsed = null;
/** @type {{ key: string; record: Record<string, string> }[]} */
let records = [];
let inFlight = false;
let status = "";

async function refresh() {
  const rows = await storage.bee.list(bee, { gte: "r/", lt: "r0", limit: 50 });
  records = rows.map((row) => ({ key: row.key, record: row.value }));
}

function validate(candidate) {
  if (candidate === null || typeof candidate !== "object") return null;
  /** @type {Record<string, string>} */
  const clean = {};
  for (const field of FIELDS) {
    const value = candidate[field];
    if (typeof value !== "string" || value.length === 0 || value.length > 200) return null;
    clean[field] = value;
  }
  if (!SEVERITIES.includes(clean.severity.toLowerCase())) return null;
  clean.severity = clean.severity.toLowerCase();
  return clean;
}

async function structure() {
  if (dictation.trim().length === 0 || inFlight) return;
  inFlight = true;
  status = "Structuring…";
  await render();
  try {
    const reply = await ai.chat({
      messages: [
        {
          role: "system",
          content:
            `Return a single JSON object with exactly these keys: ${FIELDS.join(", ")}. ` +
            `severity must be one of: ${SEVERITIES.join(", ")}. No prose, no code fence.`
        },
        { role: "user", content: dictation.trim() }
      ],
      maxTokens: 512,
      temperature: 0
    });

    let candidate = null;
    try {
      candidate = JSON.parse(reply.content.trim().replace(/^```(json)?|```$/g, ""));
    } catch (error) {
      candidate = null;
    }

    parsed = validate(candidate);
    status = parsed === null ? "Model returned something unusable — edit and retry" : "Review before filing";
  } catch (error) {
    status = "Model unavailable";
  } finally {
    inFlight = false;
  }
}

async function file() {
  if (parsed === null) return;
  const reverse = 10_000_000_000_000 - Date.now();
  await storage.bee.put(bee, `r/${String(reverse).padStart(14, "0")}`, parsed);
  parsed = null;
  dictation = "";
  await refresh();
  status = "Filed";
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
          props: { value: "Triage notes" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "dictation",
          type: "text-input",
          props: { value: dictation, placeholder: "Type it how you'd say it", event: "tn.text", multiline: true },
          style: { minHeight: 100 }
        },
        {
          id: "structure",
          type: "button",
          props: { label: inFlight ? "Working…" : "Structure", event: "tn.structure", disabled: inFlight }
        },
        { id: "divider", type: "divider" },
        {
          id: "review",
          type: "list",
          style: { gap: 2 },
          children:
            parsed === null
              ? [{ id: "no-review", type: "text", props: { value: "Nothing to review" } }]
              : FIELDS.map((field) => ({
                  id: `f-${field}`,
                  type: "text",
                  props: { value: `${field}: ${parsed[field]}` }
                }))
        },
        {
          id: "file",
          type: "button",
          props: { label: "File it", event: "tn.file", disabled: parsed === null }
        },
        { id: "divider2", type: "divider" },
        {
          id: "records",
          type: "list",
          style: { gap: 2 },
          children: records.map((row) => ({
            id: `rec-${row.key}`,
            type: "text",
            props: { value: `[${row.record.severity}] ${row.record.subject} — ${row.record.location}` },
            style: { fontSize: 13 }
          }))
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "tn.text" && typeof value === "string") dictation = value;
  else if (event === "tn.structure") await structure();
  else if (event === "tn.file") await file();
  else return;
  await render();
});

bee = await storage.bee.open(BEE);
await refresh();
await render();
