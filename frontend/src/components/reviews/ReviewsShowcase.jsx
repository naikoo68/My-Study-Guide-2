import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { reviewService } from "../../services";
import { useSettings } from "../../context/SettingsContext";
import ReviewCards from "./ReviewCards";

// Self-contained "What our students say" block. Fetches the current institute's
// approved reviews (tenant-scoped by the API) and shows up to `max` of them with
// a "See all" button when there are more. Pass showAll to render the full list
// (used on the dedicated reviews page). Renders nothing when there are no
// reviews yet — so a fresh institute never shows placeholder/demo content.
export default function ReviewsShowcase({ max = 5, showAll = false, showActions = true }) {
  const { settings } = useSettings();
  const [items, setItems] = useState([]);
  useEffect(() => {
    let active = true;
    reviewService.approved(showAll ? 100 : 24)
      .then((r) => active && setItems(r.items || []))
      .catch(() => {});
    return () => { active = false; };
  }, [showAll]);

  if (!items.length) return null;
  const shown = showAll ? items : items.slice(0, max);

  return (
    <section>
      <div className="mx-auto max-w-2xl text-center">
        <span className="badge bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
          <Star className="h-3.5 w-3.5" /> Loved by students
        </span>
        <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">What our students say</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Real results from learners preparing with {settings.siteName}.
        </p>
      </div>
      <div className="mt-8">
        <ReviewCards items={shown} />
      </div>
      {showActions && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {!showAll && items.length > max && (
            <Link to="/review" className="btn-primary"><Star className="h-4 w-4" /> See all reviews</Link>
          )}
          <Link to="/review" className="btn-outline"><Star className="h-4 w-4" /> Share your review</Link>
        </div>
      )}
    </section>
  );
}
