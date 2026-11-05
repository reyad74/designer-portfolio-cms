/**
 * Applies the admin-configured ThemeConfig (Django singleton) as CSS variables.
 * All public components consume the existing design tokens, so a theme change
 * propagates across the entire website without code changes.
 */
export interface ThemeConfig {
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
}

const FONT_EXPR: Record<string, string> = {
  "Space Grotesk": "var(--font-space-grotesk)",
  Inter: "var(--font-inter)",
  "Playfair Display": "var(--font-playfair)",
  "system-ui": "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

function applyTo(el: HTMLElement | null, name: string, value?: string | number | null) {
  if (!el || value === undefined || value === null || value === "") return;
  el.style.setProperty(name, String(value));
}

export function applyTheme(theme?: ThemeConfig | null) {
  if (typeof document === "undefined" || !theme) return;
  const targets: (HTMLElement | null)[] = [document.documentElement, document.body];

  const isLight = String(theme.mode).toUpperCase() === "LIGHT";
  for (const el of targets) {
    applyTo(el, "--primary", theme.primaryColor);
    applyTo(el, "--lime", theme.primaryColor);
    applyTo(el, "--ring", theme.primaryColor);
    applyTo(el, "--primary-foreground", isLight ? "#ffffff" : "#0c0f00");
    applyTo(el, "--accent-foreground", theme.primaryColor);
    applyTo(el, "--background", theme.backgroundColor);
    applyTo(el, "--surface", theme.surfaceColor);
    applyTo(el, "--elevated", theme.cardColor);
    applyTo(el, "--card", theme.cardColor);
    applyTo(el, "--popover", theme.surfaceColor);
    applyTo(el, "--foreground", theme.textColor);
    applyTo(el, "--card-foreground", theme.textColor);
    applyTo(el, "--muted-foreground", theme.textMutedColor);
    applyTo(el, "--border", theme.borderColor);
    applyTo(el, "--input", theme.borderColor);
    applyTo(el, "--radius", `${theme.borderRadius}px`);
    applyTo(el, "--font-heading", FONT_EXPR[theme.headingFont] ?? "var(--font-space-grotesk)");
    applyTo(el, "--font-sans", FONT_EXPR[theme.bodyFont] ?? "var(--font-inter)");
    applyTo(el, "--font-editorial", FONT_EXPR[theme.editorialFont] ?? "var(--font-playfair)");
  }

  const rootEl = document.documentElement;
  const scale = Number(theme.fontSizeScale ?? 1) || 1;
  rootEl.style.fontSize = `${Math.round(theme.baseFontSize * scale * 100) / 100}px`;
  rootEl.dataset.themeMode = theme.mode === "LIGHT" ? "LIGHT" : "DARK";
  rootEl.dataset.btnStyle = theme.buttonStyle || "sharp";
  rootEl.dataset.spacing = theme.sectionSpacing || "comfortable";
  rootEl.dataset.cardStyle = theme.cardStyle || "flat";
}
