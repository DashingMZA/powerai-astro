---
title: "RSS vs Atom vs JSON Feed: Which Format Should Your Website Support?"
meta_title: "RSS vs Atom vs JSON Feed Compared"
description: "RSS 2.0, Atom 1.0, and JSON Feed 1.1 compared: formats, readers, metadata, and discovery — and which feed format your website should support."
date: 2026-11-14
image: "/images/blog/rss-vs-atom-vs-json-feed.png"
og_image: "/images/blog/rss-vs-atom-vs-json-feed-og.png"
category: "Technology"
tags: ["RSS", "Atom", "JSON Feed", "Feeds"]
author:
  name: "John Doe"
  designation: "Software Engineer"
  avatar: "/images/avatar.png"
featured: false
draft: false
---

Every blog post you publish has two audiences: the reader who visits the page, and the software that watches for new posts on the reader's behalf. Feed readers, newsletter tools, search engines, and aggregation services all consume your site through a feed — a machine-readable list of your latest content. The question is which format to serve them. Three formats compete for that job: RSS 2.0, Atom 1.0, and JSON Feed 1.1. They do the same job, they overlap heavily, and the differences between them are small enough that many sites pick one at random and never think about it again. That is a mistake worth avoiding, because the choice affects which readers can subscribe, how much metadata you can express, and how much work your build has to do.

This guide compares the three formats on their actual merits, shows what each one looks like for the same post, and explains the decision this site made — and what it would take to add the other two. The examples are grounded in a real implementation: this site's feed is generated from its [Astro Content Collections](/blog/astro-content-collections-guide), so the same typed entries that render the blog pages also feed the feed.

## What a Feed Actually Is

A feed is a file your site publishes at a stable URL — conventionally `/rss.xml`, `/atom.xml`, or `/feed.json` — that lists your recent entries in reverse chronological order. Each entry carries at minimum a title, a link back to the full article, and a publication date. Readers poll the file on a schedule, compare the entries against what they have already seen, and show the new ones to the user.

Three properties make feeds useful. First, they are pull-based: the reader asks, the server answers, and nothing about the reader's identity is exposed. Second, they are durable: a feed URL published today still works in ten years as long as the file keeps being generated. Third, they are format-agnostic at the content level — the same post can appear in all three formats, because the formats differ in syntax, not in what a post is.

Supporting a format is cheap once you have the data: a clean, queryable source of posts with titles, descriptions, dates, and canonical URLs. A site built on content collections already has that.

## RSS 2.0: The Default Everyone Supports

RSS 2.0 is the oldest of the three and the one with the widest support. It is an XML format, specified by the RSS Advisory Board, and it is the format nearly every feed reader, podcast app, and aggregation service understands. If you support exactly one format, RSS is the safe choice — not because it is the best designed, but because it is the one no reader is missing.

An RSS feed is a `<channel>` containing `<item>` elements. The channel describes the site; each item describes one post. Here is what one entry looks like for a post on this site:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Power AI</title>
    <link>https://powerai.jadoo.bond</link>
    <description>Articles and insights on AI, machine learning, and data science.</description>
    <item>
      <title>Astro Content Collections: A Complete Guide to Managing Blog Content</title>
      <link>https://powerai.jadoo.bond/blog/astro-content-collections-guide</link>
      <description>Astro Content Collections turn Markdown files into a typed, validated content layer.</description>
      <pubDate>Fri, 14 Nov 2026 00:00:00 GMT</pubDate>
      <guid>https://powerai.jadoo.bond/blog/astro-content-collections-guide</guid>
    </item>
  </channel>
</rss>
```

A few details matter. The `<guid>` is the entry's permanent identifier; readers use it to decide whether an item is new, so it must never change for the same post. Using the post's canonical URL as the guid, as above, is the simplest correct choice. The `<pubDate>` uses the RFC 822 date format (`Fri, 14 Nov 2026 00:00:00 GMT`), which is one of RSS's rough edges — it is a different date format from the ISO 8601 dates the rest of the web uses, and getting it wrong produces feeds that readers silently mis-sort.

RSS 2.0's weaknesses are real but rarely decisive for a blog. It has no standard way to say when an entry was last updated, only when it was published, so a corrected post looks identical to an untouched one. Its content model is loose: the full article body goes in an optional `<content:encoded>` element from a namespace extension, which not every reader honours. And because RSS predates the modern web's concern with internationalisation, its handling of non-ASCII content depends on the XML declaration being correct. None of this stops RSS from working — it just means the format carries the quirks of its age.

## Atom 1.0: The Careful Standard

Atom 1.0 is the IETF standard (RFC 4287) written to fix RSS's ambiguities. It is also XML, but it is stricter and more expressive: every feed and every entry has a required unique id, dates use ISO 8601, and the format distinguishes between a summary and full content as first-class elements.

The same post in Atom looks like this:

```xml
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Power AI</title>
  <link href="https://powerai.jadoo.bond" />
  <link rel="self" href="https://powerai.jadoo.bond/atom.xml" />
  <id>https://powerai.jadoo.bond</id>
  <updated>2026-11-14T00:00:00Z</updated>
  <entry>
    <title>Astro Content Collections: A Complete Guide to Managing Blog Content</title>
    <link href="https://powerai.jadoo.bond/blog/astro-content-collections-guide" />
    <id>https://powerai.jadoo.bond/blog/astro-content-collections-guide</id>
    <published>2026-11-14T00:00:00Z</published>
    <updated>2026-11-14T00:00:00Z</updated>
    <summary>Astro Content Collections turn Markdown files into a typed, validated content layer.</summary>
  </entry>
</feed>
```

Atom's improvements are concrete. The `<updated>` element on each entry tells readers when a post changed, so a corrected article can surface again without pretending to be new. The `<id>` is required and must be a permanent, globally unique identifier — the format refuses to let you be sloppy about identity the way RSS allows. Dates are ISO 8601, the same format your frontmatter and your sitemap already use, so no conversion code is needed. And Atom defines how content types work: an entry's `<content>` can be plain text, escaped HTML, or XHTML, and the reader knows which one it is getting.

The cost is support. Atom is well supported by dedicated feed readers, but it is less universal than RSS — some older tools, podcast directories, and simple aggregators only speak RSS. For a text blog that is a minor gap; for a podcast it would be decisive, because podcasting's ecosystem is built on RSS extensions.

## JSON Feed 1.1: The Format for Developers

JSON Feed 1.1 is the newest of the three, and the simplest to explain: it is the same data as RSS or Atom, expressed as JSON instead of XML. It was designed by developers who were tired of parsing XML in languages where JSON parsing is one function call. A feed reader written in JavaScript can consume a JSON Feed with `JSON.parse` and no XML library at all.

The same post in JSON Feed:

```json
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "Power AI",
  "home_page_url": "https://powerai.jadoo.bond",
  "feed_url": "https://powerai.jadoo.bond/feed.json",
  "items": [
    {
      "id": "https://powerai.jadoo.bond/blog/astro-content-collections-guide",
      "url": "https://powerai.jadoo.bond/blog/astro-content-collections-guide",
      "title": "Astro Content Collections: A Complete Guide to Managing Blog Content",
      "content_text": "Astro Content Collections turn Markdown files into a typed, validated content layer.",
      "date_published": "2026-11-14T00:00:00Z",
      "date_modified": "2026-11-14T00:00:00Z"
    }
  ]
}
```

JSON Feed's advantages are practical rather than theoretical. JSON is easier to generate correctly than XML — there are no closing tags to mismatch, no namespaces to declare, and no character escaping rules beyond JSON's own. It is easier to debug, because the output is readable without an XML-aware tool. And it maps naturally onto the data structures your site already has: a JSON Feed is, structurally, just your list of posts serialized, which is why it is the natural first feed for a site whose content layer already returns typed objects.

Its weakness is the mirror of RSS's strength: reader support. JSON Feed is supported by the major modern readers, but it is not universal. Older readers and many automated tools do not know it exists. It also has a smaller extension ecosystem — RSS has decades of namespaced extensions for podcasts, media, and commerce, while JSON Feed's extension story is younger and thinner.

![How one collection of posts becomes three feed formats](/images/blog/rss-vs-atom-vs-json-feed-diagram-1.png)

_One source of posts, three serializations: the collection is queried once and each format renders the same entries in its own syntax._

## Comparing the Three Formats

|                     | RSS 2.0                       | Atom 1.0             | JSON Feed 1.1           |
| ------------------- | ----------------------------- | -------------------- | ----------------------- |
| Syntax              | XML                           | XML                  | JSON                    |
| Standard            | RSS Advisory Board            | IETF RFC 4287        | jsonfeed.org 1.1        |
| Reader support      | Widest                        | Broad                | Modern readers          |
| Entry identity      | `<guid>`, optional            | `<id>`, required     | `id`, required          |
| Updated date        | Not standard                  | `<updated>`          | `date_modified`         |
| Date format         | RFC 822                       | ISO 8601             | ISO 8601                |
| Full content        | `<content:encoded>` extension | `<content>` built in | `content_html` built in |
| Easiest to generate | Moderate                      | Moderate             | Easiest                 |

The table makes the trade-off clear: RSS wins on reach, Atom wins on correctness, JSON Feed wins on developer experience. No format wins on all three axes, which is why the honest answer to "which format should I support?" is usually "more than one" — the cost of the second and third format is small once the first exists.

## How This Site Does It: RSS Today

This site currently ships one feed: RSS 2.0, generated at build time from the blog collection. The implementation lives in `src/pages/rss.xml.ts` and uses the `@astrojs/rss` package, which handles the XML serialization, the RFC 822 dates, and the channel metadata. The route queries the collection, filters out drafts and the `-`-prefixed index file, sorts newest first, and maps each entry to an item:

```ts
// src/pages/rss.xml.ts (simplified)
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context: APIContext) {
  const all = await getCollection("blog");
  const posts = all.filter(
    (post) => !post.data?.draft && !post.id.startsWith("-"),
  );
  const sorted = posts.sort(
    (a, b) =>
      new Date(b.data.date ?? 0).getTime() -
      new Date(a.data.date ?? 0).getTime(),
  );
  return rss({
    title: site.title,
    description: defaultSeo.description,
    site: context.site ?? site.baseUrl,
    trailingSlash: false,
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? "",
      link: postUrl(post),
      pubDate: post.data.date ? new Date(post.data.date) : undefined,
    })),
  });
}
```

Three details in that code are worth noticing, because each one fixes a real bug class. The `trailingSlash: false` option exists because the site uses no trailing slashes in its canonical URLs, and the RSS package's default appends one — without the option, every feed link would disagree with the canonical URL for the same post. The `postUrl()` helper is the same one the post pages and the sitemap use, so the feed, the sitemap, and the canonical can never disagree about a post's URL. And the draft filter is the same filter the listing pages use, so a draft can never leak into the feed.

Two things this implementation does not do are worth stating plainly. It does not cap the number of items — every published post is included, so the feed grows with the blog. And it does not yet have Atom or JSON Feed siblings: there is no `atom.xml` or `feed.json` route in the repository, and no shared feed-entries helper. Adding them is the natural next step, and the shape of that step is clear: extract the query, filter, and sort from `rss.xml.ts` into one shared helper, then write two small routes that render the same entries as Atom and JSON Feed. The RSS route stays as it is — the shared helper only removes duplication, it does not change what RSS emits.

## Adding Atom and JSON Feed to an Astro Site

If RSS is already working, Atom and JSON Feed are each a single route file. The pattern is the same in both cases: query the collection, apply the same filters, sort the same way, and serialize.

An Atom route follows the same structure as the RSS route, with the serialization done by hand or with a small XML builder, since Astro has no official Atom package the way it has `@astrojs/rss` for RSS:

```ts
// src/pages/atom.xml.ts
import { getCollection } from "astro:content";

export async function GET(context: APIContext) {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  const sorted = posts.sort(
    (a, b) =>
      new Date(b.data.date ?? 0).getTime() -
      new Date(a.data.date ?? 0).getTime(),
  );
  const entries = sorted
    .map(
      (post) => `  <entry>
    <title>${escapeXml(post.data.title)}</title>
    <link href="${postUrl(post)}" />
    <id>${postUrl(post)}</id>
    <published>${new Date(post.data.date).toISOString()}</published>
    <updated>${new Date(post.data.date).toISOString()}</updated>
  </entry>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(site.title)}</title>
  <link href="${site.baseUrl}" />
  <id>${site.baseUrl}</id>
  <updated>${new Date().toISOString()}</updated>
${entries}
</feed>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
```

The `escapeXml` helper in that sketch is not optional decoration — it is the whole reason hand-rolled XML is risky. A post title containing `&` or `<` produces malformed XML without escaping, and a malformed feed fails silently in most readers. If you hand-roll Atom, write the escaping helper first and test it with a title that contains an ampersand. JSON Feed avoids this class of bug entirely, which is a genuine argument in its favour:

```ts
// src/pages/feed.json.ts
import { getCollection } from "astro:content";

export async function GET() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  const sorted = posts.sort(
    (a, b) =>
      new Date(b.data.date ?? 0).getTime() -
      new Date(a.data.date ?? 0).getTime(),
  );
  return Response.json({
    version: "https://jsonfeed.org/version/1.1",
    title: site.title,
    home_page_url: site.baseUrl,
    feed_url: `${site.baseUrl}/feed.json`,
    items: sorted.map((post) => ({
      id: postUrl(post),
      url: postUrl(post),
      title: post.data.title,
      content_text: post.data.description ?? "",
      date_published: new Date(post.data.date).toISOString(),
    })),
  });
}
```

`Response.json` handles all serialization, so there is nothing to escape by hand. That is the entire implementation — the route is shorter than the RSS one, and the only moving parts are the query and the field mapping.

## Feed Discovery: Making Readers Find Your Feed

A feed nobody can find is a feed nobody subscribes to. Discovery works through a `<link>` element in the HTML `<head>` of every page, which tells browsers and reader extensions that a feed exists and where it lives:

```html
<link
  rel="alternate"
  type="application/rss+xml"
  title="Power AI"
  href="/rss.xml"
/>
<link
  rel="alternate"
  type="application/atom+xml"
  title="Power AI"
  href="/atom.xml"
/>
<link
  rel="alternate"
  type="application/feed+json"
  title="Power AI"
  href="/feed.json"
/>
```

Each format gets its own link with its own MIME type, so a reader can pick the format it prefers. The `rel="alternate"` is what makes the browser's feed-detection work, and the `title` is what the reader shows in its subscribe prompt. This is also where the three-format strategy pays off visibly: a reader that understands JSON Feed takes the JSON link, one that only knows RSS takes the RSS link, and neither has to guess a URL.

Discovery is also part of [technical SEO](/blog/technical-seo-astro-websites): the same `<head>` that carries canonicals, Open Graph tags, and structured data is where feed links belong, and the same discipline applies — one helper or one layout partial that every page shares, so a feed link can never be present on one page and missing on another. At the time of writing, this site's layout does not yet advertise its RSS feed with an autodiscovery link, which is a small gap worth closing in the same change that adds the Atom and JSON routes.

## Which Format Should You Support?

The recommendation depends on the site, but the decision tree is short:

- **A personal or company blog:** RSS first, because it is the format every reader supports. Add JSON Feed second — it is the cheapest to implement and the easiest to debug. Add Atom third if you care about updated dates and strict identity, or if your audience uses readers that prefer it.
- **A podcast or media site:** RSS is mandatory. Podcast distribution is built on RSS extensions, and the directories your show needs to appear in do not accept Atom or JSON Feed.
- **A developer-facing API or changelog:** JSON Feed first. Your consumers are programs, and JSON is the format programs prefer. RSS second, for the readers your users already have.
- **A site with frequently corrected posts:** Atom's `<updated>` element is the only standard way to signal a correction. If your content is living documentation rather than dated news, that matters.

For most blogs, the practical answer is all three. The marginal cost of the second and third format is one small route file each, fed by the same query. The marginal benefit is that no reader, tool, or aggregator is ever turned away for want of a format it understands. The one format you should not skip is RSS — it is the only one whose absence a reader will actually notice.

## Common Mistakes

**Changing the guid or id of a post.** Readers track what they have seen by the entry identifier. Change it and every subscriber sees the post as new. Use the canonical URL and never change it.

**Letting feed links disagree with canonicals.** A trailing slash in the feed and no trailing slash in the canonical is two URLs for one post. Derive both from the same helper, as this site does with `postUrl()`.

**Forgetting drafts in the filter.** A feed route that queries the whole collection without filtering drafts publishes unfinished posts to every subscriber. The draft filter belongs in every consumer of the collection, not just the listing pages.

**Publishing a feed with no autodiscovery link.** Readers find feeds through the `<link rel="alternate">` element. Without it, subscription requires the user to guess the feed URL.

**Including the whole site in the feed.** A feed should list recent entries, newest first, and stop. An uncapped feed that grows forever gets slower to fetch and harder for readers to parse. This site currently emits every published post; adding a cap — fifty entries is a common choice — is a sensible follow-up once the archive grows.

**Hand-rolling XML without escaping.** Titles with `&`, `<`, or quotes break unescaped XML. Either escape carefully or use a library that does it for you. JSON Feed sidesteps the problem, which is a real point in its favour.

## Frequently Asked Questions

**Do I need all three formats?**
No. RSS alone covers the widest range of readers. The other two are cheap additions, not requirements — add them when the cost of one more route file is less than the value of reaching the readers who prefer them.

**Is RSS dead?**
No. RSS usage is smaller than it was at its peak, but it remains the standard interchange format for blogs, podcasts, and news. Every major feed reader supports it, and podcasting runs on it. A format with that much infrastructure does not die quietly.

**Can a feed include the full article text?**
Yes. RSS uses the `<content:encoded>` extension, Atom has a built-in `<content>` element, and JSON Feed has `content_html`. Full text lets readers read without visiting your site, which some publishers avoid for traffic reasons and others embrace for reach. Either way, the description or summary field should always be present as a fallback.

**How do readers know a post was updated?**
In Atom, the `<updated>` element. In JSON Feed, `date_modified`. In RSS 2.0 there is no standard mechanism, which is one of the format's genuine limitations.

**How often should a feed update?**
At build time, whenever content changes. A static site regenerates its feeds on every deploy, so the feed is always as fresh as the site. There is no separate publishing step and nothing to keep in sync by hand.

**Does having a feed help SEO?**
Indirectly. Feeds do not rank pages, but they speed up discovery: aggregators and search engines that consume feeds learn about new posts faster than they would by recrawling. The feed is one more signal that a new post exists, alongside the sitemap.

## Conclusion

RSS, Atom, and JSON Feed are three syntaxes for the same idea: a machine-readable list of your recent posts. RSS is the format to start with, because it is the one every reader supports. Atom is the careful standard, with strict identity and proper updated dates. JSON Feed is the developer-friendly option, trivial to generate and impossible to break with an unescaped ampersand. For most sites the right answer is all three, served from the same collection query, advertised with autodiscovery links, and kept consistent with the canonical URLs the rest of the site already emits.

Start with RSS — this site did, and its single route proves the implementation is small. Then extract the shared query, add the Atom and JSON routes, and advertise all three. The work is an afternoon; the benefit is that no reader is ever turned away.

**Further reading:** the [RSS 2.0 specification](https://www.rssboard.org/rss-specification) from the RSS Advisory Board, the [Atom specification (RFC 4287)](https://www.rfc-editor.org/rfc/rfc4287), and the [JSON Feed 1.1 specification](https://www.jsonfeed.org/version/1.1/) cover the formats in full.
