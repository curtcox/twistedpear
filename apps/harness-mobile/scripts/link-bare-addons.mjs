#!/usr/bin/env node
/**
 * Link Bare native addons (bare-tcp, bare-fs, …) into react-native-bare-kit's
 * addon folders. Prefer linking each `"addon": true` package under node_modules
 * (the CocoaPods `node link` helper often exits before async bare-link finishes,
 * and walking only the repo root can miss nested addons).
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
    target: ["ios-arm64", "ios-arm64-simulator", "ios-x64-simulator"]
  },
  android: {
    out: join(bareKitRoot, "android/addons"),
    target: ["android-arm", "android-arm64", "android-ia32", "android-x64"]
  }
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

const platform = process.argv[2] === "android" ? "android" : "ios";
const { out, target } = targets[platform];
mkdirSync(out, { recursive: true });

const addons = listAddonPackages(nodeModules);
if (addons.length === 0) {
  throw new Error("No packages with \"addon\": true found under node_modules");
}

for (const addonPath of addons) {
  process.stdout.write(`linking ${addonPath}… `);
  await link(addonPath, { target, out });
  console.log("ok");
}

console.log(`bare addons linked → ${out}`);
console.log(readdirSync(out).join("\n"));
