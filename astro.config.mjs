import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import compress from "@playform/compress";
import tailwindcss from "@tailwindcss/vite";
import AutoImport from "astro-auto-import";
import icon from "astro-icon";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, fontProviders } from "astro/config";
import rehypeKatex from "rehype-katex";
import remarkCollapse from "remark-collapse";
import remarkMath from "remark-math";
import remarkToc from "remark-toc";
import sharp from "sharp";
import config from "./src/config/config.json";
import theme from "./src/config/theme.json";

// Helper to parse font string format: "FontName:wght@400;500;600;700"
function parseFontString(fontStr) {
  const [name, weightPart] = fontStr.split(":");
  let weights = [400];

  if (weightPart) {
    const weightMatch = weightPart.match(/wght@?([\d;]+)/);
    if (weightMatch) {
      weights = weightMatch[1].split(";").map((w) => parseInt(w, 10));
    }
  }

  const cleanName = name.replace(/\+/g, " ");
  return { name: cleanName, weights };
}

// Build fonts configuration from theme.json
const fontsConfig = Object.entries(theme.fonts.font_family)
  .filter(([key]) => !key.includes("_type"))
  .map(([key, fontStr]) => {
    const { name, weights } = parseFontString(fontStr);
    const typeKey = `${key}_type`;
    const fallback = theme.fonts.font_family[typeKey] || "sans-serif";

    return {
      name,
      cssVariable: `--font-${key}`,
      provider: fontProviders.google(),
      weights,
      display: "swap",
      fallbacks: [fallback],
    };
  });

// Filename-alias paths for slug-routed blog posts. When a post sets a
// frontmatter `slug` that differs from its filename,
// `src/pages/blog/[single].astro` builds BOTH `/blog/<slug>` (canonical)
// and `/blog/<filename>` (alias). The sitemap must list only the
// canonical slug URL, so the alias pathnames are collected here — read
// straight from the content files at config load, because the sitemap
// `filter` below only sees URL strings, not collection entries — and
// excluded there. No post sets `slug` today, so this set is currently
// empty; it fills automatically the moment a slug lands. A `slug` equal
// to the filename builds no alias and is not collected. Drafts are
// excluded by `getSingleEntry` before routing, so a draft's filename
// never reaches the sitemap either way.
const blogAliasPaths = new Set();
try {
  const blogDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "src",
    "content",
    "blog",
  );
  for (const file of readdirSync(blogDir)) {
    if (!/\.(md|mdx)$/.test(file) || file.startsWith("-")) continue;
    const raw = readFileSync(path.join(blogDir, file), "utf8");
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const slug = frontmatter?.[1]
      .match(/^slug:\s*["']?([^"'\r\n]+?)["']?\s*$/m)?.[1]
      ?.trim();
    const filename = file.replace(/\.(md|mdx)$/, "");
    if (slug && slug !== filename) blogAliasPaths.add(`/blog/${filename}`);
  }
} catch {
  // Blog dir unreadable — the sitemap filter degrades to the noindex
  // exclusions below; alias filtering resumes on the next successful read.
}

// https://astro.build/config
export default defineConfig({
  // Forms backend (2026-11-13): the Vercel adapter is wired with the
  // default `output: "static"` — every page stays prerendered/static,
  // and ONLY the API routes under `src/pages/api/` opt out via
  // `export const prerender = false` to run as Vercel Serverless
  // Functions. `output: "server"` was NOT chosen: it would make all
  // 77 pages server-rendered. Consequence for other hosts: the adapter
  // moves the static client output to `dist/client/` (and mirrors it
  // to `.vercel/output/static/`), so the Cloudflare Workers static
  // deploy (wrangler.jsonc, `assets: { directory: "./dist" }`) must
  // point at `./dist/client` to keep serving pages — and /api/* only
  // ever works on Vercel, never on the static host.
  adapter: vercel(),
  site: config.site.base_url ? config.site.base_url : "http://examplesite.com",
  base: config.site.base_path ? config.site.base_path : "/",
  trailingSlash: config.site.trailing_slash ? "always" : "never",
  image: { service: sharp() },
  vite: {
    plugins: [
      tailwindcss(),
      // Opt-in bundle report only: `ANALYZE=true pnpm run build` writes
      // stats.html at the repo root. Normal builds are unaffected.
      ...(process.env.ANALYZE === "true"
        ? [visualizer({ filename: "stats.html", open: false })]
        : []),
    ],
    server: { watch: { ignored: ["**/.claude/**"] } },
  },
  fonts: fontsConfig,
  integrations: [
    react(),
    sitemap({
      // Drafts are never built as routes; exclude pages that must not be
      // indexed (404 and the dead auth placeholder pages), plus the
      // filename-alias URLs of slug-routed blog posts — the sitemap must
      // contain only the canonical slug URL for those posts (see
      // `blogAliasPaths` above; empty today, no post sets `slug` yet).
      filter: (page) => {
        const pathname = new URL(page).pathname.replace(/\/$/, "") || "/";
        if (/^\/(404|login|sign-up)$/.test(pathname)) return false;
        if (blogAliasPaths.has(pathname)) return false;
        return true;
      },
    }),
    AutoImport({
      imports: [
        "@/shortcodes/Button",
        "@/shortcodes/Accordion",
        "@/shortcodes/Notice",
        "@/shortcodes/Video",
        "@/shortcodes/Youtube",
        "@/shortcodes/Tabs",
        "@/shortcodes/Tab",
      ],
    }),
    mdx(),
    // Provides the `virtual:astro-icon` module for <Icon> (src/icons/).
    icon(),
    // Last: compresses the statically generated HTML/CSS/JS/images.
    // JavaScript: false — measured 2026-11-12 (see PERFORMANCE.md):
    // terser re-minified 5.68 MB of already Vite-minified JS (139 files,
    // incl. the 1.5 MB elk/mermaid bundle) for a 15 KB (0.26%) saving,
    // at a cost of ~50-90 s per build. Vite already minifies JS, so the
    // compress JS pass pays ~100x its saving. HTML/Image/SVG/CSS stay on:
    // they save 2.45 MB images + 339 KB SVG + 283 KB HTML. Do NOT re-enable
    // JS compression for speed alone — re-measure first.
    compress({ JavaScript: false }),
  ],
  markdown: {
    // `markdown.remarkPlugins` / `rehypePlugins` are deprecated in Astro 7;
    // plugins go through `unified({...})` from @astrojs/markdown-remark.
    // remark-math + rehype-katex enable $...$ / $$...$$ math in .md/.mdx.
    // KaTeX CSS is imported in src/styles/main.css.
    processor: unified({
      remarkPlugins: [
        remarkToc,
        [remarkCollapse, { test: "Table of contents" }],
        remarkMath,
      ],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: { theme: "one-dark-pro", wrap: true },
  },
});
