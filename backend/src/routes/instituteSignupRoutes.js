import { Router } from "express";
import {
  signupConfig,
  checkAvailability,
  sendSignupOtp,
  verifySignupOtp,
  createInstituteOrder,
  provisionInstitute,
} from "../controllers/instituteSignupController.js";

const router = Router();

// All PUBLIC (no auth) — this is how a brand-new institute signs itself up.
router.get("/config", signupConfig);
router.get("/availability", checkAvailability);
router.post("/send-otp", sendSignupOtp); // email the admin a verification code
router.post("/verify-otp", verifySignupOtp); // confirm the code before signup
router.post("/order", createInstituteOrder);
router.post("/", provisionInstitute);

export default router;
