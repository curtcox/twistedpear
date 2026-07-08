/**
 * Handbook applet: BLE peer visibility (device-gated).
 */
export async function run(sdk, report) {
  const started = Date.now();
  const procedure = [
    "1. On both phones, open the host app and enable the BLE interface.",
    "2. Keep both devices in foreground for ~30 s until AutoInterface/BLE discovery runs.",
    "3. Confirm presence shows at least one peer on the preferred BLE path.",
    "4. Re-run this applet — expect pass when a BLE peer is visible."
  ].join("\n");

  try {
    const info = await sdk.host.info();
    const types = info.interfaceTypes ?? [];
    if (!types.includes("ble")) {
      report({
        status: "unavailable",
        details: `BLE interface not listed on ${info.platform}.\n\nGuided procedure (real device):\n${procedure}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const snap = await sdk.presence.snapshot();
    if ((snap.peers ?? 0) < 1) {
      report({
        status: "unavailable",
        details: `BLE interface present but no peer connected (peers=${snap.peers ?? 0}).\n\nGuided procedure:\n${procedure}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    report({
      status: "pass",
      details: `BLE peer visible (peers=${snap.peers}, preferred=${snap.preferredInterface ?? "none"})`,
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
