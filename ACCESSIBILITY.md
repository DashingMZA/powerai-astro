# Accessibility

This page records what is verified in the code today (2026-11-13, worktree at `a7a9c4a`) and what is not. **No accessibility audit tool (axe, Lighthouse) has been run** — there was no Chromium in the sandbox — so everything below is code-reading plus checks against the built `dist/`, not a measured audit. Run `axe` / Lighthouse on the deployed site before claiming conformance.

## What exists today

- **Skip link.** `Base.astro` renders `<a href="#main-content" class="skip-link">Skip to main content</a>` before the header; styles are in `src/styles/base.css` (`.skip-link`, visible on `:focus`). The main landmark is `<main id="main-content">`. Verified present in the built `dist/index.html`.
- **Landmarks.** `<main>` exists on every page via `Base.astro`. Header/footer are rendered on every page.
- **Viewport.** `width=device-width, initial-scale=1, maximum-scale=5` — pinch-zoom is not disabled.
- **Language.** `<html lang="en">` (verified in `dist/index.html`).
- **Mobile menu button** has `aria-label` ("Open menu"/"Close menu") and `aria-expanded`, updated by JS (`Header.astro`); the menu has `aria-controls="nav-menu"`.
- **Visible keyboard focus.** `src/styles/base.css` has a global `:focus-visible` rule (2px `#9a4dfe` outline, 2px offset) — verified present in code (the "focus was missing site-wide" gap from the earlier audit is fixed).
- **Images with good alt text in places.** `PostSingle.astro` uses the post title for the hero image alt; `ImageMod.astro` requires an `alt` prop.
- **Image dimensions + loading (verified 2026-11-13).** Every sampled `<img>` carries `width`/`height` (18 plain `<img>` tags + `ImageMod.astro`, which requires both as props); `ImageMod` defaults to `loading="lazy"` + `decoding="async"`, and the hero banner uses `loading="eager"` + `fetchpriority="high"`. No `alt=""` was found — decorative images are not yet marked as such (see gap 4).
- **Exactly one `<h1>` per page (verified 2026-11-13).** Sampled `dist/` pages (`/`, `/about`, `/blog/post-1`, `/pricing`, `/contact`) each contain exactly one `<h1>`. The heading-hierarchy problem recorded in the 2026-11-12 version of this doc is fixed.

## Known gaps (verified in code)

1. **Desktop dropdown menus are hover-only.** In `src/layouts/partials/Header.astro` the dropdown toggle button is `xl:pointer-events-none` (comment in the file: "pointer-events disabled on desktop; hover handles it via CSS") and the submenu is revealed by CSS hover. `aria-expanded` on the toggle is only updated by the mobile-menu JS, and there is no `aria-haspopup`/`aria-controls` on the desktop toggle. Keyboard and touch users cannot open desktop dropdowns. This is the most significant a11y gap.
2. **No `prefers-reduced-motion` guard (site-authored).** Zero hits in `src/` for `prefers-reduced-motion`. The site animates heavily (19 Astro files with inline `motion` scripts plus `motion/react` islands in `Counter`/`Accordion`). The only reduced-motion rule anywhere is Astro's built-in view-transition rule in the compiled CSS (`@media (prefers-reduced-motion){…animation:none!important}` for view transitions) — it does not cover the site's own animations.
3. **Form fields rely on placeholders, not labels.** The contact, newsletter, apply, login, and sign-up forms have no associated `<label for="…">` on their text/email/password inputs. The only associated labels verified are the consent-toggle label (`ContactForm.astro`, `login.astro`) and the CV-upload label (`careers/[single].astro`). The contact form's submit stays `disabled` until the fake "agree" toggle is clicked, with no explanation beyond the button state for keyboard/assistive-tech users. Two further form defects found 2026-11-13: the "agree" control is a `<button aria-pressed>` nested inside a `<label>`, not a real checkbox input (screen readers get a button, not a checkbox state); and the newsletter email input in `PostSingle.astro` has **no `name` attribute**, so its value would not even be submitted.
4. **No form error messaging.** There is no `aria-live`, `aria-invalid`, `aria-describedby`, or `role="alert"` anywhere in `src/`. Validation is browser-native `required` only; a failed submit shows nothing but the browser's own bubble. (The forms are being rewired by another worker — audit the rewired markup before launch.)
5. **Mobile menu has no Escape key or focus trap.** `Header.astro` has no `keydown` handler at all: opening the mobile menu does not move focus into it, Escape does not close it, and Tab can leave the open menu behind. `aria-expanded`/`aria-label` are correct; keyboard operation is not.
6. **Weak alt text in places.** `IconBox.astro` uses `alt="Icon"`; `WhatOurGoals.astro` uses `alt="goals"`. Decorative images are not consistently marked with empty `alt=""` / `aria-hidden`.
7. **Color contrast is unverified.** The dark theme (`#0E0912` body with `#B9B7BA` gray text, per the earlier audit) was not measured. Do not claim WCAG contrast conformance until measured.
8. **Two `client:*` directives are silently ignored.** `src/pages/case-studies/page/[page].astro` puts `client:load` on `<PageHeader>` and `client:visible` on `<CaseStudyCard>` — both are `.astro` components, which cannot be hydrated, so the directives do nothing. Harmless, but misleading; remove them.

## How to verify (follow-up)

```bash
pnpm run build && pnpm run preview
# then, in a browser with Chromium:
#  - axe DevTools: run on /, /blog, /blog/post-1, /contact, /pricing
#  - Keyboard-only walkthrough: Tab through the header — desktop dropdowns must open on focus/Enter
#  - Enable "Reduce motion" in the OS and reload — animations must stop or dampen
#  - Lighthouse Accessibility audit (also gives the contrast numbers)
```

Fix order if accessibility is a launch gate: (1) desktop dropdown keyboard support, (2) form labels + the newsletter `name` + real checkbox + error messaging (coordinate with the forms rewire), (3) mobile-menu Escape/focus management, (4) `prefers-reduced-motion`, (5) alt-text pass, (6) measured contrast.
