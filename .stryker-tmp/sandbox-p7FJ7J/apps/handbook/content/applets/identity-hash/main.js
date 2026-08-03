/**
 * Handbook applet: prove identity.destinationHash() on this host.
 * Export async function run(sdk, report).
 */
// @ts-nocheck

export async function run(sdk, report) {
  const started = Date.now();
  try {
    const hash = await sdk.identity.destinationHash();
    if (typeof hash !== "string" || hash.length === 0) {
      report({
        status: "fail",
        details: `Expected a non-empty destination hash string, got: ${String(hash)}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    report({
      status: "pass",
      details: `destinationHash = ${hash}`,
      timings: { ms: Date.now() - started }
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
      timings: { ms: Date.now() - started }
    });
  }
}
