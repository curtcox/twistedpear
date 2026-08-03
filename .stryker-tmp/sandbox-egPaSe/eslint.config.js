// @ts-nocheck
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import eslintComments from "eslint-plugin-eslint-comments";

/**
 * Sans-IO ESLint rules scoped to protocol roots.
 * Deny list mirrors docs/sansio.md. Inline disables are forbidden.
 */
const protocolGlobs = [
  "packages/protocol/src/**/*.{ts,tsx}",
  "packages/reticulum-ts/src/**/*.{ts,tsx}",
  "packages/lxmf-ts/src/**/*.{ts,tsx}",
  "packages/miniapp-runtime/src/**/*.{ts,tsx}",
  "packages/reticulum-interfaces/src/**/*.{ts,tsx}"
];

const adapterIgnores = [
  "packages/reticulum-ts/src/runtime/**",
  "packages/reticulum-ts/src/interfaces/tcp.ts",
  "packages/reticulum-ts/src/interfaces/udp.ts",
  "packages/reticulum-ts/src/interfaces/websocket-client.ts",
  "packages/reticulum-ts/src/interfaces/websocket-server.ts",
  "packages/reticulum-ts/src/crypto/node.ts",
  "packages/reticulum-ts/src/crypto/bare.ts",
  "packages/reticulum-ts/src/crypto/pure.ts",
  "packages/reticulum-ts/src/web-identity.ts",
  "packages/reticulum-ts/src/web.ts",
  "packages/reticulum-ts/src/worklet.ts",
  "packages/miniapp-runtime/src/sandbox/**",
  "packages/miniapp-runtime/src/services/**",
  "packages/miniapp-runtime/src/host.ts",
  "packages/miniapp-runtime/src/worklet.ts",
  "packages/reticulum-interfaces/src/auto.ts",
  "packages/reticulum-interfaces/src/auto-bridge.ts",
  "packages/reticulum-interfaces/src/bonjour.ts",
  "packages/reticulum-interfaces/src/bonjour-mdns.ts",
  "packages/reticulum-interfaces/src/multicast-node.ts",
  "packages/reticulum-interfaces/src/serial-node.ts",
  "packages/reticulum-interfaces/src/i2p.ts",
  "packages/reticulum-interfaces/src/ble/interface.ts",
  "packages/reticulum-interfaces/src/ble/sim.ts",
  "packages/reticulum-interfaces/src/optical/interface.ts",
  "packages/reticulum-interfaces/src/optical/sim.ts",
  "packages/reticulum-interfaces/src/acoustic/interface.ts",
  "packages/reticulum-interfaces/src/acoustic/sim.ts",
  "packages/reticulum-interfaces/src/rnode/interface.ts",
  "**/dist/**",
  "**/node_modules/**"
];

const restrictedGlobals = [
  "fetch",
  "WebSocket",
  "XMLHttpRequest",
  "localStorage",
  "sessionStorage",
  "requestAnimationFrame",
  "setImmediate",
  "queueMicrotask"
];

const restrictedSyntax = [
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: "Sans-IO: use injected Clock instead of Date.now"
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: "Sans-IO: use injected Clock instead of new Date()"
  },
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: "Sans-IO: use injected Entropy instead of Math.random"
  },
  {
    selector: "CallExpression[callee.object.name='performance'][callee.property.name='now']",
    message: "Sans-IO: use injected Clock instead of performance.now"
  },
  {
    selector: "CallExpression[callee.name='setTimeout']",
    message: "Sans-IO: declare timer/set intent instead of setTimeout"
  },
  {
    selector: "CallExpression[callee.name='setInterval']",
    message: "Sans-IO: declare timer/set intent instead of setInterval"
  },
  {
    selector: "CallExpression[callee.object.name='console']",
    message: "Sans-IO: emit a log intent instead of console.*"
  },
  {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message: "Sans-IO: process.env is forbidden in protocol modules"
  },
  {
    selector: "CallExpression[callee.object.name='crypto'][callee.property.name='getRandomValues']",
    message: "Sans-IO: use injected Entropy instead of crypto.getRandomValues"
  },
  {
    selector: "CallExpression[callee.object.name='crypto'][callee.property.name='randomUUID']",
    message: "Sans-IO: use injected Entropy instead of crypto.randomUUID"
  }
];

const restrictedImports = [
  {
    paths: [
      {
        name: "node:fs",
        message: "Sans-IO: Store intents only — no fs in protocol"
      },
      {
        name: "node:net",
        message: "Sans-IO: Transport intents only — no net in protocol"
      },
      {
        name: "node:dgram",
        message: "Sans-IO: Transport intents only — no dgram in protocol"
      },
      {
        name: "node:http",
        message: "Sans-IO: Transport intents only — no http in protocol"
      },
      {
        name: "node:https",
        message: "Sans-IO: Transport intents only — no https in protocol"
      },
      {
        name: "node:tls",
        message: "Sans-IO: Transport intents only — no tls in protocol"
      },
      {
        name: "node:os",
        message: "Sans-IO: no os.* in protocol"
      },
      {
        name: "node:crypto",
        message: "Sans-IO: crypto algorithms via pure libs; entropy via Entropy"
      },
      {
        name: "fs",
        message: "Sans-IO: Store intents only — no fs in protocol"
      },
      {
        name: "net",
        message: "Sans-IO: Transport intents only — no net in protocol"
      },
      {
        name: "dgram",
        message: "Sans-IO: Transport intents only — no dgram in protocol"
      }
    ],
    patterns: [
      {
        group: ["**/adapters/**", "**/adapters/real/**", "**/adapters/sim/**"],
        message: "Sans-IO: protocol must not import adapters (dependency direction is adapters → protocol)"
      },
      {
        group: ["uuid", "nanoid", "node-fetch", "ws", "serialport", "async-storage", "@react-native-async-storage/**"],
        message: "Sans-IO: forbidden IO/random dependency"
      }
    ]
  }
];

export default [
  js.configs.recommended,
  {
    ignores: ["**/dist/**", "**/node_modules/**", "apps/**", "conformance/**", "scripts/**"]
  },
  {
    files: protocolGlobs,
    ignores: adapterIgnores,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module"
      },
      globals: {
        Uint8Array: "readonly",
        ArrayBuffer: "readonly",
        DataView: "readonly",
        Map: "readonly",
        Set: "readonly",
        Promise: "readonly",
        Error: "readonly",
        console: "readonly",
        process: "readonly",
        Date: "readonly",
        Math: "readonly",
        crypto: "readonly",
        performance: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        WebSocket: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "eslint-comments": eslintComments
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-restricted-globals": ["error", ...restrictedGlobals],
      "no-restricted-syntax": ["error", ...restrictedSyntax],
      "no-restricted-imports": ["error", ...restrictedImports],
      "eslint-comments/no-restricted-disable": [
        "error",
        "no-restricted-globals",
        "no-restricted-syntax",
        "no-restricted-imports"
      ],
      "eslint-comments/no-unlimited-disable": "error"
    }
  }
];
