/** CMS extension types (homepage builder, theme, navigation, revisions). */

export interface ThemeConfig {
  id: string;
  mode: string;
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  cardColor: string;
  textColor: string;
  textMutedColor: string;
  borderColor: string;
  headingFont: string;
  bodyFont: string;
  editorialFont: string;
  baseFontSize: number;
  fontSizeScale: number | string;
  borderRadius: number;
  buttonStyle: string;
  sectionSpacing: string;
  cardStyle: string;
  updatedAt?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  position: "HEADER" | "FOOTER";
  order: number;
  isVisible: boolean;
  openInNew: boolean;
}

export type SectionType =
  | "hero"
  | "marquee"
  | "featured_projects"
  | "about_preview"
  | "services_preview"
  | "skills_preview"
  | "testimonials_preview"
  | "experience_preview"
  | "contact_cta";

export interface HomepageSection {
  id: string;
  sectionType: SectionType;
  title: string;
  subtitle: string;
  description: string;
  config: Record<string, unknown>;
  backgroundUrl: string;
  backgroundStyle: "none" | "gradient" | "noise" | "grid";
  order: number;
  isVisible: boolean;
  status: "DRAFT" | "PUBLISHED";
  projects?: Project[];
  updatedAt?: string;
}

export interface Revision {
  id: string;
  contentLabel: string;
  objectId: string;
  action: string;
  objectRepr: string;
  data: Record<string, unknown>;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
}

import type { Project } from "@/lib/types";
