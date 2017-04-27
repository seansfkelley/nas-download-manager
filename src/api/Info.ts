import { stringify } from 'query-string';

import { SynologyResponse, get, BASE_URL } from './shared';

export type QueryResponse = SynologyResponse<Record<string, {
  minVersion: number;
  maxVersion: number;
  path: string;
  requestFormat: string;
}>>;

function Query(query: 'ALL' | string[]= 'ALL'): Promise<QueryResponse> {
  return get(`${BASE_URL}/webapi/query.cgi?${stringify({
    api: 'SYNO.API.Info',
    version: 1,
    method: 'query',
    query: query === 'ALL' ? query : query.join(',')
  })}`);
}

export const Info = {
  Query
};
