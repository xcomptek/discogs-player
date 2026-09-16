# Discogs Player

Discogs Player is a Chrome extension that adds simple audio controls to tracklists on [Discogs](https://www.discogs.com/) release pages.

![Discogs Player demo](https://xcomptek.com/img/discogs-player-demo.gif)

## What it does

When a Discogs release contains matching YouTube videos, Discogs Player adds controls next to its tracks so you can:

- Play or pause a track without leaving the release page
- Skip forward 30 seconds
- Listen without opening a separate YouTube tab or window
- Automatically mute detected YouTube ads

> [!NOTE]
> Ads are muted, not blocked. An ad may still need to finish before the track starts.


## How to install

Discogs Player is not currently available in the Chrome Web Store. Install it from the source code using Chrome's Developer mode:

1. Download the source code from [here](https://t.me/dakou_cd/172).
2. If you downloaded a ZIP file, extract it to a folder on your computer.
3. Open Google Chrome and go to [`chrome://extensions`](chrome://extensions).
4. Turn on **Developer mode** using the switch in the top-right corner.
5. Click **Load unpacked**.
6. Select the extracted project folder—the folder that contains `manifest.json`.

Discogs Player should now appear in your list of Chrome extensions.

## How to use

1. Open a Discogs release page, for example: `https://www.discogs.com/release/...`
2. Find the controls added beside the release tracklist.
3. Click the play button beside a track to start playback.
4. Click the same button again to pause, or click **+30** to skip forward 30 seconds.

If a Discogs page was already open during installation, refresh the page to activate the extension.

## Updating

When a new version is available:

1. Replace the extension files with the latest source code.
2. Go to [`chrome://extensions`](chrome://extensions).
3. Find **Discogs Player** and click the **Reload** button.

## Uninstalling

Go to [`chrome://extensions`](chrome://extensions), find **Discogs Player**, and click **Remove**.
