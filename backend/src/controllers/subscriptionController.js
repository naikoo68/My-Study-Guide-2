import User from "../models/User.js";
import { redeemCoupon } from "../models/Coupon.js";
import { computeOffer, creditReferrer } from "./authController.js";
import { razorpayConfigured, razorpayKeyId, createRazorpayOrder, verifyPaymentSignature, verifyPaidOrder } from "../config/razorpay.js";
import { runUnscoped } from "../utils/tenantContext.js";

// Both routes run behind attachUser + authorize("client"), so an EXPIRED
// client (e.g. a finished trial) can still renew/upgrade their own account.

// POST /api/subscriptions/order — create a Razorpay order to upgrade/renew.
export async function upgradeOrder(req, res) {
  const offer = await computeOffer({
    planKey: req.body?.plan,
    couponCode: req.body?.couponCode,
    referralCode: req.body?.referralCode,
    selfEmail: req.user.email,
  });
  if (!offer || offer.plan.key === "trial") return res.status(400).json({ message: "Choose a paid plan to upgrade." });

  // Free (₹0 via coupon) or payments not configured → no checkout needed.
  if (!razorpayConfigured() || offer.finalPrice <= 0) return res.json({ free: true, finalPrice: offer.finalPrice });

  try {
    const order = await createRazorpayOrder({
      amount: offer.finalPrice,
      receipt: `up_${String(req.user._id).slice(-8)}_${Date.now()}`,
      notes: { plan: offer.plan.key, userId: String(req.user._id) },
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: razorpayKeyId(), finalPrice: offer.finalPrice });
  } catch (e) {
    res.status(502).json({ message: e.message || "Could not start the payment." });
  }
}

// POST /api/subscriptions/activate — verify payment (if any) and extend validity.
export async function upgradeActivate(req, res) {
  const offer = await computeOffer({
    planKey: req.body?.plan,
    couponCode: req.body?.couponCode,
    referralCode: req.body?.referralCode,
    selfEmail: req.user.email,
  });
  if (!offer || offer.plan.key === "trial") return res.status(400).json({ message: "Choose a paid plan to upgrade." });

  if (razorpayConfigured() && offer.finalPrice > 0) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "No payment was received. Please try again." });
    }
    if (!verifyPaymentSignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature })) {
      return res.status(400).json({ message: "Payment could not be verified. Please try again." });
    }
    // Re-fetch the order and confirm it was paid in full for THIS plan/price and
    // belongs to THIS user — the signature alone doesn't prove any of that, so a
    // cheap order can't be replayed to claim an expensive upgrade.
    const match = await verifyPaidOrder({
      orderId: razorpay_order_id,
      expectedAmountRupees: offer.finalPrice,
      expectedPlan: offer.plan.key,
      expectedUserId: req.user._id,
    });
    if (!match.ok) {
      console.error("[payment] upgrade order verification failed", { order: razorpay_order_id, reason: match.reason });
      return res.status(400).json({ message: "Payment could not be verified. Please try again." });
    }
    // Replay protection: a payment id may only be consumed once, across accounts.
    const usedPayment = await runUnscoped(() =>
      User.findOne({
        _id: { $ne: req.user._id },
        $or: [{ paymentId: razorpay_payment_id }, { studentPaymentId: razorpay_payment_id }],
      }).select("_id")
    );
    if (usedPayment) {
      return res.status(400).json({ message: "This payment has already been used." });
    }
    req.user.paymentId = razorpay_payment_id;
  }

  // Extend from the later of now or the current (still-active) expiry, so an
  // early renewal adds time instead of losing the remaining days.
  const now = Date.now();
  const base = req.user.expiresAt && req.user.expiresAt.getTime() > now ? new Date(req.user.expiresAt) : new Date();
  base.setMonth(base.getMonth() + offer.plan.months);

  req.user.expiresAt = base;
  req.user.isTrial = false;
  // A paid plan includes AI generation limits — make sure AI access is on so a
  // subscriber (or a renewing client whose access was never granted) can use it.
  req.user.aiAccess = true;
  req.user.subscriptionPlan = offer.plan.key;
  req.user.subscriptionMonths = offer.plan.months;
  req.user.subscriptionPrice = offer.finalPrice;
  if (offer.applied?.coupon && !offer.applied.coupon.invalid) req.user.couponCode = offer.applied.coupon.code;
  if (offer.applied?.referral && !offer.applied.referral.invalid) req.user.referredBy = req.user.referredBy || offer.applied.referral.code;

  // Friend bought a paid plan → reward whoever referred them (+10 days), once.
  await creditReferrer(req.user);
  await req.user.save();

  if (offer.applied?.coupon && !offer.applied.coupon.invalid) {
    redeemCoupon(offer.applied.coupon.code).catch(() => {});
  }

  res.json({ ok: true, expiresAt: req.user.expiresAt, plan: offer.plan.key });
}
