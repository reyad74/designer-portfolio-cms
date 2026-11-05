"""Backend API test suite (pytest + pytest-django).

Covers the load-bearing behaviors of the CMS contract:
envelope, auth, publishing workflow, scheduled publishing, contact form
(honeypot/rate limit), media validation + reference-safe deletion, homepage
builder semantics, theme validation, and the revision/restore engine.
"""
import base64
import json
from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cms.models import HomepageSection, Service, Testimonial, ThemeConfig, WebsiteSetting
from apps.core.rate import _buckets
from apps.inquiries.models import ContactInquiry
from apps.portfolio.models import Project, ProjectCategory, ProjectImage

PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _fresh_buckets():
    _buckets.clear()
    yield
    _buckets.clear()


@pytest.fixture
def admin():
    from django.contrib.auth.hashers import make_password

    from apps.accounts.models import AdminUser

    return AdminUser.objects.create(
        email="test@vale.studio", passwordHash=make_password("TestPass#2026"), name="Test Admin"
    )


@pytest.fixture
def auth_client(admin):
    client = APIClient()
    res = client.post(
        "/api/v1/admin/auth/login", {"email": "test@vale.studio", "password": "TestPass#2026"}, format="json"
    )
    assert res.status_code == 200
    return client


@pytest.fixture
def category():
    return ProjectCategory.objects.create(name="QA Category", slug="qa-category", order=1)


def _project_payload(category, slug="qa-project", status="DRAFT", **kw):
    payload = {
        "title": "QA Project", "slug": slug,
        "summary": "A summary long enough for validation.",
        "description": "A description long enough for validation.",
        "categoryId": category.id, "status": status, "clientName": "", "tools": "",
        "thumbnailUrl": "", "coverUrl": "", "accentColor": "", "objectives": "",
        "challenges": "", "research": "", "strategy": "", "concept": "", "outcome": "",
        "colorPalette": "", "typography": "", "applications": "",
        "featured": False, "order": 0, "seoTitle": "", "seoDescription": "",
    }
    payload.update(kw)
    return payload


# ─────────────────────────── auth ───────────────────────────


def test_admin_endpoints_require_auth():
    client = APIClient()
    res = client.get("/api/v1/admin/dashboard")
    assert res.status_code == 401
    assert res.json() == {"success": False, "error": "Authentication required"}


def test_login_rejects_bad_credentials(admin):
    client = APIClient()
    res = client.post(
        "/api/v1/admin/auth/login", {"email": "test@vale.studio", "password": "wrong-password"}, format="json"
    )
    assert res.status_code == 401


def test_login_sets_http_only_cookie_and_me_works(admin):
    client = APIClient()
    res = client.post(
        "/api/v1/admin/auth/login", {"email": "TEST@vale.studio", "password": "TestPass#2026"}, format="json"
    )
    assert res.status_code == 200
    cookie = res.cookies["av_admin_token"]
    assert cookie["httponly"] and cookie["samesite"] == "Lax"
    res = client.get("/api/v1/admin/auth/me")
    assert res.status_code == 200
    assert res.json()["data"]["email"] == "test@vale.studio"


# ─────────────────────────── publishing workflow ───────────────────────────


def test_public_projects_exclude_draft_archived_and_scheduled(auth_client, category):
    client = auth_client
    Project.objects.create(
        title="Draft", slug="p-draft", summary="s" * 20, description="d" * 20,
        category=category, status=Project.DRAFT,
    )
    Project.objects.create(
        title="Archived", slug="p-archived", summary="s" * 20, description="d" * 20,
        category=category, status=Project.ARCHIVED,
    )
    Project.objects.create(
        title="Scheduled", slug="p-scheduled", summary="s" * 20, description="d" * 20,
        category=category, status=Project.PUBLISHED,
        publishAt=timezone.now() + timedelta(days=7),
    )
    Project.objects.create(
        title="Live", slug="p-live", summary="s" * 20, description="d" * 20,
        category=category, status=Project.PUBLISHED,
    )
    res = client.get("/api/v1/projects")
    slugs = [p["slug"] for p in res.json()["data"]]
    assert slugs == ["p-live"]

    res = client.get("/api/v1/projects/p-scheduled")
    assert res.status_code == 404

    # once the schedule passes, it becomes public
    Project.objects.filter(slug="p-scheduled").update(publishAt=timezone.now() - timedelta(minutes=1))
    res = client.get("/api/v1/projects/p-scheduled")
    assert res.status_code == 200


def test_project_slug_conflict_returns_409(auth_client, category):
    client = auth_client
    res = client.post("/api/v1/admin/projects", _project_payload(category), format="json")
    assert res.status_code == 201
    res = client.post("/api/v1/admin/projects", _project_payload(category), format="json")
    assert res.status_code == 409


def test_project_validation_and_comma_normalization(auth_client, category):
    client = auth_client
    payload = _project_payload(category, slug="normal-project", tools="Figma, Blender")
    res = client.post("/api/v1/admin/projects", payload, format="json")
    assert res.status_code == 201
    assert res.json()["data"]["tools"] == json.dumps(["Figma", "Blender"])

    bad = _project_payload(category, slug="bad title", status="DRAFT")
    res = client.post("/api/v1/admin/projects", bad, format="json")
    assert res.status_code == 422
    body = res.json()
    assert body["success"] is False and body["error"] == "Validation failed"


def test_admin_project_patch_replaces_gallery(auth_client, category):
    client = auth_client
    res = client.post(
        "/api/v1/admin/projects",
        _project_payload(category, images=[{"url": "/uploads/demo/project-lumen-brand.png", "alt": "one"}]),
        format="json",
    )
    pid = res.json()["data"]["id"]
    res = client.patch(
        f"/api/v1/admin/projects/{pid}",
        _project_payload(
            category,
            images=[
                {"url": "/uploads/demo/gallery-poster-detail.png", "alt": "a"},
                {"url": "/uploads/demo/gallery-brand-stationery.png", "alt": "b"},
            ],
        ),
        format="json",
    )
    assert res.status_code == 200
    assert ProjectImage.objects.filter(project_id=pid).count() == 2


# ─────────────────────────── contact form ───────────────────────────


def test_contact_creates_inquiry():
    client = APIClient()
    res = client.post(
        "/api/v1/contact",
        {
            "fullName": "Jane Tester", "email": "jane@example.com", "projectType": "Branding",
            "message": "A perfectly reasonable message that is definitely long enough.",
        },
        format="json",
    )
    assert res.status_code == 201
    assert res.json()["data"]["received"] is True
    assert ContactInquiry.objects.filter(email="jane@example.com", status="UNREAD").exists()


def test_contact_honeypot_silently_discards():
    client = APIClient()
    res = client.post(
        "/api/v1/contact",
        {
            "fullName": "Bot", "email": "bot@example.com", "projectType": "Spam",
            "message": "Buy my thing now please thank you good day.", "website": "http://spam",
        },
        format="json",
    )
    assert res.status_code == 200
    assert not ContactInquiry.objects.filter(email="bot@example.com").exists()


def test_contact_rate_limit():
    client = APIClient()
    payload = {
        "fullName": "Rate Tester", "email": "rate@example.com", "projectType": "Branding",
        "message": "Another perfectly reasonable message that is long enough.",
    }
    for _ in range(5):
        res = client.post("/api/v1/contact", payload, format="json")
        assert res.status_code == 201
    res = client.post("/api/v1/contact", payload, format="json")
    assert res.status_code == 429
    assert res.json()["success"] is False


def test_contact_validation_422():
    client = APIClient()
    res = client.post(
        "/api/v1/contact", {"fullName": "X", "email": "nope", "projectType": "", "message": "short"}, format="json"
    )
    assert res.status_code == 422


# ─────────────────────────── media library ───────────────────────────


def test_media_upload_validates_magic_bytes(auth_client):
    client = auth_client
    fake = SimpleUploadedFile("evil.png", b"#!/bin/sh\nevil", content_type="image/png")
    res = client.post("/api/v1/admin/media", {"file": fake, "folder": "profile"}, format="multipart")
    assert res.status_code == 415


def test_media_upload_and_reference_safe_delete(auth_client, category):
    client = auth_client
    res = client.post(
        "/api/v1/admin/media",
        {"file": SimpleUploadedFile("pixel.png", PNG_1PX, content_type="image/png"), "folder": "projects", "alt": "px"},
        format="multipart",
    )
    assert res.status_code == 201
    asset = res.json()["data"]
    assert asset["width"] == 1 and asset["height"] == 1
    assert asset["url"].startswith("/uploads/projects/")

    # reference it from a published project
    project = Project.objects.create(
        title="Covered", slug="p-covered", summary="s" * 20, description="d" * 20,
        category=category, status=Project.PUBLISHED, thumbnailUrl=asset["url"],
    )
    res = client.delete(f"/api/v1/admin/media/{asset['id']}")
    assert res.status_code == 409
    body = res.json()
    assert body["success"] is False and body["details"][0]["type"] == "project"

    # detach → deletion succeeds
    Project.objects.filter(pk=project.pk).update(thumbnailUrl="")
    res = client.delete(f"/api/v1/admin/media/{asset['id']}")
    assert res.status_code == 200
    assert res.json()["data"]["deleted"] is True


def test_media_patch_alt_caption_folder(auth_client):
    client = auth_client
    res = client.post(
        "/api/v1/admin/media",
        {"file": SimpleUploadedFile("cap.png", PNG_1PX, content_type="image/png"), "folder": "general"},
        format="multipart",
    )
    aid = res.json()["data"]["id"]
    res = client.patch(f"/api/v1/admin/media/{aid}", {"alt": "new alt", "caption": "new caption"}, format="json")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["alt"] == "new alt" and data["caption"] == "new caption"


# ─────────────────────────── homepage builder ───────────────────────────


def test_public_homepage_only_published_visible_ordered():
    HomepageSection.objects.all().delete()
    HomepageSection.objects.create(sectionType="contact_cta", order=3, status="PUBLISHED", isVisible=True)
    HomepageSection.objects.create(sectionType="hero", order=1, status="DRAFT", isVisible=True)
    HomepageSection.objects.create(sectionType="marquee", order=2, status="PUBLISHED", isVisible=False)
    HomepageSection.objects.create(sectionType="about_preview", order=4, status="PUBLISHED", isVisible=True)

    client = APIClient()
    res = client.get("/api/v1/homepage")
    types = [s["sectionType"] for s in res.json()["data"]]
    assert types == ["contact_cta", "about_preview"]


def test_sections_crud_reorder(auth_client):
    client = auth_client
    res = client.post("/api/v1/admin/sections", {"sectionType": "skills_preview", "config": {"limit": 3}}, format="json")
    assert res.status_code == 201
    sid = res.json()["data"]["id"]

    res = client.patch(f"/api/v1/admin/sections/{sid}", {"status": "PUBLISHED", "title": "Toolkit"}, format="json")
    assert res.json()["data"]["status"] == "PUBLISHED"

    other = HomepageSection.objects.create(sectionType="hero", order=9, status="PUBLISHED", isVisible=True)
    res = client.post("/api/v1/admin/sections/reorder", {"order": [sid, other.id]}, format="json")
    assert res.status_code == 200
    assert HomepageSection.objects.get(pk=sid).order == 0
    assert HomepageSection.objects.get(pk=other.id).order == 1


def test_featured_section_resolves_projects(auth_client, category):
    client = auth_client
    Project.objects.create(
        title="Feat", slug="p-feat", summary="s" * 20, description="d" * 20,
        category=category, status=Project.PUBLISHED, featured=True,
    )
    section = HomepageSection.objects.create(
        sectionType="featured_projects", order=1, status="PUBLISHED", isVisible=True,
        config={"limit": 1, "mode": "auto"},
    )
    res = client.get("/api/v1/homepage")
    item = next(s for s in res.json()["data"] if s["id"] == section.id)
    assert len(item["projects"]) == 1
    assert item["projects"][0]["slug"] == "p-feat"


# ─────────────────────────── theme ───────────────────────────


def test_theme_validation_and_public_endpoint():
    ThemeConfig.objects.update_or_create(id="theme", defaults={"primaryColor": "#123456"})
    client = APIClient()
    res = client.get("/api/v1/theme")
    assert res.status_code == 200
    assert res.json()["data"]["primaryColor"] == "#123456"

    from django.contrib.auth.hashers import make_password

    from apps.accounts.models import AdminUser

    auth = APIClient()
    AdminUser.objects.create(email="t2@vale.studio", passwordHash=make_password("TestPass#2026"), name="T2")
    auth.post("/api/v1/admin/auth/login", {"email": "t2@vale.studio", "password": "TestPass#2026"}, format="json")
    res = auth.patch("/api/v1/admin/theme", {"primaryColor": "nothex"}, format="json")
    assert res.status_code == 422
    res = auth.patch("/api/v1/admin/theme", {"primaryColor": "#FF8800", "mode": "LIGHT"}, format="json")
    assert res.status_code == 200
    res = APIClient().get("/api/v1/theme")
    assert res.json()["data"]["primaryColor"] == "#FF8800"


# ─────────────────────────── revisions ───────────────────────────


def test_revision_snapshot_and_restore_roundtrip(auth_client, category):
    client = auth_client
    res = client.post("/api/v1/admin/projects", _project_payload(category), format="json")
    pid = res.json()["data"]["id"]

    res = client.patch(f"/api/v1/admin/projects/{pid}", _project_payload(category, title="Changed Title"), format="json")
    assert res.status_code == 200

    res = client.get(f"/api/v1/admin/revisions?content=portfolio.project&id={pid}")
    revs = res.json()["data"]
    assert len(revs) >= 2  # create + update (newest first)
    assert revs[0]["action"] == "update"

    # restoring the EARLIER snapshot reverts the later change
    res = client.post(f"/api/v1/admin/revisions/{revs[1]['id']}/restore")
    assert res.status_code == 200
    assert Project.objects.get(pk=pid).title == "QA Project"  # restored


def test_revision_restore_handles_empty_strings(auth_client):
    """Regression: snapshots containing empty-string fields must restore cleanly."""
    client = auth_client
    res = client.post(
        "/api/v1/admin/sections",
        {"sectionType": "marquee", "status": "PUBLISHED", "title": ""},  # empty title snapshotted
        format="json",
    )
    assert res.status_code == 201
    sid = res.json()["data"]["id"]
    res = client.patch(f"/api/v1/admin/sections/{sid}", {"title": "Temp Title"}, format="json")
    assert res.status_code == 200
    res = client.get(f"/api/v1/admin/revisions?content=cms.homepagesection&id={sid}")
    revs = res.json()["data"]
    create_rev = next(r for r in revs if r["action"] == "create")  # snapshot with title=""
    res = client.post(f"/api/v1/admin/revisions/{create_rev['id']}/restore")
    assert res.status_code == 200
    assert HomepageSection.objects.get(pk=sid).title == ""


def test_deleted_snapshot_cannot_be_restored(auth_client, category):
    client = auth_client
    res = client.post("/api/v1/admin/projects", _project_payload(category), format="json")
    pid = res.json()["data"]["id"]
    client.delete(f"/api/v1/admin/projects/{pid}")
    res = client.get(f"/api/v1/admin/revisions?content=portfolio.project&id={pid}")
    delete_rev = next(r for r in res.json()["data"] if r["action"] == "delete")
    res = client.post(f"/api/v1/admin/revisions/{delete_rev['id']}/restore")
    assert res.status_code == 400


# ─────────────────────────── content visibility ───────────────────────────


def test_public_content_filters():
    client = APIClient()
    Service.objects.create(title="Draft Service", slug="svc-draft", shortDescription="short", description="long enough", status="DRAFT")
    Service.objects.create(title="Live Service", slug="svc-live", shortDescription="short", description="long enough", status="PUBLISHED")
    res = client.get("/api/v1/services")
    slugs = [s["slug"] for s in res.json()["data"]]
    assert "svc-live" in slugs and "svc-draft" not in slugs

    Testimonial.objects.create(clientName="Hidden", review="x" * 20, published=False)
    Testimonial.objects.create(clientName="Shown", review="y" * 20, published=True)
    res = client.get("/api/v1/testimonials")
    names = [t["clientName"] for t in res.json()["data"]]
    assert "Shown" in names and "Hidden" not in names

    WebsiteSetting.objects.get_or_create(id="main")
    res = client.get("/api/v1/settings")
    assert "hero3dEnabled" in res.json()["data"]
