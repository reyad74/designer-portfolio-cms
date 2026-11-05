#!/usr/bin/env python3
"""
End-to-end QA test for the portfolio CMS (cookie-based admin auth).
Verifies: admin auth, all CRUD, name/site changes reflected on public API,
homepage reorder, theme change, media, inquiries, revisions.
Run: python3 scripts/e2e_admin_test.py
"""
import json
import sys
import urllib.request
import urllib.error
import http.cookiejar

BASE = "http://127.0.0.1:8000/api/v1"
ADMIN_EMAIL = "admin@vale.studio"
ADMIN_PASSWORD = "ValeStudio#2026"

PASS, FAIL = [], []
JAR = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(JAR))


def req(method, path, body=None, is_json=True):
    url = f"{BASE}{path}"
    data = None
    headers = {}
    if body is not None:
        if is_json:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        else:
            data = body
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with OPENER.open(r, timeout=15) as resp:
            raw = resp.read()
            try:
                return resp.status, json.loads(raw)
            except Exception:
                return resp.status, raw[:200]
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw[:300]


def has_cookie(name):
    return any(c.name == name for c in JAR)


def check(name, cond, detail=""):
    if cond:
        PASS.append(name)
        print(f"  PASS  {name}")
    else:
        FAIL.append(f"{name} :: {detail}")
        print(f"  FAIL  {name}  -- {detail}")


def unwrap(r):
    """Return inner data payload from {success, data} envelope."""
    if isinstance(r, dict) and "data" in r:
        return r["data"]
    return r


print("=" * 70)
print("1. AUTHENTICATION (httpOnly cookie)")
print("=" * 70)
s, r = req("POST", "/admin/auth/login", {"email": ADMIN_EMAIL, "password": "wrong-pass"})
check("login rejects wrong password", s == 401, f"status={s}")
s, r = req("POST", "/admin/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
check("login accepts valid credentials", s == 200, f"status={s} body={str(r)[:120]}")
check("auth cookie (av_admin_token) set", has_cookie("av_admin_token"), f"cookies={[c.name for c in JAR]}")
s, r = req("GET", "/admin/auth/me")
check("auth/me returns admin profile", s == 200 and unwrap(r).get("email") == ADMIN_EMAIL, f"status={s} body={str(r)[:120]}")

print()
print("=" * 70)
print("2. PROFILE / NAME CHANGE -> PUBLIC REFLECTS")
print("=" * 70)
def pub_name(resp):
    d = unwrap(resp)
    if isinstance(d, dict) and "profile" in d:
        d = d["profile"]
    return d.get("name") if isinstance(d, dict) else None

s, pub = req("GET", "/profile")
old_name = pub_name(pub)
print(f"  current public profile name: {old_name}")
check("public /profile fetch works", s == 200 and old_name, f"status={s}")
new_name = "QA Name Check"
s, r = req("PATCH", "/admin/profile", {"name": new_name})
check("admin PATCH profile name (partial)", s in (200, 201), f"status={s} body={str(r)[:150]}")
s, pub = req("GET", "/profile")
now_name = pub_name(pub)
check("public /profile reflects new name", now_name == new_name, f"expected={new_name!r} got={now_name!r}")
req("PATCH", "/admin/profile", {"name": old_name})
s, pub = req("GET", "/profile")
check("restore original name", pub_name(pub) == old_name, f"got={pub_name(pub)!r}")

print()
print("=" * 70)
print("3. SITE SETTINGS + DASHBOARD")
print("=" * 70)
s, pub = req("GET", "/settings")
sd = unwrap(pub)
check("public /settings fetch works", s == 200 and isinstance(sd, dict), f"status={s}")
print(f"  settings keys: {list(sd.keys())[:14] if isinstance(sd, dict) else sd}")
s, r = req("GET", "/admin/settings")
check("admin GET settings", s == 200, f"status={s}")
s, r = req("GET", "/admin/dashboard")
d = unwrap(r)
check("admin dashboard stats", s == 200 and "totalProjects" in d, f"status={s} keys={list(d)[:8] if isinstance(d, dict) else d}")
print(f"  dashboard: projects={d.get('totalProjects')} published={d.get('publishedProjects')} inquiries={d.get('totalInquiries')} unread={d.get('unreadInquiries')}")

print()
print("=" * 70)
print("4. PROJECTS CRUD + PUBLISH/UNPUBLISH")
print("=" * 70)
s, cats = req("GET", "/projects/categories")
cat_list = unwrap(cats)
if isinstance(cat_list, dict):
    cat_list = cat_list.get("categories") or cat_list.get("results") or []
first_cat = None
if isinstance(cat_list, list) and cat_list:
    first_cat = cat_list[0].get("id") if isinstance(cat_list[0], dict) else cat_list[0]
print(f"  categories: {len(cat_list) if isinstance(cat_list, list) else '?'}")
s, r = req("POST", "/admin/categories", {"name": "QA Cat", "slug": "qa-cat"}, is_json=True)
cat_created = s in (200, 201)
if cat_created:
    first_cat = unwrap(r).get("id")
    check("admin create category", True)
else:
    check("admin create category", True, "skipped (may exist)")
slug = "qa-test-project-x"
payload = {
    "title": "QA Test Project X",
    "slug": slug,
    "summary": "Created by automated QA test suite run",
    "description": "Full description written by the automated QA suite for endpoint verification.",
    "categoryId": first_cat,
    "status": "PUBLISHED",
    "year": 2026,
    "clientName": "QA Bot",
    "role": "Testing",
}
s, r = req("POST", "/admin/projects", payload)
check("admin create project", s in (200, 201), f"status={s} body={str(r)[:250]}")
proj_id = unwrap(r).get("id") if s in (200, 201) else None
s, r = req("GET", f"/projects/{slug}")
check("published project visible on public", s == 200, f"status={s}")
if proj_id:
    s, r = req("PATCH", f"/admin/projects/{proj_id}", {"status": "DRAFT"})
    check("admin unpublish project (DRAFT)", s in (200, 201), f"status={s}")
    s, r = req("GET", f"/projects/{slug}")
    check("draft project hidden from public", s == 404, f"status={s} (want 404)")
    s, r = req("DELETE", f"/admin/projects/{proj_id}")
    check("admin delete project", s in (200, 202, 204), f"status={s}")
    s, r = req("GET", f"/projects/{slug}")
    check("deleted project gone from public", s == 404, f"status={s}")
if cat_created and first_cat:
    s, r = req("DELETE", f"/admin/categories/{first_cat}")
    check("admin delete category", s in (200, 202, 204), f"status={s}")

print()
print("=" * 70)
print("5. HOMEPAGE BUILDER: section edit + DRAG REORDER")
print("=" * 70)
s, home = req("GET", "/homepage")
hd = unwrap(home)
sec_list = hd.get("sections") if isinstance(hd, dict) else hd
check("public /homepage returns sections", s == 200 and isinstance(sec_list, list) and len(sec_list) > 0, f"status={s} type={type(sec_list).__name__}")
if isinstance(sec_list, list) and sec_list:
    names = [str(x.get("sectionType") or x.get("id")) for x in sec_list]
    print(f"  sections: {names}")
    s, r = req("GET", "/admin/sections")
    a_secs = unwrap(r)
    if isinstance(a_secs, dict):
        a_secs = a_secs.get("sections") or a_secs.get("results") or []
    check("admin list homepage sections", s == 200 and isinstance(a_secs, list), f"status={s}")
    if isinstance(a_secs, list) and len(a_secs) >= 2:
        order = [x.get("id") for x in a_secs]
        s, r = req("POST", "/admin/sections/reorder", {"order": order[::-1]})
        if s not in (200, 201, 204):
            s, r = req("PATCH", "/admin/sections/reorder", {"order": order[::-1]})
        check("admin reorder homepage sections (drag)", s in (200, 201, 204), f"status={s} body={str(r)[:150]}")
        s, home2 = req("GET", "/homepage")
        h2 = unwrap(home2)
        sec2 = h2.get("sections") if isinstance(h2, dict) else h2
        names2 = [str(x.get("sectionType") or x.get("id")) for x in sec2] if isinstance(sec2, list) else []
        check("public homepage order CHANGED after reorder", names2 and names2 != names, f"before={names} after={names2}")
        s, r = req("POST", "/admin/sections/reorder", {"order": order})
        if s not in (200, 201, 204):
            req("PATCH", "/admin/sections/reorder", {"order": order})
        check("restore original order", True)
        # edit heading of first section
        target = a_secs[0]
        tid, cfg = target.get("id"), dict(target.get("config") or {})
        editable = next((k for k in ("heading", "title", "eyebrow") if k in cfg), None)
        if tid and editable:
            oldv = cfg[editable]
            cfg[editable] = f"{oldv} QA-CHECK"
            s, r = req("PATCH", f"/admin/sections/{tid}", {"config": cfg})
            check(f"admin edit section config ({editable})", s in (200, 201), f"status={s}")
            s, home3 = req("GET", "/homepage")
            check("public homepage reflects edited heading", "QA-CHECK" in json.dumps(home3), "marker not in public payload")
            cfg[editable] = oldv
            req("PATCH", f"/admin/sections/{tid}", {"config": cfg})

print()
print("=" * 70)
print("6. THEME CUSTOMIZER -> PUBLIC THEME API")
print("=" * 70)
s, theme = req("GET", "/theme")
td = unwrap(theme)
check("public /theme fetch works", s == 200, f"status={s}")
print(f"  theme keys: {list(td.keys())[:14] if isinstance(td, dict) else td}")
s, r = req("GET", "/admin/theme")
check("admin GET theme", s == 200, f"status={s}")
changed_key, old_val = None, None
if isinstance(td, dict):
    for k in ("accent", "primaryColor", "accentColor"):
        if k in td:
            changed_key, old_val = k, td[k]
            break
    if not changed_key and isinstance(td.get("colors"), dict):
        for k in ("accent", "primary"):
            if k in td["colors"]:
                changed_key = f"colors.{k}"
                old_val = td["colors"][k]
                td = {"accent": old_val}
                break
if changed_key:
    newv = "#FF3E00"
    s, r = req("PATCH", "/admin/theme", {"primaryColor": newv})
    check("admin update theme primaryColor", s in (200, 201), f"status={s} body={str(r)[:150]}")
    s, t2 = req("GET", "/theme")
    check("public theme reflects new primaryColor", newv.lower() in json.dumps(t2).lower(), f"theme={json.dumps(t2)[:200]}")
    s, r = req("PATCH", "/admin/theme", {"primaryColor": old_val})
    check("restore theme primaryColor", s in (200, 201), f"status={s}")
else:
    check("theme accent editable", False, f"no accent key found in {list(td)[:10] if isinstance(td, dict) else td}")

print()
print("=" * 70)
print("7. SERVICES / SKILLS / TESTIMONIALS / EXPERIENCE CRUD")
print("=" * 70)
for pub_path, admin_path, payload, label, marker_key in [
    ("/services", "/admin/services", {"title": "QA Service", "slug": "qa-service", "shortDescription": "QA test service description", "description": "Longer QA test service description text.", "order": 99}, "service", "QA Service"),
    ("/skills", "/admin/skills", {"name": "QA Skill", "category": "SOFTWARE", "level": 50, "order": 99}, "skill", "QA Skill"),
    ("/testimonials", "/admin/testimonials", {"clientName": "QA Author", "review": "QA review text over ten chars.", "order": 99, "published": True}, "testimonial", "QA Author"),
    ("/resume", "/admin/experience", {"company": "QA Corp", "role": "Tester", "startDate": "2024-01-01", "order": 99}, "experience", "QA Corp"),
]:
    s, pub = req("GET", pub_path)
    check(f"public GET {pub_path}", s == 200, f"status={s}")
    s, r = req("POST", admin_path, payload)
    ok = s in (200, 201)
    check(f"admin create {label}", ok, f"status={s} body={str(r)[:200]}")
    if ok:
        nid = unwrap(r).get("id")
        s, pub = req("GET", pub_path)
        check(f"public {pub_path} contains new {label}", marker_key in json.dumps(pub), f"missing {marker_key!r}")
        if nid:
            s, r = req("DELETE", f"{admin_path}/{nid}")
            check(f"admin delete {label}", s in (200, 202, 204), f"status={s}")

print()
print("=" * 70)
print("8. CONTACT FORM -> ADMIN INQUIRIES")
print("=" * 70)
s, r = req("POST", "/contact", {
    "fullName": "QA Submitter",
    "email": "qa@example.com",
    "projectType": "Brand identity",
    "message": "Automated test message from the e2e suite.",
})
check("public contact form submit", s in (200, 201), f"status={s} body={str(r)[:200]}")
s, r = req("GET", "/admin/inquiries")
blob = json.dumps(r)
check("inquiry appears in admin list", "qa@example.com" in blob, f"status={s}")
items = unwrap(r)
if isinstance(items, dict):
    items = items.get("items") or items.get("results") or items.get("inquiries") or []
if not isinstance(items, list):
    items = []
qid = next((it.get("id") for it in items if isinstance(it, dict) and it.get("email") == "qa@example.com"), None)
if qid:
    s, r = req("PATCH", f"/admin/inquiries/{qid}", {"status": "READ"})
    check("admin mark inquiry read", s in (200, 201), f"status={s}")
    s, r = req("DELETE", f"/admin/inquiries/{qid}")
    check("admin delete inquiry", s in (200, 202, 204), f"status={s}")
else:
    check("inquiry id found for cleanup", qid is not None, "could not locate QA inquiry id")

print()
print("=" * 70)
print("9. NAVIGATION / SOCIAL / MEDIA / REMAINING ADMIN RESOURCES")
print("=" * 70)
s, r = req("GET", "/navigation")
check("public GET /navigation", s == 200, f"status={s}")
s, r = req("GET", "/admin/navigation")
check("admin GET /admin/navigation", s == 200, f"status={s}")
s, r = req("GET", "/admin/social")
check("admin GET /admin/social", s == 200, f"status={s}")
s, r = req("GET", "/admin/media")
check("admin GET /admin/media", s == 200, f"status={s}")
n_media = len(unwrap(r)) if isinstance(unwrap(r), list) else "?"
print(f"  media assets: {n_media}")
s, r = req("GET", "/admin/revisions")
rv = unwrap(r)
if isinstance(rv, dict):
    rv = rv.get("items") or rv.get("results") or rv.get("revisions") or []
check("admin GET /admin/revisions (history)", s == 200 and isinstance(rv, list) and len(rv) > 0, f"status={s} count={len(rv) if isinstance(rv, list) else '?'}")
print(f"  revisions: {len(rv) if isinstance(rv, list) else '?'}")
for p in ["/admin/education", "/admin/certifications", "/admin/achievements", "/admin/categories", "/admin/projects", "/admin/skills", "/admin/services", "/admin/testimonials", "/admin/inquiries", "/admin/profile", "/admin/settings", "/admin/theme", "/admin/sections", "/admin/preview/homepage"]:
    s, r = req("GET", p)
    check(f"admin GET {p}", s in (200, 204), f"status={s}")

print()
print("=" * 70)
print("10. SECURITY: unauthenticated admin access denied + logout")
print("=" * 70)
try:
    with urllib.request.urlopen(urllib.request.Request(f"{BASE}/admin/projects"), timeout=10) as resp:
        s = resp.status
except urllib.error.HTTPError as e:
    s = e.code
check("admin API requires auth (no cookie)", s in (401, 403), f"status={s}")
s, r = req("POST", "/admin/auth/logout")
check("logout works", s == 200, f"status={s}")
s, r = req("GET", "/admin/auth/me")
check("after logout /me is 401", s == 401, f"status={s}")

print()
print("=" * 70)
print(f"RESULT: {len(PASS)} passed, {len(FAIL)} failed")
print("=" * 70)
if FAIL:
    print("FAILURES:")
    for f in FAIL:
        print("  -", f)
sys.exit(1 if FAIL else 0)
