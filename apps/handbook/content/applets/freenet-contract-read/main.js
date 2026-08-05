/**
 * Read-only Freenet reachability probe. The all-zero key is deliberately
 * unknown; no contract state is published or updated.
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    const record = await sdk.freenet.get("00".repeat(32));
    if (record !== null) {
      report({
        status: "fail",
        details: "The deliberately unknown contract key unexpectedly resolved.",
        timings: { ms: Date.now() - started }
      });
      return;
    }
    report({
      status: "pass",
      details: "Freenet backend reachable; unknown contract correctly absent.",
      timings: { ms: Date.now() - started }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const text = `${code} ${message}`;
    const notGranted = /CAPABILITY_DENIED|has not been granted|Capability/i.test(text);
    const unavailable = /FREENET_UNCONFIGURED|not configured|unavailable/i.test(text);
    report({
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started }
    });
  }
}
