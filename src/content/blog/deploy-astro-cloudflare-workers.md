---
title: "Deploying Astro Websites to Cloudflare Workers: A Step-by-Step Guide"
meta_title: "Deploy Astro to Cloudflare Workers"
description: "Deploy an Astro website to Cloudflare Workers step by step: adapter setup, bindings, environment variables, static assets, and troubleshooting common errors."
date: 2026-11-14
image: "/images/blog/deploy-astro-cloudflare-workers.png"
og_image: "/images/blog/deploy-astro-cloudflare-workers-og.png"
category: "DevOps"
tags: ["Astro", "Cloudflare", "Deployment", "Workers"]
author:
  name: "John Doe"
  designation: "Software Engineer"
  avatar: "/images/avatar.png"
featured: false
draft: false
---

Cloudflare Workers puts your website on the edge — close to whoever is visiting, with no server to provision or keep running. For an Astro site that makes a natural pairing: Astro already renders pages to HTML at build time, and Workers can serve that HTML from the nearest edge location, while also running your on-demand pages and API routes in the same Worker when you need them.

One honest note before the steps begin: **this site itself runs on Vercel, not on Cloudflare Workers.** Its `astro.config.mjs` uses the `@astrojs/vercel` adapter, and its live deployment is a Vercel project. This article describes the Cloudflare path — the adapter setup, the configuration, and the deployment commands — verified against the current Astro and Cloudflare documentation. No live Workers deployment was run for this article, so treat the steps as the documented path, and verify the live URL yourself after your first deploy. The configuration below is the one the docs describe; the one difference from this site's own setup is called out where it matters.

## Two Paths: Static Assets or On-Demand Rendering

The first decision is which kind of site you are deploying.

**A fully static site needs no adapter at all.** If every page is prerendered at build time — a blog, a marketing site, documentation — the build output is a folder of HTML, CSS, and images. Cloudflare Workers serves that folder as static assets, and the Worker itself never runs your code. You point Wrangler at the output directory and deploy.

**A site with on-demand rendering needs the Cloudflare adapter.** If some pages render per request, or you have API routes, server islands, or form handlers, that code has to run somewhere — and on Workers, it runs inside the Worker. The `@astrojs/cloudflare` adapter compiles your server code into a Worker entrypoint and splits the build into static assets plus the Worker that renders the rest. Install the adapter with one command, and it makes the configuration changes for you:

```bash
npx astro add cloudflare
```

That command installs `@astrojs/cloudflare` and updates `astro.config.mjs`. By default it sets the build output to `output: "server"`, which means every page renders on demand unless you opt it back to static. That default suits an application; it does not suit a mostly-static site, where the better choice is to keep the default static output and opt individual routes into on-demand rendering instead:

```js
// astro.config.mjs — keep most pages static, render some on demand
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  adapter: cloudflare(),
});
```

```astro
---
// src/pages/dashboard.astro — this page renders on every request
export const prerender = false;
---
```

With the default static output, only the pages that export `prerender = false` run in the Worker; everything else builds to HTML and is served as a static asset. With `output: "server"`, the default flips: every page renders on demand, and the static ones are the ones you mark with `export const prerender = true`. Pick the default that matches the majority of your pages, and mark the exceptions. The most common deployment mistake in this area is adding the adapter but leaving the output mode mismatched with how the pages are written — the build succeeds, and then the dynamic routes fail on Cloudflare because nothing is running to render them.

This site's own configuration shows the static side of the choice. It uses the Vercel adapter with the default static output, and only the API routes under `src/pages/api/` opt out of prerendering to run as serverless functions. The same shape works on Workers: static pages as assets, dynamic routes in the Worker, and the boundary between them explicit in the code.

## Setting Up the Project

Start from a working Astro site — one that builds cleanly with `npx astro build` before any deployment work begins.

### 1. Install Wrangler

Wrangler is Cloudflare's command-line tool: it deploys, previews locally, manages bindings, and reads your logs. Install it as a development dependency:

```bash
npm install wrangler@latest --save-dev
```

Then sign in once, which opens the Cloudflare dashboard in your browser and stores a token locally:

```bash
npx wrangler login
```

For CI deployments you will use an API token instead — the dashboard can generate one with Workers permissions — but for a first deploy, `wrangler login` is the simplest path.

### 2. Install the adapter (on-demand sites only)

If your site renders anything on demand, run the installer from the previous section:

```bash
npx astro add cloudflare
```

Check what it changed. Your `astro.config.mjs` should now import the adapter and list it, and the output mode should match your intent:

```js
// astro.config.mjs — on-demand rendering with the Cloudflare adapter
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
});
```

If your site is fully static, skip this step entirely. There is no adapter to install and no server code to compile — the static assets path below is the whole deployment.

### 3. Create the Wrangler configuration

Running `astro add cloudflare` creates a Wrangler configuration file for you. If you are deploying a static site without the adapter, create it yourself as `wrangler.jsonc` in the project root. A static site needs only three fields:

```jsonc
{
  "name": "my-astro-app",
  "compatibility_date": "2026-11-14",
  "assets": {
    "directory": "./dist",
  },
}
```

`name` is the Worker's name and becomes part of its default `workers.dev` address. `compatibility_date` pins the Workers runtime behaviour to the date you deploy — set it to the day you first deploy, and update it deliberately rather than letting it drift, because it controls which runtime behaviours your Worker gets. `assets.directory` is where the built site lives: `./dist` for a standard Astro build.

For a site with the adapter, the shape is similar but the build output is split: static files go to the assets directory and the Worker entrypoint is generated by the adapter. The adapter's documentation describes that split, and the generated configuration reflects it — check the file the installer created rather than writing one from memory.

This site's own `wrangler.jsonc` is a useful real example of the static-assets shape, with one difference that illustrates why the directory matters:

```jsonc
{
  // Cloudflare Workers — Static Assets deployment.
  // NOTE (2026-11-13): the Vercel adapter moved the static client output
  // from dist/ to dist/client, so the assets directory is ./dist/client.
  "name": "powerai-astro",
  "compatibility_date": "2026-11-09",
  "assets": {
    "directory": "./dist/client",
    "not_found_handling": "404-page",
  },
}
```

Because this site builds with the Vercel adapter, its static output lands in `dist/client` rather than `dist` — so the assets directory points there. A site built with the Cloudflare adapter or with no adapter at all puts its output in `dist`, and the config points there instead. The lesson is the same either way: the assets directory must match where your build actually writes files, or the deploy will upload an empty directory and serve nothing. The `not_found_handling: "404-page"` setting is also worth copying: it tells Workers to serve your custom 404 page for unknown paths instead of its default error.

## Bindings: Databases, Storage, and KV

A Worker on its own is stateless. When your on-demand pages need data — a database, a key-value store, a file bucket, a secret — you attach it as a **binding**: a named connection declared in `wrangler.jsonc` that your code reads at request time.

Create the resource first with Wrangler. A D1 database and a KV namespace look like this:

```bash
npx wrangler d1 create astro-app
npx wrangler kv namespace create CACHE
```

Then declare them in `wrangler.jsonc` so the Worker knows about them:

```jsonc
{
  "name": "my-astro-app",
  "compatibility_date": "2026-11-14",
  "assets": { "directory": "./dist" },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "astro-app",
      "database_id": "<the id wrangler printed>",
    },
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "<the id wrangler printed>",
    },
  ],
}
```

The binding name is the property your code reads. In a route that renders on demand, import `env` from the Workers runtime module and use the binding directly:

```ts
// src/pages/api/posts.ts — an on-demand API route
import { env } from "cloudflare:workers";

export async function GET() {
  const { results } = await env.DB.prepare(
    "SELECT title, slug FROM posts ORDER BY created_at DESC LIMIT 10",
  ).all();
  return Response.json(results);
}
```

Three rules govern bindings. First, they are only available to code that runs on request — a route that touches `env.DB` must be on-demand, because a prerendered page has no Worker running to hold the binding. Second, local development works against local copies: with the Cloudflare adapter, `env.DB` points at a local SQLite file and `env.CACHE` at a local store, so you can develop without touching production. Third, bindings are not environment variables — they are typed resources declared in configuration, not pasted into code.

## Environment Variables and Secrets

Configuration that varies between environments — an API base URL, a feature flag, a public key — belongs in `wrangler.jsonc` under `vars`:

```jsonc
{
  "vars": {
    "PUBLIC_API_URL": "https://api.example.com",
  },
}
```

Secrets — API keys, tokens, anything that would be a problem if it leaked — do **not** go in the configuration file, which is committed to the repository. Set them with Wrangler, which stores them encrypted on Cloudflare's side:

```bash
npx wrangler secret put RESEND_API_KEY
```

Wrangler prompts for the value and never prints it back. For local development, a `.dev.vars` file in the project root holds the same values for `wrangler dev` — and that file belongs in `.gitignore`, next to `.env`, never in the repository. The same discipline applies on every host: this site's contact-form credentials live in Vercel's environment settings, not in the code, and the Cloudflare equivalents live in Wrangler secrets.

## Build, Preview, and Deploy

The deployment itself is three commands, in order:

```bash
npx astro build
npx wrangler dev      # preview locally, against local bindings
npx wrangler deploy   # upload assets + Worker, get a live URL
```

`npx astro build` produces the output the Worker will serve — static assets plus, for adapter sites, the Worker bundle. `npx wrangler dev` runs that output locally so you can click through the site and check that on-demand routes, bindings, and assets all behave before anything goes live. `npx wrangler deploy` uploads everything and prints a preview URL on your `workers.dev` subdomain, which is the first thing to open in a private window and check by hand.

This site keeps the same shape as scripts in `package.json`, which is worth copying so nobody has to remember the command order:

```json
{
  "scripts": {
    "deploy:cf-workers": "pnpm run build && wrangler deploy",
    "preview:cf-workers": "pnpm run build && wrangler dev"
  }
}
```

A custom domain comes after the first successful deploy, not before it. In the Cloudflare dashboard, add the domain to the Worker — or, if the domain's DNS is already on Cloudflare, attach it from the Worker's settings. The `workers.dev` URL keeps working as a staging address, which is useful for checking a deploy before the domain propagates. The Astro documentation also describes the CI path: Workers Builds can build and deploy on push, with the build command `npx astro build` and the deploy command `npx wrangler deploy` configured in the dashboard.

One deployment behaviour surprises people coming from Vercel. Workers serves static assets first: a request matching a file in the assets directory is answered from the asset, and only a request matching nothing falls through to the Worker for on-demand rendering. That ordering is why a static site needs no adapter and why a hybrid site's prerendered pages are fast — they never invoke the Worker. So always deploy the build and the Worker together, from the same command, rather than uploading one without the other.

![The Cloudflare deployment pipeline: build, preview, deploy](/images/blog/deploy-astro-cloudflare-workers-diagram-1.png)

_Astro builds the site into static assets plus a Worker bundle; Wrangler previews it locally, then deploys both together to the edge._

## Static Assets, Caching, and the 404 Page

Static assets on Workers are served from Cloudflare's edge cache, which is most of the performance story: the HTML your build produced is already sitting close to the visitor. A few settings make that behaviour deliberate rather than accidental.

**Cache headers.** Cloudflare caches static assets automatically. Fingerprinted assets — files whose names contain a content hash, which Astro and Vite generate for built JavaScript and CSS — can be cached aggressively, because a changed file gets a new name. HTML pages should not be cached for long: their content changes on every update and the filename does not.

**The 404 page.** By default, a Workers static site returns Cloudflare's generic error for unknown paths. Setting `not_found_handling` to `"404-page"` in the assets configuration serves your site's own 404 page instead — the one Astro builds from your `404.astro` route. This site's `wrangler.jsonc` sets exactly that, and it is the difference between a dead end and a page that points the visitor back to real content.

**Images and media.** Image files in `public/` are static assets like any other, served from the edge. But image _optimization_ — resizing, format conversion — is not something Workers static assets do for you. Astro's Sharp-based image service runs at build time and the optimized files ship as assets, which works unchanged; on-demand optimization needs the adapter's image service configuration. For a content site, build-time optimization is the simpler path, covered in the guide to [image optimization for Astro](/blog/image-optimization-astro-webp-avif).

## Troubleshooting Common Errors

**Dynamic routes return 404, or serve stale static pages.** The usual cause is a mismatch between the output mode and the pages. If the adapter is installed but `output` is still `"static"`, on-demand routes have no Worker to render them. If `output` is `"server"` but a page was meant to be static, it renders on every request instead of once at build time. Check `astro.config.mjs` first, then check the route's `prerender` export.

**The build fails on a Node.js API.** The Workers runtime is not Node.js. Code that imports a Node-only module — `node:fs`, `node:child_process`, or a package that imports one — fails at build time with a resolution error, because the package is built into Node and is not available in the Worker. The fix is to use the Cloudflare runtime equivalent or the `node:`-prefixed import where the runtime supports it, and to check the package author's compatibility note before adopting a dependency that assumes Node. The Astro documentation's troubleshooting section covers this error specifically.

**Hydration mismatches in the browser.** If the console reports that hydration completed but contains mismatches, and the site otherwise works, check Cloudflare's Auto Minify setting. Minification applied after the build can change the HTML the browser receives just enough that the hydrated output no longer matches what the server rendered. Disabling Auto Minify for the site resolves it — the build already minifies the output, so the setting adds nothing.

**Environment variables work locally but not in production.** Two usual causes: the variable was set in `.dev.vars` but never added with `wrangler secret put` or under `vars` in the configuration, or the code reads it at build time from `process.env` instead of at request time from `env`. Workers code reads its environment from the runtime binding, not from the build machine's environment, so a value that exists during `astro build` is not automatically available inside the Worker.

**Assets deploy but the site is empty.** The assets directory is wrong. Check where the build actually writes files — `./dist` for a standard build, `./dist/client` when another adapter has moved the output — and make `assets.directory` match. A deploy that uploads an empty directory succeeds without error and serves nothing, which makes this one easy to miss.

**API routes work on Vercel but not on Workers.** The two adapters have different conventions. On this site, API routes under `src/pages/api/` run as Vercel serverless functions; moving them to Workers means installing the Cloudflare adapter, marking the routes on-demand, and replacing Vercel-specific runtime access with the Workers `env` binding. The route handlers themselves — the `GET` and `POST` exports — are the same shape, so the migration is a configuration change rather than a rewrite.

![Where things go wrong: output mode, bindings, and the assets directory](/images/blog/deploy-astro-cloudflare-workers-diagram-2.png)

_Most Workers deployment failures trace to one of three places: the output mode, a binding the route cannot see, or an assets directory that does not match the build._

## Frequently Asked Questions

**Do I need the Cloudflare adapter for a static Astro site?**
No. A fully static site deploys as Workers static assets with only a `wrangler.jsonc` pointing at `./dist`. The adapter is for on-demand rendering: pages, API routes, and server islands that run per request.

**What does `npx astro add cloudflare` actually change?**
It installs `@astrojs/cloudflare`, adds the adapter to `astro.config.mjs`, sets `output: "server"` by default, and creates a Wrangler configuration file. Review the diff before committing — the output default in particular should match the majority of your pages.

**How do I use a database from an Astro page on Workers?**
Create the database with Wrangler, declare it as a binding in `wrangler.jsonc`, and read it in an on-demand route with `import { env } from "cloudflare:workers"`. The route must render on request — bindings are not available to prerendered pages.

**Can I deploy the same Astro site to Vercel and to Cloudflare?**
Yes, but not with the same build. Each adapter produces output for its own platform — this site's Vercel build writes static output to `dist/client`, while a Cloudflare build writes to `dist` — so a site deployed to both needs two build configurations and two deploy commands. One adapter is active at a time.

**What is the difference between Workers and Cloudflare Pages for Astro?**
Pages is the older hosting product; Workers with static assets is the current path, and the Cloudflare adapter targets Workers. New Astro deployments should use Workers, following the current Astro and Cloudflare documentation rather than older Pages tutorials.

**How do I test a Workers deployment before pointing my domain at it?**
Every deploy prints a `workers.dev` preview URL. Open it in a private window, click through the pages that matter, submit a form, and check the on-demand routes. Only attach the custom domain after the preview behaves.

## Conclusion

Deploying Astro to Cloudflare Workers is a short list of deliberate choices, not a long list of steps: static or on-demand, adapter or assets only, the right output mode, bindings declared in configuration, secrets in Wrangler rather than in the repository. Get those choices right and the deploy itself is two commands — build, then `wrangler deploy` — and the site runs on the edge, close to every visitor.

Start with the static path if your site allows it; it is the simplest deployment Astro offers on any host. Add the adapter when a page needs to render on demand, and add bindings when that page needs data. And remember the boundary stated at the start: this site runs on Vercel, and the Workers path here is the documented one, not a deployment run for this article. Verify your first deploy on the preview URL before pointing the domain at it.

**Further reading:** the official [Astro guide to deploying on Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/) is the authoritative step-by-step, Cloudflare's [Astro framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/) covers the Workers side including bindings, and the [Wrangler documentation](https://developers.cloudflare.com/workers/wrangler/) covers configuration, secrets, and commands. The [Astro islands architecture guide](/blog/astro-islands-architecture-partial-hydration) explains the server islands and hydration model that the adapter runs on the edge, and the [Astro Content Collections guide](/blog/astro-content-collections-guide) covers the content layer that a deployed site serves — while the guide to [edge computing](/blog/post-20) explains the model Workers belongs to, and the [serverless architecture guide](/blog/post-14) covers the trade-offs of running code without managing servers.
