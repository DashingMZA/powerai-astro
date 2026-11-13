# Performance

> **No Lighthouse / Core Web Vitals measurement exists.** No Chromium was available in the sandbox, so no CWV numbers, bundle-size numbers, or Lighthouse scores are claimed anywhere in this documentation. Everything below is structural (what the build produces and what hydrates), verified from the code and the 2026-11-12 build output. Run Lighthouse on the deployed site before making any performance claim.

## Baseline (verified 2026-11-13, worktree at `a7a9c4a`)

- **Output is fully static**: `astro build` produced **77 pages** (65 + 7 author + 5 category archives), `dist/` only — 20,255,062 bytes (two runs, byte-identical). No server, no per-request rendering.
- **`astro check`: 0 errors / 0 warnings / 0 hints** (95 files). **`eslint .`: 0 errors / 0 warnings**. Prettier check passes. CI runs check → lint → format → build (see `.github/workflows/ci.yml`).
- **7 images optimized** per build via `astro:assets` (WebP, `quality="mid"`) — only the images routed through `ImageMod.astro`.
- **Fonts**: Google Fonts via Astro's `Font` component with `preload` (`Base.astro`) and `display: "swap"` (`astro.config.mjs`), families from `theme.json`. Font loading behavior (FOUT/FOIT) was not measured.
- **Largest bundles in `dist/` (2026-11-13 build):** `elk-*.js` 1,498,941 bytes (mermaid layout engine — only loaded on pages with a mermaid block), `chunk-*.js` 629,040 bytes, `cytoscape.esm` 441,717 bytes, `katex` 258,780 bytes, `client.*.js` 209,144 bytes, `react.*.js` 132,618 bytes. Single CSS file: `Base.*.css` 145,682 bytes. 139 JS files total (5.68 MB pre-compress, per the audit). Largest images are duplicated PNGs (`images/avatar.png` and `_astro/avatar.*.png`, 545,486 bytes each — see the audit's duplicate-PNG note).

## Build time audit (measured 2026-11-12, full record: `~/workspace/powerai-upgrade/PERF-AUDIT.md`)

Environment: shared sandbox VM, 1.5 CPUs — absolute wall times vary ±50% run to run, so the table reports ranges; the phase shares and deltas are the robust evidence.

| Configuration | Wall time | Compress hook | `dist/` size |
|---|---|---|---|
| `compress()` (all types on) | 162–170 s (one contended run: 254 s) | ~115–130 s | 20,239,679 bytes |
| `compress({ JavaScript: false })` (**current**) | 109–116 s (2026-11-12); **71 s wall / 1m1s Astro time on 2026-11-13** (second run 100 s wall under contention with a parallel `eslint` run, byte-identical `dist/`) | 33–66 s | 20,255,062 bytes |
| compress disabled (control) | 31–60 s | — | 23,461,634 bytes |

**Root cause: `@playform/compress` was the cost, and inside it the JavaScript (terser) pass dominated** — ~50–90 s re-minifying 5.68 MB of already Vite-minified JS (139 files, incl. the 1.5 MB elk/mermaid bundle) to save 15 KB (0.26%). The other compress passes are cheap for what they save: Images (sharp) ~32–39 s for 2.45 MB, HTML ~7–15 s for 283 KB, SVG ~2–6 s for 339 KB, CSS/JSON ~0 s. Cold vs warm builds differ negligibly (162 s cold vs 165 s warm) — the cost is paid on every build, not just cold ones. The non-compress build is 23–46 s of Astro time, so the pre-compress build itself is not the problem.

**Fix applied: `compress({ JavaScript: false })`** in `astro.config.mjs` — Vite already minifies JS, so the terser pass paid ~100× its saving. Measured effect: wall 162–170 s → 109–116 s (saves ~50–55 s) for +15 KB of dist. HTML/Image/SVG/CSS compression stays on (still earns 2.45 MB images + 339 KB SVG + 283 KB HTML). Compress was **not** removed: dropping it entirely would save another ~60–80 s but give back 3.22 MB of dist. If build time matters more than that later, the option is `compress()` → remove, with the measured trade-off above.

**Known audit caveats (from the audit file):** the Image-off experiment was inconclusive (run under contention from a parallel agent, second run killed); every PNG exists twice byte-identical (`_astro/` + `public/`) and is re-encoded twice; compress's binary-size check skips 31 files that would shrink (~1 MB unsaved) — an upstream quirk, informational only. Cheaper PNG settings were measured and rejected (5.2 s vs 33.5 s, but only 426 KB saved vs 3,410 KB).

## Hydration inventory — where JavaScript comes from

The site uses Astro islands: most of the page is static HTML, and React components hydrate only where a `client:*` directive is set. **24 `client:*` directives** exist in `src/` (verified by grep 2026-11-13 — the earlier "29" count was wrong): **5 `client:load`, 19 `client:visible`**, no `client:only`/`client:idle`/`client:media`.

- **Homepage hydrates 6 React islands**, all `client:visible`: `TrustedClients`, `Statistics`, `Integration`, `Pricing`, `Testimonials`, `FAQ` (`src/pages/index.astro`). Each pulls in React 19 + `motion/react` (+ `react-icons` where used). These are the biggest JS cost on the site; several (Testimonials, TrustedClients, FAQ) are candidates for Astro-native rewrites if JS weight becomes a problem.
- **`client:load` (eager)** is used on `TrustedClients` (about/features/pricing pages), `IntegrationList` (integrations index), and the elements-page shortcodes (`Tabs`, `Accordion`, `Youtube`). Eager hydration where `client:visible` would usually suffice — review if first-load JS matters.
- **19 `.astro` files each ship an inline `<script>` importing `motion`** (`animateMini`/`inView`) for small fade-ins, so the `motion` runtime is bundled into the JS of nearly every page. The `Badge.astro` pattern (`id="badge-${Math.random()…}"` + `querySelectorAll('[id^="badge-"]')`) re-scans the DOM per instance.
- **Two directives are dead** (unchanged 2026-11-13): `client:load` on `<PageHeader>` and `client:visible` on `<CaseStudyCard>` in `src/pages/case-studies/page/[page].astro` — both are `.astro` components and cannot hydrate; the directives are silently ignored.
- **View transitions are on** (`ClientRouter` in `Base.astro`), but **no link prefetching is configured**.

## Images — the biggest structural cost

- **18 plain `<img>` tags** (blog cards, post hero, case-study cards, gallery, team, about, careers) get no resizing, no format conversion, and no `srcset`. Only the 7 images through `ImageMod.astro` are optimized.
- **Hero/banner images are PNG** (`/images/banner.png`, `/images/about-banner.png`) and served as-is wherever a plain `<img>` renders them.
- **49 of the 80 public images are PNG** (per the earlier audit; `public/images` totals ~6 MB). Converting large photos to WebP/AVIF at the source, and routing more images through `ImageMod.astro`, are the cheapest performance wins available.
- **No image CDN / responsive-images setup exists.** Remote (R2) images are served from their absolute URL as-is — see [IMAGE_STORAGE.md](./IMAGE_STORAGE.md).

## What is NOT wired (performance-relevant)

- **`rollup-plugin-visualizer` is wired opt-in only** — set `ANALYZE=true` when building to emit `stats.html` (verified once, then deleted). Normal builds are unaffected.
- **No `prefetch`, no resource hints** beyond font `preload`.

## How to measure (follow-up)

```bash
pnpm run build && pnpm run preview
# Lighthouse (Chrome): run on /, /blog, /blog/post-1, /pricing — record LCP, INP, CLS
# Bundle: ANALYZE=true pnpm run build, inspect stats.html
# Images: list dist/ _astro assets by size; compare against public/images sources
```

Do not quote CWV targets as "met" until those runs exist. The honest statement today is: static output, islands-only hydration (24 directives), 77 pages building in ~70–100 s wall (compress with JS off), `dist/` 20,255,062 bytes, and no measured field or lab data.

## Final-audit measurements (2026-11-13, secperf worktree, base `2cfcb8f`)

Sandbox: Node 24.22.1, pnpm 12.19.0, 1.5 shared CPUs — wall times here run slower than the 2026-11-12/13 runs above; treat them as same-machine comparisons only.

- **Tests (all before the fixes in this round):** `pnpm install --frozen-lockfile` exit 0 (8 s); `astro check` 0/0/0 (101 files, 36 s); `eslint .` 0/0 (17 s); `prettier --check ./src` pass (21 s); production build exit 0 in **208 s wall** (Astro 1m14s + server 2m59s — the 2026-11-13 "71 s" run above was a warmer/less-contended machine, not a regression). No unit-test script exists in `package.json` — none was invented.
- **Output:** `dist/` 21 MB, `.vercel/output/` 46 MB; **78 HTML pages** (was 77 — +1 page since the baseline); sitemap 75 URLs; homepage `dist/client/index.html` 148,290 bytes, byte-identical to the live homepage body.
- **Live timings** (`curl`, unauthenticated, SFO edge, one sample each — not a benchmark): `/` 200 in 0.97 s, `/blog` 200 in 0.97 s, `/careers` 200 in 0.81 s, `/contact` 200 in 1.28 s, `/features` 200 in 1.12 s, `/about` 200 in 1.44 s, `/privacy-policy` 200 in 1.14 s, `/terms-of-service` 200 in 2.12 s. Note: **`/privacy` and `/terms` answer 404** — those routes do not exist; the real pages are `/privacy-policy` and `/terms-of-service` (via `[regular].astro`). Trailing-slash URLs 308-redirect to the no-slash form (`trailingSlash: "never"`).
- **Largest bundles (this build):** `elk-*.js` 1,463.8 KB, `chunk-*.js` 614.3 KB, `cytoscape.esm` 431.4 KB, `katex` 252.7 KB — all mermaid/KaTeX chunks, none referenced by the homepage (verified: 0 `elk`/`mermaid` references in `index.html`; mermaid loads only on pages with a mermaid block). Single CSS `Base.*.css` 142.8 KB. 139 JS files in `dist/client`.
- **Images:** 94 PNG + 7 WebP + 4 JPG in `dist/client`. Largest are still duplicated PNGs (`images/avatar.png` and `_astro/avatar.*.png`, 532.7 KB each; `about-banner.png` 479.9 KB each). Only 7 images go through `ImageMod.astro` optimisation; the rest are served as-is.
- **Fonts:** 1.3 MB total in `dist/client` (Inter woff2 via Astro `fontProviders.google()`, `display: swap` per config; KaTeX woff/woff2/ttf bundled with `font-display: block` from KaTeX's CSS). No `fonts.googleapis.com` request at runtime — fonts are self-hosted from `_astro/fonts/`.
- **No Lighthouse / CWV, no device rendering.** No Chromium exists in the sandbox, so there are no Lighthouse scores, no LCP/INP/CLS, no console-error or layout-shift measurements, and no mobile/tablet screenshots. Responsive behaviour was checked by code reading only (Tailwind `sm:`/`md:`/`lg:` classes throughout; no fixed-width overflow found by grep). Do not present any of the numbers above as field performance.
- **Unused deps removed this round** (grep-verified zero usage, lockfile regenerated): `@astrojs/cloudflare`, `prop-types`, `remark-github-blockquote-alert`. Previously-removed set (`dotenv`, `dotenv-cli`, `@cloudflare/workers-types`) confirmed still gone.
- **Post-fix rebuild (same worktree, after the `pnpm-workspace.yaml` overrides):** build exit 0 in 55 s wall with **byte-identical `dist/`** to the pre-override build (443 files, 20,560,449 bytes, 0 diff lines) — the override upgrades changed no shipped output. `astro check` 0/0/0, `eslint .` 0/0, `prettier --check ./src` pass, `pnpm audit` 10 → 4 advisories (see SECURITY.md).
