import config from "@/config/config.json";

/** Site origin with no trailing slash, from config (never hardcoded). */
export const siteUrl: string = String(config.site.base_url || "").replace(
  /\/+$/,
  "",
);

/** True for absolute http(s) / protocol-relative URLs — e.g. R2 media URLs. */
export function isAbsoluteUrl(url: string | undefined | null): boolean {
  return !!url && /^(?:https?:)?\/\//i.test(url);
}

/**
 * Resolve a path or URL to an absolute URL. Absolute URLs are returned
 * verbatim — never prepend the site origin (that produced
 * `https://powerai.csofts.techhttps://media.csofts.tech/...` before).
 */
export function toAbsoluteUrl(
  url: string | undefined | null,
): string | undefined {
  if (!url) return undefined;
  if (isAbsoluteUrl(url)) return url;
  return `${siteUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

/** Absolute canonical for a page: frontmatter override wins, else pathname. */
export function canonicalUrl(
  pathname: string,
  override?: string | null,
): string {
  if (override) return toAbsoluteUrl(override) ?? `${siteUrl}${pathname}`;
  return `${siteUrl}${pathname}`;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

type JsonLdObject = Record<string, unknown>;

function isoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Organization + WebSite — homepage only. */
export function organizationJsonLd(): JsonLdObject[] {
  const name = String(config.site.logo_text || "Power AI");
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name,
      url: `${siteUrl}/`,
      logo: toAbsoluteUrl(config.site.logo),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name,
      url: `${siteUrl}/`,
    },
  ];
}

/** BreadcrumbList — only when the page actually renders breadcrumbs. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: toAbsoluteUrl(item.href) } : {}),
    })),
  };
}

export interface ArticleInput {
  title: string;
  description?: string;
  image?: string;
  canonical: string;
  datePublished?: unknown;
  dateModified?: unknown;
  authorName?: string;
  authorDesignation?: string;
  category?: string;
  /** Schema type: "BlogPosting" for blog posts, "Article" otherwise. */
  type?: "BlogPosting" | "Article";
}

/** Article / BlogPosting from validated frontmatter only — no invented data. */
export function articleJsonLd(input: ArticleInput): JsonLdObject {
  const published = isoDate(input.datePublished);
  const image = toAbsoluteUrl(input.image);
  return {
    "@context": "https://schema.org",
    "@type": input.type ?? "BlogPosting",
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    ...(image ? { image } : {}),
    ...(published ? { datePublished: published } : {}),
    ...((isoDate(input.dateModified) ?? published)
      ? { dateModified: isoDate(input.dateModified) ?? published }
      : {}),
    ...(input.authorName
      ? {
          author: {
            "@type": "Person",
            name: input.authorName,
            ...(input.authorDesignation
              ? { jobTitle: input.authorDesignation }
              : {}),
          },
        }
      : {}),
    ...(input.category ? { articleSection: input.category } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": input.canonical },
    publisher: {
      "@type": "Organization",
      name: String(config.site.logo_text || "Power AI"),
      logo: toAbsoluteUrl(config.site.logo),
    },
  };
}

export interface JobInput {
  title: string;
  description?: string;
  canonical: string;
  datePosted?: unknown;
  /** Application deadline from frontmatter (`job_info.deadline`). */
  deadline?: unknown;
  location?: string;
  employmentType?: string;
  /** Raw salary-range string from frontmatter — NOT parsed into numbers. */
  salaryRange?: string;
}

/**
 * JobPosting ONLY for a currently-open role: requires a real title,
 * description and location, and a deadline that is still in the future.
 * Returns null for expired / undated roles — every career in the repo
 * today has a deadline in May–June 2025, so none qualifies yet.
 * Salary is deliberately omitted: the frontmatter range string
 * ("$80,000 - $110,000") cannot be turned into valid structured
 * salary data without inventing numbers.
 */
export function jobPostingJsonLd(input: JobInput): JsonLdObject | null {
  const deadline = isoDate(input.deadline);
  if (!input.title || !input.description || !input.location) return null;
  if (!deadline) return null;
  if (new Date(deadline).getTime() < Date.now()) return null;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: input.title,
    description: input.description,
    url: input.canonical,
    datePosted: isoDate(input.datePosted) ?? deadline,
    validThrough: deadline,
    employmentType: input.employmentType || "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: String(config.site.logo_text || "Power AI"),
      sameAs: `${siteUrl}/`,
    },
    jobLocation: {
      "@type": "Place",
      address: input.location,
    },
  };
}

/** Serialize one JSON-LD block; `</script>` inside values is escaped. */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  const payload = Array.isArray(data)
    ? data.length === 1
      ? data[0]
      : { "@context": "https://schema.org", "@graph": data }
    : data;
  return JSON.stringify(payload).replace(/<\/script/gi, "<\\/script");
}
