/**
 * Handbook applet: camera QR install path (device-gated).
 * Probes host platform — real camera scan is a host UI flow, not an SDK call.
 */
// @ts-nocheck

export async function run(sdk, report) {
  const started = Date.now();
  const procedure = [
    "1. From another device, export a Handbook diagnostic report or package 256t id (QR on Diagnostics screen).",
    "2. On this phone, open the host installer and choose Scan QR / camera import.",
    "3. Grant camera permission when prompted.",
    "4. Scan the QR — confirm install or compare completes.",
    "5. Re-run this applet after a successful scan to record pass (manual confirmation)."
  ].join("\n");

  try {
    const info = await sdk.host.info();
    const mobile = info.platform === "android" || info.platform === "ios";
    if (!mobile) {
      report({
        status: "unavailable",
        details: `Camera QR install is a mobile host flow (${info.platform} has no camera installer path).\n\nGuided procedure:\n${procedure}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    report({
      status: "unavailable",
      details: `Camera QR scan requires a physical device and user action — not exercisable headlessly.\n\nGuided procedure:\n${procedure}`,
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
