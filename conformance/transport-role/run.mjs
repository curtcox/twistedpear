#!/usr/bin/env node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNodeHost } from "../../packages/host-core/dist/node-host.js";
import { resolveHostConfig } from "../../packages/host-core/dist/config.js";
import { interopReady, withComposeService, LEAF_ECHO_PORT } from "../scenarios/ts/harness.js";

if (!interopReady()) {
  console.log("transport-role: skipped (set INTEROP=1 with docker)");
  process.exit(0);
}

const dataDir = mkdtempSync(join(tmpdir(), "tp-transport-"));

try {
  await withComposeService("leaf-echo", LEAF_ECHO_PORT, async () => {
    const session = await createNodeHost({
      config: resolveHostConfig({
        dataDir,
        overrides: {
          interfaces: {
            tcp: { enabled: true, mode: "client", targetHost: "127.0.0.1", targetPort: LEAF_ECHO_PORT },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false }
          },
          roles: {
            transport: true,
            seeder: false,
            propagation: false,
            attachRnsd: null
          }
        }
      })
    });

    const status = session.getStatus();
    if (!status.transportEnabled) {
      throw new Error("transport role not enabled");
    }

    await session.stop();
  });
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}

console.log("transport-role: passed");
