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

export function isFormFile(f?: unknown): f is FormFile {
  return !!f && (f as FormFile).content != null && (f as FormFile).filename != null;
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
    errors?: unknown[];
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
  SynoToken?: string;
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
  request: ApiRequest,
): Promise<RestApiResponse<O>> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(request)) {
    if (k !== "timeout" && k !== "meta" && v !== undefined && typeof v !== "object") {
      params.set(k, String(v));
    }
  }
  if (request.sid) params.set("_sid", request.sid);
  const url = `${baseUrl}/webapi/entry.cgi?${params.toString()}`;

  return fetchWithErrorHandling(url, { method: "GET" }, request.timeout, {
    ...request.meta,
    ...typesafePick(request, "method", "version"),
  }) as Promise<RestApiResponse<O>>;
}

export async function post<O extends object>(
  baseUrl: string,
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

  const url = `${baseUrl}/webapi/entry.cgi?${request.sid ? `_sid=${encodeURIComponent(request.sid)}` : ""}`;

  return fetchWithErrorHandling(url, { method: "POST", body: formData }, request.timeout, {
    ...request.meta,
    ...typesafePick(request, "method", "version"),
  }) as Promise<RestApiResponse<O>>;
}

export class ApiBuilder {
  constructor(
    private apiName: string,
    public readonly meta: ApiGroupMeta,
    private version: number = 1,
  ) {}

  makeGet<I extends BaseRequest, O>(
    methodName: string,
    preprocess?: (options: I) => object,
    postprocess?: (response: O) => O,
  ): (baseUrl: string, sid: string, options: I, synotoken: string) => Promise<RestApiResponse<O>>;
  makeGet<I extends BaseRequest, O>(
    methodName: string,
    preprocess: ((options?: I) => object) | undefined,
    postprocess: ((response: O) => O) | undefined,
    optional: true,
  ): (baseUrl: string, sid: string, options?: I, synotoken?: string) => Promise<RestApiResponse<O>>;

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
  ): (baseUrl: string, sid: string, options: I, synotoken: string) => Promise<RestApiResponse<O>>;
  makePost<I extends BaseRequest, O>(
    methodName: string,
    preprocess: ((options?: I) => object) | undefined,
    postprocess: ((response: O) => O) | undefined,
    optional: true,
  ): (baseUrl: string, sid: string, options?: I, synotoken?: string) => Promise<RestApiResponse<O>>;

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
    return async (baseUrl: string, sid: string, options?: object, synotoken: string = "") => {
      const response = await method(baseUrl, {
        ...preprocess!(options || {}),
        api: this.apiName,
        version: this.version,
        method: methodName,
        sid,
        SynoToken: synotoken,
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
