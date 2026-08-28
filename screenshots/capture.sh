#!/bin/sh
set -eu

# How long to wait for the popup to open, and how long to let it finish fading in once it has. The
# window exists before it is done animating.
TIMEOUT=30
SETTLE=1
DELAY=5

# The crop, in pixels of the 2x window capture. Anchored so the right edge of the frame is the right
# edge of the browser window and the top is the toolbar, cutting off the tab strip above it.
#
# To re-measure, which changing the window in mock/geometry.ts means doing, shoot one with CROP=0 and
# find the window inside the shadow screencapture leaves around it:
#
#   magick out.png -alpha extract -threshold 99% -format '%@' info:   # e.g. 1920x1240+112+76
#
# X is that offset plus that width, less CROP_W, less two pixels to stay inside the antialiased edge.
# Y is by eye: rerun `sips -c $CROP_H $CROP_W --cropOffset <y> <x> out.png` until the tab strip is
# just gone.
CROP_W=1280
CROP_H=800
FIREFOX_CROP_X=750
FIREFOX_CROP_Y=164

# Chrome's window and shadow come out the same size, but its tab strip is taller, so the toolbar
# starts lower.
CHROME_CROP_X=750
CHROME_CROP_Y=157

# Where to right-click on the links page for the context-menu shot, and how far up and left of that
# point the capture starts. Measure the click point once per browser with `cliclick p`, which prints
# the cursor position; it moves whenever the toolbar height does.
CONTEXT_CLICK_X=240
CONTEXT_CLICK_Y=260
CONTEXT_OFFSET_X=200
CONTEXT_OFFSET_Y=120

# The notification banner is drawn by Notification Center in the top-right corner of the screen,
# nowhere near the browser window, so it gets its own rect measured from the right screen edge.
BANNER_W=420
BANNER_H=140
BANNER_INSET_X=20
BANNER_INSET_Y=20

usage() {
  echo "usage: $0 <chrome|firefox> <name>" >&2
  echo "       $0 notification" >&2
  echo >&2
  echo "  $0 chrome popup           captures the popup into chrome/popup.png" >&2
  echo "  $0 firefox context-menu   right-clicks a link, captures into firefox/context-menu.png" >&2
  echo "  $0 notification           captures the top-right corner into notification.png" >&2
  echo >&2
  echo "The popup is captured as a window, so its position does not matter. The context-menu and" >&2
  echo "notification shots are rects; re-measure one with 'screencapture -i', which prints origin" >&2
  echo "and size as you drag." >&2
  exit 1
}

here="$(dirname "$0")"

capture() {
  echo "capturing $2 in ${DELAY}s"
  screencapture -x -T"$DELAY" -R"$1" "$2"
  sips -g pixelWidth -g pixelHeight "$2"
}

# Captures a window rather than a rect, which is what "capture this window" in the screenshot UI does:
# the window on transparency, with nothing behind it and nothing on top of it. The popup is a child
# window of the browser, and window capture takes the whole group, so the browser comes along with it.
capture_window() {
  echo "focus the browser and open the popup now"
  id=$(swift "$here/window.swift" "$owner" "$TIMEOUT")
  sleep "$SETTLE"
  screencapture -x -l "$id" "$1"
  # CROP=0 leaves the whole window, which is how you measure the offsets in the first place.
  if [ "${CROP:-1}" = 1 ]; then
    sips -c "$CROP_H" "$CROP_W" --cropOffset "$crop_y" "$crop_x" "$1" >/dev/null
  fi
  sips -g pixelWidth -g pixelHeight "$1"
}

case "${1:-}" in
  chrome | firefox)
    [ $# -eq 2 ] || usage

    # "chrom" matches both "Google Chrome" and "Chromium", whichever web-ext found.
    if [ "$1" = "chrome" ]; then
      owner="chrom"
      crop_x="$CHROME_CROP_X"
      crop_y="$CHROME_CROP_Y"
    else
      owner="firefox"
      crop_x="$FIREFOX_CROP_X"
      crop_y="$FIREFOX_CROP_Y"
    fi

    if [ "$2" = "context-menu" ]; then
      command -v cliclick >/dev/null || {
        echo "context-menu needs cliclick: brew install cliclick" >&2
        exit 1
      }
      # The menu is a native NSMenu in a modal tracking loop, so it stays up while screencapture
      # runs. Nothing may click or type until the shutter.
      cliclick "rc:$CONTEXT_CLICK_X,$CONTEXT_CLICK_Y"
      capture \
        "$((CONTEXT_CLICK_X - CONTEXT_OFFSET_X)),$((CONTEXT_CLICK_Y - CONTEXT_OFFSET_Y)),640,400" \
        "$here/$1/context-menu.png"
      cliclick "kp:esc"
    else
      capture_window "$here/$1/$2.png"
    fi
    ;;
  notification)
    screen_width=$(osascript -e 'tell application "Finder" to get item 3 of (get bounds of window of desktop)')
    echo "press 'n' in the popup now"
    capture "$((screen_width - BANNER_W - BANNER_INSET_X)),$BANNER_INSET_Y,$BANNER_W,$BANNER_H" \
      "$here/notification.png"
    ;;
  *) usage ;;
esac
