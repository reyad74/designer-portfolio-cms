"""
Django settings for the Portfolio CMS backend.

NOTE ON FIELD NAMING: model fields intentionally use camelCase names so that
DRF ModelSerializers emit JSON keys identical to the legacy Next.js API
contract consumed by the existing SPA frontend (photoUrl, clientName, ...).
The database lives at backend/db.sqlite3 in development; set DATABASE_URL
(e.g. postgres://...) for production — see docker-compose.yml.
"""
import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-portfolio-secret-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() != "false"

if DEBUG:
    ALLOWED_HOSTS = ["*"]
else:
    ALLOWED_HOSTS = [
        h.strip() for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost").split(",") if h.strip()
    ]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "apps.core",
    "apps.accounts",
    "apps.cms",
    "apps.portfolio",
    "apps.inquiries",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
    },
]

_db_url = os.environ.get("DATABASE_URL", "")
# Ignore Prisma-style sqlite URLs ("file:...") inherited from the Next.js .env —
# Django manages its own SQLite file; production points DATABASE_URL at Postgres.
if _db_url and not _db_url.startswith("file:"):
    DATABASES = {"default": dj_database_url.parse(_db_url, conn_max_age=60)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "EXCEPTION_HANDLER": "apps.core.envelope.exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "UNAUTHENTICATED_USER": None,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Portfolio CMS API",
    "DESCRIPTION": "Public + admin API for the fully admin-controlled portfolio website.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# --- Auth / JWT (mirrors legacy contract: HS256 token in av_admin_token cookie, 2h TTL) ---
JWT_SECRET = os.environ.get(
    "JWT_SECRET",
    "dev-portfolio-jwt-secret-9f2c4a8e1d7b3c6f5a0e9d8c7b6a5f4e3d2c1b0a-change-me-in-production",
)
JWT_TTL_SECONDS = int(os.environ.get("JWT_TTL_SECONDS", "7200"))
ADMIN_COOKIE_NAME = os.environ.get("ADMIN_COOKIE_NAME", "av_admin_token")

# --- Media uploads are written into the Next.js public folder so existing
#     /uploads/... URLs keep working for both static and DB-driven content ---
UPLOAD_ROOT = Path(os.environ.get("UPLOAD_ROOT", str(PROJECT_ROOT / "public" / "uploads")))
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"std": {"format": "[django] {levelname} {message}", "style": "{"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "std"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {"api": {"level": "INFO", "propagate": True}},
}
