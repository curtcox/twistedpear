/**
 * Handbook applet: storage.kv set → get → delete.
 */
export async function run(sdk, report) {
  const started = Date.now();
  const key = "handbook:applet-kv-probe";
  const payload = new TextEncoder().encode(`probe-${started}`);
  try {
    await sdk.storage.kv.set(key, payload);
    const got = await sdk.storage.kv.get(key);
    if (got === null) {
      report({
        status: "fail",
        details: "KV get returned null after set",
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const text = new TextDecoder().decode(got);
    if (text !== `probe-${started}`) {
      report({
        status: "fail",
        details: `KV value mismatch: ${text}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    await sdk.storage.kv.delete(key);
    const after = await sdk.storage.kv.get(key);
    if (after !== null) {
      report({
        status: "fail",
        details: "KV value still present after delete",
        timings: { ms: Date.now() - started }
      });
      return;
    }

    report({
      status: "pass",
      details: "KV set → get → delete succeeded",
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
