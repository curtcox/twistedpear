/**
 * Handbook applet: prove identity.destinationHash() on this host.
 * Export async function run(sdk, report).
 */
function reportError(report, started, error) {
  const message = error instanceof Error ? error.message : String(error);
  const status = /CAPABILITY_DENIED|has not been granted|Capability/.test(
    message,
  )
    ? "not-granted"
    : "fail";
  report({
    details: message,
    status,
    timings: { ms: Date.now() - started },
  });
}

export async function run(sdk, report) {
  const started = Date.now();
  try {
    const hash = await sdk.identity.destinationHash();
    if (typeof hash !== "string" || hash.length === 0) {
      report({
        status: "fail",
        details: `Expected a non-empty destination hash string, got: ${String(hash)}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    report({
      status: "pass",
      details: `destinationHash = ${hash}`,
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    reportError(report, started, error);
  }
}
