// Canonical blog URLs and taxonomy slugs — the ONE place that decides
// which URL a blog post or archive page lives at, so `[single].astro`,
// `BlogCard`, the RSS feed, `PostSingle` and the archive pages can never
// disagree with each other (or with the canonical URL in `<head>`).
//
// Rules:
// - A post's canonical path is `/blog/<frontmatter slug>` when `slug` is
//   set, otherwise `/blog/<filename>`. Today NO post sets `slug` (all 20
//   posts are filename-routed), so every URL is the filename URL; when a
//   `slug` is added later, links, RSS and canonicals all move to it
//   together and the filename URL keeps serving as an alias (see
//   `src/pages/blog/[single].astro`).
// - Taxonomy slugs are derived from the display name with a FRESH
//   `GithubSlugger` per call. The module-level `slug()` helper in
//   `github-slugger` is stateful (it appends `-1`, `-2`, … on repeat
//   calls), which would make the same author/category resolve to a
//   different URL depending on call order — a fresh instance is
//   deterministic. Values come only from real blog frontmatter:
//   authors `John Doe`, `Jane Smith`, `Mike Johnson`, `Sarah Williams`,
//   `Emily Davis`, `David Chen`, `Alex Rivera`; categories `Technology`,
//   `DevOps`, `CSS`, `React`, `Accessibility`. No post sets `tags`, so
//   there is no tag archive (see CONTENT_SCHEMA.md).

import GithubSlugger from "github-slugger";

/** Minimal shape shared by `CollectionEntry<"blog">` and the plain
 *  `{ frontmatter, slug }` objects from `contentParser.ts`. */
export type BlogPostLike = {
  id: string;
  data: { slug?: string | null };
  /** Absolute file path, present on content-layer entries. */
  filePath?: string;
};

/** Filename id, e.g. `post-1` for `src/content/blog/post-1.md`.
 *
 *  NOTE: in Astro's content layer the entry `id` is the frontmatter
 *  `slug` when one is set (`astro/dist/content/loaders/glob.js`:
 *  `generateIdDefault` returns `data.slug` first), so `id` alone can
 *  NOT recover the filename once a slug exists. The filename comes from
 *  `filePath` instead; `id` is only the fallback for shapes that lack it
 *  (e.g. the plain objects from `contentParser.ts`, where `slug` is
 *  already the canonical slug). */
export function postFilename(post: BlogPostLike): string {
  if (post.filePath) {
    const base = post.filePath.split("/").pop() ?? "";
    return base.replace(/\.(md|mdx)$/, "");
  }
  return post.id.replace(/\.(md|mdx)$/, "");
}

/** Canonical slug for a post: frontmatter `slug` wins, else the filename.
 *  (Same as `post.id`: the content layer already resolves the id this
 *  way, so this is just the explicit, documented form of it.) */
export function postSlug(post: BlogPostLike): string {
  return post.data.slug || postFilename(post);
}

/** Canonical path for a post, e.g. `/blog/post-1`. */
export function postUrl(post: BlogPostLike): string {
  return `/blog/${postSlug(post)}`;
}

/** Deterministic URL slug for one taxonomy display name. */
function taxonomySlug(name: string): string {
  return new GithubSlugger().slug(name);
}

/** URL slug for an author display name, e.g. `Jane Smith` -> `jane-smith`. */
export function authorSlug(name: string): string {
  return taxonomySlug(name);
}

/** URL slug for a category name, e.g. `Technology` -> `technology`. */
export function categorySlug(name: string): string {
  return taxonomySlug(name);
}

/** URL slug for a tag name. No post sets `tags` today, so no tag archive
 *  page exists yet; this helper is here so one can be added without
 *  inventing a second slug rule. */
export function tagSlug(name: string): string {
  return taxonomySlug(name);
}

/** Archive path for an author, e.g. `/blog/author/jane-smith`. */
export function authorUrl(name: string): string {
  return `/blog/author/${authorSlug(name)}`;
}

/** Archive path for a category, e.g. `/blog/category/technology`. */
export function categoryUrl(name: string): string {
  return `/blog/category/${categorySlug(name)}`;
}

/** Archive path for a tag, e.g. `/blog/tag/edge`. */
export function tagUrl(name: string): string {
  return `/blog/tag/${tagSlug(name)}`;
}
