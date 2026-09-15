import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { practiceService } from "../../services";
import { useAuth } from "../../context/AuthContext";
import { Loading, ErrorState, EmptyState } from "../../components/ui/AsyncState";
import SlideshowPlayer from "../../components/quiz/SlideshowPlayer";

// Slideshow for a "My Practice" quiz. Loads the practice quiz's questions (with
// answers) via the same endpoint the practice player uses, then hands off to
// the shared SlideshowPlayer. Gated to content owners (admin/client) — see App.jsx.
export default function PracticeSlideshow() {
  const { itemId } = useParams();
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [quizTitle, setQuizTitle] = useState("Practice Quiz");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    practiceService
      .quizPlay(itemId)
      .then((data) => {
        setQuestions(Array.isArray(data?.questions) ? data.questions : []);
        setQuizTitle(data?.name || "Practice Quiz");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [itemId]);

  useEffect(load, [load]);

  // Clients return to their workspace; admins to the practice manager.
  const backTo = user?.role === "client" ? "/creator" : "/admin/practice";

  if (loading) return <div className="container-page"><Loading label="Loading quiz…" /></div>;
  if (error) return <div className="container-page"><ErrorState message={error} onRetry={load} /></div>;
  if (!questions.length) return <div className="container-page"><EmptyState message="No questions in this quiz yet." /></div>;

  return (
    <SlideshowPlayer questions={questions} quizTitle={quizTitle} crumb="" backTo={backTo} />
  );
}
