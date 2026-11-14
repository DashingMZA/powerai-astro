---
title: "Astro Islands Architecture Explained: How Partial Hydration Works"
meta_title: "Astro Islands Architecture Explained"
description: "Astro Islands Architecture ships zero JavaScript by default and hydrates only the interactive parts. How partial hydration works, client directives, and when to use islands."
date: 2026-11-14
image: "/images/blog/astro-islands-architecture-partial-hydration.png"
og_image: "/images/blog/astro-islands-architecture-partial-hydration-og.png"
category: "Technology"
tags: ["Astro", "Islands Architecture", "Performance", "JavaScript"]
author:
  name: "John Doe"
  designation: "Software Engineer"
  avatar: "/images/avatar.png"
featured: false
draft: false
---

Most JavaScript frameworks start from the same assumption: the page is an application, so the browser should download the application. The HTML arrives as a shell, a bundle of JavaScript arrives after it, and the page only becomes usable once that bundle has been downloaded, parsed, and executed. Astro starts from the opposite assumption: the page is a document, so the browser should receive a document. The HTML arrives complete, readable, and usable, and JavaScript is added only where a specific part of the page actually needs to be interactive. That difference is the whole idea behind Astro Islands Architecture, and it is why an Astro site can feel instant on a slow connection while a conventional single-page application is still showing a loading spinner.

An island is a single interactive component floating in a sea of static HTML. The header, the article text, the footer, the pricing table — all of that is plain HTML rendered on the server at build time, with no JavaScript attached. The testimonial carousel, the animated statistics counter, the pricing toggle — each of those is an island. Each island gets its own small JavaScript bundle, loaded and hydrated on its own schedule, and the rest of the page never pays for it. If a page has no islands at all, it ships no JavaScript at all. That is not a marketing slogan; it is the default behaviour of the framework.

## What an Island Actually Is

The term "islands architecture" was popularised by Katie Sylor-Miller in 2019, and Astro adopted it as its central design idea. The mental model is a page of static content — the sea — with isolated pockets of interactivity — the islands — dotted through it. Each island is self-contained: it has its own component, its own state, and its own JavaScript. Islands do not share a runtime with each other unless you deliberately wire them together, and they do not share a runtime with the static parts of the page, because the static parts have no runtime at all.

It also changes how you think about components. In Astro, there are two kinds, and they live in different worlds. The first is an Astro component — a `.astro` file. It runs only on the server, at build time, and produces HTML. It can query a content collection, read configuration, and compose other components, but it can never run in the browser. The second is a UI framework component — React, Vue, Svelte, Solid, or another supported framework — which can run in the browser, but only if you tell Astro to hydrate it. An Astro component that imports a React component without a hydration directive renders that React component to static HTML on the server and ships no JavaScript for it. The component looks identical in the browser; it simply does nothing when you click it, because there is no code on the client to respond.

That distinction is the most common source of confusion for developers coming to Astro from a framework where every component is interactive by default. The fix is not to add JavaScript everywhere — it is to decide, component by component, which parts of the page need to respond to the user, and to hydrate only those.

## Zero JavaScript by Default

The default is worth stating plainly, because it is so different from the norm: an Astro page with no client directives ships zero JavaScript. Not "very little JavaScript" or "only a small runtime" — none. The HTML that leaves the server is the page. A browser with JavaScript disabled renders it fully. A search engine crawler reads it fully. A reader on a slow mobile connection sees the content as soon as the HTML arrives, instead of waiting for a bundle to download and execute before the text appears.

The practical consequence is that performance work in Astro starts from a different place. In a conventional application, the first task is usually to shrink a bundle that is too large. In Astro, the first task is to notice how little there is to shrink: the page is already fast, and the work is to keep it that way by being deliberate about every island you add. Each island is a cost, and the question for each one is whether the interactivity it provides is worth the JavaScript it ships. The guide to [improving Core Web Vitals in Astro](/blog/improve-core-web-vitals-astro) builds directly on this point: the fastest JavaScript is the JavaScript you never ship, and islands are the mechanism that lets you not ship it. A page that loads no JavaScript has no hydration cost, no long tasks from framework startup, and no competition between the framework and the content for the main thread.

## How Partial Hydration Works

Partial hydration is the process that turns a server-rendered island into a live, interactive component in the browser. It happens in three stages, and understanding each one explains why islands behave the way they do.

First, at build time, Astro renders the island to HTML on the server, exactly as it renders every other component. The HTML is complete and meaningful: a statistics counter renders its final numbers, a testimonial slider renders its first testimonial, a pricing toggle renders the default plan. A user who arrives before the JavaScript loads — or who has JavaScript disabled, or whose connection drops the bundle — still sees the content. The island degrades to a static snapshot instead of an empty box, which is the difference between a page that works slowly and a page that does not work at all.

Second, Astro emits a small JavaScript bundle for the island, containing the framework runtime for that island plus the component's own code. Each island gets its own bundle, and Astro only emits bundles for islands that are actually hydrated. An island rendered statically, without a directive, gets no bundle. Two islands using the same framework share the framework code where the bundler can arrange it, but they remain separate hydration units: each one hydrates independently, and a slow or failing island does not block the others.

Third, in the browser, Astro's client runtime hydrates each island according to its directive — immediately, when it becomes visible, when the browser is idle, or when a media query matches. Hydration means the framework takes over the server-rendered HTML, attaches event listeners, and restores the component's state, so the static snapshot becomes the live component. Until that moment, the island is inert HTML; after it, it is interactive. The transition is invisible when it happens quickly, and harmless when it happens slowly, because the content was already there.

## Client Directives: The Controls

Client directives decide when an island hydrates. They are attributes you add to a framework component in an `.astro` file, and each one names a loading strategy. There are five that matter in practice, and choosing between them is the main day-to-day skill of working with islands.

`client:load` hydrates the island immediately, as soon as the page loads. Use it for components the user needs right away: the mobile navigation toggle, a search box in the header, a form the page exists to serve. The cost is paid up front, on every page load, so reserve it for things genuinely needed immediately. This site uses `client:load` sparingly — for the integration list on the integrations page, and for the tabs, accordion, and video embeds on the elements demo page — where the component is the point of the page and delaying it would be worse than loading it.

`client:visible` hydrates the island when it scrolls into view. This is the workhorse directive, and the one this site uses most. On the homepage, the trusted-clients marquee, the statistics counter, the integration section, the pricing section, and the testimonials are all `client:visible`. The about page does the same for its trusted-clients, statistics, and testimonials sections, the case-studies pages hydrate their featured case study on visibility, and the careers page hydrates its open-positions list the same way. The pattern is consistent: anything below the fold waits until the reader scrolls to it, and anything the reader never scrolls to never hydrates at all. A visitor who reads the hero and leaves has downloaded none of that JavaScript.

`client:idle` hydrates the island when the browser is idle — after the page has loaded and the main thread has a free moment. It is right for components that are useful but not urgent: a comments widget, a feedback button, a chat prompt that can wait a second. The risk is that on a busy page the browser is never truly idle, so the island hydrates late; the benefit is that it never competes with the content for the reader's attention.

`client:media` hydrates the island only when a media query matches, for example `(max-width: 768px)`. It is the directive for components that only exist on one kind of device — a mobile-only menu, a desktop-only sidebar widget — and the cleanest way to avoid shipping desktop JavaScript to phones and phone JavaScript to desktops.

`client:only` skips server rendering entirely and renders the component only in the browser. It exists for components that cannot render on the server at all — ones that read `window` or `localStorage` during render, or depend on a browser-only library. It should be a last resort, because it gives up the static snapshot: until the JavaScript loads, the island is an empty space, and search engines and no-JavaScript readers never see it. If a component can be made to render on the server, even imperfectly, that is almost always better than `client:only`.

The directives compose with a simple rule: pick the latest moment you can get away with. If the component is below the fold, use `client:visible`. If it is above the fold but not urgent, use `client:idle`. Only reach for `client:load` when the component must work the instant the page appears. The default in this repository — `client:visible` for almost everything, `client:load` for the handful of components that are the page's purpose — is a good template to copy.

![How a page is split into static HTML and hydrated islands](/images/blog/astro-islands-architecture-partial-hydration-diagram-1.png)

_A page renders as static HTML first; only the marked islands receive JavaScript, each hydrating on its own schedule._

## Islands in This Repository

This site is a useful case study because it is a real Astro site with real islands, not a demo with one counter. The repository uses the React integration (`@astrojs/react`) with React 19, so the islands are React components, but the architecture would look the same with any framework: the `.astro` pages compose the layout, and the React components are the islands.

A count of the directives tells the story. Across the source, every page-level island uses one of two directives: `client:visible` for sections the reader scrolls to, and `client:load` for the few components that are the page's purpose. There is no `client:idle`, no `client:media`, and no `client:only` in the source at all — not because those directives are unavailable, but because the site's components have not needed them. That is a normal, healthy distribution: most real sites live on `visible` and `load`, and the other directives wait for the specific case that needs them.

The statistics section is the clearest example of an island done well. The `Statistics` component is a React component that renders a grid of numbers with an animated counter and a staggered fade-in, using `motion/react`. It receives its data as props from the page, which reads it from the content layer on the server — the same [Content Collections](/blog/astro-content-collections-guide) layer that supplies the blog posts. The page hydrates it with `client:visible`, so the counter animation only runs when the reader scrolls to it, and a reader who never scrolls that far never downloads the animation code. The component is also written to be safe without JavaScript: the stagger animation only engages once the component is hydrated, so the server-rendered numbers are visible from the start rather than hidden behind an animation that never runs.

## Frameworks, Shared State, and What Not to Do

Islands are independent, and independence has a cost: islands do not share state with each other by default. Two islands on the same page cannot simply read each other's state, because there is no shared application runtime connecting them — each one hydrates on its own, in its own bundle. If two components genuinely need to share state, they should be one island, not two. A pricing toggle and a pricing table that must stay in sync are a single island containing both, not two islands trying to talk to each other. For occasional communication, browser events or `localStorage` are enough; anything in between is a sign the boundary is drawn in the wrong place.

There is a related temptation worth naming: turning the whole page into one island. Wrap the page content in a React component, hydrate it with `client:load`, and you have a single-page application again, with all the familiarity that brings. It also throws away everything islands buy you: the page ships the whole application bundle, the content waits for JavaScript, and the static rendering becomes a loading screen. If a page genuinely needs to be an application — a dashboard, an editor, a real-time tool — then an island that covers most of the page can be the right call, and Astro supports it. But it should be a deliberate decision for a specific page, not the default shape of the site. The comparison with [micro-frontends](/blog/post-18) is instructive here: both patterns split a frontend into independently deployable pieces, but islands split by interactivity within a page, while micro-frontends split by team ownership across an application, and confusing the two leads to islands that are too large and micro-frontends that are too small.

## Common Mistakes

**Hydrating everything with `client:load`.** This is the most common mistake, and the most expensive. It usually happens during a migration, when a developer adds `client:load` to every framework component to make the site behave like the old application. The site works, but it ships all of its JavaScript on every page, and the islands architecture is doing nothing. Go through the islands one by one and ask when each one is actually needed. Most will turn out to be `client:visible`.

**Hydrating a component that does not need it.** A component that renders the same output for every visitor and never responds to input does not need hydration at all. A testimonial list that never changes, a logo marquee that only scrolls with CSS, a statistics grid with no animation — these are static content, and rendering them as islands ships JavaScript that does nothing. Remove the directive and let the server render them.

**Passing non-serializable props.** Functions, class instances, and `Date` objects do not survive the trip from server to browser. The symptom is usually a hydration error or silently missing data. Pass plain data — strings, numbers, arrays, objects — and put the behaviour inside the island.

**Reaching for `client:only` first.** When a component fails to render on the server, the temptation is to slap `client:only` on it and move on. The result is an empty space until the JavaScript loads, and content that search engines never see. The better fix is usually small: guard the browser-only code so it runs after mount instead of during render, or move it into an effect. Reserve `client:only` for components genuinely impossible to render on the server.

**One island per page, containing everything.** A single giant island is a single-page application wearing an Astro costume. Split the page at the boundaries where interactivity actually changes: the navigation is one island, the carousel is another, the form is a third. Each one hydrates on its own schedule, and the page degrades gracefully instead of all at once.

![When each client directive hydrates an island](/images/blog/astro-islands-architecture-partial-hydration-diagram-2.png)

_`client:load` hydrates immediately, `client:visible` waits for scrolling, `client:idle` waits for a free moment, and `client:media` waits for a matching viewport._

## Frequently Asked Questions

**Do islands mean my site has no JavaScript?**
No — they mean your site has JavaScript only where it is needed. A page with no interactive components ships none; a page with three interactive components ships three small bundles. The amount of JavaScript is proportional to the amount of interactivity, instead of being a fixed cost on every page.

**When should I use `client:load` instead of `client:visible`?**
Use `client:load` when the component must work the instant the page appears — navigation, search, a form the page exists to serve. Use `client:visible` for everything below the fold, and `client:idle` for things that can wait. If you are unsure, `client:visible` is the safer default.

**Can islands share state?**
Not directly. Each island hydrates independently, so there is no shared runtime between them. If two components need shared state, make them one island. For occasional communication, use browser events or `localStorage`.

**How do islands relate to a design system?**
Islands are the interactive layer of a component architecture, and a design system is the shared language those components are built from. The guide to [building a scalable design system with Astro and Tailwind](/blog/scalable-design-system-astro-tailwind) covers the tokens, components, and conventions that keep islands consistent across a site — the islands decide when code runs, and the design system decides what it looks like.

## Conclusion

Islands architecture is a small idea with a large consequence: interactivity becomes a choice you make per component, instead of a tax you pay per page. The static parts of a page cost nothing, the interactive parts cost exactly what they use, and the reader gets the content immediately whether or not the JavaScript has arrived yet.

Start with the default — no directives, no JavaScript — and add islands one at a time, each with the latest hydration moment you can get away with. Copy this site's distribution if you need a starting point: `client:visible` for sections the reader scrolls to, `client:load` for the few components that are the page's purpose, and nothing at all for everything else. Check the result the way a reader would: disable JavaScript and see what remains. If the page is still complete, the islands are doing their job.

**Further reading:** the official [Astro islands documentation](https://docs.astro.build/en/concepts/islands/) explains the architecture and every client directive, and the [Astro framework components guide](https://docs.astro.build/en/guides/framework-components/) covers how React, Vue, and Svelte components hydrate in Astro.
