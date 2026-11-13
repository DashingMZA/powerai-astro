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

### Dependency vulnerabilities — `pnpm audit` (re-audited 2026-11-13, this worktree)

`pnpm audit` reports **10 vulnerabilities: 5 high, 4 moderate, 1 low** (down from 11 on 2026-11-13 — the `zod` / `tailwind-bootstrap-grid` advisory is gone with that package's removal; re-audit confirms no `zod` advisory remains). All 10 are in **transitive** dependencies — no direct dependency is flagged. The remaining fixes belong in `pnpm-workspace.yaml` `overrides` + a lockfile regen, verified by a rebuild — not in a blind version bump. An overrides attempt is tracked separately (see the audit report for this round); if it lands, this table must be re-audited, not assumed clean.

| Advisory | Package (path) | Severity | Why not fixed here |
|---|---|---|---|
| GHSA-9wv6-86v2-598j | `path-to-regexp` 6.1.0 via `@astrojs/vercel > @vercel/routing-utils` | high | Patch is ≥6.3.0 (minor bump, but only reachable via override — `@vercel/routing-utils` pins the range); needs override + rebuild verification |
| GHSA-ggr8-5vv4-36mx | `deepmerge-ts` 7.1.5 via `@playform/compress` | high | Patch is ≥8.0.0 — major jump from installed 7.1.5; override not attempted (major) |
| GHSA-rgj7-g3m4-5g8c | `sharp` 0.35.3 via `@playform/compress` (libheif) | high | Direct `sharp` is already 0.35.5 — needs an override to force the nested copy up, not a direct bump |
| GHSA-wq5f-xc86-pv6w | `sharp` 0.35.3 via `@playform/compress` (librsvg, CVE-2026-96889) | high | Same as above |
| GHSA-w27v-7q3p-w38r | `svgo` 4.0.2 via `@playform/compress` | high | Patch is ≥4.1.0; installed nested copy is 4.0.2 (a second, patched 4.1.0 copy exists via `astro-icon`) |
| GHSA-4vpr-x523-8j87 | `svgo` 4.0.2 via `@playform/compress` | moderate | Same as above |
| GHSA-rj75-hqrm-r3gf | `postcss-selector-parser` 6.0.10 via `@tailwindcss/typography` | moderate | Patch is ≥6.1.5 |
| GHSA-3g3m-2fjr-6pw4 | `glob` 13.0.7 via `@astrojs/vercel > @vercel/nft` | moderate | Patch is ≥14.0.2 — major jump; override not attempted (major) |
| GHSA-g3hv-75wg-m249 | `minimatch` 10.2.6 via `@vercel/nft > glob` (+ eslint toolchains, ~70 paths) | moderate | Patch is ≥11.0.1 — major jump; override not attempted (major) |
| GHSA-238p-pmpm-9mq7 | `katex` 0.16.47 via `rehype-katex` / `remark-math` | low | Patch is ≥0.18.2; the flagged path is the nested 0.16.47 copy (direct `katex` is already 0.19.1, used only for its CSS) |

Exposure note: these are build-time / dev-server packages (`@playform/compress`, `@astrojs/vercel`, typography, KaTeX). None of them runs in the shipped static site except the code they emit at build time, so none of them is directly reachable by a site visitor. That lowers the urgency but does not remove it — a compromised build dependency can poison output. Re-audit after the lockfile regen; the `zod`/`tailwind-bootstrap-grid` entry should disappear with the removal.

**Removed 2026-11-13 (zero-usage, verified by grep over `src/`, `config/`, `scripts/`, `astro.config.mjs`):** `astro-swiper`, `disqus-react`, `i18n`, `@supercharge/promise-pool`, `turndown`, `glob`, `node-html-parser`, `tailwind-bootstrap-grid` — each appeared only in `package.json` / `pnpm-lock.yaml` / docs. **Further removals, same verification, this audit round:** `@astrojs/cloudflare` (adapter never wired — `astro.config.mjs` uses the Vercel adapter; the Cloudflare path is static-assets-only via `wrangler.jsonc`), `prop-types` (no import anywhere in `src/`), `remark-github-blockquote-alert` (never registered in the markdown pipeline). For these three the lockfile **was** regenerated in this worktree (`pnpm install` run, `pnpm-lock.yaml` committed with the removal) and `pnpm install --frozen-lockfile` passes. Kept deliberately: `@astrojs/vercel` (the adapter the API routes run on).

### API routes — implemented 2026-11-13, verified by local error-path tests

`src/pages/api/contact.ts`, `newsletter.ts`, `apply.ts` exist now (Resend backend, `prerender = false`, Vercel serverless only). Verified 2026-11-13 against a local `astro dev` server (no Resend credentials in the sandbox, so valid submissions answer 503 — live delivery is another worker's job):

- **Secrets server-only.** `RESEND_API_KEY` / `CONTACT_EMAIL` / `CONTACT_FROM_EMAIL` are read in `src/lib/resend.ts` (`process.env` first, then `import.meta.env`) and in `newsletter.ts`; no `PUBLIC_*` variable exists, no key appears in client code, and a grep for key-like values over `src/` finds nothing. Missing config → generic 503, nothing sent. `.env.example` holds placeholders only; no filled `.env` is tracked (`.env*` gitignored, `.vercel/` gitignored).
- **Validation is server-side, all fields.** Contact: name (2–100), email (syntax + ≤254), phone (≤30), subject (≤150), message (10–5000). Newsletter: email + optional first name. Apply: name/email/phone/cover letter (10–5000) + `position` must match a real careers-entry slug/title, else 400. Client `required` attributes are not relied on.
- **Rate limiting (per-instance, in-memory — honest limits).** `src/lib/rateLimit.ts` fixed window: contact/newsletter 5 per 10 min per IP, apply 3 per 60 min per IP; 429 carries `Retry-After`. Verified live in tests: the 6th contact POST in a window answered 429 with `retry-after: 595`. Each Vercel serverless instance keeps its own counters and a cold start/deployment resets them — enough to blunt casual spam on this low-traffic surface, NOT a distributed abuse defence. Cross-instance limits would need Vercel KV / Upstash Redis. The IP comes from the first `x-forwarded-for` entry (spoofable — it only affects which rate-limit bucket a request lands in, never auth).
- **Spam prevention.** Honeypot field `company` (off-screen, `aria-hidden`, `tabindex="-1"`) on all three forms; a filled honeypot gets a fake 200 success and sends nothing (verified). Minimum submit time 3000 ms via hidden `_ts` (verified: fresh-timestamp submit → 400); absent `_ts` (no-JS) skips the check, honeypot + rate limit still apply.
- **Upload security (apply).** CV only: extension `.pdf`/`.doc`/`.docx` + MIME allowlist (generic/empty MIME tolerated) + **magic-byte check** (`%PDF`, ZIP `PK\x03\x04`, OLE `D0 CF 11 E0…`) — verified: a text file renamed `.pdf` → 400 "does not look like a valid CV document". Size cap 5 MB (verified: 6 MB file → 400). Buffer held in memory, never written to disk or `public/`; filename sanitized (directories stripped, unsafe chars → `_`, ≤100 chars) before use as the email attachment name. No user file is ever served.
- **Same-origin guard (added 2026-11-13).** `isCrossOriginPost()` in `src/lib/formValidation.ts` rejects a POST whose `Origin` host differs from the request host with 403 (verified: `Origin: https://evil.example` → 403 on contact + newsletter; same-origin and absent `Origin` → accepted). There are no session cookies, so this guards the owner's inbox against third-party spam-driving, not session riding. No CORS headers are set anywhere; the forms post same-origin.
- **Error responses do not leak.** All API errors are generic JSON (`ok: false`, message, optional `field`); Resend/provider detail goes to `console.error` server-side only. Verified: malformed JSON bodies now answer 400 field errors (fixed 2026-11-13 — `readRequestFields` previously threw an uncaught `SyntaxError` and produced a 500; `apply.ts` `formData()` had the same hole, now answered with 400 "Could not read the submitted form"). GET on an API route answers the site 404 page (Astro never routes GET to the POST handler, so the in-handler 405 check is unreachable dead code — harmless). No stack traces or secrets in any tested error response.
- **XSS.** User text is escaped with `escapeHtml()` before interpolation into the Resend HTML email body. Nothing submitted is echoed into an HTML page.
- **What is NOT verified:** live Resend delivery (needs the owner's Vercel env vars + another worker's live-form tests); behaviour under a real Vercel cold start / multi-instance burst.

### Forms — live endpoints since 2026-11-13

Contact, apply, and newsletter forms post to `/api/contact`, `/api/apply`, `/api/newsletter` (same-origin `fetch`, with a plain form-post fallback via `action` + `method="POST"`). The apply form keeps its required CV upload (`accept=".pdf,.doc,.docx"`, `enctype="multipart/form-data"`), now validated server-side (see API routes above). No reCAPTCHA exists anywhere — if any page copy still claims it, that claim is false and must be removed (checked: no such claim was found in the form components during this audit). Login/sign-up still post nowhere (see Auth).

### File uploads — one upload path exists: the careers CV (see API routes)

The site accepts uploads only at `POST /api/apply`: a single CV file (PDF/DOC/DOCX, ≤5 MB, extension + MIME + magic-byte checked, held in memory, emailed as an attachment, never written to disk or `public/`, never served). The only other upload code is `scripts/upload-to-r2.mjs` — a manual, operator-run script (env-only credentials, EXIF stripped before upload). No user file is ever served from the site; do not add an upload path into `public/`.

### Error-message leakage — checked

The 404 page is a static Astro page (no stack trace, no debug output). API error responses are generic JSON (verified by local error-path tests 2026-11-13, including malformed bodies — see API routes above); no error boundary prints exceptions, and no `console.log` of secrets exists in the client bundles. The only runtime error surface is the mermaid renderer in `Base.astro`, which swallows failures silently (leaves the code block as-is). The build log prints no secrets. Live `curl -I https://powerai.jadoo.bond/privacy` (a non-route, answered 404) carries the full `vercel.json` header set, and `/.env` + `/.vercel/project.json` both answer 404 — private files are not served.

### CORS — none configured

No CORS headers, no `Access-Control-*` anywhere in `src/`, `astro.config.mjs`, `vercel.json`, `wrangler.jsonc`, or `netlify.toml`. The site is same-origin static; nothing in it needs cross-origin access. Keep it that way unless a specific cross-origin caller is approved, and then allowlist it.

### Auth — no backend exists

Login (`src/pages/login.astro`) and sign-up (`src/pages/sign-up.astro`) are placeholder pages: `<form action="">`, no validation, no auth provider, social "continue with" buttons that do nothing. They are `noindex` and excluded from the sitemap, but if deployed they invite credential entry into a form that goes nowhere — a phishing/confusion risk. **Recommendation unchanged: remove or gate these pages until real auth exists.** No session, cookie, or token code exists anywhere in the tree. The OpenRemark `siteKey` (`cmpl2v9m4000104jjmruazes1`) is a public client key by design, not a secret.

### Content rendering — author-controlled HTML, no sanitizer

`markdownify()` (`src/lib/utils/textConverter.ts`) runs `marked` with no sanitizer and the result is injected with `set:html` / `dangerouslySetInnerHTML` in ~15 places (page titles, section copy, FAQ, testimonials, footer copyright). That is safe only because every input is author-controlled content from the repo's own Markdown/JSON files — there is no user-submitted content rendered this way today. `serializeJsonLd()` escapes `</script>` in JSON-LD values. If user-generated content is ever rendered (comments beyond OpenRemark's iframe, form echoes, CMS previews), it must go through a sanitizer (e.g. DOMPurify) first — do not pass it through `markdownify` as-is.

### Env-var exposure — checked

Server-side only: `RESEND_API_KEY`, `CONTACT_EMAIL`, `CONTACT_FROM_EMAIL`, `RESEND_NEWSLETTER_SEGMENT_ID` are read in `src/lib/resend.ts` / `src/pages/api/newsletter.ts` (server routes only, never imported by client code). No `PUBLIC_*` variable exists. The remaining touchpoints are non-secret: `import.meta.env.DEV` (a dev-mode boolean in `TwSizeIndicator.astro`), `process.env.ANALYZE` (opt-in bundle visualizer gate in `astro.config.mjs`), and the R2 upload script's `R2_*` variables (server-side script only, never bundled). No secret is referenced from any `.astro`/`.tsx` file, so nothing secret can leak into client bundles through env vars. The GTM ID is a placeholder (`GTM-XXXXXX`, disabled).

### What this policy does not cover

The old `SECURITY.md` in this repo was copied from Astroplate and said "Astroplate" throughout — that has been corrected here. This document covers the PowerAI Astro theme only: it does not cover any deployed instance's hosting account, DNS, R2 bucket policy, or the OpenRemark/GTM third-party services themselves.
