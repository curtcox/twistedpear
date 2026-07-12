/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
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
