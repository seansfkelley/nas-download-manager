import {
  ApiBuilder,
  BaseRequest,
  SynologyFailureResponse,
  SynologySuccessResponse,
} from "./shared";

{
  // Typescript wants these types for declarations, but also claims they're unused. Thanks.
  let _: SynologySuccessResponse<any> | SynologyFailureResponse = null as any;
  _ = _;
}

// ------------------------------------------------------------------------- //
//                                   Info                                    //
// ------------------------------------------------------------------------- //

export interface FileStationInfoGetResponse {
  is_manager: boolean;
  support_virtual_protocol: number;
  support_sharing: boolean;
  hostname: string;
}

const INFO_API_NAME = "SYNO.FileStation.Info";
const infoBuilder = new ApiBuilder("entry", INFO_API_NAME);

const Info = {
  API_NAME: INFO_API_NAME as typeof INFO_API_NAME,
  get: infoBuilder.makeGet<BaseRequest, FileStationInfoGetResponse>("get"),
};

// ------------------------------------------------------------------------- //
//                                   List                                    //
// ------------------------------------------------------------------------- //

export interface FileStationTime {
  atime: number;
  mtime: number;
  ctime: number;
  crtime: number;
}

export interface FileStationOwner {
  user: string;
  group: string;
  uid: number;
  gid: number;
}

export interface FileStationBasePerm {
  posix: number;
  is_acl_mode: boolean;
  acl: {
    append: boolean;
    del: boolean;
    exec: boolean;
    read: boolean;
    write: boolean;
  };
}

export interface FileStationListListShareRequest extends BaseRequest {
  offset?: number;
  limit?: number;
  sort_by?: "name" | "user" | "group" | "mtime" | "atime" | "ctime" | "crtime" | "posix";
  sort_direction?: "asc" | "desc";
  onlywritable?: boolean;
  additional?: (
    | "real_path"
    | "size"
    | "owner"
    | "time"
    | "perm"
    | "mount_point_type"
    | "volume_status"
  )[];
}

export interface FileStationSharedFolder {
  path: string;
  name: string;
  isdir: true;
  additional?: {
    real_path?: string;
    size?: number;
    owner?: FileStationOwner;
    time?: FileStationTime;
    perm?: FileStationBasePerm & {
      share_right: string;
      adv_right: {
        disable_download: boolean;
        disable_list: boolean;
        disable_modify: boolean;
      };
      acl_enable: boolean;
    };
    mount_point_type?: string;
    volume_status?: {
      freespace: number;
      totalspace: number;
      readonly: boolean;
    };
  };
}

export interface FileStationListListShareResponse {
  total: number;
  offset: number;
  shares: FileStationSharedFolder[];
}

export type FileStationFileAdditionalType =
  | "real_path"
  | "size"
  | "owner"
  | "time"
  | "perm"
  | "mount_point_type"
  | "type";

export interface FileStationListListRequest extends BaseRequest {
  folder_path: string;
  offset?: number;
  limit?: number;
  sort_by?: "name" | "user" | "group" | "mtime" | "atime" | "ctime" | "crtime" | "posix" | "type";
  sort_direction?: "asc" | "desc";
  pattern?: string;
  filetype?: "file" | "dir" | "all";
  goto_path?: string;
  additional?: FileStationFileAdditionalType[];
}

export interface FileStationFile {
  path: string;
  name: string;
  isdir: boolean;
  additional?: {
    real_path?: string;
    size?: number;
    owner?: FileStationOwner;
    time?: FileStationTime;
    perm?: FileStationBasePerm;
    mount_point_type?: string;
    type?: string;
  };
}

export interface FileStationFileList {
  total: number;
  offset: number;
  files: (FileStationFile & {
    children?: FileStationFileList;
  })[];
}

export interface FileStationListGetInfoRequest extends BaseRequest {
  path: string[];
  additional?: FileStationFileAdditionalType[];
}

export interface FileStationListGetInfoResponse {
  files: FileStationFile[];
}

const API_NAME = "SYNO.FileStation.List" as const;
const listBuilder = new ApiBuilder("entry", API_NAME);

const List = {
  API_NAME,
  list_share: listBuilder.makeGet<
    FileStationListListShareRequest,
    FileStationListListShareResponse
  >(
    "list_share",
    (o) => ({
      ...o,
      additional: o && o.additional && o.additional.length ? o.additional.join(",") : undefined,
    }),
    undefined,
    true,
  ),
  list: listBuilder.makeGet<FileStationListListRequest, FileStationFileList>("list", (o) => ({
    ...o,
    additional: o && o.additional && o.additional.length ? o.additional.join(",") : undefined,
  })),
  getinfo: listBuilder.makeGet<FileStationListGetInfoRequest, FileStationListGetInfoResponse>(
    "getinfo",
    (o) => ({
      ...o,
      path: o.path.join(","),
      additional: o && o.additional && o.additional.length ? o.additional.join(",") : undefined,
    }),
  ),
};

// ------------------------------------------------------------------------- //
//                                  exports                                  //
// ------------------------------------------------------------------------- //

export const FileStation = {
  Info,
  List,
};
