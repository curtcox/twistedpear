#!/usr/bin/env node
/**
 * Publish screenshots for the reader-facing guide sections into site/public/<section>/images.
 *
 * Each guide references screenshots by absolute site path (/<section>/images/<name>.png).
 * Real captures are copied from <section>/images. Only hardware-pending names listed in
 * PENDING_CAPTURES may receive a generated hatch PNG; anything else fails the publish.
 *
 * Usage:
 *   node scripts/site/section-images.mjs                     # copy + generate placeholders
 *   node scripts/site/section-images.mjs --report            # list missing captures, write nothing
 *   node scripts/site/section-images.mjs --section=authors   # restrict to one section
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { ROOT, SITE_ROOT } from "./paths.mjs";

/**
 * The guide sections that own a screenshot set. All of them are aimed at readers who are not
 * in the repository, which is why they gate the deploy rather than merely warning.
 *
 * @type {ReadonlyArray<{ id: string; label: string }>}
 */
export const SECTIONS = [
  { id: "guide", label: "User guide" },
  { id: "authors", label: "App authoring guide" },
  { id: "cookbook", label: "Cookbook" }
];

/**
 * Captures the current hosts cannot produce honestly. Listed in each section's
 * `images/README.md`. A placeholder is allowed only for these names, and only
 * while the source file is still absent.
 *
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const PENDING_CAPTURES = {
  guide: [
    "02-host-lineup.png",
    "02-android-home.png",
    "02-ios-suspended.png",
    "04-ble-link.png",
    "04-rnode.png",
    "09-android-notification.png"
  ],
  authors: ["02-installed-on-phone.png", "04-component-gallery.png"],
  cookbook: ["06-photo-drop-scan.png", "07-chapter-opener.png", "09-chapter-opener.png"]
};

/** @param {string} id @param {string} name */
export function isPendingCapture(id, name) {
  return (PENDING_CAPTURES[id] ?? []).includes(name);
}

const PLACEHOLDER_WIDTH = 1280;
const PLACEHOLDER_HEIGHT = 720;

/** @param {string} id */
export function sectionDir(id, root = ROOT) {
  return path.join(root, id);
}

/** @param {string} id */
export function sectionImagesDir(id, root = ROOT) {
  return path.join(root, id, "images");
}

/** @param {string} id */
export function publicImagesDir(id, siteRoot = SITE_ROOT) {
  return path.join(siteRoot, "public", id, "images");
}

/** @param {string} id */
function imageRefPattern(id) {
  return new RegExp(String.raw`!\[[^\]]*\]\((\/${id}\/images\/[^)\s]+)\)`, "g");
}

/**
 * @param {string} id section id
 * @returns {string[]} referenced image basenames, deduplicated and sorted
 */
export function referencedImages(id = "guide", dir = sectionDir(id)) {
  /** @type {Set<string>} */
  const names = new Set();
  if (!fs.existsSync(dir)) return [];
  const pattern = imageRefPattern(id);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const text = fs.readFileSync(path.join(dir, entry.name), "utf8");
    for (const match of text.matchAll(pattern)) {
      names.add(path.posix.basename(match[1]));
    }
  }
  return [...names].sort();
}

/** @param {string[]} names @returns {string[]} names with no committed capture */
export function missingImages(names, imagesDir) {
  return names.filter((name) => !fs.existsSync(path.join(imagesDir, name)));
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

/** @param {Buffer} buf */
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** @param {string} type @param {Buffer} data */
function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

/** True when `buf` is the generated 1280×720 greyscale hatch PNG. */
export function isPlaceholderPng(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 26) return false;
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    return false;
  }
  return (
    buf.readUInt32BE(16) === PLACEHOLDER_WIDTH &&
    buf.readUInt32BE(20) === PLACEHOLDER_HEIGHT &&
    buf[24] === 8 &&
    buf[25] === 0
  );
}

/**
 * An 8-bit greyscale PNG with a diagonal hatch, so a placeholder is never mistaken for a
 * real capture. No text: rendering glyphs would need a font, and the guides already carry
 * a written caption directly beneath every image.
 *
 * @param {number} width @param {number} height
 */
export function placeholderPng(width = PLACEHOLDER_WIDTH, height = PLACEHOLDER_HEIGHT) {
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const onHatch = (x + y) % 24 < 2;
      const onBorder = x < 3 || y < 3 || x >= width - 3 || y >= height - 3;
      raw[rowStart + 1 + x] = onBorder ? 0x8a : onHatch ? 0xc4 : 0xe8;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // colour type: greyscale
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

/** @param {string} id @returns {{ names: string[]; missing: string[] }} */
export function surveySection(id) {
  const names = referencedImages(id);
  return { names, missing: missingImages(names, sectionImagesDir(id)) };
}

/** @param {string} id */
function publishSection(id) {
  const { names, missing } = surveySection(id);
  const dest = publicImagesDir(id);
  fs.mkdirSync(dest, { recursive: true });
  /** @type {string[]} */
  const unexpected = [];
  for (const name of names) {
    const src = path.join(sectionImagesDir(id), name);
    const target = path.join(dest, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, target);
      continue;
    }
    if (isPendingCapture(id, name) && name.endsWith(".png")) {
      fs.writeFileSync(target, placeholderPng());
      continue;
    }
    unexpected.push(name);
  }
  const pending = missing.filter((name) => isPendingCapture(id, name));
  console.log(
    `${id} images → ${dest} (${names.length - missing.length} supplied, ${pending.length} pending placeholder)`
  );
  if (pending.length) {
    console.log(`Pending captures are listed in ${id}/images/README.md`);
  }
  return unexpected.map((name) => `${id}/images/${name}`);
}

/** @param {string} id */
function reportSection(id) {
  const { names, missing } = surveySection(id);
  const pending = missing.filter((name) => isPendingCapture(id, name));
  const unexpected = missing.filter((name) => !isPendingCapture(id, name));
  console.log(`${id} screenshots referenced: ${names.length}`);
  console.log(`  supplied: ${names.length - missing.length}`);
  console.log(`  pending:  ${pending.length}`);
  for (const name of pending) console.log(`    pending: ${id}/images/${name}`);
  if (unexpected.length) {
    console.log(`  unexpected missing: ${unexpected.length}`);
    for (const name of unexpected) console.log(`    missing: ${id}/images/${name}`);
  }
  return unexpected.map((name) => `${id}/images/${name}`);
}

function main() {
  const report = process.argv.includes("--report");
  const only = process.argv
    .find((arg) => arg.startsWith("--section="))
    ?.slice("--section=".length);

  const selected = only ? SECTIONS.filter((s) => s.id === only) : SECTIONS;
  if (selected.length === 0) {
    console.error(`Unknown section: ${only}`);
    process.exit(1);
  }

  /** @type {string[]} */
  const unexpected = [];
  for (const section of selected) {
    unexpected.push(...(report ? reportSection(section.id) : publishSection(section.id)));
  }
  if (unexpected.length) {
    console.error(`Unexpected missing captures (${unexpected.length}):`);
    for (const name of unexpected) console.error(`  ${name}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
