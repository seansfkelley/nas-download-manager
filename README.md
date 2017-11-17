# Synology Download Manager

> An open source browser extension for adding/managing download tasks to your Synology DiskStation.

[![Donate](https://img.shields.io/badge/Donate%20$5-PayPal-brightgreen.svg)](https://paypal.me/downloadmanager/5)

## About

Synology Download Manager allows you to add and manage your download tasks on your Synology DiskStation right from your browser. Synology Download Manager is implemented with a focus on stability and clarity in the UI.

### Features

- Right-click and download many types of media (`<video>` and `<audio>` tags) and files (e.g. `.torrent` files).
- Clear all completed tasks with one click.
- Choose destination folder for new download tasks.
- View, filter and sort all the current download tasks in the extension popup.
- Add/pause/resume/remove download tasks in the extension popup.
- System notifications for completed download tasks.
- Open some types of links (e.g. `magnet:`) in the extension rather than a desktop application.

### Supported Browsers

- Firefox ([view listing](https://addons.mozilla.org/en-US/firefox/addon/synology-download-manager/))
- Chrome ([view listing](https://chrome.google.com/webstore/detail/synology-download-manager/iaijiochiiocodhamehbpmdlobhgghgi))

## Development

### Building the Extension

Install [Yarn](https://github.com/yarnpkg/yarn) if you don't already have it.

1. Install dependencies.

  ```
  yarn
  ```

2. Build all assets.

  ```
  yarn build
  ```

3. _(Optional)_ Build into a `.zip` file at the repo root suitable for distibuting as an addon. This step is not necessary for doing local development, for which you can just point the browser at the repo root or `manifest.json`. It shells out to `zip`, which it assumes is accessible on your `PATH`.

  ```
  yarn zip
  ```
