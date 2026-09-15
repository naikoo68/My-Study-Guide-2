import TrialClaim from "../models/TrialClaim.js";
import { runUnscoped } from "./tenantContext.js";

// Shared helpers for the durable, platform-wide "this email already used a free
// trial" ledger. Always run UNSCOPED so the ledger is global (independent of
// tenant) and survives account deletion. `kind` = student | client | institute.

export async function trialClaimed(email, kind) {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  return !!(await runUnscoped(() => TrialClaim.findOne({ email: e, kind }).select("_id")));
}

export async function recordTrialUsed(email, kind) {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return;
  await runUnscoped(() =>
    TrialClaim.updateOne({ email: e, kind }, { $setOnInsert: { email: e, kind } }, { upsert: true })
  ).catch(() => {});
}
