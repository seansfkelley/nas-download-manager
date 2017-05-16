import { SynologyResponse, get } from './shared';
import { QueryResponse } from './InfoTypes';

const CGI_NAME = 'query';
const API_NAME = 'SYNO.API.Info';

function Query(baseUrl: string, query: 'ALL' | string[] = 'ALL'): Promise<SynologyResponse<QueryResponse>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'query',
    query: query === 'ALL' ? query : query.join(',')
  });
}

export * from './InfoTypes';

export const Info = {
  API_NAME: API_NAME as typeof API_NAME,
  Query
};
