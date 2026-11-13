// POST /api/apply — careers application backend (Resend).
//
// Accepts multipart/form-data only (a CV file is required). The CV is
// read into a memory buffer and sent as a Resend email attachment —
// it is NEVER written to disk, and never into `public/` or any other
// publicly served path.
//
// Position validation: `position` must be the slug (`id`) of a careers
// collection entry (or its title, case-insensitive, for older forms).
// Unknown positions are rejected. All 8 careers in the repo today are
// past their 2025 deadlines — the endpoint still accepts their slugs
// generically; deciding which roles are open/hidden is the
// hiring-status worker's job, not this endpoint's, and no vacancy is
// invented here.
//
// Live delivery currently FAILS on a config error: credentials are
// set in Vercel Production (since 2026-11-13), but CONTACT_FROM_EMAIL
// is malformed (Resend 422 "Invalid `from` field"). See docs.

import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import {
  checkMinSubmitTime,
  errorResponse,
  escapeHtml,
  isCrossOriginPost,
  isHoneypotFilled,
  jsonResponse,
  validateEmailField,
  validateTextField,
} from "@/lib/formValidation";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getFormMailConfig, sendFormEmail } from "@/lib/resend";

export const prerender = false;

/** 3 applications per 60 minutes per IP (CV uploads are heavier). */
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/** CV size cap: 5 MB. */
const MAX_CV_BYTES = 5 * 1024 * 1024;

const CV_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

const CV_MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Magic-byte check — extension + MIME alone are trivially spoofed.
 * PDF starts with `%PDF`, DOCX is a ZIP (`PK\x03\x04`), legacy DOC is
 * an OLE compound document (`D0 CF 11 E0 A1 B1 1A E1`).
 */
function hasExpectedMagicBytes(extension: string, bytes: Uint8Array): boolean {
  if (extension === ".pdf") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    );
  }
  if (extension === ".docx") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04
    );
  }
  // .doc
  const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return bytes.length >= 8 && ole.every((byte, index) => bytes[index] === byte);
}

/** Strip directories / unsafe characters from a user-supplied filename. */
function sanitizeFilename(name: string, extension: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
  if (!clean || clean === extension) return `cv${extension}`;
  return clean;
}

interface CvCheck {
  file: File;
  extension: string;
  buffer: Buffer;
}

async function validateCv(
  value: unknown,
): Promise<{ ok: true; cv: CvCheck } | { ok: false; error: string }> {
  if (!(value instanceof File) || value.size === 0) {
    return { ok: false, error: "Please upload your CV (PDF, DOC or DOCX)." };
  }
  if (value.size > MAX_CV_BYTES) {
    return { ok: false, error: "Your CV must be 5 MB or smaller." };
  }
  const lowerName = value.name.toLowerCase();
  const extension = CV_EXTENSIONS.find((ext) => lowerName.endsWith(ext));
  if (!extension) {
    return {
      ok: false,
      error: "Your CV must be a PDF, DOC or DOCX file.",
    };
  }
  // Some browsers report generic/empty MIME types for .doc — only
  // reject a MIME that is present and clearly not this file type.
  if (
    value.type &&
    value.type !== "application/octet-stream" &&
    value.type !== CV_MIME_TYPES[extension]
  ) {
    return {
      ok: false,
      error: "Your CV must be a PDF, DOC or DOCX file.",
    };
  }
  const arrayBuffer = await value.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  if (!hasExpectedMagicBytes(extension, bytes)) {
    return {
      ok: false,
      error: "The uploaded file does not look like a valid CV document.",
    };
  }
  return {
    ok: true,
    cv: {
      file: value,
      extension,
      buffer: Buffer.from(arrayBuffer),
    },
  };
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (request.method !== "POST") {
    return errorResponse(405, "Method not allowed.");
  }

  const ip = getClientIp(request, clientAddress);
  const limit = checkRateLimit(`apply:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: "Too many applications. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "retry-after": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  // Defence-in-depth: reject cross-site submissions (see contact.ts).
  if (isCrossOriginPost(request)) {
    return errorResponse(
      403,
      "This form can only be submitted from this website.",
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return errorResponse(400, "Could not read the submitted form.");
  }
  const fields: Record<string, string | undefined> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") fields[key] = value;
  }

  // Honeypot: fake success, send nothing.
  if (isHoneypotFilled(fields)) {
    return jsonResponse(200, {
      ok: true,
      message: "Thanks for applying. We'll be in touch soon.",
    });
  }

  const tooFast = checkMinSubmitTime(fields._ts);
  if (tooFast) return errorResponse(400, tooFast, "_ts");

  const name = validateTextField(fields.name, {
    label: "Name",
    field: "name",
    required: true,
    minLength: 2,
    maxLength: 100,
  });
  if (!name.ok) return errorResponse(400, name.error, "name");

  const email = validateEmailField(fields.email);
  if (!email.ok) return errorResponse(400, email.error, "email");

  const phone = validateTextField(fields.phone, {
    label: "Phone",
    field: "phone",
    maxLength: 30,
  });
  if (!phone.ok) return errorResponse(400, phone.error, "phone");

  const positionRaw = validateTextField(fields.position, {
    label: "Position",
    field: "position",
    required: true,
    maxLength: 200,
  });
  if (!positionRaw.ok) {
    return errorResponse(400, positionRaw.error, "position");
  }

  const message = validateTextField(fields.message, {
    label: "Cover letter",
    field: "message",
    required: true,
    minLength: 10,
    maxLength: 5000,
  });
  if (!message.ok) return errorResponse(400, message.error, "message");

  // Position must match a real careers entry (slug, or title for
  // older forms). Draft / `-index` entries are excluded by the same
  // filter the site itself uses to build the careers pages.
  const careers = await getCollection("careers", ({ data, id }) => {
    return (
      !data?.draft &&
      !id.startsWith("-") &&
      (!data?.date || new Date(data.date) <= new Date())
    );
  });
  const wanted = positionRaw.value.trim();
  const matched = careers.find(
    (career) =>
      career.id === wanted ||
      career.data.title.toLowerCase() === wanted.toLowerCase(),
  );
  if (!matched) {
    return errorResponse(
      400,
      "That position is not listed. Please choose a role from the careers page.",
      "position",
    );
  }
  const positionTitle = matched.data.title;

  const cv = await validateCv(form.get("cv"));
  if (!cv.ok) return errorResponse(400, cv.error, "cv");

  const config = getFormMailConfig();
  if (!config) {
    return errorResponse(
      503,
      "Applications are not set up yet. Please try again later.",
    );
  }

  const filename = sanitizeFilename(cv.cv.file.name, cv.cv.extension);
  const text =
    `Position: ${positionTitle} (${matched.id})\n` +
    `Name: ${name.value}\n` +
    `Email: ${email.value}\n` +
    `Phone: ${phone.value || "-"}\n\n` +
    `${message.value}\n`;
  const html =
    `<p><strong>Position:</strong> ${escapeHtml(positionTitle)} (${escapeHtml(matched.id)})</p>` +
    `<p><strong>Name:</strong> ${escapeHtml(name.value)}</p>` +
    `<p><strong>Email:</strong> ${escapeHtml(email.value)}</p>` +
    `<p><strong>Phone:</strong> ${escapeHtml(phone.value || "-")}</p>` +
    `<p>${escapeHtml(message.value).replace(/\n/g, "<br />")}</p>`;

  const sent = await sendFormEmail(config.apiKey, {
    from: config.fromEmail,
    to: config.contactEmail,
    replyTo: email.value,
    subject: `Job application: ${positionTitle} — ${name.value}`,
    text,
    html,
    attachments: [
      {
        filename,
        content: cv.cv.buffer,
        contentType: CV_MIME_TYPES[cv.cv.extension],
      },
    ],
  });
  if (!sent.ok) {
    return errorResponse(
      502,
      "Your application could not be sent. Please try again later.",
    );
  }

  return jsonResponse(200, {
    ok: true,
    message: "Thanks for applying. We'll be in touch soon.",
  });
};
