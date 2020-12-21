import Axios from "axios";
import { addTrackersToURL, addTrackersToMetaData } from "./torrentTracker";
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

function stripQueryString(url: string) {
  return url.indexOf("?") !== -1 ? url.slice(0, url.indexOf("?")) : url;
}

function guessDownloadFileName(
  url: string,
  headers: Record<string, string>,
  metadataFileType: MetadataFileType,
) {
  const urlWithoutQuery = stripQueryString(url);

  let maybeFilename: string | undefined;
  const contentDisposition = headers["content-disposition"];
  if (contentDisposition && contentDisposition.indexOf("filename=") !== -1) {
    const regexMatch = FILENAME_PROPERTY_REGEX.exec(contentDisposition);
    maybeFilename = (regexMatch && (regexMatch[2] || regexMatch[3])) || undefined;
  } else {
    maybeFilename = urlWithoutQuery.slice(urlWithoutQuery.lastIndexOf("/") + 1);
  }

  if (maybeFilename == null || maybeFilename.length === 0) {
    maybeFilename = "download";
  }

  return maybeFilename.endsWith(metadataFileType.extension)
    ? maybeFilename
    : maybeFilename + metadataFileType.extension;
}

async function getMetadataFileType(url: string) {
  let headResponse;

  try {
    headResponse = await Axios.head(url, { timeout: 10000 });
  } catch (e) {
    if (e?.response?.status != null) {
      // If we got a response at all, then it wasn't a severe error, just something
      // that the remote server likely can't handle or disallows.
      return undefined;
    } else {
      throw e;
    }
  }

  const contentType = (headResponse.headers["content-type"] || "").toLowerCase();
  const contentLength = headResponse.headers["content-length"];
  const metadataFileType = METADATA_FILE_TYPES.find(
    (fileType) =>
      contentType.includes(fileType.mediaType) ||
      stripQueryString(url).endsWith(fileType.extension),
  );
  return metadataFileType &&
    !isNaN(+contentLength) &&
    +contentLength < ARBITRARY_FILE_FETCH_SIZE_CUTOFF
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
    const match = url.match(EMULE_FILENAME_REGEX);
    return match ? match[1] : undefined;
  } else {
    return undefined;
  }
}

export function sanitizeUrlForSynology(url: string) {
  // It should be safe to just blindly string-replace this. Commas are not URL-significant, but they
  // are significant to Synology. If we find a comma in a URL, then that URL is not technically
  // malformed but it will interfere with the way the Synology attempts to parse the result and as
  // such will cause the request to fail.
  //
  // We expect the url argument to be a single, downloadable URL. Since commas are used to separate
  // mutiple downloadable URLs, the function signature for that (if it happens) will be `string[]` so
  // it's clear who's responsible for comma-separating the arguments.
  //
  // https://github.com/seansfkelley/synology-download-manager/issues/118
  // https://github.com/seansfkelley/synology-download-manager/issues/126
  return url.replace(/,/g, "%2C");
}

export interface DirectDownloadUrl {
  type: "direct-download";
  url: string;
}

export interface MetadataFileUrl {
  type: "metadata-file";
  url: string;
  content: Blob;
  filename: string;
}

export interface MissingOrIllegalUrl {
  type: "missing-or-illegal";
  url: string;
}

export interface UnexpectedErrorForUrl {
  type: "unexpected-error";
  url: string;
  error: any;
  description: string;
}

export type ResolvedUrl =
  | DirectDownloadUrl
  | MetadataFileUrl
  | MissingOrIllegalUrl
  | UnexpectedErrorForUrl;

export async function resolveUrl(url: string): Promise<ResolvedUrl> {
  function createUnexpectedError(error: any, description: string): UnexpectedErrorForUrl {
    return {
      type: "unexpected-error",
      url,
      error,
      description,
    };
  }

  if (!url) {
    return {
      type: "missing-or-illegal",
      url,
    };
  } else if (startsWithAnyProtocol(url, AUTO_DOWNLOAD_TORRENT_FILE_PROTOCOLS)) {
    let metadataFileType;

    try {
      metadataFileType = await getMetadataFileType(url);
    } catch (e) {
      return createUnexpectedError(
        e,
        "error while trying to fetch metadata file type for download url",
      );
    }

    if (metadataFileType != null) {
      let response;

      try {
        response = await Axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
      } catch (e) {
        return createUnexpectedError(e, "error while trying to fetch metadata file");
      }

      if (metadataFileType.mediaType === METADATA_FILE_TYPES[0].mediaType)
        response.data = addTrackersToMetaData(response.data);

      return {
        type: "metadata-file",
        url,
        content: new Blob([response.data], { type: metadataFileType.mediaType }),
        filename: guessDownloadFileName(url, response.headers, metadataFileType),
      };
    } else {
      return {
        type: "direct-download",
        url,
      };
    }
  } else if (startsWithAnyProtocol(url, ALL_DOWNLOADABLE_PROTOCOLS)) {
    if (startsWithAnyProtocol(url, MAGNET_PROTOCOL)) url = addTrackersToURL(url);
    return {
      type: "direct-download",
      url,
    };
  } else {
    return {
      type: "missing-or-illegal",
      url,
    };
  }
}
