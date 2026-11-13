// Central site configuration for PowerAI Astro.
//
// Single typed entry point for site identity, defaults, and helpers.
// Layouts (notably `Base.astro`, owned by the parallel SEO work) should
// import from here instead of reaching into the JSON files directly.
//
// ---------------------------------------------------------------------------
// What is authoritative for what — there is ONE config, not two:
// ---------------------------------------------------------------------------
// - `src/config/config.json`  — REMAINS AUTHORITATIVE for site identity
//   (title, base_url, logo, favicon), settings (pagination, summary
//   length), params (form actions, footer text, contact placeholders),
//   metadata (default description / OG image), GTM and comments. This
//   module re-exports typed views of it; it does not duplicate values.
//   Edit the JSON to change a value; this file picks it up.
// - `src/config/social.json` — REMAINS AUTHORITATIVE for social links.
//   Re-exported below as `socialLinks`.
// - `src/config/menu.json`   — REMAINS AUTHORITATIVE for navigation
//   (main menu + footer groups). Re-exported below as `navigation`.
//   `Header.astro` / `Footer.astro` own rendering; this is only a typed
//   accessor for anything else that needs the menu.
// - `src/config/theme.json`  — REMAINS AUTHORITATIVE for colors/fonts.
//   It is consumed by `scripts/themeGenerator.js`, which writes
//   `src/styles/generated-theme.css`. This module exposes the raw theme
//   object for typed reads only; do NOT use it to re-implement theming.
// - `astro.config.mjs`       — REMAINS AUTHORITATIVE for the build-time
//   `site` URL and integrations. It imports `config.json` itself; keep
//   `site.baseUrl` here in sync with `astro.config.mjs`' `site` value.
// - Content defaults (per-post SEO, authors, categories) live in
//   `src/content/schemas.ts`, NOT here.
//
// Nothing in this file is wired into `Base.astro` or any page yet — that
// wiring belongs to the parallel SEO agent. Importing this module has no
// side effects.

import configJson from "./config.json";
import menuJson from "./menu.json";
import socialJson from "./social.json";
import themeJson from "./theme.json";

// ---------------------------------------------------------------------------
// Site identity (from config.json `site`)
// ---------------------------------------------------------------------------

export const site = {
  /** Full site title, used as the default `<title>`. */
  title: configJson.site.title,
  /** Short brand name shown next to the logo. */
  name: configJson.site.logo_text,
  /** Canonical origin, no trailing slash. Keep in sync with astro.config.mjs `site`. */
  baseUrl: configJson.site.base_url,
  basePath: configJson.site.base_path,
  trailingSlash: configJson.site.trailing_slash,
  favicon: configJson.site.favicon,
  logo: configJson.site.logo,
  logoWidth: Number(configJson.site.logo_width),
  logoHeight: Number(configJson.site.logo_height),
} as const;

/** Publisher / organization name (from `config.json` metadata). */
export const publisher = configJson.metadata.meta_author;

/** Organization behind the template. Same value as `publisher` today;
 *  kept separate so a future org/publisher split is a one-line change. */
export const organization = configJson.metadata.meta_author;

// ---------------------------------------------------------------------------
// Language / locale
// ---------------------------------------------------------------------------
//
// No locale is declared in any config JSON; these are the template
// defaults. Change them here if the site is ever translated — do not
// scatter locale strings through layouts.

/** Primary content language (BCP 47). */
export const language = "en";
/** Full locale used for `og:locale` and date formatting. */
export const locale = "en-US";

// ---------------------------------------------------------------------------
// Default SEO (from config.json `metadata`)
// ---------------------------------------------------------------------------

export const defaultSeo = {
  /** Default meta description for pages without their own. */
  description: configJson.metadata.meta_description,
  /** Default Open Graph / Twitter image (site-relative path). */
  ogImage: configJson.metadata.meta_image,
  /** Default `<title>` — same as `site.title`. */
  title: configJson.site.title,
  /** Default author meta. */
  author: configJson.metadata.meta_author,
} as const;

// ---------------------------------------------------------------------------
// Settings (from config.json `settings` / `params`)
// ---------------------------------------------------------------------------

export const settings = {
  stickyHeader: configJson.settings.sticky_header,
  /** Blog / case-study pagination page size. */
  pagination: configJson.settings.pagination,
  summaryLength: configJson.settings.summary_length,
  blogFolder: configJson.settings.blog_folder,
  caseStudiesFolder: configJson.settings.case_studies_folder,
  careerFolder: configJson.settings.career_folder,
} as const;

/**
 * Contact settings from `config.json` params. NOTE: no contact email
 * address or phone number is published on the site — the template
 * placeholders (`john@example.com`, `(+1) 123-346-7890`) were removed
 * 2026-11-13 because they reached nobody. Visitors reach the owner
 * through the contact form; the owner supplies real details via the
 * legal-review checklist (docs/legal-review-checklist.md) if and when
 * they want them published. Form actions are `"#"` (dead forms) until
 * a backend is wired up.
 */
export const contact = {
  footerText: configJson.params.footer_text,
  copyright: configJson.params.copyright,
  contactFormAction: configJson.params.contact_form_action,
  applyFormAction: configJson.params.apply_form_action,
  newsletterFormAction: configJson.params.newsletter_form_action,
} as const;

// ---------------------------------------------------------------------------
// Social links (from social.json — authoritative) & navigation (menu.json)
// ---------------------------------------------------------------------------

export type SocialLink = {
  name: string;
  icon: string;
  link: string;
};

/** Social profiles, in `social.json` order. Icon is a `react-icons` name. */
export const socialLinks: SocialLink[] = socialJson.main;

/** Navigation menus (main + footer groups), re-exported for typed access. */
export const navigation = menuJson;

// ---------------------------------------------------------------------------
// Theme (from theme.json — authoritative; see header note)
// ---------------------------------------------------------------------------

/** Raw theme object (colors + fonts). Read-only view; CSS generation owns it. */
export const theme = themeJson;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a path or URL against the site origin.
 * Absolute URLs (`https://…`, incl. R2/media.csofts.tech) pass through
 * VERBATIM — never prefix them with `baseUrl` or `/public`. That prefixing
 * is the known `ImageMod.astro` / `Base.astro` og:image bug class.
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^(https?:)?\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = site.baseUrl.replace(/\/$/, "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

/** Default OG image as an absolute URL. */
export function defaultOgImageUrl(): string {
  return absoluteUrl(defaultSeo.ogImage);
}

/** Page title with the site-name suffix used by layouts. */
export function pageTitle(title?: string): string {
  return title ? `${title} | ${site.name}` : site.title;
}
