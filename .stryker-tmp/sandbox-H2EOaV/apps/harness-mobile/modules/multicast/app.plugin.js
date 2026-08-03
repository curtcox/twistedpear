// @ts-nocheck
const { withAndroidManifest, withEntitlementsPlist, withInfoPlist } = require("expo/config-plugins");

/** Expo config plugin for IPv6 multicast + Android MulticastLock (M3). */
module.exports = function withMulticast(config) {
  config = withAndroidManifest(config, (config) => {
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

  config = withInfoPlist(config, (config) => {
    config.modResults.NSLocalNetworkUsageDescription =
      config.modResults.NSLocalNetworkUsageDescription ??
      "TwistedPear discovers nearby Reticulum peers on your local network.";
    config.modResults.NSBonjourServices = Array.from(new Set([
      ...(config.modResults.NSBonjourServices ?? []),
      "_reticulum._udp"
    ]));
    return config;
  });

  config = withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.developer.networking.multicast"] =
      config.modResults["com.apple.developer.networking.multicast"] ?? false;
    return config;
  });

  return config;
};
