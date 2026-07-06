#!/usr/bin/env node
/**
 * Phase 6 demo: host-core transport + seeder boot smoke (full mesh demo needs INTEROP docker peers).
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNodeHost } from "../../packages/host-core/dist/node-host.js";
import { defaultHostConfig } from "../../packages/host-core/dist/types.js";

const dataDir = mkdtempSync(join(tmpdir(), "tp-phase6-"));

try {
  const session = await createNodeHost({
    config: defaultHostConfig({
      dataDir,
      roles: { transport: true, seeder: true, propagation: false, attachRnsd: null },
      interfaces: {
        tcp: { enabled: false, mode: "client" },
        auto: { enabled: false, multicast: false, bonjour: false },
        i2p: { enabled: false },
        rnode: { enabled: false }
      }
    })
  });

  const status = session.getStatus();
  console.log(`phase6 demo: host up identity=${status.identityHash} transport=${status.transportEnabled} seeder=${status.seederEnabled}`);
  await session.stop();
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}

console.log("demo:phase6 complete");
