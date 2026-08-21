import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

function loadSidebar() {
  const p = path.join(SRC, ".sidebar.json");
  if (!fs.existsSync(p)) {
    return {
      guide: [],
      authors: [],
      cookbook: [],
      samples: [],
      docs: [],
      specs: [],
      reference: [],
      results: []
    };
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const sidebar = loadSidebar();

// `withMermaid` renders ```mermaid fences as diagrams instead of code blocks. It merges
// into the `vite` block below rather than replacing it.
export default withMermaid(
  defineConfig({
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
      /\/results\/raw/,
      /\.\/raw\//,
      /\/editor\//,
      /\/react-native-web\//
    ],
    themeConfig: {
      nav: [
        { text: "Guide", link: "/guide/" },
        { text: "Build an app", link: "/authors/" },
        { text: "Cookbook", link: "/cookbook/" },
        { text: "Samples", link: "/samples/" },
        { text: "Editor", link: "/editor/" },
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
        "/guide/": sidebar.guide,
        "/authors/": sidebar.authors,
        "/cookbook/": sidebar.cookbook,
        "/samples/": sidebar.samples,
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
  })
);
