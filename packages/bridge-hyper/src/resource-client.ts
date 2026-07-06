import {
  DestinationDirection,
  DestinationType,
  Identity,
  LinkStatus,
  Reticulum,
  type CryptoProvider,
  type Runtime
} from "@twistedpear/reticulum-ts";
import { unpackPackage } from "@twistedpear/app-registry";
import { appDestinationName } from "@twistedpear/app-registry";
import {
  parseListResponse,
  sendPackageResourceRequest
} from "./resource-server.js";

export interface PackageResourceClientOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly publisherPublicKeyHex: string;
  readonly appName: string;
  readonly identity: Identity;
}

export class PackageResourceClient {
  private readonly reticulum: Reticulum;

  constructor(private readonly options: PackageResourceClientOptions) {
    this.reticulum = Reticulum.create({
      provider: options.provider,
      runtime: options.runtime
    });
  }

  async start(): Promise<void> {
    this.reticulum.start();
  }

  async stop(): Promise<void> {
    await this.reticulum.stop();
  }

  get node(): Reticulum {
    return this.reticulum;
  }

  async listVersions() {
    const link = await this.openLink();
    const response = await sendPackageResourceRequest(link, { type: "list" });
    return parseListResponse(response);
  }

  async fetchVersion(version: string) {
    const link = await this.openLink();
    const archive = await sendPackageResourceRequest(link, { type: "fetch", version });
    return unpackPackage(this.options.provider, archive);
  }

  private async openLink() {
    const publisherKey = Uint8Array.from(Buffer.from(this.options.publisherPublicKeyHex, "hex"));
    const publisherIdentity = Identity.fromPublicKey(this.options.provider, publisherKey);
    if (publisherIdentity === null) {
      throw new Error("Invalid publisher public key");
    }

    const destinationName = appDestinationName(
      this.options.provider,
      this.options.publisherPublicKeyHex,
      this.options.appName
    );
    const parts = destinationName.split(".");
    const appName = parts[0] ?? "tp";
    const aspects = parts.slice(1);

    const out = this.reticulum.registerDestination({
      provider: this.options.provider,
      identity: publisherIdentity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName,
      aspects
    });

    const link = out.requestLink({
      linkEstablished(link) {
        return link;
      }
    });

    return waitForActiveLink(link);
  }
}

async function waitForActiveLink(link: import("@twistedpear/reticulum-ts").Link) {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    if (link.status === LinkStatus.ACTIVE) {
      return link;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error("link did not become active");
}
