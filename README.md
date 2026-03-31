# NAS Download Manager

> An open source browser extension for adding/managing download tasks on your Synology DiskStation running DSM 7+.

This is a community fork of the original [NAS Download Manager](https://github.com/seansfkelley/nas-download-manager), rewritten with Manifest V3, Svelte 5, Vite, and modern Synology DSM 7+ APIs.

## Having an Issue?

If you're here because of an issue with the extension, please check the [FAQ](./FAQ.md) first. If you can't find an answer there, feel free to [open an issue](https://github.com/smolyn/nas-download-manager-v7/issues)!

## About

NAS Download Manager allows you to add and manage your download tasks on your Synology DiskStation right from your browser. It requires a Synology NAS with DSM 7 or higher.

Please note that NAS Download Manager is not an official Synology offering.

### Features

- Right-click and download many types of media (`<video>` and `<audio>` tags) and files (e.g. `.torrent` files).
- Clear all completed tasks with one click.
- Choose destination folder for new download tasks.
- View, filter and sort all the current download tasks in the extension popup.
- Add/pause/resume/remove download tasks in the extension popup.
- System notifications for completed download tasks.
- Open some types of links (e.g. `magnet:`) in the extension rather than a desktop application.

### Supported Browsers

- Firefox 148+ ([view listing](https://addons.mozilla.org/en-US/firefox/addon/nas-download-manager/))
- Chrome 146+ (untested, but should work — Chrome 146 added `browser.*` namespace support)

## Privacy

NAS Download Manager needs your login credentials to communicate with your NAS. It doesn't collect, store or transmit any other information. [Read more.](./PRIVACY.md)

## Development

### Prerequisites

Dependencies are managed with [pnpm](https://pnpm.io/). Install it if you don't already have it.

### Actively Developing the Extension

These instructions describe how to build and automatically re-build the assets for the extension for quick iteration during active development.

Please note that while the build tasks will auto-recompile, the browser may not pick up changes automatically. In particular, changes to code running in the extension's background service worker generally requires you to explicitly refresh the extension (for which there is usually a button in the debugging interface). Changes to language support may require you to remove the development extension entirely and re-add it.

1. Install dependencies.

    ```
    pnpm install
    ```

2. Start a build to watch files and auto-recompile code on change.

    ```
    pnpm watch
    ```

3. In Firefox, navigate to `about:debugging` > This Firefox > Load Temporary Add-on... and open `manifest.json`.

### Packing the Extension for Distribution

1. Install dependencies.

    ```
    pnpm install
    ```

2. Build and optimize all assets.

    ```
    pnpm build
    ```

3. Zip all assets into a file suitable for distribution.

    ```
    pnpm zip
    ```

4. _(Optional)_ Zip all source code into a file suitable for distribution.

    ```
    pnpm zip-sources
    ```

### Translating the Extension

Read in detail about [how to localize WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization), or skip to the section below for a short summary.

#### Adding a New Language

In order to add the new language, base your translation file off the English messages file.

1. Copy `_locales/en/messages.json` into a new file at `_locales/<your language code>/messages.json`.
2. Edit the `message` field in each item with your translation.
3. Load (or reload) the extension to test it out. You may need to remove the extension entirely and then re-add it for changes to be reflected.
4. Open a pull request!

There are automated checks to ensure that you're only defining translated strings that the extension actually uses.
