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
  if (!sender.tab || !Number.isInteger(sender.tab.id)) {
    return;
  }

  if (message.type === "dtp-youtube-ad-state") {
    if (sender.url && sender.url.startsWith("https://www.youtube-nocookie.com/embed/") && sender.url.includes("dtp=1")) {
      chrome.tabs.sendMessage(sender.tab.id, message, { frameId: 0 });
    }
    return;
  }

  if (message.type === "dtp-open-youtube" && sender.frameId === 0 &&
      /^https:\/\/(www\.)?discogs\.com\/release\//.test(sender.url || "") &&
      typeof message.videoId === "string" && /^[a-zA-Z0-9_-]+$/.test(message.videoId)) {
    chrome.tabs.create({ url: `https://www.youtube.com/watch?v=${message.videoId}`, active: true });
  }
});
