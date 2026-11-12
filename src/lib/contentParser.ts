// Content parser utilities for Astro.
//
// CANONICAL PARSER — this file (`@/lib/contentParser`) is the canonical
// content-access layer for list/index pages and for `PostSingle.astro`.
// It returns plain `{ frontmatter, slug, content }` objects (the legacy
// shape `src/types/index.ts` describes) and it:
//   - drops drafts and `-`-prefixed files,
//   - hides future-dated entries (an index page must never list a post
//     its single page would 404 — see `contentParser.astro`),
//   - swallows lookup errors and returns `{ frontmatter: {}, content: "" }`
//     (list pages render empty rather than crashing the build).
// `src/lib/contentParser.astro` is the TYPED variant: it returns raw
// `CollectionEntry`s for the `[single]` pages (`blog/[single]`,
// `careers/[single]`, `case-studies/[single]`, `integrations/[single]`,
// `[regular]`) and now applies the SAME future-date filter, so the two
// parsers agree on what exists. Do not change one parser's filtering
// without changing the other's. Do not import one parser expecting the
// other's return shape — `PostSingle.astro` needs THIS file's shape
// (`p.frontmatter.category`, `p.slug`).

import { getCollection, getEntry } from "astro:content";

/**
 * Get a list/index page data (e.g., homepage/_index.md, sections/call-to-action.md)
 */
export async function getListPage(filePath: string) {
  // Parse the filepath to get collection and slug
  // e.g. "homepage/_index.md" -> collection: "homepage", slug: "-index"
  // e.g. "sections/call-to-action.md" -> collection: "sections", slug: "call-to-action"
  const parts = filePath.split("/");
  const collection = parts[0] as any;
  let slug = parts.slice(1).join("/").replace(".md", "").replace(".mdx", "");
  
  // Convert _index to -index for Astro naming convention
  slug = slug.replace("_index", "-index");
  
  try {
    const entry = await getEntry(collection, slug);
    if (!entry) {
      return { frontmatter: {}, content: "" };
    }
    
    return {
      frontmatter: entry.data as any,
      content: entry.body || "",
    };
  } catch {
    return { frontmatter: {}, content: "" };
  }
}

/**
 * Get all single pages from a collection folder
 */
export async function getSinglePage(folder: string) {
  try {
    const allEntries = await getCollection(folder as any);
    
    // Filter out index pages and drafts
    const singlePages = allEntries
      .filter((entry: any) => !entry.id.startsWith("-"))
      .filter((entry: any) => !entry.data?.draft)
      .map((entry: any) => ({
        frontmatter: entry.data,
        slug: entry.data?.url || entry.id.replace(/\.(md|mdx)$/, ""),
        content: entry.body || "",
      }));
    
    // Filter by date
    const filterByDate = singlePages.filter(
      (page: any) => new Date(page.frontmatter.date || new Date()) <= new Date(),
    );
    
    return filterByDate;
  } catch {
    return [];
  }
}
