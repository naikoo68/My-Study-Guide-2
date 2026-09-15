// Thin client to the EXISTING My Study Guide backend. Sends the stored JWT as a
// Bearer token; the server enforces auth, tenant, subscription and AI limits.
import { getApiBase, getToken, clearToken } from "./config.js";

async function request(path, { method = "GET", body } = {}) {
  const base = await getApiBase();
  const token = await getToken();
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await clearToken();
    throw new Error("Please sign in to My Study Guide again.");
  }
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status}).`);
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
};

// Sign in with an email + password → returns { user, token }.
export async function login(email, password) {
  const base = await getApiBase();
  const res = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Login failed.");
  return data;
}

// Poll a generation job (reuses the existing /api/ai/job/:id endpoint) until
// it finishes. Calls onProgress({ count, requested }) between polls.
export async function pollJob(jobId, onProgress) {
  for (let i = 0; i < 300; i++) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 2000));
    let s;
    try {
      // eslint-disable-next-line no-await-in-loop
      s = await api.get(`/ai/job/${jobId}`);
    } catch {
      continue;
    }
    if (onProgress) onProgress({ count: s.count || 0, requested: s.requested || 0, status: s.status });
    if (s.status === "done") return s.questions || [];
    if (s.status === "error") throw new Error(s.error || "Generation failed.");
  }
  throw new Error("This is taking too long — try a smaller selection.");
}
