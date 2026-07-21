import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

function loadSidebar() {
  const p = path.join(SRC, ".sidebar.json");
  if (!fs.existsSync(p)) {
    return {
      docs: [],
      specs: [],
      reference: [],
      results: []
    };
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const sidebar = loadSidebar();

export default defineConfig({
  title: "TwistedPear",
  description: "Documentation, specifications, and quality reports",
  base: "/twistedpear/",
  srcDir: "src",
  // Static assets (TypeDoc, standalone HTML) live in site/public
  vite: {
    publicDir: path.resolve(ROOT, "public")
  },
  ignoreDeadLinks: [
    /\/api\/typedoc/,
    /\.\.\/typedoc/,
    /\/typedoc/,
    // Standalone HTML copied into public/
    /simulation-architecture/,
    // Raw report artifacts
    /\/results\/raw/
  ],
  themeConfig: {
    nav: [
      { text: "Docs", link: "/docs/" },
      { text: "Specs", link: "/specs/" },
      { text: "Results", link: "/results/" },
      { text: "API", link: "/api/" },
      { text: "Reference", link: "/reference/" },
      {
        text: "GitHub",
        link: "https://github.com/curtcox/twistedpear"
      }
    ],
    sidebar: {
      "/docs/": sidebar.docs,
      "/specs/": sidebar.specs,
      "/reference/": sidebar.reference,
      "/results/": sidebar.results
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/curtcox/twistedpear" }
    ],
    search: {
      provider: "local"
    },
    outline: [2, 3]
  }
});
