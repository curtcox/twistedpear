const { withAndroidManifest } = require("expo/config-plugins");

/** Expo config plugin for Android USB-serial byte-pipe (M6). */
module.exports = function withUsbSerial(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const usesPermission = manifest["uses-permission"] ?? [];
    const permissions = new Set(
      usesPermission.map((entry) => entry.$?.["android:name"]).filter(Boolean),
    );

    for (const permission of ["android.permission.USB_PERMISSION"]) {
      if (!permissions.has(permission)) {
        usesPermission.push({ $: { "android:name": permission } });
      }
    }

    manifest["uses-permission"] = usesPermission;

    const usesFeature = manifest["uses-feature"] ?? [];
    const features = new Set(
      usesFeature.map((entry) => entry.$?.["android:name"]).filter(Boolean),
    );

    if (!features.has("android.hardware.usb.host")) {
      usesFeature.push({
        $: {
          "android:name": "android.hardware.usb.host",
          "android:required": "false",
        },
      });
    }

    manifest["uses-feature"] = usesFeature;

    const application = manifest.application?.[0];
    if (application !== undefined) {
      if (!Array.isArray(application["receiver"])) {
        application["receiver"] = [];
      }

      const receiverClass =
        "expo.modules.twistedpear.usbserial.UsbPermissionReceiver";
      const alreadyDeclared = application["receiver"].some(
        (entry) => entry.$?.["android:name"] === receiverClass,
      );

      if (!alreadyDeclared) {
        application["receiver"].push({
          $: {
            "android:name": receiverClass,
            "android:exported": "false",
          },
          "intent-filter": [
            {
              action: [
                {
                  $: {
                    "android:name":
                      "network.twistedpear.harness.USB_PERMISSION",
                  },
                },
              ],
            },
          ],
        });
      }
    }

    return config;
  });
};
