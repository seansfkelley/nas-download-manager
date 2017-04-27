// https://global.download.synology.com/download/Document/DeveloperGuide/Synology_Download_Station_Web_API.pdf

import Axios from 'axios';

import { PROTOCOL, HOSTNAME, PORT } from './secrets';

export const BASE_URL = `${PROTOCOL}://${HOSTNAME}:${PORT}`;

// TODO: Configurable, somehow...?
// Per the docs, this has to be this literal to access DownloadStation.
export const SESSION_NAME = 'DownloadStation';

export type SynologyResponse<S> = {
  success: true;
  data: S;
} | {
  success: false;
  error: {
    code: number;
  };
};

export function get<S>(url: string): Promise<SynologyResponse<S>> {
  console.log(url);
  return Axios({ url }).then(response => response.data);
}
