// Resend client + form-mail configuration for the API routes.
//
// Environment variables (set in Vercel dashboard / `.env` locally —
// NEVER committed, NEVER hardcoded, NEVER exposed to client code):
//   RESEND_API_KEY        API key from resend.com/api-keys
//   CONTACT_EMAIL         Inbox that receives contact + application mail
//   CONTACT_FROM_EMAIL    Verified sender on the Resend domain, e.g.
//                         "Power AI <hello@powerai.jadoo.bond>"
//   NEWSLETTER_FROM_EMAIL Sender for the newsletter welcome mail —
//                         only needed if a welcome mail is ever added;
//                         unused today (see newsletter.ts).
//   RESEND_NEWSLETTER_SEGMENT_ID  Optional Resend segment id to attach
//                         new newsletter contacts to.
//
// No values are invented here: when any required variable is missing
// the endpoints answer 503 ("form not set up yet") and send nothing.

import { Resend } from "resend";

export interface FormMailConfig {
  apiKey: string;
  contactEmail: string;
  fromEmail: string;
}

/** Read one variable from the server runtime (`process.env` first, then `import.meta.env`). */
function readEnv(name: string): string | undefined {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  const fromMeta = import.meta.env[name];
  return typeof fromMeta === "string" && fromMeta ? fromMeta : undefined;
}

/**
 * Required mail config, or `null` when anything is missing. Callers
 * answer 503 in that case — never fall back to a placeholder address.
 */
export function getFormMailConfig(): FormMailConfig | null {
  const apiKey = readEnv("RESEND_API_KEY");
  const contactEmail = readEnv("CONTACT_EMAIL");
  const fromEmail = readEnv("CONTACT_FROM_EMAIL");
  if (!apiKey || !contactEmail || !fromEmail) return null;
  return { apiKey, contactEmail, fromEmail };
}

/** Optional Resend segment id for newsletter contacts (unset = none). */
export function getNewsletterSegmentId(): string | undefined {
  return readEnv("RESEND_NEWSLETTER_SEGMENT_ID");
}

export interface SendEmailInput {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

export type SendEmailResult =
  { ok: true; id: string } | { ok: false; error: string };

/**
 * Send one email via Resend. Success is reported ONLY when Resend
 * returns an email id — a returned `error` (invalid key, unverified
 * sender, quota, …) or a thrown network error is a failure, never a
 * silent success. The caller-visible error is always generic; the
 * Resend detail goes to the server log only.
 */
export async function sendFormEmail(
  apiKey: string,
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: input.from,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    });
    if (error) {
      console.error(
        "[resend] send failed:",
        error.name,
        error.statusCode,
        error.message,
      );
      return { ok: false, error: "Email delivery failed." };
    }
    if (!data?.id) {
      console.error("[resend] send returned no id and no error.");
      return { ok: false, error: "Email delivery failed." };
    }
    return { ok: true, id: data.id };
  } catch (caught) {
    console.error(
      "[resend] send threw:",
      caught instanceof Error ? caught.message : "unknown error",
    );
    return { ok: false, error: "Email delivery failed." };
  }
}
