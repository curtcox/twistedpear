/**
 * Handbook applet: storage.bee open → put → get → list → del.
 */
export async function run(sdk, report) {
  const started = Date.now();
  const key = `handbook:bee:${started}`;
  const payload = new TextEncoder().encode(`bee-${started}`);
  try {
    await sdk.storage.bee.open();
    await sdk.storage.bee.put(key, payload);
    const got = await sdk.storage.bee.get(key);
    if (got === null) {
      report({
        status: "fail",
        details: "Hyperbee get returned null after put",
        timings: { ms: Date.now() - started }
      });
      return;
    }

    if (new TextDecoder().decode(got) !== `bee-${started}`) {
      report({
        status: "fail",
        details: "Hyperbee value mismatch",
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const listed = await sdk.storage.bee.list({ gte: key, limit: 5 });
    if (!Array.isArray(listed) || listed.length === 0) {
      report({
        status: "fail",
        details: "Hyperbee list did not include the put key",
        timings: { ms: Date.now() - started }
      });
      return;
    }

    await sdk.storage.bee.del(key);
    const after = await sdk.storage.bee.get(key);
    if (after !== null) {
      report({
        status: "fail",
        details: "Hyperbee value still present after del",
        timings: { ms: Date.now() - started }
      });
      return;
    }

    report({
      status: "pass",
      details: "Hyperbee open → put → get → list → del succeeded",
      timings: { ms: Date.now() - started }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted = /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    const unavailable = /not configured|UNCONFIGURED|unavailable/i.test(message);
    report({
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started }
    });
  }
}
