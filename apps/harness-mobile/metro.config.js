const { getDefaultConfig } = require("expo/metro-config");
const fs = require("node:fs");
const path = require("node:path");

const harnessRoot = __dirname;
const repoRoot = path.resolve(harnessRoot, "../..");

const config = getDefaultConfig(harnessRoot);

const nodeEmptyStub = path.resolve(harnessRoot, "stubs/node-empty.web.js");

const webStubs = {
  "sodium-native": path.resolve(harnessRoot, "stubs/sodium-native.web.js"),
  "react-native-bare-kit": path.resolve(harnessRoot, "stubs/bare-kit.web.js"),
  "react-native-webrtc": path.resolve(
    harnessRoot,
    "stubs/react-native-webrtc.web.js",
  ),
  "require-addon": nodeEmptyStub,
  "rocksdb-native": nodeEmptyStub,
  corestore: nodeEmptyStub,
  hyperdrive: nodeEmptyStub,
  hyperswarm: nodeEmptyStub,
  hyperbee: nodeEmptyStub,
};

/** Node built-ins that must not enter the RN host bundle (worklet Bare owns real ones). */
const nativeNodeStubs = {
  "node:os": nodeEmptyStub,
  "node:dgram": nodeEmptyStub,
  "node:net": nodeEmptyStub,
  "node:fs": nodeEmptyStub,
  "node:path": nodeEmptyStub,
  "node:crypto": nodeEmptyStub,
  "node:worker_threads": nodeEmptyStub,
  os: nodeEmptyStub,
  dgram: nodeEmptyStub,
  net: nodeEmptyStub,
  fs: nodeEmptyStub,
  path: nodeEmptyStub,
  crypto: nodeEmptyStub,
};

const packageAliases = {
  "@twistedpear/miniapp-runtime/ui": path.resolve(
    repoRoot,
    "packages/miniapp-runtime/dist/ui/index.js",
  ),
  "@twistedpear/miniapp-runtime/sandbox/web": path.resolve(
    repoRoot,
    "packages/miniapp-runtime/dist/sandbox/web.js",
  ),
};

/**
 * tsconfig.json sets moduleResolution "NodeNext", which requires relative
 * imports to carry the ".js" extension even when the file on disk is .ts/.tsx.
 * Metro takes that extension literally and reports the module as missing, so
 * retry the TypeScript sources when nothing answers to the ".js" itself.
 *
 * No file here has a platform-specific sibling (foo.web.tsx), so a direct
 * extension swap is enough; add a platform pass here if that ever changes.
 */
function resolveTypeScriptSource(context, moduleName) {
  if (!moduleName.startsWith(".") || !moduleName.endsWith(".js")) {
    return null;
  }

  const target = path.resolve(
    path.dirname(context.originModulePath),
    moduleName,
  );
  if (fs.existsSync(target)) {
    return null;
  }

  const stem = target.slice(0, -".js".length);
  for (const extension of [".ts", ".tsx"]) {
    if (fs.existsSync(`${stem}${extension}`)) {
      return { type: "sourceFile", filePath: `${stem}${extension}` };
    }
  }

  return null;
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && webStubs[moduleName] !== undefined) {
    return { type: "sourceFile", filePath: webStubs[moduleName] };
  }

  if (platform !== "web" && nativeNodeStubs[moduleName] !== undefined) {
    return { type: "sourceFile", filePath: nativeNodeStubs[moduleName] };
  }

  if (packageAliases[moduleName] !== undefined) {
    return { type: "sourceFile", filePath: packageAliases[moduleName] };
  }

  const typeScriptSource = resolveTypeScriptSource(context, moduleName);
  if (typeScriptSource !== null) {
    return typeScriptSource;
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
