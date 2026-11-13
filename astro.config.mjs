import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import compress from "@playform/compress";
import tailwindcss from "@tailwindcss/vite";
import AutoImport from "astro-auto-import";
import icon from "astro-icon";
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

// https://astro.build/config
export default defineConfig({
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
      // indexed (404 and the dead auth placeholder pages).
      filter: (page) =>
        !/\/(404|login|sign-up)\/?$/.test(new URL(page).pathname),
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
