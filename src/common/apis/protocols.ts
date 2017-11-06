export const DOWNLOAD_ONLY_PROTOCOLS = [
  'magnet',
  'thunder',
  'flashget',
  'qqdl'
];

export const AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS = [
  'http',
  'https'
];

export const ALL_DOWNLOADABLE_PROTOCOLS = [
  'http',
  'https',
  'ftp',
  'ftps'
].concat(DOWNLOAD_ONLY_PROTOCOLS);

export function startsWithAnyProtocol(url: string, protocols: string[]) {
  return protocols.some(protocol => url.startsWith(`${protocol}:`));
}
