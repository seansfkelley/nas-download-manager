# Store listing screenshots

The images in `chrome/` and `firefox/` are what the Chrome Web Store and AMO listings show. They are
captured by hand from the mock extension in `mock/`, which renders the real popup against canned data
from `mock/fixtures.ts` and answers the popup's `get-config` and `list-directories` messages from
`mock/stubMessages.ts`. `capture.sh` drives the capture, with `window.swift` finding the popup's
window id — CoreGraphics is the only source for that and no shell tool exposes it.

## Running the mock

```
npm run mock:chrome
npm run mock:firefox
```

Each builds to `.mock-dist/` and launches `web-ext run` with a throwaway profile. Firefox gets a copy
of `firefox-profile/`, which exists only to carry the `userChrome.css` that stops Firefox hatching the
address bar red while a remote agent is attached — web-ext attaches one to install the extension, and
there is no pref for it. It is copied, not used in place, so runs stay isolated from each other.

Two things to do on every launch:

- **Chrome only:** pin the extension from the puzzle-piece menu. Firefox puts a temporarily-installed
  extension in the toolbar on its own; Chrome does not.
- Close the `links.html` tab that opens on install unless you want it for the context-menu shot.

With the popup open, the keyboard steps through states. Keys are ignored while a text field has
focus, so typing a URL into the add-download form is safe.

| Key | State                                                        |
| --- | ------------------------------------------------------------ |
| `1` | Typical: two visible tasks, one hidden by the errored filter |
| `2` | No tasks                                                     |
| `3` | Login required                                               |
| `4` | A long task list                                             |
| `n` | Fires a completion notification                              |
| `w` | Re-maximizes the window                                      |

## Capturing

```
./screenshots/capture.sh chrome popup
```

Run it, switch to the browser, open the popup. Nothing needs timing: `window.swift` watches for a
window to appear and the capture fires when the popup does. Nothing steals focus either, which
matters because the popup dismisses the instant the browser loses it.

The capture is `screencapture -l`, the non-interactive form of "capture this window": the window on
transparency, with the desktop excluded and anything floating on top of the browser excluded too.
The popup is a child window of the browser, and window capture takes the whole group, so the browser
comes along with it.

`screencapture` adds a shadow margin around the window — 112 px at the sides, 76 above, 148 below —
and both stores want 1280x800, so the script crops. The frame's right edge is the window's right
edge, and the tab strip is cut off above the toolbar. The horizontal offset is derived from the
captured image's width, so the window can be any size; only the vertical one is measured by hand, and
it is per-browser because Chrome's tab strip is taller than Firefox's. `CROP=0` skips the crop, which
is how you capture a full window to measure against.

`mock/popup.html` zooms the popup so it fills more of that frame — 1280x800 is the only size
Chrome accepts besides 640x400, and at 1:1 the popup leaves most of it empty. The crop is anchored to
the window rather than to the popup, so changing the zoom does not mean re-measuring it.

Neither the window's size nor its position affects these shots. The mock maximizes its own window on
install via `mock/window.ts`, and `w` in the popup re-maximizes it; that is for comfort and for
keeping the window clear of the screen edges, where a capture can come back clipped. Maximized, not
fullscreen — fullscreen has no window shadow, and the crop measures in from it.

Three shots per browser, all from scenario `1`:

| Name           | How                                      |
| -------------- | ---------------------------------------- |
| `popup`        | The default view                         |
| `filtering`    | Click the filter button in the header    |
| `advanced-add` | Click `+` in the header, then type a URL |

## Context menu

```
./screenshots/capture.sh chrome context-menu
```

The menu is a native `NSMenu`, so no page-screenshot API can reach it — but it is a window of the
browser's, so it captures the same way the popup does, and comes out composited over the page. Run the
command, right-click a link, and the capture fires when the menu opens.

This one is not cropped. The menu appears wherever the click lands, so there is no fixed frame that
suits it; crop the full window by hand afterwards. The shutter fires `MENU_SETTLE` seconds after the
menu opens, which is time to hover the item you want highlighted.

Firefox's link menu runs to fifteen items with ours last, so `mock:firefox` turns six of them off.
Each is a pref read by `nsContextMenu.sys.mjs` when it builds the menu:

| Pref                                             | Removes                        |
| ------------------------------------------------ | ------------------------------ |
| `browser.tabs.splitView.enabled`                 | Open Link in Split View        |
| `privacy.userContext.enabled`                    | Open Link in New Container Tab |
| `browser.ml.linkPreview.enabled`                 | Preview Link                   |
| `privacy.query_stripping.strip_on_share.enabled` | Copy Clean Link                |
| `browser.translations.select.enable`             | Translate Link Text…           |
| `devtools.inspector.enabled`                     | Inspect                        |

`devtools.policy.disabled` also removes Inspect, but web-ext installs the extension over the remote
debugging protocol, so leave that one alone.

Chrome has no such prefs, and most of its menu is selection-driven: it selects a link's text when you
right-click it, which merges in Copy, Search, Print and Translate, and macOS piles Speech, Writing
Tools, Summarize and Services on top of those. `links.html` sets `user-select: none` to stop that at
the source. `mock:chrome` passes `--disable-features=SideBySide` for the Split View item; Inspect can
only go via enterprise policy, so it stays.

The target is the `links.html` tab the mock opens on install — a fake Debian directory index of
`.torrent` links, shipped in the extension so the page content is identical every run. The mock's
background worker registers the same `browser.contextMenus.create` call the real extension does, so
the "Download with DownloadStation" item appears.

## Notification

```
./screenshots/capture.sh notification
```

Arms a delayed capture over the top-right corner of the screen and waits for you to press `n` in the
popup. The banner is drawn by Notification Center rather than by either browser, so one image serves
both listings and it lives at the top level rather than under `chrome/` and `firefox/`. The browser
needs notification permission in System Settings the first time.
