import { SynologyResponse, ConnectionFailure, isConnectionFailure } from "synology-typescript-api";
import { errorMessageFromCode, errorMessageFromConnectionFailure } from "../common/apis/errors";

export type CallbackResponse = "success" | { failMessage: string };

export const CallbackResponse = {
  from: (response: SynologyResponse<any> | ConnectionFailure): CallbackResponse => {
    if (isConnectionFailure(response)) {
      return {
        failMessage: errorMessageFromConnectionFailure(response),
      };
    } else if (!response.success) {
      return {
        failMessage: errorMessageFromCode(response.error.code, "DownloadStation.Task"),
      };
    } else {
      return "success";
    }
  },
};
