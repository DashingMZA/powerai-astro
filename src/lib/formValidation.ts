// Shared server-side form validation for the Resend-backed API routes
// (`src/pages/api/contact.ts`, `newsletter.ts`, `apply.ts`).
//
// These helpers are server-only: they are imported exclusively by API
// routes, never by client code, so they may read `process.env` (via
// `src/lib/resend.ts`) and use Node APIs. Keep all three endpoints on
// these helpers — do not copy-paste validation into a route.

/** JSON body returned by every form endpoint. */
export interface FormResult {
  ok: boolean;
  message: string;
  /** Machine-readable detail for the client (e.g. "already_subscribed"). */
  code?: string;
  /** Field the error refers to, when it is a field error. */
  field?: string;
}

/** Build a JSON `Response` for a form endpoint. */
export function jsonResponse(status: number, body: FormResult): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Generic failure message that never leaks server internals. */
export function errorResponse(
  status: number,
  message: string,
  field?: string,
): Response {
  return jsonResponse(status, { ok: false, message, field });
}

// ---------------------------------------------------------------------------
// Email + text fields
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Pragmatic RFC-5322-subset check: one `@`, a domain with a dot and a
 * TLD of at least 2 characters, no whitespace. This is a syntax check
 * only — it does not verify the mailbox exists.
 */
export function isValidEmail(email: string): boolean {
  if (email.length > 254 || email.includes("..")) return false;
  return EMAIL_RE.test(email);
}

export interface TextFieldOptions {
  /** Human-readable label used in error messages. */
  label: string;
  /** `name` attribute of the field, echoed back in `field`. */
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength: number;
}

export type TextFieldResult =
  { ok: true; value: string } | { ok: false; error: string };

/** Trim, then enforce required / length rules. Returns the clean value. */
export function validateTextField(
  raw: unknown,
  options: TextFieldOptions,
): TextFieldResult {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    if (options.required) {
      return { ok: false, error: `${options.label} is required.` };
    }
    return { ok: true, value: "" };
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    return {
      ok: false,
      error: `${options.label} must be at least ${options.minLength} characters.`,
    };
  }
  if (value.length > options.maxLength) {
    return {
      ok: false,
      error: `${options.label} must be at most ${options.maxLength} characters.`,
    };
  }
  return { ok: true, value };
}

/** Validate an email field (required, syntax, length). */
export function validateEmailField(raw: unknown): TextFieldResult {
  const checked = validateTextField(raw, {
    label: "Email",
    field: "email",
    required: true,
    maxLength: 254,
  });
  if (!checked.ok) {
    return checked;
  }
  if (!isValidEmail(checked.value)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  return checked;
}

// ---------------------------------------------------------------------------
// Spam protection: honeypot + minimum time-to-submit
// ---------------------------------------------------------------------------

/** Name of the honeypot field. Rendered off-screen, never labelled. */
export const HONEYPOT_FIELD = "company";

/**
 * True when the honeypot field carries any value. Bots that auto-fill
 * every input trip this; humans never see the field. Callers must NOT
 * reveal the detection — they return a fake success instead.
 */
export function isHoneypotFilled(
  fields: Record<string, string | undefined>,
): boolean {
  const value = fields[HONEYPOT_FIELD];
  return value !== undefined && value.trim() !== "";
}

/** Minimum milliseconds between page load and submit (bots submit instantly). */
export const MIN_SUBMIT_MS = 3000;

/**
 * Validate the `_ts` timestamp the client sets on page load
 * (`Date.now()`). Returns an error string when the form was submitted
 * implausibly fast. When `_ts` is absent (e.g. JavaScript disabled)
 * the check is skipped — the honeypot and rate limit still apply —
 * rather than rejecting a legitimate no-JS submission.
 */
export function checkMinSubmitTime(
  startedAt: string | undefined,
): string | undefined {
  if (startedAt === undefined || startedAt.trim() === "") return undefined;
  const started = Number(startedAt);
  if (!Number.isFinite(started)) return undefined;
  if (Date.now() - started < MIN_SUBMIT_MS) {
    return "Please take a moment to complete the form before sending.";
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Request body parsing
// ---------------------------------------------------------------------------

/**
 * Read submitted fields from a request body, accepting JSON
 * (`fetch` clients) and `application/x-www-form-urlencoded` /
 * `multipart/form-data` (plain form posts, no-JS fallback). File
 * values are skipped here — routes that accept uploads read
 * `request.formData()` themselves.
 *
 * A malformed body (invalid JSON, broken multipart) returns `{}` so
 * the caller answers a normal 400 field error — it must never throw
 * and surface a 500 (verified 2026-11-13: uncaught `request.json()`
 * SyntaxError produced a 500 error page).
 */
export async function readRequestFields(
  request: Request,
): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const data: unknown = await request.json();
      if (data === null || typeof data !== "object" || Array.isArray(data)) {
        return {};
      }
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") fields[key] = value;
      }
      return fields;
    }
    const form = await request.formData();
    const fields: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") fields[key] = value;
    }
    return fields;
  } catch {
    return {};
  }
}

/**
 * True when a POST carries an `Origin` header for a different host
 * than this site — i.e. a cross-site form submission. There are no
 * session cookies here, so classic CSRF session-riding does not
 * apply; this is defence-in-depth against third-party sites driving
 * the endpoints to spam the owner's inbox. Missing, unparseable, or
 * absent-host values are allowed (curl, old browsers, same-origin
 * navigations) — only a definite mismatch is rejected.
 */
export function isCrossOriginPost(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    "";
  if (!host) return false;
  return originHost.toLowerCase() !== host.toLowerCase();
}

// ---------------------------------------------------------------------------
// HTML escaping (user text embedded in email bodies)
// ---------------------------------------------------------------------------

/** Escape text for interpolation into an HTML email body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
