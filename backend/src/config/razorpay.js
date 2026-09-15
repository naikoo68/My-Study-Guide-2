import crypto from "crypto";

// Razorpay helpers using the REST API directly (no SDK dependency). Keys come
// from env: RAZORPAY_KEY_ID (public) and RAZORPAY_KEY_SECRET (server-only).
export const razorpayConfigured = () =>
  !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID || "";

// Create an order. `amount` is in rupees; Razorpay expects the smallest unit.
export async function createRazorpayOrder({ amount, currency = "INR", receipt, notes }) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  // Razorpay caps `receipt` at 40 characters — never send a longer one.
  const safeReceipt = receipt ? String(receipt).slice(0, 40) : undefined;
  const resp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency, receipt: safeReceipt, notes, payment_capture: 1 }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error?.description || "Could not create the payment order.");
  return data; // { id, amount, currency, ... }
}

// Fetch a previously-created order from Razorpay by id. Returns the order
// object (amount is in the smallest unit / paise, plus `notes`, `status`,
// `amount_paid`, …) or null if it can't be retrieved. Used to independently
// confirm what was actually ordered/paid instead of trusting client-sent data.
export async function fetchRazorpayOrder(orderId) {
  if (!orderId || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  try {
    const resp = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// Independently verify that a paid order actually matches what we're about to
// grant. The Checkout signature only proves the payment is authentic FOR ITS
// ORDER — it does NOT prove the order was for the right plan/amount. Without
// this a user can pay for a ₹1 plan and then claim an expensive one using that
// order's ids. We re-fetch the order from Razorpay and assert:
//   - the order amount equals the price we expect (in paise),
//   - the plan recorded in the order notes matches the plan being activated,
//   - (optional) the order belongs to the same user / email,
//   - the order has actually been paid in full.
// Returns { ok: true, order } or { ok: false, reason }.
export async function verifyPaidOrder({ orderId, expectedAmountRupees, expectedPlan, expectedUserId, expectedEmail }) {
  const order = await fetchRazorpayOrder(orderId);
  if (!order) return { ok: false, reason: "order_not_found" };

  const expectedPaise = Math.round(Number(expectedAmountRupees) * 100);
  if (order.amount !== expectedPaise) return { ok: false, reason: "amount_mismatch" };

  // Confirm the order was actually paid in full (auto-capture → status "paid").
  if (order.status && order.status !== "paid") return { ok: false, reason: "not_paid" };
  if (typeof order.amount_paid === "number" && order.amount_paid < expectedPaise) {
    return { ok: false, reason: "not_paid" };
  }

  const notes = order.notes || {};
  if (expectedPlan && notes.plan !== expectedPlan) return { ok: false, reason: "plan_mismatch" };
  if (expectedUserId && notes.userId && String(notes.userId) !== String(expectedUserId)) {
    return { ok: false, reason: "user_mismatch" };
  }
  if (expectedEmail && notes.email && String(notes.email).toLowerCase() !== String(expectedEmail).toLowerCase()) {
    return { ok: false, reason: "email_mismatch" };
  }
  return { ok: true, order };
}

// Verify the Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, secret).
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature || !process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
