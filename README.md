# PowerAI Astro — A Free AI SaaS Website Template

PowerAI Astro is a free, dark-themed AI SaaS website template built with Astro, Tailwind CSS, TypeScript, and React. It is designed for AI product teams, SaaS founders, and agencies who need a complete, launch-ready web presence: homepage, features, pricing, blog, case studies, careers, integrations, changelog, and contact — all pre-built and driven by content files and JSON config.

> **Status (2026-11-12, `main` @ `1e470dc`):** upgraded to **Astro 7.4.11**, **pnpm 12.19.0**, **Node ≥ 24**. The production build was verified in the sandbox on 2026-11-12: `astro build` exits 0 (65 pages) and `astro check` reports 0 errors / 0 warnings / 1 hint. **Not deployed** — no deployment has been performed as part of this upgrade. See [DEPLOYMENT.md](./DEPLOYMENT.md) and [CHANGELOG.md](./CHANGELOG.md).

## Key features

- **Astro 7.4.11 + React 19 + Tailwind CSS 4** — static output, islands architecture, minimal JavaScript by default.
- **15 content collections** with Zod validation (`src/content/schemas.ts`): blog, careers, case studies, integrations, pages, sections, plus single-file page collections and schema-only `authors` / `categories` / `tags` (see [CONTENT_SCHEMA.md](./CONTENT_SCHEMA.md)).
- **Technical SEO built in** — canonical URL on every page, `og:type` website/article, one JSON-LD block per page (Organization/WebSite, Article/BlogPosting, BreadcrumbList, JobPosting only for open roles), generated sitemap, RSS feed, `robots.txt` (see [SEO_GUIDE.md](./SEO_GUIDE.md)).
- **R2-friendly images** — absolute media URLs (e.g. `https://media.csofts.tech/…`) pass through verbatim in `ImageMod.astro` and in `og:image`; local images go through `astro:assets` (WebP); SVGs bypass the optimizer (see [IMAGE_STORAGE.md](./IMAGE_STORAGE.md)).
- **MDX shortcodes** — Button, Accordion, Notice, Video, YouTube, Tabs/Tab auto-imported into MDX pages.
- **JSON-driven config** — site identity, navigation, social links, theme (colors/fonts), and SEO defaults in `src/config/*.json` (see [CONFIGURATION.md](./CONFIGURATION.md)).
- **Motion animations** — `motion` v14 (`motion/react` in React islands, vanilla `motion` in Astro inline scripts). Note: the package is `motion`, not `framer-motion`.
- **Git-based CMS ready** — `.sitepins/` schema mirror is generated from the real Zod schemas for Sitepins/Sketivo (see [SITEPINS_INTEGRATION.md](./SITEPINS_INTEGRATION.md)).
- **Fully responsive**, dark theme throughout, MIT licensed.

## Quick start

```bash
# Requirements: Node.js >= 24, pnpm 12.19.0 (pinned via packageManager)
pnpm install
pnpm run dev      # local dev server (theme watcher + astro dev)
pnpm run build    # themeGenerator + jsonGenerator + astro build -> dist/
pnpm run preview  # preview the production build locally
pnpm run check    # astro check (types)
```

Full install steps, including the Node/pnpm version notes and troubleshooting, are in [INSTALLATION.md](./INSTALLATION.md).

## Documentation

| Doc | What it covers |
|---|---|
| [INSTALLATION.md](./INSTALLATION.md) | Requirements, install, dev/build/preview, troubleshooting |
| [CONFIGURATION.md](./CONFIGURATION.md) | `config.json`, `menu.json`, `social.json`, `theme.json`, `src/config/site.ts` |
| [CONTENT_SCHEMA.md](./CONTENT_SCHEMA.md) | All 15 collections, frontmatter reference, adding content |
| [SEO_GUIDE.md](./SEO_GUIDE.md) | Canonicals, Open Graph, JSON-LD, sitemap, RSS, `robots.txt` |
| [IMAGE_STORAGE.md](./IMAGE_STORAGE.md) | Local images, R2 absolute URLs, `ImageMod.astro`, image rules |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Cloudflare Workers, Vercel, Netlify, Docker (incl. known blockers) |
| [ACCESSIBILITY.md](./ACCESSIBILITY.md) | What is accessible today, known gaps, how to verify |
| [PERFORMANCE.md](./PERFORMANCE.md) | Static output, hydration inventory, image/font costs, no Lighthouse yet |
| [SECURITY.md](./SECURITY.md) | Headers (none yet), third-party scripts, dead auth pages, secrets |
| [SITEPINS_INTEGRATION.md](./SITEPINS_INTEGRATION.md) | Sitepins/Sketivo schema mirror, field mapping, future integration |
| [CHANGELOG.md](./CHANGELOG.md) | What changed in the 2026-11-12 upgrade |

## Project structure

```
src/
  config/          config.json, menu.json, social.json, theme.json, site.ts
  content/         content collections (blog, careers, case-studies, ...)
  content.config.ts  collection loaders + schema wiring
  content/schemas.ts single source of truth for content validation
  layouts/         Base.astro, PostSingle.astro, components/, partials/, shortcodes/
  lib/             seo.ts, contentParser(.ts/.astro), utils/
  pages/           routes (index, blog, careers, case-studies, integrations, rss.xml.ts, ...)
  styles/          Tailwind + generated-theme.css (generated from theme.json)
scripts/           themeGenerator.js, jsonGenerator.js, generate-sitepins-schema.mjs
.sitepins/         CMS config + generated JSON Schema mirror
public/           images, robots.txt (sitemap is generated at build time)
```

## Pages

Homepage, About, Features, Pricing, Contact, Changelog, Blog (20 demo posts, paginated 9/page), Case Studies (4, paginated), Careers (8 listings), Integrations (15), Elements / Privacy Policy / Terms of Service, plus Login, Sign-up, and 404 pages. The build produces **65 pages** (verified 2026-11-12).

## Known limitations — read before launch

These are real, verified limitations of the current state. They are documented honestly in the guides linked above; do not assume they are fixed.

- **All forms are dead.** Contact, job-application, and newsletter forms post to `"#"` (`src/config/config.json` params). Login / sign-up have no backend at all. The contact form claims reCAPTCHA protection; **no reCAPTCHA is implemented**.
- **Placeholder contact details.** `john@example.com`, `(+1) 123-346-7890`, and a broken copyright link (`https://csofts`, no TLD) are still in `config.json`.
- **Demo content is stale.** All 20 blog posts are dated 2022-04-04 → 2023-11-05. All 8 careers have deadlines in May–June 2025 and are past deadline (no deadline filtering exists, so they still list). The changelog has two entries both versioned `1.0.2`.
- **No security headers** (no CSP/HSTS/etc.) on any deployment target yet.
- **Dockerfile is broken as committed** — it copies `config/nginx/nginx.conf`, which does not exist in the repo. See [DEPLOYMENT.md](./DEPLOYMENT.md).
- **No Lighthouse / Core Web Vitals measurement yet** — no Chromium was available in the sandbox, so no CWV claims are made. See [PERFORMANCE.md](./PERFORMANCE.md).
- **Several installed dependencies are not wired yet** (KaTeX, Mermaid, astro-icon, `@playform/compress`, S3/exif tooling, Disqus, i18n, adapters, ESLint config). Each is listed with its follow-up step in [INSTALLATION.md](./INSTALLATION.md) and [CHANGELOG.md](./CHANGELOG.md).

## Contributing / license

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). CI runs on push/PR to `main` (`astro check`, Prettier check, production build); deployment is manual-only. MIT licensed — see [LICENSE](./LICENSE).
