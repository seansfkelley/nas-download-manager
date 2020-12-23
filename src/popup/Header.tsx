import "./header.scss";
import * as React from "react";
import classNames from "classnames";

import { disabledPropAndClassName } from "./util";

export interface Props {
  isAddingDownload: boolean;
  onClickAddDownload?: () => void;
  onClickOpenDownloadStationUi?: () => void;
  isShowingDisplaySettings: boolean;
  onClickDisplaySettings: () => void;
  isMissingConfig: boolean;
  showDropShadow: boolean;
}

export function Header(props: Props) {
  return (
    <header className={classNames({ "with-shadow": props.showDropShadow })}>
      <img src="/icons/icon-64.png" />
      <span className="extension-name">Synology Download Manager</span>
      <button
        onClick={props.onClickAddDownload}
        title={browser.i18n.getMessage("Add_download")}
        {...disabledPropAndClassName(
          props.onClickAddDownload == null,
          classNames({ active: props.isAddingDownload }),
        )}
      >
        <div className="fa fa-lg fa-plus" />
      </button>
      <button
        onClick={props.onClickOpenDownloadStationUi}
        title={browser.i18n.getMessage("Open_DownloadStation_UI")}
        {...disabledPropAndClassName(props.onClickOpenDownloadStationUi == null)}
      >
        <div className="fa fa-lg fa-external-link-alt" />
      </button>
      <button
        onClick={props.onClickDisplaySettings}
        title={browser.i18n.getMessage("Show_task_display_settings")}
        className={classNames({ active: props.isShowingDisplaySettings })}
      >
        <div className="fa fa-lg fa-filter" />
      </button>
      <button
        onClick={() => {
          browser.runtime.openOptionsPage();
        }}
        title={browser.i18n.getMessage("Open_settings")}
        className={classNames({ "called-out": props.isMissingConfig })}
      >
        <div className="fa fa-lg fa-cog" />
      </button>
    </header>
  );
}
