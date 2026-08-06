const {
  AndroidConfig,
  withAndroidManifest,
  withInfoPlist,
} = require("expo/config-plugins");
module.exports = function withPeerAudio(config) {
  config = withAndroidManifest(config, (result) => {
    AndroidConfig.Permissions.addPermission(
      result.modResults,
      "android.permission.RECORD_AUDIO",
    );
    return result;
  });
  return withInfoPlist(config, (result) => {
    result.modResults.NSMicrophoneUsageDescription =
      "Allow TwistedPear to exchange audible peer invitations.";
    return result;
  });
};
