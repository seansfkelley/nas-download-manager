import { parse as parseQueryString } from "query-string";
import {
  ALL_DOWNLOADABLE_PROTOCOLS,
  AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS,
  EMULE_PROTOCOL,
  MAGNET_PROTOCOL,
  startsWithAnyProtocol,
} from "../../common/apis/protocols";

interface MetadataFileType {
  mediaType: string;
  extension: string;
}

const METADATA_FILE_TYPES: MetadataFileType[] = [
  { mediaType: "application/x-bittorrent", extension: ".torrent" },
  { mediaType: "application/x-nzb", extension: ".nzb" },
];

const ARBITRARY_FILE_FETCH_SIZE_CUTOFF = 1024 * 1024 * 5;

const FILENAME_PROPERTY_REGEX = /filename=("([^"]+)"|([^"][^ ]+))/;

function makeAuthorizationHeader(
  username: string | undefined,
  password: string | undefined,
): { Authorization?: string } {
  return username || password
    ? { Authorization: `Basic ${btoa((username || "") + ":" + (password || ""))}` }
    : {};
}

function guessDownloadFileName(url: URL, headers: Headers, metadataFileType: MetadataFileType) {
  let maybeFilename: string | undefined;
  const contentDisposition = headers.get("content-disposition");
  if (contentDisposition != null && contentDisposition.indexOf("filename=") !== -1) {
    const regexMatch = FILENAME_PROPERTY_REGEX.exec(contentDisposition);
    maybeFilename = (regexMatch && (regexMatch[2] || regexMatch[3])) || undefined;
  } else {
    maybeFilename = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
  }

  if (maybeFilename == null || maybeFilename.length === 0) {
    maybeFilename = "download";
  }

  return maybeFilename.endsWith(metadataFileType.extension)
    ? maybeFilename
    : maybeFilename + metadataFileType.extension;
}

async function fetchWithTimeout(
  url: URL,
  init: Omit<RequestInit, "credentials" | "signal">,
  timeout: number,
): Promise<Response> {
  const abortController = new AbortController();
  const timeoutTimer = setTimeout(() => {
    abortController.abort();
  }, timeout);

  try {
    return await fetch(url.toString(), {
      ...init,
      credentials: "include",
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeoutTimer);
  }
}

async function getMetadataFileType(
  url: URL,
  username: string | undefined,
  password: string | undefined,
) {
  const headResponse = await fetchWithTimeout(
    url,
    {
      method: "HEAD",
      headers: makeAuthorizationHeader(username, password),
    },
    10000,
  );

  if (!headResponse.ok) {
    return undefined;
  }

  const contentType = (headResponse.headers.get("content-type") ?? "").toLowerCase();
  const metadataFileType = METADATA_FILE_TYPES.find(
    (fileType) =>
      contentType.includes(fileType.mediaType) || url.pathname.endsWith(fileType.extension),
  );
  const rawContentLength = headResponse.headers.get("content-length");
  const contentLength =
    rawContentLength == null || isNaN(+rawContentLength) ? undefined : +rawContentLength;

  return metadataFileType &&
    // Optimistically assume that metadata files aren't ridiculously huge if their size is not reported.
    (contentLength == null || contentLength < ARBITRARY_FILE_FETCH_SIZE_CUTOFF)
    ? metadataFileType
    : undefined;
}

export const EMULE_FILENAME_REGEX = /\|file\|([^\|]+)\|/;

export function guessFileNameFromUrl(url: string): string | undefined {
  if (startsWithAnyProtocol(url, MAGNET_PROTOCOL)) {
    const dn = parseQueryString(url).dn;
    if (dn) {
      return typeof dn === "string" ? dn : dn[0];
    } else {
      return undefined;
    }
  } else if (startsWithAnyProtocol(url, EMULE_PROTOCOL)) {
    return url.match(EMULE_FILENAME_REGEX)?.[1] || undefined;
  } else {
    return undefined;
  }
}

export function sanitizeUrlForSynology(url: URL): URL {
  // It should be safe to just blindly string-replace this. Commas are not URL-significant, but they
  // are significant to Synology. If we find a comma in a URL, then that URL is not technically
  // malformed but it will interfere with the way the Synology attempts to parse the result and as
  // such will cause the request to fail.
  //
  // We expect the url argument to be a single, downloadable URL. Since commas are used to separate
  // mutiple downloadable URLs, the function signature for that (if it happens) will be `string[]` so
  // it's clear who's responsible for comma-separating the arguments.
  //
  // https://github.com/seansfkelley/nas-download-manager/issues/118
  // https://github.com/seansfkelley/nas-download-manager/issues/126
  return new URL(url.toString().replace(/,/g, "%2C"));
}

export interface DirectDownloadUrl {
  type: "direct-download";
  url: URL;
}

export interface MetadataFileUrl {
  type: "metadata-file";
  url: URL;
  content: Blob;
  filename: string;
}

export interface MissingOrIllegalUrl {
  type: "missing-or-illegal";
}

export type ResolvedUrl = DirectDownloadUrl | MetadataFileUrl | MissingOrIllegalUrl;

export async function resolveUrl(
  url: string,
  username: string | undefined,
  password: string | undefined,
): Promise<ResolvedUrl> {
  function bailAndAssumeDirectDownload(error: any, debugDescription: string): DirectDownloadUrl {
    let guessedReason;

    if (error instanceof DOMException && error.name === "AbortError") {
      guessedReason = "timeout";
    } else if (/networkerror/i.test(error?.message)) {
      // This is a best-effort which I expect to start silently failing at some point in the future.
      guessedReason = "network-error";
    } else {
      guessedReason = "unknown";
    }

    console.error(debugDescription, `(guessed reason: ${guessedReason})`, error);

    return {
      type: "direct-download",
      url: parsedUrl,
    };
  }

  let parsedUrl: URL;
  try {
    // The empty string is an illegal URL, so this handles that case too.
    parsedUrl = new URL(url);
  } catch (e) {
    if (e instanceof TypeError) {
      return {
        type: "missing-or-illegal",
      };
    } else {
      // Something REALLY weird happened.
      throw e;
    }
  }

  if (startsWithAnyProtocol(url, AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS)) {
    let metadataFileType;

    try {
      metadataFileType = await getMetadataFileType(parsedUrl, username, password);
    } catch (e) {
      return bailAndAssumeDirectDownload(
        e,
        "error while trying to fetch metadata file type for download url",
      );
    }

    if (metadataFileType != null) {
      let response;

      try {
        response = await fetchWithTimeout(
          parsedUrl,
          { headers: makeAuthorizationHeader(username, password) },
          10000,
        );
      } catch (e) {
        return bailAndAssumeDirectDownload(e, "error while trying to fetch metadata file");
      }

      let bytes;
      try {
        bytes = await response.arrayBuffer();
      } catch (e) {
        return bailAndAssumeDirectDownload(e, "error while trying to get bytes for metadata file");
      }

      return {
        type: "metadata-file",
        url: parsedUrl,
        content: new Blob([bytes], { type: metadataFileType.mediaType }),
        filename: guessDownloadFileName(parsedUrl, response.headers, metadataFileType),
      };
    } else {
      return {
        type: "direct-download",
        url: parsedUrl,
      };
    }
  } else if (startsWithAnyProtocol(parsedUrl.pathname, ALL_DOWNLOADABLE_PROTOCOLS)) {
    return {
      type: "direct-download",
      url: parsedUrl,
    };
  } else {
    return {
      type: "missing-or-illegal",
    };
  }
}
