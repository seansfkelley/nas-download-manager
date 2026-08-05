# NAS Download Manager

> An open source browser extension for adding/managing download tasks to your Synology DiskStation.

[![Donate](https://img.shields.io/badge/Donate%20$2-PayPal-brightgreen.svg)](https://paypal.me/downloadmanager/2)

## 🔧 Maintenance Mode 🔧

NAS Download Manager is in maintenance mode. See [the announcement](https://github.com/seansfkelley/nas-download-manager/issues/227) for details.

## Having an Issue?

If you're here because of an issue with the extension, please check the [FAQ](./FAQ.md) first. If you can't find an answer there, feel free to [open an issue](https://github.com/seansfkelley/nas-download-manager/issues)!

## About

NAS Download Manager allows you to add and manage your download tasks on your Synology DiskStation right from your browser. It requires a Synology NAS with DSM version 4 or higher.

Please note that NAS Download Manager is not an official Synology offering.

### Features

- Right-click and download many types of media (`<video>` and `<audio>` tags) and files (e.g. `.torrent` files).
- Clear all completed tasks with one click.
- Choose destination folder for new download tasks.
- View, filter and sort all the current download tasks in the extension popup.
- Add/pause/resume/remove download tasks in the extension popup.
- System notifications for completed download tasks.
- Open some types of links (e.g. `magnet:`) in the extension rather than a desktop application.

### Officially Supported Browsers

- Firefox ([view listing](https://addons.mozilla.org/en-US/firefox/addon/nas-download-manager/))

### Unsupported Browsers

The following browsers were supported in earlier versions, but made breaking changes since the extension was released.

- Chrome ([view listing](https://chrome.google.com/webstore/detail/nas-download-manager/iaijiochiiocodhamehbpmdlobhgghgi))
- Edge (see [how to install from Chrome Web Store](https://support.microsoft.com/en-us/help/4538971/microsoft-edge-add-or-remove-extensions) and use the Chrome link above)
- Opera (using the [Install Chrome Extensions](https://addons.opera.com/en/extensions/details/install-chrome-extensions/) extension to install from the Chrome link above)

There are currently no plans to support the following browsers.

- Safari

## Privacy

NAS Download Manager needs your login credentials to communicate with your NAS. It doesn't collect, store or transmit any other information. [Read more.](./PRIVACY.md)

## Development

Please note that development is not actively supported on Windows. Some of the below commands may fail and require manually invoking an analogous Windows command instead.

### Prerequisites

Dependencies are managed with npm, which ships with [Node](https://nodejs.org/). The Node version is pinned in `.nvmrc`; run `nvm use` if you have [nvm](https://github.com/nvm-sh/nvm).

### Actively Developing the Extension

These instructions describe how to build and automatically re-build the assets for the extension for quick iteration during active development. For building, optimizing and packaging the extension for distribution, see the next section.

Please note that while the build tasks will auto-recompile, the browser may not pick up changes automatically. In particular, changes to code running in the extension's background generally requires you to explicitly refresh the extension (for which there is usually a button in the debugging interface). Changes to language support may require you to remove the development extension entirely and re-add it.

1. Install dependencies.

    ```
    npm install
    ```

2. Start a build to watch files and auto-recompile code on change.

    ```
    npm run watch
    ```

3. In a second terminal, launch a browser with the extension already installed.

    ```
    npm run dev
    ```

    This uses [web-ext](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/), which opens a scratch Firefox profile with the extension loaded and reloads it as files change. To load it by hand instead, open `about:debugging` > This Firefox > Load Temporary Add-on... and select `dist/manifest.json`.

    ~~**Chrome**: `about:extensions` > Enable "Developer mode" > Load unpacked~~

### Packing the Extension for Distribution

1. Install dependencies.

    ```
    npm install
    ```

2. Build the extension, check it against the validation rules addons.mozilla.org applies, and zip it
   into a file suitable for distribution.

    ```
    npm run package
    ```

3. _(Optional)_ Zip all source code into a file suitable for distribution.

    ```
    npm run zip-sources
    ```

### Translating the Extension

I need help localizing NAS Download Manager! Read in detail about [how to localize WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization), or skip to the sections below for short summaries.

#### Adding a New Language

In order to add the new language, base your translation file off the English messages file.

1. Copy `_locales/en/messages.json` into a new file at `_locales/<your language code>/messages.json`.
2. Edit the `message` field in each item with your translation.
3. In `src/common/moment.ts`, add a new import line like `import "moment/locale/<your language code>";`.
4. Load (or reload) the extension to test it out. You may need to remove the extension entirely and then re-add it for changes to be reflected.
5. Open a pull request!

There are automated checks to ensure that you're only defining translated strings that the extension actually uses.

#### Editing an Existing Language

If you're adding more strings for an incomplete translation, you can use `./scripts/diff-messages <your language code>` to get a list of all the entries you need to add to the `messages.json` in a format that is easily copy-pasted:

```
$ ./scripts/diff-messages ru
"Badge_shows": {
  "message": "Badge shows",
  "description": "Prefix text for badge-display-type dropdown."
},
```
