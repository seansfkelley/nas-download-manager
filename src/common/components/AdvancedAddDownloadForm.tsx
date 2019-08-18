import * as React from "react";
import last from "lodash-es/last";
import { ApiClient } from "synology-typescript-api";
import * as classNames from "classnames";

import { PathSelector } from "./PathSelector";

export interface Props {
  client: ApiClient;
  onAddDownload: (url: string, path: string | undefined) => void;
  onCancel: () => void;
}

export interface State {
  selectedPath: string | undefined;
  downloadUrl: string;
}

export class AdvancedAddDownloadForm extends React.PureComponent<Props, State> {
  state: State = {
    selectedPath: undefined,
    downloadUrl: "",
  };

  render() {
    const hasDownloadUrl = this.state.downloadUrl.length > 0;

    return (
      <div className="advanced-add-download-form">
        <input
          type="text"
          placeholder={browser.i18n.getMessage("URL_to_download")}
          value={this.state.downloadUrl}
          onChange={e => {
            this.setState({ downloadUrl: e.currentTarget.value });
          }}
          className="url-input card"
        />
        <div className="download-path card">
          <div className="path-display" title={this.state.selectedPath}>
            {browser.i18n.getMessage("Download_to")}
            <span className={classNames("path", { faded: !this.state.selectedPath })}>
              {this.state.selectedPath
                ? last(this.state.selectedPath.split("/"))
                : browser.i18n.getMessage("default_location")}
            </span>
          </div>
          <PathSelector
            client={this.props.client}
            onSelectPath={this.setSelectedPath}
            selectedPath={this.state.selectedPath}
          />
        </div>
        <div className="buttons">
          <button
            onClick={this.props.onCancel}
            title={browser.i18n.getMessage("Dont_add_a_new_task")}
          >
            <span className="fa fa-lg fa-times" /> {browser.i18n.getMessage("Cancel")}
          </button>
          <button
            onClick={this.addDownload}
            title={browser.i18n.getMessage("Download_the_above_URL_to_the_specified_location")}
            disabled={!hasDownloadUrl}
            className={classNames({ disabled: !hasDownloadUrl })}
          >
            <span className="fa fa-lg fa-plus" /> {browser.i18n.getMessage("Add")}
          </button>
        </div>
      </div>
    );
  }

  private addDownload = () => {
    this.props.onAddDownload(this.state.downloadUrl, this.state.selectedPath);
  };

  private setSelectedPath = (selectedPath: string) => {
    this.setState({ selectedPath });
  };
}
