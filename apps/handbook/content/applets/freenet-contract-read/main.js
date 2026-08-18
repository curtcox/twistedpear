/**
 * Read-only Freenet reachability probe. Arbitrary keys are out of scope;
 * FREENET_KEY_DENIED is the host enforcing that, not a missing backend.
 */
function classifyFreenetError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const text = `${code} ${message}`;
  if (/CAPABILITY_DENIED|has not been granted|Capability/i.test(text)) {
    return { status: "not-granted", details: message };
  }
  if (/FREENET_UNCONFIGURED|not configured|unavailable/i.test(text)) {
    return { status: "unavailable", details: message };
  }
  if (/FREENET_KEY_DENIED|host allowlisted/i.test(text)) {
    return {
      status: "pass",
      details: "Freenet backend reachable; arbitrary contract key denied.",
    };
  }
  return { status: "fail", details: message };
}

export async function run(sdk, report) {
  const started = Date.now();
  try {
    const record = await sdk.freenet.get("00".repeat(32));
    report({
      status: "fail",
      details:
        record !== null
          ? "The deliberately unknown contract key unexpectedly resolved."
          : "Arbitrary Freenet keys must be denied, not returned as absent.",
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    report({
      ...classifyFreenetError(error),
      timings: { ms: Date.now() - started },
    });
  }
}
