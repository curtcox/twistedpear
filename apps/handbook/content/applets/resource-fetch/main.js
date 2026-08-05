/**
 * Handbook applet: resource.fetch under a host budget.
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    const bytes = await sdk.resource.fetch({
      resourceId: "handbook:probe",
      budgetBytes: 4096,
    });
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      report({
        status: "fail",
        details: `Expected non-empty Uint8Array, got: ${typeof bytes}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    report({
      status: "pass",
      details: `Fetched ${bytes.length} byte(s) for handbook:probe`,
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    const unavailable =
      /not configured|UNCONFIGURED|unavailable|not found/i.test(message);
    report({
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started },
    });
  }
}
