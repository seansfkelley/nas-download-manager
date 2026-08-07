import "./advanced-add-download-form.css";
import classNames from "classnames";
import { useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";

import { startsWithAnyProtocol, ALL_DOWNLOADABLE_PROTOCOLS } from "../common/apis/protocols";

import { PathSelector } from "./PathSelector";
import type { PopupClient } from "./popupClient";

export interface Props {
  onClose: () => void;
  client: PopupClient;
}

export function AdvancedAddDownloadForm(props: Props) {
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [ftpUsername, setFtpUsername] = useState("");
  const [ftpPassword, setFtpPassword] = useState("");
  const [unzipPassword, setUnzipPassword] = useState("");
  const [unzipEnabled, setUnzipEnabled] = useState(true);

  useEffect(() => {
    async function updateIsUnzipEnabled() {
      let enabled: boolean;

      try {
        const response = await props.client.getConfig();
        enabled = response.success ? response.result.unzip_service_enabled : false;
      } catch {
        enabled = false;
      }

      setUnzipEnabled(enabled);
      if (!enabled) {
        setUnzipPassword("");
      }
    }

    updateIsUnzipEnabled();
  }, [props.client]);

  const hasDownloadUrl = downloadUrl.length > 0;

  return (
    <div className="advanced-add-download-form">
      <TextareaAutosize
        className="url-input input-field card"
        minRows={2}
        maxRows={5}
        value={downloadUrl}
        onChange={(e) => {
          setDownloadUrl(e.currentTarget.value);
        }}
        placeholder={browser.i18n.getMessage("URLs_to_download_one_per_line")}
      />
      <div className="sibling-inputs">
        <input
          type="text"
          className="input-field"
          value={ftpUsername}
          onChange={(e) => {
            setFtpUsername(e.currentTarget.value);
          }}
          placeholder={browser.i18n.getMessage("FTP_username")}
        />
        <input
          type="password"
          className="input-field"
          value={ftpPassword}
          onChange={(e) => {
            setFtpPassword(e.currentTarget.value);
          }}
          placeholder={browser.i18n.getMessage("FTP_password")}
        />
      </div>
      <input
        type="password"
        className="input-field"
        value={unzipPassword}
        onChange={(e) => {
          setUnzipPassword(e.currentTarget.value);
        }}
        disabled={!unzipEnabled}
        title={
          unzipEnabled
            ? undefined
            : browser.i18n.getMessage("Auto_Extract_service_is_disabled_in_Download_Station")
        }
        placeholder={browser.i18n.getMessage("Unzip_password")}
      />
      <div className="download-path card">
        <div className="path-display" title={selectedPath}>
          {browser.i18n.getMessage("Download_to")}
          <span className={classNames("path", { faded: !selectedPath })}>
            {selectedPath
              ? selectedPath.split("/").at(-1)
              : browser.i18n.getMessage("default_location")}
          </span>
        </div>
        {/* The setter from useState is stable, which is what keeps DirectoryTree's memoization
            effective all the way down from here. */}
        <PathSelector
          onSelectPath={setSelectedPath}
          selectedPath={selectedPath}
          client={props.client}
        />
      </div>
      <div className="buttons">
        <button onClick={props.onClose} title={browser.i18n.getMessage("Dont_add_a_new_task")}>
          <span className="fa fa-lg fa-times" /> {browser.i18n.getMessage("Cancel")}
        </button>
        <button
          onClick={() => {
            const urls = downloadUrl
              .split("\n")
              .map((url) => url.trim())
              // The cheapest of checks. Actual invalid URLs will be caught later.
              .filter((url) => startsWithAnyProtocol(url, ALL_DOWNLOADABLE_PROTOCOLS));
            props.client.createTasks(urls, {
              path: selectedPath,
              ftpPassword: ftpPassword.trim() || undefined,
              ftpUsername: ftpUsername.trim() || undefined,
              unzipPassword: unzipPassword.trim() || undefined,
            });
            props.onClose();
          }}
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
