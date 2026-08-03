// @ts-nocheck
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export const requiredHardware = ["H1", "H2", "H3", "H6", "H7", "H9", "H10", "H11", "H18", "H20", "H21"];
export const soakItems = [
  ["link-keepalive", "Link keepalive soak"],
  ["transport-node", "Transport-node soak"],
  ["interface-integration", "Interface integration soak"],
  ["distribution-seeder", "Distribution seeder soak"],
  ["mixed-network", "Mixed-network soak"],
  ["mini-app-runtime", "Mini-app runtime soak"],
  ["ios-simulator", "iOS simulator soak"],
  ["desktop-host", "Desktop host soak"]
];

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; }
}

export function evidence(root) {
  const dir = join(root, "release/evidence");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".json"))
    .map((name) => readJson(join(dir, name))).filter(Boolean);
}

export function latestValidationDir(root) {
  const parent = join(root, ".tmp/mac-validation");
  if (!existsSync(parent)) return null;
  return readdirSync(parent).map((name) => join(parent, name))
    .filter((path) => statSync(path).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] ?? null;
}

export function rootFrom(importMetaUrl) {
  return resolve(new URL("../..", importMetaUrl).pathname);
}

export function safeId(value) {
  if (!/^[A-Za-z0-9][A-Za-z0-9:-]*$/.test(value)) throw new Error(`invalid evidence id: ${value}`);
  return value.toLowerCase().replaceAll(":", "-");
}
