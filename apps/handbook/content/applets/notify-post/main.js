/**
 * Handbook applet: prove notify.post() on this host.
 * Export async function run(sdk, report).
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    if (sdk.notify === undefined || typeof sdk.notify.post !== "function") {
      report({
        status: "unavailable",
        details:
          "notify.post is not available in this sandbox (upgrade host API).",
        timings: { ms: Date.now() - started },
      });
      return;
    }

    const posted = await sdk.notify.post({
      title: "Handbook",
      body: "notify:post probe",
      event: "hb.notify.probe",
    });
    if (posted === null || typeof posted !== "object") {
      report({
        status: "fail",
        details: `Expected a notification object, got: ${String(posted)}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    report({
      status: "pass",
      details: `posted id=${typeof posted.id === "string" ? posted.id : "?"}`,
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      message.includes("CAPABILITY_DENIED") ||
      message.includes("has not been granted") ||
      message.includes("Capability");
    report({
      status: notGranted ? "not-granted" : "fail",
      details: message,
      timings: { ms: Date.now() - started },
    });
  }
}
