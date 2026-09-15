import { Router } from "express";
import express from "express";
import {
  startAdminBackup, adminBackupJob, adminBackupFile,
  startAdminRestore, adminRestoreJob,
} from "../controllers/backupController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();
// Admins AND institute admins may back up / restore. Every query in the
// controller is tenant-scoped, so a super-admin backs up the whole platform
// while an institute admin backs up (and restores into) ONLY their own space.
const admin = [protect, authorize("admin")];
// A full-library restore can be a large JSON — allow a higher body limit than
// the app-wide default just for the restore endpoint.
const bigJson = express.json({ limit: "60mb" });

// Full admin content-library backup & restore (background jobs + progress).
router.post("/backup/start", ...admin, startAdminBackup);
router.get("/backup/job/:id", ...admin, adminBackupJob);
router.get("/backup/job/:id/file", ...admin, adminBackupFile);
router.post("/restore/start", ...admin, bigJson, startAdminRestore);
router.get("/restore/job/:id", ...admin, adminRestoreJob);

export default router;
