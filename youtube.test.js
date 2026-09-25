const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadScript(name, context) {
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, name), 'utf8'), context);
  return context;
}

function createContentContext() {
  const sent = [];
  const commands = [];
  const buttons = [];
  const document = {
    body: {},
    documentElement: { appendChild() {} },
    querySelector() { return null; },
    querySelectorAll(selector) { return selector === '.dtp-button' ? buttons : []; },
    createElement() {
      return {
        dataset: {},
        contentWindow: { postMessage(message) { commands.push(JSON.parse(message)); } },
        setAttribute() {},
        append() {},
        appendChild() {},
        addEventListener(type, callback) { this[type] = callback; }
      };
    }
  };
  const context = loadScript('content.js', {
    window: { location: { origin: 'https://www.discogs.com' }, addEventListener() {} },
    document,
    chrome: { runtime: { sendMessage(message) { sent.push(message); }, onMessage: { addListener() {} } } },
    MutationObserver: class { observe() {} },
    setTimeout, clearTimeout, URLSearchParams, encodeURIComponent
  });
  return { context, sent, commands, buttons };
}

test('YT button opens the matched video and pauses the embedded player', () => {
  const { context, sent, commands, buttons } = createContentContext();
  const button = context.createYouTubeButton({ title: 'A Song' }, { id: 'abc_123' });
  assert.equal(button.textContent, 'YT');
  assert.equal(button.disabled, undefined);
  assert.equal(button.className, 'dtp-youtube-button');
  const playButton = { dataset: { videoId: 'abc_123', trackTitle: 'A Song' }, setAttribute() {} };
  buttons.push(playButton);
  vm.runInContext('player = { contentWindow: { postMessage(message) { captureCommand(JSON.parse(message)); } } }; activeVideoId = "abc_123"; isPlaying = true;',
    Object.assign(context, { captureCommand: (command) => commands.push(command) }));
  button.click();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'dtp-open-youtube');
  assert.equal(sent[0].videoId, 'abc_123');
  assert.equal(commands.at(-1).func, 'pauseVideo');
  assert.equal(playButton.dataset.playing, 'false');
});

test('YT button is disabled when there is no matching video', () => {
  const { context, sent } = createContentContext();
  const button = context.createYouTubeButton({ title: 'No Video' }, null);
  assert.equal(button.disabled, true);
  assert.equal(button.click, undefined);
  assert.equal(sent.length, 0);
});

test('confirmed ad opens once and pauses the embed; new playback can open again', () => {
  const { context, sent, commands, buttons } = createContentContext();
  const playButton = { dataset: { videoId: 'abc_123', trackTitle: 'A Song' }, setAttribute() {} };
  buttons.push(playButton);
  context.loadVideo('abc_123');
  context.handleExtensionMessage({ type: 'dtp-youtube-ad-state', active: true });
  context.handleExtensionMessage({ type: 'dtp-youtube-ad-state', active: true });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'dtp-open-youtube');
  assert.equal(sent[0].videoId, 'abc_123');
  assert.equal(commands.at(-1).func, 'pauseVideo');
  assert.equal(playButton.dataset.playing, 'false');
  const player = vm.runInContext('player', context);
  context.handlePlayerMessage({ source: player.contentWindow, origin: 'https://www.youtube-nocookie.com', data: { event: 'onStateChange', info: 1 } });
  assert.equal(playButton.dataset.playing, 'false');
  assert.equal(commands.at(-1).func, 'pauseVideo');
  context.handleExtensionMessage({ type: 'dtp-youtube-ad-state', active: false });
  assert.equal(commands.at(-1).func, 'unMute');
  context.loadVideo('different-id');
  context.handleExtensionMessage({ type: 'dtp-youtube-ad-state', active: true });
  assert.equal(sent.length, 2);
  assert.equal(sent[1].videoId, 'different-id');
});

test('an ad after manually opening the active track does not open it twice', () => {
  const { context, sent } = createContentContext();
  context.loadVideo('abc_123');
  context.openYouTubeVideo('abc_123');
  context.handleExtensionMessage({ type: 'dtp-youtube-ad-state', active: true });
  assert.equal(sent.length, 1);
});

test('opening YT during iframe loading still pauses playback after ready', () => {
  const { context, commands, buttons } = createContentContext();
  const playButton = { dataset: { videoId: 'abc_123', trackTitle: 'A Song' }, setAttribute() {} };
  buttons.push(playButton);
  context.loadVideo('abc_123');
  context.openYouTubeVideo('abc_123');
  context.markPlayerReady();
  assert.equal(commands.at(-1).func, 'pauseVideo');
  const player = vm.runInContext('player', context);
  context.handlePlayerMessage({ source: player.contentWindow, origin: 'https://www.youtube-nocookie.com', data: { event: 'onStateChange', info: 1 } });
  assert.equal(commands.at(-1).func, 'pauseVideo');
  assert.equal(playButton.dataset.playing, 'false');
  context.toggleVideo('abc_123');
  assert.equal(commands.at(-1).func, 'playVideo');
  assert.equal(playButton.dataset.playing, 'true');
});

test('track controls include YT after the seek button', () => {
  const { context } = createContentContext();
  let controls;
  const row = { cells: [{ append(...items) { controls = items; } }], querySelector() { return null; } };
  context.mockTracks = [{ row, position: 'A1', title: 'A Song', normalizedTitle: 'a song', normalizedPosition: 'a1' }];
  context.mockVideos = [{ id: 'abc_123', title: 'A Song', normalizedTitle: 'a song' }];
  vm.runInContext('getVideos = () => mockVideos; getTracks = () => mockTracks;', context);
  context.installButtons();
  assert.deepEqual(controls.map((item) => item.className),
    ['dtp-button', 'dtp-ad-label', 'dtp-seek-button', 'dtp-youtube-button']);
  assert.equal(controls[3].textContent, 'YT');
});

test('service worker opens only valid matched videos from Discogs release frames', () => {
  let listener;
  const opened = [];
  loadScript('background.js', {
    chrome: {
      webRequest: { onBeforeRequest: { addListener() {} } },
      runtime: { onMessage: { addListener(callback) { listener = callback; } } },
      tabs: { create(options) { opened.push(options); }, sendMessage() {} }
    }
  });
  const sender = { tab: { id: 5 }, frameId: 0, url: 'https://www.discogs.com/release/123' };
  listener({ type: 'dtp-open-youtube', videoId: 'abc_123' }, sender);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].url, 'https://www.youtube.com/watch?v=abc_123');
  assert.equal(opened[0].active, true);
  listener({ type: 'dtp-open-youtube', videoId: 'abc_123&x=1' }, sender);
  listener({ type: 'dtp-open-youtube', videoId: 'abc_123' }, { ...sender, frameId: 1 });
  listener({ type: 'dtp-open-youtube', videoId: 'abc_123' }, { ...sender, url: 'https://other.example/release/123' });
  assert.equal(opened.length, 1);
});

test('iframe pauses and mutes an ad before reporting it', () => {
  const messages = [];
  let update;
  let showingAd = false;
  const video = {
    muted: false,
    paused: false,
    pause() { this.paused = true; }
  };
  const document = {
    documentElement: {},
    querySelector(selector) {
      if (selector === '.html5-video-player') {
        return { classList: { contains() { return showingAd; } } };
      }
      return null;
    },
    querySelectorAll() { return [video]; }
  };
  loadScript('youtube-frame.js', {
    window: { location: { search: '?dtp=1' } },
    document,
    URLSearchParams,
    chrome: { runtime: { sendMessage(message) { messages.push({ ...message, muted: video.muted, paused: video.paused }); } } },
    MutationObserver: class { constructor(callback) { update = callback; } observe() {} }
  });
  showingAd = true;
  update();
  assert.equal(video.paused, true);
  assert.equal(video.muted, true);
  assert.deepEqual(messages, [{ type: 'dtp-youtube-ad-state', active: true, muted: true, paused: true }]);
  update();
  assert.equal(messages.length, 1);
  showingAd = false;
  update();
  assert.equal(video.muted, false);
  assert.equal(messages[1].active, false);
});