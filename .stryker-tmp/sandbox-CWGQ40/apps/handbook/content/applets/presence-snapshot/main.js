/**
 * Handbook applet: presence.snapshot() on this host.
 */
// @ts-nocheck

export async function run(sdk, report) {
  const started = Date.now();
  try {
    const snap = await sdk.presence.snapshot();
    if (snap === null || typeof snap !== "object") {
      report({
        status: "fail",
        details: `Expected a presence snapshot object, got: ${String(snap)}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    report({
      status: "pass",
      details: `peers=${snap.peers} interfaces=${snap.onlineInterfaces} preferred=${snap.preferredInterface ?? "none"}`,
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
