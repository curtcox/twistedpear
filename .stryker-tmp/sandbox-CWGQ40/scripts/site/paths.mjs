// @ts-nocheck
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const SITE_ROOT = path.join(ROOT, "site");
export const SITE_SRC = path.join(SITE_ROOT, "src");
export const SITE_DIST = path.join(SITE_ROOT, ".vitepress", "dist");
export const RESULTS_DIR = path.join(ROOT, "site-results");
export const REPO_URL = "https://github.com/curtcox/twistedpear";
export const PAGES_BASE = "/twistedpear/";
export const PAGES_URL = "https://curtcox.github.io/twistedpear/";

export { ROOT };
