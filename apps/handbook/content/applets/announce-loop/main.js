/**
 * Handbook applet: announce.publish then announce.subscribe in the app namespace.
 */
export async function run(sdk, report) {
  const started = Date.now();
  const payload = new TextEncoder().encode(`announce-${started}`);
  try {
    await sdk.announce.publish(payload);
    const events = await sdk.announce.subscribe();
    if (!Array.isArray(events)) {
      report({
        status: "fail",
        details: `Expected announce array, got: ${typeof events}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    if (events.length === 0) {
      report({
        status: "fail",
        details: "Subscribe returned no announces after publish",
        timings: { ms: Date.now() - started },
      });
      return;
    }

    report({
      status: "pass",
      details: `Published and observed ${events.length} announce(s) in the app namespace`,
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
