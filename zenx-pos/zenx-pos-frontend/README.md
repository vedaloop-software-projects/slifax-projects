# ZenxPOS website

Marketing site for ZenxPOS (Next.js App Router, Tailwind CSS). Every page is static
(`ensureStatic = 'navigation'` on the root layout).

## Run

```bash
cp .env.example .env.local   # set ZENXPOS_API_BASE_URL for your backend
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start
```

The contact and Request Quote forms post to `POST /api/website-enquiries`. Next.js proxies
this and the public business-type lookup to `ZENXPOS_API_BASE_URL` (default:
`http://127.0.0.1:5100/api`). Set this server-side URL before building for production.
Apply `../deploy/sql/20261105_website_enquiries.sql` followed by
`../deploy/sql/20261105_website_enquiry_email_alerts.sql` to the backend database before
starting the updated backend. Requests appear in the authenticated **Website Enquiries**
super-admin inbox, with an unread notification badge and follow-up statuses. Each new
submission also queues an internal email alert using the backend's support SMTP settings
and `ENQUIRY_EMAIL_TO` (falling back to `SUPPORT_EMAIL_TO`). Email delivery runs after
the enquiry is saved, so SMTP delays do not block the form's success response. Identical
UUID retries do not queue an additional alert. Requests do not create onboarding
registrations or customer accounts. Keep mail settings on the backend; see its
[email configuration and delivery notes](../zenx-pos-backend/README.md#enquiry-email-configuration-and-delivery).

For a separately hosted browser API, set `NEXT_PUBLIC_API_BASE_URL` instead and add the
website's origin to the backend's `CORS_ALLOWED_ORIGINS`. No admin credentials or private
API routes are exposed through the website proxy.

## Where things live

- `src/content/` — shared page text, images and links.
  `site.ts` holds navigation, contact details and client logos.
- `src/components/ui/` — primitives (container, section heading, buttons, check list).
- `src/components/sections/` — reusable page sections (page hero, split section, feature grid,
  FAQ, CTA, client logos, industry page template, legal document).
- `src/app/` — one folder per URL; pages compose sections from content.
- `public/img/` — optimised images (WebP). Add new ones to `src/content/images.ts` with their size.

## Homepage experience

The homepage adapts Connectoi's split hero, alternating light/dark sections and illustrated
product storytelling to ZenxPOS's charcoal surfaces and neon cyan highlights. It lives in `src/app/page.tsx`
and `src/app/home.css`, with business, feature, workflow and FAQ data in
`src/content/experience.ts`.

- `src/components/home/pos-demo.tsx` is an interactive, browser-only sample checkout.
  Products and categories are clickable; payment prints a sample receipt; the reset control
  starts a new sale. It does not call payment or order APIs.
- `workflow-showcase.tsx` provides keyboard-accessible scan, print and report tabs.
- `home-motion.tsx` manages scroll reveals and offscreen/document visibility. Animations
  loop automatically at 1.3× speed on the homepage and 1.1× on inner pages, with a short
  grace period after sample POS interactions. The homepage speed is scoped through `HomeMotion`.
  They respect the system's reduced-motion preference. Pointer depth runs only while easing to a new
  position, with no idle animation-frame loop. Content remains visible without JavaScript.
- Animation uses CSS transforms and opacity; no animation library is required.
- Custom artwork is in `public/img/generated/`. The WebP files are used on the page;
  original PNGs and the exact built-in imagegen prompts are retained in that directory.

Quote links lead to `/pricing#quote`; contact links use `/contact-us#contact`.
All prices, orders and chart values inside the previews are illustrative sample data.

## Plans and enquiries

- `/pricing` contains Standard and Premium plan cards, the feature comparison at
  `#comparison`, and the quote form at `#quote`. There are no advertised subscription
  amounts. Standard focuses on everyday store operations; Premium adds the multi-store
  and integrations discussion. Final inclusions, limits and integrations are confirmed
  in the quote. These are website plan definitions, not backend entitlement enforcement.
- `src/components/contact/pricing-inquiry.tsx` preserves the selected plan in a separate
  API field even when someone edits the subject.
- `contact-form.tsx` shares controlled fields, validation, error recovery, pending and
  success states between pricing and contact. Mobile inputs use 16px text and stack in
  one column. A failed request preserves the entered details.
- Both forms send structured enquiry details, including the request type, selected plan,
  subject and message. A UUID is reused after failed/uncertain submissions; the backend
  makes identical retries idempotent. A new request from the same email or mobile is allowed.
- `.env.example` documents the backend connection. Browser verification uses intercepted
  API responses and never creates real enquiries.
- New neon artwork: `zenx-pricing-world.webp`, `zenx-support-neon.webp` and
  `zenx-merchant-neon.webp` under `public/img/generated/`, with original PNGs and prompts.

## Inner page experience

- `/about-us`, `/services`, `/integrations` and `/hardware` share the dark-and-cyan
  presentation in `src/components/marketing/marketing-page.tsx` and `marketing.css`.
  Each route has a scoped stylesheet for its own product story and visual scenes.
- The shared shell reuses the homepage motion controller: automatic 1.1× loops,
  scroll reveals and reduced-motion/offscreen handling, with no playback controls.
- Integrations includes an illustrative connection map, payment flow and weighing
  example. Hardware presents kit options and equipment; compatibility is confirmed
  for each setup. Services retains all four industry destinations.
- About uses `public/img/generated/zenx-team-cyan.webp`; its original PNG and exact
  built-in imagegen prompt are saved alongside the other generated artwork.
