# SEO Guide

All SEO behavior below was verified by reading `src/layouts/Base.astro`, `src/lib/seo.ts`, `src/pages/rss.xml.ts`, `astro.config.mjs`, `public/robots.txt`, and the built output in `dist/` (build verified 2026-11-12).

## What every page gets (via `Base.astro`)

`Base.astro` is the single layout for all pages. It always emits:

- **`<title>`** — `meta_title` frontmatter, else `title`, else the site title from `config.json`. Plain-textified and whitespace-collapsed.
- **Canonical link — always emitted.** `canonicalUrl(Astro.url.pathname, canonical)` in `src/lib/seo.ts`: a frontmatter `canonical` override wins, otherwise the current pathname resolved against `config.site.base_url`. (Before this upgrade, canonical was only emitted when a page passed it — and no page did — so no page had a canonical at all.)
- **Meta description** — page `description`, else `config.metadata.meta_description`.
- **Open Graph** — `og:title`, `og:description`, `og:type` (`website` by default, `article` for blog posts and case studies), `og:url` (the canonical), `og:locale` (`en_US`), `og:image`.
- **Twitter** — `twitter:title`, `twitter:description`, `twitter:card` (`summary_large_image`), `twitter:image`.
- **Article meta** (only when `ogType="article"` and values exist): `article:published_time`, `article:modified_time`, `article:author`, `article:section`.
- **Exactly one JSON-LD block** when the page passes `jsonLd` — serialized by `serializeJsonLd()` (`src/lib/seo.ts`), which escapes `</script>` inside values. Pages that pass no `jsonLd` emit none.
- **`<meta name="robots" content="noindex,nofollow">`** only when the page passes `noindex` — currently the 404, login, and sign-up pages (see below).

`Base.astro` also renders `<meta charset="utf-8">`, the viewport (`width=device-width, initial-scale=1, maximum-scale=5`), the Google-Fonts `<Font>` tags from `theme.json`, the GTM snippet (only when enabled — it is disabled), a skip link, and `ClientRouter` (view transitions).

## Per-page SEO wiring

| Page | `og:type` | JSON-LD |
|---|---|---|
| Homepage (`src/pages/index.astro`) | `website` (default) | `organizationJsonLd()` — Organization + WebSite |
| Blog post (`src/pages/blog/[single].astro`) | `article` | `articleJsonLd()` (`BlogPosting`) + `breadcrumbJsonLd()` |
| Blog index / paginated (`blog/index.astro`, `blog/page/[page].astro`) | `website` | `breadcrumbJsonLd()` |
| Case study (`src/pages/case-studies/[single].astro`) | `article` | `articleJsonLd()` (`type: "Article"`) + `breadcrumbJsonLd()` |
| Career (`src/pages/careers/[single].astro`) | `website` | `jobPostingJsonLd()` **only if the role is open** (see below), else `breadcrumbJsonLd()` alone |
| Integration (`src/pages/integrations/[single].astro`) | `website` | `breadcrumbJsonLd()` |
| 404 / login / sign-up | `website` | none; `noindex` is set |

Frontmatter SEO fields (`meta_title`, `canonical`, `noindex`, `og_image`, `og_description`, `twitter_title`, `twitter_description`) are validated by the schemas (see [CONTENT_SCHEMA.md](./CONTENT_SCHEMA.md)). Two honest gaps:

- **`twitter_title` / `twitter_description` are accepted but not rendered.** `Base.astro` emits `twitter:title`/`twitter:description` from the page title/description only. Setting the frontmatter fields changes nothing today.
- **No page currently passes a `canonical` override or `noindex: true` from frontmatter** (the plumbing exists; content does not use it). The only `noindex` pages are the hardcoded 404/login/sign-up ones.

## JSON-LD rules (`src/lib/seo.ts`)

- **Organization + WebSite** — homepage only. Logo is the site logo resolved to an absolute URL.
- **Article / BlogPosting** — built from validated frontmatter only: headline, description, image, `datePublished`/`dateModified` (ISO), author as a `Person` (`name` + `jobTitle` from `author.designation`), `articleSection` from `category`, `mainEntityOfPage`, and `publisher` (Organization). No data is invented — missing fields are omitted.
- **BreadcrumbList** — only on pages that actually render breadcrumbs.
- **JobPosting — only for currently-open roles.** `jobPostingJsonLd()` returns `null` unless the role has a title, description, location, **and a deadline still in the future**. Salary is deliberately omitted: the frontmatter `salary_range` is a raw string (`"$80,000 - $110,000"`) that cannot be turned into valid structured salary data without inventing numbers. **Consequence, verified 2026-11-12: no career page emits `JobPosting` today**, because all 8 careers have deadlines in May–June 2025.
- **No `SoftwareApplication` and no `Person` pages.** There is no software-download structured data and no author archive pages; the only `Person` in any JSON-LD is the inline blog author inside an Article block.
- **No `og:locale` alternates, no `twitter:site`.** Not implemented.

## Absolute URLs pass through verbatim

`toAbsoluteUrl()` / `isAbsoluteUrl()` in `src/lib/seo.ts`: an absolute `http(s)` (or protocol-relative) URL is returned unchanged; only relative paths get `base_url` prepended. This fixes the old bug where an R2 image URL became `https://powerai.csofts.techhttps://media.csofts.tech/…` in `og:image` / `twitter:image`. The same rule applies in `ImageMod.astro` — see [IMAGE_STORAGE.md](./IMAGE_STORAGE.md).

One extra guard in `Base.astro`: a **local** `og:image` path that does not exist under `/public/images` falls back to the site default (`config.metadata.meta_image`) instead of emitting a 404 image URL. This matters because four `-index.md` files (changelog, about, contact, pricing) reference `/images/image-placeholder.png`, which **does not exist** in `public/images`.

## Sitemap

Generated at build time by `@astrojs/sitemap` (`sitemap()` in `astro.config.mjs`, `site` taken from `config.json` `base_url`). Output: `dist/sitemap-index.xml` → `dist/sitemap-0.xml`, all URLs on `https://powerai.jadoo.bond` (since `base_url` was changed 2026-11-13). A slug-alias filter in `astro.config.mjs` lists only `/blog/<slug>` when a post sets a frontmatter `slug`, never the `/blog/<filename>` alias.

The sitemap **excludes** `/404`, `/login`, and `/sign-up` via the `filter` in `astro.config.mjs`:

```js
filter: (page) => !/\/(404|login|sign-up)\/?$/.test(new URL(page).pathname),
```

Drafts are never built as routes, so they never appear. The old committed static sitemaps (`public/sitemap.xml` / `public/sitemap-0.xml` pointing at `example.com`) are gone — do not re-add static sitemap files to `public/`; the generated one is authoritative.

## RSS — `/rss.xml`

`src/pages/rss.xml.ts` (wired via `@astrojs/rss`):

- Includes **all non-draft, non-`-index` blog posts, sorted newest-first. There is no item limit in the code** — it currently emits 20 items only because 20 posts exist. If the blog grows, the feed grows; add a `.slice(0, N)` if a cap is wanted.
- Each item: `title`, `description` (falls back to `""`), `link: /blog/<filename>`, `pubDate` from frontmatter `date`.
- Feed title/description come from `config.site.title` / `config.metadata.meta_description`; `site` comes from `context.site ?? config.site.base_url`.

## `robots.txt`

`public/robots.txt` (copied verbatim to `dist/`):

```text
User-agent: *
Allow: /

Sitemap: https://powerai.jadoo.bond/sitemap-index.xml
```

It points at the real domain and the generated sitemap index. If `base_url` changes, update this file by hand — nothing generates it. It points at `https://powerai.jadoo.bond/sitemap-index.xml` (fixed together with `base_url` on 2026-11-13).

## What is NOT done (SEO gaps)

- **Content refreshed 2026-11-13**: all 20 blog posts rewritten (no lorem ipsum left), newest post is 2026-11-13 (RAG for SaaS Teams); all 8 careers archived with a "no open roles" message. One flagged item remains: the Junior Frontend Developer body is largely copy-pasted Senior Product Designer copy — needs owner-supplied correct copy.
- **No tag archive pages** — `tags` are free text with no listing pages. Author archives (7) and category archives (5) **do** exist since the 2026-11-12 gaps-fix round (77 pages = 65 + 7 author + 5 category); the old "no author/category/tag archives" gap is now only about tags.
- **Featured post is duplicated** across `/blog`, `/blog/page/2`, `/blog/page/3` (both `blog/index.astro` and `blog/page/[page].astro` render the same featured post at the top).
- **Draft single pages redirect to `/404`** (`Astro.redirect("/404")`) rather than returning a real 404 status; status behavior on the deployed host is unverified.
- **No `twitter:site`, no `og:locale` alternates, no hreflang** (single-language site, `lang="en"`).
- **Live site re-verification still pending**: builds from this tree now emit `jadoo.bond` URLs, but the live site still serves the previous deployment until the next push auto-deploys. After the deploy, re-check the live sitemap, RSS, and a sample page's rendered `<head>` (view-source) and run the result through Google's Rich Results Test / a social debugger. Also verify the live response headers (`vercel.json` — see [DEPLOYMENT.md](./DEPLOYMENT.md)).
