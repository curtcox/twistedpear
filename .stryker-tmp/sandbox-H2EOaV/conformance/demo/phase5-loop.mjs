#!/usr/bin/env node
// @ts-nocheck
/**
 * Phase 5 demo: ios-sim full host loop on the Bare/Node stacks.
 */

import { runIosFullLoop } from "../ios-sim/full-loop.mjs";

runIosFullLoop().catch((error) => {
  console.error(error);
  process.exit(1);
});
