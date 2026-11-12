import rss from "@astrojs/rss";
import config from "@/config/config.json";
import { getCollection } from "astro:content";

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
  };
};

export async function GET(context: any) {
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
    title: config.site.title,
    description: config.metadata.meta_description,
    site: context.site ?? config.site.base_url,
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? "",
      link: `/blog/${post.id}`,
      pubDate: post.data.date ? new Date(post.data.date) : undefined,
    })),
  });
}
