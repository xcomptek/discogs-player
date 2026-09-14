chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) {
      return;
    }

    chrome.tabs.sendMessage(details.tabId, { type: "dtp-youtube-ad" }, { frameId: 0 });
  },
  {
    urls: ["https://*.youtube.com/pagead/interaction/*"]
  }
);

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== "dtp-youtube-ad-state" || !sender.tab) {
    return;
  }

  chrome.tabs.sendMessage(sender.tab.id, message, { frameId: 0 });
});
