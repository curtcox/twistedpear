// DevStudio preview bundle generation is kept separate from the reader runtime
// so both pieces stay below the authored JavaScript size threshold.
globalThis.buildHandbookDevstudioBundle = (appletSource) => {
  const body = appletSource.replace(
    /^export\s+async\s+function\s+run\s*\(/m,
    "async function appletRun(",
  );
  return `import {
  ai,
  apps,
  announce,
  device,
  freenet,
  host,
  identity,
  lxmf,
  notify,
  peers,
  presence,
  relay,
  resource,
  share,
  storage,
  ui,
  workspace
} from "@twistedpear/miniapp-sdk";

${body}

function makeSdk() {
  return {
    identity,
    presence,
    relay,
    device,
    freenet,
    host,
    announce,
    lxmf,
    notify,
    peers,
    storage,
    resource,
    workspace,
    ui,
    share,
    apps,
    ai
  };
}

let reported = null;
await appletRun(makeSdk(), (result) => {
  reported = result;
});

await ui.render({
  root: {
    id: "root",
    type: "scroll",
    style: { padding: 12, gap: 8 },
    children: [
      {
        id: "result",
        type: "text",
        props: {
          value: reported
            ? \`\${reported.status.toUpperCase()}\\n\${reported.details}\`
            : "Applet finished without calling report()."
        }
      }
    ]
  }
});
`;
};
