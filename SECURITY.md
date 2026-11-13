# Security

## Supported versions

PowerAI Astro is a static theme, not a hosted service: security fixes land on the `main` branch and in releases cut from it. Only the current `main` branch (and the latest release) receives security fixes.

| Version | Supported |
| ------- | --------- |
| `main` (Astro 7.x) | ✅ |
| Latest release | ✅ |
| Older releases / forks | ❌ |

Keep dependencies current — `.github/dependabot.yml` files weekly update PRs for npm/pnpm packages and GitHub Actions.

## Reporting a vulnerability

**Do not open a public issue for a security vulnerability.** Public issues are visible to everyone, including people who would exploit the flaw before a fix ships.

Instead, report it privately through GitHub's private vulnerability reporting for this repository:

1. Go to the **Security** tab of [DashingMZA/powerai-astro](https://github.com/DashingMZA/powerai-astro).
2. Click **"Report a vulnerability"** and fill in the form.

## Current posture (verified 2026-11-13, worktree at `a7a9c4a`)

### Security headers — shipped on Vercel, not elsewhere

`vercel.json` (added 2026-11-13) sets headers on every response for the
Vercel deployment — the live production host (`https://powerai.jadoo.bond`):

- `Strict-Transport-Security: max-age=63072000; includeSubDomains` (no
  `preload` — that is a domain-wide commitment for `jadoo.bond`, not taken
  here; see below),
- `X-Content-Type-Options: nosniff`,
- `Referrer-Policy: strict-origin-when-cross-origin`,
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`,
- `X-Frame-Options: SAMEORIGIN` (the site never needs to be framed).

These are the conservative set that cannot break the site: no `Content-Security-Policy` is shipped yet (see below). **The headers only apply on Vercel** — `vercel.json` is ignored by Cloudflare Workers, Netlify, and the Docker/nginx path. Those targets still have no headers configured: no `_headers` in `public/`, nothing in `wrangler.jsonc` or `netlify.toml`, and `config/nginx/nginx.conf` sets only `Cache-Control` for `/_astro/`. If the site is ever served from another host, add that host's native headers first.

**No CSP is shipped, deliberately.** A `script-src 'self'` CSP would break the site today: `Base.astro` ships an inline `<script>` (the mermaid renderer), `OpenRemarkComment.astro` ships an inline loader script (`<script is:inline>`) that injects `https://open-remark.zeon.studio/embed.js`, and Astro emits inline module scripts for islands and `ClientRouter`. A CSP that allows all of that would need `script-src 'self' 'unsafe-inline' https://open-remark.zeon.studio` (plus `https://www.googletagmanager.com` if GTM is ever enabled) — which permits exactly the inline-script execution a CSP is meant to constrain. Shipping that CSP would add a header without adding protection, and shipping a stricter one would break pages. The recommended CSP, to adopt only after the inline scripts are moved to external files or given nonces/hashes, is:

```text
Content-Security-Policy: default-src 'self'; script-src 'self' https://open-remark.zeon.studio https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://open-remark.zeon.studio; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Notes on that recommendation: `style-src 'unsafe-inline'` is needed for the inline `<style>`/Tailwind runtime styles Astro emits; `img-src https:` covers R2 absolute media URLs; `form-action 'self'` must be revisited when the forms point at a hosted form service (see below); `frame-ancestors 'none'` is the CSP equivalent of the shipped `X-Frame-Options: SAMEORIGIN` (stricter — do not ship both with different values; drop `X-Frame-Options` when the CSP lands). Do not enable GTM without adding its origins to this CSP first.

### Third-party scripts

- **OpenRemark** (`src/layouts/components/OpenRemarkComment.astro`) injects `https://open-remark.zeon.studio/embed.js` with no Subresource Integrity hash and no CSP to constrain it. It is gated by `config.json` `open-remark-comment.enable` (currently `true`). The `siteKey` in `config.json` (`cmpl2v9m4000104jjmruazes1`) is a **public client key by design, not a secret** — do not treat it as one, and do not "rotate" it as if it were.
- **Google Tag Manager** is disabled (`enable: false`, placeholder `GTM-XXXXXX`). `Base.astro` renders it via the installed `@digi4care/astro-google-tagmanager` package (`<GoogleTagmanager>` + `<GoogleTagmanagerNoscript>`, gated by `config.json`) — there is no hand-rolled GTM snippet. A live GTM ID would execute arbitrary tags with no CSP in place — enable GTM only together with the CSP in the headers section above.
- **Google Fonts** are loaded via Astro's `Font` component (`fontProviders.google()`).

### Secrets

No credentials are stored in the repo: there is no `.env` file (`.env` / `.env.production` are gitignored), no bucket name/endpoint/token in code or config, and the config values are public placeholders (see below). R2 usage is URL-only — see [IMAGE_STORAGE.md](./IMAGE_STORAGE.md). If a future integration needs a secret (form backend, upload pipeline, real GTM/Disqus keys), put it in the deployment platform's environment variables, never in a committed file.

### Placeholder contact data

`src/config/config.json` still contains `john@example.com`, `(+1) 123-346-7890`, and a copyright link to `https://csofts` (no TLD — not a valid URL). These are template placeholders; replace them before launch so a production site does not publish someone else's (or nobody's) contact details.

### Dependencies

- Astro 7.4.11, React 19.3.1, Tailwind 4.3.5, `sharp` 0.35.5, `vite` 8.3.8 — current as of the 2026-11-12 upgrade. TypeScript stays at ^6.0.3 deliberately (`@astrojs/check` 0.9.12 does not support TS 7).
- ESLint **is configured and runs**: `eslint.config.js` (flat config) exists, `pnpm run lint` (`eslint .`) reports 0 errors / 0 warnings (verified 2026-11-13), and CI runs it (`.github/workflows/ci.yml`: check → lint → format → build).
- CI (`.github/workflows/ci.yml`) runs `astro check`, ESLint, a Prettier check, and a production build on push/PR to `main`. CodeQL runs per the repo's workflow setup. Deployment is manual-only.

### Dependency vulnerabilities — `pnpm audit` (2026-11-13)

`npx -y pnpm@12.19.0 audit` reports **11 vulnerabilities: 6 high, 4 moderate, 1 low**. All 11 are in **transitive** dependencies — no direct dependency is flagged. None were fixed in this pass, for a measured reason: every fix needs either a major-version jump or a lockfile regeneration that cannot be done in this worktree (`pnpm install` is out of scope here; the lockfile must be regenerated by the coordinator before any push). The fixes belong in `pnpm-workspace.yaml` `overrides` + a lockfile regen, verified by a rebuild — not in a blind version bump.

| Advisory | Package (path) | Severity | Why not fixed here |
|---|---|---|---|
| GHSA-9wv6-86v2-598j | `path-to-regexp` via `@astrojs/vercel > @vercel/routing-utils` | high | Patch is ≥6.3.0 — a major jump from the installed 6.1.0 line; needs override + rebuild verification |
| GHSA-ggr8-5vv4-36mx | `deepmerge-ts` via `@playform/compress` | high | Patch is ≥8.0.0 — major jump from installed 7.1.5 |
| GHSA-rgj7-g3m4-5g8c | `sharp` via `@playform/compress` (libheif) | high | Installed nested sharp is 0.35.3; direct `sharp` is already 0.35.5 — needs an override to force the nested copy up, not a direct bump |
| GHSA-wq5f-xc86-pv6w | `sharp` via `@playform/compress` (librsvg, CVE-2026-96889) | high | Same as above |
| GHSA-mrhx-c7xc-m3w5 | `zod` via `tailwind-bootstrap-grid` | high | Patch is ≥4.6.6; direct `zod` is already 4.6.7 — the flagged copy is the nested one under `tailwind-bootstrap-grid`, which was **removed from `package.json` 2026-11-13** (see below); re-audit after the lockfile regen |
| GHSA-w27v-7q3p-w38r | `svgo` via `@playform/compress` | high | Patch is ≥4.1.0; installed nested copy is 4.0.2 |
| GHSA-4vpr-x523-8j87 | `svgo` via `@playform/compress` | moderate | Same as above |
| GHSA-rj75-hqrm-r3gf | `postcss-selector-parser` via `@tailwindcss/typography` | moderate | Patch is ≥6.1.5 |
| GHSA-3g3m-2fjr-6pw4 | `glob` via `@astrojs/vercel > @vercel/nft` | moderate | Patch is ≥14.0.2; installed nested copy is 13.0.7 |
| GHSA-g3hv-75wg-m249 | `minimatch` via `@astrojs/vercel > @vercel/nft > glob` (+ 70 paths) | moderate | Patch is ≥11.0.1; installed copies include 10.2.6 |
| GHSA-238p-pmpm-9mq7 | `katex` via `rehype-katex` / `remark-math` | low | Patch is ≥0.18.2; the flagged path is the nested 0.16.47 copy (direct `katex` is already 0.19.1) |

Exposure note: these are build-time / dev-server packages (`@playform/compress`, `@astrojs/vercel`, typography, KaTeX). None of them runs in the shipped static site except the code they emit at build time, so none of them is directly reachable by a site visitor. That lowers the urgency but does not remove it — a compromised build dependency can poison output. Re-audit after the lockfile regen; the `zod`/`tailwind-bootstrap-grid` entry should disappear with the removal.

**Removed 2026-11-13 (zero-usage, verified by grep over `src/`, `config/`, `scripts/`, `astro.config.mjs`):** `astro-swiper`, `disqus-react`, `i18n`, `@supercharge/promise-pool`, `turndown`, `glob`, `node-html-parser`, `tailwind-bootstrap-grid` — each appeared only in `package.json` / `pnpm-lock.yaml` / docs. **The lockfile was NOT regenerated** (`pnpm install` not run in this worktree, `pnpm-lock.yaml` untouched), so `pnpm install --frozen-lockfile` will fail until the coordinator runs `pnpm install` and commits the updated lockfile. Do not push `package.json` without it. Kept deliberately: `@astrojs/vercel` (the forms worker may need it as the adapter for API routes — decision pending) and `@astrojs/cloudflare` (the Cloudflare deploy path option — unwired adapter, output stays static).

### API routes — none exist yet; requirements for the ones being added

There are **no `src/pages/api/*` routes in this tree** (verified 2026-11-13). A forms worker is adding them in a separate worktree. Whatever they add must satisfy all of these — none of it exists to audit today:

- **No secret in client code or in the repo.** Resend (or any mail provider) keys live only in the deployment platform's environment variables, never in `src/`, `config/`, or `.env` files committed to the repo. There is no `.env` file and no `.env.example` in this tree.
- **Method + origin discipline.** Accept only the intended method (POST); reject GET/HEAD with 405. Do not add permissive CORS — there is no CORS config anywhere in the tree today, and the forms post same-origin, so no `Access-Control-Allow-Origin: *` (or any CORS header) is needed. If a cross-origin caller is ever required, allowlist that one origin explicitly.
- **Input validation + size limits.** Validate every field server-side (the browser `required` attributes are not validation); cap body size; the careers endpoint must cap the CV upload size and accept only the declared types (`.pdf,.doc,.docx` in the form today) after checking the file's actual content, not just its extension or MIME header. Reject oversized or wrong-type uploads with 400/413, never store them.
- **Rate limiting + spam defence.** The contact form publicly claims reCAPTCHA protection that does not exist — either implement a real captcha/honeypot or remove the claim when the endpoint ships. Rate-limit submissions per IP; never echo submitted content back into an HTML response unescaped.
- **Error responses must not leak.** Return generic 4xx/5xx messages; never return stack traces, env values, or provider error bodies to the client. Log the detail server-side only.
- **No auth is invented here.** The login/sign-up pages have no backend (see below); an API route must not become a pretend auth endpoint.

### Forms — current state (dead, being rewired by another worker)

Contact, apply, and newsletter forms post to `"#"` (`config.json` `*_form_action`); login/sign-up post to the same page (`action=""`). Submitting reloads the page and discards the data — no fake success is shown, which is the one honest behaviour. The contact form's reCAPTCHA claim is false (no reCAPTCHA code exists). The apply form has a required CV upload (`type="file"`, `accept=".pdf,.doc,.docx"`, `enctype="multipart/form-data"`) with **no server-side validation yet** — the `accept` attribute is a browser hint only. Until the API routes above exist, the forms must not be presented as working.

### File uploads — requirements (no upload path exists in the site today)

The only upload code in the repo is `scripts/upload-to-r2.mjs` — a manual, operator-run script (env-only credentials, EXIF stripped before upload). The site itself accepts no uploads. Any future upload endpoint must: enforce a size cap, allowlist by content sniffing (not extension/MIME alone), store outside the web root or with a non-executable content type, never serve user files from a path that executes them, and scan or quarantine before publishing. Do not accept uploads into `public/`.

### Error-message leakage — checked

The 404 page is a static Astro page (no stack trace, no debug output). There are no API endpoints to leak errors, no error boundary that prints exceptions, and no `console.log` of secrets in the client bundles. The only runtime error surface is the mermaid renderer in `Base.astro`, which swallows failures silently (leaves the code block as-is). The build log prints no secrets. **Not verified:** the live site's error responses (Vercel's default error pages) — check `curl -I https://powerai.jadoo.bond/does-not-exist` after deploy.

### CORS — none configured

No CORS headers, no `Access-Control-*` anywhere in `src/`, `astro.config.mjs`, `vercel.json`, `wrangler.jsonc`, or `netlify.toml`. The site is same-origin static; nothing in it needs cross-origin access. Keep it that way unless a specific cross-origin caller is approved, and then allowlist it.

### Auth — no backend exists

Login (`src/pages/login.astro`) and sign-up (`src/pages/sign-up.astro`) are placeholder pages: `<form action="">`, no validation, no auth provider, social "continue with" buttons that do nothing. They are `noindex` and excluded from the sitemap, but if deployed they invite credential entry into a form that goes nowhere — a phishing/confusion risk. **Recommendation unchanged: remove or gate these pages until real auth exists.** No session, cookie, or token code exists anywhere in the tree. The OpenRemark `siteKey` (`cmpl2v9m4000104jjmruazes1`) is a public client key by design, not a secret.

### Content rendering — author-controlled HTML, no sanitizer

`markdownify()` (`src/lib/utils/textConverter.ts`) runs `marked` with no sanitizer and the result is injected with `set:html` / `dangerouslySetInnerHTML` in ~15 places (page titles, section copy, FAQ, testimonials, footer copyright). That is safe only because every input is author-controlled content from the repo's own Markdown/JSON files — there is no user-submitted content rendered this way today. `serializeJsonLd()` escapes `</script>` in JSON-LD values. If user-generated content is ever rendered (comments beyond OpenRemark's iframe, form echoes, CMS previews), it must go through a sanitizer (e.g. DOMPurify) first — do not pass it through `markdownify` as-is.

### Env-var exposure — checked

Only three env touchpoints exist, none secret-bearing: `import.meta.env.DEV` (a dev-mode boolean in `TwSizeIndicator.astro`), `process.env.ANALYZE` (opt-in bundle visualizer gate in `astro.config.mjs`), and the R2 upload script's `R2_*` variables (server-side script only, never bundled). No `PUBLIC_*` variable exists. No secret is referenced from any `.astro`/`.tsx` file, so nothing secret can leak into client bundles through env vars. The GTM ID is a placeholder (`GTM-XXXXXX`, disabled).

### What this policy does not cover

The old `SECURITY.md` in this repo was copied from Astroplate and said "Astroplate" throughout — that has been corrected here. This document covers the PowerAI Astro theme only: it does not cover any deployed instance's hosting account, DNS, R2 bucket policy, or the OpenRemark/GTM third-party services themselves.
