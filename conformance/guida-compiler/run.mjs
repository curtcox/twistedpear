#!/usr/bin/env node
/**
 * P5.0: measure Guida compiler cold parse, hello compile, and peak heap.
 * Writes conformance/guida-compiler/measured.json.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runMain, section, step } from "../lib/index.mjs";
import { measureBare } from "./measure-bare.mjs";
import { measureNode } from "./measure-node.mjs";
import { measureWeb } from "./measure-web.mjs";
import { fallbackFor, verdictFor } from "./verdict.mjs";
import { shippingCompilerAvailability } from "./worklet-availability.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = join(here, "measured.json");

function annotate(sample) {
  const verdict = verdictFor(sample);
  return {
    ...sample,
    verdict,
    fallback: fallbackFor(verdict),
  };
}

async function run() {
  section("desktop Node");
  step("cold parse + hello compile");
  const node = annotate(await measureNode());
  console.log(
    `  parse ${node.coldParseMs}ms · compile ${node.helloCompileMs}ms · heap ${node.peakHeapBytes} · ${node.verdict}`,
  );

  section("desktop Bare");
  step("same compile under node_modules/bare");
  const bare = annotate(measureBare());
  console.log(
    bare.available
      ? `  parse ${bare.coldParseMs}ms · compile ${bare.helloCompileMs}ms · ${bare.verdict}`
      : `  unavailable: ${bare.error}`,
  );

  section("web Chromium");
  step("esbuild-bundle guida and compile hello in Playwright");
  let web;
  try {
    web = annotate(await measureWeb());
  } catch (error) {
    web = annotate({
      runtime: "chromium",
      available: false,
      error: error instanceof Error ? error.message.slice(0, 800) : String(error),
    });
  }
  console.log(
    web.available
      ? `  parse ${web.coldParseMs}ms · compile ${web.helloCompileMs}ms · ${web.verdict}`
      : `  unavailable: ${web.error}`,
  );

  section("shipping worklets");
  const shipping = shippingCompilerAvailability();
  for (const sample of Object.values(shipping)) {
    const annotated = annotate(sample);
    shipping[annotated.runtime] = annotated;
    console.log(
      `  ${annotated.runtime}: ${annotated.verdict}${annotated.error ? ` (${annotated.error})` : ""}`,
    );
  }

  if (node.available !== true) {
    throw new Error("Node Guida compile failed; cannot record P5.0 evidence");
  }

  const measured = {
    measuredAt: new Date().toISOString(),
    bar: {
      parseUsableMs: 5_000,
      compileUsableMs: 10_000,
      compileSlowMs: 30_000,
      heapUsableBytes: 512 * 1024 * 1024,
    },
    platforms: {
      "desktop-node": node,
      "desktop-bare": bare,
      web: web,
      ...shipping,
    },
  };
  writeFileSync(outputPath, `${JSON.stringify(measured, null, 2)}\n`);
  step(`wrote ${outputPath}`);
}

await runMain(run);
