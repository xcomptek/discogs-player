const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, 'content.js');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');

const context = {
  window: {
    addEventListener() {},
    location: { origin: 'https://www.discogs.com' }
  },
  document: {
    body: {},
    documentElement: {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement() {
      return { style: {}, setAttribute() {}, append() {}, addEventListener() {}, appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; }, dataset: {}, className: '', textContent: '', innerHTML: '' };
    }
  },
  MutationObserver: class {
    observe() {}
  },
  console,
  setTimeout,
  clearTimeout,
  URLSearchParams,
  encodeURIComponent,
  decodeURIComponent,
  navigator: { userAgent: 'node' }
};

context.window.document = context.document;
context.global = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(scriptSource, context);

test('matches a track to a video when they share the core title words', () => {
  const track = {
    title: 'No One Left To Follow (12" Mix)',
    position: 'A',
    normalizedTitle: 'no one left to follow 12 mix',
    normalizedPosition: 'a'
  };

  const video = {
    id: 'abc123',
    title: 'Slam - No One Left To Follow (Unofficial Video)',
    normalizedTitle: 'slam no one left to follow unofficial video'
  };

  assert.ok(context.scoreMatch(track, video) >= 50);
});
