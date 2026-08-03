// @ts-nocheck
import { ai, apps, share, ui, workspace } from "@twistedpear/miniapp-sdk";

// DevStudio — a mini-app development environment that is itself a mini-app.
// Projects live in the app workspace as `<project>/app.json` + source files.
// It can create, edit (directly or via AI), preview, package, publish, and
// install mini-apps — including other copies of DevStudio.

const HELLO_TEMPLATE = `import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Hello from DevStudio" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "body", type: "text", props: { value: "This app was built inside a mini-app." } }
    ]
  }
});
`;

const AI_SYSTEM_PROMPT =
  "You are a code assistant for TwistedPear mini-apps. Mini-apps are single-file " +
  "JavaScript bundles that may only import from \"@twistedpear/miniapp-sdk\" and render " +
  "a widget tree. The user gives you the current file and a requested change. Reply with " +
  "ONLY the complete replacement file content — no prose, no code fences.";

let projects = [];
let project = null;
let files = [];
let openFile = null;
let aiPrompt = "";
let aiProposal = null;
let aiProposalStreaming = false;
let lastPackage = null;
let lastPublish = null;
let installInput = "";
let importInput = "";
const HANDBOOK_HANDOFF_KIND = "tp.devstudio.workspace.v1";
let statusLine = "Create a project to get started.";
let previewRunning = false;

async function refreshProjects() {
  const all = await workspace.list();
  const names = new Set();
  for (const file of all) {
    const slash = file.path.indexOf("/");
    if (slash > 0) {
      names.add(file.path.slice(0, slash));
    }
  }

  projects = [...names].sort();
}

async function refreshFiles() {
  files = project === null ? [] : await workspace.list(`${project}/`);
}

async function readManifest() {
  const raw = await workspace.read(`${project}/app.json`);
  return JSON.parse(raw);
}

function widgetButton(id, label, event) {
  return { id, type: "button", props: { label, event } };
}

async function render() {
  const children = [
    { id: "title", type: "text", props: { value: "DevStudio" }, style: { fontSize: 24, fontWeight: "bold" } },
    { id: "status", type: "text", props: { value: statusLine } },
    { id: "sep0", type: "divider" },
    widgetButton("new-project", "New hello project", "ds.newproject")
  ];

  for (const name of projects) {
    children.push(widgetButton(`proj-${name}`, `${project === name ? "▶ " : ""}Project: ${name}`, "ds.openproject"));
  }

  if (project !== null) {
    children.push({ id: "sep1", type: "divider" });
    children.push({
      id: "files-title",
      type: "text",
      props: { value: `Files in ${project}` },
      style: { fontWeight: "bold" }
    });
    for (const file of files) {
      children.push(widgetButton(`open-${file.path}`, `${openFile === file.path ? "▶ " : ""}${file.path} (${file.size} B)`, "ds.openfile"));
    }
  }

  if (openFile !== null) {
    children.push({ id: "sep2", type: "divider" });
    children.push({
      id: "editor",
      type: "code-editor",
      props: { documentId: openFile, language: openFile.endsWith(".json") ? "json" : "javascript", event: "ds.edit" }
    });
    children.push({
      id: "ai-prompt",
      type: "text-input",
      props: { value: aiPrompt, placeholder: "Describe a change for the AI…", event: "ds.aiprompt" }
    });
    children.push(widgetButton("ai-run", "Ask AI to edit this file", "ds.airun"));
    if (aiProposal !== null) {
      children.push({
        id: "ai-proposal",
        type: "text",
        props: {
          value: `${aiProposalStreaming ? "AI proposal streaming" : "AI proposal"} (${aiProposal.length} chars):\n${aiProposal.slice(0, 400)}${aiProposal.length > 400 ? "…" : ""}`
        }
      });
      if (!aiProposalStreaming) {
        children.push(widgetButton("ai-apply", "Apply AI edit", "ds.aiapply"));
        children.push(widgetButton("ai-reject", "Reject AI edit", "ds.aireject"));
      }
    }
  }

  if (project !== null) {
    children.push({ id: "sep3", type: "divider" });
    children.push({ id: "run-title", type: "text", props: { value: "Run" }, style: { fontWeight: "bold" } });
    children.push(widgetButton("preview", "Preview app", "ds.preview"));
    if (previewRunning) {
      children.push(widgetButton("stop-preview", "Stop preview", "ds.stoppreview"));
    }

    children.push({ id: "sep4", type: "divider" });
    children.push({ id: "ship-title", type: "text", props: { value: "Ship" }, style: { fontWeight: "bold" } });
    children.push(widgetButton("package", "Package & sign", "ds.package"));
    if (lastPackage !== null) {
      children.push({
        id: "package-qr",
        type: "qr-code",
        props: { value: lastPackage.t256, caption: `${lastPackage.size} bytes — sha256 ${lastPackage.packageHash.slice(0, 16)}…` }
      });
      children.push(widgetButton("publish", "Publish to other users", "ds.publish"));
    }
    if (lastPublish !== null) {
      children.push({
        id: "publish-note",
        type: "text",
        props: { value: `Published v${lastPublish.version}. Share the QR/256t string above.` }
      });
    }
  }

  children.push({ id: "sep5", type: "divider" });
  children.push({ id: "install-title", type: "text", props: { value: "Install" }, style: { fontWeight: "bold" } });
  children.push({
    id: "install-input",
    type: "text-input",
    props: { value: installInput, placeholder: "Paste a 94-character 256t string", event: "ds.installinput" }
  });
  children.push(widgetButton("install", "Install app from 256t", "ds.install"));

  children.push({ id: "sep6", type: "divider" });
  children.push({
    id: "import-title",
    type: "text",
    props: { value: "Import Handbook applet" },
    style: { fontWeight: "bold" }
  });
  children.push({
    id: "import-input",
    type: "text-input",
    props: {
      value: importInput,
      placeholder: "Paste Handbook DevStudio handoff 256t",
      event: "ds.importinput"
    }
  });
  children.push(widgetButton("import-handoff", "Import from 256t", "ds.import"));

  await ui.render({
    root: { id: "root", type: "view", style: { padding: 16, gap: 8 }, children }
  });
}

async function setStatus(line) {
  statusLine = line;
  await render();
}

async function handleEvent({ nodeId, event, value }) {
  if (event === "ds.newproject") {
    const base = "hello-app";
    let name = base;
    let counter = 2;
    while (projects.includes(name)) {
      name = `${base}-${counter++}`;
    }

    await workspace.write(
      `${name}/app.json`,
      JSON.stringify({ name, version: "0.1.0", entry: "bundle.js", capabilities: [] }, null, 2)
    );
    await workspace.write(`${name}/bundle.js`, HELLO_TEMPLATE);
    await refreshProjects();
    project = name;
    await refreshFiles();
    openFile = `${name}/bundle.js`;
    await setStatus(`Created project ${name}.`);
    return;
  }

  if (event === "ds.openproject") {
    project = nodeId.slice("proj-".length);
    openFile = null;
    aiProposal = null;
    lastPackage = null;
    lastPublish = null;
    await refreshFiles();
    await setStatus(`Opened project ${project}.`);
    return;
  }

  if (event === "ds.openfile") {
    openFile = nodeId.slice("open-".length);
    aiProposal = null;
    await setStatus(`Editing ${openFile}.`);
    return;
  }

  if (event === "ds.edit" && value && Number.isSafeInteger(value.baseLength) && Array.isArray(value.edits)) {
    await workspace.patch(value.documentId, value.baseLength, value.edits);
    await refreshFiles();
    return;
  }

  if (event === "ds.aiprompt" && typeof value === "string") {
    aiPrompt = value;
    return;
  }

  if (event === "ds.airun") {
    if (openFile === null || aiPrompt.length === 0) {
      await setStatus("Open a file and describe a change first.");
      return;
    }

    aiProposal = "";
    aiProposalStreaming = true;
    await setStatus("AI edit is streaming…");
    try {
      const current = await workspace.read(openFile);
      let model = "host model";
      let lastRenderedLength = 0;
      for await (const response of ai.chatStream({
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: `File: ${openFile}\n\nCurrent content:\n${current}\n\nRequested change: ${aiPrompt}` }
        ]
      })) {
        if (response.type === "delta") {
          aiProposal += response.delta;
          if (aiProposal.length - lastRenderedLength >= 128) {
            lastRenderedLength = aiProposal.length;
            await render();
          }
        } else {
          model = response.response.model;
        }
      }
      aiProposalStreaming = false;
      await setStatus(`AI streamed an edit using ${model}. Review and apply or reject.`);
    } catch (error) {
      aiProposalStreaming = false;
      aiProposal = null;
      await setStatus(`AI request failed: ${error.message}`);
    }
    return;
  }

  if (event === "ds.aiapply") {
    if (openFile !== null && aiProposal !== null) {
      await workspace.write(openFile, aiProposal);
      aiProposal = null;
      await refreshFiles();
      await setStatus(`Applied AI edit to ${openFile}.`);
    }
    return;
  }

  if (event === "ds.aireject") {
    aiProposal = null;
    await setStatus("Rejected the AI edit.");
    return;
  }

  if (event === "ds.preview") {
    try {
      const manifest = await readManifest();
      await apps.preview(project, manifest, manifest.capabilities);
      previewRunning = true;
      await setStatus(`Previewing ${manifest.name}. The host shows it in the Dev preview panel.`);
    } catch (error) {
      await setStatus(`Preview failed: ${error.message}`);
    }
    return;
  }

  if (event === "ds.stoppreview") {
    await apps.stopPreview();
    previewRunning = false;
    await setStatus("Stopped the preview.");
    return;
  }

  if (event === "ds.package") {
    try {
      const manifest = await readManifest();
      lastPackage = await apps.packageProject(project, manifest);
      lastPublish = null;
      await setStatus(`Packaged ${manifest.name} v${manifest.version}. Scan or copy the 256t string.`);
    } catch (error) {
      await setStatus(`Packaging failed: ${error.message}`);
    }
    return;
  }

  if (event === "ds.publish") {
    if (lastPackage === null) {
      await setStatus("Package the project first.");
      return;
    }

    try {
      lastPublish = await apps.publish(lastPackage.t256);
      await setStatus(`Published v${lastPublish.version} to other users.`);
    } catch (error) {
      await setStatus(`Publish failed: ${error.message}`);
    }
    return;
  }

  if (event === "ds.installinput" && typeof value === "string") {
    installInput = value.trim();
    return;
  }

  if (event === "ds.importinput" && typeof value === "string") {
    importInput = value.trim();
    return;
  }

  if (event === "ds.import") {
    if (importInput.length !== 94) {
      await setStatus("Paste a 94-character Handbook handoff 256t string first.");
      return;
    }

    try {
      const raw = await share.get(importInput);
      if (typeof raw !== "string" || raw.length === 0) {
        await setStatus("Handoff not found in CAS.");
        return;
      }

      const payload = JSON.parse(raw);
      if (payload?.kind !== HANDBOOK_HANDOFF_KIND || !Array.isArray(payload.files)) {
        await setStatus("Not a Handbook DevStudio workspace handoff.");
        return;
      }

      for (const file of payload.files) {
        if (typeof file?.path !== "string" || typeof file?.content !== "string") {
          await setStatus("Handoff file entry was invalid.");
          return;
        }
        await workspace.write(file.path, file.content);
      }

      project = typeof payload.project === "string" ? payload.project : null;
      openFile = project === null ? null : `${project}/bundle.js`;
      aiProposal = null;
      lastPackage = null;
      lastPublish = null;
      await refreshProjects();
      if (project !== null) {
        await refreshFiles();
      }
      await setStatus(
        project === null
          ? "Imported Handbook handoff files."
          : `Imported Handbook project ${project}. Open bundle.js to edit or preview.`
      );
    } catch (error) {
      await setStatus(`Import failed: ${error.message}`);
    }
    return;
  }

  if (event === "ds.install") {
    if (installInput.length !== 94) {
      await setStatus("Paste a 94-character 256t string first.");
      return;
    }

    try {
      const result = await apps.install(installInput);
      await setStatus(
        `Installed ${result.appId} v${result.version} (${result.trusted ? "trusted publisher" : "UNTRUSTED publisher"}).`
      );
    } catch (error) {
      await setStatus(`Install failed: ${error.message}`);
    }
  }
}

ui.onEvent((event) => {
  void handleEvent(event).catch(async (error) => {
    await setStatus(`Error: ${error.message}`);
  });
});

await refreshProjects();
await render();
