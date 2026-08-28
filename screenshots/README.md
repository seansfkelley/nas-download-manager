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

Each builds to `.mock-dist/` and launches `web-ext run` with a throwaway profile. Two things to do on
every launch:

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
| `w` | Restores the window size and position the capture assumes    |

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
and both stores want 1280x800, so the script crops. The frame is anchored to the right edge of the
browser window, with the tab strip cut off above the toolbar. The offsets at the top of the script
are per-browser, since Chrome's tab strip is taller than Firefox's, and are measured against the
window size in `mock/geometry.ts`; the comment there says how to redo them. `CROP=0` skips the crop,
which is how you capture a full window to measure against.

The window's position does not affect these shots, since the capture is of the window rather than a
screen rect; its size does. The mock sizes and positions its own window on install using
`browser.windows.update` from `mock/geometry.ts`, and `w` in the popup puts it back.

Three shots per browser, all from scenario `1`:

| Name           | How                                      |
| -------------- | ---------------------------------------- |
| `popup`        | The default view                         |
| `filtering`    | Click the filter button in the header    |
| `advanced-add` | Click `+` in the header, then type a URL |

## Context menu

```
brew install cliclick
./screenshots/capture.sh chrome context-menu
```

The menu is a native `NSMenu`, so no page-screenshot API can reach it, but it can be driven from
outside the browser. `cliclick` synthesizes a right-click at a fixed screen coordinate; the menu opens
in a modal tracking loop and stays up while `screencapture` fires, the same way the popup survives the
delayed capture. The script then sends Escape to dismiss it.

The target is the `links.html` tab the mock opens on install — a fake Debian directory index of
`.torrent` links, shipped in the extension so the page content is identical every run. The mock's
background worker registers the same `browser.contextMenus.create` call the real extension does, so
the "Download with DownloadStation" item appears.

The click coordinate is the fragile part. `CONTEXT_CLICK_X` / `CONTEXT_CLICK_Y` at the top of the
script are screen points, so they shift whenever the browser's toolbar height changes, and Chrome and
Firefox do not agree on it. Measure once per browser: hover the link you want and run `cliclick p`,
which prints the cursor position. `CONTEXT_OFFSET_X` / `CONTEXT_OFFSET_Y` are how far up and left of
the click the 640x400 rect starts, since the menu opens down and to the right.

Nothing may move the mouse or type between `cliclick` and the shutter.

## Notification

```
./screenshots/capture.sh notification
```

Arms a delayed capture over the top-right corner of the screen and waits for you to press `n` in the
popup. The banner is drawn by Notification Center rather than by either browser, so one image serves
both listings and it lives at the top level rather than under `chrome/` and `firefox/`. The browser
needs notification permission in System Settings the first time.
