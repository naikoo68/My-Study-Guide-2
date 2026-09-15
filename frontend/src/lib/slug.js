// Build a clean, URL-safe slug from a display name. Used for SEO landing-page
// URLs (e.g. /exams/ssc-cgl) when the underlying record has no stored slug.
// Mirrors the backend slugify used for streams/subjects so URLs look consistent.
export function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
