# Debugging the Extension

## Getting Logs in Firefox

1. Open a new tab and navigate to `about:devtools-toolbox?id=nas-download-manager-dsm7%40smolyn.org&type=extension`. This will open the developer tools for NAS Download Manager.
2. Switch to the Console tab, near the top left of the view.
3. All the logs will be presented, with the latest ones appearing at the bottom.

If you're able to reliably reproduce a bug, I recommend you first clear the logs and then reproduce the issue, so you can be sure the logging you see is related to this specific error. You can clear logs with the trash can button in the top left, near the "Filter Output" bar.

## Getting Logs in Chrome

> Chrome 146+ supports the `browser.*` namespace used by this extension, but Chrome has not been actively tested.

1. Open a new tab and navigate to `chrome://extensions`.
2. In the top right, toggle the Developer Mode switch on.
3. Find NAS Download Manager in the list, and click the "service worker" link under "Inspect views". This will open the developer tools for the background service worker.
4. To debug the popup or settings UI, right-click the extension popup and select "Inspect".
5. Switch to the Console tab to view logs.
