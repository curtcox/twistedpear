// @ts-nocheck
import { peers, ui } from "@twistedpear/miniapp-sdk";

let handle = null;
let summary = null;
let status = "Invite or join a peer. Mechanism selection and confirmation happen in trusted host controls.";
let adapterDiagnostics = [];

async function render() {
  const details = summary === null ? [] : [
    { id: "label", type: "text", props: { value: `Peer: ${summary.displayLabel}` } },
    { id: "fingerprint", type: "text", props: { value: `Fingerprint: ${summary.fingerprint}` } },
    { id: "path", type: "text", props: { value: `Rendezvous: ${summary.rendezvous}; data path: ${summary.dataPlane}` } },
    { id: "disconnect", type: "button", props: { label: "Disconnect", event: "peer.disconnect" } }
  ];
  const diagnostics = adapterDiagnostics.map((entry) => ({ id: `diag-${entry.kind}`, type: "text", props: { value: `${entry.kind}: ${entry.availability.state}${entry.availability.reason ? ` — ${entry.availability.reason}` : ""}` }, style: { fontSize: 12 } }));
  await ui.render({ root: { id: "root", type: "view", style: { padding: 16, gap: 12 }, children: [
    { id: "title", type: "text", props: { value: "Peer Link" }, style: { fontSize: 20, fontWeight: "bold" } },
    { id: "status", type: "text", props: { value: status } },
    { id: "invite", type: "button", props: { label: "Invite a peer", event: "peer.invite" } },
    { id: "join", type: "button", props: { label: "Join a peer", event: "peer.join" } },
    { id: "manual-invite", type: "button", props: { label: "Invite with full manual code", event: "peer.invite.manual" } },
    { id: "qr-invite", type: "button", props: { label: "Invite with QR", event: "peer.invite.qr" } },
    ...details,
    { id: "diagnostics-title", type: "text", props: { value: "Adapter diagnostics" }, style: { fontWeight: "bold" } },
    { id: "diagnostics-refresh", type: "button", props: { label: "Refresh diagnostics", event: "peer.diagnostics" } },
    ...diagnostics
  ] } });
}

async function connect(mode, mechanisms = "any") {
  status = "Waiting for host confirmation…"; await render();
  try {
    handle = await peers[mode]({ purpose: "Connect through Peer Link", mechanisms });
    summary = await peers.info(handle);
    status = "Connected";
  } catch (error) {
    status = `Connection did not complete: ${error instanceof Error ? error.message : "unknown error"}`;
  }
  await render();
}

ui.onEvent(async ({ event }) => {
  if (event === "peer.invite") await connect("request");
  if (event === "peer.join") await connect("listen");
  if (event === "peer.invite.manual") await connect("request", ["manual"]);
  if (event === "peer.invite.qr") await connect("request", ["qr"]);
  if (event === "peer.diagnostics") { adapterDiagnostics = await peers.diagnostics(); await render(); }
  if (event === "peer.disconnect" && handle !== null) { await peers.close(handle); handle = null; summary = null; status = "Disconnected"; await render(); }
});

try { adapterDiagnostics = await peers.diagnostics(); } catch {}
await render();
