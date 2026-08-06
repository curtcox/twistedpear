/**
 * Handbook applet: RNode serial / LoRa interface (device-gated).
 */
export async function run(sdk, report) {
  const started = Date.now();
  const procedure = [
    "1. Connect an RNode over USB (desktop/Android) or BLE (iOS) per host docs.",
    "2. Enable the RNode interface in the host app.",
    "3. Confirm host.info lists `rnode` and the interface reports online.",
    "4. Optional: exchange a small LXMF message with a peer over LoRa.",
    "5. Re-run this applet — expect pass when the RNode path is online.",
  ].join("\n");

  try {
    const info = await sdk.host.info();
    const types = info.interfaceTypes ?? [];
    if (!types.includes("rnode")) {
      report({
        status: "unavailable",
        details: `RNode interface not listed on ${info.platform}.\n\nGuided procedure (hardware):\n${procedure}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    const snap = await sdk.presence.snapshot();
    if ((snap.onlineInterfaces ?? 0) < 1) {
      report({
        status: "unavailable",
        details: `RNode interface declared but no online interfaces (online=${snap.onlineInterfaces ?? 0}).\n\nGuided procedure:\n${procedure}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    report({
      status: "pass",
      details: `RNode path online (interfaces=${snap.onlineInterfaces}, peers=${snap.peers ?? 0})`,
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    report({
      status: notGranted ? "not-granted" : "fail",
      details: message,
      timings: { ms: Date.now() - started },
    });
  }
}
