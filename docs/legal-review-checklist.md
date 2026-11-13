# Legal Review Checklist — PowerAI Astro (INTERNAL)

> **Internal document — do NOT link from any public page.**
> This checklist supports the draft Privacy Policy (`src/content/pages/privacy-policy.md`)
> and draft Terms of Service (`src/content/pages/terms-of-service.md`), both marked
> **"DRAFT — OWNER + LEGAL REVIEW REQUIRED"**. Nothing in this document is legal advice,
> and no item below has been answered on the owner's behalf: every answer must be
> supplied or decided by the site owner and, where noted, a qualified legal adviser.
>
> - **Repo:** `~/workspace/powerai-astro`, branch `main`
> - **Production:** https://powerai.jadoo.bond
> - **Created:** 13 November 2026, from the accessibility + legal audit
>   (`/tmp/audit-a11y-legal-101.md`, Part B §9 — 18 items), with the accuracy fixes
>   of 13 November 2026 folded in.
> - **Status:** OPEN — the two legal pages must stay marked DRAFT until every
>   applicable item is resolved and a lawyer has reviewed them.
>
> Each item states **what is verifiably true today** (from the code) and **what the
> owner / legal must supply or decide**. Do not fill in an answer by guessing: if an
> answer is unknown, leave the item open.

## 1. Legal entity

- **True today:** the drafts say only that the site is "operated by cSofts", and
  `src/config/config.json` (`meta_author`) also says only "cSofts". No company form,
  registration number, or trading name exists anywhere in the repo.
- **Owner / legal must supply:** the full registered legal name of the operator, and
  whether "cSofts" is a registered company, a trading name, or something else. Do not
  assume a company form or number.

## 2. Registered / physical address

- **True today:** no real address exists in the repo. The contact page previously
  showed the fictional "123 Main Street, Anytown, USA"; that text was removed on
  13 November 2026 and no address is published anywhere on the site now.
- **Owner / legal must supply:** the operator's registered or physical address, if
  one must be published — or a decision that no address will be published and the
  contact form is the only route.

## 3. Privacy contact email address

- **True today:** no contact email is published on the site. The footer previously
  showed the template placeholder `john@example.com` (which reached nobody); it was
  removed on 13 November 2026 and replaced with a link to the contact form. The
  contact page previously showed a phone number in its email field; that was also
  removed. Privacy questions currently go through the contact form only.
- **Owner must supply:** a direct, monitored email address for privacy enquiries,
  rights requests, and the policy's Contact section — or confirm the form-only route
  is intended. Do not publish an unmonitored address.

## 4. Open Remark privacy-policy and terms links

- **True today:** blog comments load the Open Remark widget
  (`https://open-remark.zeon.studio/embed.js`, enabled in `src/config/config.json`,
  site key `cmpl2v9m4000104jjmruazes1`). What the widget collects was not verifiable
  from this repo, and no Open Remark policy link was found in the code. The privacy
  draft flags this with an `[Owner to confirm]` marker.
- **Owner must supply:** the verified URLs of Open Remark's privacy policy and terms,
  for linking from the privacy draft.

## 5. Retention periods — contact messages, newsletter contacts, applications, CVs

- **True today:** there is no deletion, expiry, or retention code anywhere in the
  repo. Contact messages and applications (including CV attachments) persist in the
  recipient's email inbox; newsletter contacts persist in Resend until removed; CVs
  are processed in server memory and emailed via Resend, then exist in the inbox and
  in Resend's systems. The drafts state no retention period.
- **Owner / legal must decide:** how long contact messages, newsletter contacts, and
  job applications / CVs are kept in the inbox and in Resend, and when unsuccessful
  applications and CVs are deleted. No period may be invented — the drafts must stay
  blank on this until the owner states one.

## 6. Rights-request process (access / correction / deletion)

- **True today:** there is no rights-request process, endpoint, or deletion capability
  in the code. The only route is "write via the contact form", which lands in the
  same inbox as the data itself. The drafts now state plainly that requests are
  handled manually by the site owner, with no response time promised.
- **Owner / legal must decide:** who handles access, correction, and deletion
  requests; how inbox mail and Resend contacts are actioned (including who can delete
  a Resend contact); and what response time, if any, the owner will commit to. Only
  then may a response time be written into the drafts.

## 7. Children's age threshold

- **True today:** the privacy draft says under-16s should not submit personal
  information without a parent or guardian's permission. No age field, age gate, or
  parental-consent step exists in any form (contact, newsletter, apply).
- **Legal must confirm:** the applicable age threshold for the jurisdictions this site
  serves. Do not assume 16 is right everywhere.

## 8. Governing law and jurisdiction

- **True today:** the Terms state none — the section is blank with an
  `[Owner to confirm]` marker, because the owner's location and legal entity have
  not been confirmed.
- **Legal must supply:** the governing law and jurisdiction.

## 9. Liability cap and exclusions

- **True today:** the Terms state no specific cap — the section is blank with an
  `[Owner to confirm]` marker, and the "as is" provision is the only limitation
  language present.
- **Legal must supply:** the liability cap and exclusions that apply in the owner's
  jurisdiction. Do not invent a cap.

## 10. Direct contact email for Terms enquiries

- **True today:** the Terms point enquiries to the contact form only; no email,
  phone, or postal address is published on the site.
- **Owner must supply:** a direct contact email address for Terms enquiries, or
  confirm the form-only route is intended (see item 3 — it may be the same address).

## 11. Cookie / consent decision, and the GTM question

- **True today:** the site's own code sets no cookies and uses no browser storage
  (verified: zero matches for `document.cookie`, `localStorage`, `sessionStorage`,
  `set-cookie` in `src/`). Google Tag Manager is switched off with a placeholder ID
  (`GTM-XXXXXX`), so no analytics script runs. Vercel (hosting) and Open Remark
  (comments) may set their own cookies under their own policies.
- **Owner must decide:** whether any cookie banner or consent mechanism is wanted;
  whether a separate cookie policy / notice is needed and who writes it; and whether
  GTM stays disabled or is enabled with a real ID — enabling it would first require
  rewriting the privacy draft's "No analytics by default" section.

## 12. Open Remark data collection (beyond the links)

- **True today:** the embed script's collection behaviour (cookies, local storage,
  IP, fingerprinting) was not verifiable from this repo.
- **Owner must confirm:** from Open Remark's own documentation, what the embed
  collects, and whether that needs disclosure beyond the policy links in item 4.

## 13. Newsletter unsubscribe

- **True today:** subscribing only stores the address as a Resend contact; no welcome
  email is sent, and no newsletter-sending code exists in the repo — so no
  unsubscribe link could be verified. The privacy draft now says so plainly, and
  offers the contact form as the removal route.
- **Owner must confirm:** that Resend-sent mail actually carries a working
  unsubscribe link, once a newsletter is ever sent; if no newsletter will ever be
  sent, the policy sentence must be reworded rather than left as-is.

## 14. Resend data-processing terms

- **True today:** Resend receives contact messages, newsletter subscriptions, and job
  applications (including CV attachments) via `resend.emails.send` and
  `resend.contacts.create`. No data-processing terms are recorded in the repo.
- **Owner must confirm:** that the Resend plan / agreement covers this use (contacts
  - email), whether a data-processing addendum is needed, and where Resend stores
    data (region / transfers) if the policy must state it.

## 15. Replace all placeholder contact details before finalising

- **Done 13 November 2026:** `john@example.com` and `(+1) 123-346-7890` were removed
  from `src/config/config.json` and from the footer (replaced with a "Contact us"
  link to `/contact`); the contact page's `"(629) 555-0129"` email,
  `"+1 (123) 456-7890"` phone, and `"123 Main Street, Anytown, USA"` address were
  removed; `src/layouts/components/ContactForm.astro` now renders a contact-detail
  line only when a real value is supplied, and `src/config/site.ts` no longer
  exports placeholder contact details.
- **Owner must still supply:** real contact details if any are to be published at
  all (see items 2 and 3). Do not reintroduce placeholder values.
- **Separate open issue (not fixed here):** the contact form's submit button is
  hard-disabled without JavaScript, so the policy's only offered contact route is
  gated on JS (audit issue C1). Confirm whether that is acceptable before the drafts
  are finalised.

## 16. Careers content and closed-role applications

- **True today:** all 8 careers entries have deadlines in May–June 2025 and no role
  is open; the role pages hide the application form for archived roles. The
  application endpoint (`src/pages/api/apply.ts`) performs **no** deadline check and
  accepts any valid role slug generically — a directly submitted application for a
  closed role would still be emailed to the owner. The Terms now state only that no
  form is shown for closed roles, and flag the endpoint behaviour for the owner.
- **Owner must decide:** (a) the intended handling of applications sent for a closed
  role via the API — reject them server-side, or accept and handle them manually;
  (b) confirm or remove the template salary / location / department values on the
  careers pages (notably the Junior Frontend Developer role, already flagged as
  unverified template values in the 2026-11-13 final audit) before any role is
  reopened.

## 17. "We do not sell personal information" / "disclose only if required by law"

- **True today:** these are assertions in the drafts. No code either sells data or
  discloses it, but equally no code enforces these statements — they are commitments,
  not technical facts.
- **Owner must confirm:** that the owner intends both statements as binding
  commitments, and that no current practice (e.g. any future analytics or
  third-party sharing) contradicts them.

## 18. Policy governance — versioning, approval, publication

- **True today:** both drafts are dated 13 November 2026 and marked
  **"DRAFT — OWNER + LEGAL REVIEW REQUIRED"**. No versioning or change process is
  recorded in the repo.
- **Owner must decide:** the versioning / change process for both policies (who
  approves future changes, whether a "last updated" date and a change log are
  wanted), and whether the drafts may be published as-is after legal review or must
  remain unpublished until then. The DRAFT marking must not be removed until legal
  review is complete.

---

## How to use this checklist

1. Work through the items in order; leave any item open rather than guessing an
   answer.
2. For each resolved item, update the matching `[Owner to confirm]` marker in the
   privacy draft and/or Terms draft with the confirmed wording, and note the date
   and who confirmed it.
3. Do not remove the **"DRAFT — OWNER + LEGAL REVIEW REQUIRED"** marking from either
   legal page until a qualified legal adviser has reviewed the completed drafts and
   the owner has approved them.
4. Re-check the drafts against the code after any site change that affects data
   collection (new forms, new third-party scripts, analytics being enabled, roles
   reopening): a code change can silently make a draft statement false again.
