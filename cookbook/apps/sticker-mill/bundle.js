import { workspace, apps, ui } from "@twistedpear/miniapp-sdk";

// The full apps:* loop in one file. Every call here — package, preview, publish — raises
// a host confirmation that this app cannot draw over, acknowledge, or suppress. That is
// deliberate: an app that can publish apps is an app that can publish anything.

const PROJECT = "mill/sticker";

let label = "Hello";
let colour = "#3355ff";
let lastPackage = null;
let status = "";
let busy = false;

function generatedBundle() {
  // The generated app is deliberately trivial and capability-free, so the app it
  // produces needs no grant from whoever installs it.
  return `import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 32, alignItems: "center", justifyContent: "center", backgroundColor: ${JSON.stringify(colour)} },
    children: [
      {
        id: "label",
        type: "text",
        props: { value: ${JSON.stringify(label)} },
        style: { fontSize: 40, fontWeight: "bold", color: "#ffffff" }
      }
    ]
  }
});
`;
}

function generatedManifest() {
  return {
    name: `sticker-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) || "blank"}`,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities: [],
    icon: null,
    minHostApi: "0.1.0"
  };
}

async function writeProject() {
  await workspace.write(`${PROJECT}/bundle.js`, generatedBundle());
  await workspace.write(`${PROJECT}/app.manifest.json`, JSON.stringify(generatedManifest(), null, 2));
}

async function preview() {
  busy = true;
  status = "Waiting for host confirmation…";
  await render();
  try {
    await writeProject();
    // One preview slot per host. This replaces whatever was previewing before.
    await apps.preview(PROJECT, generatedManifest(), []);
    status = "Previewing. Press Stop preview to get the slot back.";
  } catch (error) {
    status = `Preview declined or failed: ${error?.message ?? "denied"}`;
  } finally {
    busy = false;
  }
}

async function packageIt() {
  busy = true;
  status = "Waiting for host confirmation…";
  await render();
  try {
    await writeProject();
    lastPackage = await apps.packageProject(PROJECT, generatedManifest());
    status = `Packaged ${lastPackage.size} bytes`;
  } catch (error) {
    status = `Packaging declined or failed: ${error?.message ?? "denied"}`;
  } finally {
    busy = false;
  }
}

async function publish() {
  if (lastPackage === null) {
    status = "Package it first";
    return;
  }
  busy = true;
  status = "Waiting for host confirmation…";
  await render();
  try {
    await apps.publish(lastPackage.t256);
    status = "Published. Anyone who heard the announce can install it.";
  } catch (error) {
    status = `Publish declined or failed: ${error?.message ?? "denied"}`;
  } finally {
    busy = false;
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
          props: { value: "Sticker mill" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "label",
          type: "text-input",
          props: { value: label, placeholder: "Sticker text", event: "sm.label" }
        },
        {
          id: "colour",
          type: "text-input",
          props: { value: colour, placeholder: "#rrggbb", event: "sm.colour" }
        },
        {
          id: "swatch",
          type: "view",
          style: { backgroundColor: colour, minHeight: 60, alignItems: "center", justifyContent: "center" },
          children: [
            {
              id: "swatch-text",
              type: "text",
              props: { value: label },
              style: { fontSize: 24, fontWeight: "bold", color: "#ffffff" }
            }
          ]
        },
        {
          id: "actions",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: [
            { id: "preview", type: "button", props: { label: "Preview", event: "sm.preview", disabled: busy } },
            { id: "package", type: "button", props: { label: "Package", event: "sm.package", disabled: busy } },
            { id: "publish", type: "button", props: { label: "Publish", event: "sm.publish", disabled: busy } }
          ]
        },
        { id: "divider", type: "divider" },
        lastPackage === null
          ? { id: "no-package", type: "text", props: { value: "Nothing packaged yet" } }
          : { id: "t256", type: "qr-code", props: { value: lastPackage.t256 } },
        {
          id: "t256-text",
          type: "text",
          props: { value: lastPackage === null ? "" : lastPackage.t256 },
          style: { fontSize: 11 }
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "sm.label" && typeof value === "string") label = value;
  else if (event === "sm.colour" && typeof value === "string") colour = value;
  else if (event === "sm.preview") await preview();
  else if (event === "sm.package") await packageIt();
  else if (event === "sm.publish") await publish();
  else return;
  await render();
});

await render();
