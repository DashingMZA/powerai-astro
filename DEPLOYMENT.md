# Deployment

> **No deployment has been performed as part of the 2026-11-12 upgrade.** Everything below is the configured target setup plus known blockers, verified by reading `package.json`, `astro.config.mjs`, `wrangler.jsonc`, `netlify.toml`, `Dockerfile`, and `.github/workflows/`. The production build itself was verified locally (`astro build` exits 0, 65 pages, `dist/`).

## Output model

The site is **fully static**: `astro.config.mjs` has **no `adapter()` call**, and neither installed adapter (`@astrojs/cloudflare` 14.4.7, `@astrojs/vercel` ^11.0.21) is wired. `pnpm run build` produces `dist/` — plain HTML/CSS/JS plus `rss.xml`, `sitemap-index.xml`, `sitemap-0.xml`, and `robots.txt`. Any static host can serve it. Wiring an adapter is a deliberate, separate change (it changes the output mode); do not add one casually.

**Before any deploy:** update `src/config/config.json` `site.base_url` to the production domain (currently `https://powerai.csofts.tech`), replace the placeholder contact details (`john@example.com`, `(+1) 123-346-7890`, broken `https://csofts` copyright link), and read the limitations in [README.md](./README.md) — dead forms, stale demo content, and no security headers all ship with the current build.

## Cloudflare Workers (static assets) — the configured path

- `wrangler.jsonc`: `name: "powerai-astro"`, `compatibility_date: "2026-11-09"`, `assets: { directory: "./dist", not_found_handling: "404-page" }`. This serves `dist/` as static assets; the custom 404 page is served for unknown paths.
- Deploy: `pnpm run deploy:cf-workers` (`pnpm run build && wrangler deploy`). Preview: `pnpm run preview:cf-workers` (`pnpm run build && wrangler dev`).
- `wrangler` ^4.161.0 is a devDependency. No `wrangler.toml` exists (only `wrangler.jsonc`).
- **Stale comment:** the comments at the top of `wrangler.jsonc` still say `npm run deploy:cf-workers` / `npm run preview:cf-workers`. The scripts are `pnpm` — use the `pnpm run …` forms above.
- **No headers are configured** in `wrangler.jsonc` (no CSP/HSTS/etc.) — see [SECURITY.md](./SECURITY.md). Adding a `_headers` file to `public/` is the Cloudflare-native way to add them.
- The live domain in config is `https://powerai.csofts.tech`; the README's old demo link `https://powerai-astro.pages.dev/` was not verified live in this pass.

## Vercel

- **No Vercel adapter is wired and no `vercel.json` exists.** Because output is static, the project can be deployed as a static site: import the repo, set the build command to `pnpm run build`, the output directory to `dist`, and Node.js to 24. That path has **not** been attempted in this pass — treat it as untested until someone runs it.
- To use Vercel's SSR/edge features instead, wire `@astrojs/vercel` as the adapter in `astro.config.mjs` first (and re-verify the build — adapter output is not static).
- Deployments are **manual only** by project policy: do not enable Vercel auto-deploy on git push without an explicit decision (the Astroplate precedent uses an "Ignored Build Step" of "Don't build anything" for the same reason).

## Netlify

- `netlify.toml` (current, fixed in this upgrade):
  ```toml
  [build]
  publish = "dist"
  command = "pnpm build"

  [build.environment]
  NODE_VERSION = "24"
  ```
- This is now consistent (pnpm + Node 24). It has **not** been deploy-tested in this pass. Note there are no `_headers` / `_redirects` files for Netlify — security headers would need them (see [SECURITY.md](./SECURITY.md)).

## Docker — BROKEN as committed, do not use yet

The `Dockerfile` cannot build as committed:

1. **The `runner` stage copies `./config/nginx/nginx.conf`, but no `config/` directory exists in the repo.** The build fails at that step. Fix: add `config/nginx/nginx.conf` (with the intended nginx config, including SPA/404 handling) or change the `runner` stage to a different server.
2. It defaults to `ARG INSTALLER=pnpm` and installs with `corepack prepare pnpm@12.19.0` + `pnpm i --frozen-lockfile` — that part is consistent with the repo. (The yarn/npm branches exist but no `yarn.lock`/`package-lock.json` is present, so only the pnpm path can work.)
3. Base image is `node:24-alpine` (builder) → `nginx:alpine` (runner), which matches the Node 24 requirement.

Until the nginx config is added, Docker is not a deployable target. The `README`'s old `docker build --build-arg INSTALLER=npm` example is wrong for this repo — use `pnpm`.

## GitHub Pages (CI)

`.github/workflows/deploy-to-github-pages.yml` exists and is **manual-only** (`workflow_dispatch`). It is not a push-deploy. CI (`.github/workflows/ci.yml`) runs on push/PR to `main`: `pnpm install --frozen-lockfile` → `astro check` → Prettier check → production build. The 2026-11-12 upgrade fixed the earlier CI blockers (missing lockfile, missing `packageManager` pin). CI was not run remotely in this pass.

## Post-deploy checklist

1. `curl -I https://<domain>/` returns 200; `curl -I https://<domain>/does-not-exist` returns the 404 page (status behavior depends on the host — Cloudflare serves it via `not_found_handling: "404-page"`; verify on the actual host).
2. `https://<domain>/sitemap-index.xml` and `https://<domain>/sitemap-0.xml` load, list the production domain, and exclude `/404`, `/login`, `/sign-up`.
3. `https://<domain>/rss.xml` loads with 20 items (all current posts).
4. `https://<domain>/robots.txt` shows the production `Sitemap:` line.
5. View-source on `/` and on a blog post: canonical present, `og:type` correct (`website` vs `article`), exactly one `application/ld+json` block.
6. Spot-check an R2 image URL page (if any) — the absolute URL must appear verbatim in `og:image` and in the rendered `<img>`.
7. Confirm the login/sign-up pages are `noindex` (they are dead placeholder pages — consider removing them from a production deploy; see [SECURITY.md](./SECURITY.md)).
