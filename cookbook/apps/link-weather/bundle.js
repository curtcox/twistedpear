import { presence, host, peers, ui } from "@twistedpear/miniapp-sdk";

// Link Weather never implements a rendezvous mechanism itself. The trusted host owns
// permissions, invitation exchange, authentication, confirmation, and route setup; this
// app only asks which mechanisms exist and requests an opaque peer handle.

/** @typedef {"reticulum" | "qr" | "manual" | "audio" | "bluetooth" | "ntfy" | "local-peer-to-peer"} PeerDiscoveryKind */
/** @typedef {{ state: "available" | "permission-required" | "unsupported" | "offline" | "policy-disabled", reason?: string }} Availability */

/** @type {ReadonlyArray<readonly [PeerDiscoveryKind, string]>} */
const MECHANISMS = [
  ["reticulum", "Reticulum"],
  ["qr", "QR / camera"],
  ["manual", "Manual code"],
  ["audio", "Audio"],
  ["bluetooth", "Bluetooth"],
  ["ntfy", "ntfy"],
  ["local-peer-to-peer", "Local peer-to-peer"]
];

let snapshot = null;
let info = null;
/** @type {Awaited<ReturnType<typeof peers.diagnostics>>} */
let diagnostics = [];
/** @type {Array<{handle: Awaited<ReturnType<typeof peers.request>>, summary: Awaited<ReturnType<typeof peers.info>>}>} */
let connections = [];
let busy = false;
let status = "";

function errorMessage(error) {
  const code = typeof error?.code === "string" ? `${error.code}: ` : "";
  return `${code}${error instanceof Error ? error.message : String(error)}`;
}

async function refresh() {
  const failures = [];
  try {
    snapshot = await presence.snapshot();
  } catch (error) {
    failures.push(`presence (${errorMessage(error)})`);
  }
  try {
    info = await host.info();
  } catch (error) {
    failures.push(`host info (${errorMessage(error)})`);
  }
  try {
    diagnostics = await peers.diagnostics();
  } catch (error) {
    // Hosts before API 0.8.0 and hosts without a peer service can still provide useful
    // interface weather, so a missing pairing service must not crash the diagnostic app.
    diagnostics = [];
    failures.push(`peer discovery (${errorMessage(error)})`);
  }
  status = failures.length === 0
    ? `Read at ${new Date().toLocaleTimeString()}`
    : `Partial read — unavailable: ${failures.join("; ")}`;
}

/** @param {PeerDiscoveryKind} kind @returns {Availability} */
function diagnostic(kind) {
  return diagnostics.find((entry) => entry.kind === kind)?.availability ?? {
    state: "unsupported",
    reason: "This host did not register the mechanism"
  };
}

/** @param {Availability} availability */
function selectable(availability) {
  return availability.state === "available" || availability.state === "permission-required";
}

/** @returns {import("@twistedpear/miniapp-runtime").WidgetNode} */
function row(id, label, value) {
  return {
    id,
    type: "view",
    style: { flexDirection: "row", gap: 8 },
    children: [
      { id: `${id}-l`, type: "text", props: { value: label }, style: { fontWeight: "bold" } },
      { id: `${id}-v`, type: "text", props: { value } }
    ]
  };
}

/** @returns {import("@twistedpear/miniapp-runtime").WidgetNode} */
function mechanismRow(kind, label) {
  const availability = diagnostic(kind);
  const detail = availability.reason === undefined
    ? availability.state
    : `${availability.state} — ${availability.reason}`;
  /** @type {import("@twistedpear/miniapp-runtime").WidgetNode[]} */
  const actions = selectable(availability) && !busy
    ? [
        { id: `invite-${kind}`, type: "button", props: { label: "Invite", event: `lw.invite.${kind}` } },
        { id: `join-${kind}`, type: "button", props: { label: "Join", event: `lw.join.${kind}` } }
      ]
    : [];
  /** @type {import("@twistedpear/miniapp-runtime").WidgetNode[]} */
  const actionRow = actions.length === 0
    ? []
    : [{ id: `actions-${kind}`, type: "view", style: { flexDirection: "row", gap: 8 }, children: actions }];
  return {
    id: `mechanism-${kind}`,
    type: "view",
    style: { gap: 4 },
    children: [
      row(`availability-${kind}`, label, detail),
      ...actionRow
    ]
  };
}

/** @returns {import("@twistedpear/miniapp-runtime").WidgetNode} */
function connectionRow(connection, index) {
  const summary = connection.summary;
  /** @type {import("@twistedpear/miniapp-runtime").WidgetNode[]} */
  const disconnectAction = busy ? [] : [{ id: `disconnect-${index}`, type: "button", props: { label: "Disconnect", event: `lw.disconnect.${index}` } }];
  return {
    id: `connection-${index}`,
    type: "view",
    style: { gap: 4 },
    children: [
      {
        id: `connection-label-${index}`,
        type: "text",
        props: { value: `${summary.displayLabel} · ${summary.state}` },
        style: { fontWeight: "bold" }
      },
      {
        id: `connection-detail-${index}`,
        type: "text",
        props: { value: `${summary.rendezvous} → ${summary.dataPlane} · ${summary.fingerprint}` },
        style: { fontSize: 12 }
      },
      ...disconnectAction
    ]
  };
}

/** @param {"request" | "listen"} mode @param {PeerDiscoveryKind | "any"} mechanism */
async function connect(mode, mechanism) {
  if (busy) return;
  busy = true;
  status = `${mode === "request" ? "Inviting" : "Joining"} via ${mechanism === "any" ? "host-selected mechanism" : mechanism}…`;
  await render();
  try {
    /** @type {Parameters<typeof peers.request>[0]} */
    const options = {
      purpose: "Inspect and establish a Link Weather peer connection",
      mechanisms: mechanism === "any" ? "any" : [mechanism]
    };
    const handle = mode === "request" ? await peers.request(options) : await peers.listen(options);
    const summary = await peers.info(handle);
    connections = [...connections, { handle, summary }];
    status = `Connected to ${summary.displayLabel} via ${summary.rendezvous}; data plane: ${summary.dataPlane}`;
  } catch (error) {
    status = `Connection failed — ${errorMessage(error)}`;
  } finally {
    busy = false;
    await render();
  }
}

async function disconnect(index) {
  const connection = connections[index];
  if (connection === undefined || busy) return;
  busy = true;
  status = `Disconnecting ${connection.summary.displayLabel}…`;
  await render();
  try {
    await peers.close(connection.handle);
    connections = connections.filter((_, candidate) => candidate !== index);
    status = `Disconnected ${connection.summary.displayLabel} (${connection.summary.rendezvous})`;
  } catch (error) {
    status = `Disconnect failed — ${errorMessage(error)}`;
  } finally {
    busy = false;
    await render();
  }
}

async function render() {
  const interfaces = info?.interfaceTypes ?? [];
  const quotas = info?.quotas;
  const hasSelectableMechanism = MECHANISMS.some(([kind]) => selectable(diagnostic(kind)));
  /** @type {import("@twistedpear/miniapp-runtime").WidgetNode[]} */
  const anyActions = hasSelectableMechanism && !busy ? [{ id: "any-actions", type: "view", style: { flexDirection: "row", gap: 8 }, children: [
    { id: "invite-any", type: "button", props: { label: "Invite (recommended)", event: "lw.invite.any" } },
    { id: "join-any", type: "button", props: { label: "Join (recommended)", event: "lw.join.any" } }
  ] }] : [];
  /** @type {import("@twistedpear/miniapp-runtime").WidgetNode[]} */
  const connectionRows = connections.length === 0
    ? [{ id: "connections-empty", type: "text", props: { value: "No app-scoped peer connections" } }]
    : connections.map(connectionRow);
  await ui.render({
    root: {
      id: "root",
      type: "scroll",
      style: { padding: 16, gap: 10 },
      children: [
        { id: "title", type: "text", props: { value: "Link weather" }, style: { fontSize: 20, fontWeight: "bold" } },
        { id: "refresh", type: "button", props: { label: "Detect again", event: "lw.refresh" } },
        { id: "divider", type: "divider" },
        row("platform", "Platform", info?.platform ?? "unknown"),
        row("version", "Host", info?.hostVersion ?? "unknown"),
        row("api", "Host API", info?.hostApiVersion ?? "unknown"),
        row("roles", "Roles", info === null ? "none" : Object.entries(info.roles).filter(([, enabled]) => enabled).map(([role]) => role).join(", ") || "none"),
        row("ifaces", "Interfaces", interfaces.join(", ") || "none"),
        row("peers", "Peers seen", String(snapshot?.peers ?? 0)),
        row("kv", "KV quota", String(quotas?.kvQuotaBytes ?? "host default")),
        row("grants", "Granted", (info?.grantedCapabilities ?? []).join(", ") || "none"),
        { id: "divider2", type: "divider" },
        { id: "mechanisms-title", type: "text", props: { value: "Peer connection mechanisms" }, style: { fontSize: 16, fontWeight: "bold" } },
        ...anyActions,
        ...MECHANISMS.map(([kind, label]) => mechanismRow(kind, label)),
        { id: "divider3", type: "divider" },
        { id: "connections-title", type: "text", props: { value: `Connected peers (${connections.length})` }, style: { fontSize: 16, fontWeight: "bold" } },
        ...connectionRows,
        { id: "advice", type: "text", props: { value: interfaces.includes("rnode") || interfaces.includes("ble") ? "Slow link present. Budget every byte you send." : "IP-backed link. Bulk transfer is plausible here and nowhere else." } },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event }) => {
  if (event === "lw.refresh") {
    await refresh();
    await render();
    return;
  }
  if (event.startsWith("lw.invite.")) {
    await connect("request", /** @type {PeerDiscoveryKind | "any"} */ (event.slice("lw.invite.".length)));
    return;
  }
  if (event.startsWith("lw.join.")) {
    await connect("listen", /** @type {PeerDiscoveryKind | "any"} */ (event.slice("lw.join.".length)));
    return;
  }
  if (event.startsWith("lw.disconnect.")) {
    await disconnect(Number(event.slice("lw.disconnect.".length)));
  }
});

await refresh();
await render();
