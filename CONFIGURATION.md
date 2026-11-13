# Configuration

All site configuration lives in JSON files under `src/config/` plus one typed TypeScript accessor. There is no admin UI and no environment-variable-based config: **edit the JSON, rebuild, redeploy.**

## Files

| File | Owns | Edited when you want to… |
|---|---|---|
| `src/config/config.json` | Site identity, settings, params (form actions, contact placeholders), navigation CTA, GTM, metadata, comments | Change the title, domain, pagination, footer/contact text, form endpoints, GTM, default description/OG image |
| `src/config/menu.json` | Main navigation + footer link groups | Add/remove/rename nav or footer links |
| `src/config/social.json` | Social profile links (6 entries) | Change social URLs or icons |
| `src/config/theme.json` | Colors + fonts | Re-theme the site (see below) |
| `src/config/site.ts` | Typed accessor re-exporting the four JSON files | (Read-only helper — see "site.ts is not wired yet") |
| `astro.config.mjs` | Build-time `site` URL, integrations, markdown plugins | Change build behavior (not covered here — see [INSTALLATION.md](./INSTALLATION.md)) |

## `config.json` — reference

```jsonc
{
  "site": {
    "title": "Power AI - A Free AI SaaS Website Template built with Astro",
    "base_url": "https://powerai.jadoo.bond",   // canonical origin, no trailing slash
    "base_path": "/",
    "trailing_slash": false,
    "favicon": "/images/favicon.png",
    "logo": "/images/logo.png",
    "logo_width": "137",
    "logo_height": "46",
    "logo_text": "Power AI"
  },
  "settings": {
    "sticky_header": true,
    "pagination": 9,            // blog + case-study page size
    "summary_length": 200,
    "blog_folder": "blog",
    "case_studies_folder": "case-studies",
    "career_folder": "careers"
  },
  "params": {
    "contact_form_action": "#",  // DEAD — see "Forms" below
    "apply_form_action": "#",    // DEAD
    "newsletter_form_action": "#", // DEAD
    "footer_text": "Own traditional and AI search with a powerful platform",
    "mail": "john@example.com",          // PLACEHOLDER — replace before launch
    "phone": "(+1) 123-346-7890",        // PLACEHOLDER — replace before launch
    "copyright": "Designed and Developed by [cSofts - a Git-based CMS for Static Sites.](https://csofts)"
  },
  "navigation_button": {
    "enable": true,
    "label": "Edit with cSofts",
    "link": "https://app.csofts.tech/new/clone?name=PoweraiAstro&repository=https://github.com/DashingMZA/powerai-astro&aff=poweraiastro"
  },
  "google_tag_manager": { "enable": false, "gtm_id": "GTM-XXXXXX" },
  "metadata": {
    "meta_author": "cSofts",
    "meta_image": "/images/og-image.png",   // default og:image (site-relative or absolute URL)
    "meta_description": "PowerAI Astro is a free, dark-themed AI SaaS website template built with Astro. It has 15+ pre-built pages, 47 components, and shortcodes."
  },
  "open-remark-comment": { "enable": true, "siteKey": "cmpl2v9m4000104jjmruazes1" }
}
```

### Rules and gotchas

- **`base_url` is the single source of truth for the domain.** `astro.config.mjs` reads it for the build-time `site` value, `src/lib/seo.ts` reads it for canonicals/OG URLs, and `public/robots.txt` must match it by hand (it does: `Sitemap: https://powerai.jadoo.bond/sitemap-index.xml`). Change it in `config.json` and check all three.
- **Production domain is `https://powerai.jadoo.bond`** and `base_url` matches it (fixed 2026-11-13) — builds emit `jadoo.bond` canonicals, sitemap URLs, and RSS links, and the `robots.txt` `Sitemap:` line matches. See [DEPLOYMENT.md](./DEPLOYMENT.md).
- **`trailing_slash: false`** — Astro is configured with `trailingSlash: "never"`. Do not flip this without checking that the sitemap, canonicals, and any external links still agree.
- **Placeholder values that must change before launch:** `params.mail` (`john@example.com`), `params.phone` (`(+1) 123-346-7890`), and the `copyright` link `https://csofts` (no TLD — not a valid URL). These are template placeholders, verified present on 2026-11-12.
- **`metadata.meta_description`** still says "47 components" — a stale count carried over from the old README. Update the copy when you update the description; the layouts tree is not 47 files.
- **`navigation_button`** ("Edit with cSofts") is a clone CTA pointing at `app.csofts.tech`. Disable it (`"enable": false`) if you do not want a "clone this template" button on a production site.

## Forms — all dead until a backend is wired

Forms are implemented with Resend API routes (2026-11-13): the contact form (`src/layouts/components/ContactForm.astro`) posts to `/api/contact`, the apply form (`src/pages/careers/[single].astro`, including a **required CV file upload**, PDF/DOC/DOCX ≤ 5 MB) posts to `/api/apply`, and the newsletter form (`src/layouts/PostSingle.astro`) posts to `/api/newsletter`. Server-side validation, honeypot + rate limiting, and accessible success/error messages are built in. The old `*_form_action: "#"` values in `config.json` are no longer read by the forms (kept for reference only). The false "protected by reCAPTCHA" claim was removed — no reCAPTCHA exists; spam protection is the honeypot + rate limit. Login / sign-up (`src/pages/login.astro`, `src/pages/sign-up.astro`) still use `<form action="">` with no handler, no validation, and no backend; their "continue with" social buttons are not wired to any auth provider.

To make a form live: set the Resend env vars (see `.env.example`: `RESEND_API_KEY`, `CONTACT_EMAIL`, `CONTACT_FROM_EMAIL`) in Vercel and redeploy — without them the endpoints answer 503 ("not set up yet") and send nothing. Live delivery has NOT been tested (no credentials exist yet). See [SECURITY.md](./SECURITY.md).

**Behaviour without credentials (verified 2026-11-13):** the forms never claim a false success. Without Resend env vars the endpoints answer 503 ("not set up yet") and send nothing; with a bad key they answer 502. Login / sign-up submit to the same page (`action=""`) with reload-and-discard behaviour; their submit buttons stay disabled until the required fields are filled. A page reload after submit is **not** a delivery confirmation.

**Remaining form work:** (a) set the Resend env vars and smoke-test one real submit per form; (b) for login / sign-up, a real auth provider — the pages have no auth wiring at all, so this is a build-out, not a config change. Note the apply form only accepts applications while a role is open — all 8 current roles are archived, so its form is hidden until a role is re-opened with `active: true` and a future deadline.

## Google Tag Manager

GTM is **disabled** (`google_tag_manager.enable: false`) with a placeholder ID `GTM-XXXXXX`. `Base.astro` renders it via the installed `@digi4care/astro-google-tagmanager` package (`<GoogleTagmanager>` + `<GoogleTagmanagerNoscript>`); there is no hand-rolled GTM snippet. To enable: set `enable: true` and a real `gtm_id` in `config.json`. A live GTM ID executes arbitrary tags with no Content Security Policy in place (see [SECURITY.md](./SECURITY.md)) — enable it only together with the CSP documented there.

## Comments — OpenRemark (live), not Disqus

Comments are rendered by `src/layouts/components/OpenRemarkComment.astro`, which loads `https://open-remark.zeon.studio/embed.js` and re-mounts on Astro page transitions. It is gated by `open-remark-comment.enable` in `config.json` and uses the public client `siteKey` there (`cmpl2v9m4000104jjmruazes1` — a public client key by design, not a secret). `disqus-react` was **removed from `package.json` 2026-11-13** (installed, never wired); Disqus is not the comments system.

## `menu.json`

Top-level keys: `main` (header navigation, including dropdown groups), `footer_company`, `footer_resource`, `footer_legal` (footer link groups). Menu items are `{ name, url }` objects; dropdown groups nest a submenu. The header (`src/layouts/partials/Header.astro`) renders `main`; the footer renders the three footer groups. No route is created by adding a menu item — the target page must exist in `src/pages/` or `src/content/pages/`.

## `social.json`

`{ "main": [{ "name", "icon", "link" }, …] }` — 6 entries today (facebook, x, instagram, tiktok, github, linkedin), pointing at the owner's personal/company profiles. `icon` names are `react-icons` component names (e.g. `FaFacebook`). Changing a link here changes the header/footer social icons everywhere.

## `theme.json` — colors and fonts

```jsonc
{
  "colors": { /* … */ },   // theme color tokens
  "fonts": {
    "font_family": {
      "primary": "…",       // e.g. "FontName:wght@400;500;600;700"
      "primary_type": "sans-serif"  // fallback stack
    }
  }
}
```

**How theming works (two steps, both automatic in dev/build):**

1. `scripts/themeGenerator.js` reads `theme.json` and writes `src/styles/generated-theme.css` (CSS variables). It runs as part of `pnpm run dev` (with `--watch`) and `pnpm run build`. It throws if `theme.json` is missing.
2. `astro.config.mjs` builds a Google-Fonts config from the same `theme.json` via Astro's `fonts` API (`fontProviders.google()`), and `Base.astro` renders a `<Font cssVariable preload />` per family.

To re-theme: edit `theme.json` only — never hand-edit `generated-theme.css` (it is regenerated). Font strings use the `"Name:wght@400;500;700"` format parsed by `astro.config.mjs`. `scripts/removeDarkmode.js` is a leftover one-shot migration script; it is not invoked by any npm script and `theme.json` no longer has a `darkmode` key — ignore it.

## `src/config/site.ts` — NOT wired into layouts yet

`site.ts` is a typed accessor that re-exports the four JSON files (`site`, `publisher`/`organization`, `language`/`locale`, `defaultSeo`, `settings`, `contact`, plus navigation/social/theme views). It duplicates no values — the JSON files remain authoritative.

**Verified 2026-11-12: nothing imports `site.ts`.** `Base.astro` imports `config.json`/`theme.json` directly, `src/lib/seo.ts` imports `config.json` directly, and `astro.config.mjs` imports the JSON files directly. Importing `site.ts` has no side effects, but it currently changes nothing. The follow-up is to migrate `Base.astro`, `seo.ts`, and page components to import from `@/config/site` (one mechanical refactor, then delete the direct JSON imports) — or to delete `site.ts` if that direction is rejected. Until then, **edit the JSON files, not `site.ts`**, when changing a value.

Also note: `site.ts` documents `language = "en"` / `locale = "en-US"` as template defaults — no locale is declared in any config JSON, and there is no i18n setup. The `i18n` package was **removed from `package.json` 2026-11-13** (installed, never wired — see [INSTALLATION.md](./INSTALLATION.md)).
