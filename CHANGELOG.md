# Changelog

All notable changes to PowerAI Astro. Dates are commit dates (2026-11-12). This file was created as part of the documentation pass on 2026-11-12; earlier history is summarized from the git log.

## [Unreleased] — ESLint cleanup + build performance audit (2026-11-12)

### Fixed

- **ESLint: 74 errors → 0** (`eslint .` 0 errors / 0 warnings; `astro check` 0/0/0; Prettier pass). All 67 `no-explicit-any` replaced with real types (`src/types/index.ts` shapes, generic `contentParser`, Zod-inferred types) or `unknown` + narrowing; zero `eslint-disable` comments left. Tabs' stale `@ts-ignore`s removed; Youtube's `@ts-ignore` → `@ts-expect-error` (real ts2339 on `<lite-youtube>`). `contentParser.astro` deleted — its typed accessor moved to `contentParser.ts` as `getSingleEntry`; all 7 importers updated. `ImageMod`/`Header` unused expressions became `if` statements (same behaviour). Latent mismatches the `any`s were hiding fixed: nullable `PageHeader` buttons, optional career `job_info` fields, `feature.bullet_points?.map`, icon guard in `WhyChooseUs`.
- **CI runs ESLint**: `pnpm run lint` step added to `.github/workflows/ci.yml` (after the astro check step).
- **Build performance — `compress({ JavaScript: false })`**: build audit (full record: `~/workspace/powerai-upgrade/PERF-AUDIT.md`) proved `@playform/compress` added ~115–130 s per build, dominated by terser re-minifying 5.68 MB of already Vite-minified JS for a 15 KB (0.26%) saving. Disabling only the JS pass: wall 162–170 s → 109–116 s, dist +15 KB. HTML/Image/SVG compression stays on (2.45 MB images + 339 KB SVG + 283 KB HTML saved). Compress was **not** removed — see [PERFORMANCE.md](./PERFORMANCE.md) for the measured trade-off.
- `.sitepins/schema/FIELD-MAPPING.md` prose corrected: placeholder image now exists, blog slug routing is live, single parser is `contentParser.ts`.

## [Unreleased] — documentation pass (2026-11-12)

### Added

- Full documentation set: `README.md` (rewritten), `INSTALLATION.md`, `CONFIGURATION.md`, `CONTENT_SCHEMA.md`, `SEO_GUIDE.md`, `IMAGE_STORAGE.md`, `DEPLOYMENT.md`, `ACCESSIBILITY.md`, `PERFORMANCE.md`, `SECURITY.md` (rewritten — the old file was copied from Astroplate and said "Astroplate" throughout), `SITEPINS_INTEGRATION.md`, and this changelog.
- Corrected `.sitepins/schema/FIELD-MAPPING.md`: its "SEO fields (shared)" section wrongly stated the SEO fields were not wired into `Base.astro` yet. They are wired (commit `6023637`); the section now says so and lists the two remaining gaps (`twitter_title`/`twitter_description` accepted but not rendered; no content uses `canonical`/`noindex` overrides).

### Verified (no code change)

- `astro build` exits 0 — 65 pages in ~9.6 s; `astro check` 0 errors / 0 warnings / 1 hint (93 files), run 2026-11-12 in the sandbox (build steps run directly, as no `pnpm` binary was on `PATH`).
- RSS emits all 20 non-draft posts with no item cap; sitemap excludes 404/login/sign-up; `robots.txt` points at the real domain.

## 2026-11-12 — `1e470dc` — feat: improve content collections and schemas

- All 15 collections now have real Zod schemas in `src/content/schemas.ts` (previously only blog and case-studies were typed; the other 10 were `z.object({}).catchall(z.any())`).
- New schema-only collections: `authors`, `categories`, `tags` (directories hold only `.gitkeep`; no files invented).
- Case-studies schema gains `category` (previously stripped by Zod, which made the "same category first" related ordering a no-op), plus optional `client`/`company`, `summary`, `challenge`, `solution`, `results`, `review_video`.
- Careers schema gains the `job_info` live shape plus optional `responsibilities`, `requirements`, `apply_url`, `active`.
- Blog schema: inline `author` object (live shape) plus `authors: string[]` (multi-author slugs), `slug` (reserved, routing still uses filename), `related`, `excerpt`, `updated`.
- `src/content.config.ts` wires each collection with an explicit `defineCollection()` (no shared helper, to keep `InferEntrySchema<>` exact per collection).
- `.sitepins/schema/*.json` mirror regenerated from the schemas via `scripts/generate-sitepins-schema.mjs`; `.sitepins/schema/FIELD-MAPPING.md` added.
- `src/config/site.ts` added: typed accessor re-exporting the JSON configs. **Not wired into any layout yet** (see [CONFIGURATION.md](./CONFIGURATION.md)).

## 2026-11-12 — `6023637` — feat: implement complete technical SEO and fix R2 image handling

- `src/lib/seo.ts` added: `siteUrl`, `isAbsoluteUrl`, `toAbsoluteUrl` (absolute URLs pass through verbatim), `canonicalUrl`, `organizationJsonLd`, `breadcrumbJsonLd`, `articleJsonLd`, `jobPostingJsonLd` (only for roles with a future deadline; salary omitted), `serializeJsonLd`.
- `Base.astro`: canonical always emitted; `og:type` website/article with `article:*` meta; `og:locale`; exactly one JSON-LD block per page; `noindex` support (used by 404/login/sign-up); `og:image` falls back to the site default when a local image path does not exist.
- Pages wired: homepage (Organization/WebSite), blog posts (BlogPosting + breadcrumbs), case studies (Article + breadcrumbs), careers (JobPosting when open + breadcrumbs), integrations/blog indexes (breadcrumbs).
- `src/pages/rss.xml.ts` added (`@astrojs/rss`): all non-draft posts, newest first, no item cap.
- `@astrojs/sitemap` filter excludes `/404`, `/login`, `/sign-up`; `public/robots.txt` now points at `https://powerai.csofts.tech/sitemap-index.xml` (old `example.com` static sitemaps removed).
- Absolute R2/media URLs no longer get `base_url` or `/public` prepended in `og:image` or `ImageMod`.

## 2026-11-12 — `6c70fd0` — fix: allow SVG images through image pipeline

- `ImageMod.astro`: SVGs (and absolute URLs) bypass `astro:assets` and render as plain `<img>`. Fixes the `UnsupportedImageFormat` build failure on `essential-features-2/3/4.svg`.

## 2026-11-12 — `f338b58` — chore: upgrade Astro to 7.4.11 and compatible dependencies

- Astro 6.2.1 → **7.4.11** (exact); `@astrojs/mdx` 8.1.5, `@astrojs/react` 7.1.8, `@astrojs/rss` ^4.0.19, `@astrojs/sitemap` 3.7.4; React 19.3.1, Tailwind 4.3.5, `motion` 14.13.0, `sharp` 0.35.5, Vite 8.3.8, Zod 4.6.7.
- `packageManager: pnpm@12.19.0` + `engines: node >= 24` added; `pnpm-lock.yaml` generated (previously no lockfile existed and CI could not pass); `pnpm-workspace.yaml` added (overrides/`allowBuilds` live there — pnpm 12 ignores npm-style top-level `overrides`).
- `@astrojs/check` moved to `devDependencies` (was in `dependencies`); TypeScript stays ^6.0.3 (`@astrojs/check` 0.9.12 does not support TS 7).
- `netlify.toml` fixed: `pnpm build`, `NODE_VERSION = "24"` (was `yarn build` / Node 22.20.0).
- Deploy scripts now use pnpm (`pnpm run build && wrangler …`).
- **New dependencies installed but not yet wired** (see [INSTALLATION.md](./INSTALLATION.md) for the full table): `@playform/compress`, `astro-icon`, KaTeX + `remark-math`/`rehype-katex`, `mermaid`, `@aws-sdk/client-s3`, `exif-be-gone`, `disqus-react` (not the comments system — OpenRemark is), `@digi4care/astro-google-tagmanager`, `astro-swiper`, `@supercharge/promise-pool`, `i18n`, `turndown`, `rollup-plugin-visualizer`, `@astrojs/cloudflare` / `@astrojs/vercel` adapters (no `adapter()` call — output stays static), ESLint + plugins (no config file), extra Prettier plugins (not enabled in `.prettierrc`).

## 2026-11-12 — `08da1bb` — baseline (pre-upgrade state)

- Astro 6.2.1 template as received: no lockfile, no `packageManager` field, CI unable to pass (`pnpm install --frozen-lockfile` with no lockfile), no canonical/JSON-LD/RSS, `ImageMod` broke absolute URLs, case-study `category` stripped by schema, stale `example.com` sitemap/robots, all forms dead (`"#"` actions), placeholder contact details. See `~/workspace/powerai-upgrade/AUDIT.md` (outside this repo) for the full baseline audit.

## Known issues carried forward (not fixed by this upgrade)

- **Dockerfile broken**: `runner` stage copies `config/nginx/nginx.conf`, which does not exist in the repo. Docker is not a deployable target until that file is added.
- **`.nvmrc` still pins Node `22.12.0`**, contradicting `engines >= 24`.
- **Two content parsers exist** (`src/lib/contentParser.ts` vs `.astro`) with different return shapes (plain `{frontmatter, slug, content}` objects vs raw `CollectionEntry`s). Both now filter future-dated entries, but the dual-parser seam is still the most fragile part of the codebase — see the baseline audit (`~/workspace/powerai-upgrade/AUDIT.md` §5.1, outside this repo).
- **Duplicate featured post** on `/blog`, `/blog/page/2`, `/blog/page/3`.
- **Dead `client:*` directives** on `.astro` components in `src/pages/case-studies/page/[page].astro` (`client:load` on `PageHeader`, `client:visible` on `CaseStudyCard`).
- **Desktop dropdown menus are hover-only** (keyboard users cannot open them); no `prefers-reduced-motion` guard; form fields lack associated labels.
- **No security headers** on any deployment target.
- **No Lighthouse / CWV measurement** (no Chromium in the sandbox).
- **`wrangler.jsonc` comments still say `npm run …`** (scripts are pnpm).
- **Stale demo content**: blog posts 2022–2023, all 8 careers past deadline (May–June 2025), changelog has two `1.0.2` entries, `/images/image-placeholder.png` referenced but missing.
