# Deployment

> **Live production: https://powerai.jadoo.bond** — Vercel, custom domain, deployment
> protection (SSO) **on** with the custom domain exempt, so the production URL
> serves publicly while preview / `vercel.app` URLs stay login-protected. Do not
> change any Vercel setting from this repo. Verified 2026-11-13 in the
> `powerai-rel-sec` worktree (`a7a9c4a`): `astro build` exits 0, 77 pages,
> `dist/` 20,255,062 bytes.

## ⚠️ Domain mismatch in this tree — fix before release

**`src/config/config.json` `site.base_url` is still `https://powerai.csofts.tech`.**
The live site is `https://powerai.jadoo.bond`, but every build from this tree
emits `csofts.tech` canonicals, `og:url`/`og:image` URLs, sitemap URLs, and RSS
links, and `public/robots.txt` still points at the `csofts.tech` sitemap. Change
`base_url` to `https://powerai.jadoo.bond` (and the `robots.txt` `Sitemap:` line
by hand — nothing generates it), rebuild, and re-verify the sitemap and a
sample page's `<head>` before treating a deploy as the release. The other
placeholders are unchanged: `john@example.com`, `(+1) 123-346-7890`, and the
broken `https://csofts` copyright link are still in `config.json` — replace
them before launch. The forms are still dead (`"#"` actions) and there are no
security headers outside Vercel; see [SECURITY.md](./SECURITY.md).

## Output model

The site is **fully static**: `astro.config.mjs` has **no `adapter()` call**, and neither installed adapter (`@astrojs/cloudflare` 14.4.7, `@astrojs/vercel` ^11.0.21) is wired. `pnpm run build` produces `dist/` — plain HTML/CSS/JS plus `rss.xml`, `sitemap-index.xml`, `sitemap-0.xml`, and `robots.txt`. Any static host can serve it. Wiring an adapter is a deliberate, separate change (it changes the output mode); do not add one casually. **Exception:** the forms worker may wire `@astrojs/vercel` as the adapter for API routes — that decision is pending and is theirs, not this doc's.

## Vercel — the live production host

- **Production:** https://powerai.jadoo.bond (custom domain, SSO-exempt, public).
  Preview deployments and `*.vercel.app` URLs remain behind Vercel deployment
  protection (login). Deployments are **manual only** by project policy: do not
  enable Vercel auto-deploy on git push without an explicit decision.
- **Build:** import the repo, build command `pnpm run build`, output directory
  `dist`, Node.js 24. No Vercel adapter is wired — this is a plain static
  deployment, which is why no adapter is needed.
- **Security headers:** `vercel.json` (added 2026-11-13) sets `Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  and `X-Frame-Options: SAMEORIGIN` on every response. **No CSP is shipped**
  (it would break the site's inline scripts — see [SECURITY.md](./SECURITY.md)
  for the documented recommended CSP). `vercel.json` applies to Vercel only;
  it does nothing on any other host.
- **No secrets are needed for the static build.** Form backends (Resend etc.)
  are env vars on the Vercel project, not in the repo — there is no `.env` file
  and no `.env.example` in this tree.

## Cloudflare Workers (static assets) — the configured alternative path

- `wrangler.jsonc`: `name: "powerai-astro"`, `compatibility_date: "2026-11-09"`, `assets: { directory: "./dist", not_found_handling: "404-page" }`. This serves `dist/` as static assets; the custom 404 page is served for unknown paths.
- Deploy: `pnpm run deploy:cf-workers` (`pnpm run build && wrangler deploy`). Preview: `pnpm run preview:cf-workers` (`pnpm run build && wrangler dev`).
- `wrangler` ^4.161.0 is a devDependency. No `wrangler.toml` exists (only `wrangler.jsonc`).
- **Stale comment:** the comments at the top of `wrangler.jsonc` still say `npm run deploy:cf-workers` / `npm run preview:cf-workers`. The scripts are `pnpm` — use the `pnpm run …` forms above.
- **No headers are configured** for this path (no `_headers` file in `public/`, nothing in `wrangler.jsonc`). The `vercel.json` headers do not apply here. If this path is ever used for production, add a `_headers` file to `public/` (the Cloudflare-native way) with the same values as `vercel.json` — and re-check the CSP note in [SECURITY.md](./SECURITY.md).
- The README's old demo link `https://powerai-astro.pages.dev/` was not verified live.

## Netlify

- `netlify.toml` (current):
  ```toml
  [build]
  publish = "dist"
  command = "pnpm build"

  [build.environment]
  NODE_VERSION = "24"
  ```
- This is consistent (pnpm + Node 24). It has **not** been deploy-tested. There are no `_headers` / `_redirects` files for Netlify — the `vercel.json` headers do not apply here; security headers would need them (see [SECURITY.md](./SECURITY.md)).

## Docker — nginx config now exists, still not build-tested

`config/nginx/nginx.conf` **now exists** (added in commit `ec8d817`, which also fixed the Node 24 pin) — the old "Dockerfile broken, nginx.conf missing" blocker is gone. The `runner` stage copies it and serves `dist/` with `error_page 404 /404.html` and immutable caching for `/_astro/` assets. **Still not build-tested:** no Docker daemon is available in the sandbox (`docker` is not installed), so the image has never been built. The Dockerfile's own header says the same. Do not call Docker deployable until someone builds and runs it. Note the nginx config sets **no security headers** — add the `vercel.json` equivalents (`add_header … always;`) if Docker ever becomes a real deploy target.

## GitHub Pages (CI)

`.github/workflows/deploy-to-github-pages.yml` exists and is **manual-only** (`workflow_dispatch`). It is not a push-deploy. CI (`.github/workflows/ci.yml`) runs on push/PR to `main` in one job, steps in order: `pnpm install --frozen-lockfile` → `astro check` → `eslint` → Prettier check (`npx prettier --check ./src`) → production build. **Lockfile warning (2026-11-13):** eight zero-usage packages were removed from `package.json` without regenerating `pnpm-lock.yaml` — `pnpm install --frozen-lockfile` in CI will fail until the coordinator runs `pnpm install` and commits the updated lockfile. See [INSTALLATION.md](./INSTALLATION.md).

## Post-deploy checklist

1. `curl -I https://powerai.jadoo.bond/` returns 200; `curl -I https://powerai.jadoo.bond/does-not-exist` returns the 404 page.
2. `curl -I https://powerai.jadoo.bond/` shows the `vercel.json` headers: `strict-transport-security`, `x-content-type-options: nosniff`, `referrer-policy`, `permissions-policy`, `x-frame-options: SAMEORIGIN`.
3. `https://powerai.jadoo.bond/sitemap-index.xml` and `https://powerai.jadoo.bond/sitemap-0.xml` load, list the **jadoo.bond** domain (only after the `base_url` fix above), and exclude `/404`, `/login`, `/sign-up`.
4. `https://powerai.jadoo.bond/rss.xml` loads with 20 items (all current posts).
5. `https://powerai.jadoo.bond/robots.txt` shows the production `Sitemap:` line (update by hand when `base_url` changes).
6. View-source on `/` and on a blog post: canonical present and on `jadoo.bond`, `og:type` correct (`website` vs `article`), exactly one `application/ld+json` block.
7. Spot-check an R2 image URL page (if any) — the absolute URL must appear verbatim in `og:image` and in the rendered `<img>`.
8. Confirm the login/sign-up pages are `noindex` (they are dead placeholder pages — consider removing them from a production deploy; see [SECURITY.md](./SECURITY.md)).
