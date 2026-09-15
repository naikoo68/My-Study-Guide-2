import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  companionStatus,
  companionQuestions,
  companionSummarize,
  companionExplain,
  companionFlashcards,
  companionPlatformRequest,
  companionSaveQuiz,
  companionHistory,
} from "../controllers/companionController.js";

const router = Router();

// AI-generating endpoints reuse the SAME access rule as the generator: only
// accounts that have AI access in this app (admin / institute_admin / client).
// resolveScope + per-plan quota are enforced inside the controller.
const ai = [protect, authorize("admin", "client")];

router.get("/status", protect, companionStatus);
router.post("/questions", ...ai, companionQuestions); // → { jobId }; poll GET /api/ai/job/:id
router.post("/summarize", ...ai, companionSummarize);
router.post("/explain", ...ai, companionExplain);
router.post("/flashcards", ...ai, companionFlashcards);
router.post("/save-quiz", ...ai, companionSaveQuiz); // save generated questions as a playable practice quiz
router.get("/history", protect, companionHistory);
router.post("/platform-request", protect, companionPlatformRequest);

export default router;
