import type { Post, CaseStudy } from "@/types/index";

// sort by date
export const sortByDate = <T extends Post | CaseStudy>(array: T[]): T[] => {
  const sortedArray = array.sort(
    (a: any, b: any) =>
      new Date(b.frontmatter.date && b.frontmatter.date).valueOf() -
      new Date(a.frontmatter.date && a.frontmatter.date).valueOf(),
  );
  return sortedArray;
};

// sort product by weight
export const sortByWeight = (array: any[]) => {
  const withWeight = array.filter(
    (item: { frontmatter: { weight: any } }) => item.frontmatter.weight,
  );
  const withoutWeight = array.filter(
    (item: { frontmatter: { weight: any } }) => !item.frontmatter.weight,
  );
  const sortedWeightedArray = withWeight.sort(
    (
      a: { frontmatter: { weight: number } },
      b: { frontmatter: { weight: number } },
    ) => a.frontmatter.weight - b.frontmatter.weight,
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
