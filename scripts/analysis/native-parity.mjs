#!/usr/bin/env node
/**
 * Cross-language constant parity for the native bridges.
 *
 * `swift-tests` and `kotlin-tests` each run one language's suite against that
 * language's own copy of the BLE spec, and both pass. `unit-tests` does the same
 * for TypeScript. None of them compares the copies, and the copies are typed by
 * hand: four GATT UUIDs and an identity beacon size in Swift and Kotlin, and the
 * default ATT MTU in five places across four files. A transposed digit in one
 * UUID is green everywhere in this repository and shows up as an iPhone that
 * cannot see an Android device — hardware-gated work that reports as a radio
 * problem rather than as a typo.
 *
 * `conformance/native-parity/ble-bridge.json` is the single declaration. This
 * gate extracts the same names from each implementation and compares them
 * against it, and against the normative document when a row asks for it.
 *
 * Extraction is textual. A real Swift and Kotlin parser here would need Xcode
 * and Gradle to answer "are these two numbers the same", which would make the
 * gate run on one runner and skip on the rest — the arrangement that let the
 * copies drift apart in the first place. The cost of the shortcut is that a
 * declaration style this extractor does not recognize becomes invisible, so a
 * file yielding no constants at all is a failure rather than a pass: a gate that
 * silently measures nothing is worse than no gate.
 *
 * Behaviour is out of scope here and belongs in each language's own suite,
 * where a shared case file can be asserted against the real implementation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const DECLARATION = "conformance/native-parity/ble-bridge.json";

/**
 * Per-language declaration forms.
 *
 * Each pattern captures the constant name in group 1 and its literal in group
 * 2. They are deliberately narrow: the point is to read the shared spec objects
 * these files exist to be, not to parse the language.
 */
const EXTRACTORS = {
  swift: [/^\s*static let ([A-Za-z_]\w*)(?::\s*[^=]+)?\s*=\s*(.+?)\s*$/gm],
  kotlin: [/^\s*(?:const )?val ([A-Za-z_]\w*)(?::\s*[^=]+)?\s*=\s*(.+?)\s*$/gm],
  ts: [/^\s*export const ([A-Za-z_]\w*)(?::\s*[^=]+)?\s*=\s*(.+?);\s*$/gm],
  worklet: [/^\s*const ([A-Za-z_]\w*)\s*=\s*(.+?);\s*$/gm],
};

/**
 * Reduce a source literal to the value it denotes, or `null` when it is not one
 * of the shapes a shared constant is allowed to take.
 *
 * Handles the wrappers each language puts around the same value —
 * `CBUUID(string: "…")`, `UUID.fromString("…")` — and Kotlin's `L` suffix,
 * because `500` and `500L` are the same constant declared under two type
 * systems, not a divergence.
 *
 * @param {string} raw
 * @returns {string | number | null}
 */
export function normalizeLiteral(raw) {
  let text = raw.trim().replace(/,$/, "");

  const wrapped =
    /^(?:CBUUID\(string:\s*|UUID\.fromString\(|ParcelUuid\.fromString\()\s*(.+?)\s*\)$/.exec(
      text,
    );
  if (wrapped?.[1] !== undefined) text = wrapped[1].trim();

  const quoted = /^"(.*)"$/.exec(text);
  if (quoted?.[1] !== undefined) return quoted[1];

  const hex = /^0[xX]([0-9a-fA-F]+)[LlUu]*$/.exec(text);
  if (hex?.[1] !== undefined) return Number.parseInt(hex[1], 16);

  const decimal = /^(-?\d+)[LlUuFfDd]?$/.exec(text);
  if (decimal?.[1] !== undefined) return Number.parseInt(decimal[1], 10);

  return null;
}

/**
 * Every constant one implementation declares, as name → value.
 *
 * @param {string} language
 * @param {string} source
 */
export function extractConstants(language, source) {
  const found = new Map();
  for (const pattern of EXTRACTORS[language] ?? []) {
    for (const match of source.matchAll(pattern)) {
      const name = match[1];
      const value = normalizeLiteral(match[2] ?? "");
      // A declaration whose right-hand side is a call, an expression, or
      // anything else compound is not a shared constant; skip rather than
      // guess at it.
      if (name === undefined || value === null) continue;
      if (!found.has(name)) found.set(name, value);
    }
  }
  return found;
}

/** Names differ in case convention across the three languages; compare folded. */
export function foldName(name) {
  return name.replace(/[_\s]/g, "").toLowerCase();
}

function describe(value) {
  return typeof value === "string" ? `"${value}"` : String(value);
}

/**
 * Compare every implementation against the declaration.
 *
 * Returns findings and counts rather than exiting, so the gate's own regression
 * tests can drive it in-process.
 *
 * @param {string} [root]
 */
export function checkNativeParity(root = ROOT) {
  const declaration = readJson(path.join(root, DECLARATION));
  const findings = [];

  /** Each implementation's extracted constants, keyed by language. */
  const extracted = new Map();
  for (const [language, source] of Object.entries(declaration.sources)) {
    const file = path.join(root, source.file);
    if (!fs.existsSync(file)) {
      findings.push(
        `${language}: declared source ${source.file} does not exist`,
      );
      continue;
    }
    const constants = extractConstants(language, fs.readFileSync(file, "utf8"));
    // Zero constants means the extractor stopped recognizing this file's
    // declaration style. Passing here would retire the whole language from the
    // comparison without anyone noticing.
    if (constants.size === 0) {
      findings.push(
        `${language}: extracted no constants from ${source.file} (expected ${source.pattern}); the file was refactored or the extractor needs updating`,
      );
    }
    extracted.set(language, constants);
  }

  // 1. Every declared binding exists and holds the declared value.
  for (const constant of declaration.constants) {
    for (const [language, identifier] of Object.entries(constant.bindings)) {
      const constants = extracted.get(language);
      if (constants === undefined) continue;
      if (!constants.has(identifier)) {
        findings.push(
          `${constant.name}: ${language} does not declare ${identifier} in ${declaration.sources[language].file}`,
        );
        continue;
      }
      const actual = constants.get(identifier);
      if (actual !== constant.value) {
        findings.push(
          `${constant.name}: ${language} ${identifier} is ${describe(actual)}, declared ${describe(constant.value)}`,
        );
      }
    }
  }

  // 2. A constant two or more implementations carry must be declared here.
  //    Without this rule the declaration is a list someone has to remember to
  //    extend, and the next shared constant is simply not covered.
  const registered = new Set(
    declaration.constants.flatMap((constant) =>
      Object.values(constant.bindings).map(foldName),
    ),
  );
  const platformOnly = new Set(
    Object.values(declaration.platformOnly ?? {})
      .flat()
      .map(foldName),
  );
  const carriers = new Map();
  for (const [language, constants] of extracted) {
    for (const name of constants.keys()) {
      const folded = foldName(name);
      if (!carriers.has(folded)) carriers.set(folded, []);
      carriers.get(folded).push(`${language} ${name}`);
    }
  }
  for (const [folded, where] of carriers) {
    if (registered.has(folded) || platformOnly.has(folded)) continue;
    if (where.length < 2) continue;
    findings.push(
      `unregistered shared constant: ${where.join(", ")} agree on a name but no row in ${DECLARATION} governs the value`,
    );
  }

  // 3. Values the normative document states must still say what it states. Both
  //    halves of "the source mirrors the document" are worth holding: a value
  //    changed in every implementation and not in the specification is drift in
  //    the other direction.
  const specPath = path.join(root, declaration.spec);
  const spec = fs.existsSync(specPath)
    ? fs.readFileSync(specPath, "utf8")
    : null;
  if (spec === null) {
    findings.push(`spec: ${declaration.spec} does not exist`);
  } else {
    for (const constant of declaration.constants) {
      if (constant.doc !== true) continue;
      if (!spec.includes(String(constant.value))) {
        findings.push(
          `${constant.name}: ${describe(constant.value)} does not appear in ${declaration.spec}`,
        );
      }
    }
    // Flags are written in hex in both the document and the source, and JSON
    // has no hex literal, so they are matched against the document by their
    // labelled bullet rather than by the decimal value stored here.
    for (const flag of declaration.docFlags ?? []) {
      const constant = declaration.constants.find(
        (candidate) => candidate.name === flag.name,
      );
      if (constant === undefined) {
        findings.push(`docFlags: no constant named ${flag.name}`);
        continue;
      }
      const hex = `0x${constant.value.toString(16).padStart(2, "0")}`;
      // The document renders these as `` `0x01` MORE ``; match the pair while
      // tolerating the code span, so the check is about the value and the label
      // belonging together rather than about Markdown punctuation.
      if (!new RegExp(`\`?${hex}\`?\\s+${flag.label}\\b`, "i").test(spec)) {
        findings.push(
          `${flag.name}: ${declaration.spec} does not document "${hex} ${flag.label}" (source value ${constant.value})`,
        );
      }
    }
  }

  return {
    findings,
    constants: declaration.constants.length,
    bindings: declaration.constants.reduce(
      (total, constant) => total + Object.keys(constant.bindings).length,
      0,
    ),
    implementations: Object.fromEntries(
      [...extracted].map(([language, constants]) => [language, constants.size]),
    ),
  };
}

function main() {
  const result = checkNativeParity();
  for (const finding of result.findings) console.error(`  ${finding}`);
  console.log(
    `native-parity: ${result.findings.length === 0 ? "PASS" : "FAIL"}; ${result.constants} constant(s) across ${Object.keys(result.implementations).length} implementation(s), ${result.bindings} binding(s) compared.`,
  );

  const artifact = path.join(
    ROOT,
    "artifacts/checks/native-parity-detail.json",
  );
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(
    artifact,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        ok: result.findings.length === 0,
        ...result,
      },
      null,
      2,
    )}\n`,
  );

  process.exit(result.findings.length === 0 ? 0 : 1);
}

// Importable as a module so the gate's own regression tests can drive it
// without a subprocess; still the executable the registry names.
if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
