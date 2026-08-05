#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calibrateTransportTrace,
  parseCalibrationPolicy,
  parseCalibrationTrace,
} from "@twistedpear/effects/adapters/sim";

const here = dirname(fileURLToPath(import.meta.url));

function usage() {
  console.error(
    "usage: node conformance/sim-calibration/run.mjs TRACE.json [--output REPORT.json]",
  );
}

const args = process.argv.slice(2);
const traceArgument = args[0];
const outputIndex = args.indexOf("--output");
if (
  traceArgument === undefined ||
  args.includes("--help") ||
  (outputIndex >= 0 && args[outputIndex + 1] === undefined)
) {
  usage();
  process.exit(traceArgument === undefined ? 2 : 0);
}

const tracePath = resolve(traceArgument);
const policyPath = resolve(here, "policy.json");
const traceBytes = await readFile(tracePath);
const trace = parseCalibrationTrace(JSON.parse(traceBytes.toString("utf8")));
const policy = parseCalibrationPolicy(
  JSON.parse(await readFile(policyPath, "utf8")),
);
const calibration = calibrateTransportTrace(trace, policy);
const report = {
  schemaVersion: 1,
  traceSha256: createHash("sha256").update(traceBytes).digest("hex"),
  trace: {
    transport: trace.transport,
    provenance: trace.provenance,
    radio: trace.radio,
  },
  policy: policy.transports[trace.transport],
  calibration,
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (outputIndex >= 0) {
  await writeFile(resolve(args[outputIndex + 1]), serialized, "utf8");
} else {
  process.stdout.write(serialized);
}

if (!calibration.comparison.withinTolerance) {
  console.error(
    `${trace.transport} calibration differs from the reviewed preset beyond policy tolerance`,
  );
  process.exitCode = 1;
}
