// SPEC-WIDGET schema generation. The vocabulary authority is the host-side
// constant tables in packages/miniapp-runtime/src/ui/schema.ts — NOT the RN
// renderer. This script serializes those tables into
// specs/spec-widget/schema/widget.schema.json (including update-stream ops
// from ui/diff.ts). Regenerate with: npm run generate:widget-schema
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXTRA_PROP_SCHEMAS,
  EXTRA_REQUIRED,
  STYLE_VALUE_SCHEMAS,
  WIDGET_PROP_KEYS,
  WIDGET_STYLE_KEYS,
  WIDGET_TYPES,
} from "../packages/miniapp-runtime/dist/ui/schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(
  here,
  "..",
  "specs",
  "spec-widget",
  "schema",
  "widget.schema.json",
);

export function generateWidgetSchema() {
  const styleProperties = {};
  for (const key of [...WIDGET_STYLE_KEYS].sort()) {
    const value = STYLE_VALUE_SCHEMAS[key];
    if (value === undefined) {
      throw new Error(
        `WIDGET_STYLE_KEYS has key "${key}" with no value schema — update ui/schema.ts`,
      );
    }
    styleProperties[key] = value;
  }
  for (const key of Object.keys(STYLE_VALUE_SCHEMAS)) {
    if (!WIDGET_STYLE_KEYS.has(key)) {
      throw new Error(
        `stale style value schema for "${key}" — not in WIDGET_STYLE_KEYS`,
      );
    }
  }

  const typeBranches = [...WIDGET_TYPES].sort().map((type) => {
    const allowed = WIDGET_PROP_KEYS.get(type) ?? new Set();
    const properties = {};
    for (const key of [...allowed].sort()) {
      properties[key] = EXTRA_PROP_SCHEMAS[type]?.[key] ?? true;
    }
    const propsSchema =
      allowed.size === 0
        ? { type: "object", additionalProperties: false }
        : {
            type: "object",
            properties,
            ...(EXTRA_REQUIRED[type] === undefined
              ? {}
              : { required: EXTRA_REQUIRED[type] }),
            additionalProperties: false,
          };
    const branch = {
      type: "object",
      properties: {
        type: { const: type },
        props: propsSchema,
      },
      ...(EXTRA_REQUIRED[type] === undefined ? {} : { required: ["props"] }),
    };
    return branch;
  });

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://twistedpear.dev/specs/spec-widget/schema/widget.schema.json",
    title: "SPEC-WIDGET widget tree and update stream",
    description:
      "Generated from the host-side vocabulary tables in packages/miniapp-runtime/src/ui/schema.ts by scripts/generate-widget-schema.mjs — do not edit by hand. Budgets enforced by the host but not expressible here: 256 KiB serialized, 5000 nodes, depth 32; node ids must additionally be unique per tree.",
    $defs: {
      node: {
        type: "object",
        required: ["id", "type"],
        properties: {
          id: { type: "string", minLength: 1 },
          type: { enum: [...WIDGET_TYPES].sort() },
          props: { type: "object" },
          style: { $ref: "#/$defs/style" },
          children: { type: "array", items: { $ref: "#/$defs/node" } },
        },
        additionalProperties: false,
        allOf: [{ oneOf: typeBranches }],
      },
      style: {
        type: "object",
        properties: styleProperties,
        additionalProperties: false,
      },
      tree: {
        type: "object",
        required: ["root"],
        properties: { root: { $ref: "#/$defs/node" } },
        additionalProperties: false,
      },
      patch: {
        description:
          "Update-stream operation (ui/diff.ts). A replace whose id was absent from the previous frame signals a structural change; hosts always deliver the full next tree alongside the stream.",
        oneOf: [
          {
            type: "object",
            required: ["op", "id", "node"],
            properties: {
              op: { const: "replace" },
              id: { type: "string", minLength: 1 },
              node: { $ref: "#/$defs/node" },
            },
            additionalProperties: false,
          },
          {
            type: "object",
            required: ["op", "id"],
            properties: {
              op: { const: "remove" },
              id: { type: "string", minLength: 1 },
            },
            additionalProperties: false,
          },
        ],
      },
      patchStream: {
        type: "array",
        items: { $ref: "#/$defs/patch" },
      },
    },
  };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) ===
    (await import("node:path")).resolve(process.argv[1]);
if (invokedDirectly) {
  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(generateWidgetSchema(), null, 2) + "\n",
  );
  console.log(`wrote ${OUTPUT_PATH}`);
}
