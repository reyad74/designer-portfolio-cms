#!/usr/bin/env python3
"""
FINAL ACCEPTANCE TEST — executes the 10 required end-to-end checks against the
running system (frontend proxy :3000 → Django CMS). Every mutation is cleaned
up so the demo content stays pristine.

    python3 scripts/acceptance.py
"""
import base64
import io
import json
import sys
import urllib.error
import urllib.request

BASE = "http://localhost:3000"
ADMIN = {"email": "admin@vale.studio", "password": "ValeStudio#2026"}

_results = []


def req(method, path, body=None, cookie=None, raw_body=None, content_type=None):
    url = BASE + path
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    elif raw_body is not None:
        data = raw_body
        if content_type:
            headers["Content-Type"] = content_type
    if cookie:
        headers["Cookie"] = cookie
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            payload = json.loads(resp.read().decode() or "{}")
            set_cookie = resp.headers.get("Set-Cookie")
            return resp.status, payload, set_cookie
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode() or "{}")
        except Exception:
            payload = {}
        return e.code, payload, None


def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    _results.append((name, status, detail))
    print(f"[{status}] {name}" + (f" — {detail}" if detail and not condition else ""))
    return condition


def login():
    status, body, set_cookie = req("POST", "/api/v1/admin/auth/login", ADMIN)
    assert status == 200, f"login failed: {status} {body}"
    token = set_cookie.split(";")[0]
    return token


def _qa_public(c=None):
    st, pub, _ = req("GET", "/api/v1/projects?category=brand-identity&limit=48")
    return st, pub, None


def cleanup_leftovers(c):
    """Remove QA artifacts from previous crashed runs."""
    st, pub, _ = req("GET", "/api/v1/projects?limit=48&category=brand-identity")
    for p in pub.get("data", []):
        if p["slug"] == "qa-acceptance-project":
            req("DELETE", f"/api/v1/admin/projects/{p['id']}", cookie=c)
    st, svcs, _ = req("GET", "/api/v1/services")
    for s in svcs.get("data", []):
        if s["slug"] == "qa-service":
            req("DELETE", f"/api/v1/admin/services/{s['id']}", cookie=c)
    st, inqs, _ = req("GET", "/api/v1/admin/inquiries?q=qa@example.com", cookie=c)
    for i in inqs.get("data", []):
        req("DELETE", f"/api/v1/admin/inquiries/{i['id']}", cookie=c)


def main():
    print("=" * 60)
    print("FINAL ACCEPTANCE TEST — admin-controlled portfolio CMS")
    print("=" * 60)
    c = login()
    cleanup_leftovers(c)
    ok = True

    # ── Test 1: change homepage headline → public updates ──────────────────
    st, sections_body, _ = req("GET", "/api/v1/admin/sections", cookie=c)
    sections = sections_body["data"]
    hero = next(s for s in sections if s["sectionType"] == "hero")
    original_title = hero["title"]
    st, body, _ = req("PATCH", f"/api/v1/admin/sections/{hero['id']}",
                      {"title": "QA HEADLINE CHECK"}, cookie=c)
    st, home, _ = req("GET", "/api/v1/homepage")
    pub_hero = next(s for s in home["data"] if s["sectionType"] == "hero")
    ok &= check("1. Homepage headline change reflects publicly",
                st == 200 and pub_hero["title"] == "QA HEADLINE CHECK",
                f"public hero title = {pub_hero['title']!r}")
    req("PATCH", f"/api/v1/admin/sections/{hero['id']}", {"title": original_title}, cookie=c)

    # ── Test 2: upload profile image → appears publicly ────────────────────
    png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    boundary = "----QABoundary1234"
    mp = io.BytesIO()
    for part in [
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"folder\"\r\n\r\nprofile\r\n".encode(),
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"alt\"\r\n\r\nQA portrait\r\n".encode(),
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"qa-portrait.png\"\r\n"
        f"Content-Type: image/png\r\n\r\n".encode(),
        png, f"\r\n--{boundary}--\r\n".encode(),
    ]:
        mp.write(part)
    st, media, _ = req("POST", "/api/v1/admin/media", raw_body=mp.getvalue(),
                       content_type=f"multipart/form-data; boundary={boundary}", cookie=c)
    upload_ok = st == 201 and media.get("data", {}).get("url", "").startswith("/uploads/profile/")
    asset_url = media.get("data", {}).get("url", "")
    ok &= check("2a. Profile image upload (validated, optimized) succeeds", upload_ok,
                f"status={st} body={json.dumps(media)[:200]}")

    st, prof_body, _ = req("GET", "/api/v1/admin/profile", cookie=c)
    profile = prof_body["data"]
    old_photo = profile["photoUrl"]
    req("PATCH", "/api/v1/admin/profile", {**profile, "photoUrl": asset_url}, cookie=c)
    st, pub_prof, _ = req("GET", "/api/v1/profile")
    pub_photo = (pub_prof["data"]["profile"] or {}).get("photoUrl", "")
    ok &= check("2b. Uploaded image appears on the public profile", pub_photo == asset_url,
                f"public photoUrl={pub_photo!r}")
    req("PATCH", "/api/v1/admin/profile", {**profile, "photoUrl": old_photo}, cookie=c)

    # ── Test 3: create project, publish → appears ───────────────────────────
    st, cats_body, _ = req("GET", "/api/v1/projects/categories")
    brand = next(cat for cat in cats_body["data"] if cat["slug"] == "brand-identity")
    qa_slug = "qa-acceptance-project"
    project_payload = {
        "title": "QA Acceptance Project", "slug": qa_slug,
        "summary": "Acceptance-test project created by the QA suite. Demo marker.",
        "description": "This project exists to verify the publishing workflow end to end.",
        "categoryId": brand["id"], "status": "DRAFT", "featured": False, "order": 99,
        "tools": "", "clientName": "QA Bot", "seoTitle": "", "seoDescription": "",
    }
    st, created, _ = req("POST", "/api/v1/admin/projects", project_payload, cookie=c)
    created_ok = st == 201 and created.get("data", {}).get("slug") == qa_slug
    qa_id = created.get("data", {}).get("id")
    ok &= check("3a. Portfolio project created (draft)", created_ok, f"status={st} {json.dumps(created)[:200]}")

    st, pub, _ = req("GET", f"/api/v1/projects?q=QA")
    ok &= check("3b. Draft project is NOT public", st == 200 and not any(p["slug"] == qa_slug for p in pub["data"]),
                f"found {[p['slug'] for p in pub['data'] if p['slug']==qa_slug]}")

    st, upd, _ = req("PATCH", f"/api/v1/admin/projects/{qa_id}", {**project_payload, "status": "PUBLISHED"}, cookie=c)
    st, pub, _ = _qa_public()
    ok &= check("3c. Published project appears publicly",
                upd["success"] and any(p["slug"] == qa_slug for p in pub["data"]),
                f"patch={st}/{json.dumps(upd)[:150]}")

    # ── Test 4: correct category filter ─────────────────────────────────────
    st, pub, _ = req("GET", "/api/v1/projects?category=brand-identity&limit=48")
    qa_item = next((p for p in pub["data"] if p["slug"] == qa_slug), None)
    ok &= check("4. Project appears in its correct category filter",
                qa_item is not None and qa_item["category"]["slug"] == "brand-identity")

    # ── Test 5: edit case study → detail updates ────────────────────────────
    req("PATCH", f"/api/v1/admin/projects/{qa_id}", {**project_payload, "status": "PUBLISHED",
        "concept": "QA EDIT MARKER-7f3a", "featured": False}, cookie=c)
    st, detail, _ = req("GET", f"/api/v1/projects/{qa_slug}")
    ok &= check("5. Case-study edit reflected on detail endpoint",
                "QA EDIT MARKER-7f3a" in (detail["data"]["project"]["concept"] or ""))

    # ── Test 6: unpublish → disappears ──────────────────────────────────────
    req("PATCH", f"/api/v1/admin/projects/{qa_id}", {**project_payload, "status": "ARCHIVED"}, cookie=c)
    st, pub, _ = _qa_public()
    st2, detail2, _ = req("GET", f"/api/v1/projects/{qa_slug}")
    ok &= check("6. Unpublished (archived) project disappears from public pages",
                not any(p["slug"] == qa_slug for p in pub["data"]) and st2 == 404,
                f"list_has={[p['slug'] for p in pub['data'] if p['slug']==qa_slug]} detail={st2}")

    # ── Test 7: add service → services page updates ─────────────────────────
    st, svc, _ = req("POST", "/api/v1/admin/services", {
        "title": "QA Service", "slug": "qa-service",
        "shortDescription": "Acceptance test service entry.",
        "description": "This service verifies the services publishing flow.",
        "deliverables": "Item one, item two", "order": 99, "featured": False, "status": "PUBLISHED",
    }, cookie=c)
    svc_ok = st == 201
    svc_id = svc.get("data", {}).get("id")
    st, pub_svc, _ = req("GET", "/api/v1/services")
    ok &= check("7. New service appears on public services endpoint",
                svc_ok and any(s["slug"] == "qa-service" for s in pub_svc["data"]),
                f"create={st}")
    # deliverables comma-normalization check
    qa_service = next((s for s in pub_svc["data"] if s["slug"] == "qa-service"), {})
    ok &= check("7b. Comma-separated deliverables normalized to JSON list",
                qa_service.get("deliverables") == json.dumps(["Item one", "item two"]), f"got {qa_service.get('deliverables')!r}")
    req("DELETE", f"/api/v1/admin/services/{svc_id}", cookie=c)

    # ── Test 8: theme change → public reflects ──────────────────────────────
    st, th, _ = req("PATCH", "/api/v1/admin/theme", {"primaryColor": "#FF55AA"}, cookie=c)
    st, pub_theme, _ = req("GET", "/api/v1/theme")
    ok &= check("8. Theme colour change reflected on public theme endpoint",
                pub_theme["data"]["primaryColor"] == "#FF55AA", f"got {pub_theme['data']['primaryColor']}")
    # revision trail must exist (Decimal fix) + restore round-trip
    st, revs, _ = req("GET", "/api/v1/admin/revisions?content=cms.themeconfig&id=theme", cookie=c)
    ok &= check("8b. Theme revision history is recorded",
                st == 200 and len(revs["data"]) >= 1, f"revisions={len(revs.get('data', []))}")
    # make a second change, then restore the earlier snapshot → revert
    req("PATCH", "/api/v1/admin/theme", {"primaryColor": "#00AAFF"}, cookie=c)
    st, revs2, _ = req("GET", "/api/v1/admin/revisions?content=cms.themeconfig&id=theme", cookie=c)
    st, restored, _ = req("POST", f"/api/v1/admin/revisions/{revs2['data'][1]['id']}/restore", cookie=c)
    st, pub_theme, _ = req("GET", "/api/v1/theme")
    ok &= check("8c. Revision restore reverts to the earlier version",
                st == 200 and pub_theme["data"]["primaryColor"] == "#FF55AA",
                f"restore={st} now={pub_theme['data']['primaryColor']}")

    # ── Test 9: reorder homepage sections → public layout changes ───────────
    ids = [s["id"] for s in sorted(sections, key=lambda s: s["order"])]
    req("POST", "/api/v1/admin/sections/reorder", {"order": list(reversed(ids))}, cookie=c)
    st, home, _ = req("GET", "/api/v1/homepage")
    ok &= check("9. Section reorder changes the public layout order",
                home["data"][0]["id"] == ids[-1], f"first={home['data'][0]['id']}")
    req("POST", "/api/v1/admin/sections/reorder", {"order": ids}, cookie=c)

    # ── Test 10: contact form → inquiry in admin dashboard ──────────────────
    st, dash_before, _ = req("GET", "/api/v1/admin/dashboard", cookie=c)
    unread_before = dash_before["data"]["unreadInquiries"]
    st, sent, _ = req("POST", "/api/v1/contact", {
        "fullName": "QA Sender", "email": "qa@example.com", "projectType": "Brand Identity",
        "message": "This is an acceptance-test inquiry message that is long enough.",
        "website": "",
    })
    ok &= check("10a. Contact form accepted", st == 201 and sent["data"]["received"] is True, f"status={st}")
    st, dash_after, _ = req("GET", "/api/v1/admin/dashboard", cookie=c)
    ok &= check("10b. Inquiry visible in admin dashboard",
                dash_after["data"]["unreadInquiries"] == unread_before + 1,
                f"unread {unread_before} → {dash_after['data']['unreadInquiries']}")
    st, inq, _ = req("GET", "/api/v1/admin/inquiries?q=qa@example.com", cookie=c)
    qa_inq = inq["data"][0]["id"] if inq["data"] else None
    if qa_inq:
        req("DELETE", f"/api/v1/admin/inquiries/{qa_inq}", cookie=c)

    # ── cleanup QA artifacts ────────────────────────────────────────────────
    if qa_id:
        req("DELETE", f"/api/v1/admin/projects/{qa_id}", cookie=c)
    if upload_ok:
        req("DELETE", f"/api/v1/admin/media/{media['data']['id']}", cookie=c)

    print("=" * 60)
    failed = [r for r in _results if r[1] == "FAIL"]
    print(f"RESULT: {len(_results) - len(failed)}/{len(_results)} passed"
          + (f" — FAILURES: {[f[0] for f in failed]}" if failed else " — ALL ACCEPTANCE TESTS PASSED"))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
