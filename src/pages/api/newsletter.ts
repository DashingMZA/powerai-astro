// POST /api/newsletter — newsletter subscription backend (Resend).
//
// Uses the Resend SDK's Contacts API (`resend.contacts.create`, as
// shipped in resend 6.38.0) — NOT the legacy audience API: v6 contacts
// take `segments` instead of the deprecated `audienceId`, and no
// audience/segment is required. Set RESEND_NEWSLETTER_SEGMENT_ID to
// attach new contacts to a Resend segment; without it the contact is
// created unsegmented.
//
// Duplicate handling: Resend answers 409 (or an "already exists"
// error) for an address that is already a contact. That is treated as
// a success with `alreadySubscribed: true` — the visitor is already
// on the list, so there is nothing to fix and no error to show.
// NOTE: this 409 branch is effectively dead — Resend upserts, so a
// duplicate subscription returns a plain 200 instead. The branch is
// kept as a harmless fallback.
// No welcome email is sent (NEWSLETTER_FROM_EMAIL is reserved for
// one, if it is ever added — see .env.example).
//
// Live delivery CONFIRMED 2026-11-13: the newsletter form was
// retested live (200) after the Resend config fix in Vercel and the
// owner confirmed inbox delivery. (The earlier sending-only API key
// 401 `restricted_api_key` failure no longer applies — the key in
// Vercel now has Contacts permission.)

import type { APIRoute } from "astro";
import { Resend } from "resend";
import {
  checkMinSubmitTime,
  errorResponse,
  isCrossOriginPost,
  isHoneypotFilled,
  jsonResponse,
  readRequestFields,
  validateEmailField,
  validateTextField,
} from "@/lib/formValidation";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getNewsletterSegmentId } from "@/lib/resend";

export const prerender = false;

/** 5 subscriptions per 10 minutes per IP. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (request.method !== "POST") {
    return errorResponse(405, "Method not allowed.");
  }

  const ip = getClientIp(request, clientAddress);
  const limit = checkRateLimit(`newsletter:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: "Too many subscription attempts. Please try again later.",
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

  const fields = await readRequestFields(request);

  // Honeypot: fake success, subscribe nobody.
  if (isHoneypotFilled(fields)) {
    return jsonResponse(200, {
      ok: true,
      message: "Thanks for subscribing.",
    });
  }

  const tooFast = checkMinSubmitTime(fields._ts);
  if (tooFast) return errorResponse(400, tooFast, "_ts");

  const email = validateEmailField(fields.email);
  if (!email.ok) return errorResponse(400, email.error, "email");

  const firstName = validateTextField(fields.first_name ?? fields.name, {
    label: "First name",
    field: "first_name",
    maxLength: 100,
  });
  if (!firstName.ok) {
    return errorResponse(400, firstName.error, "first_name");
  }

  const apiKey = process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
  if (typeof apiKey !== "string" || !apiKey) {
    return errorResponse(
      503,
      "Subscriptions are not set up yet. Please try again later.",
    );
  }

  const segmentId = getNewsletterSegmentId();
  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.contacts.create({
      email: email.value,
      firstName: firstName.value || undefined,
      ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
    });
    if (error) {
      const message = error.message ?? "";
      if (error.statusCode === 409 || /already exists/i.test(message)) {
        return jsonResponse(200, {
          ok: true,
          code: "already_subscribed",
          message: "You're already subscribed.",
        });
      }
      console.error(
        "[resend] contacts.create failed:",
        error.name,
        error.statusCode,
        message,
      );
      return errorResponse(
        502,
        "Your subscription could not be saved. Please try again later.",
      );
    }
    if (!data?.id) {
      console.error("[resend] contacts.create returned no id and no error.");
      return errorResponse(
        502,
        "Your subscription could not be saved. Please try again later.",
      );
    }
    return jsonResponse(200, {
      ok: true,
      message: "Thanks for subscribing.",
    });
  } catch (caught) {
    console.error(
      "[resend] contacts.create threw:",
      caught instanceof Error ? caught.message : "unknown error",
    );
    return errorResponse(
      502,
      "Your subscription could not be saved. Please try again later.",
    );
  }
};
