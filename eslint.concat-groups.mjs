import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as espree from "espree";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/**
 * Sources that are concatenated into one script rather than loaded as modules.
 *
 * A member may reference anything any other member declares, so eslint reading
 * one in isolation reports every such reference as no-undef. Turning the rule
 * off would also stop it catching the reference-to-nothing bugs it exists for,
 * so instead the members are parsed as the build concatenates them and handed
 * the resulting top-level declarations as globals. A name no member declares is
 * still reported.
 *
 * apps/harness-mobile/worklet/{,web-}entry-part-*.mjs are concatenated too but
 * are not listed here: their assembled entry.mjs / web-entry.mjs are checked
 * directly, so the parts are ignored instead (see eslint.analysis.config.js).
 *
 * `prologue` is source the assembler emits itself rather than taking from a
 * member — apps/handbook/build.mjs writes `const CATALOG = …` above the runtime.
 */
export const CONCAT_GROUPS = [
  {
    name: "handbook-runtime",
    assembledBy: "apps/handbook/build.mjs",
    prologue: "const CATALOG = {};",
    members: [
      "apps/handbook/src/runtime-render.js",
      "apps/handbook/src/runtime-devstudio.js",
      "apps/handbook/src/runtime-applets.js",
      "apps/handbook/src/runtime.js",
    ],
  },
];

function collectPatternNames(pattern, names) {
  if (pattern === null || pattern === undefined) return;
  switch (pattern.type) {
    case "Identifier":
      names.add(pattern.name);
      return;
    case "ObjectPattern":
      for (const property of pattern.properties)
        collectPatternNames(
          property.type === "RestElement" ? property.argument : property.value,
          names,
        );
      return;
    case "ArrayPattern":
      for (const element of pattern.elements)
        collectPatternNames(element, names);
      return;
    case "AssignmentPattern":
      collectPatternNames(pattern.left, names);
      return;
    case "RestElement":
      collectPatternNames(pattern.argument, names);
      return;
    default:
      return;
  }
}

/**
 * Every binding the assembled script declares at top level, mapped to how
 * eslint should treat it. `let` and `var` are writable, because a member may
 * legitimately assign to state a sibling declared; anything else is readonly so
 * no-global-assign still catches a write to a const, function, or import.
 */
function assembledDeclarations(group) {
  const source = [
    group.prologue ?? "",
    ...group.members.map((member) =>
      fs.readFileSync(path.join(ROOT, member), "utf8"),
    ),
  ].join("\n");
  const program = espree.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  const declared = new Map();
  const record = (names, access) => {
    for (const name of names) declared.set(name, access);
  };
  for (const node of program.body) {
    const names = new Set();
    switch (node.type) {
      case "VariableDeclaration":
        for (const declaration of node.declarations)
          collectPatternNames(declaration.id, names);
        record(names, node.kind === "const" ? "readonly" : "writable");
        break;
      case "FunctionDeclaration":
      case "ClassDeclaration":
        collectPatternNames(node.id, names);
        record(names, "readonly");
        break;
      case "ImportDeclaration":
        for (const specifier of node.specifiers)
          collectPatternNames(specifier.local, names);
        record(names, "readonly");
        break;
      default:
        break;
    }
  }

  return declared;
}

/** Flat-config blocks giving each concat member the assembled script's scope. */
export function concatGroupConfigs() {
  return CONCAT_GROUPS.map((group) => ({
    name: `concat-group:${group.name}`,
    files: group.members,
    languageOptions: {
      globals: Object.fromEntries(assembledDeclarations(group)),
    },
    // Members are linted in isolation; a binding used only by a sibling is
    // unused here even though the assembled script uses it.
    rules: {
      "no-unused-vars": "off",
    },
  }));
}
