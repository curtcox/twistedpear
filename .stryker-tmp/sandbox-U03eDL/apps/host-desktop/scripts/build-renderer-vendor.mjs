#!/usr/bin/env node
// @ts-nocheck
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const hostRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(hostRoot, "../..");
const vendor = join(hostRoot, "src/renderer/vendor");
mkdirSync(vendor, { recursive: true });
copyFileSync(join(repoRoot, "node_modules/jsqr/dist/jsQR.js"), join(vendor, "jsqr.js"));
buildSync({ entryPoints: [join(hostRoot, "scripts/peer-audio-entry.mjs")], bundle: true, format: "iife", globalName: "TwistedPearPeerAudio", platform: "browser", target: ["chrome120"], outfile: join(vendor, "peer-audio.js") });
console.log("desktop renderer QR fallback copied to src/renderer/vendor/jsqr.js");
