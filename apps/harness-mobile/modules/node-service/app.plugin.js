const {
  withAndroidManifest,
  AndroidConfig,
  withInfoPlist,
} = require("expo/config-plugins");

const SERVICE_CLASS = "network.twistedpear.harness.NodeForegroundService";
const SERVICE_NAME = "TwistedPear Node Service";

const SERVICE_PERMISSIONS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.WAKE_LOCK",
];

function collapseApplications(manifest) {
  const applications = manifest.application;
  if (!Array.isArray(applications) || applications.length === 0) {
    throw new Error("no <application> in AndroidManifest");
  }
  const [primary, ...rest] = applications;
  if (!Array.isArray(primary.service)) primary.service = [];
  for (const extra of rest) {
    for (const service of extra.service ?? []) {
      const name = service.$?.["android:name"];
      const already = primary.service.some(
        (entry) => entry.$?.["android:name"] === name,
      );
      if (!already) primary.service.push(service);
    }
  }
  manifest.application = [primary];
  return primary;
}

function ensureService(application) {
  if (!Array.isArray(application.service)) application.service = [];
  const alreadyDeclared = application.service.some(
    (entry) => entry.$?.["android:name"] === SERVICE_CLASS,
  );
  if (alreadyDeclared) return;
  application.service.push({
    $: {
      "android:name": SERVICE_CLASS,
      "android:enabled": "true",
      "android:exported": "false",
      "android:foregroundServiceType": "dataSync",
    },
  });
}

function ensurePermissions(manifest) {
  const usesPermission = manifest["uses-permission"] ?? [];
  const permissions = new Set(
    usesPermission.map((entry) => entry.$?.["android:name"]).filter(Boolean),
  );
  for (const permission of SERVICE_PERMISSIONS) {
    if (!permissions.has(permission)) {
      usesPermission.push({ $: { "android:name": permission } });
    }
  }
  manifest["uses-permission"] = usesPermission;
}

function applyNodeServiceManifest(manifest) {
  const application = collapseApplications(manifest);
  ensureService(application);
  ensurePermissions(manifest);
  return manifest;
}

/** Expo config plugin for Android foreground service (M2). */
module.exports = function withNodeService(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    applyNodeServiceManifest(manifest);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      manifest.application[0],
      "network.twistedpear.harness.FOREGROUND_SERVICE_ENABLED",
      "true",
    );
    return config;
  });

  config = withInfoPlist(config, (config) => {
    config.modResults.UIBackgroundModes = Array.from(
      new Set([
        ...(config.modResults.UIBackgroundModes ?? []),
        "fetch",
        "processing",
      ]),
    );
    config.modResults.BGTaskSchedulerPermittedIdentifiers = Array.from(
      new Set([
        ...(config.modResults.BGTaskSchedulerPermittedIdentifiers ?? []),
        "network.twistedpear.harness.refresh",
        "network.twistedpear.harness.processing",
      ]),
    );
    return config;
  });

  return config;
};

module.exports.SERVICE_CLASS = SERVICE_CLASS;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.applyNodeServiceManifest = applyNodeServiceManifest;
