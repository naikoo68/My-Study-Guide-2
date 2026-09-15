// Modular platform adapters. Each adapter is independent and only reads content
// the user is already authorised to see (visible text, an OPEN transcript panel,
// the current selection). Nothing here bypasses paywalls, DRM, auth or anti-copy
// protection. Adapters attach to a shared object on the content-script global.
(function () {
  const CAP = 40000;
  const clean = (s) => String(s || "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  const readText = (el) => (el ? clean(el.innerText) : "");
  const selection = () => (window.getSelection ? clean(String(window.getSelection())) : "");
  const meta = (platform, extra) => Object.assign({ platform, url: location.href, contentType: "text" }, extra || {});

  // Generic fallback — works on ANY page (selected text / visible main text).
  const generic = {
    id: "generic",
    name: "This page",
    canHandle: () => true,
    getTitle: () => document.title || "",
    getSelectedText: selection,
    getTranscript: () => "",
    getVisibleContent() {
      const main = document.querySelector("main, article, [role='main']") || document.body;
      return readText(main).slice(0, CAP);
    },
    getMeta() {
      return meta("Website", { title: document.title });
    },
  };

  // YouTube — reads the video title, the description, and the transcript ONLY if
  // the user has opened the transcript panel (we never fetch protected streams).
  const youtube = {
    id: "youtube",
    name: "YouTube",
    canHandle: () => /(^|\.)youtube\.com$/.test(location.hostname),
    getTitle: () => readText(document.querySelector("h1.ytd-watch-metadata, h1.title")) || document.title,
    getSelectedText: selection,
    getTranscript() {
      const segs = document.querySelectorAll("ytd-transcript-segment-renderer .segment-text, .ytd-transcript-segment-renderer .segment-text");
      if (!segs.length) return "";
      return clean(Array.from(segs).map((s) => s.innerText).join(" "));
    },
    getVisibleContent() {
      const transcript = this.getTranscript();
      if (transcript) return transcript.slice(0, CAP);
      const desc = document.querySelector("#description-inline-expander, #description, ytd-text-inline-expander");
      return readText(desc).slice(0, CAP);
    },
    getMeta() {
      return meta("YouTube", { title: this.getTitle() });
    },
  };

  // Platform stubs: page structures differ and change often, so until a real,
  // tested adapter exists these fall back to visible/selected text. This keeps
  // the Companion useful without guessing fragile selectors.
  const stub = (id, name, hostRe) => ({
    id,
    name,
    canHandle: () => hostRe.test(location.hostname),
    getTitle: () => document.title || "",
    getSelectedText: selection,
    getTranscript: () => "",
    getVisibleContent: generic.getVisibleContent,
    getMeta() {
      return meta(name, { title: document.title });
    },
  });

  const adapters = [
    youtube,
    stub("pw", "Physics Wallah", /(^|\.)pw\.live$/),
    stub("unacademy", "Unacademy", /(^|\.)unacademy\.com$/),
    stub("udemy", "Udemy", /(^|\.)udemy\.com$/),
    stub("coursera", "Coursera", /(^|\.)coursera\.org$/),
    generic, // must stay last
  ];

  const pick = () => adapters.find((a) => { try { return a.canHandle(); } catch { return false; } }) || generic;

  // Expose to the sibling content script (shared isolated-world global).
  self.__MSGCompanion = { adapters, pick, generic };
})();
