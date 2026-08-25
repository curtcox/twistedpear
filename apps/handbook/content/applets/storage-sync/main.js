/**
 * Handbook applet: local topic log. Host merge/replication is out of scope.
 */
export async function run(sdk, report) {
  const clock = Date.now();
  const topic = "handbook:applet-sync-probe";
  const body = { marker: `m-${clock}` };
  try {
    if (sdk.storage === undefined || sdk.storage.sync === undefined) {
      report({
        status: "fail",
        details: "sdk.storage.sync is missing",
        timings: { ms: Date.now() - clock },
      });
      return;
    }
    await sdk.storage.sync.open(topic);
    await sdk.storage.sync.append(topic, body, { key: "probe" });
    const rows = await sdk.storage.sync.view(topic);
    const found = Array.isArray(rows)
      ? rows.some((row) => row && row.key === "probe")
      : false;
    report({
      status: found ? "pass" : "fail",
      details: found
        ? "topic log retained the keyed append"
        : "topic log view missed the keyed append",
      timings: { ms: Date.now() - clock },
    });
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    report({
      status: text.includes("CAPABILITY_DENIED") ? "not-granted" : "fail",
      details: text,
      timings: { ms: Date.now() - clock },
    });
  }
}
