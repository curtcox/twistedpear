export * from "./host/shared.js";
export type * from "./host/shared.js";
import { MiniappHostLayer2 } from "./host/layer-2.js";
import { appInstanceKey } from "./host/running-apps.js";
import type { LaunchManifest } from "./host/shared.js";
import type { HostNotification } from "./services/notify.js";

export class MiniappHost extends MiniappHostLayer2 {
  private readonly lastLaunches = new Map<
    string,
    { manifest: LaunchManifest; bundle: Uint8Array }
  >();

  protected now(): number {
    return this.options.now?.() ?? Date.now();
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  override async launch(
    manifest: LaunchManifest,
    bundle: Uint8Array,
  ) {
    this.lastLaunches.set(appInstanceKey(manifest.name, manifest.publisherPublicKey), {
      manifest,
      bundle: bundle.slice(),
    });
    return super.launch(manifest, bundle);
  }

  notifications(): ReadonlyArray<HostNotification> {
    return this.notifyService.history();
  }

  notifyEnabled(appId: string): boolean {
    return this.notifyService.isEnabled(appId);
  }

  setNotifyEnabled(appId: string, enabled: boolean): void {
    this.notifyService.setEnabled(appId, enabled);
  }

  async tapNotification(id: string): Promise<void> {
    const notification = this.notifyService.get(id);
    if (notification === undefined) {
      throw new Error(`Unknown notification: ${id}`);
    }
    let app = this.appByIdentity(
      notification.appId,
      notification.publisherPublicKey,
    );
    if (app === undefined) {
      const last = this.lastLaunches.get(
        appInstanceKey(notification.appId, notification.publisherPublicKey),
      );
      if (last === undefined) {
        throw new Error(`Mini-app is not installed: ${notification.appId}`);
      }
      await this.launch(last.manifest, last.bundle);
      app = this.appByIdentity(
        notification.appId,
        notification.publisherPublicKey,
      );
    }
    if (app === undefined) {
      throw new Error(`Mini-app failed to launch: ${notification.appId}`);
    }
    if (app.lifecycle.snapshot().state === "suspended") {
      await this.resume();
    }
    this.switchForeground(
      notification.appId,
      notification.publisherPublicKey,
    );
    await app.lifecycle.deliverUiEvent({
      nodeId: "notify",
      event: notification.event,
    });
  }
}
