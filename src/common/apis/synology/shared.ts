import { stringify } from "query-string";
import { typesafePick } from "../../lang";

export class BadResponseError extends Error {
  constructor(public response: Response) {
    super();
  }
}
export class TimeoutError extends Error {}
export class NetworkError extends Error {}

export const SessionName = {
  DownloadStation: "DownloadStation" as const,
  FileStation: "FileStation" as const,
};

export type SessionName = keyof typeof SessionName;

export interface FormFile {
  content: Blob;
  filename: string;
}

export function isFormFile(f?: any): f is FormFile {
  return f && (f as FormFile).content != null && (f as FormFile).filename != null;
}

export interface ApiGroupMeta {
  apiGroup: string;
  apiSubgroup?: string;
}

export interface ResponseMeta extends ApiGroupMeta {
  method: string;
  version: number;
}

export interface RestApiSuccessResponse<S> {
  success: true;
  data: S;
  meta: ResponseMeta;
}

export interface RestApiFailureResponse {
  success: false;
  meta: ResponseMeta;
  error: {
    code: number;
    errors?: any[];
  };
}

export type RestApiResponse<S> = RestApiSuccessResponse<S> | RestApiFailureResponse;

export interface BaseRequest {
  timeout?: number;
}

export interface ApiRequest {
  api: string;
  version: number;
  method: string;
  meta: ApiGroupMeta;
  sid?: string;
  timeout?: number;
  [key: string]: string | number | boolean | FormFile | ApiGroupMeta | undefined;
}

const DEFAULT_TIMEOUT = 60000;

async function fetchWithErrorHandling(
  url: string,
  init: RequestInit,
  timeout: number | undefined,
  meta: ResponseMeta,
): Promise<unknown> {
  const abortController = new AbortController();
  const timeoutTimer = setTimeout(() => {
    abortController.abort();
  }, timeout ?? DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...init,
      credentials: "omit",
      signal: abortController.signal,
    });
    if (!response.ok) {
      throw new BadResponseError(response);
    } else {
      return {
        ...(await response.json()),
        meta,
      };
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new TimeoutError();
    } else if (e instanceof Error && /networkerror/i.test(e?.message)) {
      throw new NetworkError();
    } else {
      throw e;
    }
  } finally {
    clearTimeout(timeoutTimer);
  }
}

export async function get<O extends object>(
  baseUrl: string,
  cgi: string,
  request: ApiRequest,
): Promise<RestApiResponse<O>> {
  const url = `${baseUrl}/webapi/${cgi}.cgi?${stringify({
    ...request,
    _sid: request.sid,
    timeout: undefined,
    meta: undefined,
  })}`;

  return fetchWithErrorHandling(url, { method: "GET" }, request.timeout, {
    ...request.meta,
    ...typesafePick(request, "method", "version"),
  }) as Promise<RestApiResponse<O>>;
}

export async function post<O extends object>(
  baseUrl: string,
  cgi: string,
  request: ApiRequest,
): Promise<RestApiResponse<O>> {
  const formData = new FormData();

  Object.keys(request).forEach((k) => {
    const v = request[k];
    if (k !== "timeout" && k !== "meta" && v !== undefined && !isFormFile(v)) {
      // String() !== new String(). This produces lowercase-s strings, not capital-S Strings.
      formData.append(k, String(v));
    }
  });

  if (request.sid) {
    formData.append("_sid", request.sid);
  }

  Object.keys(request).forEach((k) => {
    const v = request[k];
    if (k !== "timeout" && k !== "meta" && v !== undefined && isFormFile(v)) {
      formData.append(k, v.content, v.filename);
    }
  });

  const url = `${baseUrl}/webapi/${cgi}.cgi?${stringify({ _sid: request.sid })}`;

  return fetchWithErrorHandling(url, { method: "POST", body: formData }, request.timeout, {
    ...request.meta,
    ...typesafePick(request, "method", "version"),
  }) as Promise<RestApiResponse<O>>;
}

export class ApiBuilder {
  constructor(private cgiName: string, private apiName: string, private meta: ApiGroupMeta) {}

  makeGet<I extends BaseRequest, O>(
    methodName: string,
    preprocess?: (options: I) => object,
    postprocess?: (response: O) => O,
  ): (baseUrl: string, sid: string, options: I) => Promise<RestApiResponse<O>>;
  makeGet<I extends BaseRequest, O>(
    methodName: string,
    preprocess: ((options?: I) => object) | undefined,
    postprocess: ((response: O) => O) | undefined,
    optional: true,
  ): (baseUrl: string, sid: string, options?: I) => Promise<RestApiResponse<O>>;

  makeGet(
    methodName: string,
    preprocess?: (options: object) => object,
    postprocess?: (response: object) => object,
    _optional?: true,
  ) {
    return this.makeApiRequest(get, methodName, preprocess, postprocess);
  }

  makePost<I extends BaseRequest, O>(
    methodName: string,
    preprocess?: (options: I) => object,
    postprocess?: (response: O) => O,
  ): (baseUrl: string, sid: string, options: I) => Promise<RestApiResponse<O>>;
  makePost<I extends BaseRequest, O>(
    methodName: string,
    preprocess: ((options?: I) => object) | undefined,
    postprocess: ((response: O) => O) | undefined,
    optional: true,
  ): (baseUrl: string, sid: string, options?: I) => Promise<RestApiResponse<O>>;

  makePost(
    methodName: string,
    preprocess?: (options: object) => object,
    postprocess?: (response: object) => object,
    _optional?: true,
  ) {
    return this.makeApiRequest(post, methodName, preprocess, postprocess);
  }

  private makeApiRequest(
    method: typeof get | typeof post,
    methodName: string,
    preprocess?: (options: object) => object,
    postprocess?: (response: object) => object,
  ) {
    preprocess = preprocess || ((o) => o);
    postprocess = postprocess || ((r) => r);
    return async (baseUrl: string, sid: string, options?: object) => {
      const response = await method(baseUrl, this.cgiName, {
        ...preprocess!(options || {}),
        api: this.apiName,
        version: 1,
        method: methodName,
        sid,
        meta: this.meta,
      });
      if (response.success) {
        return { ...response, data: postprocess!(response.data) };
      } else {
        return response;
      }
    };
  }
}
