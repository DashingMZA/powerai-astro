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

## Current posture (verified 2026-11-12)

### No security headers — the largest gap

There are **no security headers configured anywhere**: no `_headers` / `_redirects` in `public/`, no `headers` in `wrangler.jsonc`, nothing in `netlify.toml`, and no CSP/HSTS/`X-Content-Type-Options`/`Referrer-Policy` in `astro.config.mjs` or `Base.astro`. Before a production deploy, add at minimum:

- `Content-Security-Policy` (must allow `https://open-remark.zeon.studio` and, if GTM is enabled, `https://www.googletagmanager.com` — see below),
- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` as appropriate for the host.

The host-native way: a `_headers` file in `public/` (Cloudflare Pages/Workers static assets and Netlify both honor it); for Vercel, `vercel.json` headers.

### Third-party scripts

- **OpenRemark** (`src/layouts/components/OpenRemarkComment.astro`) injects `https://open-remark.zeon.studio/embed.js` with no Subresource Integrity hash and no CSP to constrain it. It is gated by `config.json` `open-remark-comment.enable` (currently `true`). The `siteKey` in `config.json` (`cmpl2v9m4000104jjmruazes1`) is a **public client key by design, not a secret** — do not treat it as one, and do not "rotate" it as if it were.
- **Google Tag Manager** is disabled (`enable: false`, placeholder `GTM-XXXXXX`). `Base.astro` renders an inline GTM snippet only when enabled. A live GTM ID would execute arbitrary tags with no CSP in place — enable GTM only together with a CSP that constrains it. Note the installed `@digi4care/astro-google-tagmanager` package is **not** what renders GTM; the inline snippet is.
- **Google Fonts** are loaded via Astro's `Font` component (`fontProviders.google()`).

### Secrets

No credentials are stored in the repo: there is no `.env` file (`.env` / `.env.production` are gitignored), no bucket name/endpoint/token in code or config, and the config values are public placeholders (see below). R2 usage is URL-only — see [IMAGE_STORAGE.md](./IMAGE_STORAGE.md). If a future integration needs a secret (form backend, upload pipeline, real GTM/Disqus keys), put it in the deployment platform's environment variables, never in a committed file.

### Dead auth pages — do not ship as-is

`src/pages/login.astro` and `src/pages/sign-up.astro` present a login surface with **no backend, no validation, and no auth wiring** (`<form action="">` posts to the same URL; "continue with" social buttons do nothing). They are `noindex` (see [SEO_GUIDE.md](./SEO_GUIDE.md)) and excluded from the sitemap, but if deployed they invite users to submit credentials into a form that goes nowhere — a phishing/confusion risk. **Recommendation: remove or gate these pages until real auth exists.** The same applies to the contact/apply/newsletter forms, which post to `"#"` — and to the contact form's false claim "This site is protected by reCAPTCHA": **no reCAPTCHA is implemented anywhere in the repo**. Do not ship that claim.

### Placeholder contact data

`src/config/config.json` still contains `john@example.com`, `(+1) 123-346-7890`, and a copyright link to `https://csofts` (no TLD — not a valid URL). These are template placeholders; replace them before launch so a production site does not publish someone else's (or nobody's) contact details.

### Dependencies

- Astro 7.4.11, React 19.3.1, Tailwind 4.3.5, `sharp` 0.35.5, `vite` 8.3.8 — current as of the 2026-11-12 upgrade. TypeScript stays at ^6.0.3 deliberately (`@astrojs/check` 0.9.12 does not support TS 7).
- ESLint is installed but **has no config file**, so no lint gate currently runs. Adding `eslint.config.mjs` (see [INSTALLATION.md](./INSTALLATION.md)) is a follow-up, not a current control.
- CI (`.github/workflows/ci.yml`) runs `astro check`, a Prettier check, and a production build on push/PR to `main`. CodeQL runs per the repo's workflow setup. Deployment is manual-only.

### What this policy does not cover

The old `SECURITY.md` in this repo was copied from Astroplate and said "Astroplate" throughout — that has been corrected here. This document covers the PowerAI Astro theme only: it does not cover any deployed instance's hosting account, DNS, R2 bucket policy, or the OpenRemark/GTM third-party services themselves.
