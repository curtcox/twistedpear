/**
 * Bare worklet entry for harness-mobile (M0 vertical slice).
 * Runs reticulum-ts with the Bare runtime adapter inside react-native-bare-kit.
 */
import { PureCryptoProvider, Reticulum, bareRuntime } from "@twistedpear/reticulum-ts";

const provider = new PureCryptoProvider();
const runtime = bareRuntime({ storePath: "reticulum-store" });

export async function startWorklet(targetHost: string, targetPort: number) {
  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const iface = await reticulum.addTcpClientInterface({
    name: "docker-peer",
    targetHost,
    targetPort
  });

  return {
    reticulum,
    iface,
    async stop() {
      await iface.close();
      reticulum.stop();
    }
  };
}
