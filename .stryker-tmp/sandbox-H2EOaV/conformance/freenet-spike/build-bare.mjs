// @ts-nocheck
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnChecked } from "../lib/index.mjs";

const root = dirname(fileURLToPath(import.meta.url));

spawnChecked(
  "npx",
  [
    "bare-pack",
    "--base",
    join(root, "../.."),
    "--defer",
    "ws",
    "--defer",
    "node:buffer",
    "--defer",
    "node:events",
    "--defer",
    "node:http",
    "--defer",
    "node:https",
    "--defer",
    "node:net",
    "--defer",
    "node:stream",
    "--defer",
    "node:tls",
    "--defer",
    "node:url",
    "--defer",
    "node:zlib",
    "--defer",
    "bare-crypto",
    "--defer",
    "bare-dns",
    "--defer",
    "bare-tcp",
    "--defer",
    "bare-tls",
    "--out",
    join(root, "bare-freenet.bundle"),
    join(root, "bare-entry.mjs")
  ],
  { cwd: root }
);

console.log("freenet-spike: Bare SDK probe bundle written");
