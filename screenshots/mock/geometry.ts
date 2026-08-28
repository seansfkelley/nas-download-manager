// Screen points, and the single source of truth for where the window goes. capture.sh's crop is
// measured against these, so changing them means re-measuring it.
export const WINDOW = {
  left: 40,
  top: 60,
  width: 960,
  height: 620,
};

// Done through the extension API rather than AppleScript because Firefox does not reliably expose an
// accessibility tree, which is the only way System Events can move its window.
export async function positionWindow() {
  const window = await browser.windows.getLastFocused();
  if (window.id != null) {
    await browser.windows.update(window.id, WINDOW);
  }
}
