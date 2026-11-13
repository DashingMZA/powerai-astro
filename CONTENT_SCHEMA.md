# Content Schema

Single source of truth: **`src/content/schemas.ts`** (620 lines). It is imported by `src/content.config.ts` (which wires each collection's glob loader to its schema) and by `scripts/generate-sitepins-schema.mjs` (which generates the `.sitepins/schema/*.json` mirror). **Change schemas in `schemas.ts` only, then regenerate the mirror** — never hand-edit the generated JSON.

## Collections (15 schemas, 12 registered)

| Collection     | Directory                  | Files today                                                             | Loader pattern   | Required fields     |
| -------------- | -------------------------- | ----------------------------------------------------------------------- | ---------------- | ------------------- |
| `homepage`     | `src/content/homepage`     | 1 (`-index.md`)                                                         | `**/-*.{md,mdx}` | — (banner optional) |
| `about`        | `src/content/about`        | 1 (`-index.md`)                                                         | `**/*.{md,mdx}`  | `title`             |
| `blog`         | `src/content/blog`         | 20 posts + `-index.md`                                                  | `**/*.{md,mdx}`  | `title`             |
| `authors`      | `src/content/authors`      | 0 — schema only (`.gitkeep`), **not registered** in `content.config.ts` | —                | `name`              |
| `categories`   | `src/content/categories`   | 0 — schema only (`.gitkeep`), **not registered** in `content.config.ts` | —                | `name`              |
| `tags`         | `src/content/tags`         | 0 — schema only (`.gitkeep`), **not registered** in `content.config.ts` | —                | `name`              |
| `careers`      | `src/content/careers`      | 8 jobs + `-index.md`                                                    | `**/*.{md,mdx}`  | `title`             |
| `case-studies` | `src/content/case-studies` | 4 studies + `-index.md`                                                 | `**/*.{md,mdx}`  | `title`             |
| `changelog`    | `src/content/changelog`    | 1 (`-index.md`)                                                         | `**/*.{md,mdx}`  | `title`             |
| `contact`      | `src/content/contact`      | 1 (`-index.md`)                                                         | `**/*.{md,mdx}`  | `title`             |
| `features`     | `src/content/features`     | 1 (`-index.md`)                                                         | `**/*.{md,mdx}`  | `title`             |
| `integrations` | `src/content/integrations` | 15 + `-index.md`                                                        | `**/*.{md,mdx}`  | `title`             |
| `pages`        | `src/content/pages`        | 3 (`.md`/`.mdx`)                                                        | `**/*.{md,mdx}`  | `title`             |
| `pricing`      | `src/content/pricing`      | 1 (`-index.md`)                                                         | `**/*.{md,mdx}`  | `title`             |
| `sections`     | `src/content/sections`     | 11                                                                      | `**/*.{md,mdx}`  | — (all optional)    |

All other fields are optional unless noted. `draft` / `featured` / `noindex` default to `false`. **Zod strips unknown frontmatter keys** (no `.catchall()` anywhere) — a typo'd key silently disappears instead of erroring, so double-check field names against this doc.

## Shared SEO fields

Every routable collection carries the same SEO block (`seoFields` in `schemas.ts`):

```yaml
meta_title: "" # falls back to title at render time
canonical: "" # absolute URL override; default is the page URL
noindex: false # true -> <meta name="robots" content="noindex,nofollow">
og_image: "" # falls back to `image`; absolute URLs pass through verbatim
og_description: ""
twitter_title: ""
twitter_description: ""
```

How they are consumed is documented in [SEO_GUIDE.md](./SEO_GUIDE.md). Note: `og_image` falls back to `image`, but `twitter_title`/`twitter_description` are accepted by the schema and **not currently rendered** by `Base.astro` (which emits only `twitter:title`/`twitter:description` from the page title/description) — setting them changes nothing today.

## Blog

```yaml
---
title: "The Rise of Edge Computing in Web Development" # required
description: "Short summary used by cards, RSS, and SEO."
excerpt: "Optional shorter excerpt; falls back to description."
slug: "custom-slug" # WIRED (2026-11-12) — see "Routing" below. No post sets it today.
date: 2023-11-05T10:00:00Z # publish date (ISO string or YAML date; z.coerce.date())
updated: 2023-11-20T10:00:00Z # optional last-modified
draft: false
author: # inline author — the LIVE shape for all 20 posts
  name: "John Doe"
  avatar: "/images/avatars/avatar-1.png"
  designation: "AI Researcher"
  slug: "" # slug into the authors collection, when one exists
authors: [] # string[] of authors-collection slugs (multi-author)
category: "AI" # free-text string; has a category archive page (see below)
categories: ["AI"] # string[] (free text)
tags: ["edge", "web"] # string[] — no post sets `tags` today, so no tag archive exists
image: "/images/blog/blog-1.png" # site-relative path or absolute URL
featured: false
related: ["post-2", "post-5"] # filename slugs of related posts
---
```

- **Routing = filename, with slug dual-routing (2026-11-12).** `post-1.md` → `/blog/post-1`. When frontmatter `slug` is set and differs from the filename, `src/pages/blog/[single].astro` serves BOTH `/blog/<slug>` (canonical) and `/blog/<filename>` (alias, whose `<link rel="canonical">` and `og:url` point at the slug URL). BlogCard links, RSS `<link>`s, share links and the `<link rel="canonical">` all derive from the same helper (`src/lib/blogUrls.ts`: `postSlug()` / `postUrl()`), so they always agree on which URL is canonical. **No post sets `slug` today** — all 20 posts are filename-routed and the build output is unchanged. Verified 2026-11-12 with a temporary `slug` on post-1 (reverted afterwards): both URLs built (78 pages), both canonicals pointed at the slug URL, RSS/blog index/author archive all linked the slug URL, and the post did not list itself under Related Blogs. Astro quirk that shaped the implementation: in the content layer the entry `id` IS the frontmatter `slug` when one is set (`astro/dist/content/loaders/glob.js` `generateIdDefault`), so the filename alias is recovered from `post.filePath`, not from `post.id` — a first attempt using `post.id` as the filename silently built only the slug URL. Known wart: `@astrojs/sitemap` lists every built page, so an aliased filename URL appears in the sitemap until a filter is added to the `sitemap()` call in `astro.config.mjs` (that file is owned by parallel work; the filter already excludes `/404`, `/login`, `/sign-up`).
- **Author/category archives exist (2026-11-12), generated only from real blog frontmatter.** `/blog/author/[author]` (7 pages: John Doe 2 posts, Jane Smith 3, Mike Johnson 3, Sarah Williams 3, Emily Davis 3, David Chen 3, Alex Rivera 3) and `/blog/category/[category]` (5 pages: Technology 12, DevOps 3, CSS 2, React 2, Accessibility 1). Slugs are derived from the display name (`src/lib/blogUrls.ts`, fresh `GithubSlugger` per call — the module-level `slug()` is stateful and would corrupt repeat lookups). The author name and category on a post page link to their archive. **There is no tag archive**: no post sets `tags`, so there is no real tag value to generate a page from — do not invent one.
- **Authors are inline, not files.** There is no author join. The `authors` collection exists only as a schema for future use — **do not invent author files for the demo names in blog frontmatter** (John Doe, Jane Smith, … are template placeholders). When author files are created, set `author.slug` (single) or `authors[]` (multi) to the author file's slug and keep the inline object as a render fallback. The `authors` / `categories` / `tags` collections are NOT registered in `src/content.config.ts` while their directories are empty — Astro's glob loader warns "No files found" on every check/build for an empty collection. Re-add one `defineCollection()` line each when a real file lands in the directory.
- **Categories/tags are free text.** `category` is a string, `tags` a string array.
- **Dates are demo dates.** All 20 posts are dated 2022-04-04 → 2023-11-05; the copy is lorem-ipsum-style demo content. Replace before launch.
- `toc` and `readingTime` are **derived at render time** (`src/lib/utils/readingTime.ts`, `PostSingle.astro`) — never put them in frontmatter.

## Case studies

Same shared SEO fields, plus:

```yaml
title: "" # required
description: ""
image: "" # hero image (site-relative or absolute URL)
logo: "" # client logo path
date: "" # optional
draft: false
featured: false
category:
  "" # added 2026-11-12 — was previously stripped by Zod,
  # which made the "same category first" related ordering a no-op
client: "" # client / company name
company: "" # alias
summary: "" # optional structured narrative fields; the narrative
challenge: "" # itself lives in the Markdown body and is NOT
solution: "" # duplicated into frontmatter
results: "" # string or string[]; no values invented
review_video: "" # YouTube URL
```

## Careers

The live shape is **`job_info`** (consumed by `OpenPositions.tsx` and `careers/[single].astro`):

```yaml
title: "" # required
description: ""
date: "" # optional (date posted; used by JobPosting JSON-LD when open)
draft: false
job_info:
  employ_type: "Full-time" # required inside job_info
  experience: "3+ years"
  salary_range: "$80,000 - $110,000" # raw string; NOT parsed into structured salary data
  location: "Remote" # required inside job_info
  department: "Engineering" # required inside job_info
  deadline: "2025-05-20" # closing date, plain "YYYY-MM-DD" string, verbatim
responsibilities: [] # optional string[]; detail still lives in the body
requirements: [] # optional string[]
apply_url: "" # optional external application URL (empty today)
active: true # optional; no deadline filtering exists
```

- **All 8 jobs are past deadline** (deadlines 2025-05-01 → 2025-06-10) and still render, because no deadline filtering exists. `JobPosting` JSON-LD is emitted only for roles with a future deadline, so **no career page currently emits `JobPosting`** — see [SEO_GUIDE.md](./SEO_GUIDE.md).
- The `-index.md` list page also carries `page_header`, `open_positions` (`{enable, badge, title}`), and `gallery` (`{enable, badge, title, images[]}`).
- The apply form posts to `"#"` (dead form) — see [CONFIGURATION.md](./CONFIGURATION.md).

## Integrations

```yaml
title: "Discord" # required; display name (no separate `name` field)
description: ""
image: "" # optional
icon: "/images/integrations/Discord.svg" # logo path
logo: "" # alias field
category: "Communication" # free text ("Communication", "Design", …)
website: "" # vendor homepage (optional; no URLs invented)
docs_url: "" # docs URL (optional)
status: available # available | beta | coming-soon (optional)
draft: false
featured: false
page_header: # badge/title/subtitle/buttons for the single page
  badge: ""
  title: ""
  subtitle: ""
```

## Sections (homepage building blocks)

Heterogeneous: each file carries only the fields its component reads, so **every field is optional**. `enable` gates rendering. Shapes (from `sectionsSchema`):

- `features` / `feature_list`: `{ title, content?, image?, icon?, track?, bullet_points?[] }`
- `faq_list`: `{ question, answer }[]`
- `list`: `string[]` (icon paths)
- `track`: `{ top_note?, title?, bottom_note?, link? }`
- `stats_list`: `{ label, value: { prefix?, number, suffix? } }`
- `testimonials`: `{ name, avatar?, content?, company?: { logo?, name?, link? } }`
- `items`: `{ name, logo, link? }[]` (trusted-client logos)
- `pricing_plans`: `{ name, content?, highlighted?, price?: { monthly: { number, prefix?, suffix? }, yearly: {…} }, features?: [{ value, include? }], button? }[]`
- `offer_yearly`, `button: { enable?, label, link }`, plus `title` / `subtitle` / `description` / `badge`.

## Single-file collections

`homepage`, `about`, `changelog`, `contact`, `features`, `pricing` are each one `-index.md` with a `page_header` block (`badge?`, `title`, `subtitle?`, `button_dark?`, `button_primary?`) plus page-specific blocks:

- `homepage.banner`: `{ title, content?, badge?: { enable?, label?, images?[] }, image?, button_dark?, button_primary? }`
- `about`: `who_we_are` (`{title?, badge?, subtitle?, image?}`), `what_our_goals` (`{badge?, title?, image?, mission?: {title?, content?, icon?}, vision?: {…}}`), `our_team.team_list` (`{name, position?, image?}[]`)
- `changelog.changelog_list`: `{ version, date, title, description?, author?, time?, categories?: [{ name, items?: [{ icon, text }] }] }[]` — note the current file has **two entries both versioned `1.0.2`**, and references the missing `/images/image-placeholder.png` (see [IMAGE_STORAGE.md](./IMAGE_STORAGE.md)).
- `contact.contact_info`: `{ title?, subtitle?, phone?, email?, address? }`
- `pricing.pricing_table`: `{ title?, features?: [{ name, key }], plans?: [{ name, highlighted?, features?: [{ key, value }] }] }`
- `about.page_header.button_dark` is explicitly `null` in content — the schema allows nullable buttons for that reason.

## Regular pages (`pages` collection)

`elements.mdx`, `privacy-policy.md`, `terms-of-service.md`. Fields: `title`, shared SEO fields, `description`, `image`, `draft`, `page_header`. Body is Markdown/MDX; shortcodes (Button, Accordion, Notice, Video, Youtube, Tabs, Tab) are auto-imported by `astro-auto-import` (`astro.config.mjs`). `elements.mdx` exercises all of them and is the demo page for shortcodes.

## Adding content

1. **Blog post:** create `src/content/blog/my-post.md` with the frontmatter above (at minimum `title`; add `date`, `description`, `image`, `author`, `category`, `tags`). It appears at `/blog/my-post` and in the paginated index (9/page) and RSS feed automatically. Set `draft: true` to hide it (drafts are excluded from listings and single pages redirect drafts to `/404`).
2. **Case study / integration / career:** same pattern in the matching folder; routing is always the filename.
3. **Homepage section:** add a file in `src/content/sections/` — but a section only renders if a component reads it (homepage wiring lives in `src/pages/index.astro`). Adding a file alone does not add a homepage block.
4. **Single-file page content:** edit the existing `-index.md` in place; do not create a second file in those folders (the `homepage` loader only matches `-`-prefixed files; the others would pick up a stray file as an extra entry).
5. **After any schema change:** edit `src/content/schemas.ts`, run `node scripts/generate-sitepins-schema.mjs` to regenerate `.sitepins/schema/*.json`, and run `pnpm run check && pnpm run build` to validate.

## Drafts, `-index.md` files, and future dates

- Files starting with `-` (`-index.md`) are list pages, not routable entries; the RSS feed and listings filter them out (`!post.id.startsWith("-")` in `rss.xml.ts`).
- `draft: true` entries are excluded from listings; single-page routes redirect drafts to `/404` (a redirect to the 404 page, not a real 404 status — see [DEPLOYMENT.md](./DEPLOYMENT.md)).
- Both content parsers filter future-dated entries (`src/lib/contentParser.ts` and `src/lib/contentParser.astro`), so a future-dated post is hidden from listings and single pages alike. Do not rely on future-dating for scheduling without re-verifying after any parser change.
