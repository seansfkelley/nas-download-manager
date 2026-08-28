#!/bin/sh
set -eu

# How long to wait for the popup to open, and how long to let it finish fading in once it has. The
# window exists before it is done animating. The menu gets longer, since it is also the window in
# which you hover the item you want highlighted.
TIMEOUT=30
SETTLE=1
MENU_SETTLE=6
DELAY=5

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
  echo "  $0 firefox context-menu   captures the menu into firefox/context-menu.png, uncropped" >&2
  echo "  $0 notification           captures the top-right corner into notification.png" >&2
  echo >&2
  echo "The popup and context-menu shots capture a window, so window size and position do not" >&2
  echo "matter. The notification shot is a rect; re-measure it with 'screencapture -i', which" >&2
  echo "prints origin and size as you drag." >&2
  exit 1
}

here="$(dirname "$0")"

capture() {
  echo "capturing $2 in ${DELAY}s"
  screencapture -x -T"$DELAY" -R"$1" "$2"
  sips -g pixelWidth -g pixelHeight "$2"
}

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

    if [ "$2" = "context-menu" ]; then
      # The menu opens wherever the click lands, so there is no crop that frames it; do that by hand.
      crop_y=""
      settle="$MENU_SETTLE"
      capture_window "$here/$1/context-menu.png" \
        "right-click a link on the links page now, then hover the item to highlight"
    else
      settle="$SETTLE"
      capture_window "$here/$1/$2.png" "focus the browser and open the popup now"
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
