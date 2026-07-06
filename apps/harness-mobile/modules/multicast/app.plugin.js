const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

/** Expo config plugin for IPv6 multicast + Android MulticastLock (M3). */
module.exports = function withMulticast(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const usesPermission = manifest["uses-permission"] ?? [];
    const permissions = new Set(
      usesPermission.map((entry) => entry.$?.["android:name"]).filter(Boolean)
    );

    for (const permission of [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.ACCESS_WIFI_STATE",
      "android.permission.CHANGE_WIFI_MULTICAST_STATE"
    ]) {
      if (!permissions.has(permission)) {
        usesPermission.push({ $: { "android:name": permission } });
      }
    }

    manifest["uses-permission"] = usesPermission;
    return config;
  });
};
