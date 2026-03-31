# FAQ

If none of the below questions apply to you, feel free to [open an issue](https://github.com/smolyn/nas-download-manager-v7/issues/new/choose)!

## How do I fix a connection failure?

There are many ways NAS Download Manager's connection to your NAS can fail that are out of its control. NAS Download Manager does its best to guess what might be wrong and tell you (such as when it says "likely cause: wrong protocol"), but sometimes, for security reasons, browsers don't tell it enough to make a good guess.

You can login again through NAS Download Manager's settings. This will replace the existing login session with a new one, which may work around transient issues you are having.

## What is an "invalid certificate"?

Certificates are how servers prove to browsers they are who they claim. Browsers will, by default, prevent you from accessing sites with invalid certificates unless you explicitly tell them to ignore the issue. Self-signed certificates, commonly used with Synology NASes, are generally considered invalid until you manually tell the browser to accept them.

NAS Download Manager is subject to the same security restrictions as regular browser tabs. However, unlike a browser tab, it is unable to show you the page where you can override the browser's protections/tell it to accept a self-signed certificate. To fix this issue, visit the DSM page in a browser tab using the _same hostname/port you use for NAS Download Manager_, which should prompt you to override protections/accept the certificate.

## Why can't I use HTTP (not HTTPS) to connect to the NAS?

NAS Download Manager only supports HTTPS connections to your NAS. Firefox's [add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/#development-practices) require encrypted traffic from extensions:

> Add-ons must use encryption when transporting data remotely.

It is recommended that you set up HTTPS access on your NAS. Note you may need to [configure your certificates](#what-is-an-invalid-certificate) to allow NAS Download Manager to log in properly.

## Why is it downloading the .torrent file itself instead of the content of the torrent?

Before initiating a download, NAS Download Manager issues a request to the site to determine if the link you clicked on/URL you entered is referring to a .torrent file. If it is, NAS Download Manager itself downloads the .torrent first, then forwards that to your NAS. This is necessary to get the NAS to download the content of the torrent rather than the .torrent itself.

Some sites intentionally do not respond to this request, called a "HEAD request", meaning that NAS Download Manager has no choice but to forward the URL as-is to the NAS. In the case where the URL points to a .torrent file, this will cause the NAS to erroneously download the .torrent itself.

There is no practical way to fix this on the part of NAS Download Manager. If this is inconvenient for you, please ask the administrators of the site if they respond to HEAD requests for .torrent files properly.

## Why can't I start a download from (a site)? _or_ How do I start a download with (a site)?

Not all sites offer downloads in a way that is compatible with a Synology NAS setup. Examples include:

- sites requiring authentication to download, which the NAS cannot perform
- sites triggering downloads using JavaScript rather than a link with a URL
- sites that whitelist IPs for download using the IP of your browser rather than the IP of the NAS (when using the NAS remotely)

NAS Download Manager does a best-effort to handle some of these cases some of the time. Unfortunately, some cases are outright impossible, such as JavaScript-triggered downloads.

As a potential workaround, you can initiate the download in your browser, cancel it, then copy the URL from the browser's download list into NAS Download Manager. This may not work in all cases, such as if the problem is the inability of the NAS to authenticate with the site.

## Are my username and password stored securely?

Your credentials are stored in a place where only NAS Download Manager is able to access them, but unencrypted. Browsers don't yet support encrypted storage for extensions.

Your credentials are only ever transmitted to the host you specify in the settings over HTTPS, so your credentials are transmitted encrypted. You can also uncheck the "Remember Password" checkbox during login to prevent the extension storing your password.

NAS Download Manager collects and stores only information you provide, and only enough to perform its job. [Read more.](./PRIVACY.md)

## Why didn't my zip file/archive unzip/extract automatically?

DSM's "Auto Extract service" feature must be enabled by an admistrator account _and_ the account you use for NAS Download Manager (which does not have to be the same administrator account) has to enable Auto Extract for downloaded files. See the [official Synology documentation](https://www.synology.com/en-global/knowledgebase/DSM/help/DownloadStation/auto_unzip) for more details.

## What is this fork?

This extension is a community fork of the original [NAS Download Manager](https://github.com/seansfkelley/nas-download-manager) (previously known as Synology Download Manager). It has been rewritten to use Manifest V3, Svelte 5, and modern Synology DSM 7+ APIs.

This extension is not affiliated with Synology. It interacts with Synology Download Station, the application on Synology NASes.
