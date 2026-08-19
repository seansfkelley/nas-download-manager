# Store listing screenshots

The images in `chrome/` and `firefox/` are what the Chrome Web Store and AMO listings show. They are
captured by hand from the mock extension in `mock/`, which renders the real popup against canned data
from `mock/fixtures.ts` and answers the popup's `get-config` and `list-directories` messages from
`mock/stubMessages.ts`.

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
| `w` | Moves the window back to where the capture rect expects it   |

## Capturing

```
./screenshots/capture.sh chrome popup
```

Captures a fixed rect after five seconds. The delay exists because the popup dismisses the instant
the browser loses focus, so nothing can require a keystroke or a click outside the browser while it
is open. Run the script, switch to the browser, open the popup, wait for the shutter.

The window has to be where the rect expects it. The mock positions its own window on install, using
`browser.windows.update` from `mock/geometry.ts`; press `w` in the popup to put it back after moving
it. This goes through the extension API rather than AppleScript deliberately — Firefox does not
reliably expose an accessibility tree, so System Events cannot move its window, and Chrome would
need a separate macOS automation grant.

Both stores want 1280x800. On a retina display `screencapture` records at 2x, so the rect is 640x400
points. To re-measure it, use `screencapture -i`, which prints origin and size as you drag, then edit
`REGION` at the top of the script to match whatever `mock/geometry.ts` says.

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
