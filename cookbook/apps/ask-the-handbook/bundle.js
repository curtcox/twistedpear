import { ai, workspace, ui } from "@twistedpear/miniapp-sdk";

// Retrieval, at the scale a mini-app can actually afford. There is no vector store and
// no embedding call — just a keyword scan over local files and a hard cap on how much
// text goes into the prompt. maxTokens is clamped to 8,192 host-side regardless.

const DIR = "docs";
const CONTEXT_CHAR_BUDGET = 6000;

/** @type {string[]} */
let files = [];
let question = "";
let answer = "";
let usedFiles = [];
let inFlight = false;
let status = "";

async function refresh() {
  try {
    files = (await workspace.list(DIR)).map((file) => file.path);
  } catch (error) {
    files = [];
    status = `Put text files in the workspace under ${DIR}/ first`;
  }
}

function score(text, terms) {
  const lower = text.toLowerCase();
  return terms.reduce((total, term) => total + (lower.split(term).length - 1), 0);
}

async function gatherContext() {
  const terms = question
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);
  if (terms.length === 0) return { context: "", used: [] };

  const scored = [];
  for (const name of files) {
    const path = name.includes("/") ? name : `${DIR}/${name}`;
    const text = await workspace.read(path);
    scored.push({ path, text, score: score(text, terms) });
  }
  scored.sort((a, b) => b.score - a.score);

  let context = "";
  const used = [];
  for (const file of scored) {
    if (file.score === 0) break;
    const remaining = CONTEXT_CHAR_BUDGET - context.length;
    if (remaining <= 0) break;
    context += `\n\n# ${file.path}\n${file.text.slice(0, remaining)}`;
    used.push(file.path);
  }
  return { context, used };
}

async function ask() {
  if (question.trim().length === 0 || inFlight) return;
  inFlight = true;
  status = "Reading local files…";
  await render();

  const { context, used } = await gatherContext();
  usedFiles = used;
  if (context.length === 0) {
    answer = "";
    status = "Nothing in the workspace matched that question";
    inFlight = false;
    await render();
    return;
  }

  status = "Asking the model…";
  await render();
  try {
    const reply = await ai.chat({
      messages: [
        {
          role: "system",
          content:
            "Answer only from the supplied documents. If they do not answer the question, say so."
        },
        { role: "user", content: `Documents:${context}\n\nQuestion: ${question}` }
      ],
      maxTokens: 1024
    });
    answer = reply.message.content.trim();
    status = `Answered from ${used.length} file(s)`;
  } catch (error) {
    status = "Model unavailable";
  } finally {
    inFlight = false;
  }
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
          props: { value: "Ask the handbook" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "question",
          type: "text-input",
          props: { value: question, placeholder: "Ask about your documents", event: "ah.q" }
        },
        {
          id: "ask",
          type: "button",
          props: { label: inFlight ? "Working…" : "Ask", event: "ah.ask"}
        },
        { id: "divider", type: "divider" },
        {
          id: "answer",
          type: "scroll",
          children: [{ id: "answer-text", type: "text", props: { value: answer || "—" } }]
        },
        {
          id: "sources",
          type: "text",
          props: { value: usedFiles.length === 0 ? "" : `Sources: ${usedFiles.join(", ")}` },
          style: { fontSize: 12 }
        },
        {
          id: "status",
          type: "text",
          props: { value: `${status} · ${files.length} local files` },
          style: { fontSize: 12 }
        }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "ah.q" && typeof value === "string") question = value;
  else if (event === "ah.ask") await ask();
  else return;
  await render();
});

await refresh();
await render();
