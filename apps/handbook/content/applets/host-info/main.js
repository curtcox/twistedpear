/**
 * Handbook applet: host.info() platform / roles / interfaces / quotas.
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    if (sdk.host === undefined || typeof sdk.host.info !== "function") {
      report({
        status: "unavailable",
        details: "host.info is not available in this sandbox (upgrade host API).",
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const info = await sdk.host.info();
    if (info === null || typeof info !== "object") {
      report({
        status: "fail",
        details: `Expected a host info object, got: ${String(info)}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const platform = typeof info.platform === "string" ? info.platform : "?";
    const api = typeof info.hostApiVersion === "string" ? info.hostApiVersion : "?";
    const roles = info.roles ?? {};
    const interfaces = Array.isArray(info.interfaceTypes) ? info.interfaceTypes.join(",") : "";
    const grants = Array.isArray(info.grantedCapabilities) ? info.grantedCapabilities.length : 0;

    report({
      status: "pass",
      details: `platform=${platform} api=${api} grants=${grants} transport=${roles.transport === true} seeder=${roles.seeder === true} interfaces=[${interfaces}]`,
      timings: { ms: Date.now() - started }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted = /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    const unavailable = /UNKNOWN_METHOD|not available|upgrade host/i.test(message);
    report({
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started }
    });
  }
}
