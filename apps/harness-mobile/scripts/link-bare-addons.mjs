#!/usr/bin/env node
/**
 * Link Bare native addons (bare-tcp, bare-fs, …) into react-native-bare-kit's
 * addon folders. Prefer linking each `"addon": true` package under node_modules
 * (the CocoaPods `node link` helper often exits before async bare-link finishes,
 * and walking only the repo root can miss nested addons).
 *
 * `bare-link` >= 3 is an async generator that takes `{ hosts, out }`. Awaiting
 * the generator without consuming it is a no-op, which used to leave the
 * jniLibs addons directory empty.
 */
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const link = require("bare-link");

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const bareKitRoot = join(repoRoot, "node_modules/react-native-bare-kit");
const nodeModules = join(repoRoot, "node_modules");

const targets = {
  ios: {
    out: join(bareKitRoot, "ios/addons"),
    target: ["ios-arm64", "ios-arm64-simulator", "ios-x64-simulator"],
  },
  android: {
    // Must match react-native-bare-kit/android/build.gradle jniLibs.srcDirs
    // (`src/main/addons`), not the top-level `android/addons` path.
    out: join(bareKitRoot, "android/src/main/addons"),
    target: ["android-arm", "android-arm64", "android-ia32", "android-x64"],
  },
};

function listAddonPackages(root) {
  const found = [];
  if (!existsSync(root)) {
    return found;
  }
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    if (entry.name.startsWith("@")) {
      const scope = join(root, entry.name);
      for (const nested of readdirSync(scope, { withFileTypes: true })) {
        if (!nested.isDirectory()) {
          continue;
        }
        maybePushAddon(join(scope, nested.name), found);
      }
      continue;
    }
    if (entry.isDirectory()) {
      maybePushAddon(join(root, entry.name), found);
    }
  }
  return found;
}

function maybePushAddon(dir, found) {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    return;
  }
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (pkg.addon === true) {
      found.push(dir);
    }
  } catch {
    // ignore malformed packages
  }
}

/** Consume bare-link's async generator so the copies actually land. */
async function linkAddons(addonPath, options) {
  for await (const artifact of link(addonPath, options)) {
    void artifact;
  }
}

function abiDirs(out) {
  if (!existsSync(out)) return [];
  return readdirSync(out, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(out, entry.name));
}

function linkedTcp(out) {
  return abiDirs(out).some((dir) =>
    readdirSync(dir).some((name) => name.includes("bare-tcp")),
  );
}

const platform = process.argv[2] === "android" ? "android" : "ios";
const { out, target } = targets[platform];
mkdirSync(out, { recursive: true });

const addons = listAddonPackages(nodeModules);
if (addons.length === 0) {
  throw new Error('No packages with "addon": true found under node_modules');
}

const failures = [];
for (const addonPath of addons) {
  process.stdout.write(`linking ${addonPath}… `);
  try {
    // Skip ABIs the package does not ship (e.g. bare-posix has no android-arm).
    const available = target.filter((abi) =>
      existsSync(join(addonPath, "prebuilds", abi)),
    );
    if (available.length === 0) {
      console.log("skipped (no prebuilds for this platform)");
      continue;
    }
    await linkAddons(addonPath, {
      hosts: available,
      out,
    });
    console.log("ok");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`failed: ${message}`);
    failures.push(`${addonPath}: ${message}`);
  }
}

if (platform === "android" && !linkedTcp(out)) {
  throw new Error(
    `bare-tcp was not linked into ${out} (android TCP peer will stay offline)`,
  );
}
if (failures.length > 0) {
  console.warn(`bare addon link warnings (${failures.length}):`);
  for (const failure of failures) {
    console.warn(`  - ${failure}`);
  }
}

console.log(`bare addons linked → ${out}`);
console.log(readdirSync(out).join("\n"));
