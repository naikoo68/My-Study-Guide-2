import { Star } from "lucide-react";

// Initials for a review avatar when no photo is provided.
const initials = (name) =>
  String(name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "★";

// Shared grid of review/testimonial cards. `items` are approved reviews
// ({ name, exam, rating, text, photo }). Used on the home page, the reviews
// page and the client dashboard so every surface looks identical.
export default function ReviewCards({ items = [] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t, i) => (
        <figure key={t._id || i} className="card flex flex-col p-6">
          <div className="flex gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, k) => (
              <Star key={k} className={`h-4 w-4 ${k < (t.rating || 5) ? "fill-current" : "opacity-30"}`} />
            ))}
          </div>
          <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            “{t.text}”
          </blockquote>
          <figcaption className="mt-5 flex items-center gap-3">
            {t.photo ? (
              <img src={t.photo} alt={`${t.name}${t.exam ? ` — ${t.exam}` : ""}`} loading="lazy" decoding="async" width="44" height="44" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent-500 text-sm font-bold text-white">
                {initials(t.name)}
              </span>
            )}
            <div>
              <p className="text-sm font-bold">{t.name}</p>
              {t.exam && <p className="text-xs text-slate-500 dark:text-slate-400">{t.exam}</p>}
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
