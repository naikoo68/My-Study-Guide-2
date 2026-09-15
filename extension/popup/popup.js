import { api, login, pollJob } from "../lib/api.js";
import { getToken, setToken, clearToken, getApiBase, setApiBase, getSite, setSite } from "../lib/config.js";

const $ = (id) => document.getElementById(id);
const show = (id) => { ["view-auth", "view-settings", "view-main"].forEach((v) => $(v).classList.toggle("hidden", v !== id)); };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let activeTabId = null;
let current = null; // { platform, title, meta, selected, transcript, visible }

/* ---------------- content extraction (only on user action) ---------------- */
async function genericExtract(tabId) {
  const out = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const sel = window.getSelection ? String(window.getSelection()) : "";
      const main = document.querySelector("main, article, [role='main']") || document.body;
      const visible = (main ? main.innerText : "").slice(0, 40000);
      return {
        ok: true,
        platform: "Website",
        title: document.title || "",
        meta: { platform: "Website", url: location.href, title: document.title || "" },
        selected: (sel || "").trim(),
        transcript: "",
        visible: (visible || "").trim(),
      };
    },
  });
  return out && out[0] ? out[0].result : null;
}

async function loadContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab ? tab.id : null;
  let data = null;
  try {
    data = await chrome.tabs.sendMessage(activeTabId, { type: "MSG_GET_CONTENT" });
  } catch {
    data = null;
  }
  if ((!data || !data.ok) && activeTabId) {
    try { data = await genericExtract(activeTabId); } catch { data = null; }
  }
  current = data && data.ok ? data : { platform: "This page", title: (tab && tab.title) || "", meta: { platform: "Website", url: (tab && tab.url) || "" }, selected: "", transcript: "", visible: "" };
  renderDetected();
}

function renderDetected() {
  $("platform").textContent = current.selected ? `${current.platform} · selection` : `${current.platform}`;
  $("title").textContent = current.title || "";
  const bits = [];
  if (current.transcript) bits.push("✓ Transcript");
  if (current.selected) bits.push("✓ Selected text");
  if (current.visible) bits.push("✓ Page text");
  $("avail").textContent = bits.length ? `Content available: ${bits.join("  ")}` : "No readable text found — select some text, or open the transcript.";
}

// Which text to send for an action.
function contentFor(action) {
  if (action === "explain") return current.selected || current.visible || current.transcript || "";
  return current.transcript || current.selected || current.visible || "";
}

/* ------------------------------- actions -------------------------------- */
function progress(t) { const el = $("progress"); el.classList.toggle("hidden", !t); el.textContent = t || ""; }
function setResult(html) { $("result").innerHTML = html; }

async function runQuestions() {
  const content = contentFor("questions");
  if (content.length < 40) return setResult('<p class="msg">Not enough content. Open the transcript or select text.</p>');
  const count = Math.max(1, Math.min(50, parseInt($("q-count").value, 10) || 10));
  const difficulty = $("q-diff").value || undefined;
  const types = Array.from($("q-types").querySelectorAll("input:checked")).map((c) => c.value);
  progress("Analyzing content…\n● Generating questions");
  setResult("");
  try {
    const { jobId } = await api.post("/companion/questions", { content, meta: current.meta, count, difficulty, types: types.length ? types : ["mcq"] });
    const qs = await pollJob(jobId, (p) => progress(`Generating… ${p.count || 0} of ${p.requested || count} ready`));
    progress("");
    if (!qs.length) return setResult('<p class="msg">No questions were generated. Try a larger selection.</p>');
    setResult(
      `<p><b>${qs.length}</b> questions created.</p>` +
      `<div class="row" style="margin-bottom:8px"><button class="btn primary" id="save-quiz">Save as quiz</button><button class="linkbtn" id="copy">Copy (JSON)</button></div>` +
      qs.map((q, i) => `<div class="card"><b>Q${i + 1}.</b> ${esc(q.text)}<br>${(q.options || []).map((o, x) => `${String.fromCharCode(65 + x)}. ${esc(o)}${x === q.correct ? " ✓" : ""}`).join("<br>")}${q.explanation ? `<div class="muted">${esc(q.explanation)}</div>` : ""}</div>`).join("")
    );
    $("copy").onclick = () => navigator.clipboard.writeText(JSON.stringify(qs, null, 2));
    $("save-quiz").onclick = async () => {
      const btn = $("save-quiz");
      btn.disabled = true;
      btn.textContent = "Saving…";
      try {
        const r = await api.post("/companion/save-quiz", { title: current.title, questions: qs, meta: current.meta });
        const site = await getSite();
        btn.outerHTML = `<a class="btn primary" style="text-decoration:none" href="${site}${r.playPath}" target="_blank" rel="noreferrer">✓ Saved (${r.inserted}) · Open quiz ↗</a>`;
      } catch (e) {
        btn.disabled = false;
        btn.textContent = "Save as quiz";
        setResult(`<p class="msg">${esc(e.message)}</p>` + $("result").innerHTML);
      }
    };
  } catch (e) {
    progress("");
    setResult(`<p class="msg">${esc(e.message)}</p>`);
  }
}

async function runText(action, endpoint, label) {
  const content = contentFor(action);
  if (content.length < (action === "explain" ? 3 : 40)) return setResult('<p class="msg">Not enough content. Select text or open the transcript.</p>');
  progress(`${label}…`);
  setResult("");
  try {
    const r = await api.post(endpoint, { content, meta: current.meta });
    progress("");
    if (action === "flashcards") {
      const cards = r.cards || [];
      setResult(`<p><b>${cards.length}</b> flashcards.</p>` + cards.map((c) => `<div class="card"><b>${esc(c.front)}</b><div>${esc(c.back)}</div></div>`).join("") + `<button class="linkbtn" id="copy">Copy (JSON)</button>`);
      $("copy").onclick = () => navigator.clipboard.writeText(JSON.stringify(cards, null, 2));
    } else {
      const txt = r.summary || r.explanation || "";
      setResult(`<div class="card" style="white-space:pre-wrap">${esc(txt)}</div><button class="linkbtn" id="copy">Copy</button>`);
      $("copy").onclick = () => navigator.clipboard.writeText(txt);
    }
  } catch (e) {
    progress("");
    setResult(`<p class="msg">${esc(e.message)}</p>`);
  }
}

function runAction(action) {
  $("q-opts").classList.toggle("hidden", action !== "questions");
  if (action === "questions") return; // wait for Generate
  if (action === "summarize") return runText("summarize", "/companion/summarize", "Summarizing");
  if (action === "explain") return runText("explain", "/companion/explain", "Explaining");
  if (action === "flashcards") return runText("flashcards", "/companion/flashcards", "Building flashcards");
}

/* ------------------------------- boot ----------------------------------- */
async function showMain() {
  show("view-main");
  $("open-site").href = await getSite();
  await loadContent();
  // Handle a pending action queued from the right-click menu.
  const { pending } = await chrome.storage.local.get("pending");
  if (pending && Date.now() - pending.at < 5 * 60 * 1000 && pending.text) {
    await chrome.storage.local.remove("pending");
    chrome.action.setBadgeText({ text: "" }).catch(() => {});
    current = { platform: pending.meta.platform || "Selection", title: pending.meta.title || "", meta: pending.meta, selected: pending.text, transcript: "", visible: pending.text };
    renderDetected();
    runAction(pending.action);
  }
}

async function init() {
  $("ver").textContent = "v" + (chrome.runtime.getManifest().version || "");
  $("apiBase").value = await getApiBase();
  $("site").value = await getSite();

  $("gear").onclick = () => show("view-settings");
  $("signin").onclick = async () => {
    $("auth-msg").textContent = "";
    try {
      const { token } = await login($("email").value.trim(), $("password").value);
      if (!token) throw new Error("No token returned.");
      await setToken(token);
      showMain();
    } catch (e) { $("auth-msg").textContent = e.message; }
  };
  $("save-settings").onclick = async () => {
    await setApiBase($("apiBase").value);
    await setSite($("site").value);
    $("settings-msg").textContent = "Saved.";
    setTimeout(() => (getToken().then((t) => (t ? showMain() : show("view-auth")))), 400);
  };
  $("signout").onclick = async () => { await clearToken(); show("view-auth"); };
  $("q-go").onclick = runQuestions;
  document.querySelectorAll(".act").forEach((b) => (b.onclick = () => runAction(b.dataset.action)));

  const token = await getToken();
  if (token) showMain(); else show("view-auth");
}

document.addEventListener("DOMContentLoaded", init);
