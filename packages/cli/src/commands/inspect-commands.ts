import { resolveFromCwd } from "../config.js";
import { type CommandContext, printHelp } from "./helpers.js";
import {
  encode256t,
  verify256t,
} from "@twistedpear/cas-256t";
import { verifyPackage } from "@twistedpear/app-registry";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  CAPABILITY_DEFINITIONS,
  HOST_API_VERSION,
} from "@twistedpear/miniapp-runtime";
import { doctorApp } from "@twistedpear/miniapp-test";

const RATES = {
  lan: 8_000_000 / 8,
  ble: 24_000 / 8,
  lora: 1_200 / 8,
} as const;

function formatDuration(seconds: number): string {
  if (seconds < 1) return "<1 s";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  return `${(seconds / 60).toFixed(1)} min`;
}

export function inspectArchive(archiveBytes: Uint8Array): string {
  const provider = new NodeCryptoProvider();
  const id = encode256t(archiveBytes, (data) => provider.sha512(data));
  if (!verify256t(id, archiveBytes, (data) => provider.sha512(data))) {
    throw new Error("SHA-512 / 256t verification failed");
  }
  const unpacked = verifyPackage(provider, archiveBytes, {
    hostApiVersion: HOST_API_VERSION,
  });
  const sha256 = unpacked.packageHash;
  const fingerprint = unpacked.manifest.publisherPublicKey.slice(0, 16);
  const size = archiveBytes.byteLength;
  const capabilities = unpacked.manifest.capabilities.map((entry) => {
    const idValue = typeof entry === "string" ? entry : entry.id;
    const risk =
      CAPABILITY_DEFINITIONS.find((item) => item.id === idValue)?.riskClass ??
      "unknown";
    return `  ${idValue} (${risk})`;
  });
  const files = unpacked.manifest.files.map(
    (file) => `  ${file.path}  ${file.size} B  sha256=${file.sha256.slice(0, 16)}…`,
  );
  return [
    `256t: ${id}`,
    `sha512: verified`,
    `sha256: ${sha256} (verified)`,
    `signature: verified`,
    `name: ${unpacked.manifest.name}`,
    `version: ${unpacked.manifest.version}`,
    `publisher: ${fingerprint}…`,
    `minHostApi: ${unpacked.manifest.minHostApi}`,
    `capabilities:`,
    ...(capabilities.length > 0 ? capabilities : ["  (none)"]),
    `files:`,
    ...files,
    `size: ${size} B`,
    `install: LAN ${formatDuration(size / RATES.lan)} · BLE ${formatDuration(size / RATES.ble)} · LoRa ${formatDuration(size / RATES.lora)}`,
  ].join("\n");
}

export async function runInspect(ctx: CommandContext): Promise<number> {
  const target = ctx.args[0];
  if (target === undefined) {
    printHelp("inspect");
    return 1;
  }
  try {
    const { loadInspectBytes } = await import("./inspect-resolve.js");
    const archiveBytes = await loadInspectBytes(target, ctx.cwd);
    console.log(inspectArchive(archiveBytes));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function runDoctor(ctx: CommandContext): Promise<number> {
  const appDirArg = ctx.args[0];
  if (appDirArg === undefined) {
    printHelp("doctor");
    return 1;
  }
  const appDir = resolveFromCwd(ctx.cwd, appDirArg);
  const report = await doctorApp(appDir);
  console.log(`${report.appDir}  ${report.bytes} bytes`);
  if (report.findings.length === 0) {
    console.log("No findings.");
    return 0;
  }
  for (const finding of report.findings) {
    console.log(`${finding.code}: ${finding.message}`);
  }
  return 0;
}
