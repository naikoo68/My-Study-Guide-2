# My Study Guide Companion (browser extension)

A Manifest V3 browser extension that turns **permitted** study content on other
learning platforms into practice material using the **existing My Study Guide
AI** — nothing is generated inside the extension.

```
External platform page → Companion (reads only user-accessible text)
   → My Study Guide backend  /api/companion/*   (your account, tenant, subscription, AI limits)
   → existing AI pipeline → generated content
```

## What it does NOT do
- No third-party passwords. You stay logged in to each platform on its own site.
- No bypassing DRM, paywalls, CAPTCHA, auth or anti-copy. It only reads the text
  you can already see (visible text, an **open** transcript panel, your selection).
- No AI keys or secrets live in the extension. It only stores your My Study Guide
  JWT and the API base URL, and calls your backend.
- It reads a page **only when you act** (open the popup / use the right-click menu) —
  never continuous scraping.

## Install (unpacked, for now)
1. Open your browser's Extensions page → enable **Developer mode**.
2. **Load unpacked** → select this `extension/` folder.
3. Click the Companion icon → **⚙️ Settings** → set:
   - **API base URL** = your backend, e.g. `https://<your-backend>/api`
   - **My Study Guide site** = your frontend URL
4. Sign in with your My Study Guide account (must be an account with AI access —
   admin or client).

## Use
- Open a lecture/video/course, then click the Companion icon → choose
  **Create Questions / Summary / Flashcards / Explain**.
- Or select text on any page → right-click → **My Study Guide** → pick an action.

## Platform adapters (`content/adapters.js`)
Modular and independent. Shipped: **YouTube** (title + description + open
transcript) and a **Generic** fallback (selected/visible text) that works on any
site. **PW / Unacademy / Udemy / Coursera** are stubs that fall back to
visible/selected text until dedicated, tested adapters are added — page
structures differ and change, so those are intentionally conservative.

## Backend endpoints used
- `POST /api/companion/questions` → reuses the existing generator (returns `{ jobId }`, polled via `GET /api/ai/job/:id`)
- `POST /api/companion/summarize` · `/explain` · `/flashcards`
- `GET  /api/companion/status`, `POST /api/companion/platform-request`

## Roadmap (not in this first version)
- One-click **Save to question bank / Create quiz** from the popup (needs a
  destination picker reusing `/api/questions/bulk` + practice items).
- Persistent flashcards (needs a new model) and Companion history.
- Real adapters for PW/Unacademy/Udemy/Coursera.
- A published store listing.
