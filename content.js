let player;
let activeVideoId = "";
let isPlaying = false;
let playerReady = false;
let pendingVideoId = "";
let currentTime = 0;
let refreshTimer;
let adVideoId = "";

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getVideoId(src) {
  const match = src.match(/\/vi\/([^/]+)/);
  return match ? match[1] : "";
}

function getVideos() {
  const section = document.querySelector("#release-videos");
  if (!section) {
    return [];
  }

  return Array.from(section.querySelectorAll("ul li button"))
    .map((button) => {
      const image = button.querySelector("img[src*='/vi/']");
      const title = button.querySelector("div");
      const id = image ? getVideoId(image.src) : "";

      return {
        id,
        title: title ? title.textContent.trim() : "",
        normalizedTitle: title ? normalize(title.textContent) : ""
      };
    })
    .filter((video) => video.id && video.title);
}

function getTracks() {
  const section = document.querySelector("#release-tracklist");
  if (!section) {
    return [];
  }

  return Array.from(section.querySelectorAll("tr[data-track-position]")).map((row) => {
    const titleCell = row.cells[2];
    const titleElement = titleCell ? titleCell.querySelector(":scope > span:first-child") : null;
    const position = row.dataset.trackPosition || "";
    const title = titleElement ? titleElement.textContent.trim() : "";

    return {
      row,
      position,
      normalizedPosition: normalize(position),
      title,
      normalizedTitle: normalize(title)
    };
  });
}

function scoreMatch(track, video) {
  let score = 0;
  const ignoredWords = new Set([
    "12", "inch", "mix", "remix", "edit", "version", "video",
    "official", "unofficial", "extended", "original", "radio",
    "vocal", "instrumental", "remaster", "remastered"
  ]);
  const trackWords = track.normalizedTitle
    .split(" ")
    .filter((word) => word && !ignoredWords.has(word));
  const videoWords = video.normalizedTitle
    .split(" ")
    .filter((word) => word && !ignoredWords.has(word));
  const trackTitle = trackWords.join(" ");
  const videoTitle = videoWords.join(" ");

  if (trackTitle && videoTitle.includes(trackTitle)) {
    score += 100;
  } else {
    const videoWordSet = new Set(videoWords);
    const matchingWords = trackWords.filter((word) => videoWordSet.has(word));

    if (trackWords.length && matchingWords.length === trackWords.length) {
      score += 70;
    } else if (trackWords.length > 1 && matchingWords.length / trackWords.length >= 0.6) {
      score += 50;
    }
  }

  if (track.normalizedPosition) {
    const positionPattern = new RegExp(`(^| )${track.normalizedPosition}( |$)`);
    if (positionPattern.test(video.normalizedTitle)) {
      score += 50;
    }
  }

  return score;
}

function matchTracks(tracks, videos) {
  const usedVideoIds = new Set();

  return tracks.map((track) => {
    let bestVideo = null;
    let bestScore = 0;

    videos.forEach((video) => {
      if (usedVideoIds.has(video.id)) {
        return;
      }

      const score = scoreMatch(track, video);
      if (score > bestScore) {
        bestScore = score;
        bestVideo = video;
      }
    });

    if (bestVideo && bestScore >= 50) {
      usedVideoIds.add(bestVideo.id);
    } else {
      bestVideo = null;
    }

    return { track, video: bestVideo };
  });
}

function createPlayer(videoId) {
  const container = document.createElement("div");
  container.id = "dtp-player-container";
  container.setAttribute("aria-hidden", "true");

  const origin = encodeURIComponent(window.location.origin);
  player = document.createElement("iframe");
  player.id = "dtp-youtube-player";
  player.allow = "autoplay; encrypted-media";
  player.tabIndex = -1;
  player.title = "Discogs track audio player";
  player.addEventListener("load", markPlayerReady);
  player.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&enablejsapi=1&playsinline=1&dtp=1&origin=${origin}`;

  container.appendChild(player);
  document.documentElement.appendChild(container);
}

function sendPlayerCommand(command, args = []) {
  if (!player || !player.contentWindow) {
    return;
  }

  player.contentWindow.postMessage(JSON.stringify({
    event: "command",
    func: command,
    args
  }), "*");
}

function markPlayerReady() {
  playerReady = true;
  player.contentWindow.postMessage(JSON.stringify({
    event: "listening",
    id: player.id
  }), "*");

  if (pendingVideoId) {
    sendPlayerCommand("loadVideoById", [pendingVideoId]);
    pendingVideoId = "";
  }
}

function updateButtons() {
  document.querySelectorAll(".dtp-button").forEach((button) => {
    const playing = isPlaying && button.dataset.videoId === activeVideoId;
    button.dataset.playing = String(playing);
    button.setAttribute("aria-label", playing ? `Pause ${button.dataset.trackTitle}` : `Play ${button.dataset.trackTitle}`);
    button.title = playing ? "Pause" : "Play";
  });

  document.querySelectorAll(".dtp-seek-button").forEach((button) => {
    button.disabled = !button.dataset.videoId || button.dataset.videoId !== activeVideoId;
  });

  document.querySelectorAll(".dtp-ad-label").forEach((label) => {
    label.hidden = label.dataset.videoId !== adVideoId || label.dataset.videoId !== activeVideoId;
  });
}

function loadVideo(videoId) {
  activeVideoId = videoId;
  isPlaying = true;
  currentTime = 0;
  adVideoId = "";

  if (!player) {
    createPlayer(videoId);
  } else if (playerReady) {
    sendPlayerCommand("loadVideoById", [videoId]);
  } else {
    pendingVideoId = videoId;
  }

  updateButtons();
}

function toggleVideo(videoId) {
  if (videoId !== activeVideoId) {
    loadVideo(videoId);
    return;
  }

  if (isPlaying) {
    sendPlayerCommand("pauseVideo");
    isPlaying = false;
  } else {
    sendPlayerCommand("playVideo");
    isPlaying = true;
  }

  updateButtons();
}

function seekForward(videoId) {
  if (videoId !== activeVideoId) {
    return;
  }

  currentTime += 30;
  sendPlayerCommand("seekTo", [currentTime, true]);
}

function createButton(track, video) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dtp-button";
  button.dataset.trackTitle = track.title || track.position;
  button.dataset.playing = "false";

  const playIcon = document.createElement("span");
  playIcon.className = "dtp-play-icon";
  playIcon.setAttribute("aria-hidden", "true");

  const pauseIcon = document.createElement("span");
  pauseIcon.className = "dtp-pause-icon";
  pauseIcon.setAttribute("aria-hidden", "true");

  button.append(playIcon, pauseIcon);

  if (video) {
    button.dataset.videoId = video.id;
    button.setAttribute("aria-label", `Play ${button.dataset.trackTitle}`);
    button.title = `Play matched video: ${video.title}`;
    button.addEventListener("click", () => toggleVideo(video.id));
  } else {
    button.disabled = true;
    button.setAttribute("aria-label", `No matching video for ${button.dataset.trackTitle}`);
    button.title = "No matching video found";
  }

  return button;
}

function createAdLabel(video) {
  const label = document.createElement("span");
  label.className = "dtp-ad-label";
  label.textContent = "(ads)";
  label.hidden = true;

  if (video) {
    label.dataset.videoId = video.id;
  }

  return label;
}

function createSeekButton(track, video) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dtp-seek-button";
  button.textContent = "+30";
  button.disabled = true;
  button.setAttribute("aria-label", `Fast-forward ${track.title || track.position} by 30 seconds`);
  button.title = "Fast-forward 30 seconds";

  if (video) {
    button.dataset.videoId = video.id;
    button.addEventListener("click", () => seekForward(video.id));
  }

  return button;
}

function installButtons() {
  const videos = getVideos();
  const tracks = getTracks();

  if (!videos.length || !tracks.length) {
    return;
  }

  const matches = matchTracks(tracks, videos);

  matches.forEach(({ track, video }) => {
    if (track.row.querySelector(".dtp-button")) {
      return;
    }

    const positionCell = track.row.cells[0];
    if (positionCell) {
      positionCell.append(
        createButton(track, video),
        createAdLabel(video),
        createSeekButton(track, video)
      );
    }
  });

  updateButtons();
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(installButtons, 250);
}

function handleExtensionMessage(message) {
  if (!activeVideoId) {
    return;
  }

  if (message.type === "dtp-youtube-ad") {
    adVideoId = activeVideoId;
    updateButtons();
    return;
  }

  if (message.type !== "dtp-youtube-ad-state") {
    return;
  }

  adVideoId = message.active ? activeVideoId : "";
  sendPlayerCommand(message.active ? "mute" : "unMute");
  updateButtons();
}

function handlePlayerMessage(event) {
  if (!player || event.source !== player.contentWindow || event.origin !== "https://www.youtube-nocookie.com") {
    return;
  }

  let message;
  try {
    message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
  } catch {
    return;
  }

  if (message.event === "onReady") {
    markPlayerReady();
  }

  let state;
  if (message.event === "onStateChange") {
    state = message.info;
  } else if (message.event === "infoDelivery" && message.info) {
    state = message.info.playerState;
    if (Number.isFinite(message.info.currentTime)) {
      currentTime = message.info.currentTime;
    }
  }

  if (state === 1) {
    isPlaying = true;
    updateButtons();
  } else if (state === 0 || state === 2) {
    isPlaying = false;
    updateButtons();
  }
}

installButtons();
window.addEventListener("message", handlePlayerMessage);
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener(handleExtensionMessage);
}
new MutationObserver(scheduleRefresh).observe(document.body, {
  childList: true,
  subtree: true
});
