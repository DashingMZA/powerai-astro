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
// - authors / categories / tags: NEW, schema-only, currently empty
//   (directories hold only a `.gitkeep`). See `schemas.ts` for why no
//   author/category/tag files are invented. Blog keeps validated free-text
//   `category` / `tags` until those collections gain files.

import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import {
  aboutSchema,
  authorsSchema,
  blogSchema,
  careersSchema,
  caseStudiesSchema,
  categoriesSchema,
  changelogSchema,
  contactSchema,
  featuresSchema,
  homepageSchema,
  integrationsSchema,
  pagesSchema,
  pricingSchema,
  sectionsSchema,
  tagsSchema,
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
  authors: defineCollection({
    loader: glob({ pattern: md, base: "src/content/authors" }),
    schema: authorsSchema,
  }),
  categories: defineCollection({
    loader: glob({ pattern: md, base: "src/content/categories" }),
    schema: categoriesSchema,
  }),
  tags: defineCollection({
    loader: glob({ pattern: md, base: "src/content/tags" }),
    schema: tagsSchema,
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
