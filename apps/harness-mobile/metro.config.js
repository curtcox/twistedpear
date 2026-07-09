const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const harnessRoot = __dirname;
const repoRoot = path.resolve(harnessRoot, "../..");

const config = getDefaultConfig(harnessRoot);

const nodeEmptyStub = path.resolve(harnessRoot, "stubs/node-empty.web.js");

const webStubs = {
  "sodium-native": path.resolve(harnessRoot, "stubs/sodium-native.web.js"),
  "react-native-bare-kit": path.resolve(harnessRoot, "stubs/bare-kit.web.js"),
  "require-addon": nodeEmptyStub,
  "rocksdb-native": nodeEmptyStub,
  corestore: nodeEmptyStub,
  hyperdrive: nodeEmptyStub,
  hyperswarm: nodeEmptyStub,
  hyperbee: nodeEmptyStub
};

const packageAliases = {
  "@twistedpear/miniapp-runtime/ui": path.resolve(repoRoot, "packages/miniapp-runtime/dist/ui/index.js"),
  "@twistedpear/miniapp-runtime/sandbox/web": path.resolve(
    repoRoot,
    "packages/miniapp-runtime/dist/sandbox/web.js"
  )
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && webStubs[moduleName] !== undefined) {
    return { type: "sourceFile", filePath: webStubs[moduleName] };
  }

  if (packageAliases[moduleName] !== undefined) {
    return { type: "sourceFile", filePath: packageAliases[moduleName] };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
