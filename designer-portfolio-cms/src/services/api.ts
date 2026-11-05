import type {
  ApiEnvelope,
  ApiList,
  Category,
  ContactInquiry,
  DashboardStats,
  Education,
  Experience,
  Certification,
  Achievement,
  MediaAsset,
  Profile,
  Project,
  Service,
  Skill,
  SocialLink,
  Testimonial,
  WebsiteSettings,
} from "@/lib/types";
import type {
  HomepageSection,
  NavigationItem,
  Revision,
  ThemeConfig,
} from "@/lib/cms-types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!json) throw new ApiError("Network error — please try again", res.status);
  if (!json.success) throw new ApiError(json.error ?? "Request failed", res.status);
  return json.data;
}

async function requestList<T>(path: string, init?: RequestInit): Promise<{ data: T[]; meta?: ApiList<T>["meta"] }> {
  const res = await fetch(path, { ...init, cache: "no-store" });
  const json = (await res.json().catch(() => null)) as ApiList<T> | null;
  if (!json) throw new ApiError("Network error — please try again", res.status);
  if (!json.success) throw new ApiError(json.error ?? "Request failed", res.status);
  return { data: json.data, meta: json.meta };
}

/* ── Public ─────────────────────────────────────────────────────────────── */

export const publicApi = {
  profile: () => request<{ profile: Profile | null; socialLinks: SocialLink[] }>("/api/v1/profile"),
  settings: () => request<WebsiteSettings | null>("/api/v1/settings"),
  projects: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return requestList<Project>(`/api/v1/projects${qs ? `?${qs}` : ""}`);
  },
  featured: () => request<Project[]>("/api/v1/projects/featured"),
  categories: () =>
    request<(Category & { projectCount: number })[]>("/api/v1/projects/categories"),
  project: (slug: string) =>
    request<{ project: Project; related: Project[]; next: Project | null }>(
      `/api/v1/projects/${encodeURIComponent(slug)}`
    ),
  services: () => request<Service[]>("/api/v1/services"),
  skills: () => request<Skill[]>("/api/v1/skills"),
  resume: () =>
    request<{
      experiences: Experience[];
      education: Education[];
      certifications: Certification[];
      achievements: Achievement[];
    }>("/api/v1/resume"),
  testimonials: () => request<Testimonial[]>("/api/v1/testimonials"),
  theme: () => request<ThemeConfig>("/api/v1/theme"),
  navigation: () =>
    request<{ header: NavigationItem[]; footer: NavigationItem[] }>("/api/v1/navigation"),
  homepage: () => request<HomepageSection[]>("/api/v1/homepage"),
  contact: (payload: unknown) =>
    request<{ id: string; received: boolean }>("/api/v1/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

/* ── Admin ──────────────────────────────────────────────────────────────── */

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ id: string; email: string; name: string; role: string }>(
      "/api/v1/admin/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  logout: () => request<{ loggedOut: boolean }>("/api/v1/admin/auth/logout", { method: "POST" }),
  me: () => request<{ id: string; email: string; name: string; role: string }>("/api/v1/admin/auth/me"),
  dashboard: () => request<DashboardStats>("/api/v1/admin/dashboard"),

  projects: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return requestList<Project & { _count?: { images: number } }>(
      `/api/v1/admin/projects${qs ? `?${qs}` : ""}`
    );
  },
  project: (id: string) => request<Project>(`/api/v1/admin/projects/${id}`),
  createProject: (payload: unknown) =>
    request<Project>("/api/v1/admin/projects", { method: "POST", body: JSON.stringify(payload) }),
  updateProject: (id: string, payload: unknown) =>
    request<Project>(`/api/v1/admin/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteProject: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/projects/${id}`, { method: "DELETE" }),

  categories: () => request<(Category & { _count?: { projects: number } })[]>("/api/v1/admin/categories"),
  createCategory: (payload: unknown) =>
    request<Category>("/api/v1/admin/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id: string, payload: unknown) =>
    request<Category>(`/api/v1/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteCategory: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/categories/${id}`, { method: "DELETE" }),

  services: () => request<Service[]>("/api/v1/admin/services"),
  createService: (payload: unknown) =>
    request<Service>("/api/v1/admin/services", { method: "POST", body: JSON.stringify(payload) }),
  updateService: (id: string, payload: unknown) =>
    request<Service>(`/api/v1/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteService: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/services/${id}`, { method: "DELETE" }),

  skills: () => request<Skill[]>("/api/v1/admin/skills"),
  createSkill: (payload: unknown) =>
    request<Skill>("/api/v1/admin/skills", { method: "POST", body: JSON.stringify(payload) }),
  updateSkill: (id: string, payload: unknown) =>
    request<Skill>(`/api/v1/admin/skills/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSkill: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/skills/${id}`, { method: "DELETE" }),

  experience: () => request<Experience[]>("/api/v1/admin/experience"),
  createExperience: (payload: unknown) =>
    request<Experience>("/api/v1/admin/experience", { method: "POST", body: JSON.stringify(payload) }),
  updateExperience: (id: string, payload: unknown) =>
    request<Experience>(`/api/v1/admin/experience/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteExperience: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/experience/${id}`, { method: "DELETE" }),

  education: () => request<Education[]>("/api/v1/admin/education"),
  createEducation: (payload: unknown) =>
    request<Education>("/api/v1/admin/education", { method: "POST", body: JSON.stringify(payload) }),
  updateEducation: (id: string, payload: unknown) =>
    request<Education>(`/api/v1/admin/education/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteEducation: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/education/${id}`, { method: "DELETE" }),

  certifications: () => request<Certification[]>("/api/v1/admin/certifications"),
  createCertification: (payload: unknown) =>
    request<Certification>("/api/v1/admin/certifications", { method: "POST", body: JSON.stringify(payload) }),
  updateCertification: (id: string, payload: unknown) =>
    request<Certification>(`/api/v1/admin/certifications/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteCertification: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/certifications/${id}`, { method: "DELETE" }),

  achievements: () => request<Achievement[]>("/api/v1/admin/achievements"),
  createAchievement: (payload: unknown) =>
    request<Achievement>("/api/v1/admin/achievements", { method: "POST", body: JSON.stringify(payload) }),
  updateAchievement: (id: string, payload: unknown) =>
    request<Achievement>(`/api/v1/admin/achievements/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAchievement: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/achievements/${id}`, { method: "DELETE" }),

  testimonials: () => request<Testimonial[]>("/api/v1/admin/testimonials"),
  createTestimonial: (payload: unknown) =>
    request<Testimonial>("/api/v1/admin/testimonials", { method: "POST", body: JSON.stringify(payload) }),
  updateTestimonial: (id: string, payload: unknown) =>
    request<Testimonial>(`/api/v1/admin/testimonials/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteTestimonial: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/testimonials/${id}`, { method: "DELETE" }),

  inquiries: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return requestList<ContactInquiry>(`/api/v1/admin/inquiries${qs ? `?${qs}` : ""}`);
  },
  updateInquiry: (id: string, payload: { status?: string; adminNotes?: string }) =>
    request<ContactInquiry>(`/api/v1/admin/inquiries/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteInquiry: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/inquiries/${id}`, { method: "DELETE" }),

  profile: () => request<Profile>("/api/v1/admin/profile"),
  updateProfile: (payload: unknown) =>
    request<Profile>("/api/v1/admin/profile", { method: "PATCH", body: JSON.stringify(payload) }),

  settings: () => request<WebsiteSettings>("/api/v1/admin/settings"),
  updateSettings: (payload: unknown) =>
    request<WebsiteSettings>("/api/v1/admin/settings", { method: "PATCH", body: JSON.stringify(payload) }),

  social: () => request<SocialLink[]>("/api/v1/admin/social"),
  createSocial: (payload: unknown) =>
    request<SocialLink>("/api/v1/admin/social", { method: "POST", body: JSON.stringify(payload) }),
  updateSocial: (id: string, payload: unknown) =>
    request<SocialLink>(`/api/v1/admin/social/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSocial: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/social/${id}`, { method: "DELETE" }),

  media: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return requestList<MediaAsset>(`/api/v1/admin/media${qs ? `?${qs}` : ""}`);
  },
  uploadMedia: (file: File, folder: string, alt?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    if (alt) fd.append("alt", alt);
    return request<MediaAsset>("/api/v1/admin/media", { method: "POST", body: fd });
  },
  updateMedia: (id: string, payload: { alt?: string; folder?: string; caption?: string }) =>
    request<MediaAsset>(`/api/v1/admin/media/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteMedia: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/media/${id}`, { method: "DELETE" }),

  /* ── CMS extensions: homepage builder / theme / navigation / revisions ── */
  sections: () => request<HomepageSection[]>("/api/v1/admin/sections"),
  createSection: (payload: unknown) =>
    request<HomepageSection>("/api/v1/admin/sections", { method: "POST", body: JSON.stringify(payload) }),
  updateSection: (id: string, payload: unknown) =>
    request<HomepageSection>(`/api/v1/admin/sections/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSection: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/sections/${id}`, { method: "DELETE" }),
  reorderSections: (order: (string | number)[]) =>
    request<HomepageSection[]>("/api/v1/admin/sections/reorder", {
      method: "POST",
      body: JSON.stringify({ order }),
    }),

  theme: () => request<ThemeConfig>("/api/v1/admin/theme"),
  updateTheme: (payload: unknown) =>
    request<ThemeConfig>("/api/v1/admin/theme", { method: "PATCH", body: JSON.stringify(payload) }),

  navigation: () => request<NavigationItem[]>("/api/v1/admin/navigation"),
  createNavigationItem: (payload: unknown) =>
    request<NavigationItem>("/api/v1/admin/navigation", { method: "POST", body: JSON.stringify(payload) }),
  updateNavigationItem: (id: string, payload: unknown) =>
    request<NavigationItem>(`/api/v1/admin/navigation/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteNavigationItem: (id: string) =>
    request<{ deleted: boolean }>(`/api/v1/admin/navigation/${id}`, { method: "DELETE" }),
  reorderNavigation: (order: (string | number)[]) =>
    request<NavigationItem[]>("/api/v1/admin/navigation/reorder", {
      method: "POST",
      body: JSON.stringify({ order }),
    }),

  revisions: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return request<Revision[]>(`/api/v1/admin/revisions${qs ? `?${qs}` : ""}`);
  },
  restoreRevision: (id: string) =>
    request<{ restored: boolean }>(`/api/v1/admin/revisions/${id}/restore`, { method: "POST" }),

  previewHomepage: () => request<HomepageSection[]>("/api/v1/admin/preview/homepage"),
  previewProject: (slug: string) =>
    request<Project>(`/api/v1/admin/preview/project/${encodeURIComponent(slug)}`),
};
