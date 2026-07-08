/**
 * Handbook applet: workspace write → read → list → remove.
 */
export async function run(sdk, report) {
  const started = Date.now();
  const path = `probes/workspace-${started}.txt`;
  const body = `workspace-probe-${started}`;
  try {
    await sdk.workspace.write(path, body);
    const read = await sdk.workspace.read(path);
    if (read !== body) {
      report({
        status: "fail",
        details: `Workspace read mismatch: ${String(read)}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const listed = await sdk.workspace.list("probes/");
    if (!Array.isArray(listed) || !listed.some((entry) => entry.path === path || entry === path)) {
      const paths = Array.isArray(listed)
        ? listed.map((entry) => (typeof entry === "string" ? entry : entry.path)).join(", ")
        : String(listed);
      report({
        status: "fail",
        details: `Workspace list missing ${path}; got: ${paths}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    await sdk.workspace.remove(path);
    report({
      status: "pass",
      details: `Workspace write → read → list → remove for ${path}`,
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
