export const EMULE_PROTOCOL = "ed2k";
export const MAGNET_PROTOCOL = "magnet";

export const DOWNLOAD_ONLY_PROTOCOLS = [
  MAGNET_PROTOCOL,
  "thunder",
  "flashget",
  "qqdl",
  EMULE_PROTOCOL,
];

export const AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS = ["http", "https"];

export const ALL_DOWNLOADABLE_PROTOCOLS = ["http", "https", "ftp", "ftps"].concat(
  DOWNLOAD_ONLY_PROTOCOLS,
);

export function startsWithAnyProtocol(url: string, protocols: string | string[]) {
  if (typeof protocols === "string") {
    return url.startsWith(`${protocols}:`);
  } else {
    return protocols.some(protocol => url.startsWith(`${protocol}:`));
  }
}
