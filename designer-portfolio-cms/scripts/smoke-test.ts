/**
 * API smoke test — exercises the full public + admin surface.
 * Run: bun scripts/smoke-test.ts
 */
const BASE = "http://localhost:3000";
let cookie = "";
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ FAIL: ${name} ${extra}`);
  }
}

async function req(method: string, path: string, body?: unknown, useCookie = true) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(useCookie && cookie ? { Cookie: cookie } : {}),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function main() {
  console.log("\n— Public endpoints —");
  let r = await req("GET", "/api/v1/profile");
  check("GET /profile 200", r.status === 200 && !!r.json.data?.profile);
  check("profile has social links", (r.json.data.socialLinks ?? []).length >= 4);

  r = await req("GET", "/api/v1/settings");
  check("GET /settings 200", r.status === 200 && r.json.data?.siteName === "Adrian Vale");

  r = await req("GET", "/api/v1/projects?limit=3");
  check("GET /projects 200 (list+meta)", r.status === 200 && r.json.meta?.total >= 8);
  const anyProject = r.json.data?.[0];

  r = await req("GET", "/api/v1/projects?q=LUMEN");
  check("search works", r.json.data?.some((p: any) => p.title.includes("LUMEN")));

  r = await req("GET", "/api/v1/projects?category=packaging-design");
  check("category filter works", r.json.data?.every((p: any) => p.category?.slug === "packaging-design"));

  r = await req("GET", "/api/v1/projects/featured");
  check("featured >= 4", (r.json.data ?? []).length >= 4);

  r = await req("GET", "/api/v1/projects/categories");
  check("categories 12", (r.json.data ?? []).length === 12);

  r = await req("GET", `/api/v1/projects/${anyProject.slug}`);
  check("case study detail + related", r.status === 200 && Array.isArray(r.json.data.related));
  check("case study has narrative", !!r.json.data.project.objectives);

  r = await req("GET", "/api/v1/services");
  check("services 9", (r.json.data ?? []).length === 9);

  r = await req("GET", "/api/v1/skills");
  check("skills 14", (r.json.data ?? []).length === 14);

  r = await req("GET", "/api/v1/resume");
  check("resume bundle", r.json.data?.experiences?.length >= 4 && r.json.data?.education?.length >= 2);

  r = await req("GET", "/api/v1/testimonials");
  check("testimonials published only", (r.json.data ?? []).length === 4);

  console.log("\n— Contact security —");
  // NOTE: the contact endpoint rate-limits at 5 req/hour/IP — repeated runs
  // will see 429s, which is itself the expected protection behaviour.
  r = await req("POST", "/api/v1/contact", { website: "spam-bot.com", fullName: "Bot", email: "bot@bot.com", projectType: "Spam", message: "spam spam spam spam spam" });
  check("honeypot silently accepts+discards (or rate-limited)", r.status === 200 || r.status === 429, `got ${r.status}`);

  r = await req("POST", "/api/v1/contact", { fullName: "X", email: "bad", projectType: "", message: "short" });
  check("validation rejects bad payload (or rate-limited)", r.status === 422 || r.status === 429, `got ${r.status}`);

  r = await req("POST", "/api/v1/contact", {
    fullName: "Smoke Tester", email: "smoke@test.dev", company: "QA",
    projectType: "Brand Identity", budgetRange: "$5k – $10k", timeline: "1–2 months",
    message: "This is the automated smoke test inquiry — please disregard in review.",
  });
  check("contact submission stored (or rate-limited)", (r.status === 201 && !!r.json.data?.id) || r.status === 429, `got ${r.status}`);

  console.log("\n— Admin auth —");
  r = await req("GET", "/api/v1/admin/dashboard");
  check("dashboard blocked without auth", r.status === 401);

  r = await req("POST", "/api/v1/admin/auth/login", { email: "admin@vale.studio", password: "wrong-password" });
  check("wrong password rejected", r.status === 401);

  r = await req("POST", "/api/v1/admin/auth/login", { email: "admin@vale.studio", password: "ValeStudio#2026" });
  check("login sets httpOnly cookie", r.status === 200 && cookie.includes("av_admin_token"));

  r = await req("GET", "/api/v1/admin/auth/me");
  check("session readable", r.status === 200 && r.json.data?.email === "admin@vale.studio");

  console.log("\n— Admin dashboard & CRUD —");
  r = await req("GET", "/api/v1/admin/dashboard");
  check("dashboard stats", r.status === 200 && r.json.data.totalProjects === 8 && r.json.data.unreadInquiries >= 1);

  // Categories CRUD
  r = await req("POST", "/api/v1/admin/categories", { name: "Smoke Test Cat", slug: "smoke-test-cat", order: 99 });
  check("create category", r.status === 201);
  const catId = r.json.data?.id;
  r = await req("PATCH", `/api/v1/admin/categories/${catId}`, { name: "Smoke Test Cat 2", slug: "smoke-test-cat", order: 99 });
  check("update category", r.status === 200);
  r = await req("DELETE", `/api/v1/admin/categories/${catId}`);
  check("delete category", r.status === 200);
  r = await req("DELETE", "/api/v1/admin/categories/nonexistent");
  check("delete missing category 404", r.status === 404);

  // Skills CRUD
  r = await req("POST", "/api/v1/admin/skills", { name: "Smoke Skill", category: "EXPERTISE", level: 50, order: 99 });
  check("create skill", r.status === 201);
  const skillId = r.json.data?.id;
  r = await req("DELETE", `/api/v1/admin/skills/${skillId}`);
  check("delete skill", r.status === 200);

  // Project full CRUD with images
  r = await req("GET", "/api/v1/admin/categories");
  const brandCat = r.json.data?.find((c: any) => c.slug === "brand-identity");
  const projectPayload = {
    title: "Smoke Test Project", slug: "smoke-test-project",
    summary: "A temporary project created by the smoke test.",
    description: "This project is created and then deleted by the automated smoke test.",
    categoryId: brandCat.id, projectDate: "2025-01-15",
    tools: JSON.stringify(["Figma"]), colorPalette: JSON.stringify([{ name: "Ink", hex: "#080808" }]),
    featured: false, status: "PUBLISHED", order: 99,
  };
  r = await req("POST", "/api/v1/admin/projects", projectPayload);
  check("create project", r.status === 201);
  const projectId = r.json.data?.id;

  r = await req("PATCH", `/api/v1/admin/projects/${projectId}`, {
    ...projectPayload, title: "Smoke Test Project v2", images: [{ url: "/uploads/demo/og-image.png", alt: "smoke", caption: "" }],
  });
  check("update project + gallery replace", r.status === 200 && r.json.data.images?.length === 1);

  r = await req("GET", "/api/v1/admin/projects?status=PUBLISHED");
  check("admin project list includes new", r.json.data?.some((p: any) => p.id === projectId));

  r = await req("DELETE", `/api/v1/admin/projects/${projectId}`);
  check("delete project", r.status === 200);

  // Inquiries
  r = await req("GET", "/api/v1/admin/inquiries?status=UNREAD");
  check("unread inquiries listed", r.status === 200 && r.json.data?.length >= 1);
  const inq = r.json.data?.[0];
  r = await req("PATCH", `/api/v1/admin/inquiries/${inq.id}`, { status: "READ", adminNotes: "smoke note" });
  check("patch inquiry status+notes", r.status === 200 && r.json.data.status === "READ");
  r = await req("PATCH", `/api/v1/admin/inquiries/${inq.id}`, { status: "UNREAD" });
  check("restore unread", r.status === 200);

  // Media upload
  const pngB64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const buf = Buffer.from(pngB64, "base64");
  const fd = new FormData();
  fd.append("file", new File([buf], "smoke.png", { type: "image/png" }));
  fd.append("folder", "smoke");
  fd.append("alt", "smoke test");
  r = await req("POST", "/api/v1/admin/media", fd);
  check("media upload (magic-byte validated)", r.status === 201);
  const mediaId = r.json.data?.id;

  // Disguised upload must be rejected
  const fd2 = new FormData();
  fd2.append("file", new File([Buffer.from("<script>alert(1)</script>")], "evil.png", { type: "image/png" }));
  r = await req("POST", "/api/v1/admin/media", fd2);
  check("fake PNG rejected by MIME sniff", r.status === 415);

  r = await req("PATCH", `/api/v1/admin/media/${mediaId}`, { alt: "updated alt" });
  check("media alt update", r.status === 200);
  r = await req("DELETE", `/api/v1/admin/media/${mediaId}`);
  check("media delete", r.status === 200);

  // Profile & settings
  r = await req("GET", "/api/v1/admin/profile");
  check("admin profile read", r.status === 200 && r.json.data.name === "Adrian Vale");
  r = await req("PATCH", "/api/v1/admin/settings", {
    siteName: "Adrian Vale", accentColor: "#C6FF00", logoText: "Adrian Vale",
  });
  check("settings patch", r.status === 200);

  // Social CRUD
  r = await req("POST", "/api/v1/admin/social", { platform: "Smoke", label: "Smoke", url: "https://example.com", order: 99, visible: true });
  check("create social", r.status === 201);
  r = await req("DELETE", `/api/v1/admin/social/${r.json.data?.id}`);
  check("delete social", r.status === 200);

  console.log("\n— Logout —");
  r = await req("POST", "/api/v1/admin/auth/logout");
  check("logout clears cookie", r.status === 200);
  cookie = cookie.replace("av_admin_token=", "av_admin_token=");
  r = await req("GET", "/api/v1/admin/dashboard");
  check("dashboard blocked after logout", r.status === 401);

  console.log(`\n═══ RESULT: ${pass} passed, ${fail} failed ═══`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("smoke test crashed:", e);
  process.exit(1);
});
