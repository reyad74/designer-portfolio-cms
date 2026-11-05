# 🚀 Setup Guide — 3D Designer Portfolio CMS

Full-stack, database-driven portfolio website:
**Next.js 16** (frontend) + **Django 5 / DRF** (backend API) + **PostgreSQL**.
Everything on the site — name, homepage sections, projects, services, theme
colors, SEO, media — is editable from the built-in admin panel at `#/admin`.

```
┌─────────────────┐      /api/v1/* (proxy)      ┌──────────────────┐
│  Next.js 16     │ ──────────────────────────► │  Django 5 + DRF  │
│  (this repo /)  │                             │  (backend/)      │
│  port 3000      │ ◄────────────────────────── │  gunicorn :8000  │
└───────┬─────────┘        JSON + JWT cookie   └────────┬─────────┘
        │  serves /uploads/* media files                │
        │                                    ┌──────────▼─────────┐
        └───────────────────────────────────►│  PostgreSQL 16     │
             shared uploads volume           └────────────────────┘
```

---

## 1. Requirements (your PC)

You need **only one thing**:

| Software | Version | Download |
|---|---|---|
| **Docker Desktop** | 4.27+ (Compose v2.24+) | https://www.docker.com/products/docker-desktop/ |

- **Windows**: install Docker Desktop, keep WSL2 backend enabled (installer does this automatically). Restart after install.
- **macOS**: install Docker Desktop, launch it once.
- **Linux**: install Docker Engine + the compose plugin (`sudo apt install docker.io docker-compose-v2` on Ubuntu, or follow https://docs.docker.com/engine/install/).

Check it works:

```bash
docker compose version     # must print v2.24.0 or newer
```

> No Python or Node.js installation is needed on your PC — everything
> runs inside Docker containers.

---

## 2. Quick start (5 minutes)

```bash
# 1. Unzip the project and go into the folder
unzip designer-portfolio-cms.zip
cd designer-portfolio-cms

# 2. Create your environment file
cp .env.example .env          # Windows (PowerShell): copy .env.example .env

# 3. Set your secrets — open .env in any editor and change:
#      ADMIN_EMAIL / ADMIN_PASSWORD   → your admin login
#      DJANGO_SECRET_KEY / JWT_SECRET → paste two different random hex strings
#      POSTGRES_PASSWORD              → a database password
#      NEXT_PUBLIC_SITE_URL           → http://localhost:3000 (for now)
#
#    Generate strong secrets with (any terminal with python):
python -c "import secrets; print(secrets.token_hex(32))"

# 4. Build and start everything (first build takes 3–6 minutes)
docker compose up -d --build

# 5. Watch it come alive (wait until you see "gunicorn" boot logs)
docker compose logs -f backend
#    (Ctrl+C to stop watching — containers keep running)
```

Then open:

| URL | What |
|---|---|
| **http://localhost:3000** | The portfolio website |
| **http://localhost:3000/#/admin** | Admin panel (login with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`) |
| http://localhost:3000/api/docs | Auto-generated API documentation (Swagger) |

**First boot seeds demo content** (projects, services, testimonials…) so the
site never looks empty. It is marked "Demo content" and you can edit or
delete every piece of it from the admin panel. To start with an **empty
site**, set `SEED_DEMO=0` in `.env` **before the first start**.

---

## 3. Daily commands

```bash
docker compose ps                 # what is running
docker compose logs -f frontend   # frontend logs (Ctrl+C to exit)
docker compose logs -f backend    # API logs
docker compose stop               # stop (keeps all data)
docker compose start              # start again
docker compose restart backend    # restart one service

# Completely reset (⚠ deletes ALL content + media + database):
docker compose down -v
docker compose up -d --build
```

Your data lives in two Docker volumes (`pgdata`, `uploads`) — it survives
restarts and reboots.

### Change the admin password later

```bash
docker compose exec backend .venv/bin/python manage.py set_admin_password you@example.com
```

---

## 4. Managing content (no coding)

Log in at `#/admin`:

| Section | What you can do |
|---|---|
| **Homepage Builder** | Edit every homepage section, **drag to reorder**, publish/hide each one |
| **Projects / Categories** | Full portfolio CRUD, gallery images, case studies, publish/draft |
| **Services / Skills** | What-you-do and toolkit sections |
| **Experience & CV** | Jobs, education, certifications, achievements, CV file |
| **Testimonials** | Client reviews with ratings |
| **Inquiries** | Messages from the contact form (read/archive) |
| **Appearance** | Theme colors, fonts, corner radius, buttons — **live preview** |
| **Navigation / Social** | Menu items and social links |
| **Media Library** | Upload images (they appear on the site instantly) |
| **Profile / Website Settings** | **Site name**, logo wordmark, SEO title/description, contact info |
| **Revisions (History)** | Every change is versioned — compare and restore |

Everything you save is live on the site **immediately** — no rebuild needed.

---

## 5. Publishing to production

### Option A — VPS with a domain (recommended, ~$5/mo)

Works on any Ubuntu VPS (Hetzner, DigitalOcean, Vultr, AWS Lightsail…).

```bash
# On your PC: copy the project + .env to the server
scp -r ./designer-portfolio-cms user@YOUR_SERVER_IP:~/app

# On the server:
ssh user@YOUR_SERVER_IP
cd ~/app
nano .env          # ← IMPORTANT: new secrets + NEXT_PUBLIC_SITE_URL=https://yourdomain.com
                   #    DJANGO_ALLOWED_HOSTS=backend,localhost,127.0.0.1,yourdomain.com
docker compose up -d --build
```

Point your domain's **A record** to the server IP, then add HTTPS with Caddy
(automatic Let's Encrypt certificates):

```bash
sudo apt install -y caddy
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

Done — **https://yourdomain.com** is live with auto-renewing TLS.

### Option B — Vercel (frontend) + Railway (backend + database)

1. **Backend + DB → Railway** (railway.app): create a PostgreSQL instance and
   a service from the `backend/` folder (start command:
   `python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:8000`).
   Set env vars from `.env` (`DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY`,
   `JWT_SECRET`, `DATABASE_URL` given by Railway, `DJANGO_ALLOWED_HOSTS=*`).
2. **Frontend → Vercel**: import the repo. Set `DJANGO_INTERNAL_URL` to your
   Railway backend URL and `NEXT_PUBLIC_SITE_URL` to your Vercel URL.
   ⚠ Vercel's filesystem is read-only/ephemeral — for media uploads use an
   S3/Cloudinary-backed storage or keep the media on the Railway volume.

> Option A keeps everything self-hosted and simplest — media uploads work
> out of the box.

---

## 6. Backups

```bash
# Database
docker compose exec db pg_dump -U portfolio portfolio > backup_$(date +%F).sql

# Restore
cat backup_2026-01-01.sql | docker compose exec -T db psql -U portfolio portfolio

# Media files (upload volume)
docker run --rm -v designer-portfolio-cms_uploads:/data -v $(pwd):/out \
    alpine tar czf /out/uploads-backup.tar.gz -C /data .
```

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| Port 3000 already in use | Change `APP_PORT=3001` in `.env`, then `docker compose up -d` |
| Site loads but API returns 400 | Add your host to `DJANGO_ALLOWED_HOSTS` in `.env`, restart backend |
| Images missing after first start | `docker compose restart backend frontend` — demo media is copied into the uploads volume on boot |
| Forgot admin password | `docker compose exec backend .venv/bin/python manage.py set_admin_password your@email.com` |
| Wants a fresh empty site | Set `SEED_DEMO=0`, then `docker compose down -v && docker compose up -d --build` |
| Build fails on `bun install` | Delete `bun.lock`, run again (or pin your node/bun versions) |

---

## 8. Project structure

```
├── src/                    # Next.js frontend (App Router, TS, Tailwind, R3F)
│   ├── app/                # Root page + SPA hash router (#/admin, #/portfolio/…)
│   ├── components/
│   │   ├── views/          # Public views + admin/ (full CMS UI)
│   │   ├── sections/       # Homepage section renderer
│   │   └── three-d/        # 3D hero scene (Three.js / R3F)
│   ├── hooks/  lib/  services/
├── backend/                # Django project (strictly separate)
│   ├── config/             # settings, urls (REST + Swagger)
│   └── apps/
│       ├── accounts/       # Admin users, JWT cookie auth
│       ├── cms/            # Profile, settings, theme, homepage, nav, media, revisions
│       ├── portfolio/      # Projects, categories, images
│       └── inquiries/      # Contact form inquiries
├── public/uploads/         # Demo media (copied into Docker volume on first boot)
├── docker-compose.yml      # db + backend + frontend production stack
├── Dockerfile.frontend     # Next.js standalone multi-stage build
├── backend/Dockerfile      # Django + gunicorn (context: repo root)
└── .env.example            # Copy to .env and edit
```

**Security notes for production**: all secrets come from `.env` (never
committed — `.gitignore` + `.dockerignore` exclude it); the admin API
requires an httpOnly JWT cookie; public API endpoints only expose published
content; uploads are validated (type + 5 MB limit).
