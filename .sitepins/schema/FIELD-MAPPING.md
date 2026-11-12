# PowerAI Astro — Sitepins field mapping

Generated mirror: `.sitepins/schema/*.json` (JSON Schema, draft 2020-12).
Source of truth: `src/content/schemas.ts` — regenerate with
`node scripts/generate-sitepins-schema.mjs` after any schema change.
Never hand-edit the generated JSON.

## Collections

| Collection | Content path | Files | Loader pattern | Required fields |
|---|---|---|---|---|
| `homepage` | `src/content/homepage` | 1 (`-index.md`) | `**/-*.{md,mdx}` | — (banner optional) |
| `about` | `src/content/about` | 1 (`-index.md`) | `**/*.{md,mdx}` | `title` |
| `blog` | `src/content/blog` | 20 posts + `-index.md` | `**/*.{md,mdx}` | `title` |
| `authors` | `src/content/authors` | 0 — schema only | `**/*.{md,mdx}` | `name` |
| `categories` | `src/content/categories` | 0 — schema only | `**/*.{md,mdx}` | `name` |
| `tags` | `src/content/tags` | 0 — schema only | `**/*.{md,mdx}` | `name` |
| `careers` | `src/content/careers` | 8 jobs + `-index.md` | `**/*.{md,mdx}` | `title` |
| `case-studies` | `src/content/case-studies` | 4 studies + `-index.md` | `**/*.{md,mdx}` | `title` |
| `changelog` | `src/content/changelog` | 1 (`-index.md`) | `**/*.{md,mdx}` | `title` |
| `contact` | `src/content/contact` | 1 (`-index.md`) | `**/*.{md,mdx}` | `title` |
| `features` | `src/content/features` | 1 (`-index.md`) | `**/*.{md,mdx}` | `title` |
| `integrations` | `src/content/integrations` | 15 + `-index.md` | `**/*.{md,mdx}` | `title` |
| `pages` | `src/content/pages` | 3 (`.md`/`.mdx`) | `**/*.{md,mdx}` | `title` |
| `pricing` | `src/content/pricing` | 1 (`-index.md`) | `**/*.{md,mdx}` | `title` |
| `sections` | `src/content/sections` | 11 | `**/*.{md,mdx}` | — (all optional) |

All other fields are optional unless noted. `draft` / `featured` / `noindex`
default to `false`. Unknown frontmatter keys are stripped by Zod (no
`.catchall()` anywhere) — a typo'd key disappears instead of passing through.

## Field notes by collection

### `blog` — the article collection
- Identity: `title` (required). `slug` is an optional custom slug, reserved
  for future use — **routing still uses the filename** (`post-1.md` →
  `/blog/post-1`). Do not assume `slug` changes the URL until routing is wired.
- Dates: `date` (publish), `updated` (optional). Both coerce ISO strings /
  YAML dates. `toc` and `readingTime` are **derived at render time**, never
  stored.
- Summary: `description` (used by cards/SEO); `excerpt` (optional, falls
  back to `description`).
- Taxonomy: `category` is a free-text string; `categories` and `tags` are
  string arrays. There are no category/tag archive pages.
- Authors: inline `author: { name, avatar?, designation?, slug? }` is the
  live shape (all 20 posts). `authors: string[]` holds slugs into the
  `authors` collection for multi-author posts. See "Article ↔ author" below.
- SEO: `meta_title` (falls back to `title`), `canonical` (absolute URL),
  `noindex` (default `false`), `og_image`, `og_description`,
  `twitter_title`, `twitter_description`. `og_image` falls back to `image`.
- Relations: `related: string[]` — post filename slugs for PostSingle.
- Media: `image` is a site-relative path (`/images/blog/blog-1.png`) or an
  absolute URL. Images are plain `<img>` in blog components (no
  `astro:assets` optimization); absolute R2/media URLs must be passed
  through verbatim and never prefixed with the site URL or `/public`.

### `authors` / `categories` / `tags` — schema-only collections
No files exist. Do **not** invent author/category/tag files from the demo
names in blog frontmatter (John Doe, Jane Smith, … are template placeholders).
- `authors`: `name` (required, display name), `slug`, `bio` /
  `description`, `avatar` / `image`, `email`, `website`, `job_title` /
  `designation`, `organization`, `socials: [{ name, icon?, link }]`.
- `categories`: `name`, `slug`, `description`, `image`.
- `tags`: `name`, `slug`, `description`.

### Article ↔ author relationships
- Today: blog `author` is an embedded object; there is no join and no
  author page. The `authors` collection is the future join target.
- Migration path (when author files are created): set blog `author.slug`
  (single) or `authors[]` (multi) to the author file's slug; keep the inline
  object as a render fallback until every post is migrated. Do not delete
  the inline object in the same change that creates author files.
- Blog `category` / `tags` become slugs into `categories` / `tags` by the
  same pattern once those collections gain files.

### `case-studies`
- `category` was added 2026-11-12: it used to be stripped by Zod, which made
  the "same category first" ordering in `case-studies/[single].astro` a no-op
  (both sides `undefined`). It is optional because `-index.md` has none.
- `client` / `company`, `summary`, `challenge`, `solution`, `results`
  (string or string array) are optional structured fields. The narrative
  (challenge → solution → results → tech stack) lives in the Markdown body
  and is **not** duplicated into frontmatter; no results, stats, or
  testimonials are invented. `review_video` is a YouTube URL.
- Same shared SEO fields as blog (`meta_title`, `canonical`, `noindex`,
  `og_image`, …). `logo` is the client logo path.

### `careers`
- Live shape is `job_info`: `employ_type` ("Full-time"), `experience`
  ("3+ years"), `salary_range`, `location`, `department`, `deadline`
  (closing date, plain `"YYYY-MM-DD"` string, kept verbatim).
- Task-level names map: department → `job_info.department`,
  location → `job_info.location`, type → `job_info.employ_type`,
  closing date → `job_info.deadline`.
- New optional fields: `responsibilities: string[]`, `requirements:
  string[]`, `apply_url`, `active`. Detail still lives in the body
  ("Responsibilities" / "Qualifications" / "Benefits"). All 8 jobs have
  2025 deadlines and still render — there is no deadline filtering.
- `-index.md` also carries `page_header`, `open_positions`, `gallery`.

### `integrations`
- `title` is the display name (there is no separate `name` field).
- `icon` is the logo path (`/images/integrations/*.svg`); `logo` is an
  alias field. `category` is free text ("Communication", "Design", …).
- `website` / `docs_url` are optional; no URLs are invented.
- `status`: `available` | `beta` | `coming-soon` (optional).
- `page_header` (badge/title/subtitle/buttons) drives the single page.

### `sections`
- Heterogeneous: each file carries only the fields its component reads, so
  every field is optional. `enable` gates rendering.
- Shapes: `features` / `feature_list` (`{ title, content?, image?,
  icon?, track?, bullet_points? }`), `faq_list` (`{ question, answer }`),
  `list: string[]` (icon paths), `track` (`{ top_note?, title?,
  bottom_note?, link? }`), `stats_list` (`{ label, value: { prefix?,
  number, suffix? } }`), `testimonials` (`{ name, avatar?, content?,
  company?: { logo?, name?, link? } }`), `items` (`{ name, logo,
  link? }`), `pricing_plans` (see `pricingPlanSchema`), `offer_yearly`.
- `button: { enable?, label, link }` on CTA / integration sections.

### Single-file collections (`homepage`, `about`, `changelog`, `contact`, `features`, `pricing`)
- Each is one `-index.md` with a `page_header` block (`badge?`, `title`,
  `subtitle?`, `button_dark?`, `button_primary?`) plus page-specific blocks:
  `homepage.banner` (title/content/badge/images/buttons), `about.who_we_are`
  / `what_our_goals` (mission/vision) / `our_team.team_list`,
  `changelog.changelog_list` (`{ version, date, title, description?,
  author?, time?, categories?: [{ name, items?: [{ icon, text }] }] }`),
  `contact.contact_info` (title/subtitle/phone/email/address),
  `pricing.pricing_table` (features + plans with per-feature key/value).
- `about.page_header.button_dark` is explicitly `null` in content — the
  schema allows nullable buttons for that reason.

### `pages`
- Regular pages: `elements.mdx`, `privacy-policy.md`, `terms-of-service.md`.
  `title`, SEO fields, `description`, `image`, `draft`, `page_header`.
  Body is Markdown/MDX; shortcodes come from `astro-auto-import`.

## SEO fields (shared)
Every routable collection carries: `meta_title`, `canonical`, `noindex`
(default `false`), `og_image`, `og_description`, `twitter_title`,
`twitter_description`. These fields **are wired into `Base.astro`** (SEO pass,
commit `6023637`): canonical is always emitted, `meta_title` falls back to
`title`, `og_image` falls back to `image`, and `noindex` emits
`noindex,nofollow`. Two gaps remain: `twitter_title` /
`twitter_description` are accepted by the schema but **not rendered** by
`Base.astro` (it emits `twitter:title` / `twitter:description` from the page
title/description only), and no content file currently sets a `canonical`
override or `noindex: true` — the only `noindex` pages are the hardcoded
404 / login / sign-up pages. See `SEO_GUIDE.md`.

## Image behaviour
- All image fields are strings holding either a site-relative path
  (`/images/...`) or an absolute URL (`https://...`).
- Site-relative images live under `public/images` (`.sitepins/config.json`
  `media: public/images`).
- Never prefix an absolute URL with `base_url` or `/public` — that is the
  known `ImageMod.astro` / `Base.astro` og:image bug class; absolute URLs
  pass through verbatim.
- One known-bad reference: `changelog` / `about` / `contact` / `pricing`
  `-index.md` files point at `/images/image-placeholder.png`, which does not
  exist in `public/images`.

## Slug / routing
- Blog, careers, case-studies, integrations, pages: route = filename
  (minus extension). There is no slug-based routing yet.
- `blog.slug` and `authors.slug` / `categories.slug` / `tags.slug` are
  reserved for future custom routing; setting them today changes nothing.
- Drafts (`draft: true`) and `-`-prefixed files are excluded from listings;
  single pages redirect drafts to `/404`. Future-dated entries are hidden
  by both content parsers (`src/lib/contentParser.ts` and
  `src/lib/contentParser.astro` both filter by date), so a future-dated post
  is hidden from listings and single pages alike. Do not rely on
  future-dating for scheduling without re-verifying after any parser change.
