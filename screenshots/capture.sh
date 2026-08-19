#!/bin/sh
set -eu

# The capture rect, in points, measured against the window geometry in mock/geometry.ts — the mock
# positions its own window, so changing that file means re-measuring this. The rect overhangs the
# window on the top and right so the window edge and a strip of desktop land in the shot. On a retina
# display the capture comes out at 2x, so 640x400 points is the 1280x800 both stores ask for.
REGION="380,40,640,400"
DELAY=5

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
  echo "Everything captures after ${DELAY}s. The window must already be where the mock put it;" >&2
  echo "press 'w' in the popup to move it back. Re-measure a rect with 'screencapture -i', which" >&2
  echo "prints origin and size as you drag." >&2
  exit 1
}

here="$(dirname "$0")"

capture() {
  echo "capturing $2 in ${DELAY}s"
  screencapture -x -T"$DELAY" -R"$1" "$2"
  sips -g pixelWidth -g pixelHeight "$2"
}

case "${1:-}" in
  chrome | firefox)
    [ $# -eq 2 ] || usage

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
      echo "focus the browser and open the popup now"
      capture "$REGION" "$here/$1/$2.png"
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
