#!/usr/bin/env node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNodeHost } from "../../packages/host-core/dist/node-host.js";
import { interopReady, withComposeService, LEAF_ECHO_PORT } from "../scenarios/ts/harness.js";

if (!interopReady()) {
  console.log("rnsd-mode: skipped (set INTEROP=1 with docker)");
  process.exit(0);
}

const dataDir = mkdtempSync(join(tmpdir(), "tp-rnsd-"));

try {
  await withComposeService("leaf-echo", LEAF_ECHO_PORT, async () => {
    const { resolveHostConfig } = await import("../../packages/host-core/dist/config.js");
    const session = await createNodeHost({
      config: resolveHostConfig({
        dataDir,
        overrides: {
          roles: {
            transport: false,
            seeder: true,
            propagation: false,
            attachRnsd: { host: "127.0.0.1", port: LEAF_ECHO_PORT }
          },
          interfaces: {
            tcp: { enabled: true, mode: "client", targetHost: "127.0.0.1", targetPort: LEAF_ECHO_PORT },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false }
          }
        }
      })
    });

    const status = session.getStatus();
    if (status.transportEnabled) {
      throw new Error("attached host must not route locally");
    }

    if (status.attachRnsd === null) {
      throw new Error("expected rnsd attach config");
    }

    await session.stop();
  });
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}

console.log("rnsd-mode: passed");
