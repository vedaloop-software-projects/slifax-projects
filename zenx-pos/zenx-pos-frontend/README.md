# ZenxPOS website

Marketing site for ZenxPOS (Next.js App Router, Tailwind CSS). Every page is static
(`ensureStatic = 'navigation'` on the root layout).

## Run

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start
```

The contact / Book a Demo form posts to `POST {NEXT_PUBLIC_API_BASE_URL}/registerBusiness`, so
enquiries appear under Registrations in super admin. Add the site's origin to the backend's
`CORS_ALLOWED_ORIGINS`.

## Where things live

- `src/content/` — all page text, images and links (edit content here, not in components).
  `site.ts` holds navigation, contact details and client logos.
- `src/components/ui/` — primitives (container, section heading, buttons, check list).
- `src/components/sections/` — reusable page sections (page hero, split section, feature grid,
  FAQ, CTA, client logos, industry page template, legal document).
- `src/app/` — one folder per URL; pages compose sections from content.
- `public/img/` — optimised images (WebP). Add new ones to `src/content/images.ts` with their size.
