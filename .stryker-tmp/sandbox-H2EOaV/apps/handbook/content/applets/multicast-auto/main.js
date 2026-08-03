/**
 * Handbook applet: multicast / AutoInterface discovery (device-gated).
 */
// @ts-nocheck

export async function run(sdk, report) {
  const started = Date.now();
  const procedure = [
    "1. Put two hosts on the same Wi‑Fi LAN (phone + desktop, or two phones).",
    "2. Enable AutoInterface / multicast discovery in each host app.",
    "3. Wait for announces — presence should show peers without manual TCP config.",
    "4. Re-run this applet — expect pass when auto peers are visible."
  ].join("\n");

  try {
    const info = await sdk.host.info();
    const types = info.interfaceTypes ?? [];
    if (!types.includes("auto")) {
      report({
        status: "unavailable",
        details: `AutoInterface not listed on ${info.platform} (types: ${types.join(", ") || "none"}).\n\nGuided procedure (LAN + hardware):\n${procedure}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const snap = await sdk.presence.snapshot();
    if ((snap.peers ?? 0) < 1) {
      report({
        status: "unavailable",
        details: `AutoInterface present but no LAN peer yet (peers=${snap.peers ?? 0}).\n\nGuided procedure:\n${procedure}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    report({
      status: "pass",
      details: `AutoInterface peer visible (peers=${snap.peers}, preferred=${snap.preferredInterface ?? "none"})`,
      timings: { ms: Date.now() - started }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted = /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    report({
      status: notGranted ? "not-granted" : "fail",
      details: message,
      timings: { ms: Date.now() - started }
    });
  }
}
