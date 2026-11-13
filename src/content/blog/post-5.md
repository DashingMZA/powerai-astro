---
title: "Modern CSS Techniques for Better Web Design"
meta_title: "Modern CSS Techniques"
description: "Modern CSS now handles layouts and effects that once needed JavaScript: Grid, custom properties, container queries, and cascade layers."
date: 2022-08-18T09:00:00Z
updated: 2026-11-13
image: "/images/blog/blog-5.png"
category: "CSS"
author:
  name: "Emily Davis"
  designation: "UI/UX Designer"
  avatar: "/images/avatars/avatar-2.jpg"
featured: false
draft: false
---

CSS has evolved significantly over the years, introducing powerful features that make web design more flexible and efficient. From Flexbox to Grid, and custom properties to container queries, modern CSS offers endless possibilities. Much of what used to require JavaScript — or a heavy framework — is now a few lines of native CSS, and the result is faster pages with less code to maintain.

## Flexbox and Grid Layout

Flexbox and Grid solve different problems, and knowing which to reach for is half the skill. Flexbox lays items out along one axis: it is the right tool for navigation bars, button groups, and centring content. Grid lays items out along two axes at once, which makes it the right tool for page layouts, card grids, and anything where rows and columns both matter.

A practical pattern is to use Grid for the overall page structure and Flexbox inside components. Grid's `minmax()` and `auto-fit` make responsive card layouts almost trivial — a grid that fits as many columns as the container allows, with no media queries at all — while Flexbox handles the alignment details within each card.

## CSS Custom Properties

Custom properties — variables declared with `--name` and read with `var()` — turned CSS into something you can theme properly. Define your design tokens once at the root: colours, spacing, radii, font stacks. Every component then references the tokens instead of hard-coding values, so a rebrand or a dark mode becomes a change to a handful of variables rather than a search through every stylesheet.

Custom properties are also dynamic in a way preprocessor variables never were: they cascade, they inherit, and they can be changed at runtime with JavaScript. That makes them the natural mechanism for user-selected themes, per-brand styling, and state-driven variations such as a compact mode. If you use a utility framework, the same idea applies — [Tailwind CSS](/blog/post-13) v4 defines its theme tokens as native CSS custom properties under the hood.

## Responsive Design with Container Queries

Media queries respond to the viewport, but components do not live in the viewport — they live in containers. A card component might be wide in a main column and narrow in a sidebar, and it should adapt to the space it actually has. Container queries solve this: declare a container with `container-type: inline-size`, then style its children based on the container's width rather than the screen's.

Combined with cascade layers (`@layer`), which give you explicit control over which styles win without specificity wars, and features such as `:has()`, subgrid, and `clamp()` for fluid type, modern CSS covers most responsive design needs natively. The browser support for all of these is now broad enough to use in production, with sensible fallbacks for the rare older browser.

> The best CSS is the CSS you do not write. Before reaching for JavaScript, check whether the platform already does it.

Start new work with these primitives — Grid for layout, custom properties for theming, container queries for components — and you will find your stylesheets getting shorter while your designs get more consistent.
