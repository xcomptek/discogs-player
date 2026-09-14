const dtpPlayer = new URLSearchParams(window.location.search).get("dtp") === "1";

if (dtpPlayer) {
  let adActive = false;
  const clickedSkipButtons = new WeakSet();

  function setVideoMuted(muted) {
    document.querySelectorAll("video").forEach((video) => {
      video.muted = muted;
    });
  }

  function clickSkipButton() {
    const button = document.querySelector(".ytp-ad-skip-button-modern, .ytp-ad-skip-button, .ytp-skip-ad-button");
    if (!button || button.disabled || !button.getClientRects().length || clickedSkipButtons.has(button)) {
      return;
    }

    clickedSkipButtons.add(button);
    button.click();
  }

  function updateAdState() {
    const adOverlay = document.querySelector(".video-ads.ytp-ad-module .ytp-ad-player-overlay");
    const playerElement = document.querySelector(".html5-video-player");
    const showingAd = Boolean(
      (playerElement && playerElement.classList.contains("ad-showing")) ||
      (adOverlay && adOverlay.getClientRects().length)
    );

    if (showingAd) {
      setVideoMuted(true);
      clickSkipButton();
    }

    if (showingAd === adActive) {
      return;
    }

    adActive = showingAd;
    if (!adActive) {
      setVideoMuted(false);
    }

    chrome.runtime.sendMessage({
      type: "dtp-youtube-ad-state",
      active: adActive
    });
  }

  updateAdState();
  new MutationObserver(updateAdState).observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true
  });
}
