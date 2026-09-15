import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Visual breadcrumb trail for public SEO pages. `items` = [{ label, to? }];
// the LAST item is the current page (rendered without a link).
export default function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1">
            {it.to && !last ? (
              <Link to={it.to} className="hover:text-brand-600 dark:hover:text-brand-400">{it.label}</Link>
            ) : (
              <span className={last ? "text-slate-700 dark:text-slate-300" : ""}>{it.label}</span>
            )}
            {!last && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          </span>
        );
      })}
    </nav>
  );
}

// Build a Schema.org BreadcrumbList (absolute URLs) from the same `items`, to
// pass into useSeo(..., jsonLd) so search engines see the hierarchy.
export function breadcrumbLd(items = []) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.mystudyguide.in";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.to ? { item: origin + it.to } : {}),
    })),
  };
}
