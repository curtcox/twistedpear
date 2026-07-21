import { presence, host, ui } from "@twistedpear/miniapp-sdk";

// The only app in this cookbook that tells you the truth about the device it is on.
// Everything here is read from the host rather than assumed, which is the point: an
// app that assumes it has a TCP interface will be wrong on a phone in a field.

let snapshot = null;
let info = null;
let status = "";

async function refresh() {
  try {
    snapshot = await presence.snapshot();
    info = await host.info();
    status = `Read at ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    // host.info needs host API 0.3.0. An older host answers presence.snapshot only.
    status = "Partial read — this host may predate host API 0.3.0";
  }
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

async function render() {
  const interfaces = info?.interfaceTypes ?? [];
  const quotas = info?.quotas;
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 10 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Link weather" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        { id: "refresh", type: "button", props: { label: "Refresh", event: "lw.refresh" } },
        { id: "divider", type: "divider" },
        row("platform", "Platform", info?.platform ?? "unknown"),
        row("version", "Host", info?.hostVersion ?? "unknown"),
        row("api", "Host API", info?.hostApiVersion ?? "unknown"),
        row(
          "roles",
          "Roles",
          info === null
            ? "none"
            : Object.entries(info.roles)
                .filter(([, enabled]) => enabled)
                .map(([role]) => role)
                .join(", ") || "none"
        ),
        row("ifaces", "Interfaces", interfaces.join(", ") || "none"),
        row("peers", "Peers seen", String(snapshot?.peers ?? 0)),
        row("kv", "KV quota", String(quotas?.kvQuotaBytes ?? "host default")),
        row("grants", "Granted", (info?.grantedCapabilities ?? []).join(", ") || "none"),
        { id: "divider2", type: "divider" },
        {
          id: "advice",
          type: "text",
          props: {
            value:
              interfaces.includes("rnode") || interfaces.includes("ble")
                ? "Slow link present. Budget every byte you send."
                : "IP-backed link. Bulk transfer is plausible here and nowhere else."
          }
        },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } }
      ]
    }
  });
}

ui.onEvent(async ({ event }) => {
  if (event !== "lw.refresh") return;
  await refresh();
  await render();
});

await refresh();
await render();
