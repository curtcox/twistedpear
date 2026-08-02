/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Package and app imports must remain acyclic.",
      from: { path: "^(packages|apps)/" },
      to: { circular: true }
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "New source files must be reachable from a package, app, script, or test entry point.",
      from: {
        orphan: true,
        path: "^(packages|apps)/",
        pathNot: "(^|/)(index|main|entry|setup-tripwire|.*\\.test)\\.(ts|tsx|js|mjs)$|\\.gen\\.ts$"
      },
      to: {}
    },
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment: "Production sources may not import packages declared only as devDependencies.",
      from: { path: "^(packages|apps)/.+/src/" },
      to: { dependencyTypes: ["npm-dev"] }
    },
    {
      name: "no-duplicate-dep-types",
      severity: "warn",
      comment: "A dependency should be declared in one dependency section.",
      from: {},
      to: { moreThanOneDependencyType: true }
    },
    {
      name: "protocol-no-adapters",
      severity: "error",
      comment: "Protocol modules must never import adapters (Sans-IO).",
      from: {
        path: "^packages/(protocol|reticulum-ts|lxmf-ts|miniapp-runtime|reticulum-interfaces)/src",
        pathNot:
          "^packages/reticulum-ts/src/runtime/|^packages/reticulum-ts/src/interfaces/(tcp|udp|websocket)|^packages/reticulum-ts/src/crypto/(node|bare|pure)\\.ts$|^packages/reticulum-ts/src/web|^packages/reticulum-ts/src/worklet\\.ts$|^packages/miniapp-runtime/src/(sandbox|services|host\\.ts|worklet\\.ts)|^packages/reticulum-interfaces/src/(auto|bonjour|multicast|serial|i2p|ble/(interface|sim)|rnode/interface)"
      },
      to: {
        path: "packages/effects/src/adapters|/adapters/(real|sim)/"
      }
    },
    {
      name: "protocol-package-pure",
      severity: "error",
      comment: "@twistedpear/protocol must stay free of Node builtins and adapters.",
      from: { path: "^packages/protocol/src" },
      to: {
        path: "node:|^(fs|net|dgram|tls|http|https|os|crypto)$|adapters/"
      }
    }
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    combinedDependencies: true
  }
};
