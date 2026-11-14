---
title: "How to Improve Core Web Vitals in Astro Websites"
meta_title: "Improve Core Web Vitals in Astro"
description: "LCP, INP, and CLS explained for Astro websites: what each metric measures, what slows it down, and a practical workflow to improve real scores."
date: 2026-11-14
image: "/images/blog/improve-core-web-vitals-astro.png"
og_image: "/images/blog/improve-core-web-vitals-astro-og.png"
category: "Technology"
tags: ["Astro", "Core Web Vitals", "Performance", "LCP"]
author:
  name: "John Doe"
  designation: "Software Engineer"
  avatar: "/images/avatar.png"
featured: false
draft: false
---

A fast website is not a luxury feature. It is the difference between a visitor who reads the article and one who closes the tab before the first paragraph renders. Google's Core Web Vitals give that experience a name and a number: three metrics that measure how quickly a page's main content appears, how quickly it responds to input, and how much it moves around while loading. They are drawn from real users visiting real pages, which means they cannot be gamed with a fast laptop on a local network — they measure what your visitors actually experience.

Astro starts ahead of most frameworks: zero JavaScript by default, pages rendered to static HTML at build time, and hydration only for components you explicitly mark interactive. But a good starting point is not a good score — heavy images, web fonts, third-party scripts, and layout shifts can drag even an Astro site down. This guide explains what each metric measures, what usually slows it down in an Astro site, and a practical workflow for improving real scores, grounded in the setup this site actually runs.

## What Core Web Vitals Are

Core Web Vitals are three metrics, each measuring one aspect of the loading experience:

- **Largest Contentful Paint (LCP)** — how long it takes for the largest visible piece of content to render. Usually the hero image or the main heading.
- **Interaction to Next Paint (INP)** — how long the page takes to respond to a tap, click, or keypress. It measures the delay between the interaction and the next visible update.
- **Cumulative Layout Shift (CLS)** — how much visible content moves around unexpectedly while the page loads. A button that jumps down just as you tap it is a layout shift.

Each metric is scored in three bands — good, needs improvement, and poor — and the bands are the same for every site:

| Metric | Good                | Needs improvement | Poor                  |
| ------ | ------------------- | ----------------- | --------------------- |
| LCP    | 2.5 seconds or less | 2.5–4.0 seconds   | More than 4.0 seconds |
| INP    | 200 ms or less      | 200–500 ms        | More than 500 ms      |
| CLS    | 0.1 or less         | 0.1–0.25          | More than 0.25        |

A page passes when all three metrics are good. One poor metric is enough to fail the page, which is why the workflow below treats them as a set rather than chasing one number at a time.

The scores come from field data: measurements from real Chrome users on real devices and networks, aggregated over a rolling 28-day period in the Chrome User Experience Report (CrUX). So a fix you ship today takes time to show up — new measurements have to replace old ones — and the score reflects your actual audience, including visitors on slow phones. A page that feels instant on a developer's machine can still score poorly if most visitors are on mid-range Android phones.

Lab tools such as Lighthouse simulate a visit and are useful for diagnosing a specific problem, but they are not the score. Use the lab to find the cause and field data — from PageSpeed Insights — to judge whether the fix worked. Confusing the two is the most common way teams declare victory too early.

## Largest Contentful Paint: Make the Main Content Appear Fast

LCP answers the visitor's first question: "is anything here yet?" The largest contentful paint is usually the hero image, a large banner, or the main heading block. Everything that delays that element delays the metric: a slow server response, a render-blocking stylesheet, a web font that swaps late, or a hero image that is too large or loads too late.

### Start with the server response

LCP cannot happen before the browser receives the first bytes of HTML, so server response time is the floor under the whole metric. For a static Astro site this is mostly a hosting question: the HTML is pre-rendered at build time, so the server's job is to hand over a file quickly, ideally from a CDN edge near the visitor. This site is deployed on Vercel, which serves the pre-rendered pages from its edge network; on any host, the HTML should come from close by, not from a single origin server far away.

Keep the HTML itself small. This site's build runs `@playform/compress` with HTML compression enabled, which strips unnecessary whitespace from the generated pages — the config comment records a saving of 283 KB of HTML across the site. Every page is a little smaller, every first byte a little sooner.

### Make the hero image the priority

On most content pages the LCP element is an image, so image handling is LCP handling. The rules are simple and they all matter:

**Serve a modern format at the right size.** This site's `ImageMod` component renders local images through `astro:assets` with Sharp, defaulting to WebP output (`format || "webp"`) and `quality: "mid"`. WebP files are substantially smaller than JPEG at the same visual quality, and AVIF is smaller still for photographic content. The component also takes explicit `width` and `height` props, so the rendered image is sized to its display slot instead of shipping a 2400-pixel original to a 800-pixel container. The full image workflow — format choice, responsive sizes, and lazy loading — is covered in the guide to [image optimization for Astro](/blog/image-optimization-astro-webp-avif).

**Load the hero eagerly, everything else lazily.** `ImageMod` defaults every image to `loading="lazy"` and `decoding="async"`. That is the right default for images below the fold, but the hero image is the exception: a lazy hero waits for the browser to decide it is needed, which is exactly the delay LCP measures. The component accepts a `fetchpriority` prop for this reason — pass `fetchpriority="high"` and `loading="eager"` for the LCP image so the browser fetches it first, and leave everything else lazy.

```astro
---
import ImageMod from "@/layouts/components/ImageMod.astro";
---

<!-- The hero: load it first, at high priority -->
<ImageMod
  src="/images/blog/hero.png"
  alt="Article hero image"
  width={1200}
  height={675}
  loading="eager"
  fetchpriority="high"
/>

<!-- Below the fold: lazy is correct -->
<ImageMod
  src="/images/blog/diagram.png"
  alt="Diagram of the rendering pipeline"
  width={1200}
  height={675}
/>
```

### Do not let fonts block the paint

Web fonts are a quiet LCP killer. A page that waits for a font file before rendering its heading shows nothing — or shows a fallback font that swaps mid-read, which also hurts CLS. This site's font configuration, built from `theme.json` in `astro.config.mjs`, sets `display: "swap"` for every font family, which tells the browser to render text immediately in a fallback font and swap in the web font when it arrives. That is the correct setting: text appears fast, and the swap is a small visual change rather than a blank screen.

Two more font habits help. First, only load the weights you use — the config parses the weight list from `theme.json` (`Inter:wght@400;500;600;700`), so a weight nobody renders is never requested. Second, keep the font stack short: every additional family is another file the browser may fetch before the first paint.

## Interaction to Next Paint: Keep the Page Responsive

INP measures something visitors feel immediately: you tap a button and nothing happens — or happens a beat too late. It is the hardest of the three metrics to improve by tuning the server, because it is mostly about what the browser's main thread is doing when the interaction arrives. If the main thread is busy parsing a large JavaScript bundle, running a long task, or re-rendering a heavy component, the response waits.

The threshold is unforgiving in the right way: good is 200 milliseconds or less, and a single slow interaction in a visit can be the one that defines the metric. INP is measured across the whole visit, not just the first load, so a page that loads fast but stutters when the visitor opens a menu or submits a form can still fail.

### Ship less JavaScript

The most effective INP improvement is usually the simplest: less JavaScript on the page. Astro's islands architecture is built for this. A page ships zero JavaScript by default, and only the components marked with a client directive get hydrated in the browser. This site uses that discipline in practice — most interactive components use `client:visible`, which defers hydration until the component scrolls into view, and only a handful use `client:load`, which hydrates immediately. The result is that a visitor reading an article downloads and executes almost no JavaScript at all, and the main thread stays free to respond to input.

That choice is worth making deliberately for every component. Before adding `client:load`, ask whether the visitor needs it interactive before they can see it. A pricing calculator, yes. A testimonial carousel below the fold, no — `client:visible` is the right directive. The islands guide explains the directives and the trade-offs in full: [Astro islands architecture and partial hydration](/blog/astro-islands-architecture-partial-hydration).

### Break up long tasks

A long task is any piece of JavaScript that keeps the main thread busy for more than 50 milliseconds. While it runs, taps and keypresses queue up and wait. Common culprits are large data transformations on load, heavy chart libraries initializing eagerly, and third-party scripts that parse and execute in one block.

The fixes are structural. Defer non-essential work until after the first paint, or until the visitor needs it — a chart library can load when its section scrolls into view, not on page load. Split work that must happen into smaller chunks with `requestIdleCallback` or `setTimeout` yields between them, so the browser can slip an interaction in between. And be suspicious of third-party embeds: a chat widget or analytics script that injects a large bundle is often the single biggest contributor to INP, and the easiest to defer.

## Cumulative Layout Shift: Stop the Page Moving

CLS is the metric visitors notice most viscerally, because it is the one that makes them tap the wrong thing. A page scores CLS by adding up every unexpected shift of visible content during the visit. The bands are small — good is 0.1 or less — because even a small shift at the wrong moment breaks trust.

Layout shifts have a short list of usual causes, and all of them are preventable:

**Images and embeds without dimensions.** When an image loads without reserved space, the browser renders the page, then pushes everything below the image down when the image's real size becomes known. This site's `ImageMod` component requires `width` and `height` props for exactly this reason — the browser can reserve the correct aspect-ratio box before the image arrives, so nothing moves when it does. The same applies to embedded videos, iframes, and ad slots: if it has a size, reserve the size.

**Content injected above existing content.** A banner, a cookie notice, or a notification that appears at the top of the page pushes everything down. Reserve space for anything that can appear dynamically, or place dynamic content in a fixed overlay that does not move the layout. A cookie banner that slides in over the content is fine; one that pushes the article down is a CLS problem.

**Responsive changes that reflow the layout.** A layout that works at desktop width but collapses awkwardly at mobile width — a grid that drops a column, a heading that wraps to three lines — shifts content as the viewport settles. Testing the page at several widths, and designing the responsive behaviour deliberately rather than letting it happen by accident, is what prevents this. The practical guide to [building responsive websites with Tailwind CSS](/blog/responsive-websites-tailwind-css-guide) covers breakpoints, fluid type, and the patterns that keep layouts stable across screen sizes.

![How the three Core Web Vitals map to the loading experience](/images/blog/improve-core-web-vitals-astro-diagram-1.png)

_Each metric measures a different moment: LCP is the first paint of the main content, INP is the responsiveness of every interaction, and CLS is the stability of the layout while it all loads._

## A Practical Workflow for Improving Scores

Improving Core Web Vitals is a loop, not a one-off task. The loop below is the one to follow, in order, because each step informs the next.

**1. Measure the field data first.** Open PageSpeed Insights for the page and read the field data section. Note which metric fails and by how much. A page with LCP at 4.8 seconds and CLS at 0.02 has an image problem, not a layout problem — and the fix list is completely different. Do not start optimizing until you know which metric is failing.

**2. Diagnose in the lab.** Run Lighthouse on the same page and read the opportunities list. It names the specific causes: an unoptimized image, a render-blocking resource, a long task, an element without dimensions. Treat each opportunity as a hypothesis, not a verdict — Lighthouse simulates a slow device, and a real visitor's experience may differ.

**3. Fix the biggest cause first.** If the hero image is 1.2 MB, resizing and converting it will move LCP more than any other single change. If a third-party script adds 400 ms to INP, deferring it will move INP more than splitting your own code. Work down the list in order of impact, and measure after each significant change rather than batching ten changes and guessing which one helped.

**4. Check the repo's own performance notes, then re-measure in the field.** This site's `astro.config.mjs` runs `compress` with `JavaScript: false` because re-minifying already-minified JavaScript cost 50–90 seconds of build time to save 15 KB — Vite already minifies it — while HTML, image, SVG, and CSS compression stay on. After a fix ships, the CrUX 28-day rolling window needs new visits to reflect it: a page that was failing will not show a good score the next morning, even if the fix is perfect. Judge the fix by lab measurements and by fresh field data as it arrives, and give it the full window before declaring the metric fixed. After a fix ships, the CrUX 28-day rolling window needs new visits to reflect it. A page that was failing will not show a good score the next morning, even if the fix is perfect — the window still contains weeks of old data. Judge the fix by lab measurements and by fresh field data as it arrives, and give it the full window before declaring the metric fixed.

![The improve-and-measure loop for Core Web Vitals](/images/blog/improve-core-web-vitals-astro-diagram-2.png)

_Measure field data, diagnose in the lab, fix the biggest cause, then re-measure — and allow the 28-day rolling window time to reflect the change._

## Common Mistakes

**Fixing the wrong metric.** Compressing images will not fix a CLS problem, and reserving image dimensions will not fix an INP problem. Match the fix to the failing metric.

**Lazy-loading the hero image.** The default `loading="lazy"` is correct for everything below the fold and wrong for the LCP element. The hero needs `loading="eager"` and `fetchpriority="high"`.

**Hydrating everything on load.** Every `client:load` component adds JavaScript that the browser must parse before the page can respond to input. Default to `client:visible` or no directive at all, and reserve `client:load` for components the visitor genuinely needs immediately.

**Adding a third-party script and forgetting it.** Analytics, chat, consent banners, and social embeds accumulate. Each one costs main-thread time and often loads its own fonts and styles. Audit them regularly and defer or remove the ones that are not earning their cost.

**Declaring victory after one day.** The 28-day rolling window means a fix takes weeks to fully show in field data. A lab improvement the day after shipping is a good sign, not a final result.

## Frequently Asked Questions

**What is a good Core Web Vitals score?**
All three metrics in the "good" band — LCP of 2.5 seconds or less, INP of 200 milliseconds or less, CLS of 0.1 or less — measured on real user data over a rolling 28-day period.

**How long does it take for a fix to show in the scores?**
Field data is a rolling 28-day average, so improvements appear gradually as new visits replace old ones. Lab tools such as Lighthouse reflect the fix immediately, which is how you confirm the change worked before the field data catches up.

**Does Astro guarantee good Core Web Vitals?**
No. Astro's zero-JavaScript default and static rendering give a strong starting point, but images, fonts, third-party scripts, and layout shifts can still push any metric into the poor band.

**Which metric should I fix first?**
The one that fails by the most in field data. In practice, LCP fails most often on content sites because the hero image is too large or loads too late — and it is usually the cheapest to fix.

**Do Core Web Vitals affect search rankings?**
They are a ranking signal, but one among many. Relevance and content quality matter more. Treat Core Web Vitals as a measure of the visitor's experience first and a ranking factor second — the sites that do that tend to get both right.

**Can I measure Core Web Vitals on my own site without PageSpeed Insights?**
Yes. The `web-vitals` JavaScript library measures LCP, INP, and CLS in the browser and can send the values to your analytics, giving you field data from your own visitors without waiting for the CrUX window.

## Conclusion

Core Web Vitals are not a checklist to game. They are three honest measurements of what a visitor experiences: how fast the content appears, how quickly the page answers, and whether it stays still while it loads. Astro gives you a head start on all three — static HTML, zero JavaScript by default, and islands that hydrate only what needs to be interactive. The rest is discipline: a hero image that loads eagerly at the right size, fonts that swap instead of blocking, components that hydrate when they are seen, and dimensions reserved for everything that has a size.

Start with the field data, fix the biggest cause first, and give the 28-day window time to show the result.

**Further reading:** Google's [Core Web Vitals documentation](https://web.dev/articles/vitals) defines the metrics and thresholds, the [Astro image guide](https://docs.astro.build/en/guides/images/) covers responsive images and the `Image` component, and the [web.dev guide to LCP](https://web.dev/articles/lcp) goes deep on the largest contentful paint specifically.
