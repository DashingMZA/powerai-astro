// Content collections for PowerAI Astro (Astro 7 Content Layer API).
//
// All validation lives in `./content/schemas.ts` — this file only wires
// each collection's glob loader to its schema. Keep it that way: the
// `.sitepins/schema/*.json` mirror is generated from `schemas.ts`, so any
// schema change made here instead of there would silently desync the mirror.
//
// NOTE: each collection is wired with an explicit `defineCollection()`
// call (no shared helper). A generic helper collapses the per-collection
// schema types into a union (or `unknown`) in Astro's generated
// `InferEntrySchema<>`, which breaks typed consumers such as
// `getCollection("blog")` in `rss.xml.ts`. Explicit calls keep every
// collection's inferred data type exact.
//
// Collections:
// - homepage / about / changelog / contact / features / pricing: single
//   `-index.md` list pages (plus page-specific blocks).
// - blog / careers / case-studies / integrations / pages / sections:
//   list pages plus routable entries.
// - authors / categories / tags: NOT registered here. Their schemas live
//   in `./content/schemas.ts` (and in the `.sitepins/schema/*.json`
//   mirror) for future use, but the directories hold only a `.gitkeep`
//   and Astro's glob loader warns "No files found" on every check/build
//   for an empty collection. Registering them with zero files buys
//   nothing — nothing queries them (blog posts carry an inline `author`
//   object and free-text `category` / `tags`), and the author/category
//   archive pages derive from blog frontmatter instead. Re-add a
//   `defineCollection()` call here (one line each) the moment a real file
//   lands in one of those directories; until then the schemas stay as the
//   documented future-join path. See CONTENT_SCHEMA.md.

import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import {
  aboutSchema,
  blogSchema,
  careersSchema,
  caseStudiesSchema,
  changelogSchema,
  contactSchema,
  featuresSchema,
  homepageSchema,
  integrationsSchema,
  pagesSchema,
  pricingSchema,
  sectionsSchema,
} from "./content/schemas";

const md = "**/*.{md,mdx}";

export const collections = {
  homepage: defineCollection({
    // Homepage keeps the original `-index`-only pattern: the folder holds
    // exactly one file and nothing else should ever match.
    loader: glob({ pattern: "**/-*.{md,mdx}", base: "src/content/homepage" }),
    schema: homepageSchema,
  }),
  about: defineCollection({
    loader: glob({ pattern: md, base: "src/content/about" }),
    schema: aboutSchema,
  }),
  blog: defineCollection({
    loader: glob({ pattern: md, base: "src/content/blog" }),
    schema: blogSchema,
  }),
  careers: defineCollection({
    loader: glob({ pattern: md, base: "src/content/careers" }),
    schema: careersSchema,
  }),
  "case-studies": defineCollection({
    loader: glob({ pattern: md, base: "src/content/case-studies" }),
    schema: caseStudiesSchema,
  }),
  changelog: defineCollection({
    loader: glob({ pattern: md, base: "src/content/changelog" }),
    schema: changelogSchema,
  }),
  contact: defineCollection({
    loader: glob({ pattern: md, base: "src/content/contact" }),
    schema: contactSchema,
  }),
  features: defineCollection({
    loader: glob({ pattern: md, base: "src/content/features" }),
    schema: featuresSchema,
  }),
  integrations: defineCollection({
    loader: glob({ pattern: md, base: "src/content/integrations" }),
    schema: integrationsSchema,
  }),
  pages: defineCollection({
    loader: glob({ pattern: md, base: "src/content/pages" }),
    schema: pagesSchema,
  }),
  pricing: defineCollection({
    loader: glob({ pattern: md, base: "src/content/pricing" }),
    schema: pricingSchema,
  }),
  sections: defineCollection({
    loader: glob({ pattern: md, base: "src/content/sections" }),
    schema: sectionsSchema,
  }),
};
