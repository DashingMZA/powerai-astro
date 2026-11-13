# Image Storage

## Where images live

- **Local images:** `public/images/` (16 entries at the top level plus subfolders, e.g. `public/images/blog/`, `public/images/avatars/`, `public/images/integrations/`). They are served at `/images/…` and are the CMS media root (`.sitepins/config.json`: `"media": "public/images"`).
- **Remote images:** any absolute `https://…` URL, typically an R2 bucket served from `https://media.csofts.tech/…`. There is **no upload code, no S3 client call, and no media-related environment variable anywhere in the repo** — remote images are just URLs written into frontmatter. See "R2 workflow" below.

## `ImageMod.astro` — the only optimized image path

`src/layouts/components/ImageMod.astro` is the single component that uses `astro:assets`. It is used by exactly three places: `Hero.astro`, `Logo.astro`, and `EssentialFeatures.astro`. Its rules (verified by reading the component):

1. **Absolute URLs render verbatim.** If `src` starts with `http://`, `https://`, or `//`, it is rendered as a plain `<img src="…">` with no `/public` prefix and no site-domain prefix. This is the R2 path — a media URL can never become `/publichttps://…` or `https://powerai.csofts.techhttps://…`.
2. **SVGs bypass the optimizer.** SVG sources (or `format="svg"`) render as a plain `<img>`. Sharp cannot process SVG, and the old code failed the build on them (`UnsupportedImageFormat` for `essential-features-2/3/4.svg` — fixed 2026-11-12, commit `6c70fd0`).
3. **Local raster images go through `astro:assets`.** The path is resolved under `/public/images` via `import.meta.glob`, then rendered with `<Image … format="webp" quality="mid" fit="contain">`. The build optimizes 7 such images (verified in the 2026-11-12 build log).
4. **Missing local images render nothing** (plus a yellow console warning at build time: `Image not found - <src>. Make sure the image is in the /public/images folder.`). A typo'd local path is a silently missing image, not a build error.

Props: `src`, `alt`, `width`, `height` (required), plus optional `loading`, `decoding`, `format`, `fit`, `class`, `fetchpriority`, `style`. Defaults: `loading="lazy"`, `decoding="async"`, `format="webp"`, `fit="contain"`, `quality="mid"`.

## Everything else is a plain `<img>`

18 plain `<img>` tags exist across the layouts and pages (blog cards, post hero, case-study cards, featured post, icon boxes, gallery, team, about, careers index). Those images get **no resizing, no format conversion, and no `srcset`** — what is in `public/images` is what is served, including large PNG hero images (`/images/banner.png`, `/images/about-banner.png`). If an image needs optimization, route it through `ImageMod.astro` or convert it at the source.

## R2 workflow (env-based credentials only, never in code)

`@aws-sdk/client-s3` and `exif-be-gone` are wired into one script:
`scripts/upload-to-r2.mjs` (`pnpm upload:r2 -- --file <path> [--key <key>] [--dry-run]`).
It strips EXIF/XMP metadata before upload and PUTs the file to the R2 bucket
that serves `https://media.csofts.tech/…`. Credentials come only from the
environment (`R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`; optional `R2_PUBLIC_BASE_URL` just for printing the
public URL) — no bucket name, endpoint, or credential exists in code or
config, and the script refuses to upload when any variable is missing.
`--dry-run` needs no credentials: it prints the planned key, content-type,
original vs stripped size, and sha256. Nothing in this repo runs the script
automatically; it is a manual upload step.

1. **Upload** the image: `pnpm upload:r2 -- --file public/images/blog/my-post-hero.png --key blog/my-post-hero.png`
   (or `--dry-run` first to check the plan; or use the Cloudflare dashboard /
   `wrangler r2 object put` instead — the repo has no opinion here).
2. **Use the public media URL in frontmatter or config**, e.g.:
   ```yaml
   image: "https://media.csofts.tech/blog/my-post-hero.png"
   ```
3. **It renders verbatim** — in `ImageMod.astro` (hero/logo/features), in `og:image`/`twitter:image` (`Base.astro` + `src/lib/seo.ts` `toAbsoluteUrl()`), and in plain `<img>` tags (which pass `src` through untouched).
4. **Do not** prefix the URL with `/public` or the site domain, and do not put R2 credentials, tokens, or presigned URLs into content or config. If a private bucket is ever needed, that is a separate design (signed URLs / a worker) — it does not exist today.

## Image rules (the short version)

- Site-relative paths (`/images/…`) must exist under `public/images/` — otherwise `ImageMod` renders nothing and `Base.astro` falls back to the default OG image.
- Absolute URLs (`https://…`) are never modified. Use them for all R2/media.csofts.tech assets.
- SVGs always bypass optimization; use `ImageMod` (or a plain `<img>`), never `<Image>` directly.
- Prefer WebP/AVIF at the source for large photos; the repo only converts the 7 images that pass through `ImageMod`.
- `alt` text is required by the `ImageMod` props. For decorative images elsewhere, use an empty `alt=""` (several current usages have weak alt text like `"Icon"` / `"goals"` — see [ACCESSIBILITY.md](./ACCESSIBILITY.md)).

## Known-bad reference

Four `-index.md` files (`changelog`, `about`, `contact`, `pricing`) set `image: "/images/image-placeholder.png"`. **That file does not exist in `public/images/`** (verified 2026-11-12). `Base.astro` guards this for `og:image` (falls back to `config.metadata.meta_image`), but any component that renders the page `image` directly will show a broken image. Either add the file or remove the references.
