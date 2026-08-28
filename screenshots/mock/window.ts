// Maximized, not fullscreen: fullscreen drops the window shadow that capture.sh's crop measures in
// from. Nothing depends on the exact size, only on it being bigger than the frame taken out of it.
//
// Done through the extension API rather than AppleScript because Firefox does not reliably expose an
// accessibility tree, which is the only way System Events can move its window.
export async function maximizeWindow() {
  const window = await browser.windows.getLastFocused();
  if (window.id != null) {
    await browser.windows.update(window.id, { state: "maximized" });
  }
}
