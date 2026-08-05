/**
 * Handbook applet: package v1 → publish → install → bump version → republish (OTA path).
 */
export async function run(sdk, report) {
  const started = Date.now();
  const project = "handbook-update-app";
  const manifestV1 = {
    name: "hb-update",
    version: "0.1.0",
    entry: "bundle.js",
    capabilities: ["identity"],
  };
  const manifestV2 = { ...manifestV1, version: "0.2.0" };

  try {
    const writeProject = async (version) => {
      await sdk.workspace.write(
        `${project}/app.json`,
        JSON.stringify({ ...manifestV1, version }, null, 2),
      );
      await sdk.workspace.write(
        `${project}/bundle.js`,
        `import { ui } from "@twistedpear/miniapp-sdk";\nawait ui.render({ root: { id: "root", type: "text", props: { value: "v${version}" } } });\n`,
      );
    };

    await writeProject(manifestV1.version);
    const packedV1 = await sdk.apps.packageProject(project, manifestV1);
    const publishedV1 = await sdk.apps.publish(packedV1.t256);
    const installedV1 = await sdk.apps.install(publishedV1.t256);
    if (installedV1?.version !== manifestV1.version) {
      report({
        status: "fail",
        details: `v1 install version mismatch: ${JSON.stringify(installedV1)}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    await writeProject(manifestV2.version);
    const packedV2 = await sdk.apps.packageProject(project, manifestV2);
    const publishedV2 = await sdk.apps.publish(packedV2.t256);
    const installedV2 = await sdk.apps.install(publishedV2.t256);
    if (installedV2?.version !== manifestV2.version) {
      report({
        status: "fail",
        details: `v2 update version mismatch: ${JSON.stringify(installedV2)}`,
        timings: { ms: Date.now() - started },
      });
      return;
    }

    report({
      status: "pass",
      details: `Updated ${installedV2.appId} ${manifestV1.version} → ${manifestV2.version}`,
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
