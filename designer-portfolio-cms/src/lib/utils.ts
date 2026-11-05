import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Derive a short monogram (1–2 letters) from the admin-editable site name:
 *  "Adrian Vale" → "AV", "jane doe studio" → "JD", "Mono" → "M". */
export function monogramFromSiteName(name?: string | null): string {
  const words = (name ?? "")
    .replace(/®\s*$/, "")
    .trim()
    .split(/[\s\-_]+/)
    .filter(Boolean)
  if (words.length === 0) return "AV"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
