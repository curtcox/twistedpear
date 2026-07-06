const { withAndroidManifest } = require("expo/config-plugins");

/** Expo config plugin for BLE central + peripheral byte-pipe (M5). */
module.exports = function withBleBridge(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const usesPermission = manifest["uses-permission"] ?? [];
    const permissions = new Set(
      usesPermission.map((entry) => entry.$?.["android:name"]).filter(Boolean)
    );

    for (const permission of [
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_ADMIN",
      "android.permission.BLUETOOTH_SCAN",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.BLUETOOTH_ADVERTISE",
      "android.permission.ACCESS_FINE_LOCATION"
    ]) {
      if (!permissions.has(permission)) {
        usesPermission.push({ $: { "android:name": permission } });
      }
    }

    manifest["uses-permission"] = usesPermission;

    const usesFeature = manifest["uses-feature"] ?? [];
    const features = new Set(
      usesFeature.map((entry) => entry.$?.["android:name"]).filter(Boolean)
    );

    if (!features.has("android.hardware.bluetooth_le")) {
      usesFeature.push({
        $: {
          "android:name": "android.hardware.bluetooth_le",
          "android:required": "true"
        }
      });
    }

    manifest["uses-feature"] = usesFeature;
    return config;
  });
};
