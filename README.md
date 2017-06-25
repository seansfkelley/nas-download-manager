# Synology Download Manager

> An open source browser extension for adding/managing download tasks to your Synology DiskStation.

[![Donate](https://img.shields.io/badge/Donate%20$2-PayPal-brightgreen.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=synologydownloadmanager%40gmail%2ecom&lc=US&item_name=Synology%20Download%20Manager&no_note=0&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHostedGuest)

## About

Synology Download Manager allows you to add and manage your download tasks on your Synology DiskStation right from your browser. Synology Download Manager is implemented with a focus on stability and clarity in the UI.

### Features

- Right-click and download many types of media (`<video>` and `<audio>` tags) and files (e.g. `.torrent` files).
- Choose destination folder for new download tasks.
- List (and filter!) all the current download tasks in the management dropdown.
- Add/pause/resume/remove download tasks in the management dropdown.
- System notifications for completed download tasks.

### Supported Browsers

- Firefox ([view listing](https://addons.mozilla.org/en-US/firefox/addon/synology-download-manager/))
- Chrome

## Development

### Building the Extension

Install [Yarn](https://github.com/yarnpkg/yarn) if you don't already have it.

```
yarn
npm run build
npm run zip
```

This will output a zip file in the repo root that includes all the necessary files for distributing the addon.
