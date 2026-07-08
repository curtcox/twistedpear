/**
 * Handbook applet: package → publish → install (each step host-confirmed).
 */
export async function run(sdk, report) {
  const started = Date.now();
  const project = "handbook-distrib-app";
  const manifest = {
    name: "hb-distrib",
    version: "0.0.1",
    entry: "bundle.js",
    capabilities: ["identity"]
  };
  try {
    await sdk.workspace.write(
      `${project}/app.json`,
      JSON.stringify({
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities
      })
    );
    await sdk.workspace.write(
      `${project}/bundle.js`,
      `import { ui } from "@twistedpear/miniapp-sdk";\nawait ui.render({ root: { id: "root", type: "text", props: { value: "distrib" } } });\n`
    );

    const packed = await sdk.apps.packageProject(project, manifest);
    if (typeof packed?.t256 !== "string" || packed.t256.length !== 94) {
      report({
        status: "fail",
        details: `Package failed: ${JSON.stringify(packed)}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const published = await sdk.apps.publish(packed.t256);
    if (published === null || typeof published.t256 !== "string") {
      report({
        status: "fail",
        details: `Publish failed: ${JSON.stringify(published)}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    const installed = await sdk.apps.install(published.t256);
    if (installed === null || typeof installed.appId !== "string") {
      report({
        status: "fail",
        details: `Install failed: ${JSON.stringify(installed)}`,
        timings: { ms: Date.now() - started }
      });
      return;
    }

    report({
      status: "pass",
      details: `Published and installed ${installed.appId}@${installed.version}`,
      timings: { ms: Date.now() - started }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted = /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    const unavailable = /not configured|UNCONFIGURED|CONFIRMATION_UNAVAILABLE|unavailable/i.test(message);
    report({
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started }
    });
  }
}
