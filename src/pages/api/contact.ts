// POST /api/contact — contact form backend (Resend).
//
// Accepts JSON (fetch clients) or urlencoded/multipart form posts
// (no-JS fallback). Validates server-side, then emails CONTACT_EMAIL
// via Resend. Success is reported ONLY when Resend returns an email
// id. Credentials are configured in Vercel Production (since
// 2026-11-13); without RESEND_API_KEY / CONTACT_EMAIL /
// CONTACT_FROM_EMAIL this answers 503 and sends nothing. Live
// delivery currently FAILS on a config error: CONTACT_FROM_EMAIL is
// malformed (Resend 422 "Invalid `from` field") — see docs.

import type { APIRoute } from "astro";
import {
  checkMinSubmitTime,
  errorResponse,
  escapeHtml,
  isCrossOriginPost,
  isHoneypotFilled,
  jsonResponse,
  readRequestFields,
  validateEmailField,
  validateTextField,
} from "@/lib/formValidation";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getFormMailConfig, sendFormEmail } from "@/lib/resend";

export const prerender = false;

/** 5 contact submissions per 10 minutes per IP. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (request.method !== "POST") {
    return errorResponse(405, "Method not allowed.");
  }

  const ip = getClientIp(request, clientAddress);
  const limit = checkRateLimit(`contact:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: "Too many messages. Please try again later.",
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

  // Defence-in-depth: reject cross-site submissions (no session
  // cookies exist, so this guards the inbox against third-party
  // spam-driving, not session riding). Missing Origin is allowed.
  if (isCrossOriginPost(request)) {
    return errorResponse(
      403,
      "This form can only be submitted from this website.",
    );
  }

  const fields = await readRequestFields(request);

  // Honeypot: answer a fake success so bots cannot tell they were
  // detected — and send nothing.
  if (isHoneypotFilled(fields)) {
    return jsonResponse(200, {
      ok: true,
      message: "Thanks for your message. We'll get back to you soon.",
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

  const subject = validateTextField(fields.subject, {
    label: "Subject",
    field: "subject",
    maxLength: 150,
  });
  if (!subject.ok) return errorResponse(400, subject.error, "subject");

  const message = validateTextField(fields.message, {
    label: "Message",
    field: "message",
    required: true,
    minLength: 10,
    maxLength: 5000,
  });
  if (!message.ok) return errorResponse(400, message.error, "message");

  const config = getFormMailConfig();
  if (!config) {
    return errorResponse(
      503,
      "This form is not set up yet. Please try again later.",
    );
  }

  const subjectLine = subject.value
    ? `New contact message: ${subject.value}`
    : "New contact message from the website";
  const text =
    `Name: ${name.value}\n` +
    `Email: ${email.value}\n` +
    `Phone: ${phone.value || "-"}\n` +
    `Subject: ${subject.value || "-"}\n\n` +
    `${message.value}\n`;
  const html =
    `<p><strong>Name:</strong> ${escapeHtml(name.value)}</p>` +
    `<p><strong>Email:</strong> ${escapeHtml(email.value)}</p>` +
    `<p><strong>Phone:</strong> ${escapeHtml(phone.value || "-")}</p>` +
    `<p><strong>Subject:</strong> ${escapeHtml(subject.value || "-")}</p>` +
    `<p>${escapeHtml(message.value).replace(/\n/g, "<br />")}</p>`;

  const sent = await sendFormEmail(config.apiKey, {
    from: config.fromEmail,
    to: config.contactEmail,
    replyTo: email.value,
    subject: subjectLine,
    text,
    html,
  });
  if (!sent.ok) {
    return errorResponse(
      502,
      "Your message could not be sent. Please try again later.",
    );
  }

  return jsonResponse(200, {
    ok: true,
    message: "Thanks for your message. We'll get back to you soon.",
  });
};
