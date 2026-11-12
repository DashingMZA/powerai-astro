# Sitepins Integration

Sitepins is the Git-based CMS this theme is built to work with (the live product has been renamed **Sketivo**; the repo still uses the `sitepins` name in `.sitepins/`, `public/.well-known/sitepins.json`, and the `sitepins.com` links in the old README — the branding rename is cosmetic and out of scope for this doc).

## Current state: schema mirror only — no live integration

As of 2026-11-12, the Sitepins integration is **a generated schema mirror, not a live connection**. There is no Sitepins API client, no webhook, no preview route, and no admin UI in this repo. What exists:

| Piece | Location | Status |
|---|---|---|
| CMS config | `.sitepins/config.json` | Present: `content: src/content`, `media: public/images`, `public: public`, `configs: [src/config]`, `custom-commit: false` |
| Well-known file | `public/.well-known/sitepins.json` | Present (stale "Sitepins" branding) |
| Generated schema mirror | `.sitepins/schema/*.json` (15 files, JSON Schema draft 2020-12) | Present, generated from `src/content/schemas.ts` |
| Field mapping doc | `.sitepins/schema/FIELD-MAPPING.md` | Present, corrected 2026-11-12 (see below) |
| Generator | `scripts/generate-sitepins-schema.mjs` | Present; run after any schema change |
| Live preview / realtime | — | **Not present** — deliberately out of scope for a static theme |
| Media upload pipeline | — | **Not present** — images are files in `public/images` or absolute URLs (see [IMAGE_STORAGE.md](./IMAGE_STORAGE.md)) |

## The mirror: how it stays in sync

`src/content/schemas.ts` is the **single source of truth**. `scripts/generate-sitepins-schema.mjs` converts each Zod schema with `z.toJSONSchema()` (Zod v4) into `.sitepins/schema/<collection>.json`, adding `x-sitepins` metadata (collection name, content path, file type, frontmatter type, index file). Two manual corrections are applied by the script because Zod has no JSON Schema representation for them: `z.coerce.date()` fields are restored to proper date types (`blog.date`/`updated`, `case-studies.date`, `careers.date`).

**Workflow after any schema change:**

```bash
# 1. Edit src/content/schemas.ts (only place schemas live)
# 2. Regenerate the mirror (needs Node >= 22.6 for .ts type stripping; Node 24 is fine)
node scripts/generate-sitepins-schema.mjs
# 3. Validate
pnpm run check && pnpm run build
# 4. Commit schemas.ts + the regenerated .sitepins/schema/*.json together
```

**Never hand-edit `.sitepins/schema/*.json`.** A hand edit will be overwritten by the next regeneration and will silently desync the mirror from real validation.

## Field mapping — the rules a CMS integration must respect

Full per-collection mapping lives in `.sitepins/schema/FIELD-MAPPING.md` (corrected 2026-11-12 — see "Correction" below). The rules that matter most for any future integration:

1. **Routing = filename.** Blog, careers, case-studies, integrations, and pages route from the filename minus extension (`post-1.md` → `/blog/post-1`). `blog.slug` and the `authors`/`categories`/`tags` slugs are **reserved for future custom routing; setting them changes nothing today**.
2. **Unknown frontmatter keys are stripped by Zod.** A CMS must only write fields the schema defines; a typo'd key disappears instead of erroring.
3. **Authors are inline, not files.** Blog `author: { name, avatar?, designation?, slug? }` is the live shape. `authors` is schema-only (empty directory, `.gitkeep`). Do not invent author files from demo names (John Doe, Jane Smith, … are placeholders). Migration path: create author files, then set `author.slug` / `authors[]` to file slugs, keeping the inline object as a fallback.
4. **Categories/tags are free text** (`category: string`, `tags: string[]`) until `categories`/`tags` gain files; then the strings become slugs into those collections. There are no category/tag archive pages.
5. **Case-study `category` exists now** (added 2026-11-12 — it used to be stripped, breaking "same category first" ordering). `challenge` / `solution` / `results` are optional structured fields; the narrative lives in the Markdown body.
6. **Careers use `job_info`** (`employ_type`, `experience`, `salary_range`, `location`, `department`, `deadline` as a plain `"YYYY-MM-DD"` string). `responsibilities` / `requirements` / `apply_url` / `active` are new optional fields; detail lives in the body. All 8 current jobs are past deadline (May–June 2025) and still render — there is no deadline filtering.
7. **Images are strings: site-relative (`/images/…`) or absolute (`https://…`).** Absolute URLs must pass through verbatim — never prefix with `base_url` or `/public`. This is the known `ImageMod.astro` / `Base.astro` bug class, fixed 2026-11-12.
8. **One known-bad image reference:** changelog/about/contact/pricing `-index.md` files point at `/images/image-placeholder.png`, which does not exist in `public/images/`. A CMS should not copy that value into new content.
9. **`draft` / `featured` / `noindex` default to `false`.** Drafts are excluded from listings; single pages redirect drafts to `/404`.
10. **SEO fields are shared** (`meta_title`, `canonical`, `noindex`, `og_image`, `og_description`, `twitter_title`, `twitter_description`). `twitter_title`/`twitter_description` are accepted by the schema but **not rendered** by `Base.astro` today.
11. **`toc` / `readingTime` are derived at render time** — never stored in frontmatter, never written by a CMS.

## Correction made 2026-11-12 (FIELD-MAPPING.md)

The mapping doc previously stated, in its "SEO fields (shared)" section, that the SEO fields were "not wired into `Base.astro` yet" and that "layouts belong to the parallel SEO work". That was stale: the SEO work landed in commit `6023637` (`Base.astro` now renders canonical, `og:type`, article meta, and one JSON-LD block from these fields, and pages pass them). The section now states the fields **are wired** and lists the two remaining gaps (`twitter_title`/`twitter_description` not rendered; no content currently uses `canonical`/`noindex` overrides). No other part of `FIELD-MAPPING.md` needed correction — its collection table, field notes, and slug/routing sections were verified against `src/content/schemas.ts` and the content files.

## Future integration requirements

For a live Sitepins/Sketivo integration (not built yet), the theme needs, at minimum:

1. **Content write-back**: the CMS writes Markdown + frontmatter into `src/content/**` (via git, per `.sitepins/config.json` `custom-commit: false`) and media into `public/images/`. The schema mirror is the validation contract for those writes.
2. **Config editing**: `src/config/*.json` are listed under `configs` — the CMS must edit them as JSON and must re-run `themeGenerator.js` (or a build) after `theme.json` changes, since `generated-theme.css` is build output.
3. **Slug routing** (if custom slugs are ever promised): wire `blog.slug` into routing first — today it is reserved and ignored.
4. **Author/category/tag pages** (if the CMS exposes them): author archive, category, and tag listing pages do not exist; they must be built (`src/pages/…`) before the CMS links to them.
5. **Media upload**: either keep the file-based flow (upload → `public/images/` → git) or build an R2 upload path (no S3 code exists today; `@aws-sdk/client-s3` is installed but unused — see [IMAGE_STORAGE.md](./IMAGE_STORAGE.md)). Absolute media URLs already render correctly everywhere.
6. **Preview**: a live-preview route does not exist. The Astroplate precedent (restore via `git checkout <commit> -- app/src/app/api/sandbox/` on the Sitepins side) is a Sitepins-side concern, not something this repo provides.
7. **Forms/auth**: the theme has no backend. A CMS that promises working contact/apply/newsletter forms or login must supply that backend — the theme's forms currently post to `"#"` (see [CONFIGURATION.md](./CONFIGURATION.md)).
