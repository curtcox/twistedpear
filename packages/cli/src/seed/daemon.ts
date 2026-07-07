import { resolveHostConfig, runNodeHost } from "@twistedpear/host-core";

export interface SeederOptions {
  readonly cwd: string;
  readonly stateDir: string;
  readonly transport: boolean;
  readonly propagation?: boolean;
  readonly attachRnsd?: string | null;
  readonly statusEndpoint?: boolean;
}

export async function runSeeder(options: SeederOptions): Promise<void> {
  const dataDir = options.stateDir;

  const attachRnsd =
    options.attachRnsd === null || options.attachRnsd === undefined
      ? null
      : (() => {
          const [host, portText] = options.attachRnsd.split(":");
          if (host === undefined || portText === undefined) {
            throw new Error(`Invalid rnsd attach address: ${options.attachRnsd}`);
          }

          return { host, port: Number.parseInt(portText, 10) };
        })();

  const config = resolveHostConfig({
    dataDir,
    overrides: {
      roles: {
        transport: options.transport && attachRnsd === null,
        seeder: true,
        propagation: options.propagation ?? false,
        attachRnsd
      },
      interfaces: {
        tcp: {
          enabled: attachRnsd !== null,
          mode: "client",
          ...(attachRnsd === null
            ? {}
            : { targetHost: attachRnsd.host, targetPort: attachRnsd.port })
        },
        auto: { enabled: attachRnsd === null, multicast: true, bonjour: true },
        websocket: { enabled: false },
        i2p: { enabled: false },
        rnode: { enabled: false }
      },
      statusEndpoint: options.statusEndpoint ?? false
    }
  });

  await runNodeHost({ config });
}
