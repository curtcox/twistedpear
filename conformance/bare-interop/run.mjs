#!/usr/bin/env node
/**
 * Desktop Bare interop runner (Phase 2 M1).
 * Runs leaf/link/LXMF scenarios with the Bare runtime adapter.
 *
 * CI uses Node as the JS host (bare-tcp/bare-udp/bare-fs adapter under test).
 * Optional Bare-CLI bundle: node conformance/bare-interop/build.mjs &&
 *   bare conformance/bare-interop/bare-interop.bundle
 */

import { runBareInterop } from "./tests.mjs";

await runBareInterop();
