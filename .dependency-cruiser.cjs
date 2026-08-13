/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Package and app imports must remain acyclic.",
      from: { path: "^(packages|apps|scripts|conformance)/" },
      to: {
        circular: true,
        // Type-only imports are erased by TypeScript and cannot create a
        // runtime initialization cycle. Keep rejecting every cycle made only
        // of executable dependencies while allowing type contracts to point
        // back toward their concrete implementations.
        viaOnly: { dependencyTypesNot: ["type-only"] },
      },
    },
    {
      name: "no-tooling-in-source",
      severity: "error",
      comment:
        "Shipped code must never import build scripts or conformance harnesses.",
      from: {
        path: "^(packages|apps)/",
        pathNot: "(^|/)test/|\\.test\\.(ts|tsx|js|mjs)$",
      },
      to: {
        path: "^(scripts|conformance)/",
        // Two Bare-runtime polyfills that the desktop and mobile worklet
        // entry points load before anything else. They are genuine violations
        // — shipped code reaching into the conformance tree — but they are
        // also named in two build scripts, two generated import maps and a
        // committed bundle manifest, so moving them is its own change. Listed
        // here rather than baselined because the structure ratchet fails on
        // baseline growth, and tracked in docs/complexity-gates.md.
        pathNot:
          "^conformance/bare-interop/bare-globals\\.mjs$|^conformance/freenet-spike/bare-websocket-shim\\.mjs$",
      },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment:
        "New source files must be reachable from a package, app, script, or test entry point.",
      from: {
        orphan: true,
        path: "^(packages|apps)/",
        pathNot:
          "(^|/)(index|main|entry|setup-tripwire|.*\\.test)\\.(ts|tsx|js|mjs)$|\\.gen\\.ts$",
      },
      to: {},
    },
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment:
        "Production sources may not import packages declared only as devDependencies.",
      from: { path: "^(packages|apps)/.+/src/" },
      to: { dependencyTypes: ["npm-dev"] },
    },
    {
      name: "no-duplicate-dep-types",
      severity: "warn",
      comment: "A dependency should be declared in one dependency section.",
      from: {},
      to: { moreThanOneDependencyType: true },
    },
    {
      name: "protocol-no-adapters",
      severity: "error",
      comment: "Protocol modules must never import adapters (Sans-IO).",
      from: {
        path: "^packages/(protocol|reticulum-ts|lxmf-ts|miniapp-runtime|reticulum-interfaces)/src",
        pathNot:
          "^packages/reticulum-ts/src/runtime/|^packages/reticulum-ts/src/interfaces/(tcp|udp|websocket)|^packages/reticulum-ts/src/crypto/(node|bare|pure)\\.ts$|^packages/reticulum-ts/src/web|^packages/reticulum-ts/src/worklet\\.ts$|^packages/miniapp-runtime/src/(sandbox|services|host\\.ts|worklet\\.ts)|^packages/reticulum-interfaces/src/(auto|bonjour|multicast|serial|i2p|ble/(interface|sim)|rnode/interface)",
      },
      to: {
        path: "packages/effects/src/adapters|/adapters/(real|sim)/",
      },
    },
    {
      name: "protocol-package-pure",
      severity: "error",
      comment:
        "@twistedpear/protocol must stay free of Node builtins and adapters.",
      from: { path: "^packages/protocol/src" },
      to: {
        path: "node:|^(fs|net|dgram|tls|http|https|os|crypto)$|adapters/",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "^(apps/harness-mobile/(android|ios)|apps/handbook/(generated|seeds)|apps/host-desktop/packages|packages/reticulum-ts/docs/api|conformance/docs/\\.tmp-handbook-capture)/",
    },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
  },
};
