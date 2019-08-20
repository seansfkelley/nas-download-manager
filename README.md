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

Please note that development is not actively supported on Windows. Some of the below commands may fail and require manually invoking an analogous Windows command instead.

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

### Translating the Extension

TODO

## For the Paranoid: Verifying Your Installation

If you, like me, are paranoid that open-source extensions may not show you the same code that they actually publish to the browser add-on stores, you can follow these steps.

> These steps may be used for any other extension as well, accounting for any differences in the add-on layout or build process.

1. Ensure that you've checked out the appropriate version of the repo to compare to your version downloaded from the add-on store. You can get a list of names with `git tag`. Note that these verification instructions do not exist in all versions of the README, so be sure to keep this copy of the README around.
2. Follow the instructions outlined in the above [Development](#development) section to build a distributable version of the addon.
3. Find the copy of this extension installed from the add-on store.

    In **Firefox**, visit `about:support` > Application Basics > Profile Folder to open your profile folder. There, you can find this extension at `extensions/{b17c0686-033c-4d03-b526-b16c99998c98}.xpi`.

4. Unzip the extension file into a folder (it may not have a `.zip` extension, but it is a zip file).
5. Inside you will see a subset of the file hierarchy that you see in your copy of the repo. All the Javascript is contained in `dist/js`.

    If you'd like to, you can scan the other files as well and verify that there is no executable code inside them. Most of them are CSS styles or JSON configuration.

6. Now that you have the extension built from the original source as well as the source from a copy downloaded from the add-on store, you can compare them and verify they are character-for-character equal.

    I suggest using a simple `diff -r <path-to-source>/dist/js <path-to-downloaded-addon>/dist/js` which will either output nothing or note that the from-source version has extra `.map` files (these are called "source maps" and are for development purposes, which is why they aren't in the version installed from the add-on store).

The last step is to verify that you trust the source of this extension and its dependencies. You can of course read the source here and note that it doesn't do anything other than what it advertises. Furthermore, the dependencies are also all open-source, and they are all either written by me (`synology-typescript-api`, also open source) or extremely popular, de-facto standard libraries that are thoroughly vetted (e.g. Lodash, React).
