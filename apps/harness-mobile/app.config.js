const {
  withDangerousMod,
  withProjectBuildGradle,
} = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const base = require("./app.json");

function withPrivacyManifest(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      fs.mkdirSync(projectRoot, { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, "PrivacyInfo.xcprivacy"),
        JSON.stringify(
          {
            NSPrivacyTracking: false,
            NSPrivacyCollectedDataTypes: [],
            NSPrivacyAccessedAPITypes: [
              {
                NSPrivacyAccessedAPIType:
                  "NSPrivacyAccessedAPICategoryFileTimestamp",
                NSPrivacyAccessedAPITypeReasons: ["C617.1"],
              },
              {
                NSPrivacyAccessedAPIType:
                  "NSPrivacyAccessedAPICategoryUserDefaults",
                NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
              },
            ],
          },
          null,
          2,
        ),
      );
      return config;
    },
  ]);
}

/** Pin the Kotlin Gradle plugin to android.kotlinVersion (Compose needs 1.9.25). */
function withPinnedKotlinGradlePlugin(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const pinned =
      'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")';
    if (contents.includes(pinned)) {
      return config;
    }
    config.modResults.contents = contents.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\)/,
      pinned,
    );
    return config;
  });
}

module.exports = ({ config }) => {
  const merged = {
    ...base.expo,
    ...config,
    extra: {
      ...(base.expo.extra ?? {}),
      ...(config.extra ?? {}),
      storePosture:
        process.env.TWISTEDPEAR_STORE_POSTURE === "store" ? "store" : "dev",
    },
    ios: {
      ...base.expo.ios,
      ...config.ios,
      infoPlist: {
        ...(base.expo.ios?.infoPlist ?? {}),
        ...(config.ios?.infoPlist ?? {}),
        ITSAppUsesNonExemptEncryption: false,
      },
    },
  };

  return withPinnedKotlinGradlePlugin(withPrivacyManifest(merged));
};
