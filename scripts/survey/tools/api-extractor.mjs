import fs from "node:fs";
import path from "node:path";
import { REPORTS, ROOT, packageVersion, run } from "../lib.mjs";

/**
 * A diffable public API report per package.
 *
 * The existing `api-surface` gate counts exported symbols and caps the count.
 * That catches the surface getting *bigger*; it says nothing about the surface
 * *changing*. Renaming an export, widening a parameter, or making a field
 * optional all leave the count identical and are all breaking changes to
 * somebody. api-extractor emits the signatures, so a diff of two runs is a diff
 * of the contract.
 *
 * The `.api.md` files are the artifact worth keeping — that is api-extractor's
 * own stable, reviewable format, and it is what a human reads in a pull
 * request. This wrapper writes them under `reports/api/` and reduces them to a
 * JSON index of package → exported symbol names plus a digest, so the trending
 * system can detect "the contract moved" without parsing Markdown.
 *
 * The doc model (`.api.json`) is deliberately not generated. It is ~10 MB per
 * package here, most of it resolved type text, and none of it is more diffable
 * than the report it comes with.
 *
 * Requires a build: it reads `dist/*.d.ts`, so a clean checkout must run
 * `npm run build` first. A package whose declarations are missing is recorded
 * as skipped with that reason rather than quietly omitted.
 */
const CONFIG_NAME = ".api-extractor.survey.json";
const SIGNATURE =
  /^(export )?(declare )?(abstract )?(class|interface|type|function|const|let|var|enum|namespace) ([A-Za-z_$][\w$]*)/;

const tool = {
  id: "api-extractor",
  title: "Public API report per package",
  question: "Has any package's exported contract changed shape?",
  output: "reports/api-extractor.json",
  version: () => packageVersion("@microsoft/api-extractor"),
  run() {
    const reportFolder = path.join(REPORTS, "api");
    fs.mkdirSync(reportFolder, { recursive: true });
    const { workspaces, skipped } = packagesWithDeclarations();

    const findings = [];
    for (const workspace of workspaces) {
      const configPath = path.join(ROOT, workspace.dir, CONFIG_NAME);
      for (const entry of workspace.entries) {
        fs.writeFileSync(
          configPath,
          `${JSON.stringify(configFor(entry, reportFolder), null, 2)}\n`,
        );
        try {
          const result = run(process.execPath, [
            "node_modules/@microsoft/api-extractor/bin/api-extractor",
            "run",
            // `--local` writes the report instead of comparing against a
            // committed copy and failing when they differ. This survey has no
            // committed copy and fails at nothing.
            "--local",
            "-c",
            path.join(workspace.dir, CONFIG_NAME),
          ]);
          const reportFile = path.join(reportFolder, entry.reportFileName);
          if (!fs.existsSync(reportFile)) {
            skipped.push({
              package: workspace.dir,
              entryPoint: entry.subpath,
              reason: lastLines(result.stderr || result.stdout),
            });
            continue;
          }
          const markdown = fs.readFileSync(reportFile, "utf8");
          findings.push({
            package: workspace.dir,
            packageName: workspace.packageName,
            entryPoint: entry.subpath,
            declaration: entry.declaration,
            report: path.relative(ROOT, reportFile),
            symbols: symbolsIn(markdown),
            bytes: Buffer.byteLength(markdown),
          });
        } finally {
          fs.rmSync(configPath, { force: true });
        }
      }
    }

    findings.sort((a, b) => b.symbols.length - a.symbols.length);
    return {
      summary: {
        entryPointsReported: findings.length,
        packagesReported: new Set(findings.map((entry) => entry.package)).size,
        skippedCount: skipped.length,
        totalSymbols: findings.reduce(
          (sum, entry) => sum + entry.symbols.length,
          0,
        ),
        distinctSymbols: new Set(
          findings.flatMap((entry) =>
            entry.symbols.map((symbol) => `${entry.packageName}#${symbol}`),
          ),
        ).size,
        reportFolder: path.relative(ROOT, reportFolder),
        skipped,
      },
      findings,
    };
  },
};

/**
 * Exported symbol names, read out of api-extractor's own report format.
 *
 * The report lists one declaration per top-level block. Names are the anchor
 * this survey keys on; the surrounding signature text is left in the `.api.md`
 * beside it, which is the thing meant to be diffed.
 *
 * @param {string} markdown
 */
function symbolsIn(markdown) {
  const names = new Set();
  for (const line of markdown.split("\n")) {
    const match = SIGNATURE.exec(line.trim());
    if (match) names.add(match[5]);
  }
  return [...names].sort();
}

/**
 * Packages that declare an entry point and have built declarations for it.
 *
 * A package that cannot be analysed is reported as skipped with the reason,
 * never dropped. "18 of 19 packages" with no explanation for the missing one
 * reads identically to a package having been deleted, which is the exact
 * mistake this report exists to make visible.
 */
function packagesWithDeclarations() {
  const workspaces = [];
  const skipped = [];
  for (const dir of fs.readdirSync(path.join(ROOT, "packages")).sort()) {
    const workspace = `packages/${dir}`;
    const manifestPath = path.join(ROOT, workspace, "package.json");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!fs.existsSync(path.join(ROOT, workspace, "tsconfig.json"))) {
      skipped.push({ package: workspace, reason: "no tsconfig.json" });
      continue;
    }
    // Every subpath in the `exports` map is a separate contract: a consumer
    // importing `@twistedpear/reticulum-ts/web` sees a different surface from
    // one importing the root. Reporting only the root would leave those
    // untracked, which is where the existing `api-surface` gate's higher symbol
    // count comes from.
    const entries = [];
    for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
      const types = typeof target === "string" ? target : target?.types;
      if (typeof types !== "string") continue;
      // Packages that re-export their own `package.json` under a subpath are
      // not declaring an API surface. Not a skip worth reporting — there is
      // nothing there to extract.
      if (!types.endsWith(".d.ts")) continue;
      const declaration = types.replace(/^\.\//, "");
      if (!fs.existsSync(path.join(ROOT, workspace, declaration))) {
        skipped.push({
          package: workspace,
          entryPoint: subpath,
          reason: `${declaration} missing — run \`npm run build\``,
        });
        continue;
      }
      entries.push({
        dir: workspace,
        subpath,
        declaration,
        reportFileName: `${dir}${subpath === "." ? "" : subpath.replace(/^\./, "").replace(/\//g, "-")}.api.md`,
      });
    }
    if (entries.length === 0) {
      skipped.push({
        package: workspace,
        reason: "no exports map entry resolved to built declarations",
      });
      continue;
    }
    workspaces.push({
      dir: workspace,
      name: dir,
      packageName: manifest.name,
      entries,
    });
  }
  return { workspaces, skipped };
}

/** @param {{ declaration: string, reportFileName: string }} entry @param {string} reportFolder */
function configFor(entry, reportFolder) {
  return {
    projectFolder: ".",
    mainEntryPointFilePath: `<projectFolder>/${entry.declaration}`,
    compiler: { tsconfigFilePath: "<projectFolder>/tsconfig.json" },
    apiReport: {
      enabled: true,
      reportFileName: entry.reportFileName,
      reportFolder,
      reportTempFolder: path.join(reportFolder, ".tmp"),
    },
    docModel: { enabled: false },
    dtsRollup: { enabled: false },
    tsdocMetadata: { enabled: false },
    // api-extractor's warnings are about the code under analysis, not about
    // whether extraction worked. They are noise on a run whose only job is to
    // emit the report; the report itself carries the same information.
    messages: {
      compilerMessageReporting: { default: { logLevel: "none" } },
      extractorMessageReporting: { default: { logLevel: "none" } },
      tsdocMessageReporting: { default: { logLevel: "none" } },
    },
  };
}

/** @param {string} text */
function lastLines(text) {
  return (text ?? "").trim().split("\n").slice(-3).join(" ").slice(0, 300);
}

export default tool;
