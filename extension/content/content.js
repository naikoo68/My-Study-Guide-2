// Content script: reads page content ONLY when the popup/background explicitly
// asks (never continuously). It picks the right platform adapter and returns the
// user-accessible text. No network calls happen here.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "MSG_GET_CONTENT") return false;
  try {
    const C = self.__MSGCompanion;
    const a = C ? C.pick() : null;
    if (!a) {
      sendResponse({ ok: false, error: "No adapter available." });
      return true;
    }
    sendResponse({
      ok: true,
      platform: a.name,
      title: a.getTitle ? a.getTitle() : document.title,
      meta: a.getMeta ? a.getMeta() : { platform: a.name, url: location.href },
      selected: a.getSelectedText ? a.getSelectedText() : "",
      transcript: a.getTranscript ? a.getTranscript() : "",
      visible: a.getVisibleContent ? a.getVisibleContent() : "",
    });
  } catch (e) {
    sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
  }
  return true; // keep the message channel open for the sync response
});
