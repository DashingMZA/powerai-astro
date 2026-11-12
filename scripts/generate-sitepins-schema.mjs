// Generates `.sitepins/schema/*.json` (JSON Schema) from the real Zod
// schemas in `src/content/schemas.ts` — the mirror is derived, never
// hand-edited, so it cannot drift from validation.
//
// Usage: `node scripts/generate-sitepins-schema.mjs`
// (Node 24 runs the `.ts` schemas module via built-in type stripping.)
//
// Output per collection `<name>.json`:
//   $schema / $id / title / description — JSON Schema (draft 2020-12)
//   x-sitepins — Sitepins/Sketivo metadata: collection name, content path,
//     file type, frontmatter type, and the collection's index file.
// The JSON Schema body itself comes from `z.toJSONSchema()` (zod v4) with
// no post-processing except a human-readable description.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  collectionDirs,
  collectionSchemas,
} from "../src/content/schemas.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, ".sitepins", "schema");
mkdirSync(outDir, { recursive: true });

const descriptions = {
  homepage: "Homepage banner. Single file: src/content/homepage/-index.md.",
  about: "About page blocks (page header, who-we-are, goals, team). Single file: src/content/about/-index.md.",
  blog: "Blog posts. One file per post in src/content/blog/. Routing uses the filename; `slug` is reserved for future custom routing.",
  authors:
    "Authors. Schema only — no author files exist yet. Do not invent authors; blog posts keep their inline `author` object until author files are created.",
  categories:
    "Categories. Schema only — no category files exist yet. Blog `category` stays a free-text string until category files exist.",
  tags: "Tags. Schema only — no tag files exist yet. Blog `tags` stays a string array until tag files exist.",
  careers:
    "Job listings. One file per role in src/content/careers/ plus -index.md. Live shape is `job_info`; see src/content/schemas.ts for the field mapping.",
  "case-studies":
    "Case studies. One file per study in src/content/case-studies/ plus -index.md. Narrative lives in the Markdown body; frontmatter `challenge`/`solution`/`results` are optional structured fields only.",
  changelog:
    "Changelog entries. Single file: src/content/changelog/-index.md.",
  contact: "Contact page blocks. Single file: src/content/contact/-index.md.",
  features: "Features page blocks. Single file: src/content/features/-index.md.",
  integrations:
    "Integrations. One file per integration in src/content/integrations/ plus -index.md.",
  pages:
    "Regular pages (elements, privacy-policy, terms-of-service). One file per page in src/content/pages/.",
  pricing: "Pricing page blocks. Single file: src/content/pricing/-index.md.",
  sections:
    "Homepage building blocks (CTA, features, FAQ, pricing, stats, testimonials, …). One file per section in src/content/sections/. Each file carries only the fields its component reads.",
};

const indexFiles = {
  homepage: "src/content/homepage/-index.md",
  about: "src/content/about/-index.md",
  blog: "src/content/blog/post-1.md",
  authors: "src/content/authors/<slug>.md",
  categories: "src/content/categories/<slug>.md",
  tags: "src/content/tags/<slug>.md",
  careers: "src/content/careers/backend-developer.md",
  "case-studies": "src/content/case-studies/case-study-1.md",
  changelog: "src/content/changelog/-index.md",
  contact: "src/content/contact/-index.md",
  features: "src/content/features/-index.md",
  integrations: "src/content/integrations/discord.md",
  pages: "src/content/pages/privacy-policy.md",
  pricing: "src/content/pricing/-index.md",
  sections: "src/content/sections/call-to-action.md",
};

// `z.coerce.date()` has no JSON Schema representation, so zod emits `{}` for
// it. These fields are real dates (ISO strings / YAML dates) — restore the
// proper type here so the mirror stays accurate.
const dateFieldOverrides = {
  blog: ["date", "updated"],
  "case-studies": ["date"],
  careers: ["date"],
};

for (const [name, schema] of Object.entries(collectionSchemas)) {
  const jsonSchema = z.toJSONSchema(schema, {
    unrepresentable: "any",
    io: "input",
  });
  for (const field of dateFieldOverrides[name] ?? []) {
    if (jsonSchema.properties?.[field]) {
      jsonSchema.properties[field] = { type: "string", format: "date-time" };
    }
  }
  const doc = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://powerai.csofts.tech/.sitepins/schema/${name}.json`,
    title: name,
    description: descriptions[name],
    "x-sitepins": {
      name,
      file: indexFiles[name],
      fileType: "md",
      fmType: "yaml",
      contentPath: collectionDirs[name],
    },
    ...jsonSchema,
  };
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(doc, null, 2) + "\n");
  console.log(`wrote .sitepins/schema/${name}.json`);
}
