import { validateManifestCapabilities } from "../capabilities.js";
import {
  ConfirmationRateLimiter,
  requestHostConfirmation,
  type ConfirmationEffects,
  type HostConfirmationChannel,
} from "../confirm.js";
import { validateWorkspacePath } from "./workspace.js";

function nodeConfirmationEffects(): ConfirmationEffects {
  return {
    randomBytes(length: number): Uint8Array {
      const bytes = new Uint8Array(length);
      const c = (globalThis as { crypto?: Crypto }).crypto;
      if (c === undefined || typeof c.getRandomValues !== "function") {
        throw new Error(
          "crypto.getRandomValues is required for confirmation tokens",
        );
      }
      c.getRandomValues(bytes);
      return bytes;
    },
    delay(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    now: () => Date.now(),
    limiter: new ConfirmationRateLimiter(),
  };
}

const confirmationEffects = nodeConfirmationEffects();

export interface AppManifestDraft {
  readonly name: string;
  readonly version: string;
  readonly entry: string;
  readonly capabilities: ReadonlyArray<string>;
  readonly minHostApi?: string;
}

export interface AppsPackageResult {
  readonly packageHash: string;
  readonly size: number;
  readonly t256: string;
}

export interface AppsPublishResult {
  readonly t256: string;
  readonly driveKey: string;
  readonly version: string;
}

export interface AppsInstallResult {
  readonly appId: string;
  readonly version: string;
  readonly trusted: boolean;
}

/**
 * Host-side implementation of packaging/publishing/installing/previewing.
 * Injected so miniapp-runtime never imports app-registry or bridge-hyper.
 * All user consent happens in AppsService BEFORE these methods run.
 */
export interface AppsCompileResult {
  readonly compiled: boolean;
  readonly bytes?: number;
  readonly compiler?: string;
  readonly reason?: string;
}

export interface AppsBackend {
  compile?(
    appId: string,
    request: { projectPrefix: string },
  ): Promise<AppsCompileResult>;
  package(
    appId: string,
    request: { projectPrefix: string; manifest: AppManifestDraft },
  ): Promise<AppsPackageResult>;
  publish(appId: string, request: { t256: string }): Promise<AppsPublishResult>;
  install(appId: string, request: { t256: string }): Promise<AppsInstallResult>;
  preview(
    appId: string,
    request: {
      projectPrefix: string;
      manifest: AppManifestDraft;
      grants: ReadonlyArray<string>;
    },
  ): Promise<{ launched: boolean }>;
  stopPreview(appId: string): Promise<void>;
}

export class AppsServiceError extends Error {
  constructor(
    readonly code: "APPS_UNCONFIGURED" | "APPS_BAD_REQUEST",
    message: string,
  ) {
    super(message);
    this.name = "AppsServiceError";
  }
}

const T256_PATTERN = /^[A-Za-z0-9_-]{94}$/;
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function validateT256(value: unknown): string {
  if (typeof value !== "string" || !T256_PATTERN.test(value)) {
    throw new AppsServiceError(
      "APPS_BAD_REQUEST",
      "Expected a 94-character 256t id",
    );
  }

  return value;
}

function validateManifestDraft(value: unknown): AppManifestDraft {
  const draft = value as AppManifestDraft;
  if (typeof draft.name !== "string" || !NAME_PATTERN.test(draft.name)) {
    throw new AppsServiceError(
      "APPS_BAD_REQUEST",
      "Manifest name must be lowercase alphanumeric/dashes",
    );
  }

  if (
    typeof draft.version !== "string" ||
    !VERSION_PATTERN.test(draft.version)
  ) {
    throw new AppsServiceError(
      "APPS_BAD_REQUEST",
      "Manifest version must be semver (x.y.z)",
    );
  }

  if (typeof draft.entry !== "string") {
    throw new AppsServiceError(
      "APPS_BAD_REQUEST",
      "Manifest entry is required",
    );
  }

  validateWorkspacePath(draft.entry);
  const capabilitiesRaw: unknown = draft.capabilities;
  const capabilities = validateManifestCapabilities(
    Array.isArray(capabilitiesRaw) ? capabilitiesRaw : [],
  );
  return {
    name: draft.name,
    version: draft.version,
    entry: draft.entry,
    capabilities,
    ...(typeof draft.minHostApi === "string"
      ? { minHostApi: draft.minHostApi }
      : {}),
  };
}

export class AppsService {
  constructor(
    private readonly backend: AppsBackend,
    private readonly confirmationChannel: HostConfirmationChannel | undefined,
  ) {}

  async package(
    context: { appId: string; publisherPublicKey: string },
    request: { projectPrefix: string; manifest: unknown },
  ): Promise<AppsPackageResult> {
    const manifest = validateManifestDraft(request.manifest);
    const projectPrefix = validateWorkspacePath(String(request.projectPrefix));
    await requestHostConfirmation(
      this.confirmationChannel,
      {
        kind: "package",
        appId: context.appId,
        publisherPublicKey: context.publisherPublicKey,
        summary: {
          name: manifest.name,
          version: manifest.version,
          entry: manifest.entry,
          capabilities: manifest.capabilities.join(", ") || "(none)",
        },
      },
      confirmationEffects,
    );
    return this.backend.package(context.appId, { projectPrefix, manifest });
  }

  async compile(
    context: { appId: string; publisherPublicKey: string },
    request: { projectPrefix: unknown },
  ): Promise<AppsCompileResult> {
    const projectPrefix = validateWorkspacePath(String(request.projectPrefix));
    if (this.backend.compile === undefined) {
      throw new AppsServiceError(
        "APPS_UNCONFIGURED",
        "Guida compiling is not configured on this host",
      );
    }
    await requestHostConfirmation(
      this.confirmationChannel,
      {
        kind: "package",
        appId: context.appId,
        publisherPublicKey: context.publisherPublicKey,
        summary: {
          operation: "compile",
          projectPrefix,
        },
      },
      confirmationEffects,
    );
    return this.backend.compile(context.appId, { projectPrefix });
  }

  async publish(
    context: { appId: string; publisherPublicKey: string },
    request: { t256: unknown },
  ): Promise<AppsPublishResult> {
    const t256 = validateT256(request.t256);
    await requestHostConfirmation(
      this.confirmationChannel,
      {
        kind: "publish",
        appId: context.appId,
        publisherPublicKey: context.publisherPublicKey,
        summary: {
          t256,
          note: "The app becomes visible to other users under this device's publisher identity.",
        },
      },
      confirmationEffects,
    );
    return this.backend.publish(context.appId, { t256 });
  }

  async install(
    context: { appId: string; publisherPublicKey: string },
    request: { t256: unknown },
  ): Promise<AppsInstallResult> {
    const t256 = validateT256(request.t256);
    await requestHostConfirmation(
      this.confirmationChannel,
      {
        kind: "install",
        appId: context.appId,
        publisherPublicKey: context.publisherPublicKey,
        summary: {
          t256,
          note: "The package is fetched, verified, and reviewed before anything runs.",
        },
      },
      confirmationEffects,
    );
    return this.backend.install(context.appId, { t256 });
  }

  async preview(
    context: { appId: string; publisherPublicKey: string },
    request: { projectPrefix: string; manifest: unknown; grants: unknown },
  ): Promise<{ launched: boolean }> {
    const manifest = validateManifestDraft(request.manifest);
    const projectPrefix = validateWorkspacePath(String(request.projectPrefix));
    const grants = validateManifestCapabilities(
      Array.isArray(request.grants) ? (request.grants as string[]) : [],
    );
    const declared = new Set(manifest.capabilities);
    for (const grant of grants) {
      if (!declared.has(grant)) {
        throw new AppsServiceError(
          "APPS_BAD_REQUEST",
          `Preview grant "${grant}" is not declared by the manifest`,
        );
      }
    }

    await requestHostConfirmation(
      this.confirmationChannel,
      {
        kind: "preview",
        appId: context.appId,
        publisherPublicKey: context.publisherPublicKey,
        summary: {
          name: manifest.name,
          version: manifest.version,
          grants: grants.join(", ") || "(none)",
        },
      },
      confirmationEffects,
    );
    return this.backend.preview(context.appId, {
      projectPrefix,
      manifest,
      grants,
    });
  }

  async stopPreview(context: { appId: string }): Promise<void> {
    await this.backend.stopPreview(context.appId);
  }
}
