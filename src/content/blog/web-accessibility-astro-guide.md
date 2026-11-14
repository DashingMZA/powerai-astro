---
title: "Web Accessibility in Astro: Semantic HTML, ARIA and Keyboard Navigation"
meta_title: "Web Accessibility in Astro Websites"
description: "Accessible Astro websites: semantic HTML, headings, keyboard navigation, focus management, ARIA, forms, and contrast — plus how to test what you built."
date: 2026-11-14
image: "/images/blog/web-accessibility-astro-guide.png"
og_image: "/images/blog/web-accessibility-astro-guide-og.png"
category: "Accessibility"
tags: ["Accessibility", "Astro", "ARIA", "WCAG"]
author:
  name: "John Doe"
  designation: "Software Engineer"
  avatar: "/images/avatar.png"
featured: false
draft: false
---

An Astro site ships zero JavaScript by default and renders plain HTML on the server — a good starting position for accessibility, but only a starting position. A fast site can still be unusable for a keyboard-only visitor, a screen reader user, or someone who has reduced motion turned on. Accessibility is a set of decisions made in the markup, the styles, and the interactive components, and Astro's architecture makes most of them easy to get right — if you know which ones they are.

This guide covers the accessibility work that matters on a real Astro site, grounded in the patterns this site actually uses: native HTML elements where they exist, ARIA only where HTML falls short, visible focus, honest form errors, and motion that respects the user's operating system setting. The standard throughout is WCAG 2.2, and the bar for normal text is a contrast ratio of at least 4.5:1 against its background.

## Start with Semantic HTML

The single most effective accessibility decision is also the simplest: use the HTML element that means what you are building. A screen reader does not see your design; it reads the document structure, and the structure comes from the elements you choose.

Page structure uses landmarks — `<header>`, `<nav>`, `<main>`, `<footer>`, and named `<section>` elements — so a screen reader user can jump straight to the main content instead of listening through the navigation on every page. Content uses real headings in order: one `<h1>` per page, then `<h2>` for sections and `<h3>` for subsections, never skipping a level to get a visual size. If a heading looks too big, change its size in CSS; do not demote it.

Lists are lists, not paragraphs with manual bullets. Navigation is a `<nav>` containing a `<ul>` of links, not a row of `<div>` elements with click handlers. Buttons are `<button>` elements and links are `<a>` elements with an `href` — a link takes the user somewhere, a button does something on the current page, and assistive technology announces them differently. A `<div>` with an `onClick` is neither, and it is invisible to the keyboard unless you rebuild everything a real button gives you for free.

## Headings and Document Outline

Headings are the table of contents that screen reader users navigate by. Most screen readers offer a headings list, and many users move through a page heading by heading rather than reading linearly. That only works if the outline is honest.

One `<h1>`, matching the page's title, at the top. Sections get `<h2>`, subsections `<h3>`, and the levels never skip: an `<h3>` directly under an `<h1>` tells the reader a level is missing. Blog posts deserve particular care, because their headings come from Markdown — the author controls the outline, so the content guidelines should say so.

On this site the post template renders the title as the `<h1>` and the article body uses `<h2>` and `<h3>`; the marketing pages follow the same rule, with the hero heading as the `<h1>`.

## Keyboard Navigation: Everything Must Work Without a Mouse

Every interactive element on the site must be reachable and operable by keyboard alone. That is the baseline, and it is testable in thirty seconds: put the mouse aside, press Tab, and see whether you can reach everything and do everything. If a control can only be reached by clicking, it is broken.

Native elements give you this for free: links, buttons, form fields, and `<details>` elements are all focusable and operable by keyboard without JavaScript. The work is in not breaking it — never remove an element from the tab order with `tabindex="-1"` unless you are managing focus deliberately, never use a positive `tabindex`, and never build a control from a `<div>` when a native element exists.

The most important keyboard feature on any site is the one most visitors never see: the skip link. A keyboard user arriving on a page with a large header and navigation would otherwise have to Tab through every nav link before reaching the content, on every page. A skip link — a link to `#main-content` placed first in the document, hidden until it receives focus — lets them jump straight to the content. This site has one, defined in `src/styles/base.css`:

```css
/* Skip link: hidden until keyboard focus, then clearly visible. */
.skip-link {
  position: absolute;
  left: 1rem;
  top: -100%;
  z-index: 100;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  background: #fff;
  color: #000;
  font-weight: 600;
}

.skip-link:focus {
  top: 1rem;
}
```

Visible focus is the companion rule. When an element has keyboard focus, the user must be able to see which element it is. Browsers provide a default focus outline, and the most common accessibility bug on the modern web is a stylesheet that removes it. This site defines a global visible focus style, also in `src/styles/base.css`:

```css
/* Visible keyboard focus (was missing site-wide). */
:focus-visible {
  outline: 2px solid #9a4dfe;
  outline-offset: 2px;
}
```

Two details matter. `:focus-visible`, rather than `:focus`, means the outline appears for keyboard focus but not for mouse clicks — the cosmetic complaint that leads teams to remove focus styles. And the bright violet (`#9a4dfe`) with a 2px offset is visible against both the site's dark background and its light cards. A focus indicator that cannot be seen against the background is decoration, not accessibility.

## Native Disclosure: The FAQ Pattern

The clearest example of "use the native element" on this site is the FAQ section. A collapsible question-and-answer list is usually built with JavaScript: a button, an `aria-expanded` attribute, a hidden panel, and a script that toggles them in sync. That works, but it is four moving parts that can fall out of sync — the button says expanded while the panel is hidden, or the panel is visible to a screen reader while the button says collapsed.

This site's FAQ, in `src/layouts/partials/FAQ.astro`, uses native HTML instead:

```astro
<details class="faq-item bg-card border border-border/5 py-6 px-7 rounded-3xl">
  <summary>How do I get started?</summary>
  <p>The answer goes here, in plain markup.</p>
</details>
```

A `<details>` element is a disclosure widget built into the browser. The `<summary>` is the button: focusable, operable with Enter and Space, and announced by screen readers as an expandable control with its current state. The content inside is hidden from assistive technology when closed and exposed when open, with no JavaScript and no ARIA attributes to keep in sync. The browser handles the state, the keyboard, and the announcement; the stylesheet handles the appearance.

Native disclosure is not right for every collapsible — an accordion where opening one item closes the others needs scripting — but for an FAQ list, where each item is independent, it is the correct choice. The general principle holds across the site: before adding ARIA and JavaScript to a widget, check whether HTML already has the widget.

## Focus Management: Modals and Traps

Some components genuinely need scripting, and the modal dialog is the canonical case. When a dialog opens, keyboard focus must move into it; while it is open, Tab must cycle within it; Escape must close it; and when it closes, focus must return to the element that opened it. Missing any one of those leaves keyboard users stranded.

This site's video modal, `src/layouts/components/VideoModal.tsx`, implements the full pattern: it focuses the close button on open, traps Tab and Shift+Tab among the dialog's focusable elements, closes on Escape, and restores focus to the previously focused element on close. The dialog itself carries `role="dialog"`, `aria-modal="true"`, and an `aria-label` naming what it contains. The code also documents its own limit honestly: once focus enters the embedded video iframe, the trap cannot intercept keystrokes inside the iframe's own document. That is a real constraint of embedded third-party content, and naming it in a comment is better than pretending the trap is airtight.

## ARIA: Use It Where HTML Falls Short

ARIA — Accessible Rich Internet Applications — is a set of attributes that describe roles, states, and properties HTML cannot express on its own. The first rule of ARIA, from the specification itself, is to prefer native HTML. The second rule is that bad ARIA is worse than no ARIA: a wrong `role` or a stale `aria-expanded` actively misleads assistive technology, while the absence of ARIA at least leaves the native semantics alone.

The legitimate uses on this site are specific. Form errors use `aria-invalid`, as in the contact form (`src/layouts/components/ContactForm.astro`), which sets `aria-invalid="true"` on the field that failed server-side validation and clears it when the user edits the field:

```ts
// Server errors carry the failing field: point at it (aria-invalid ...)
field.setAttribute("aria-invalid", "true");
// ...and clear it as soon as the user edits the field
(event.target as HTMLElement | null)?.removeAttribute("aria-invalid");
```

That is ARIA doing a job HTML cannot: the field is still a normal input, but assistive technology now announces that its current value is invalid, and the error message is associated with it. The pattern matters because it is stateful — the attribute is set when the error arrives and removed when the user starts fixing it, so it never goes stale.

## Forms: Labels, Errors, and Instructions

Forms are where accessibility failures are most common and most consequential, because a form a user cannot complete is a task they cannot do. The rules are concrete.

Every input has a visible `<label>` connected with `for` and `id`, or wrapping the input. Placeholder text is not a label: it disappears when the user types, it is usually low-contrast, and many screen readers do not announce it reliably. Instructions go in visible text near the field, not in a tooltip that only appears on hover.

Errors are announced in text, next to the field, and associated with it — the `aria-invalid` pattern above, plus a visible message. Colour alone never carries the error: a red border with no text is invisible to a colour-blind user and silent to a screen reader. Validation must let the user recover: the field keeps its value, the error names the problem, and the fix is obvious.

## Contrast: The 4.5:1 Rule

WCAG 2.2 requires normal text to have a contrast ratio of at least 4.5:1 against its background, and large text (18pt or 14pt bold and above) at least 3:1. The ratio is a measurable property of two colours, not a judgement call, and it is checkable with any contrast tool: pick the text colour, pick the background colour, read the number.

The ratio exists because text that is merely "readable" to a designer on a good monitor may be unreadable to a user with low vision, on a dim screen, or in sunlight. Grey body text on a dark background is the usual offender — the site's own muted grey (`#B9B7BA`) on its dark body (`#0E0912`) should be measured rather than assumed, and any combination below 4.5:1 for body text needs a darker text colour or a lighter background.

## Reduced Motion: Respect the Operating System Setting

Some users experience motion sickness, dizziness, or disorientation from animation — parallax, auto-playing carousels, and large sliding transitions. Their operating system has a setting for it, `prefers-reduced-motion`, and the web platform exposes it to both CSS and JavaScript. Honouring it is not optional polish; it is the difference between a site that is comfortable and one that makes someone ill.

This site honours it in CSS, in `src/styles/base.css`:

```css
/* Reduced motion: honour the OS setting (was missing site-wide). */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

That rule collapses every CSS animation and transition to near-instant for users who asked for reduced motion, and disables smooth scrolling. It is global and unconditional, which is the point — a per-component opt-in would miss the component someone forgot.

CSS alone cannot stop motion driven by JavaScript. The trusted-clients logo marquee on this site is animated by a script, so the CSS rule cannot reach it — the component says so in a comment and handles the setting itself with a `useReducedMotion` hook that pauses the animation. The pattern is the pairing: a global CSS rule for everything CSS animates, and an explicit check in every script that animates anything.

## Images, Alt Text, and Non-Text Content

Every image needs a decision, not just an `alt` attribute. Informative images get alt text conveying the same information — a chart's conclusion, not "chart". Decorative images get an empty `alt=""` so assistive technology skips them. Functional images, such as a linked logo, get alt text describing the destination, not the picture.

Video needs captions and, where the visuals carry meaning, a transcript or audio description. Audio needs a transcript. Icons that convey meaning need a text equivalent — an icon-only button without a label is a mystery to everyone who cannot see the icon. Colour must never be the only way information is conveyed: a status shown only as a green or red dot is invisible to a colour-blind user, so pair it with text or shape.

## Testing What You Built

Accessibility cannot be verified by inspection alone. The testing workflow has three layers, and each catches things the others miss.

First, keyboard testing: put the mouse aside and Tab through the site. Can you reach everything, is focus always visible, can you open and close every dialog and submit every form? This costs nothing and finds the most severe failures.

Second, automated checks in the browser. Tools such as axe DevTools, Lighthouse's accessibility audit, and the WAVE extension scan the rendered page for common issues: missing labels, insufficient contrast, invalid ARIA, broken heading order. They are fast and catch real bugs — but they can only check what is checkable by rules. A page can pass an automated scan and still be unusable, because no automated tool can tell whether alt text is meaningful, whether the heading outline makes sense, or whether the tab order follows the visual order. Treat a clean automated result as a starting point, not a verdict.

Third, screen reader testing. VoiceOver on macOS and iOS, NVDA on Windows, and TalkBack on Android are free, and using one for even a few minutes changes how you think about markup. Listen to your homepage: does the navigation announce itself as navigation, does the heading list make sense, does the form announce its errors? You do not need to become an expert user; you need to hear what your markup sounds like.

![The keyboard and screen reader path through a page](/images/blog/web-accessibility-astro-guide-diagram-1.png)

_The accessibility path through a page: skip link, landmarks, headings, focus order, and form feedback — each layer checked with keyboard and screen reader._

## Common Mistakes

**Removing the focus outline.** The most common accessibility bug on the web, usually done for cosmetic reasons. Style focus instead of removing it, and use `:focus-visible` so mouse users are unaffected.

**Using a `<div>` as a button.** Rebuilding focus, keyboard handling, and screen reader announcements by hand is more work than using a `<button>`, and the result is almost always worse.

**Skipping heading levels for visual size.** Size is a CSS concern. Heading level is a structure concern. Never confuse the two.

**Adding ARIA that restates HTML.** `role="button"` on a `<button>` is noise. Worse, stale ARIA — an `aria-expanded` that no longer matches the panel — actively misleads. Only add ARIA where HTML cannot express the state.

**Using placeholder text as a label.** Placeholders vanish, have low contrast, and are not reliably announced. Every input needs a real label.

**Conveying information by colour alone.** Errors, statuses, and required fields need text or shape as well as colour.

**Forgetting reduced motion in JavaScript.** The CSS media query cannot stop script-driven animation. Every animated component needs its own check.

**Treating an automated scan as a pass.** Automated tools check a fraction of WCAG. Keyboard testing and screen reader testing are not optional extras.

## Frequently Asked Questions

**Does Astro make a site accessible automatically?**
No. Astro's zero-JavaScript default and server-rendered HTML are a good foundation, but accessibility comes from the markup, styles, and components you write.

**When should I use ARIA?**
When HTML cannot express what you are building — dynamic states, custom widgets, error associations. If you can build it with native HTML, do that.

**What is the minimum contrast ratio for text?**
4.5:1 for normal text and 3:1 for large text under WCAG 2.2. Measure the combinations your design actually uses.

**Do I need to test with a screen reader?**
Yes, at least briefly. Only a screen reader tells you what your markup sounds like. VoiceOver and NVDA are free.

**Is a `<details>` element accessible?**
Yes — a native disclosure widget. The `<summary>` is focusable and operable by keyboard, and screen readers announce its state. It is the right choice for independent collapsibles such as FAQ items.

**Does accessibility help SEO?**
The same work often helps both: semantic HTML, real headings, descriptive alt text, and fast pages are good for search engines and for people. But accessibility is worth doing on its own terms — it is about who can use the site, not only about how it ranks. The [responsive design guide](/blog/responsive-websites-tailwind-css-guide) covers the layout side, and the [design system guide](/blog/scalable-design-system-astro-tailwind) shows how to bake these patterns into shared components. The earlier [Web Accessibility post](/blog/post-9) introduces the WCAG principles this guide builds on.

## Conclusion

Accessible Astro sites are built from ordinary decisions made consistently: semantic elements instead of generic ones, headings in order, a skip link and visible focus, native widgets where they exist, ARIA only where HTML falls short, labelled forms with honest errors, contrast measured rather than assumed, and motion that respects the user's setting. The difficulty is doing all of them, on every component, and verifying the result with a keyboard and a screen reader instead of assuming it works.

Start with the keyboard test — free, minutes long, and it finds the failures that matter most. Then fix what it finds in the shared components, where one fix reaches every page. Accessibility is not a separate phase; it is the quality bar for the markup you were going to write anyway.

**Further reading:** the [W3C Web Accessibility Initiative (WAI)](https://www.w3.org/WAI/) and its [WCAG 2.2 standard](https://www.w3.org/TR/WCAG22/) are the authoritative references, and the [MDN accessibility guides](https://developer.mozilla.org/en-US/docs/Web/Accessibility) cover the practical HTML, ARIA, and CSS patterns in depth.
