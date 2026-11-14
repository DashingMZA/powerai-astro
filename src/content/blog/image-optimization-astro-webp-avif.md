---
title: "Image Optimization for Astro: WebP, AVIF, Responsive Images and CDN Delivery"
meta_title: "Image Optimization for Astro Websites"
description: "Faster Astro pages start with images: WebP vs AVIF vs JPEG, responsive sizes, lazy loading, and CDN delivery — with practical steps you can apply today."
date: 2026-11-14
image: "/images/blog/image-optimization-astro-webp-avif.png"
og_image: "/images/blog/image-optimization-astro-webp-avif-og.png"
category: "Technology"
tags: ["Astro", "Image Optimization", "WebP", "Performance"]
author:
  name: "John Doe"
  designation: "Software Engineer"
  avatar: "/images/avatar.png"
featured: false
draft: false
---

On most content sites, images are the heaviest thing on the page. The HTML is kilobytes, the CSS is tens of kilobytes, the JavaScript — on an Astro site, at least — is often nothing at all, and then a single unoptimised photograph arrives at several megabytes and undoes all of it. The page's largest contentful paint is usually an image. Its layout shift is usually an image without dimensions. Its wasted bytes are usually images served at desktop resolution to a phone. Image optimisation is therefore not a finishing touch; on a typical blog or marketing site, it is the largest performance win available, and it is mostly a matter of serving the right format, at the right size, at the right time.

Astro helps, because it has a real image pipeline built in: `astro:assets`, backed by Sharp, which converts, resizes, and re-encodes images at build time. But the pipeline only does what it is asked to do, and the decisions — which format, which sizes, which images load eagerly and which lazily, what happens to remote images — are the site's to make. This article walks through those decisions using this repository as the working example: how its `ImageMod` component handles images, what it does by default, where its defaults are good, and where a site like this one should go further.

## Why Images Dominate Page Weight

A page's weight is the sum of everything the browser downloads before the page is usable, and images are usually the largest share because they are the least compressible part of the page by default. Text compresses well. Code minifies well. A photograph is already compressed, in a format chosen when it was exported, at a resolution chosen when it was placed — and those choices are usually wrong for the web. A 4000-pixel photograph from a camera, saved as a JPEG at high quality, placed in a 640-pixel-wide card, is four problems at once: too many pixels, too large a file, the wrong format for the job, and no smaller alternative for the phone that will display it at 360 pixels wide.

The cost shows up in the metrics that matter. Largest Contentful Paint — the time until the biggest visible element renders — is, on an image-led page, the time until the hero image renders. A hero that is a megabyte takes measurably longer to arrive than one that is a hundred kilobytes, and on a slow connection the difference is the difference between a page that feels instant and one that feels broken. Cumulative Layout Shift is the jump the page makes when an image arrives without reserved space and pushes the text down; it is entirely preventable, and entirely caused by missing dimensions. And the total bytes are the bill the reader pays, in data and in time, for every oversized image on the page. The guide to [improving Core Web Vitals in Astro](/blog/improve-core-web-vitals-astro) treats images as the first place to look when LCP and CLS are bad, for exactly this reason: they are usually the cause, and they are usually fixable without changing the design.

## WebP vs AVIF vs JPEG: Choosing a Format

The format decision is the first one, because it changes the file size before anything else does. The three formats that matter on the web today are JPEG, WebP, and AVIF, and they are not interchangeable: each is the right answer for a different kind of image.

JPEG is the oldest, and still the right choice for one case: maximum compatibility. Every browser, every tool, and every workflow understands JPEG, and a JPEG is a safe fallback when nothing else can be assumed. Its weakness is efficiency: at the same visual quality, a JPEG is substantially larger than a WebP or an AVIF of the same image, because its compression is three decades old. Use JPEG when compatibility is the binding constraint, and not otherwise.

WebP is the pragmatic default. It compresses photographs better than JPEG, supports transparency like PNG, and is supported by every modern browser. For a site that wants one modern format without thinking about it, WebP is that format — which is why this repository defaults to it, as the next section shows. A WebP at the same visual quality as a JPEG is typically much smaller, and the conversion is a build-time operation, not a runtime cost.

AVIF compresses better still — noticeably smaller than WebP at the same quality, particularly for photographs with fine detail — but it has two costs. Encoding is slower, which matters at build time on a site with many images, and support, while broad in current browsers, is not as universal as WebP's. AVIF is the right choice when file size is the binding constraint and the audience is on modern browsers: a photography-heavy site, a hero image that is the page's LCP element, a page where every kilobyte counts. It is not the right default for every image on a site, because the encoding cost and the compatibility edge cases are real.

## How This Repository Handles Images: ImageMod

This site routes almost every image through one component, `src/layouts/components/ImageMod.astro`, and that single choke point is the reason its image handling is consistent. The component wraps Astro's `Image` component from `astro:assets`, and its props declare the whole policy: `src`, `alt`, `width`, `height`, `loading`, `decoding`, `format`, `fit`, `class`, `fetchpriority`, and `style`. The defaults are the interesting part, because they are the site's image policy in code.

The default format is WebP. When a caller does not specify a format, `ImageMod` passes `format={format || "webp"}` to Astro's `Image`, so every local raster image is converted to WebP at build time. The default quality is `"mid"`, Astro's middle preset, which trades a small amount of visible quality for a large saving in bytes — the right trade for photographs on a content site, where nobody inspects pixels at full zoom. The default fit is `contain`, so an image is scaled to fit its box without cropping, and the default loading is `lazy` with `decoding` set to `async`, so below-the-fold images do not block rendering and do not compete with the content for the main thread.

The component also decides what not to optimise, and that decision is as deliberate as the defaults. SVG files and absolute URLs bypass `astro:assets` entirely and render as plain `<img>` tags. That is correct on both counts: Sharp cannot and should not process SVG, which is a vector format with no pixels to re-encode, and a remote image — a media URL on a CDN, for example — has no local file to optimise, so converting it would require downloading it at build time. The component's comment says this plainly, and it exists because the build once failed on exactly this: trying to process an SVG through the image pipeline. The lesson generalises: an image component that assumes every image is a local raster file will break on the first SVG or remote URL it meets.

## Responsive Images: Serving the Right Size

Format is half the saving; size is the other half. An image displayed at 640 pixels wide does not need to be 2400 pixels wide, and a phone displaying it at 360 pixels wide needs less still. Serving one large file to every device wastes bytes on every device except the largest, and on a phone it wastes the most, because the phone has the slowest connection and the smallest screen.

The mechanism for serving different sizes is the responsive image: a `srcset` listing the same image at several widths, and a `sizes` attribute telling the browser how wide the image will be displayed at each viewport width, so the browser can pick the smallest candidate that is still sharp. Astro's `Image` component supports this through its `widths` and `sizes` props: pass a list of widths, and it generates one output file per width and the `srcset` to match. The browser then does the choosing, per device, per connection, without any JavaScript.

This repository does not currently pass `widths` or `sizes` anywhere. Every `ImageMod` call passes a single `width` and `height`, and Astro generates a single output file at that size. That is a genuine gap, and it is worth naming honestly rather than describing the site as doing something it does not: the blog post hero, for example, is rendered through `ImageMod` at 640 by 640 and displayed full-width with a CSS class that stretches it, so a wide screen gets an image that was generated at one size and scaled by the browser. It works, and the WebP conversion keeps the file small, but it is not responsive: the phone and the desktop download the same file, and the desktop gets a softer image than a multi-width `srcset` would give it.

## Lazy Loading, Eager Loading, and Fetch Priority

When an image loads matters as much as how large it is. The browser's default is to load every image as soon as it parses the tag, which is the right behaviour for the hero and the wrong behaviour for everything below the fold. Loading twenty below-the-fold images eagerly means twenty downloads competing with the content the reader is actually looking at, on a connection that can only carry so much at once.

The fix is `loading="lazy"`, and it is this site's default: `ImageMod` passes `loading={loading ?? "lazy"}` to both its branches, so any image that does not say otherwise loads lazily — when it approaches the viewport, not before. The blog cards use it, the feature sections use it, and every image a reader has not scrolled to costs nothing until they do. Lazy loading is a native browser feature, not a JavaScript library, so it costs no code and fails safe: a browser that does not support it simply loads the image normally.

The exception is the hero. The post page renders its feature image through `ImageMod` with `loading="eager"`, because the hero is the page's largest contentful paint element and delaying it delays the metric that matters most. An eager hero, with `fetchpriority` available as a prop for the cases where the browser needs an extra hint that this image is the important one, is the correct pairing: the one image the reader sees first loads first, and everything else waits its turn. `decoding="async"` is the default in both branches, so even the eager image does not block the main thread while it decodes.

## CDN Delivery and Remote Images

A content delivery network puts the image files on servers close to the reader, so the bytes travel a shorter distance and arrive faster, and it takes the serving load off the origin. For a static Astro site, the CDN is usually the host itself: the build output, images included, is deployed to the edge, and the images are served from the same edge network as the HTML. There is no separate image CDN to configure, and no origin server to protect, because there is no origin server — the site is a set of files, and the files are already where the readers are.

![How a source image becomes WebP and AVIF variants at several widths](/images/blog/image-optimization-astro-webp-avif-diagram-1.png)

_One source image enters the build pipeline; Sharp emits modern-format variants at the widths the layout needs, and the browser picks the smallest sharp one._

## The OG Image: A Special Case

Social images are images too, and they have their own rules, which is why they deserve a section of their own. An Open Graph image is the preview card a link gets on social platforms and in messaging apps, and it is governed by the platform's requirements, not the page's design: 1200 by 630 pixels, for the `summary_large_image` card this site uses, in a format the platform can read — which in practice means JPEG or PNG, because social crawlers do not reliably handle WebP or AVIF as preview images.

This site handles the distinction in its layout, `src/layouts/Base.astro`, which takes a dedicated `og_image` prop — a 1200×630 card designed separately from the feature image — and falls back to the feature image and then to the site default when it is not set. The new articles in this series all set `og_image` explicitly, with a separately designed 1200×630 image, because the feature image and the social card are different compositions: the feature image is designed for the page, wide and with the title on it, while the social card is designed for a feed, centred and legible at small sizes. Reusing the feature image as the social card works, in the sense that something renders, but the result is usually a cropped title and a card that looks like an afterthought.

The technical SEO guide covers the metadata side of this — the `og:image` and `twitter:image` tags, the existence check that prevents a broken preview, and the `article:` tags — in the [technical SEO article](/blog/technical-seo-astro-websites). The image-side rule is short: design the social card separately, at 1200×630, in JPEG or PNG, set `og_image` in the frontmatter, and check the preview with the platform's debugger before publishing, because a card that looks wrong in the feed is a click that never happens.

## Common Mistakes

**One size for every device.** A single large file served to phones and desktops alike wastes the most bytes exactly where they cost the most. Add responsive widths and a truthful `sizes` attribute, and let the browser pick.

**Missing width and height.** An image without dimensions is a layout shift. The browser cannot reserve space it does not know the size of, and the page jumps when the image arrives. Pass both, always — this site's component requires them, which is the right design.

**Lazy-loading the hero.** The hero is the LCP element. Lazy-loading it delays the page's most important paint, and no amount of optimisation elsewhere recovers it. Eager for the hero, lazy for everything else.

**Optimising in the wrong place.** A remote image is not optimised by the build, and a local image is not optimised by the CDN. Decide which host optimises each image, and make sure the optimisation actually happens there — a remote URL without optimisation parameters is a multi-megabyte file served as-is.

![Eager hero, lazy below the fold: when each image on the page loads](/images/blog/image-optimization-astro-webp-avif-diagram-2.png)

_The hero loads eagerly as the page's largest paint; every image below the fold waits until the reader scrolls near it._

## Frequently Asked Questions

**Should I use WebP or AVIF?**
WebP by default, AVIF when file size matters most. WebP is supported everywhere modern and is the pragmatic choice for most images — it is this site's default. AVIF is smaller at the same quality, but slower to encode and slightly less universal, so reserve it for photographs where the saving is worth the cost, especially the hero.

**Do I need a separate image CDN for an Astro site?**
Usually not. A static Astro site is deployed to the edge, and its images are served from the same edge network as its pages. A dedicated image CDN earns its place when images need on-the-fly transformation — resizing and format negotiation by URL — or when the image volume is large enough that the build-time pipeline becomes slow.

**Why does my page jump when images load?**
Because the browser did not know the image's dimensions before it arrived, so it could not reserve the space. Pass `width` and `height` on every image, and the browser computes the aspect ratio and holds the space. This is the single most effective CLS fix on most sites.

## Conclusion

Image optimisation in Astro is a short checklist, and most of it lives in one component. Route images through `astro:assets` so the build converts and resizes them. Default to WebP, reach for AVIF where size matters, and keep SVG for graphics and JPEG or PNG for the social card. Serve responsive widths with a truthful `sizes` attribute — the one item on this site's own list that is still to do. Pass width and height on every image. Load the hero eagerly and everything else lazily. And decide, per image, whether the build or the remote host is responsible for optimising it, because an image nobody optimised is the heaviest thing on the page.

Start with the audit: open the heaviest page, list its images, and check each one against the list. The format, the size, the dimensions, the loading attribute — four checks per image, and the fixes are usually a prop change in the one component every image already flows through.

**Further reading:** the [Astro images guide](https://docs.astro.build/en/guides/images/) covers `astro:assets`, responsive images, and the Sharp service in full, and web.dev's [image optimisation guide](https://web.dev/learn/performance/optimize-images) explains formats, sizing, and lazy loading with the measurements behind them.
