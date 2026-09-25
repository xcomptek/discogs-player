# Discogs Player

Discogs Player is a Chrome extension that adds simple audio controls to tracklists on [Discogs](https://www.discogs.com/) release pages.

Current version: **v0.2.0**.

![Discogs Player demo](https://xcomptek.com/img/discogs-player-demo.gif)

## What it does

When a Discogs release contains matching YouTube videos, Discogs Player adds controls next to its tracks so you can:

- Play or pause a track without leaving the release page
- Skip forward 30 seconds
- Open a track's matched video in a new YouTube tab with **YT**, pausing the embedded player if it is open
- Automatically pause and mute detected ads in the embedded player and open the matched video in a new tab (once per track playback)

> [!NOTE]
> Ads are paused and muted in the embedded player, not blocked. The new YouTube tab may show its own ads. Controls for tracks without a matching video are disabled.


## How to install

Discogs Player is not currently available in the Chrome Web Store. Install it from the source code using Chrome's Developer mode:

1. Download the source code from this repository.
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
5. Click **YT** next to a matched track to open its YouTube video in a new tab. This pauses the embedded player if it is open.

If the embedded player detects an ad, it pauses and mutes the ad and automatically opens that track's video in a new tab. It won't open another automatic tab for that track playback, even if you already clicked **YT**.

If a Discogs page was already open during installation, refresh the page to activate the extension.

## Updating

When a new version is available:

1. Replace the extension files with the latest source code.
2. Go to [`chrome://extensions`](chrome://extensions).
3. Find **Discogs Player** and click the **Reload** button.
4. Refresh any open Discogs release pages to load the updated controls.

## Uninstalling

Go to [`chrome://extensions`](chrome://extensions), find **Discogs Player**, and click **Remove**.
