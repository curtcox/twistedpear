import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const mode = process.argv[2];
const definitions = mode === "tamarin"
  ? { executable: "tamarin-prover", prefix: ["--prove"], files: ["grant-boundary.spthy", "link-handshake.spthy"], failure: /falsified|analysis incomplete|could not be proved/i }
  : mode === "proverif"
    ? { executable: "proverif", prefix: [], files: ["grant-boundary.pv", "link-handshake.pv"], failure: /is false|cannot be proved/i }
    : null;
if (definitions === null) throw new Error("usage: node formal/run-symbolic-provers.mjs <tamarin|proverif>");

for (const file of definitions.files) {
  const path = `formal/symbolic/${file}`;
  const result = spawnSync(definitions.executable, [...definitions.prefix, path], { encoding: "utf8" });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(output);
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0 || definitions.failure.test(output)) throw new Error(`${mode} failed ${path}`);
  if (mode === "proverif") {
    const expected = [...readFileSync(path, "utf8").matchAll(/^query\s/gm)].length;
    const proved = [...output.matchAll(/\sis true\./g)].length;
    if (proved < expected) throw new Error(`ProVerif proved ${proved}/${expected} queries in ${path}`);
  }
}
