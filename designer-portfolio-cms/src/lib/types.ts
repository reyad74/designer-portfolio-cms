/** Shared API payload types used by the frontend. */

/* CMS extension types (homepage builder, theme, navigation, revisions). */
export type {
  HomepageSection,
  NavigationItem,
  Revision,
  SectionType,
  ThemeConfig,
} from "@/lib/cms-types";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: unknown;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiList<T> extends ApiEnvelope<T[]> {
  meta?: ListMeta;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  order: number;
}

export interface ProjectImageItem {
  id: string;
  url: string;
  alt?: string | null;
  caption?: string | null;
  order: number;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  categoryId: string;
  category?: Category;
  clientName?: string | null;
  projectDate?: string | null;
  year?: number | null;
  tools?: string | null;
  thumbnailUrl?: string | null;
  coverUrl?: string | null;
  accentColor?: string | null;
  objectives?: string | null;
  challenges?: string | null;
  research?: string | null;
  strategy?: string | null;
  concept?: string | null;
  colorPalette?: string | null;
  typography?: string | null;
  applications?: string | null;
  outcome?: string | null;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishAt?: string | null;
  order: number;
  viewCount: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  images?: ProjectImageItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  deliverables?: string | null;
  approach?: string | null;
  icon?: string | null;
  order: number;
  featured: boolean;
}

export interface Skill {
  id: string;
  name: string;
  category: "SOFTWARE" | "EXPERTISE";
  level: number;
  icon?: string | null;
  order: number;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  description?: string | null;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  current: boolean;
  order: number;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string | null;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  order: number;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string | null;
  credentialUrl?: string | null;
  description?: string | null;
  order: number;
}

export interface Achievement {
  id: string;
  title: string;
  description?: string | null;
  organization?: string | null;
  year?: number | null;
  order: number;
}

export interface Testimonial {
  id: string;
  clientName: string;
  company?: string | null;
  photoUrl?: string | null;
  review: string;
  projectReference?: string | null;
  rating?: number | null;
  date?: string | null;
  published: boolean;
  featured: boolean;
  order: number;
}

export interface Profile {
  id: string;
  name: string;
  title: string;
  tagline?: string | null;
  shortBio: string;
  bio: string;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  availabilityStatus: "AVAILABLE" | "LIMITED" | "UNAVAILABLE";
  availabilityNote?: string | null;
  yearsExperience: number;
  clientCount: number;
  projectCount: number;
  awardsCount: number;
  philosophyTitle?: string | null;
  philosophy?: string | null;
  interests?: string | null;
  resumeUrl?: string | null;
}

export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon?: string | null;
  order: number;
  visible: boolean;
}

export interface WebsiteSettings {
  id: string;
  siteName: string;
  logoText?: string | null;
  logoUrl?: string | null;
  tagline?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  ogImageUrl?: string | null;
  faviconUrl?: string | null;
  contactEmail?: string | null;
  whatsappUrl?: string | null;
  footerText?: string | null;
  copyrightText?: string | null;
  cvUrl?: string | null;
  accentColor: string;
  /* 3D & animation feature flags */
  hero3dEnabled?: boolean;
  particlesEnabled?: boolean;
  animationIntensity?: number;
  parallaxEnabled?: boolean;
  smoothScrollEnabled?: boolean;
  cursorEffectEnabled?: boolean;
  heroFallbackUrl?: string | null;
}

export interface ContactInquiry {
  id: string;
  fullName: string;
  email: string;
  company?: string | null;
  projectType: string;
  budgetRange?: string | null;
  timeline?: string | null;
  message: string;
  referenceUrl?: string | null;
  status: "UNREAD" | "READ" | "ARCHIVED";
  adminNotes?: string | null;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  caption?: string | null;
  folder: string;
  createdAt: string;
}

export interface DashboardStats {
  totalProjects: number;
  publishedProjects: number;
  draftProjects: number;
  featuredProjects: number;
  totalInquiries: number;
  unreadInquiries: number;
  publishedTestimonials: number;
  pendingTestimonials: number;
  mediaCount: number;
  categories: number;
  services: number;
  homepageSections?: number;
  recentInquiries: ContactInquiry[];
  topProjects: { id: string; title: string; slug: string; viewCount: number; status: string }[];
}
