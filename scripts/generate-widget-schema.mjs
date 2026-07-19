// SPEC-WIDGET schema generation. The vocabulary authority is the host-side
// constant tables in packages/miniapp-runtime/src/ui/schema.ts (WIDGET_TYPES,
// WIDGET_PROP_KEYS, WIDGET_STYLE_KEYS and the code-editor/qr-code limits) —
// NOT the RN renderer. This script reads those constants from the compiled
// runtime and emits specs/spec-widget/schema/widget.schema.json, which also
// carries the update-stream (diff) operations from ui/diff.ts.
//
// Style *value* constraints mirror the WidgetStyle type in the same
// ui/schema.ts file; they are maintained here as data because the constant
// tables only enumerate keys. Regenerate with: npm run generate:widget-schema
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CODE_EDITOR_LANGUAGES,
  MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH,
  MAX_QR_CODE_VALUE_LENGTH,
  WIDGET_PROP_KEYS,
  WIDGET_STYLE_KEYS,
  WIDGET_TYPES
} from "../packages/miniapp-runtime/dist/ui/schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(here, "..", "specs", "spec-widget", "schema", "widget.schema.json");

// Mirrors the WidgetStyle type in packages/miniapp-runtime/src/ui/schema.ts.
const STYLE_VALUE_SCHEMAS = {
  display: { enum: ["flex", "none"] },
  flexDirection: { enum: ["row", "column"] },
  alignItems: { enum: ["stretch", "flex-start", "center", "flex-end"] },
  justifyContent: { enum: ["flex-start", "center", "flex-end", "space-between"] },
  gap: { type: "number" },
  padding: { type: "number" },
  margin: { type: "number" },
  width: { oneOf: [{ type: "number" }, { type: "string", pattern: "^[0-9]+(\\.[0-9]+)?%$" }] },
  height: { oneOf: [{ type: "number" }, { type: "string", pattern: "^[0-9]+(\\.[0-9]+)?%$" }] },
  backgroundColor: { type: "string" },
  color: { type: "string" },
  fontSize: { enum: [12, 14, 16, 20, 24, 32] },
  fontWeight: { enum: ["regular", "medium", "bold"] }
};

// Per-type extra constraints enforced by ui/validate.ts beyond key membership.
const EXTRA_PROP_SCHEMAS = {
  "code-editor": {
    documentId: {
      type: "string",
      minLength: 1,
      maxLength: MAX_CODE_EDITOR_DOCUMENT_ID_LENGTH
    },
    language: { enum: [...CODE_EDITOR_LANGUAGES].sort() }
  },
  "qr-code": {
    value: { type: "string", minLength: 1, maxLength: MAX_QR_CODE_VALUE_LENGTH }
  }
};

const EXTRA_REQUIRED = {
  "code-editor": ["documentId"],
  "qr-code": ["value"]
};

export function generateWidgetSchema() {
  const styleProperties = {};
  for (const key of [...WIDGET_STYLE_KEYS].sort()) {
    const value = STYLE_VALUE_SCHEMAS[key];
    if (value === undefined) {
      throw new Error(`WIDGET_STYLE_KEYS has key "${key}" with no value schema — update generate-widget-schema.mjs`);
    }
    styleProperties[key] = value;
  }
  for (const key of Object.keys(STYLE_VALUE_SCHEMAS)) {
    if (!WIDGET_STYLE_KEYS.has(key)) {
      throw new Error(`stale style value schema for "${key}" — not in WIDGET_STYLE_KEYS`);
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
            ...(EXTRA_REQUIRED[type] === undefined ? {} : { required: EXTRA_REQUIRED[type] }),
            additionalProperties: false
          };
    const branch = {
      type: "object",
      properties: {
        type: { const: type },
        props: propsSchema
      },
      ...(EXTRA_REQUIRED[type] === undefined ? {} : { required: ["props"] })
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
          children: { type: "array", items: { $ref: "#/$defs/node" } }
        },
        additionalProperties: false,
        allOf: [{ oneOf: typeBranches }]
      },
      style: {
        type: "object",
        properties: styleProperties,
        additionalProperties: false
      },
      tree: {
        type: "object",
        required: ["root"],
        properties: { root: { $ref: "#/$defs/node" } },
        additionalProperties: false
      },
      patch: {
        description: "Update-stream operation (ui/diff.ts). A replace whose id was absent from the previous frame signals a structural change; hosts always deliver the full next tree alongside the stream.",
        oneOf: [
          {
            type: "object",
            required: ["op", "id", "node"],
            properties: {
              op: { const: "replace" },
              id: { type: "string", minLength: 1 },
              node: { $ref: "#/$defs/node" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["op", "id"],
            properties: {
              op: { const: "remove" },
              id: { type: "string", minLength: 1 }
            },
            additionalProperties: false
          }
        ]
      },
      patchStream: {
        type: "array",
        items: { $ref: "#/$defs/patch" }
      }
    }
  };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === (await import("node:path")).resolve(process.argv[1]);
if (invokedDirectly) {
  writeFileSync(OUTPUT_PATH, JSON.stringify(generateWidgetSchema(), null, 2) + "\n");
  console.log(`wrote ${OUTPUT_PATH}`);
}
