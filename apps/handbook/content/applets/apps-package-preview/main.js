/**
 * Handbook applet: seed a tiny project, package it, then preview (host confirmation).
 */
export async function run(sdk, report) {
  const started = Date.now();
  const project = "handbook-probe-app";
  const manifest = {
    name: "hb-probe",
    version: "0.0.1",
    entry: "bundle.js",
    capabilities: ["identity"],
  };
  try {
    await sdk.workspace.write(
      `${project}/app.json`,
      JSON.stringify({
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities,
      }),
    );
    await sdk.workspace.write(
      `${project}/bundle.js`,
      `import { ui } from "@twistedpear/miniapp-sdk";\nawait ui.render({ root: { id: "root", type: "text", props: { value: "probe" } } });\n`,
    );

    const packed = await sdk.apps.packageProject(project, manifest);
    if (
      packed === null ||
      typeof packed.t256 !== "string" ||
      packed.t256.length !== 94
    ) {
      report({
        status: "fail",
        details: `Expected package with 256t id, got: ${JSON.stringify(packed)}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    const preview = await sdk.apps.preview(project, manifest, ["identity"]);
    if (preview === null || preview.launched !== true) {
      report({
        status: "fail",
        details: `Expected preview.launched === true, got: ${JSON.stringify(preview)}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    await sdk.apps.stopPreview();

    report({
      status: "pass",
      details: `Packaged (${packed.t256.slice(0, 12)}…) and previewed`,
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    const unavailable =
      /not configured|UNCONFIGURED|CONFIRMATION_UNAVAILABLE|unavailable/i.test(
        message,
      );
    report({
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started },
    });
  }
}
