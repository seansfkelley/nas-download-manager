#!/bin/sh
set -eu

# How long to wait for the popup to open, and how long to let it finish fading in once it has. The
# window exists before it is done animating. The menu gets longer, since it is also the window in
# which you hover the item you want highlighted.
TIMEOUT=30
SETTLE=1
MENU_SETTLE=6

# The notification shot is on a timer instead, being a whole screen rather than a window: long enough
# to switch to the browser, open the popup and press 'n'.
SCREEN_DELAY=5

# The crop, in pixels of the 2x window capture. The right edge of the frame is the right edge of the
# browser window and the top is the toolbar, cutting off the tab strip above it.
#
# X is derived per capture so the window can be any size: screencapture leaves a shadow margin around
# the window, so the window's right edge is SHADOW_X in from the image's, and two more pixels stay
# inside the antialiased edge. Y is measured by eye, and only changes when the tab strip's height
# does. To redo it, shoot one with CROP=0 and rerun `sips -c $CROP_H $CROP_W --cropOffset <y> <x>`
# until the tab strip is just gone.
CROP_W=1280
CROP_H=800

SHADOW_X=112
EDGE_INSET=2
FIREFOX_CROP_Y=164

# Chrome's tab strip is taller, so its toolbar starts lower.
CHROME_CROP_Y=157

usage() {
  echo "usage: $0 <chrome|firefox> <name>" >&2
  echo >&2
  echo "  $0 chrome popup           captures the popup into chrome/popup.png" >&2
  echo "  $0 firefox context-menu   captures the menu into firefox/context-menu.png, uncropped" >&2
  echo "  $0 chrome notification    captures the whole screen into chrome/notification.png" >&2
  echo >&2
  echo "The popup and context-menu shots capture a window, so nothing depends on where anything" >&2
  echo "is on screen. The notification shot is the screen itself, on a timer." >&2
  exit 1
}

here="$(dirname "$0")"

# Captures a window rather than a rect, which is what "capture this window" in the screenshot UI does:
# the window on transparency, with nothing behind it and nothing on top of it. The popup and the
# context menu are both child windows of the browser, and window capture takes the whole group, so the
# browser comes along with either. An empty $crop_y means hand-crop it afterwards.
capture_window() {
  echo "$2"
  id=$(swift "$here/window.swift" "$owner" "$TIMEOUT")
  echo "capturing in ${settle}s"
  sleep "$settle"
  screencapture -x -l "$id" "$1"
  # CROP=0 leaves the whole window, which is how you measure CROP_Y in the first place.
  if [ -n "$crop_y" ] && [ "${CROP:-1}" = 1 ]; then
    width=$(sips -g pixelWidth "$1" | awk '/pixelWidth/ { print $2 }')
    crop_x=$((width - SHADOW_X - EDGE_INSET - CROP_W))
    sips -c "$CROP_H" "$CROP_W" --cropOffset "$crop_y" "$crop_x" "$1" >/dev/null
  fi
  sips -g pixelWidth -g pixelHeight "$1"
}

# Takes the frame out of the top-right corner of a whole-screen capture, at native resolution: the
# right end of the menu bar, the banner below it, and the popup below that. No scaling, so it stays
# as sharp as the window captures. 640x400 is the stores' other size, but the banner is nearly that
# wide on its own and comes out clipped.
crop_corner() {
  width=$(sips -g pixelWidth "$1" | awk '/pixelWidth/ { print $2 }')
  sips -c "$CROP_H" "$CROP_W" --cropOffset 0 $((width - CROP_W)) "$1" >/dev/null
  sips -g pixelWidth -g pixelHeight "$1"
}

case "${1:-}" in
  chrome | firefox)
    [ $# -eq 2 ] || usage

    # "chrom" matches both "Google Chrome" and "Chromium", whichever web-ext found.
    if [ "$1" = "chrome" ]; then
      owner="chrom"
      crop_y="$CHROME_CROP_Y"
    else
      owner="firefox"
      crop_y="$FIREFOX_CROP_Y"
    fi

    settle="$SETTLE"

    case "$2" in
      context-menu)
        # The menu opens wherever the click lands, so no crop frames it; do that one by hand.
        crop_y=""
        settle="$MENU_SETTLE"
        capture_window "$here/$1/context-menu.png" \
          "right-click a link on the links page now, then hover the item to highlight"
        ;;
      notification)
        # The whole screen, because the banner is Notification Center's window rather than the
        # browser's and the popup behind it is half the point of the shot; the corner it all happens
        # in is cropped out after. Under the browser's directory because the banner carries its icon.
        echo "switch to the browser, open the popup and press 'n' within ${SCREEN_DELAY}s"
        screencapture -x -m -T"$SCREEN_DELAY" "$here/$1/notification.png"
        crop_corner "$here/$1/notification.png"
        ;;
      *)
        capture_window "$here/$1/$2.png" "focus the browser and open the popup now"
        ;;
    esac
    ;;
  *) usage ;;
esac
