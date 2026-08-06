/**
 * Handbook applet: share.put → share.get round-trip.
 */
export async function run(sdk, report) {
  const started = Date.now();
  const content = `handbook-cas-${started}`;
  try {
    const put = await sdk.share.put(content);
    if (
      put === null ||
      typeof put !== "object" ||
      typeof put.t256 !== "string"
    ) {
      report({
        status: "fail",
        details: `Expected { t256 }, got: ${JSON.stringify(put)}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    if (put.t256.length !== 94) {
      report({
        status: "fail",
        details: `Expected 94-char 256t id, got length ${put.t256.length}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    const got = await sdk.share.get(put.t256);
    if (got !== content) {
      report({
        status: "fail",
        details: `CAS get mismatch: ${String(got)}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    report({
      status: "pass",
      details: `CAS round-trip (${put.t256.slice(0, 12)}…)`,
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    const unavailable = /not configured|UNCONFIGURED|unavailable/i.test(
      message,
    );
    report({
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started },
    });
  }
}
