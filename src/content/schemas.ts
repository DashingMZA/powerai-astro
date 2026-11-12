// Shared Zod schemas for every PowerAI Astro content collection.
//
// This module is the SINGLE source of truth for content validation:
// - `src/content.config.ts` imports these schemas into `defineCollection()`.
// - `scripts/generate-sitepins-schema.mjs` converts them with
//   `z.toJSONSchema()` into the `.sitepins/schema/*.json` mirror, so the
//   Sitepins/Sketivo mirror can never drift from the real validation.
//
// Rules followed here:
// - Every field that exists in `src/content/**` today validates; no existing
//   frontmatter value is changed by these schemas (values are preserved
//   verbatim — see the frontmatter fixes, if any, in the commit history).
// - Entry-specific fields are optional because each collection also holds a
//   `-index.md` list page that does not carry them (e.g. blog `-index.md`
//   has no `date`/`category`/`author`; case-studies `-index.md` has no
//   `category`; careers `-index.md` has no `job_info`).
// - Zod strips unknown keys by default, so a typo'd frontmatter key fails
//   loudly by disappearing instead of silently passing through.
// - Dates use `z.coerce.date()` so ISO strings and YAML dates both pass.
// - `draft` / `featured` / `noindex` default to `false` (explicit opt-in).
// - `toc` / `readingTime` are DERIVED at render time (see
//   `src/lib/utils/readingTime.ts` and `PostSingle.astro`) and are NOT
//   stored in frontmatter — do not add them to any schema.
// - Case-study `results` / `challenge` / `solution` and career
//   `responsibilities` / `requirements` exist as schema fields ONLY. They
//   are optional and no values are invented for them; the narrative for
//   case studies lives in the Markdown body.

import { z } from "astro/zod";

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** A call-to-action button. `enable` is optional; when omitted the button
 *  is treated as enabled by the templates that check `button?.enable`. */
export const buttonSchema = z.object({
  enable: z.boolean().optional(),
  label: z.string(),
  link: z.string(),
});

/** Page header block used by `-index.md` list pages and single pages. */
export const pageHeaderSchema = z.object({
  badge: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  button_dark: buttonSchema.nullable().optional(),
  button_primary: buttonSchema.nullable().optional(),
  button_secondary: buttonSchema.nullable().optional(),
});

/** SEO fields shared by every routable collection. `meta_title` falls back
 *  to `title` at render time; `canonical` is an absolute URL when set. */
export const seoFields = {
  meta_title: z.string().optional(),
  canonical: z.string().optional(),
  noindex: z.boolean().default(false),
  og_image: z.string().optional(),
  og_description: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
};

// ---------------------------------------------------------------------------
// Authors (NEW collection — schema only, no author files exist yet)
// ---------------------------------------------------------------------------
//
// There is no `src/content/authors/` content today: blog posts carry an
// inline `author: { name, avatar, designation }` object instead (see
// `blogAuthorSchema` below). This collection is defined so Sitepins and
// future work can move authors to real files WITHOUT inventing people:
// do not create author files for the demo names in blog frontmatter
// (John Doe, Jane Smith, …) — those are template placeholder names.
// When author files are created, blog `author.slug` / `authors[]` link to
// them by filename slug. Until then the collection is empty (the directory
// holds only a `.gitkeep`) and `blog.author` remains the live author shape.

export const authorSocialSchema = z.object({
  name: z.string(),
  icon: z.string().optional(),
  link: z.string(),
});

export const authorsSchema = z.object({
  /** Display name. This is the author's identity; `title` is not used. */
  name: z.string(),
  /** Filename slug, e.g. `jane-smith`. Defaults to the file name. */
  slug: z.string().optional(),
  /** Short biography (also accepted as `description` by Sitepins). */
  bio: z.string().optional(),
  description: z.string().optional(),
  /** Avatar / portrait. `avatar` and `image` are aliases; prefer `avatar`. */
  avatar: z.string().optional(),
  image: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  /** Job title, e.g. "AI Researcher". Mirrors blog `author.designation`. */
  job_title: z.string().optional(),
  designation: z.string().optional(),
  organization: z.string().optional(),
  socials: z.array(authorSocialSchema).optional(),
  draft: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Categories / Tags (NEW collections — schema only, no files exist yet)
// ---------------------------------------------------------------------------
//
// Like authors, these collections are defined for future use and are
// currently empty (directories hold only a `.gitkeep`). Blog posts keep
// validated free-text `category: string` and `tags: string[]` fields until
// category/tag files exist; at that point the strings become slugs that
// resolve against these collections. Do not invent category/tag files.

export const categoriesSchema = z.object({
  name: z.string(),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  draft: z.boolean().default(false),
});

export const tagsSchema = z.object({
  name: z.string(),
  slug: z.string().optional(),
  description: z.string().optional(),
  draft: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

/** Inline author, kept for backward compatibility with all 20 existing
 *  posts. When the `authors` collection gains files, prefer `slug` /
 *  `authors[]` (filename slugs into `src/content/authors/`) and keep this
 *  object only as a render-time fallback. */
export const blogAuthorSchema = z.object({
  name: z.string(),
  avatar: z.string().optional(),
  designation: z.string().optional(),
  /** Slug of the matching `authors` collection entry, when one exists. */
  slug: z.string().optional(),
});

export const blogSchema = z.object({
  title: z.string(),
  ...seoFields,
  description: z.string().optional(),
  /** Short excerpt for cards/feeds. Falls back to `description`. */
  excerpt: z.string().optional(),
  /** Custom URL slug. Routing still uses the filename; a set `slug` is
   *  reserved for future custom routing and is NOT wired up yet. */
  slug: z.string().optional(),
  date: z.coerce.date().optional(),
  updated: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  author: blogAuthorSchema.optional(),
  /** Slugs of `authors` collection entries (multi-author posts). */
  authors: z.array(z.string()).default([]),
  /** Free-text category until `categories` collection files exist. */
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  featured: z.boolean().default(false),
  /** Slugs (filenames) of related posts, used by PostSingle.astro. */
  related: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// Case studies
// ---------------------------------------------------------------------------

export const caseStudiesSchema = z.object({
  title: z.string(),
  ...seoFields,
  description: z.string().optional(),
  image: z.string().optional(),
  logo: z.string().optional(),
  date: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
  /** Added 2026-11-12: previously stripped by Zod, which broke the
   *  "same category first" ordering in `case-studies/[single].astro`. */
  category: z.string().optional(),
  /** Client / company name. Optional; no values invented. */
  client: z.string().optional(),
  company: z.string().optional(),
  /** Structured narrative fields. Optional; the existing narrative lives
   *  in the Markdown body and is NOT duplicated into frontmatter. */
  summary: z.string().optional(),
  challenge: z.string().optional(),
  solution: z.string().optional(),
  results: z.union([z.string(), z.array(z.string())]).optional(),
  review_video: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Careers
// ---------------------------------------------------------------------------
//
// The live shape is `job_info` (consumed by `OpenPositions.tsx` and
// `careers/[single].astro`). The task-level names map onto it as follows:
//   department -> job_info.department   location -> job_info.location
//   type       -> job_info.employ_type  closing date -> job_info.deadline
// `responsibilities` / `requirements` / `apply_url` / `active` are new
// optional fields; the existing detail lives in the Markdown body
// ("Responsibilities" / "Qualifications" / "Benefits" sections).

export const careersSchema = z.object({
  title: z.string(),
  ...seoFields,
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  job_info: z
    .object({
      employ_type: z.string(),
      experience: z.string().optional(),
      salary_range: z.string().optional(),
      location: z.string(),
      department: z.string(),
      /** Closing date, kept as a plain "YYYY-MM-DD" string (verbatim). */
      deadline: z.string().optional(),
    })
    .optional(),
  responsibilities: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  /** External application URL. Empty today — the apply form posts to
   *  `config.params.apply_form_action` ("#", dead form, out of scope). */
  apply_url: z.string().optional(),
  /** Whether the role is currently open. No deadline filtering exists;
   *  all 8 listed jobs have 2025 deadlines and still render. */
  active: z.boolean().optional(),
  // `-index.md` list-page fields:
  page_header: pageHeaderSchema.optional(),
  open_positions: z
    .object({
      enable: z.boolean().optional(),
      badge: z.string().optional(),
      title: z.string().optional(),
    })
    .optional(),
  gallery: z
    .object({
      enable: z.boolean().optional(),
      badge: z.string().optional(),
      title: z.string().optional(),
      images: z.array(z.string()).optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export const integrationsSchema = z.object({
  title: z.string(),
  ...seoFields,
  description: z.string().optional(),
  image: z.string().optional(),
  /** Icon / logo path (e.g. `/images/integrations/Discord.svg`). */
  icon: z.string().optional(),
  logo: z.string().optional(),
  category: z.string().optional(),
  /** Vendor homepage. Optional; no URLs invented. */
  website: z.string().optional(),
  /** Docs URL. Optional; no URLs invented. */
  docs_url: z.string().optional(),
  status: z.enum(["available", "beta", "coming-soon"]).optional(),
  draft: z.boolean().default(false),
  featured: z.boolean().optional(),
  page_header: pageHeaderSchema.optional(),
});

// ---------------------------------------------------------------------------
// Sections (homepage building blocks)
// ---------------------------------------------------------------------------
//
// Sections are heterogeneous: each file carries only the fields its
// component reads, so every field is optional. The shapes below mirror
// exactly what the components consume (`CallToAction`, `EssentialFeatures`,
// `KeyFeatures`, `FAQ`, `Integration`, `Pricing`, `Statistics`,
// `Testimonials`, `TrustedClients`, `WhyChooseUs` / `OurValue`).

export const sectionFeatureSchema = z.object({
  title: z.string(),
  content: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  track: z.string().optional(),
  bullet_points: z.array(z.string()).optional(),
});

export const pricingPlanSchema = z.object({
  name: z.string(),
  content: z.string().optional(),
  highlighted: z.boolean().optional(),
  price: z
    .object({
      monthly: z.object({
        number: z.number(),
        prefix: z.string().optional(),
        suffix: z.string().optional(),
      }),
      yearly: z.object({
        number: z.number(),
        prefix: z.string().optional(),
        suffix: z.string().optional(),
      }),
    })
    .optional(),
  features: z
    .array(
      z.object({
        value: z.string(),
        include: z.boolean().optional(),
      }),
    )
    .optional(),
  button: buttonSchema.optional(),
});

export const sectionsSchema = z.object({
  enable: z.boolean().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  badge: z.string().optional(),
  button: buttonSchema.optional(),
  features: z.array(sectionFeatureSchema).optional(),
  feature_list: z.array(sectionFeatureSchema).optional(),
  faq_list: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .optional(),
  list: z.array(z.string()).optional(),
  track: z
    .object({
      top_note: z.string().optional(),
      title: z.string().optional(),
      bottom_note: z.string().optional(),
      link: z.string().optional(),
    })
    .optional(),
  stats_list: z
    .array(
      z.object({
        label: z.string(),
        value: z.object({
          prefix: z.string().optional(),
          number: z.number(),
          suffix: z.string().optional(),
        }),
      }),
    )
    .optional(),
  testimonials: z
    .array(
      z.object({
        name: z.string(),
        avatar: z.string().optional(),
        content: z.string().optional(),
        company: z
          .object({
            logo: z.string().optional(),
            name: z.string().optional(),
            link: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        logo: z.string(),
        link: z.string().optional(),
      }),
    )
    .optional(),
  pricing_plans: z.array(pricingPlanSchema).optional(),
  offer_yearly: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Homepage / About / Changelog / Contact / Features / Pricing / Pages
// ---------------------------------------------------------------------------

export const homepageSchema = z.object({
  banner: z
    .object({
      title: z.string(),
      content: z.string().optional(),
      badge: z
        .object({
          enable: z.boolean().optional(),
          label: z.string().optional(),
          images: z.array(z.string()).optional(),
        })
        .optional(),
      image: z.string().optional(),
      button_dark: buttonSchema.nullable().optional(),
      button_primary: buttonSchema.nullable().optional(),
    })
    .optional(),
});

export const aboutSchema = z.object({
  title: z.string(),
  ...seoFields,
  description: z.string().optional(),
  image: z.string().optional(),
  draft: z.boolean().default(false),
  page_header: pageHeaderSchema.optional(),
  who_we_are: z
    .object({
      title: z.string().optional(),
      badge: z.string().optional(),
      subtitle: z.string().optional(),
      image: z.string().optional(),
    })
    .optional(),
  what_our_goals: z
    .object({
      badge: z.string().optional(),
      title: z.string().optional(),
      image: z.string().optional(),
      mission: z
        .object({
          title: z.string().optional(),
          content: z.string().optional(),
          icon: z.string().optional(),
        })
        .optional(),
      vision: z
        .object({
          title: z.string().optional(),
          content: z.string().optional(),
          icon: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  our_team: z
    .object({
      badge: z.string().optional(),
      title: z.string().optional(),
      team_list: z
        .array(
          z.object({
            name: z.string(),
            position: z.string().optional(),
            image: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export const changelogSchema = z.object({
  title: z.string(),
  ...seoFields,
  description: z.string().optional(),
  image: z.string().optional(),
  draft: z.boolean().default(false),
  page_header: pageHeaderSchema.optional(),
  changelog_list: z
    .array(
      z.object({
        version: z.string(),
        date: z.string(),
        title: z.string(),
        description: z.string().optional(),
        author: z.string().optional(),
        time: z.string().optional(),
        categories: z
          .array(
            z.object({
              name: z.string(),
              items: z
                .array(
                  z.object({
                    icon: z.string(),
                    text: z.string(),
                  }),
                )
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export const contactSchema = z.object({
  title: z.string(),
  ...seoFields,
  description: z.string().optional(),
  image: z.string().optional(),
  draft: z.boolean().default(false),
  page_header: pageHeaderSchema.optional(),
  contact_info: z
    .object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
});

export const featuresSchema = z.object({
  title: z.string(),
  ...seoFields,
  description: z.string().optional(),
  image: z.string().optional(),
  draft: z.boolean().default(false),
  page_header: pageHeaderSchema.optional(),
});

export const pricingSchema = z.object({
  title: z.string(),
  ...seoFields,
  description: z.string().optional(),
  image: z.string().optional(),
  draft: z.boolean().default(false),
  page_header: pageHeaderSchema.optional(),
  pricing_table: z
    .object({
      title: z.string().optional(),
      features: z
        .array(
          z.object({
            name: z.string(),
            key: z.string(),
          }),
        )
        .optional(),
      plans: z
        .array(
          z.object({
            name: z.string(),
            highlighted: z.boolean().optional(),
            features: z
              .array(
                z.object({
                  key: z.string(),
                  value: z.string(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export const pagesSchema = z.object({
  title: z.string(),
  ...seoFields,
  description: z.string().optional(),
  image: z.string().optional(),
  draft: z.boolean().default(false),
  page_header: pageHeaderSchema.optional(),
});

// ---------------------------------------------------------------------------
// Registry: collection name -> schema, used by content.config.ts and by
// scripts/generate-sitepins-schema.mjs (which also needs the glob base
// directory per collection).
// ---------------------------------------------------------------------------

export const collectionSchemas = {
  homepage: homepageSchema,
  about: aboutSchema,
  blog: blogSchema,
  authors: authorsSchema,
  categories: categoriesSchema,
  tags: tagsSchema,
  careers: careersSchema,
  "case-studies": caseStudiesSchema,
  changelog: changelogSchema,
  contact: contactSchema,
  features: featuresSchema,
  integrations: integrationsSchema,
  pages: pagesSchema,
  pricing: pricingSchema,
  sections: sectionsSchema,
} as const;

export const collectionDirs = {
  homepage: "src/content/homepage",
  about: "src/content/about",
  blog: "src/content/blog",
  authors: "src/content/authors",
  categories: "src/content/categories",
  tags: "src/content/tags",
  careers: "src/content/careers",
  "case-studies": "src/content/case-studies",
  changelog: "src/content/changelog",
  contact: "src/content/contact",
  features: "src/content/features",
  integrations: "src/content/integrations",
  pages: "src/content/pages",
  pricing: "src/content/pricing",
  sections: "src/content/sections",
} as const;
