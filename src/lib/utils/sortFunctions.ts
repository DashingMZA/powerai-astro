import type { Post, CaseStudy } from "@/types/index";

// sort by date
export const sortByDate = <T extends Post | CaseStudy>(array: T[]): T[] => {
  // `?? 0` (epoch) for a dateless entry, matching `sortEntriesByDate`
  // below: the old `date && date` produced `new Date(undefined)` —
  // Invalid Date, NaN, and therefore unspecified sort order — for the
  // same entries. Every blog / case-study entry in the repo has a date,
  // so this only affects dateless entries, which now sort last.
  const sortedArray = array.sort(
    (a, b) =>
      new Date(b.frontmatter.date ?? 0).valueOf() -
      new Date(a.frontmatter.date ?? 0).valueOf(),
  );
  return sortedArray;
};

// sort product by weight
export const sortByWeight = (array: { frontmatter: { weight?: number } }[]) => {
  const withWeight = array.filter((item) => item.frontmatter.weight);
  const withoutWeight = array.filter((item) => !item.frontmatter.weight);
  const sortedWeightedArray = withWeight.sort(
    (a, b) => (a.frontmatter.weight ?? 0) - (b.frontmatter.weight ?? 0),
  );
  const sortedArray = [...new Set([...sortedWeightedArray, ...withoutWeight])];
  return sortedArray;
};

// Newest-first sort for content-collection entries, whose `date` is a
// coerced `Date` (see `src/content/schemas.ts`: `z.coerce.date()`).
// `sortByDate` above is typed for the legacy `{ frontmatter, slug,
// content }` shape whose `date` is a string, so it rejects collection
// entries at type-check time. Entries without a date sort last (epoch).
// (Defined here, not in a page's frontmatter: non-exported frontmatter
// helpers are dropped from the chunk `getStaticPaths` runs in.)
export const sortEntriesByDate = <T extends { data: { date?: Date | string } }>(
  array: T[],
): T[] => {
  return [...array].sort(
    (a, b) =>
      new Date(b.data.date ?? 0).getTime() -
      new Date(a.data.date ?? 0).getTime(),
  );
};
