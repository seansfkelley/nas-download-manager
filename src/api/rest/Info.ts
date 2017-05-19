import { SynologyResponse, get } from './shared';
import { InfoQueryRequest, InfoQueryResponse } from './InfoTypes';

const CGI_NAME = 'query';
const API_NAME = 'SYNO.API.Info';

function Query(baseUrl: string, options: InfoQueryRequest): Promise<SynologyResponse<InfoQueryResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'query',
    query: options.query === 'ALL' ? options.query : options.query.join(',')
  });
}

export * from './InfoTypes';

export const Info = {
  API_NAME: API_NAME as typeof API_NAME,
  Query
};
