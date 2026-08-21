#!/usr/bin/env node
/**
 * Fail the Pages build if a reader-facing guide section did not make it into the deployed site.
 */
import { inspectSite } from "./pages-integrity.mjs";

const result = inspectSite({ requireDist: true });
if (!result.ok) {
  console.error("Guide section verification failed:");
  for (const problem of result.problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  `Guide sections published: ${result.pages} pages, ${result.distImages} dist images`
);
