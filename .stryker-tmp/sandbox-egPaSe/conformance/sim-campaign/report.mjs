// @ts-nocheck
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const artifacts = resolve(process.env.SIM_CAMPAIGN_OUTPUT ?? "conformance/sim-campaign/artifacts");
const report = JSON.parse(readFileSync(resolve(artifacts, "report.json"), "utf8"));
validateReport(report);

let reproducers = [];
try {
  reproducers = readdirSync(resolve(artifacts, "reproducers")).filter((name) => name.endsWith(".json")).sort();
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const positions = [...new Set(report.cells.map((cell) => cell.split("|")[1]))].sort();
const capabilities = [...new Set(report.cells.map((cell) => cell.split("|")[0]))].sort();
const coverage = new Set(report.coverage.map((item) => item.cell));
const findingsByCell = new Map();
for (const finding of [...report.findings, ...report.canaryFindings]) {
  findingsByCell.set(finding.cell, (findingsByCell.get(finding.cell) ?? 0) + 1);
}

const saturationMax = Math.max(1, ...report.saturation.map((point) => point.newFindings));
const saturationBars = report.saturation.map((point) => `
  <div class="bar-column" aria-label="${point.scenarios} scenarios: ${point.newFindings} new distinct findings">
    <span class="bar-value">${point.newFindings}</span>
    <span class="bar" style="height:${Math.max(4, Math.round(point.newFindings / saturationMax * 120))}px"></span>
    <span>${formatNumber(point.scenarios)}</span>
  </div>`).join("");

const heatmapRows = capabilities.map((capability) => `
  <tr>
    <th scope="row">${escapeHtml(capability)}</th>
    ${positions.map((position) => {
      const matching = report.cells.filter((cell) => cell.startsWith(`${capability}|${position}|`));
      const covered = matching.filter((cell) => coverage.has(cell)).length;
      const findings = matching.reduce((total, cell) => total + (findingsByCell.get(cell) ?? 0), 0);
      const label = `${capability}, ${position}: ${covered} of ${matching.length} verbs covered; ${findings} findings including canaries`;
      return `<td class="heat ${covered === matching.length ? "covered" : "gap"}" title="${escapeHtml(label)}"><span>${covered}/${matching.length}</span></td>`;
    }).join("")}
  </tr>`).join("");

const containmentRows = report.containment.map((item) => `
  <tr><th scope="row">${escapeHtml(item.transport)}</th><td>${formatNumber(item.scenarios)}</td><td>${formatMs(item.revocationPropagationMs)}</td><td>${formatPercent(item.egressAttributability)}</td><td>${formatMs(item.networkKillLatencyMs)}</td><td>${item.damageWindow}</td></tr>`).join("");

const findingRows = report.findings.length === 0
  ? `<p class="clean">No genuine oracle violations survived this turn.</p>`
  : `<ol>${report.findings.map((finding) => `<li><strong>${escapeHtml(finding.violation.oracle)}</strong> — ${escapeHtml(finding.cell)}, seed ${finding.seed}${finding.historyPath ? ` · <a href="${relativeReproducer(finding.historyPath)}">reproducer</a>` : ""}</li>`).join("")}</ol>`;
const gallery = reproducers.length === 0
  ? `<p>No minimized histories were emitted.</p>`
  : `<ul class="gallery">${reproducers.map((name) => `<li><a href="reproducers/${encodeURIComponent(name)}">${escapeHtml(name)}</a></li>`).join("")}</ul>`;
const confidence = report.completeness.confidence95;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TwistedPear abuse-resistance campaign</title>
<style>
:root{color-scheme:light dark;--bg:#f5f2ea;--fg:#25231f;--muted:#68635a;--panel:#fffdf7;--border:#d4cec1;--series:#187d70;--series-soft:#cde9e3;--warn:#9a4a2a;--warn-soft:#f3d8cb;--clean:#226c3d}@media(prefers-color-scheme:dark){:root{--bg:#171817;--fg:#efeee9;--muted:#aaa69d;--panel:#202220;--border:#3d403c;--series:#63c6b5;--series-soft:#234b45;--warn:#f0a07d;--warn-soft:#572f25;--clean:#79d693}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}main{max-width:1180px;margin:auto;padding:32px 20px 64px}h1{font-size:clamp(1.7rem,4vw,3.4rem);line-height:1.05;letter-spacing:-.05em;margin:0 0 8px}h2{margin:40px 0 12px;font-size:1.25rem}a{color:var(--series)}.muted{color:var(--muted)}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:24px 0}.stat{background:var(--panel);border:1px solid var(--border);padding:14px}.stat b{display:block;font-size:1.6rem;font-weight:500}.clean{color:var(--clean)}.scroll{overflow:auto}table{width:100%;border-collapse:collapse;background:var(--panel)}th,td{padding:9px 10px;border-bottom:1px solid var(--border);text-align:right}th:first-child{text-align:left;white-space:nowrap}thead th{color:var(--muted);font-weight:500}.heat{text-align:center;min-width:86px}.heat span{display:inline-block;min-width:42px;padding:4px 6px}.covered span{background:var(--series-soft)}.gap span{background:var(--warn-soft)}.bars{height:170px;display:flex;align-items:end;gap:clamp(12px,5vw,56px);padding:12px 18px 0;border-bottom:1px solid var(--border)}.bar-column{height:100%;display:flex;flex:1;flex-direction:column;justify-content:end;align-items:center;gap:5px;color:var(--muted)}.bar{display:block;width:min(70px,80%);background:var(--series)}.bar-value{color:var(--fg)}.gauge{height:18px;background:var(--panel);border:1px solid var(--border)}.gauge span{display:block;height:100%;background:var(--series-soft);width:${(report.completeness.floor * 100).toFixed(3)}%}.gallery{columns:3 260px;max-height:420px;overflow:auto;padding-left:22px}.gallery li{break-inside:avoid;margin:0 0 5px;font-size:.8rem}code{background:var(--panel);padding:2px 5px}@media(max-width:600px){main{padding:22px 12px}.gallery{columns:1}.stats{grid-template-columns:1fr 1fr}}
</style></head><body><main>
<p class="muted">ABUSE-RESISTANCE / ${escapeHtml(report.difficulty.heldRung)} ${escapeHtml(report.difficulty.heldRungName.toUpperCase())}</p>
<h1>Campaign turn held green.</h1>
<p>${escapeHtml(report.difficulty.increment)} · seeds ${report.seeds.from}–${report.seeds.to} · deterministic rerun ${report.deterministicRerun ? "confirmed" : "not confirmed"}</p>
<section class="stats" aria-label="Campaign summary"><div class="stat"><span>Scenarios</span><b>${formatNumber(report.scenariosRun)}</b></div><div class="stat"><span>Coverage cells</span><b>${report.coverage.length}/${report.cells.length}</b></div><div class="stat"><span>Genuine findings</span><b>${report.findings.length}</b></div><div class="stat"><span>Canary findings</span><b>${report.canaryFindings.length}</b></div></section>
<h2>Coverage cube: capability × attacker position</h2><div class="scroll"><table><thead><tr><th>Capability</th>${positions.map((position) => `<th>${escapeHtml(position)}</th>`).join("")}</tr></thead><tbody>${heatmapRows}</tbody></table></div>
<h2>Saturation: new distinct findings per 1,000 scenarios</h2><div class="bars">${saturationBars}</div>
<h2>Containment by transport</h2><div class="scroll"><table><thead><tr><th>Transport</th><th>Scenarios</th><th>Revocation</th><th>Attributable</th><th>Network kill</th><th>Damage window</th></tr></thead><tbody>${containmentRows}</tbody></table></div>
<h2>Completeness floor</h2><p><strong>${formatPercent(report.completeness.floor)}</strong> conservative floor · 95% band ${formatPercent(confidence[0])}–${formatPercent(confidence[1])} · ${report.completeness.recaptured}/${report.completeness.canaries} canaries recaptured</p><div class="gauge" role="img" aria-label="Completeness floor ${formatPercent(report.completeness.floor)}"><span></span></div>
<h2>Findings</h2>${findingRows}
<h2>Minimized reproducer gallery <span class="muted">(${formatNumber(reproducers.length)})</span></h2>${gallery}
<h2>Next increment</h2><p><code>${escapeHtml(report.difficulty.nextIncrement.rung)} ${escapeHtml(report.difficulty.nextIncrement.name)}</code> — ${escapeHtml(report.difficulty.nextIncrement.gate)}</p>
</main></body></html>`;

const outputPath = resolve(artifacts, "dashboard.html");
writeFileSync(outputPath, `${html}\n`);
console.log(`simulation report: ${basename(outputPath)} (${report.scenariosRun} scenarios, ${report.findings.length} genuine findings)`);

function validateReport(value) {
  const requiredArrays = ["cells", "coverage", "findings", "canaryFindings", "saturation", "containment"];
  if (value?.schema !== "twistedpear.campaign-v1" || requiredArrays.some((key) => !Array.isArray(value[key]))) throw new Error("unsupported campaign report");
  if (!value.difficulty?.heldRung || !value.completeness?.confidence95 || value.deterministicRerun !== true) throw new Error("campaign report is missing loop evidence");
}
function formatNumber(value) { return new Intl.NumberFormat("en-US").format(value); }
function formatPercent(value) { return `${(value * 100).toFixed(1)}%`; }
function formatMs(value) { return `${value < 100 ? value.toFixed(1) : value.toFixed(0)} ms`; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]); }
function relativeReproducer(path) { return `reproducers/${encodeURIComponent(basename(path))}`; }
