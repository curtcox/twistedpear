const {
  withAndroidManifest,
  AndroidConfig,
  withInfoPlist
} = require("expo/config-plugins");

const SERVICE_CLASS = "network.twistedpear.harness.NodeForegroundService";
const SERVICE_NAME = "TwistedPear Node Service";

/** Expo config plugin for Android foreground service (M2). */
module.exports = function withNodeService(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      "network.twistedpear.harness.FOREGROUND_SERVICE_ENABLED",
      "true"
    );

    if (!Array.isArray(application.service)) {
      application.service = [];
    }

    const alreadyDeclared = application.service.some(
      (entry) => entry.$?.["android:name"] === SERVICE_CLASS
    );

    if (!alreadyDeclared) {
      application.service.push({
        $: {
          "android:name": SERVICE_CLASS,
          "android:enabled": "true",
          "android:exported": "false",
          "android:foregroundServiceType": "dataSync"
        }
      });
    }

    const usesPermission = manifest["uses-permission"] ?? [];
    const permissions = new Set(
      usesPermission.map((entry) => entry.$?.["android:name"]).filter(Boolean)
    );

    for (const permission of [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.WAKE_LOCK"
    ]) {
      if (!permissions.has(permission)) {
        usesPermission.push({ $: { "android:name": permission } });
      }
    }

    manifest["uses-permission"] = usesPermission;
    return config;
  });

  config = withInfoPlist(config, (config) => {
    config.modResults.UIBackgroundModes = Array.from(new Set([
      ...(config.modResults.UIBackgroundModes ?? []),
      "fetch",
      "processing"
    ]));
    config.modResults.BGTaskSchedulerPermittedIdentifiers = Array.from(new Set([
      ...(config.modResults.BGTaskSchedulerPermittedIdentifiers ?? []),
      "network.twistedpear.harness.refresh",
      "network.twistedpear.harness.processing"
    ]));
    return config;
  });

  return config;
};

module.exports.SERVICE_CLASS = SERVICE_CLASS;
module.exports.SERVICE_NAME = SERVICE_NAME;
