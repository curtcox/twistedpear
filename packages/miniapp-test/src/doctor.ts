import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CAPABILITY_DEFINITIONS,
  HOST_API_VERSION,
  validateWidgetTree,
  type WidgetNode,
} from "@twistedpear/miniapp-runtime";
import { mountAppFromDir, type AppHandle } from "./harness.js";

const specPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../specs/spec-sdk/schema/api-capabilities.json",
);

const API_CAPABILITIES = new Map<string, string>(
  Object.entries(
    JSON.parse(readFileSync(specPath, "utf8")) as Record<string, string>,
  ),
);

export const LINK_CEILINGS = {
  lan: 60 * 1024 * 1024,
  ble: 180 * 1024,
  lora: 9 * 1024,
} as const;

export interface DoctorFinding {
  readonly code: string;
  readonly message: string;
}

export interface DoctorReport {
  readonly appDir: string;
  readonly bytes: number;
  readonly findings: ReadonlyArray<DoctorFinding>;
}

function walkFiles(
  dir: string,
  prefix = "",
): Array<{ path: string; size: number }> {
  const out: Array<{ path: string; size: number }> = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const relative =
      prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, relative));
    } else {
      out.push({ path: relative, size: statSync(full).size });
    }
  }
  return out;
}

function usedCapabilities(source: string): Set<string> {
  const used = new Set<string>();
  for (const [surface, capability] of API_CAPABILITIES) {
    if (capability.length === 0) continue;
    if (source.includes(surface) || source.includes(`sdk.${surface}`)) {
      used.add(capability);
    }
  }
  return used;
}

function collectAccessibilityGaps(node: WidgetNode, gaps: string[]): void {
  if (
    node.type === "view" &&
    typeof node.props?.accessibilityLabel !== "string"
  ) {
    gaps.push(node.id);
  }
  for (const child of node.children ?? []) {
    collectAccessibilityGaps(child, gaps);
  }
}

interface AppManifest {
  entry: string;
  capabilities?: string[];
  minHostApi?: string;
}

function checkCapabilityDeclarations(
  manifest: AppManifest,
  source: string,
): DoctorFinding[] {
  const declared = new Set(manifest.capabilities ?? []);
  const used = usedCapabilities(source);
  const findings: DoctorFinding[] = [];
  for (const capability of used) {
    if (!declared.has(capability)) {
      findings.push({
        code: "used-undeclared",
        message: `Uses ${capability} but does not declare it`,
      });
    }
  }
  for (const capability of declared) {
    if (
      !used.has(capability) &&
      CAPABILITY_DEFINITIONS.some((entry) => entry.id === capability)
    ) {
      findings.push({
        code: "declared-unused",
        message: `Declares ${capability} but the bundle does not call it`,
      });
    }
  }
  return findings;
}

function checkLinkCeilings(bytes: number): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  if (bytes > LINK_CEILINGS.lora) {
    findings.push({
      code: "lora-ceiling",
      message: `${bytes} bytes exceeds the ~9 KiB LoRa one-minute ceiling`,
    });
  }
  if (bytes > LINK_CEILINGS.ble) {
    findings.push({
      code: "ble-ceiling",
      message: `${bytes} bytes exceeds the ~180 KiB BLE one-minute ceiling`,
    });
  }
  return findings;
}

function checkMinHostApi(manifest: AppManifest): DoctorFinding[] {
  if (
    manifest.minHostApi === undefined ||
    manifest.minHostApi <= HOST_API_VERSION
  ) {
    return [];
  }
  return [
    {
      code: "minHostApi",
      message: `minHostApi ${manifest.minHostApi} is newer than this SDK host ${HOST_API_VERSION}`,
    },
  ];
}

function checkWidgetTree(
  tree: ReturnType<AppHandle["rawTree"]>,
): DoctorFinding[] {
  if (tree === null) return [];
  const findings: DoctorFinding[] = [];
  try {
    validateWidgetTree(tree);
  } catch (error) {
    findings.push({
      code: "unknown-widget",
      message: error instanceof Error ? error.message : String(error),
    });
  }
  const gaps: string[] = [];
  collectAccessibilityGaps(tree.root, gaps);
  for (const id of gaps) {
    findings.push({
      code: "accessibilityLabel",
      message: `view "${id}" is missing accessibilityLabel`,
    });
  }
  return findings;
}

async function checkMountedApp(appDir: string): Promise<DoctorFinding[]> {
  let handle: AppHandle | undefined;
  try {
    handle = await mountAppFromDir(appDir);
    return checkWidgetTree(handle.rawTree());
  } catch (error) {
    return [
      {
        code: "launch",
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  } finally {
    await handle?.close();
  }
}

export async function doctorApp(appDir: string): Promise<DoctorReport> {
  const manifest = JSON.parse(
    readFileSync(join(appDir, "app.manifest.json"), "utf8"),
  ) as AppManifest;
  const source = readFileSync(join(appDir, manifest.entry), "utf8");
  const files = walkFiles(appDir);
  const bytes = files.reduce((sum, file) => sum + file.size, 0);

  const findings: DoctorFinding[] = [
    ...checkCapabilityDeclarations(manifest, source),
    ...checkLinkCeilings(bytes),
    ...checkMinHostApi(manifest),
    ...(await checkMountedApp(appDir)),
  ];

  return { appDir, bytes, findings };
}
