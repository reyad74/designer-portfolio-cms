# Build context = repository ROOT (see docker-compose.yml).
# This lets the image bundle public/uploads demo media so a fresh Docker
# volume gets populated on first start.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv .venv
COPY backend/requirements.txt .
RUN .venv/bin/pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/

# Demo media shipped with the repo (referenced by the seeded CMS rows).
# Copied into the shared uploads volume on start — `cp -n` never
# overwrites media uploaded later through the admin panel.
COPY public/uploads/ /opt/seed-uploads/

EXPOSE 8000

CMD ["sh", "-c", "\
    mkdir -p /app/public/uploads && \
    cp -rn /opt/seed-uploads/. /app/public/uploads/ 2>/dev/null || true; \
    .venv/bin/python manage.py migrate --noinput && \
    if [ \"$SEED_DEMO\" != \"0\" ]; then .venv/bin/python manage.py seed_demo; fi; \
    exec .venv/bin/gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 --workers 3 --timeout 120 \
        --access-logfile - --error-logfile -"]
