// Content parser utilities for Astro.
//
// CANONICAL PARSER — this file (`@/lib/contentParser`) is the canonical
// content-access layer for list/index pages and for `PostSingle.astro`.
// It returns plain `{ frontmatter, slug, content }` objects (the legacy
// shape `src/types/index.ts` describes as `LegacyPage`) and it:
//   - drops drafts and `-`-prefixed files,
//   - hides future-dated entries (an index page must never list a post
//     its single page would 404),
//   - swallows lookup errors and returns `{ frontmatter: {}, content: "" }`
//     (list pages render empty rather than crashing the build).
// The TYPED variant lives here too, as `getSingleEntry`: it returns raw
// `CollectionEntry`s for the `[single]` pages (`blog/[single]`,
// `careers/[single]`, `case-studies/[single]`, `integrations/[single]`,
// `[regular]`) and applies the SAME future-date filter, so the two
// parsers agree on what exists. It used to live in
// `src/lib/contentParser.astro`, which was deleted 2026-11-12:
// exporting values from a component file is not allowed
// (`astro/no-exports-from-components`). Its typed `getListPage` had no
// importers, so it was dropped with the file instead of moved.
// Do not change one parser's filtering without changing the other's.
// Do not import one parser expecting the other's return shape —
// `PostSingle.astro` needs THIS file's shape (`p.frontmatter.category`,
// `p.slug`).

import { getCollection, getEntry } from "astro:content";
import type { CollectionEntry, CollectionKey } from "astro:content";
import type { LegacyFrontmatter, LegacyPage } from "@/types/index";

/** A validated collection entry, reshaped to the legacy frontmatter the
 *  templates read. The cast from the Zod-validated `entry.data` lives at
 *  this one boundary (see `getSinglePage`). */
type RawLegacyEntry = {
  id: string;
  data: LegacyFrontmatter;
  body?: string;
};

/**
 * Get a list/index page data (e.g., homepage/_index.md, sections/call-to-action.md).
 * The caller names the frontmatter shape (`T`) when a consumer needs
 * more than the shared `LegacyFrontmatter` — e.g. the strict React
 * section components (`FAQPageData["frontmatter"]`) or an `-index.md`
 * file whose header the page passes straight to `PageHeader`
 * (`IndexFrontmatter`). The constraint is only "an object type": some
 * section files (e.g. `statistics.md`) have no `title`, so `T` cannot
 * extend `LegacyFrontmatter`. The parser itself cannot know a file's
 * schema from a runtime path string, so the cast lives at this boundary.
 */
export async function getListPage<
  T extends Record<string, unknown> = LegacyFrontmatter,
>(filePath: string): Promise<{ frontmatter: T; content: string }> {
  // Parse the filepath to get collection and slug
  // e.g. "homepage/_index.md" -> collection: "homepage", slug: "-index"
  // e.g. "sections/call-to-action.md" -> collection: "sections", slug: "call-to-action"
  const parts = filePath.split("/");
  const collection = parts[0] as CollectionKey;
  let slug = parts.slice(1).join("/").replace(".md", "").replace(".mdx", "");

  // Convert _index to -index for Astro naming convention
  slug = slug.replace("_index", "-index");

  try {
    const entry = await getEntry(collection, slug);
    if (!entry) {
      // Entry missing: keep the old empty-page fallback. The cast is
      // honest about this path only — a missing file has no frontmatter
      // at all, and callers render empty rather than crashing.
      return { frontmatter: {} as T, content: "" };
    }

    return {
      frontmatter: entry.data as unknown as T,
      content: entry.body || "",
    };
  } catch {
    return { frontmatter: {} as T, content: "" };
  }
}

/**
 * Get all single pages from a collection folder, in the legacy
 * `{ frontmatter, slug, content }` shape. The caller names the entry
 * shape (`T extends LegacyPage` — `Post`, `CaseStudy`, `Career`,
 * `IntegrationType`) so list pages and cards get a real type; the
 * parser itself cannot know the collection's schema from a runtime
 * folder string, so the cast lives at this one boundary.
 */
export async function getSinglePage<T extends LegacyPage = LegacyPage>(
  folder: string,
): Promise<T[]> {
  try {
    const allEntries = (await getCollection(
      folder as CollectionKey,
    )) as unknown as RawLegacyEntry[];

    // Filter out index pages and drafts
    const singlePages = allEntries
      .filter((entry) => !entry.id.startsWith("-"))
      .filter((entry) => !entry.data?.draft)
      .map((entry) => ({
        frontmatter: entry.data,
        // Canonical post slug: frontmatter `slug` wins, else the
        // `url` override, else the filename id. See `src/lib/blogUrls.ts`
        // — BlogCard links, RSS and canonicals all derive from this, so
        // they can never disagree. (Only the blog schema defines `slug`,
        // so other collections are unaffected.)
        slug:
          entry.data?.slug ||
          entry.data?.url ||
          entry.id.replace(/\.(md|mdx)$/, ""),
        content: entry.body || "",
      }));

    // Filter by date
    const filterByDate = singlePages.filter(
      (page) => new Date(page.frontmatter.date || new Date()) <= new Date(),
    );

    return filterByDate as unknown as T[];
  } catch {
    return [];
  }
}

type PageData = {
  title: string;
  meta_title?: string;
  description?: string;
  image?: string;
  draft?: boolean;
  date?: Date | string;
};

/**
 * Typed content accessor for `[single]` pages.
 *
 * Returns raw `CollectionEntry`s (with `.data`, `.id`, `.body`, `.render()`).
 * This is NOT the canonical parser — see `getSinglePage` above for the
 * canonical `{ frontmatter, slug, content }` shape used by list/index
 * pages and `PostSingle.astro`. This function exists only because the
 * `[single]` pages (and `[regular].astro`) consume `CollectionEntry`s
 * directly; do not "unify" it by changing its return shape without
 * updating all seven consumers in the same change.
 *
 * Filtering matches the canonical parser: drafts and `-`-prefixed files
 * are excluded, AND future-dated entries are excluded (an index page
 * must never list a post its single page would 404). Entries without a
 * `date` field are always included.
 */
export const getSingleEntry = async <C extends CollectionKey>(
  collectionName: C,
): Promise<CollectionEntry<C>[]> => {
  const allPages = await getCollection(collectionName, ({ data, id }) => {
    const page = data as PageData;
    return (
      !page?.draft &&
      !id.startsWith("-") &&
      (!page?.date || new Date(page.date) <= new Date())
    );
  });
  return allPages;
};
