#!/usr/bin/env node
/**
 * Publish user-guide screenshots into site/public/guide/images.
 *
 * The guide references screenshots by absolute site path (/guide/images/<name>.png) so a
 * not-yet-supplied capture can never fail the VitePress build. Real captures are copied
 * from guide/images; anything still missing gets a generated "screenshot pending"
 * placeholder so the published page reads as intentional rather than broken.
 *
 * Usage:
 *   node scripts/site/guide-images.mjs            # copy + generate placeholders
 *   node scripts/site/guide-images.mjs --report   # list missing captures, write nothing
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { ROOT, SITE_ROOT } from "./paths.mjs";

const GUIDE_DIR = path.join(ROOT, "guide");
const GUIDE_IMAGES = path.join(GUIDE_DIR, "images");
const PUBLIC_IMAGES = path.join(SITE_ROOT, "public", "guide", "images");

const IMAGE_REF = /!\[[^\]]*\]\((\/guide\/images\/[^)\s]+)\)/g;

const PLACEHOLDER_WIDTH = 1280;
const PLACEHOLDER_HEIGHT = 720;

/** @returns {string[]} referenced image basenames, deduplicated and sorted */
export function referencedImages(guideDir = GUIDE_DIR) {
  /** @type {Set<string>} */
  const names = new Set();
  if (!fs.existsSync(guideDir)) return [];
  for (const entry of fs.readdirSync(guideDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const text = fs.readFileSync(path.join(guideDir, entry.name), "utf8");
    for (const match of text.matchAll(IMAGE_REF)) {
      names.add(path.posix.basename(match[1]));
    }
  }
  return [...names].sort();
}

/** @param {string[]} names @returns {string[]} names with no committed capture */
export function missingImages(names, imagesDir = GUIDE_IMAGES) {
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

/**
 * An 8-bit greyscale PNG with a diagonal hatch, so a placeholder is never mistaken for a
 * real capture. No text: rendering glyphs would need a font, and the guide already carries
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

function main() {
  const report = process.argv.includes("--report");
  const names = referencedImages();
  const missing = missingImages(names);

  if (report) {
    console.log(`Guide screenshots referenced: ${names.length}`);
    console.log(`Supplied: ${names.length - missing.length}`);
    console.log(`Missing:  ${missing.length}`);
    for (const name of missing) console.log(`  pending: guide/images/${name}`);
    return;
  }

  fs.mkdirSync(PUBLIC_IMAGES, { recursive: true });
  for (const name of names) {
    const src = path.join(GUIDE_IMAGES, name);
    const dest = path.join(PUBLIC_IMAGES, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    } else {
      fs.writeFileSync(dest, placeholderPng());
    }
  }

  console.log(
    `Guide images → ${PUBLIC_IMAGES} (${names.length - missing.length} supplied, ${missing.length} placeholder)`
  );
  if (missing.length) {
    console.log("Pending captures are listed in guide/images/README.md");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
