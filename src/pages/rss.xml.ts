import rss from "@astrojs/rss";
import { defaultSeo, site } from "@/config/site";
import { postUrl } from "@/lib/blogUrls";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

// Loose local shape: the RSS feed only needs these fields, and typing
// against the collection schema directly breaks whenever the schema file
// (owned by parallel work) changes shape.
type BlogPost = {
  id: string;
  data: {
    title: string;
    description?: string;
    date?: Date | string;
    draft?: boolean;
    slug?: string;
  };
};

export async function GET(context: APIContext) {
  const all = (await getCollection("blog")) as unknown as BlogPost[];
  const posts = all.filter(
    (post) => !post.data?.draft && !post.id.startsWith("-"),
  );
  const sorted = posts.sort(
    (a, b) =>
      new Date(b.data.date ?? 0).getTime() -
      new Date(a.data.date ?? 0).getTime(),
  );
  return rss({
    title: site.title,
    description: defaultSeo.description,
    site: context.site ?? site.baseUrl,
    // Site-wide `trailing_slash: false` — RSS must emit the same
    // no-trailing-slash item links as the canonical URLs, not the
    // @astrojs/rss default (`trailingSlash: true`), which appended `/`
    // to every item link while canonicals had none.
    trailingSlash: false,
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? "",
      // Slug URL when a frontmatter `slug` is set, else the filename URL
      // — the same canonical URL `[single].astro` emits (see blogUrls.ts).
      link: postUrl(post),
      pubDate: post.data.date ? new Date(post.data.date) : undefined,
    })),
  });
}
