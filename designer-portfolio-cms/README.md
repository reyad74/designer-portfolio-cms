# Adrian Vale® — Premium Graphic Designer Portfolio + CMS

> 📘 **Setup / run / publish instructions: [`SETUP.md`](./SETUP.md)** —
> run with Docker on your PC (`docker compose up -d --build`) or deploy to
> a VPS / Vercel+Railway in minutes.

A production-grade portfolio website that is **100% administrator-controlled**:
every headline, image, project, service, colour and section order on the public
site is stored in PostgreSQL/SQLite and editable through the admin dashboard —
no code changes required. Dark-luxury editorial design, interactive Three.js
hero, independent Django REST backend, JWT auth, media library, publishing
workflow with draft previews, and revision history with restore.

> **All portfolio content is clearly-marked demo content** (persona
> "Adrian Vale", seeded projects, generated artwork, sample testimonials).
> Replace it through the admin dashboard.

---

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  ADMIN SPA  (#/admin — React, TanStack Query, shadcn/ui, dnd-kit)    │
│  Homepage Builder · Projects · Media · Theme · Navigation · Revisions│
└──────────────┬───────────────────────────────────────────────────────┘
               │ same-origin fetch  /api/v1/admin/*
               ▼  (next.config.ts beforeFiles rewrites)
┌──────────────────────────────────────────────────────────────────────┐
│  DJANGO 5 + DRF  (backend/) — SOURCE OF TRUTH                        │
│  21 models · public API serves ONLY published content · JWT cookie   │
│  Pillow image optimisation · reference-safe media deletion           │
│  Revision snapshots (view / restore) · throttling · Swagger          │
└──────────────┬───────────────────────────────────────────────────────┘
               │ /api/v1/* (proxied through Next.js — same origin)
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  NEXT.JS 16 SPA (repo root, hash-routed views on "/")                │
│  Dynamic homepage = HomepageSection records (order IS the layout)    │
│  ThemeConfig → CSS variables (colours/fonts/radius/spacing live)     │
│  Server-generated metadata from WebsiteSetting (SEO/OG)              │
└──────────────────────────────────────────────────────────────────────┘
```

**Data-sync on publish:** admin action → Django validates → saves → TanStack
Query cache invalidation + 15–60s freshness window → public pages re-fetch.
All public fetches use `cache:"no-store"`, so content changes are visible on
the next page load without any deployment step. The Django auto-starts with
the Next.js server via `src/instrumentation.ts`.

## 2. Repository layout

```
├── app/src (Next.js)
│   ├── app/page.tsx                 # SPA shell (hash router)
│   ├── app/layout.tsx               # fonts + dynamic SEO metadata (from CMS)
│   ├── app/api/revalidate/…         # (removed Next API v1 handlers — Django is the API)
│   ├── components/sections/section-renderer.tsx   # DB-driven homepage
│   ├── components/views/            # 10 public views + admin/* dashboard
│   ├── components/three-d/          # R3F hero (settings-driven, WebGL/reduced-motion fallback)
│   ├── components/views/preview-*   # authorized draft previews (device toggles)
│   ├── lib/theme.ts                 # ThemeConfig → CSS variables
│   └── instrumentation.ts           # boots Django alongside Next
├── backend/                         # Django project (independent)
│   ├── config/                      # settings (env-driven), urls, wsgi
│   ├── apps/core/                   # envelope, JWT cookie auth, rate limits,
│   │                                # pagination, Revision engine, Swagger
│   ├── apps/accounts/               # AdminUser, login/me/refresh/logout, dashboard
│   ├── apps/cms/                    # Profile, Service, Skill, resume items,
│   │                                # Testimonial, SocialLink, WebsiteSetting,
│   │                                # ThemeConfig, NavigationItem, HomepageSection,
│   │                                # MediaAsset + seed_demo command
│   ├── apps/portfolio/              # ProjectCategory, Project (+ARCHIVED/publishAt), ProjectImage
│   ├── apps/inquiries/              # ContactInquiry (+ honeypot + throttling)
│   ├── tests/test_api.py            # 22 pytest cases
│   └── requirements.txt
├── scripts/acceptance.py            # the 10-scenario final acceptance test
├── docker-compose.yml               # Postgres + gunicorn + standalone Next
├── Dockerfile.frontend / backend/Dockerfile
└── .env.example
```

## 3. Quick start (dev — as running in this sandbox)

```bash
# backend (first time)
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
backend/.venv/bin/python backend/manage.py migrate
backend/.venv/bin/python backend/manage.py seed_demo      # demo content + admin

# run everything
bun run dev          # Next.js on :3000 — instrumentation auto-starts Django on :8000
```

- Public site: **`/`** (hash routes: `#/portfolio`, `#/services`, `#/contact`, …)
- Admin dashboard: **`/#/admin`** — demo credentials
  **`admin@vale.studio` / `ValeStudio#2026`** (displayed on the login screen;
  change via `ADMIN_EMAIL`/`ADMIN_PASSWORD` env before any real deployment)
- Draft previews: `#/preview/home`, `#/preview/project/<slug>` (admin session required)
- API docs: **`/api/docs`** (Swagger UI), `/api/schema` (OpenAPI)

## 4. The admin can, without touching code

| Capability | Where |
|---|---|
| Edit every homepage heading / subtitle / CTA / stats | Homepage Builder |
| Reorder, hide, draft/publish, add & delete homepage sections | Homepage Builder (drag & drop) |
| Full project CRUD incl. case-study chapters, palette, gallery reorder, SEO, **archive**, **scheduled publishing** | Projects |
| Upload images (magic-byte validation, auto-optimisation + thumbnails, alt/caption, **reference-safe deletion**) | Media Library |
| Theme: colours, dark/light, fonts, base size, radius, button/spacing/card style (live preview) | Appearance |
| Header/footer navigation menus (order, visibility, new tab) | Navigation |
| Profile, availability, stats, CV file | Profile |
| Site name, logo, SEO metadata, OG image, contact info, footer, **3D/animation flags** | Website Settings |
| Testimonials approval (`published` switch = moderation) | Testimonials |
| Inquiries inbox (read/archive/internal notes) | Inquiries |
| Revision history + one-click restore (projects, sections, profile, settings, theme) | History (clock icon) |
| Authorized draft previews with desktop/tablet/mobile frames | Preview buttons |

## 5. API surface

Public (`/api/v1/`, read-only, published-only): `profile` · `settings` ·
`theme` · `navigation` · `homepage` · `projects` (filters/sort/search/pagination)
· `projects/featured` · `projects/categories` · `projects/{slug}` · `services`
· `skills` · `resume` · `testimonials` · `POST contact` (honeypot + 5/h throttle).

Admin (`/api/v1/admin/`, JWT httpOnly cookie, server-enforced): `auth/login|
me|refresh|logout` · `dashboard` · `projects` (+gallery replace, publish
states, `publishAt`) · `categories` · `services` · `skills` · `experience` ·
`education` · `certifications` · `achievements` · `testimonials` · `inquiries`
· `profile` · `settings` · `theme` · `sections` (+`reorder`) · `navigation`
(+`reorder`) · `media` (multipart upload, optimisation, 409-reference delete)
· `revisions` (+`restore`) · `preview/homepage` · `preview/project/{slug}`.

Response envelope everywhere:
`{"success":true,"data":[…],"meta":{page,limit,total,totalPages}}` /
`{"success":false,"error":"…","details":[…]}` with 401/404/409/413/415/422/429
semantics preserved.

## 6. Testing

```bash
cd backend && .venv/bin/python -m pytest tests -q        # 22 tests — auth, publishing,
                                                          # scheduling, honeypot, rate limit,
                                                          # media validation, revisions, theme
python3 scripts/acceptance.py                            # 17 checks — the 10 required
                                                          # admin→public scenarios + restore
bun run lint                                             # ESLint (clean)
```

The acceptance suite mutates content and cleans up after itself; it must pass
100% before any release.

## 7. Production deployment

**Docker Compose (recommended parity):** `cp .env.example .env`, fill secrets,
`docker compose up --build --detach` → Postgres + gunicorn + standalone Next.
Uploads live in a shared volume served by Next (`/uploads/…`).

**Managed hosting:** frontend → Vercel (set `DJANGO_INTERNAL_URL`,
`JWT_SECRET`, `NEXT_PUBLIC_SITE_URL`); backend → Render/Railway with
`DATABASE_URL` (Postgres), `UPLOAD_ROOT` on a persistent disk or swap the
storage helper for S3/Cloudinary (single module: `apps/cms/views.py::_detect_mime`/
save path). CORS is unnecessary (same-origin proxy), but the proxy target must
be reachable from the frontend server.

## 8. Honest limitations

- **Database:** the sandbox runs SQLite (identical ORM code); production uses
  PostgreSQL via `DATABASE_URL` (compose file provided).
- **Rate limiting & revisions** are in-memory/single-node (documented swap
  points for Redis / DB-backed counters if horizontal scaling is needed).
- **Scheduled publishing** is evaluated per request (no background worker
  needed) — timezone-naive values are treated as UTC.
- **Draft preview** requires an admin session in the same browser (cookie-gated
  endpoints); there is no signed anonymous preview-link sharing.
- **SVG uploads** are allowed (magic-byte checked) but not sanitised — upload
  SVGs from trusted sources only, or remove `image/svg+xml` from the allow-list.
- **3D model upload**: hero scene is procedural; a `heroFallbackUrl` image is
  supported, but `.glb` model replacement is not wired (flag reserved in
  settings).
- **Light mode** is token-driven; a few decorative utilities (text-outline,
  noise) are tuned for dark backgrounds.
- `gsap`/`next-auth`/`prisma` remain installed from the earlier scaffold but
  are unused at runtime (Prisma was replaced by Django; `prisma/schema.prisma`
  and `scripts/seed.ts` are kept as historical reference only).
