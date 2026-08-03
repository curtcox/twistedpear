// @ts-nocheck
// SPEC-EVENTS authority inversion: generate the TypeScript event/intent
// alphabet from the normative JSON Schema. The generated file is committed
// (packages/effects/src/types.gen.ts); packages/effects/test/spec-events.test.ts
// fails if it drifts from the schema. Regenerate with:
//   npm run generate:event-types
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(here, "..", "specs", "spec-events", "schema", "events.schema.json");
const OUTPUT_PATH = join(here, "..", "packages", "effects", "src", "types.gen.ts");

export function generateEventTypes(schemaPath = SCHEMA_PATH) {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const defs = schema.$defs;

  const resolve = (ref) => {
    const key = ref.replace("#/$defs/", "");
    const target = defs[key];
    if (target === undefined) throw new Error(`unresolvable $ref: ${ref}`);
    return target;
  };

  const typeOf = (node) => {
    if (typeof node.$ref === "string") {
      const target = resolve(node.$ref);
      if (typeof target["x-ts"] === "string") return target["x-ts"];
      if (typeof target.title === "string") return target.title;
      return typeOf(target);
    }
    if (node.enum !== undefined) return node.enum.map((item) => JSON.stringify(item)).join(" | ");
    if (node.const !== undefined) return JSON.stringify(node.const);
    if (node.oneOf !== undefined) return node.oneOf.map(typeOf).join(" | ");
    if (node.type === "string") return "string";
    if (node.type === "number") return "number";
    if (node.type === "boolean") return "boolean";
    if (node.type === "object") return inlineObject(node);
    throw new Error(`cannot map schema node to TypeScript: ${JSON.stringify(node)}`);
  };

  const propertyLine = (name, node, required) => {
    const type = typeOf(node);
    if (required.includes(name)) return `readonly ${name}: ${type}`;
    if (node["x-presence"] === "explicit-undefined") return `readonly ${name}: ${type} | undefined`;
    return `readonly ${name}?: ${type}`;
  };

  const inlineObject = (node) => {
    const required = node.required ?? [];
    const parts = Object.entries(node.properties).map(([name, child]) =>
      propertyLine(name, child, required)
    );
    return `{ ${parts.join("; ")} }`;
  };

  const docComment = (text, indent = "") => {
    if (text === undefined) return "";
    return `${indent}/**\n${text
      .match(/.{1,76}(\s|$)/g)
      .map((line) => `${indent} * ${line.trim()}`)
      .join("\n")}\n${indent} */\n`;
  };

  const emitAlias = (key) => {
    const def = defs[key];
    return `${docComment(def.description)}export type ${def.title} = ${def.type};\n`;
  };

  const emitInterface = (key) => {
    const def = defs[key];
    const required = def.required ?? [];
    const lines = Object.entries(def.properties).map(
      ([name, child]) => `  ${propertyLine(name, child, required)};`
    );
    return `${docComment(def.description)}export interface ${def.title} {\n${lines.join("\n")}\n}\n`;
  };

  const emitUnion = (name, variants, description) => {
    const members = variants.map((variant) => `  | ${typeOf(variant)}`);
    return `${docComment(description)}export type ${name} =\n${members.join("\n")};\n`;
  };

  const out = [];
  out.push("// GENERATED FILE — DO NOT EDIT.");
  out.push("// Source of truth: specs/spec-events/schema/events.schema.json (SPEC-EVENTS).");
  out.push("// Regenerate with: npm run generate:event-types");
  out.push("");
  out.push(emitAlias("instantMs"));
  out.push(emitAlias("timerId"));
  out.push(emitAlias("nodeId"));
  out.push(emitInterface("timerRequest"));
  out.push(emitInterface("timerCancel"));
  out.push(emitInterface("transportSend"));
  out.push(emitInterface("storeRead"));
  out.push(emitInterface("storeWrite"));
  out.push(emitInterface("storeDelete"));
  out.push(
    `export type ${defs.dolevYaoPower.title} = ${defs.dolevYaoPower.enum
      .map((item) => JSON.stringify(item))
      .join(" | ")};\n`
  );
  out.push(
    emitUnion(
      defs.transportAdversaryAction.title,
      defs.transportAdversaryAction.oneOf,
      defs.transportAdversaryAction.description
    )
  );
  out.push(
    emitUnion(
      "Intent",
      [...defs.machineIntent.oneOf, ...defs.harnessIntent.oneOf],
      "Machine intents (machine → host) plus the transport/adversary harness extension. Production bindings may restrict to the machineIntent group of the schema."
    )
  );
  out.push(emitUnion("Event", defs.event.oneOf, defs.event.description));
  return out.join("\n");
}

const invokedDirectly = process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === (await import("node:path")).resolve(process.argv[1]);
if (invokedDirectly) {
  writeFileSync(OUTPUT_PATH, generateEventTypes());
  console.log(`wrote ${OUTPUT_PATH}`);
}
