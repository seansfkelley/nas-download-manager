# Synology Download Manager

> An open source browser extension for adding/managing download tasks to your Synology DiskStation.

## About

Synology Download Manager allows you to add and manage your download tasks on your Synology DiskStation right from your browser. Synology Download Manager is implemented with a focus on stability and clarity in the UI.

### Features

- Right-click and download many types of media (`<video>` and `<audio>` tags) and files (e.g. `.torrent` files).
- List (and filter!) all the current download tasks in the management dropdown.
- Add/pause/resume/remove download tasks in the management dropdown.
- System notifications for completed download tasks.

### Supported Browsers

Currently, only Firefox 53+ is supported. Adding support for Chrome is tracked by [#3](https://github.com/seansfkelley/synology/issues/3).

## Development

### Building the Extension

Install [Yarn](https://github.com/yarnpkg/yarn) if you don't already have it.

```
yarn
npm run build
npm run zip
```

This will output a zip file in the repo root that includes all the necessary files for distributing the addon.
