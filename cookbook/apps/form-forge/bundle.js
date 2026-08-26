import { ai, workspace, apps, ui } from "@twistedpear/miniapp-sdk";

// A model designs the form; this app writes the code. The model never emits JavaScript —
// it emits a field list, which is validated, and the code generator is ordinary local
// code. Letting a model write the bundle directly would put unreviewed code inside a
// package this device signs.

const PROJECT = "forge/current";
const TYPES = ["text", "number", "switch"];
const MAX_FIELDS = 12;

let brief = "";
/** @type {{ name: string; label: string; type: string }[]} */
let fields = [];
let lastPackage = null;
let inFlight = false;
let status = "";

function validateFields(candidate) {
  if (!Array.isArray(candidate) || candidate.length === 0 || candidate.length > MAX_FIELDS) return null;
  const clean = [];
  for (const item of candidate) {
    if (typeof item?.label !== "string" || item.label.length === 0 || item.label.length > 60) return null;
    if (!TYPES.includes(item?.type)) return null;
    const name = item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
    if (name.length === 0) return null;
    clean.push({ name, label: item.label, type: item.type });
  }
  return clean;
}

async function design() {
  if (brief.trim().length === 0 || inFlight) return;
  inFlight = true;
  status = "Designing the form…";
  await render();
  try {
    let streamed = "";
    for await (const event of ai.chatStream({
      messages: [
        {
          role: "system",
          content:
            `Return a JSON array of at most ${MAX_FIELDS} form fields. Each element has ` +
            `"label" (string) and "type" (one of ${TYPES.join(", ")}). No prose.`
        },
        { role: "user", content: brief.trim() }
      ],
      maxTokens: 512,
      temperature: 0
    })) {
      if (event.type === "delta") {
        streamed += event.delta;
        status = `Receiving form design… ${streamed.length} characters`;
        await render();
      }
    }
    let candidate = null;
    try {
      candidate = JSON.parse(streamed.trim().replace(/^```(json)?|```$/g, ""));
    } catch (error) {
      candidate = null;
    }
    const clean = validateFields(candidate);
    if (clean === null) {
      status = "The model's design failed validation — try rewording the brief";
    } else {
      fields = clean;
      status = `Designed ${clean.length} fields. Review them before packaging.`;
    }
  } catch (error) {
    status = "Model unavailable";
  } finally {
    inFlight = false;
  }
}

function generatedBundle() {
  return `import { storage, ui } from "@twistedpear/miniapp-sdk";

const FIELDS = ${JSON.stringify(fields, null, 2)};
const decoder = new TextDecoder();
const encoder = new TextEncoder();
let values = {};

const stored = await storage.kv.get("form");
if (stored !== null) {
  try { values = JSON.parse(decoder.decode(stored)); } catch (error) { values = {}; }
}

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 10 },
      children: FIELDS.map((field) =>
        field.type === "switch"
          ? {
              id: "row-" + field.name,
              type: "view",
              style: { flexDirection: "row", gap: 8 },
              children: [
                { id: "label-" + field.name, type: "text", props: { value: field.label } },
                { id: field.name, type: "switch", props: { value: values[field.name] === true, event: field.name, accessibilityLabel: field.label } }
              ]
            }
          : { id: field.name, type: "text-input", props: { value: values[field.name] ?? "", placeholder: field.label, event: field.name } }
      )
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  values[event] = value;
  await storage.kv.set("form", encoder.encode(JSON.stringify(values)));
  await render();
});

await render();
`;
}

function generatedManifest() {
  return {
    name: `form-${brief.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) || "blank"}`,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities: ["storage:kv"],
    icon: null,
    minHostApi: "0.1.0"
  };
}

async function packageIt() {
  if (fields.length === 0) {
    status = "Design a form first";
    return;
  }
  await workspace.write(`${PROJECT}/bundle.js`, generatedBundle());
  await workspace.write(`${PROJECT}/app.manifest.json`, JSON.stringify(generatedManifest(), null, 2));
  status = "Waiting for host confirmation…";
  await render();
  try {
    lastPackage = await apps.packageProject(PROJECT, generatedManifest());
    status = `Packaged ${lastPackage.size} bytes`;
  } catch (error) {
    status = `Declined or failed: ${error?.message ?? "denied"}`;
  }
}

async function preview() {
  if (fields.length === 0) return;
  await workspace.write(`${PROJECT}/bundle.js`, generatedBundle());
  await workspace.write(`${PROJECT}/app.manifest.json`, JSON.stringify(generatedManifest(), null, 2));
  try {
    await apps.preview(PROJECT, generatedManifest(), ["storage:kv"]);
    status = "Previewing the generated app";
  } catch (error) {
    status = `Preview declined: ${error?.message ?? "denied"}`;
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
          props: { value: "Form forge" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "brief",
          type: "text-input",
          props: { value: brief, placeholder: "e.g. a trailhead sign-in sheet", event: "ff.brief" }
        },
        {
          id: "design",
          type: "button",
          props: { label: inFlight ? "Working…" : "Design it", event: "ff.design"}
        },
        { id: "divider", type: "divider" },
        {
          id: "fields",
          type: "list",
          style: { gap: 2 },
          children: fields.map((field) => ({
            id: `fld-${field.name}`,
            type: "text",
            props: { value: `${field.label} (${field.type})` }
          }))
        },
        {
          id: "actions",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "preview", type: "button", props: { label: "Preview", event: "ff.preview" } },
            { id: "package", type: "button", props: { label: "Package", event: "ff.package" } }
          ]
        },
        {
          id: "t256",
          type: "text",
          props: { value: lastPackage === null ? "" : lastPackage.t256 },
          style: { fontSize: 12 }
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "ff.brief" && typeof value === "string") brief = value;
  else if (event === "ff.design") await design();
  else if (event === "ff.preview") await preview();
  else if (event === "ff.package") await packageIt();
  else return;
  await render();
});

await render();
