import { z } from "zod";

/* ── Public ──────────────────────────────────────────────────────────────── */

export const contactSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().email("Please enter a valid email address").max(200),
  company: z.string().max(160).optional().or(z.literal("")),
  projectType: z.string().min(1, "Please select a project type"),
  budgetRange: z.string().max(60).optional().or(z.literal("")),
  timeline: z.string().max(60).optional().or(z.literal("")),
  message: z
    .string()
    .min(20, "Please describe your project in at least 20 characters")
    .max(4000),
  referenceUrl: z
    .string()
    .url("Reference must be a valid URL")
    .max(500)
    .optional()
    .or(z.literal("")),
  // Honeypot — must stay empty
  website: z.string().max(0).optional().or(z.literal("")),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/* ── Admin CRUD ──────────────────────────────────────────────────────────── */

const optionalUrl = z
  .string()
  .max(600)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v));

export const projectSchema = z.object({
  title: z.string().min(2).max(160),
  slug: z
    .string()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
  summary: z.string().min(10).max(400),
  description: z.string().min(10),
  categoryId: z.string().min(1, "Category is required"),
  clientName: z.string().max(160).optional().or(z.literal("")),
  projectDate: z.string().optional().or(z.literal("")),
  tools: z.string().max(600).optional().or(z.literal("")),
  thumbnailUrl: optionalUrl,
  coverUrl: optionalUrl,
  accentColor: z.string().max(20).optional().or(z.literal("")),
  objectives: z.string().max(4000).optional().or(z.literal("")),
  challenges: z.string().max(4000).optional().or(z.literal("")),
  research: z.string().max(4000).optional().or(z.literal("")),
  strategy: z.string().max(4000).optional().or(z.literal("")),
  concept: z.string().max(4000).optional().or(z.literal("")),
  colorPalette: z.string().max(2000).optional().or(z.literal("")),
  typography: z.string().max(2000).optional().or(z.literal("")),
  applications: z.string().max(4000).optional().or(z.literal("")),
  outcome: z.string().max(4000).optional().or(z.literal("")),
  featured: z.boolean().default(false),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  order: z.number().int().default(0),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(320).optional().or(z.literal("")),
});
export type ProjectInput = z.input<typeof projectSchema>;

export const categorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
  description: z.string().max(300).optional().or(z.literal("")),
  order: z.number().int().default(0),
});

export const serviceSchema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  shortDescription: z.string().min(10).max(300),
  description: z.string().min(10),
  deliverables: z.string().max(1500).optional().or(z.literal("")),
  approach: z.string().max(1500).optional().or(z.literal("")),
  icon: z.string().max(60).optional().or(z.literal("")),
  order: z.number().int().default(0),
  featured: z.boolean().default(false),
});

export const skillSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.enum(["SOFTWARE", "EXPERTISE"]),
  level: z.number().int().min(0).max(100),
  icon: z.string().max(60).optional().or(z.literal("")),
  order: z.number().int().default(0),
});

export const experienceSchema = z.object({
  company: z.string().min(1).max(160),
  role: z.string().min(1).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  location: z.string().max(160).optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().or(z.literal("")),
  current: z.boolean().default(false),
  order: z.number().int().default(0),
});

export const educationSchema = z.object({
  institution: z.string().min(1).max(160),
  degree: z.string().min(1).max(160),
  field: z.string().max(160).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  startDate: z.string().min(1),
  endDate: z.string().optional().or(z.literal("")),
  order: z.number().int().default(0),
});

export const certificationSchema = z.object({
  name: z.string().min(1).max(160),
  issuer: z.string().min(1).max(160),
  issueDate: z.string().optional().or(z.literal("")),
  credentialUrl: optionalUrl,
  description: z.string().max(600).optional().or(z.literal("")),
  order: z.number().int().default(0),
});

export const achievementSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(600).optional().or(z.literal("")),
  organization: z.string().max(160).optional().or(z.literal("")),
  year: z.number().int().min(1900).max(2100).optional(),
  order: z.number().int().default(0),
});

export const testimonialSchema = z.object({
  clientName: z.string().min(2).max(120),
  company: z.string().max(160).optional().or(z.literal("")),
  photoUrl: optionalUrl,
  review: z.string().min(10).max(1500),
  projectReference: z.string().max(200).optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5).optional(),
  date: z.string().optional().or(z.literal("")),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  order: z.number().int().default(0),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(120),
  title: z.string().min(2).max(160),
  tagline: z.string().max(300).optional().or(z.literal("")),
  shortBio: z.string().min(10).max(600),
  bio: z.string().min(10).max(8000),
  photoUrl: optionalUrl,
  email: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().max(60).optional().or(z.literal("")),
  location: z.string().max(160).optional().or(z.literal("")),
  availabilityStatus: z.enum(["AVAILABLE", "LIMITED", "UNAVAILABLE"]),
  availabilityNote: z.string().max(200).optional().or(z.literal("")),
  yearsExperience: z.number().int().min(0).max(80),
  clientCount: z.number().int().min(0).max(100000),
  projectCount: z.number().int().min(0).max(100000),
  awardsCount: z.number().int().min(0).max(10000),
  philosophyTitle: z.string().max(200).optional().or(z.literal("")),
  philosophy: z.string().max(3000).optional().or(z.literal("")),
  interests: z.string().max(600).optional().or(z.literal("")),
  resumeUrl: optionalUrl,
});

export const settingsSchema = z.object({
  siteName: z.string().min(2).max(120),
  logoText: z.string().max(40).optional().or(z.literal("")),
  logoUrl: optionalUrl,
  tagline: z.string().max(300).optional().or(z.literal("")),
  metaTitle: z.string().max(200).optional().or(z.literal("")),
  metaDescription: z.string().max(320).optional().or(z.literal("")),
  metaKeywords: z.string().max(500).optional().or(z.literal("")),
  ogImageUrl: optionalUrl,
  contactEmail: z.string().max(200).optional().or(z.literal("")),
  whatsappUrl: optionalUrl,
  footerText: z.string().max(600).optional().or(z.literal("")),
  copyrightText: z.string().max(300).optional().or(z.literal("")),
  cvUrl: optionalUrl,
  accentColor: z.string().max(20).optional().or(z.literal("")),
});

export const socialLinkSchema = z.object({
  platform: z.string().min(1).max(60),
  label: z.string().min(1).max(60),
  url: z.string().min(1).max(600),
  icon: z.string().max(60).optional().or(z.literal("")),
  order: z.number().int().default(0),
  visible: z.boolean().default(true),
});
