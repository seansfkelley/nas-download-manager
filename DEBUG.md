# Debugging the Extension

## Getting Logs in Firefox

1. Open a new tab and navigate to `about:devtools-toolbox?id=%7Bb17c0686-033c-4d03-b526-b16c99998c98%7D&type=extension`. This will open the developer tools for NAS Download Manager.
2. Switch to the Console tab, near the top left of the view.
3. All the logs will be presented, with the latest ones appearing at the bottom.

If you're able to reliably reproduce a bug, I recommend you first clear the logs and then reproduce the issue, so you can be sure the logging you see is related to this specific error. You can clear logs with the trash can button in the top left, near the "Filter Output" bar.

## Getting Logs in Chrome

1. Open a new tab and navigate to `chrome://extensions`.
2. In the top right, toggle the Developer Mode switch on.
3. Find NAS Download Manager in the list, and click the "background page" link under "Inspect views". This will open the developer tools.
4. Switch to the Console tab, near the top left of the window.
5. All the logs will be presented, with the latest ones appearing at the bottom.

If you're able to reliably reproduce a bug, I recommend you first clear the logs and then reproduce the issue, so you can be sure the logging you see is related to this specific error. You can clear logs with the slashed-circle button in the top left.
