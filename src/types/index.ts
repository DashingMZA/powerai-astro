import type { PricingTableData } from "@/components/PricingTable";

export type RegularPage = {
  frontmatter: {
    title: string;
    image?: string;
    description?: string;
    meta_title?: string;
    layout?: string;
    draft?: boolean;
    page_header: PageHeaderType;
    gallery?: GalleryType;
    open_positions?: {
      enable: boolean;
      badge: string;
      title: string;
    };
  };
  content: string;
  slug?: string;
};

export type Post = {
  frontmatter: {
    title: string;
    meta_title?: string;
    description?: string;
    excerpt?: string;
    slug?: string;
    image?: string;
    category: string;
    categories?: string[];
    tags?: string[];
    author: {
      name: string;
      avatar: string;
      designation?: string;
      slug?: string;
    };
    authors?: string[];
    date?: string;
    updated?: string;
    draft?: boolean;
    featured?: boolean;
    related?: string[];
    canonical?: string;
    noindex?: boolean;
    og_image?: string;
    og_description?: string;
    twitter_title?: string;
    twitter_description?: string;
  };
  slug?: string;
  content?: string;
};

/** Author file shape (`src/content/authors/`). No author files exist yet —
 *  see `src/content/schemas.ts`. Blog posts still use the inline author
 *  object on `Post` above. */
export type Author = {
  name: string;
  slug?: string;
  bio?: string;
  description?: string;
  avatar?: string;
  image?: string;
  email?: string;
  website?: string;
  job_title?: string;
  designation?: string;
  organization?: string;
  socials?: { name: string; icon?: string; link: string }[];
  draft?: boolean;
};

export type Category = {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  draft?: boolean;
};

export type Tag = {
  name: string;
  slug?: string;
  description?: string;
  draft?: boolean;
};

export type CaseStudy = {
  frontmatter: {
    title: string;
    meta_title?: string;
    description?: string;
    image?: string;
    logo?: string;
    date?: string;
    draft?: boolean;
    featured?: boolean;
    review_video?: string;
    /** Restored 2026-11-12: was stripped by the old schema, breaking the
     *  same-category ordering in `case-studies/[single].astro`. */
    category?: string;
    client?: string;
    company?: string;
    summary?: string;
    challenge?: string;
    solution?: string;
    results?: string | string[];
    canonical?: string;
    noindex?: boolean;
    og_image?: string;
    og_description?: string;
  };
  slug?: string;
  content?: string;
};

export type Career = {
  frontmatter: {
    title: string;
    meta_title?: string;
    description?: string;
    date?: string;
    draft?: boolean;
    job_info: {
      employ_type: string;
      experience: string;
      salary_range: string;
      location: string;
      department: string;
      deadline?: string;
    };
    responsibilities?: string[];
    requirements?: string[];
    apply_url?: string;
    active?: boolean;
  };
  slug?: string;
  content?: string;
};

export type CallToAction = {
  enable?: boolean;
  title: string;
  description: string;
  button: Button;
};

export type Button = {
  enable: boolean;
  label: string;
  link: string;
};

export type LogoMarqueeType = {
  enable: boolean;
  title: string;
  items: {
    name: string;
    logo: string;
    link?: string;
  }[];
};

export type FAQType = {
  question: string;
  answer: string;
};

export type PageHeaderType = {
  enable?: boolean;
  title: string;
  subtitle?: string;
  badge: string;
  button_primary?: Button;
  button_secondary?: Button;
};

export type PricingType = {
  name: string;
  content?: string;
  highlighted?: boolean;
  price?: {
    monthly: {
      number: number;
      prefix?: string;
      suffix?: string;
    };
    yearly: {
      number: number;
      prefix?: string;
      suffix?: string;
    };
  };
  features?: {
    value: string;
    include?: boolean;
  }[];
  button?: Button;
};

export type IntegrationType = {
  frontmatter: {
    title: string;
    meta_title?: string;
    description?: string;
    image?: string;
    draft?: boolean;
    category: string;
    icon: string;
    logo?: string;
    website?: string;
    docs_url?: string;
    status?: "available" | "beta" | "coming-soon";
    page_header: PageHeaderType;
  };
  slug?: string;
  content?: string;
};

export type ChangelogItemType = {
  version: string;
  date: string;
  title: string;
  description: string;
  author: string;
  time: string;
  categories: {
    name: string;
    items: {
      icon: string;
      text: string;
    }[];
  }[];
};

export type GalleryType = {
  enable: boolean;
  badge: string;
  title: string;
  images: string[];
};

// ---------------------------------------------------------------------------
// Legacy `{ frontmatter, slug, content }` shape (canonical parser)
// ---------------------------------------------------------------------------
//
// `src/lib/contentParser.ts` returns this shape for list/index pages and
// for `PostSingle.astro`. The frontmatter is the Zod-validated collection
// data reshaped: every field a template actually reads is declared here,
// so components can take a real type instead of `any`. Fields are
// optional unless the templates read them unguarded (e.g. `title`, which
// every `-index.md` file carries and every page destructures).

/** One item of a section `features` / `feature_list` array. */
export type SectionFeature = {
  title: string;
  content?: string;
  image?: string;
  icon?: string;
  track?: string;
  bullet_points?: string[];
};

/** Homepage banner (`homepage/-index.md`), consumed by `Hero.astro`. */
export type HeroData = {
  title: string;
  content?: string;
  image: string;
  badge?: {
    enable?: boolean;
    label?: string;
    images: string[];
  };
  button_dark?: Button | null;
  button_primary?: Button | null;
};

/** `what_our_goals` block on the About page. */
export type WhatOurGoalsData = {
  badge?: string;
  title: string;
  image?: string;
  mission: { title: string; content: string; icon: string };
  vision: { title: string; content: string; icon: string };
};

/** `our_team` block on the About page. */
export type OurTeamData = {
  badge?: string;
  title: string;
  team_list: { name: string; position?: string; image?: string }[];
};

/** Page-header shape as the `PageHeader` partial consumes it. `badge` is
 *  optional here (unlike `PageHeaderType`): `about/-index.md` has no
 *  badge, and the partial already guards it. */
export type PageHeaderProps = {
  title: string;
  badge?: string;
  subtitle?: string;
  button_primary?: Button;
  button_dark?: Button;
};

/** Frontmatter of a legacy parser entry. */
export type LegacyFrontmatter = {
  title: string;
  meta_title?: string;
  description?: string;
  excerpt?: string;
  image?: string;
  slug?: string;
  url?: string;
  date?: string | Date;
  updated?: string | Date;
  draft?: boolean;
  featured?: boolean;
  category?: string;
  categories?: string[];
  tags?: string[];
  author?: Post["frontmatter"]["author"];
  authors?: string[];
  related?: string[];
  canonical?: string;
  noindex?: boolean;
  og_image?: string;
  og_description?: string;
  twitter_title?: string;
  twitter_description?: string;
  enable?: boolean;
  badge?: string;
  subtitle?: string;
  button?: Button;
  features?: SectionFeature[];
  feature_list?: SectionFeature[];
  faq_list?: FAQType[];
  pricing_plans?: PricingType[];
  offer_yearly?: string;
  banner?: HeroData;
  page_header?: PageHeaderProps;
  gallery?: GalleryType;
  open_positions?: { enable?: boolean; badge: string; title: string };
  changelog_list?: ChangelogItemType[];
  who_we_are?: {
    title?: string;
    badge?: string;
    subtitle?: string;
    image?: string;
  };
  what_our_goals?: WhatOurGoalsData;
  our_team?: OurTeamData;
  job_info?: Career["frontmatter"]["job_info"];
  responsibilities?: string[];
  requirements?: string[];
  apply_url?: string;
  active?: boolean;
  logo?: string;
  icon?: string;
  website?: string;
  docs_url?: string;
  status?: "available" | "beta" | "coming-soon";
  summary?: string;
  challenge?: string;
  solution?: string;
  results?: string | string[];
  review_video?: string;
  pricing_table?: PricingTableData;
  contact_info?: {
    title?: string;
    subtitle?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
};

/** One legacy parser entry: `{ frontmatter, slug, content }`. */
export type LegacyPage = {
  frontmatter: LegacyFrontmatter;
  slug?: string;
  content?: string;
};

/** Frontmatter of a `-index.md` list page: a header is always present. */
export type IndexFrontmatter = LegacyFrontmatter & {
  page_header: PageHeaderProps;
};

/** Frontmatter of `homepage/-index.md`: a banner is always present. */
export type HomepageFrontmatter = LegacyFrontmatter & {
  banner: HeroData;
};

/** Frontmatter of `about/-index.md`. */
export type AboutFrontmatter = LegacyFrontmatter & {
  page_header: PageHeaderProps;
  what_our_goals: WhatOurGoalsData;
  our_team: OurTeamData;
};
