import { ai, storage, ui } from "@twistedpear/miniapp-sdk";

// ai.chatStream yields host-coalesced deltas and still allows one in-flight request per app.
// The result paints as it arrives; the button remains disabled until the stream closes.

const CACHE_PREFIX = "phrase/";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const LANGUAGES = ["Spanish", "French", "German", "Japanese", "Swahili"];

let source = "";
let target = LANGUAGES[0];
let result = "";
let inFlight = false;
let status = "";

function cacheKey() {
  return `${CACHE_PREFIX}${target}/${source.trim().toLowerCase()}`;
}

async function translate() {
  if (source.trim().length === 0 || inFlight) return;

  const cached = await storage.kv.get(cacheKey());
  if (cached !== null) {
    result = decoder.decode(cached);
    status = "From the local phrasebook — no model call, works offline";
    return;
  }

  inFlight = true;
  status = "Asking the model…";
  result = "";
  await render();
  try {
    for await (const event of ai.chatStream({
      messages: [
        {
          role: "system",
          content: "Translate the user's phrase. Reply with the translation and nothing else."
        },
        { role: "user", content: `Into ${target}: ${source.trim()}` }
      ],
      maxTokens: 256
    })) {
      if (event.type === "delta") {
        result += event.delta;
        status = "Receiving translation…";
        await render();
      }
    }
    result = result.trim();
    await storage.kv.set(cacheKey(), encoder.encode(result));
    status = "Translated and saved to the phrasebook";
  } catch (error) {
    // No model route, no grant, or the host declined. The phrasebook still works.
    result = "";
    status = "Model unavailable — cached phrases still work";
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
          props: { value: "Pocket translator" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "source",
          type: "text-input",
          props: { value: source, placeholder: "Phrase", event: "pt.source" }
        },
        {
          id: "langs",
          type: "view",
          style: { flexDirection: "row", gap: 6 },
          children: LANGUAGES.map((lang) => ({
            id: `lang-${lang}`,
            type: "button",
            props: { label: lang === target ? `● ${lang}` : lang, event: `pt.lang.${lang}` }
          }))
        },
        {
          id: "go",
          type: "button",
          props: { label: inFlight ? "Working…" : "Translate", event: "pt.go"}
        },
        { id: "divider", type: "divider" },
        {
          id: "result",
          type: "text",
          props: { value: result || "—" },
          style: { fontSize: 24 }
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "pt.source" && typeof value === "string") source = value;
  else if (event.startsWith("pt.lang.")) target = event.slice("pt.lang.".length);
  else if (event === "pt.go") await translate();
  else return;
  await render();
});

await render();
