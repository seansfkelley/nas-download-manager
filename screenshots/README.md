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

| Key | State                                              |
| --- | -------------------------------------------------- |
| `0` | No tasks                                           |
| `1` | Two tasks, one of them behind the errored filter   |
| `2` | Three tasks, one of them behind the errored filter |
| `3` | Eight tasks                                        |
| `4` | Login required                                     |
| `n` | Fires a completion notification                    |
| `w` | Re-maximizes the window                            |

It opens on `2`, which is what the store shots use.

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

`mock/popup.html` drops the 400px `min-height` the add-download overlay reserves for the blurred task
list behind it, which is what otherwise stretches the directory picker and leaves the advanced-add
shot mostly empty. The crop is anchored to the window rather than to the popup, so changing the
popup's own size does not mean re-measuring it.

Neither the window's size nor its position affects these shots. The mock maximizes its own window on
install via `mock/window.ts`, and `w` in the popup re-maximizes it; that is for comfort and for
keeping the window clear of the screen edges, where a capture can come back clipped. Maximized, not
fullscreen — fullscreen has no window shadow, and the crop measures in from it.

Three shots per browser, all from scenario `2`:

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
./screenshots/capture.sh chrome notification
```

The only shot that is not a window capture. The banner belongs to Notification Center rather than to
either browser, and the popup behind it is half the picture, so this one takes the whole screen on a
`SCREEN_DELAY` timer. Switch to the browser, open the popup, press `n`. The banner carries the
browser's icon, so each listing needs its own.

The frame is cut out of the screen's top-right corner at native resolution, so there is no scaling
and it stays as sharp as the window captures. That corner holds the right end of the menu bar, the
banner, and the popup. 640x400, the stores' other size, is not enough: the banner is nearly that wide
on its own and comes out clipped.

The browser needs notification permission in System Settings the first time.
