import { readFile } from "node:fs/promises";
import { grantMachine } from "../packages/protocol/dist/index.js";

const tla = await readFile(new URL("./grant.tla", import.meta.url), "utf8");
const traces = JSON.parse(await readFile(new URL("./grant-conformance-traces.json", import.meta.url), "utf8"));
const vector = JSON.parse(await readFile(new URL("../conformance/vectors/grant.json", import.meta.url), "utf8"));

const modelEdges = [...tla.matchAll(/<<"([^"]+)",\s*"([^"]+)",\s*"([^"]+)">>/g)]
  .map((match) => [match[1], match[2], match[3]]);
const executableEdges = grantMachine.table.map((row) => [row.from, row.on.name, row.to]);
const vectorEdges = vector.cells
  .filter((cell) => cell.legal)
  .map((cell) => [cell.state, cell.eventClass, cell.expectedState.phase]);

const canonical = (edges) => JSON.stringify([...edges].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
const expected = canonical(modelEdges);
for (const [name, edges] of [["checked trace", traces.edges], ["executable table", executableEdges], ["Layer-3 vector", vectorEdges]]) {
  if (canonical(edges) !== expected) {
    throw new Error(`grant TLA+ conformance mismatch in ${name}`);
  }
}
console.log(`grant TLA+ relation conforms across ${modelEdges.length} legal edges`);
