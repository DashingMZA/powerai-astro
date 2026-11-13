#!/usr/bin/env node
/**
 * Upload an image to the R2/S3 bucket that serves https://media.csofts.tech/.
 *
 *   node scripts/upload-to-r2.mjs --file public/images/blog/hero.png
 *   node scripts/upload-to-r2.mjs --file photo.jpg --key blog/photo.jpg --dry-run
 *
 * Credentials come ONLY from the environment — never from code, config, or
 * content — and are never printed:
 *   R2_ENDPOINT          e.g. https://<account-id>.r2.cloudflarestorage.com
 *   R2_BUCKET            e.g. sitepins-media
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_PUBLIC_BASE_URL   optional, e.g. https://media.csofts.tech
 *
 * EXIF/XMP metadata is stripped with `exif-be-gone` before upload (JPEG /
 * PNG / WebP; other formats pass through unchanged). The stripped bytes are
 * what gets uploaded, so no camera/location metadata ever reaches the bucket.
 *
 * After upload, paste the printed public URL into frontmatter — see
 * IMAGE_STORAGE.md. It renders verbatim via ImageMod / og:image.
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import ExifTransformer from "exif-be-gone";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const USAGE = `Usage: node scripts/upload-to-r2.mjs --file <path> [--key <object-key>] [--dry-run]

Options:
  --file <path>   Local image to upload (required)
  --key <key>     Object key in the bucket (default: basename of --file)
  --dry-run       Strip EXIF and print the plan without uploading
                  (no credentials needed)
  --help          Show this help

Environment (required unless --dry-run):
  R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
  R2_PUBLIC_BASE_URL (optional, used only to print the public URL)`;

function parseArgs(argv) {
  const args = { file: null, key: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--file") args.file = argv[++i];
    else if (arg === "--key") args.key = argv[++i];
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}\n${USAGE}`);
      process.exit(2);
    }
  }
  if (!args.file) {
    console.error(`--file is required.\n${USAGE}`);
    process.exit(2);
  }
  return args;
}

/** Strip EXIF/XMP via exif-be-gone; returns the cleaned buffer. */
async function stripExif(buffer) {
  const chunks = [];
  const source = Readable.from([buffer]);
  for await (const chunk of source.pipe(new ExifTransformer())) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function main() {
  const { file, key, dryRun } = parseArgs(process.argv.slice(2));
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const original = fs.readFileSync(filePath);
  const cleaned = await stripExif(original);
  const objectKey = key ?? path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const sha256 = createHash("sha256").update(cleaned).digest("hex");

  if (dryRun) {
    console.log("Dry run — nothing uploaded.");
    console.log(`  file:         ${filePath}`);
    console.log(`  key:          ${objectKey}`);
    console.log(`  content-type: ${contentType}`);
    console.log(
      `  size:         ${original.length} -> ${cleaned.length} bytes (EXIF stripped)`,
    );
    console.log(`  sha256:       ${sha256}`);
    const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (base) console.log(`  public URL:   ${base}/${objectKey}`);
    return;
  }

  const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } =
    process.env;
  const missing = [
    ["R2_ENDPOINT", R2_ENDPOINT],
    ["R2_BUCKET", R2_BUCKET],
    ["R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID],
    ["R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `See the header of scripts/upload-to-r2.mjs.`,
    );
    process.exit(1);
  }

  const client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      Body: cleaned,
      ContentType: contentType,
    }),
  );
  console.log(
    `Uploaded ${objectKey} (${cleaned.length} bytes, sha256 ${sha256}).`,
  );
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base) console.log(`Public URL: ${base}/${objectKey}`);
}

main().catch((err) => {
  console.error(`Upload failed: ${err.message}`);
  process.exit(1);
});
