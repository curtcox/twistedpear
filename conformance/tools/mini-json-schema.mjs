// Minimal JSON Schema (draft 2020-12 subset) validator used by spec conformance
// tests. Supports the keywords the specs/*/schema documents use: $ref (local
// "#/$defs/..." pointers and relative-file refs), type, const, enum, required,
// properties, additionalProperties, items, oneOf, anyOf, pattern, minimum,
// maximum. Deliberately dependency-free — see specs/README.md.
import { readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";

/**
 * Load a schema file and return a validate function. The path may carry a
 * fragment ("schema.json#/$defs/event") to validate against one definition.
 * validate(value) returns an array of "path: message" error strings (empty = valid).
 */
export function createValidator(schemaPath) {
  const cache = new Map();
  const load = (path) => {
    const abs = resolvePath(path);
    let entry = cache.get(abs);
    if (entry === undefined) {
      entry = { doc: JSON.parse(readFileSync(abs, "utf8")), dir: dirname(abs) };
      cache.set(abs, entry);
    }
    return entry;
  };
  const [rootFile, rootPointer = ""] = schemaPath.split("#");
  const rootCtx = load(rootFile);
  let rootSchema = rootCtx.doc;
  if (rootPointer !== "") {
    for (const raw of rootPointer.split("/").slice(1)) {
      const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
      rootSchema = rootSchema?.[key];
    }
    if (rootSchema === undefined) {
      throw new Error(`unresolvable fragment in ${schemaPath}`);
    }
  }

  function resolveRef(ref, ctx) {
    const [file, pointer = ""] = ref.split("#");
    const target = file === "" ? ctx : load(resolvePath(ctx.dir, file));
    let schema = target.doc;
    if (pointer !== "") {
      for (const raw of pointer.split("/").slice(1)) {
        const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
        if (schema === undefined || typeof schema !== "object") break;
        schema = schema[key];
      }
    }
    if (schema === undefined) {
      throw new Error(`unresolvable $ref: ${ref}`);
    }
    return { schema, ctx: target };
  }

  function typeMatches(value, type) {
    switch (type) {
      case "null":
        return value === null;
      case "boolean":
        return typeof value === "boolean";
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number";
      case "integer":
        return typeof value === "number" && Number.isInteger(value);
      case "array":
        return Array.isArray(value);
      case "object":
        return (
          typeof value === "object" && value !== null && !Array.isArray(value)
        );
      default:
        throw new Error(`unsupported type keyword: ${type}`);
    }
  }

  function check(value, schema, ctx, path, errors) {
    if (schema === true) return;
    if (schema === false) {
      errors.push(`${path}: schema false forbids all values`);
      return;
    }
    if (typeof schema.$ref === "string") {
      const resolved = resolveRef(schema.$ref, ctx);
      check(value, resolved.schema, resolved.ctx, path, errors);
    }
    if (schema.type !== undefined) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some((type) => typeMatches(value, type))) {
        errors.push(`${path}: expected type ${types.join("|")}`);
        return;
      }
    }
    if (schema.const !== undefined && !deepEqual(value, schema.const)) {
      errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
    }
    if (
      schema.enum !== undefined &&
      !schema.enum.some((item) => deepEqual(value, item))
    ) {
      errors.push(`${path}: not one of enum ${JSON.stringify(schema.enum)}`);
    }
    if (typeof value === "string") {
      if (
        schema.pattern !== undefined &&
        !new RegExp(schema.pattern).test(value)
      ) {
        errors.push(`${path}: does not match pattern ${schema.pattern}`);
      }
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path}: shorter than minLength ${schema.minLength}`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`${path}: longer than maxLength ${schema.maxLength}`);
      }
    }
    if (schema.allOf !== undefined) {
      for (const branch of schema.allOf) {
        check(value, branch, ctx, path, errors);
      }
    }
    if (typeof value === "number") {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path}: below minimum ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path}: above maximum ${schema.maximum}`);
      }
    }
    if (schema.oneOf !== undefined) {
      const matches = schema.oneOf.filter((branch) => {
        const branchErrors = [];
        check(value, branch, ctx, path, branchErrors);
        return branchErrors.length === 0;
      });
      if (matches.length !== 1) {
        errors.push(
          `${path}: matched ${matches.length} oneOf branches, expected exactly 1`,
        );
      }
    }
    if (schema.anyOf !== undefined) {
      const matched = schema.anyOf.some((branch) => {
        const branchErrors = [];
        check(value, branch, ctx, path, branchErrors);
        return branchErrors.length === 0;
      });
      if (!matched) {
        errors.push(`${path}: matched no anyOf branch`);
      }
    }
    if (Array.isArray(value) && schema.items !== undefined) {
      value.forEach((item, index) => {
        check(item, schema.items, ctx, `${path}/${index}`, errors);
      });
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      for (const key of schema.required ?? []) {
        if (!(key in value)) {
          errors.push(`${path}: missing required property "${key}"`);
        }
      }
      const properties = schema.properties ?? {};
      for (const [key, item] of Object.entries(value)) {
        if (key in properties) {
          check(item, properties[key], ctx, `${path}/${key}`, errors);
        } else if (schema.additionalProperties === false) {
          errors.push(`${path}: unexpected property "${key}"`);
        } else if (schema.additionalProperties !== undefined) {
          check(
            item,
            schema.additionalProperties,
            ctx,
            `${path}/${key}`,
            errors,
          );
        }
      }
    }
  }

  return (value) => {
    const errors = [];
    check(value, rootSchema, rootCtx, "", errors);
    return errors;
  };
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  )
    return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(a[key], b[key]));
}
