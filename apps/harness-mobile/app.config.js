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

/**
 * The Kotlin version this app pins, from the one place it is declared.
 *
 * `expo-build-properties` writes it to `android.kotlinVersion` in the generated
 * `gradle.properties`; reading the same entry here means the Gradle plugin and
 * the Compose compiler cannot disagree.
 */
function kotlinVersion() {
  const entry = (base.expo.plugins ?? []).find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties",
  );
  const version = entry?.[1]?.android?.kotlinVersion;
  if (!version) {
    throw new Error(
      "app.json must pin expo-build-properties android.kotlinVersion",
    );
  }
  return version;
}

/**
 * Pin the Kotlin Gradle plugin to the version `expo-build-properties` declares.
 *
 * This used to substitute the literal `$kotlinVersion`, which resolved because
 * the Expo template happened to define it in the root project's `buildscript`
 * `ext` block. The SDK 57 template does not, so the generated file referenced an
 * undefined Groovy property and every Gradle invocation died during
 * configuration with "Could not get unknown property 'kotlinVersion'" — which
 * took the `kotlin-tests` gate, and with it the whole Pages deploy, red.
 *
 * Interpolating the version here removes the dependency on what the upstream
 * template declares: the classpath line is complete on its own.
 */
function withPinnedKotlinGradlePlugin(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const pinned = `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion()}")`;
    if (contents.includes(pinned)) {
      return config;
    }
    config.modResults.contents = contents.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::\$kotlinVersion)?['"]\)/,
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
