// Service worker: sets up the right-click context menu (selection only) and
// hands a "pending" action to the popup. It does NOT scrape pages or make AI
// calls on its own — everything happens on explicit user action via the popup.

const ITEMS = [
  { id: "msg-explain", title: "Explain this", action: "explain" },
  { id: "msg-questions", title: "Create questions", action: "questions" },
  { id: "msg-flashcards", title: "Create flashcards", action: "flashcards" },
  { id: "msg-summarize", title: "Summarize", action: "summarize" },
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "msg-parent", title: "My Study Guide", contexts: ["selection"] });
    ITEMS.forEach((m) => chrome.contextMenus.create({ id: m.id, parentId: "msg-parent", title: m.title, contexts: ["selection"] }));
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const item = ITEMS.find((m) => m.id === info.menuItemId);
  if (!item) return;
  await chrome.storage.local.set({
    pending: {
      action: item.action,
      text: info.selectionText || "",
      meta: { platform: "Selection", url: (tab && tab.url) || "", title: (tab && tab.title) || "" },
      at: Date.now(),
    },
  });
  // Try to open the popup directly; if the browser doesn't allow it here, badge
  // the icon so the user knows to click it.
  try {
    await chrome.action.openPopup();
    await chrome.action.setBadgeText({ text: "" });
  } catch {
    await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
    await chrome.action.setBadgeText({ text: "1" });
  }
});
