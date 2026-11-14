---
title: "Technical SEO for Astro Websites: Sitemaps, Canonicals and Structured Data"
meta_title: "Technical SEO for Astro Websites"
description: "Technical SEO for Astro: sitemaps, canonicals, robots.txt, meta tags, Open Graph, and JSON-LD structured data — the complete setup for search visibility."
date: 2026-11-14
image: "/images/blog/technical-seo-astro-websites.png"
og_image: "/images/blog/technical-seo-astro-websites-og.png"
category: "Technology"
tags: ["Astro", "SEO", "Technical SEO", "Structured Data"]
author:
  name: "John Doe"
  designation: "Software Engineer"
  avatar: "/images/avatar.png"
featured: false
draft: false
---

Content is what ranks, but technical SEO is what lets search engines find the content, understand it, and show it correctly. A beautifully written article that no crawler can reach, that lives at three different URLs, or that arrives without structured data is an article competing with one hand tied behind its back. The good news is that Astro makes most of technical SEO straightforward, because the site is rendered to static HTML at build time: crawlers get complete pages, not JavaScript shells, and the metadata is decided in code rather than assembled in the browser.

## The Foundation: One Canonical Base URL

Every technical SEO decision depends on one value: the site's canonical base URL. Every absolute URL the site emits — canonicals, Open Graph URLs, sitemap entries, feed links, structured data — is built from it, so if it is wrong, everything is wrong in the same direction, and if it changes, everything has to change with it. That is why this site keeps it in exactly one place: `src/config/config.json`, where `site.base_url` is `https://powerai.jadoo.bond`, and why every helper reads it from there instead of hardcoding a domain.

The helper layer lives in `src/lib/seo.ts`, and it is small enough to read in full. `siteUrl` is the base URL with trailing slashes stripped. `toAbsoluteUrl()` resolves a path or a URL to an absolute URL, returning absolute URLs verbatim — never prepending the site origin to a URL that already has one, a bug this codebase has hit before, when a media URL came out as two domains glued together. `canonicalUrl()` returns a frontmatter override when one is set, and otherwise the current pathname resolved against the base URL. Two small functions, used everywhere, so that links, canonicals, feeds, and the sitemap can never disagree about what a page's URL is.

## Sitemaps: Telling Crawlers What Exists

A sitemap is a list of the pages a site wants crawled, and in Astro it is usually generated, not written by hand. This site uses the official `@astrojs/sitemap` integration, wired into `astro.config.mjs`, which builds the sitemap from the pages Astro actually generates. That is the right source: a sitemap built from the build output cannot list a page that does not exist, and cannot forget a page that does.

Astro 7 serves the sitemap at `/sitemap-index.xml`, which points at the per-page sitemap files beneath it — not at `/sitemap.xml`, which does not exist on an Astro 7 site and returns a 404. That detail matters, because it is the URL the robots file points at, and because it is the URL you submit to search consoles. If you are migrating from a framework that served `/sitemap.xml`, update every reference, or crawlers will follow a dead link.

The integration's `filter` function is where the site decides what belongs in the sitemap, and it is worth reading because it encodes real editorial decisions. It excludes `/404`, `/login`, `/sign-up`, and `/elements`: the error page, the dead auth placeholder pages, and a demo style-guide page full of filler text that is also noindexed. It also excludes the filename-alias URLs of blog posts — the mechanism by which a post that sets a frontmatter `slug` different from its filename is served at both URLs, with the sitemap listing only the canonical slug URL. No post sets a `slug` today, so that part of the filter is currently dormant, but it is there for the day one does, and it is a good example of a sitemap filter doing its real job: not listing pages, but deciding which URLs are the real ones.

## Robots.txt: The Static File with One Job

This site's `robots.txt` is a static file at `public/robots.txt`, not a generated route, and it has exactly one job: tell crawlers where the sitemap is, and that everything is allowed. Its entire contents are two lines of permission and one sitemap pointer:

```txt
User-agent: *
Allow: /

Sitemap: https://powerai.jadoo.bond/sitemap-index.xml
```

There are two things to notice. The first is that the sitemap URL is the `/sitemap-index.xml` address from the previous section, absolute and matching the live domain — a relative sitemap URL in robots.txt is ignored by crawlers, and a sitemap URL on the wrong domain is worse than none. The second is that a static file is a deliberate choice here, not a missing feature. The sitemap URL changes only when the domain changes, which is the same moment `base_url` changes in the config, so a file that is updated by hand at that moment is fine. A generated robots route would be the right call on a site where the sitemap URL is computed, or where different environments need different crawl rules — a staging site that must not be indexed, for example, would want a generated `Disallow: /` — but for a single production domain with one sitemap, a static file is simpler and has nothing to break.

## Canonical URLs: One URL per Page

Duplicate content is the quietest technical SEO problem, because nothing looks broken. The same article is reachable at two URLs — with and without a trailing slash, at a filename URL and a slug URL, with a tracking parameter attached — and search engines have to guess which one is the real page. Sometimes they guess right. Sometimes they split the page's authority between the copies, or index the wrong one, and the fix is not more content but a canonical tag that names the one true URL.

This site emits a canonical on every page, always, from `src/layouts/Base.astro`. The line is short and unconditional:

```astro
<link rel="canonical" href={canonicalHref} itemprop="url" />
```

`canonicalHref` comes from `canonicalUrl(Astro.url.pathname, canonical)` in `src/lib/seo.ts`: a frontmatter override wins when one is set, and otherwise the canonical is the current pathname resolved against the base URL. Because the layout is shared by every page, there is no page that forgets its canonical, and because the helper is shared, there is no page that computes it differently. That is the whole design: one helper, one layout, every page.

## Meta Tags, Open Graph, and Twitter Cards

The meta tags on a page are its pitch to two audiences: search engines, which read the title and description for the results page, and social platforms, which read the Open Graph and Twitter tags for link previews. Both are emitted by `Base.astro`, from the same props, so a page's search snippet and its social card can never describe different pages.

The title is `meta_title` when set, falling back to `title`, then to the site title, run through `plainify()` to strip markup and collapsed to single spaces. The description is the page's `description`, falling back to the site's default description from the config. The fallback matters: a page without a description still gets a meta description, and it gets the site's, not an empty string or the first paragraph of the body. The description each post carries in its frontmatter is also its excerpt — the same text feeds the blog cards, the search snippet, the social preview, and the RSS item, so writing it well pays four times over.

The Open Graph tags are the full set: `og:site_name`, `og:title`, `og:description`, `og:type`, `og:url` (the canonical), and `og:locale`. Blog posts set `og:type` to `article` and add `article:published_time`, `article:modified_time`, `article:author`, and `article:section`, all from the post's frontmatter. Twitter gets `twitter:card` set to `summary_large_image`, plus `twitter:title`, `twitter:description`, and `twitter:image`, with the `twitter:site` and `twitter:creator` handles derived from the site's own X profile in the social config — not hardcoded, so they change when the profile changes.

The image handling deserves a closer look, because it is where most sites get Open Graph wrong. The layout takes a dedicated `og_image` when one is set — a 1200×630 social card, designed separately from the feature image — and falls back to the post's feature image, then to the site default. Then it checks whether the chosen local path actually exists in `public/images`, using a glob over the public folder, and falls back to the site default when it does not, instead of emitting an `og:image` that 404s. That check exists because the site has been bitten by exactly that bug: a placeholder image referenced by index pages that did not exist in the public folder. A broken `og:image` is worse than no image at all, because the preview renders as a grey box and the page looks abandoned. The new articles in this series all set `og_image` explicitly, which is the practice to copy: design the social card, set the field, and let the fallback be a safety net rather than the plan. The [image optimisation guide](/blog/image-optimization-astro-webp-avif) covers how those cards are made and why the 1200×630 size matters.

![How one base URL feeds canonicals, sitemaps, feeds, and structured data](/images/blog/technical-seo-astro-websites-diagram-1.png)

_A single base URL in the config flows through shared helpers into every URL the site emits, so canonicals, feeds, and sitemaps can never disagree._

## Structured Data: JSON-LD

Structured data is how a page tells search engines what it is, in a format they can parse without guessing. This site emits it as JSON-LD — a `<script type="application/ld+json">` block in the head, exactly one per page — built by the helpers in `src/lib/seo.ts` and serialized by `serializeJsonLd()`, which escapes any `</script>` inside the values so a stray string in a title cannot break out of the block.

There are four kinds of structured data on the site, each emitted only where it belongs. The homepage gets `Organization` and `WebSite`, built by `organizationJsonLd()`: the site's name, its URL, and its logo, and nothing else — no address, no phone number, no rating, because none of those exist in the config and inventing them would be fabricating structured data. Index pages without their own article get a `WebPage` block from `webPageJsonLd()`, with the type adjusted to `AboutPage`, `ContactPage`, or `CollectionPage` where that is semantically right. Pages that render breadcrumbs get a `BreadcrumbList` from `breadcrumbJsonLd()`, listing the trail the page actually shows.

Blog posts get the most complete treatment. In `src/pages/blog/[single].astro`, each post emits a `BlogPosting` block from `articleJsonLd()` — headline, description, image as an absolute URL, publication and modification dates from frontmatter, author as a `Person` with name and job title, article section from the category, `mainEntityOfPage` pointing at the canonical URL, and a publisher `Organization` with the site's name and logo — alongside the `BreadcrumbList` for Home, Blog, and the post itself. The two blocks are emitted together through the single JSON-LD slot in `Base.astro`, combined into one `@graph` when there are several, so the page has exactly one structured-data block and no duplicates.

Three design rules in `src/lib/seo.ts` are worth copying. First, structured data comes only from validated frontmatter: if a field is missing, it is omitted, never invented. A post without an author gets no author block; a page without an image gets no image field. Second, dates are parsed and re-emitted as ISO strings, and an unparseable date is dropped rather than emitted broken. Third, the job-posting helper, `jobPostingJsonLd()`, returns `null` unless the role is genuinely open — a real title, description, location, and a deadline still in the future — and it omits salary entirely, because the frontmatter salary is a range string that cannot be turned into valid structured salary data without inventing numbers. Every career in the repository has a deadline in the past, so no `JobPosting` is emitted today, and that is correct: a structured-data block that claims a closed job is open is worse than no block at all.

## Feeds and Discovery

Search engines are not the only consumers of a site's metadata. Feed readers use the RSS feed, and the feed's correctness is part of technical SEO in the broad sense: it is another place where URLs, dates, and descriptions have to agree with the rest of the site. This site serves RSS from `src/pages/rss.xml.ts`, built on `@astrojs/rss`, and it is deliberately consistent with everything above: it filters out drafts and `-`-prefixed index files, sorts newest first, and builds each item's link through the same `postUrl()` helper as the canonicals, with `trailingSlash: false` to match the site's no-trailing-slash setting — the feed library's default would have appended a slash to every item link while the canonicals had none. The feed's title and description come from the site config, and the comparison of RSS, Atom, and JSON Feed — and which formats a site should support — is covered in the [feeds comparison](/blog/rss-vs-atom-vs-json-feed).

Discovery ties the pieces together. The `Base.astro` layout emits the canonical, the Open Graph tags, and the JSON-LD block on every page; the sitemap lists the pages; robots.txt points at the sitemap; the feed lists the posts. A crawler that arrives at any entry point can find the rest. The [Content Collections guide](/blog/astro-content-collections-guide) describes the content layer that feeds all of this — the typed frontmatter that the canonicals, the feed, and the structured data all read from — and the reason the whole setup stays consistent is that it reads from one source instead of several.

## Common Mistakes

**Two versions of every URL.** Trailing-slash mismatches are the classic case: the canonical has no slash, the sitemap has one, and the feed has the other. Pick one, set it in the config, and make every emitter read the same setting. This site's `trailing_slash: false` is read by the canonical helper, the feed, and the routing, which is why they agree.

**Robots.txt used as a noindex.** Blocking a page in robots.txt does not remove it from search results; it only stops the crawler fetching it, which can leave a bare URL in the index with no description. Use `noindex` for pages that must not appear.

**Structured data that invents facts.** Ratings, prices, addresses, and salaries that do not exist in the site's data must not appear in JSON-LD. Search engines treat fabricated structured data as spam, and the penalty is worse than having no rich results. Omit the field when the data is absent — this site's helpers do exactly that.

**Open Graph images that 404.** A social preview with a broken image looks worse than a plain link. Check that the `og:image` URL resolves, that it is absolute, and that it is the right dimensions for the card — 1200×630 for `summary_large_image`. The existence check in this site's layout is a safety net, not a substitute for setting the image correctly.

![Where each SEO mechanism lives in this repository](/images/blog/technical-seo-astro-websites-diagram-2.png)

_Sitemap in the config, canonicals and meta tags in the shared layout, structured data in the SEO helpers, robots as a static file — one mechanism per concern._

## Frequently Asked Questions

**Does Astro need an SEO plugin?**
No, in the sense that Astro does not need a plugin to emit canonicals, meta tags, or structured data — those are plain HTML, and a layout can emit them directly, as this site does. What Astro does need is the sitemap integration (`@astrojs/sitemap`) and the RSS integration (`@astrojs/rss`), because those generate files from the build output. Everything else is a layout and a few helpers.

**Is JSON-LD better than microdata?**
For most sites, yes — it is easier to maintain, because it lives in one script block rather than scattered through the markup, and it is what Google's documentation recommends. This site uses JSON-LD exclusively, built by helpers from frontmatter, so the structured data and the visible page can never disagree.

**How do I check my technical SEO setup?**
Validate the output, not the source. Fetch a live page and check the canonical, the meta description, and the Open Graph tags in the HTML. Run the JSON-LD through the Rich Results Test. Fetch `/sitemap-index.xml` and confirm every URL returns a 200. Fetch `/robots.txt` and confirm the sitemap line points at the live sitemap. Then repeat for a blog post, a category page, and the homepage — the setup is only correct if it is correct on every page type.

## Conclusion

Technical SEO in Astro is mostly a matter of putting the right logic in the right place and then letting it run on every page. One base URL in the config. One helper for canonicals and absolute URLs. One layout that emits the canonical, the meta tags, the Open Graph tags, and the JSON-LD block. One sitemap integration with a filter that encodes the real decisions about what should be indexed. One static robots file pointing at the sitemap. One feed built from the same URL helpers as everything else.

Audit your own site against that list, in the live HTML rather than in the source code. If every page emits a canonical that matches its own links, if the sitemap lists exactly the public pages, if robots.txt points at the live sitemap, and if the structured data parses and contains only facts the site actually has, the technical foundation is sound — and the content can do the ranking.

**Further reading:** Google's [Search Central documentation on sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview) and [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), and the [Astro sitemap integration guide](https://docs.astro.build/en/guides/integrations-guide/sitemap/).
