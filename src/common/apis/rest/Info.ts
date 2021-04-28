import { SynologyResponse, BaseRequest, get } from "./shared";

export interface InfoQueryRequest extends BaseRequest {
  query: "ALL" | string[];
}

export type InfoQueryResponse = Record<
  string,
  {
    minVersion: number;
    maxVersion: number;
    path: string;
    requestFormat: string;
  }
>;

const CGI_NAME = "query" as const;
const API_NAME = "SYNO.API.Info" as const;

function Query(
  baseUrl: string,
  options: InfoQueryRequest,
): Promise<SynologyResponse<InfoQueryResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: "query",
    query: options.query === "ALL" ? options.query : options.query.join(","),
  });
}

export const Info = {
  API_NAME,
  Query,
};
