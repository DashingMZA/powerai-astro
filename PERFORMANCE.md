# Performance

> **No Lighthouse / Core Web Vitals measurement exists.** No Chromium was available in the sandbox, so no CWV numbers, bundle-size numbers, or Lighthouse scores are claimed anywhere in this documentation. Everything below is structural (what the build produces and what hydrates), verified from the code and the 2026-11-12 build output. Run Lighthouse on the deployed site before making any performance claim.

## Baseline (verified 2026-11-12)

- **Output is fully static**: `astro build` produced **65 pages** in ~9.6 s, `dist/` only. No server, no per-request rendering.
- **`astro check`: 0 errors / 0 warnings / 1 hint** (93 files).
- **7 images optimized** per build via `astro:assets` (WebP, `quality="mid"`) — only the images routed through `ImageMod.astro`.
- **Fonts**: Google Fonts via Astro's `Font` component with `preload` (`Base.astro`), families from `theme.json`. Font loading behavior (FOUT/FOIT) was not measured.

## Hydration inventory — where JavaScript comes from

The site uses Astro islands: most of the page is static HTML, and React components hydrate only where a `client:*` directive is set. **29 `client:*` directives** exist in `src/` (verified by grep):

- **Homepage hydrates 6 React islands**, all `client:visible`: `TrustedClients`, `Statistics`, `Integration`, `Pricing`, `Testimonials`, `FAQ` (`src/pages/index.astro`). Each pulls in React 19 + `motion/react` (+ `react-icons` where used). These are the biggest JS cost on the site; several (Testimonials, TrustedClients, FAQ) are candidates for Astro-native rewrites if JS weight becomes a problem.
- **`client:load` (eager)** is used on `TrustedClients` (about/features/pricing pages), `IntegrationList` (integrations index), and the elements-page shortcodes (`Tabs`, `Accordion`, `Youtube`). Eager hydration where `client:visible` would usually suffice — review if first-load JS matters.
- **19 `.astro` files each ship an inline `<script>` importing `motion`** (`animateMini`/`inView`) for small fade-ins, so the `motion` runtime is bundled into the JS of nearly every page. The `Badge.astro` pattern (`id="badge-${Math.random()…}"` + `querySelectorAll('[id^="badge-"]')`) re-scans the DOM per instance.
- **Two directives are dead**: `client:load` on `<PageHeader>` and `client:visible` on `<CaseStudyCard>` in `src/pages/case-studies/page/[page].astro` — both are `.astro` components and cannot hydrate; the directives are silently ignored.
- **View transitions are on** (`ClientRouter` in `Base.astro`), but **no link prefetching is configured**.

## Images — the biggest structural cost

- **18 plain `<img>` tags** (blog cards, post hero, case-study cards, gallery, team, about, careers) get no resizing, no format conversion, and no `srcset`. Only the 7 images through `ImageMod.astro` are optimized.
- **Hero/banner images are PNG** (`/images/banner.png`, `/images/about-banner.png`) and served as-is wherever a plain `<img>` renders them.
- **49 of the 80 public images are PNG** (per the earlier audit; `public/images` totals ~6 MB). Converting large photos to WebP/AVIF at the source, and routing more images through `ImageMod.astro`, are the cheapest performance wins available.
- **No image CDN / responsive-images setup exists.** Remote (R2) images are served from their absolute URL as-is — see [IMAGE_STORAGE.md](./IMAGE_STORAGE.md).

## What is NOT wired (performance-relevant)

- **`@playform/compress` is installed but not wired** — there is no HTML/CSS/JS/image compression step in the build. Adding `compress()` to `astro.config.mjs` is the obvious next step; verify output sizes after adding it.
- **`rollup-plugin-visualizer` is installed but not wired** — no bundle report is generated. Add it to `vite.plugins` (build-only) to get a real bundle breakdown before optimizing blindly.
- **No `prefetch`, no resource hints** beyond font `preload`.

## How to measure (follow-up)

```bash
pnpm run build && pnpm run preview
# Lighthouse (Chrome): run on /, /blog, /blog/post-1, /pricing — record LCP, INP, CLS
# Bundle: add rollup-plugin-visualizer, rebuild, inspect the treemap
# Images: list dist/ _astro assets by size; compare against public/images sources
```

Do not quote CWV targets as "met" until those runs exist. The honest statement today is: static output, islands-only hydration, 65 pages building in ~10 s, and no measured field or lab data.
