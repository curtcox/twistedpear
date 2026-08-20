#!/usr/bin/env node
// Generate Guida SDK bindings, the JS shim, and the cookbook capability map
// from specs/spec-sdk/schema/calls.descriptor.json.
// Regenerated with: npm run generate:guida-sdk
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const DESCRIPTOR_PATH = join(
  ROOT,
  "specs",
  "spec-sdk",
  "schema",
  "calls.descriptor.json",
);
const SDK_DIR = join(
  ROOT,
  "packages",
  "guida-twistedpear",
  "elm",
  "TwistedPear",
  "Sdk",
);
const SHIM_PATH = join(
  ROOT,
  "packages",
  "guida-twistedpear",
  "src",
  "shim.generated.js",
);
const CAPS_PATH = join(
  ROOT,
  "specs",
  "spec-sdk",
  "schema",
  "api-capabilities.json",
);

const HEADER = `{-\n   Generated from specs/spec-sdk/schema/calls.descriptor.json\n   by scripts/generate-guida-sdk.mjs — do not edit by hand.\n   Regenerated with: npm run generate:guida-sdk\n-}\n`;

function elmModuleName(namespace) {
  return namespace
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function elmFnName(method) {
  if (method === "packageProject") return "packageProject";
  return method;
}

function resultDecoder(result) {
  switch (result) {
    case "void":
      return "Core.voidResult";
    case "string":
      return "Core.string";
    case "bytes":
      return "Core.bytes";
    case "bytes?":
      return "Core.maybeBytes";
    default:
      return "Core.json";
  }
}

function resultType(result) {
  switch (result) {
    case "void":
      return "()";
    case "string":
      return "String";
    case "bytes":
      return "(List Int)";
    case "bytes?":
      return "(Maybe (List Int))";
    default:
      return "D.Value";
  }
}

function argType(type) {
  switch (type) {
    case "string":
      return "String";
    case "int":
      return "Int";
    case "bool":
      return "Bool";
    case "bytes":
      return "(List Int)";
    default:
      return "D.Value";
  }
}

function encodeArg(arg) {
  switch (arg.type) {
    case "string":
      return `E.string ${arg.name}`;
    case "int":
      return `E.int ${arg.name}`;
    case "bool":
      return `E.bool ${arg.name}`;
    case "bytes":
      return `Core.encodeBytes ${arg.name}`;
    default:
      return arg.name;
  }
}

function elmFunction(call) {
  const name = elmFnName(call.method);
  const args = call.args ?? [];
  const params = args.map((arg) => arg.name);
  const signatureArgs = args.map((arg) => argType(arg.type));
  const toMsg = `(Result Error ${resultType(call.result)} -> msg)`;
  const signature = [...signatureArgs, toMsg, "Effect msg"].join(" -> ");
  const payload =
    args.length === 0
      ? "E.null"
      : `E.object [ ${args.map((arg) => `( "${arg.name}", ${encodeArg(arg)} )`).join(", ")} ]`;
  return `
${name} : ${signature}
${name} ${[...params, "toMsg"].join(" ")} =
    Core.typed "${call.namespace}" "${call.method}" (${payload}) ${resultDecoder(call.result)} toMsg
`;
}

function generateElmModule(moduleName, calls) {
  const names = calls
    .filter((call) => !call.skipBinding)
    .map((call) => elmFnName(call.method));
  const body = calls
    .filter((call) => !call.skipBinding)
    .map(elmFunction)
    .join("\n");
  return `${HEADER}
module TwistedPear.Sdk.${moduleName} exposing
    ( ${names.join(", ")} )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)

${body}
`;
}

function generateShim(calls) {
  const cases = calls
    .filter((call) => !call.skipBinding)
    .map((call) => {
      const path = ["sdk", ...call.sdkPath].join(".");
      const args = (call.args ?? [])
        .map((arg) => {
          const access = `frame.payload && frame.payload.${arg.name}`;
          if (arg.type === "bytes") return `asBytes(${access})`;
          return access;
        })
        .join(", ");
      const invoke = args.length === 0 ? `${path}()` : `${path}(${args})`;
      return `      if (frame.namespace === ${JSON.stringify(call.namespace)} && frame.method === ${JSON.stringify(call.method)}) {\n        return ${invoke};\n      }`;
    })
    .join("\n");

  const iife = `(function (sdk) {
  var app = Elm.Main.init({ flags: null });
  if (!app.ports || !app.ports.tpOut || !app.ports.tpIn) {
    throw new Error("Guida program is missing tpOut/tpIn ports");
  }
  function send(value) { app.ports.tpIn.send(value); }
  function asBytes(value) {
    if (value == null) return value;
    if (value instanceof Uint8Array) return value;
    if (Array.isArray(value)) return Uint8Array.from(value);
    return value;
  }
  function dispatchCall(frame) {
${cases}
    return Promise.reject(new Error("unknown Guida SDK call: " + frame.namespace + "." + frame.method));
  }
  function reply(id, ok, result, error) {
    var frame = { type: "reply", id: id, ok: ok };
    if (ok) frame.result = result === undefined ? null : result;
    else frame.error = error;
    send(frame);
  }
  app.ports.tpOut.subscribe(function (frame) {
    if (frame.type === "render") { sdk.ui.render(frame.tree); return; }
    if (frame.type !== "call") return;
    Promise.resolve()
      .then(function () { return dispatchCall(frame); })
      .then(function (result) { reply(frame.id, true, result, null); })
      .catch(function (err) {
        reply(frame.id, false, null, {
          code: err && err.code ? err.code : "BROKER_ERROR",
          message: err && err.message ? err.message : String(err)
        });
      });
  });
  sdk.ui.onEvent(function (event) {
    send({ type: "event", nodeId: event.nodeId, event: event.event, value: event.value });
  });
  send({ type: "boot" });
})(sdk);
`;

  return `// Generated from specs/spec-sdk/schema/calls.descriptor.json
// by scripts/generate-guida-sdk.mjs — do not edit by hand.
export const GUIDA_SHIM_SOURCE = ${JSON.stringify(iife)};
`;
}

function generateCapabilities(calls) {
  const map = {};
  for (const call of calls) {
    if (!call.capability) continue;
    const key = call.scanPrefix ?? call.id;
    map[key] = call.capability;
  }
  return map;
}

function updatePackageElmJson(moduleNames) {
  const elmJsonPath = join(
    ROOT,
    "packages",
    "guida-twistedpear",
    "elm.json",
  );
  const elmJson = JSON.parse(readFileSync(elmJsonPath, "utf8"));
  const handwritten = [
    "TwistedPear.Program",
    "TwistedPear.Effect",
    "TwistedPear.Widget",
    "TwistedPear.Style",
    "TwistedPear.Sdk.Error",
    "TwistedPear.Sdk.Core",
  ];
  const generated = moduleNames.map((name) => `TwistedPear.Sdk.${name}`);
  elmJson["exposed-modules"] = [...handwritten, ...generated];
  writeFileSync(elmJsonPath, `${JSON.stringify(elmJson, null, 4)}\n`);
}

export function generateGuidaSdk(descriptorPath = DESCRIPTOR_PATH) {
  const descriptor = JSON.parse(readFileSync(descriptorPath, "utf8"));
  const calls = descriptor.calls;
  mkdirSync(SDK_DIR, { recursive: true });

  const byModule = new Map();
  for (const call of calls) {
    if (call.skipBinding) continue;
    const moduleName = elmModuleName(call.namespace);
    const list = byModule.get(moduleName) ?? [];
    list.push(call);
    byModule.set(moduleName, list);
  }

  const written = [];
  for (const [moduleName, moduleCalls] of byModule) {
    const path = join(SDK_DIR, `${moduleName}.elm`);
    writeFileSync(path, generateElmModule(moduleName, moduleCalls));
    written.push(path);
  }
  updatePackageElmJson([...byModule.keys()]);

  mkdirSync(dirname(SHIM_PATH), { recursive: true });
  writeFileSync(SHIM_PATH, generateShim(calls));
  writeFileSync(CAPS_PATH, `${JSON.stringify(generateCapabilities(calls), null, 2)}\n`);
  return { modules: written, shimPath: SHIM_PATH, capsPath: CAPS_PATH };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) ===
    (await import("node:path")).resolve(process.argv[1]);
if (invokedDirectly) {
  const written = generateGuidaSdk();
  for (const path of written.modules) console.log(`wrote ${path}`);
  console.log(`wrote ${written.shimPath}`);
  console.log(`wrote ${written.capsPath}`);
}
